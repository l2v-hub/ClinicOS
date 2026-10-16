#!/usr/bin/env node
// Run by the user's already authenticated Claude Code harness. No Actions OAuth/API secret.
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRunner } from './process.mjs';
import { createGitHub } from './github.mjs';
import { validateState, feedbackFingerprint } from './contracts.mjs';
import { externalReport } from './external-review.mjs';
import { sanitizeText } from '../core/sanitize.mjs';
import { runBugReview } from '../../../scripts/quality-gate/claude-bug-review.mjs';
import { reviewBugSetup } from '../../../scripts/quality-gate/review-bug-setup.mjs';

const REPO = 'l2v-hub/ClinicOS';
const FILE = fileURLToPath(import.meta.url);

function assertCandidate(batch, feedback) {
  assert.equal(feedback.state, 'OPEN');
  assert.equal(feedback.isDraft, false);
  assert.equal(feedback.head, batch.sha);
  assert.equal(feedback.headRepo, REPO);
  assert.equal(feedback.headIsFork, false);
  assert.equal(feedback.headRef, batch.branch);
  assert.equal(feedback.baseRef, 'main');
}

export async function reviewExternalBatch({ state, batch, store, github, cwd, run }) {
  validateState(state, REPO);
  assert.equal(batch.externalReview?.subjectSha, batch.sha);
  if (!['requested', 'finished'].includes(batch.externalReview.status))
    throw new Error(
      'External review is not available; an interrupted running attempt requires recovery',
    );
  let current = await github.reviewFeedback(batch.pr.number);
  assertCandidate(batch, current);
  const checkIssues = async () => {
    for (const number of batch.issues) {
      const issue = await github.viewIssue(number);
      assert.equal(
        String(issue.state).toLowerCase(),
        'open',
        'Source issue was closed or cancelled',
      );
    }
  };
  await checkIssues();
  if (batch.externalReview.status === 'requested') {
    if (batch.reviews.length >= 4) throw new Error('Four-review limit reached');
    if (batch.reviewLedger?.rounds?.at(-1)?.subject_sha === batch.sha)
      throw new Error('Commit Codex corrections before requesting another review of this batch');
    if (!(await github.requiredChecks(batch.pr.number)).ok) return { status: 'waiting-checks' };
    const packet = `artifacts/task-validation/${batch.id}`;
    const directory = path.join(cwd, packet);
    assert.equal(await realpath(directory), path.join(await realpath(cwd), packet));
    const ledgerFile = path.join(directory, 'claude-review-state.local');
    if (batch.reviewLedger)
      await writeFile(ledgerFile, JSON.stringify(batch.reviewLedger), { flag: 'wx' });
    for (const [name, content] of Object.entries(batch.reviewReports ?? {})) {
      assert.match(name, /^claude-review-[1-4]\.json$/);
      assert.equal(typeof content, 'string');
      assert.ok(content.length <= 100001);
      await writeFile(path.join(directory, name), content, { flag: 'wx' });
    }
    await writeFile(
      path.join(directory, 'claude-review-context.local'),
      sanitizeText(JSON.stringify(current)),
      { flag: 'wx' },
    );
    assert.match(batch.baseSha ?? '', /^[a-f0-9]{40}$/, 'Recorded review baseline is required');
    const diff = await run({
      command: 'git',
      args: ['diff', batch.baseSha, batch.sha, '--', '.', ':(exclude)artifacts'],
      cwd,
    });
    assert.equal(diff.ok, true, 'Cannot prepare the exact source diff');
    await writeFile(path.join(directory, 'claude-review-diff.local'), sanitizeText(diff.stdout), {
      flag: 'wx',
    });
    const baseline = feedbackFingerprint(current);
    let reserved = false;
    try {
      await runBugReview({
        cwd,
        packet,
        run: async (options) => {
          if (options.command === 'claude' && options.args.includes('--print')) {
            const ledger = JSON.parse(await readFile(ledgerFile, 'utf8'));
            assert.equal(ledger.rounds.length, batch.reviews.length + 1);
            assert.equal(ledger.rounds.at(-1).verdict, 'running');
            assert.equal(ledger.rounds.at(-1).subject_sha, batch.sha);
            current = await github.reviewFeedback(batch.pr.number);
            assertCandidate(batch, current);
            await checkIssues();
            batch.reviews.push({
              round: ledger.rounds.length,
              status: 'running',
              subjectSha: batch.sha,
            });
            batch.reviewLedger = ledger;
            batch.externalReview = {
              status: 'running',
              subjectSha: batch.sha,
              feedbackFingerprint: baseline,
              startedAt: new Date().toISOString(),
            };
            batch.phase = 'reviewing';
            state.updatedAt = new Date().toISOString();
            await store.save(state); // CAS reservation BEFORE inference; conflicts prevent the model call.
            reserved = true;
          }
          return run(options);
        },
      });
    } finally {
      if (reserved) {
        const ledger = JSON.parse(await readFile(ledgerFile, 'utf8'));
        batch.reviewLedger = ledger;
        const last = ledger.rounds.at(-1);
        batch.reviews.at(-1).status = last.verdict === 'running' ? 'failed' : last.verdict;
        const name = `claude-review-${last.round}.json`;
        const content = await readFile(path.join(directory, name), 'utf8').catch((error) => {
          if (error.code !== 'ENOENT') throw error;
          return null;
        });
        if (content) {
          batch.reviewReports ??= {};
          batch.reviewReports[name] = content;
        }
        batch.externalReview.status = content ? 'finished' : 'failed';
        batch.phase = content ? 'waiting-review' : 'blocked';
        if (!content)
          batch.reason = 'External Claude execution failed; its reserved attempt remains spent';
        state.updatedAt = new Date().toISOString();
        await store.save(state);
      }
    }
  }
  const review = externalReport(batch);
  current = await github.reviewFeedback(batch.pr.number);
  assertCandidate(batch, current);
  const marker = `<!-- clinicos-claude-cron:${batch.pr.number}:${batch.sha}:${batch.reviews.length} -->`;
  const beforePublication = {
    ...current,
    comments: current.comments.filter((comment) => !String(comment.body ?? '').startsWith(marker)),
  };
  let changed = feedbackFingerprint(beforePublication) !== batch.externalReview.feedbackFingerprint;
  await github.publishExternalReview(batch.pr.number, batch.sha, review, batch.reviews.length);
  // Publication is idempotent; a failed POST is retried without a new Claude call.
  const published = await github.reviewFeedback(batch.pr.number);
  assertCandidate(batch, published);
  const afterPublication = {
    ...published,
    comments: published.comments.filter(
      (comment) => !String(comment.body ?? '').startsWith(marker),
    ),
  };
  changed ||= feedbackFingerprint(afterPublication) !== batch.externalReview.feedbackFingerprint;
  batch.externalReview = {
    status: 'published',
    subjectSha: batch.sha,
    feedbackFingerprint: feedbackFingerprint(published),
    feedbackChanged: changed,
    completedAt: new Date().toISOString(),
  };
  batch.phase = 'waiting-review';
  state.updatedAt = new Date().toISOString();
  await store.save(state);
  // A source-issue comment wakes Codex after the remote report is durable. Scheduled polling
  // also reconciles it if this notification fails; no model retry is needed.
  for (const number of batch.issues)
    await github.commentIssue(
      number,
      `Claude Code ha terminato la review ${batch.reviews.length}/4 di PR ${batch.pr.url} su \`${batch.sha}\`: **${review.verdict}**. Codex può leggere il report e proseguire dal registro esistente.`,
    );
  return { status: 'published', verdict: review.verdict, round: batch.reviews.length };
}

