#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, realpath, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRunner } from '../../agent-team/src/bug-pipeline/process.mjs';
import { createGitHub } from '../../agent-team/src/bug-pipeline/github.mjs';
import { validateState } from '../../agent-team/src/bug-pipeline/contracts.mjs';
import { runBugReview } from './claude-bug-review.mjs';

const REPO = 'l2v-hub/ClinicOS';
const PACKET = 'artifacts/task-validation/codex-setup-review';
const PR = 471;

// Bootstrap review of this automation PR. The ordinary bug controller owns all later PRs.
export async function reviewBugSetup({ cwd, env = process.env, run, store }) {
  assert.equal(env.GITHUB_REPOSITORY, REPO);
  assert.equal(env.CLAUDE_REVIEW_AUTH_MODE, 'subscription');
  assert.match(env.CLINICOS_REVIEWED_SHA || '', /^[a-f0-9]{40}$/);
  assert.equal(env.GITHUB_SHA, env.CLINICOS_REVIEWED_SHA);
  assert.match(env.GITHUB_ACTOR || '', /^[A-Za-z0-9][A-Za-z0-9-]*$/);
  const runtimeRoot = path.join(env.RUNNER_TEMP || path.dirname(cwd), '.clinicos-setup-review');
  run ??= createRunner({ env, runtimeRoot });
  const invoke = async (command, args, input) => {
    const result = await run({ command, args, input, cwd, envMode: 'controller' });
    assert.equal(result.ok, true, `${command} setup review preflight failed`);
    return result.stdout;
  };
  const api = async (route, body) =>
    JSON.parse(
      await invoke(
        'gh',
        ['api', `repos/${REPO}/${route}`, ...(body ? ['--method', 'POST', '--input', '-'] : [])],
        body ? JSON.stringify(body) : undefined,
      ),
    );
  const actor = await api(`collaborators/${env.GITHUB_ACTOR}/permission`);
  assert.equal(actor.permission, 'admin', 'Only an administrator may review setup');
  const checkHead = async () => {
    const pr = await api(`pulls/${PR}`);
    assert.equal(pr.state, 'open');
    assert.equal(pr.head.repo.full_name, REPO);
    assert.equal(pr.head.sha, env.GITHUB_SHA, 'Setup PR head changed');
    return pr;
  };
  const pr = await checkHead();
  assert.match(pr.base.sha, /^[a-f0-9]{40}$/);
  const comparison = await api(`compare/${pr.base.sha}...${env.GITHUB_SHA}`);
  assert.equal(
    comparison.merge_base_commit.sha,
    pr.base.sha,
    'Update the setup branch with current main before review',
  );
  assert.equal((await invoke('git', ['rev-parse', 'HEAD'])).trim(), env.GITHUB_SHA);
  store ??= createGitHub({ cwd, repo: REPO, run }).createStateStore();
  const state = (await store.load()) || { schemaVersion: 1, repository: REPO, batches: [] };
  validateState(state, REPO);
  const saved = state.setupReview471 || { pullRequest: PR, packet: PACKET, reports: {} };
  assert.equal(saved.pullRequest, PR);
  assert.equal(saved.packet, PACKET);
  assert.ok(saved.reports && typeof saved.reports === 'object' && !Array.isArray(saved.reports));
  assert.notEqual(
    saved.ledger?.rounds?.at(-1)?.verdict,
    'running',
    'Interrupted setup review requires explicit recovery without resetting its budget',
  );
  const directory = path.join(cwd, PACKET);
  assert.equal(
    await realpath(directory),
    path.join(await realpath(cwd), PACKET),
    'Setup packet must not redirect writes through a symlink',
  );
  const ledgerFile = path.join(directory, 'claude-review-state.local');
  if (saved.ledger) await writeFile(ledgerFile, JSON.stringify(saved.ledger), { flag: 'wx' });
  for (const [name, content] of Object.entries(saved.reports)) {
    assert.match(name, /^claude-review-[1-4]\.json$/);
    assert.equal(typeof content, 'string');
    assert.ok(content.length <= 100001);
    await writeFile(path.join(directory, name), content, { flag: 'wx' });
  }
  const baseAvailable = await run({
    command: 'git',
    args: ['cat-file', '-e', `${pr.base.sha}^{commit}`],
    cwd,
    envMode: 'verification',
  });
  if (!baseAvailable.ok)
    await invoke('git', ['fetch', '--no-tags', '--depth=1', 'origin', pr.base.sha]);
  const diff = await invoke('git', ['diff', pr.base.sha, 'HEAD', '--', '.', ':(exclude)artifacts']);
  await writeFile(path.join(directory, 'claude-review-diff.local'), diff, { flag: 'wx' });
  const previousRounds = saved.ledger?.rounds?.length || 0;
  let reserved = false;
  const persist = async () => {
    const ledger = JSON.parse(await readFile(ledgerFile, 'utf8'));
    const reports = {};
    for (const round of ledger.rounds) {
      const name = `claude-review-${round.round}.json`;
      const content = await readFile(path.join(directory, name), 'utf8').catch((error) => {
        if (error.code !== 'ENOENT') throw error;
        return null;
      });
      if (content !== null) reports[name] = content;
    }
    state.setupReview471 = { pullRequest: PR, packet: PACKET, ledger, reports };
    await store.save(state);
  };
  let result;
  try {
    result = await runBugReview({
      cwd,
      packet: PACKET,
      run: async (options) => {
        if (options.command === 'claude' && options.args[0] === '--print') {
          assert.equal(reserved, false);
          const ledger = JSON.parse(await readFile(ledgerFile, 'utf8'));
          assert.equal(ledger.rounds.length, previousRounds + 1);
          assert.ok(ledger.rounds.length <= 4);
          assert.equal(ledger.rounds.at(-1).verdict, 'running');
          assert.equal(ledger.rounds.at(-1).subject_sha, env.GITHUB_SHA);
          // CAS succeeds BEFORE the subscription inference starts; failures cannot reset attempts.
          await persist();
          reserved = true;
        }
        const response = await run({
          ...options,
          envMode: options.command === 'claude' ? 'review' : 'verification',
        });
        if (options.command === 'claude') {
          let modelError = false;
          try {
            modelError = JSON.parse(response.stdout).is_error === true;
          } catch {}
          if (!response.ok || modelError) {
            const detail = `${response.stdout || ''} ${response.stderr || ''}`;
            const reason = /401|authentication|unauthorized|invalid.*token|expired.*token/i.test(
              detail,
            )
              ? 'authentication-rejected'
              : /429|rate.limit|usage.limit|quota/i.test(detail)
                ? 'capacity-or-quota'
                : 'cli-or-provider-error';
            console.error(
              JSON.stringify({ operation: 'claude-review', reason, code: response.code ?? null }),
            );
          }
        }
        return response;
      },
    });
  } finally {
    if (reserved) await persist();
  }
  assert.equal((await checkHead()).base.sha, pr.base.sha, 'Main changed during setup review');
  if (result.report || result.reused) {
    const content = await readFile(
      path.join(directory, `claude-review-${result.round}.json`),
      'utf8',
    );
    const body = `<!-- codex-bug-pipeline:setup-review -->\nClaude Max setup review ${result.round}/4 on \`${env.GITHUB_SHA}\`: **${result.verdict}**.\n\n${content.length <= 55000 ? '```json\n' + content + '\n```' : 'The complete structured report is in the durable setupReview471 record on codex/bug-control and the workflow artifact.'}`;
    let published = false;
    for (let page = 1; ; page++) {
      const reviews = await api(`pulls/${PR}/reviews?per_page=100&page=${page}`);
      assert.ok(Array.isArray(reviews));
      if (reviews.some((review) => review.commit_id === env.GITHUB_SHA && review.body === body)) {
        published = true;
        break;
      }
      if (reviews.length < 100) break;
      assert.ok(page < 100, 'Setup review pagination exceeded its safety bound');
    }
    if (!published)
      await api(`pulls/${PR}/reviews`, { commit_id: env.GITHUB_SHA, event: 'COMMENT', body });
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await reviewBugSetup({ cwd: process.cwd() });
    console.log(JSON.stringify(result));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.error(
      'Setup review blocked. Inspect the durable budget and sanitized report; no retry/reset or API fallback was performed.',
    );
    process.exitCode = 1;
  }
}