export async function runCron({ root, env = process.env, dryRun = false }) {
  // Credentials stay in the user's own already logged-in Claude config. Do not copy them.
  const runtime = await mkdtemp(path.join(os.tmpdir(), 'clinicos-claude-cron-'));
  const localEnv = {
    ...env,
    CLAUDE_REVIEW_AUTH_MODE: 'subscription-local',
    CLINICOS_CLAUDE_CONFIG_DIR:
      env.CLINICOS_CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'),
  };
  for (const key of [
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_AUTH_TOKEN',
    'CLAUDE_CODE_OAUTH_TOKEN',
    'CODEX_API_KEY',
    'OPENAI_API_KEY',
  ])
    delete localEnv[key];
  const baseRun = createRunner({ env: localEnv, runtimeRoot: path.join(runtime, 'runtime') });
  let inferenceStarted = false;
  const run = async (options) => {
    if (options.command === 'claude' && options.args.includes('--print')) inferenceStarted = true;
    const result = await baseRun({
      ...options,
      envMode: options.command === 'claude' ? 'review' : 'controller',
    });
    if (options.command === 'claude' && options.args[0] === 'auth' && result.ok) {
      const auth = JSON.parse(result.stdout);
      if (
        auth.loggedIn !== true ||
        auth.authMethod !== 'claude.ai' ||
        !['max', 'pro'].includes(String(auth.subscriptionType).toLowerCase())
      )
        throw new Error('The external Claude CLI must use its own Pro/Max subscription login');
    }
    return result;
  };
  const github = createGitHub({ cwd: root, repo: REPO, run });
  const store = github.createStateStore();
  const state = await store.load();
  if (!state) {
    await rm(runtime, { recursive: true, force: true });
    return { status: 'empty' };
  }
  validateState(state, REPO);
  const identity = await run({ command: 'gh', args: ['api', 'user', '--jq', '.login'], cwd: root });
  assert.equal(identity.ok, true);
  const actor = identity.stdout.trim();
  assert.equal(await github.authorized(actor), true);
  const batch = state.batches.find(
    (item) =>
      item.phase === 'waiting-review' &&
      ['requested', 'finished'].includes(item.externalReview?.status),
  );
  const setup = !batch && !env.CLINICOS_SKIP_SETUP_REVIEW ? await github.dashboardSetup() : null;
  const sha = batch?.sha || (!setup?.merged && !setup?.draft ? setup?.head : null);
  if (!sha) {
    await rm(runtime, { recursive: true, force: true });
    return { status: 'empty' };
  }
  if (setup && (setup.check?.status !== 'completed' || setup.check?.conclusion !== 'success')) {
    await rm(runtime, { recursive: true, force: true });
    return { status: 'waiting-checks' };
  }
  assert.match(sha, /^[a-f0-9]{40}$/);
  if (dryRun) {
    await rm(runtime, { recursive: true, force: true });
    return {
      status: 'dry-run-ready',
      pullRequest: batch?.pr?.number ?? 471,
      sha,
      remainingReviews:
        4 - (batch?.reviews.length ?? state.setupReview471?.ledger?.rounds?.length ?? 0),
      providerExecuted: false,
    };
  }
  const cwd = path.join(runtime, 'review');
  let worktree = false;
  let completed = false;
  const git = async (args) => {
    const result = await run({ command: 'git', args, cwd: root });
    assert.equal(result.ok, true, 'Review worktree preparation failed');
    return result;
  };
  try {
    await git(['fetch', '--no-tags', 'origin', sha]);
    await git(['-c', 'core.hooksPath=/dev/null', 'worktree', 'add', '--detach', cwd, sha]);
    worktree = true;
    let result;
    if (batch)
      result = await reviewExternalBatch({
        state,
        batch,
        store,
        github,
        cwd,
        run: (options) => run({ ...options, cwd }),
      });
    // Bootstrap PR471 keeps its existing remote ledger, including the failed first attempt.
    else
      result = await reviewBugSetup({
        cwd,
        store,
        run: (options) => run({ ...options, cwd }),
        env: {
          GITHUB_REPOSITORY: REPO,
          GITHUB_SHA: sha,
          CLINICOS_REVIEWED_SHA: sha,
          GITHUB_ACTOR: actor,
          CLAUDE_REVIEW_AUTH_MODE: 'subscription',
          RUNNER_TEMP: runtime,
        },
      });
    completed = true;
    return result;
  } finally {
    if (inferenceStarted && !completed) {
      console.error(
        `External review recovery files preserved at ${runtime}; retain the remote attempt budget.`,
      );
    } else {
      // Remove only this invocation's owned temporary worktree; never force-remove user work.
      if (worktree)
        await git(['-c', 'core.hooksPath=/dev/null', 'worktree', 'remove', '--force', cwd]);
      await rm(runtime, { recursive: true, force: true });
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === FILE) {
  try {
    const root = path.resolve(path.dirname(FILE), '../../..');
    console.log(
      JSON.stringify(await runCron({ root, dryRun: process.argv.includes('--dry-run') })),
    );
  } catch {
    console.error(
      'External Claude review blocked. Inspect local subscription login, GitHub permissions and durable state; no token values or budget reset.',
    );
    process.exitCode = 1;
  }
}
