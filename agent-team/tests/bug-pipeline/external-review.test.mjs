import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { externalReviewStep } from '../../src/bug-pipeline/external-review.mjs';
import { reviewExternalBatch } from '../../src/bug-pipeline/claude-review-cron.mjs';
import { runProcess } from '../../src/adapters/process-runner.mjs';
import { feedbackFingerprint } from '../../src/bug-pipeline/contracts.mjs';
import { doctor } from '../../src/bug-pipeline/cli.mjs';

const repo = 'l2v-hub/ClinicOS';
const sha = 'a'.repeat(40);
function batchFixture() {
  const batch = {
    id: 'bug-batch-17',
    branch: 'codex/bug-batch-17',
    issues: [17],
    phase: 'waiting-checks',
    implementation: [{ round: 1, status: 'passed' }],
    reviews: [],
    sha,
    pr: { number: 81, url: `https://github.com/${repo}/pull/81` },
    plan: {
      title: 'Fix filter',
      feature: 'Filter',
      rationale: 'One regression',
      execution: { difficulty: 'low', mode: 'direct', reason: 'Bounded' },
      analysis: 'Filter hides a row',
      issues: [17],
      scope: ['feature.ts'],
      acceptance: [{ issue: 17, criteria: ['Rows visible'] }],
      tasks: [{ title: 'Fix', files: ['feature.ts'], steps: ['Fix filter'] }],
      verification: [
        { command: 'npm', args: ['--prefix', 'frontend', 'run', 'build'] },
        { command: 'node', args: ['--test', 'filter.test.mjs'] },
      ],
      evidence: [
        {
          issue: 17,
          screenshot: 'artifacts/task-validation/bug-batch-17/evidence/17.png',
          trace: 'artifacts/task-validation/bug-batch-17/evidence/17.zip',
          video: '',
        },
      ],
    },
  };
  return batch;
}
function feedback(batch) {
  return {
    state: 'OPEN',
    isDraft: false,
    head: batch.sha,
    headRef: batch.branch,
    headRepo: repo,
    headIsFork: false,
    baseRef: 'main',
    comments: [],
    unresolved: false,
    changesRequested: false,
  };
}

test('external doctor requires no Claude credential or Claude subprocess', async () => {
  const calls = [];
  const result = await doctor({
    cwd: '/tmp',
    env: {
      BUG_PIPELINE_REVIEW_MODE: 'external',
      CODEX_API_KEY: 'synthetic',
      CODEX_PLANNER_MODEL: 'gpt-6.1-sol',
      CODEX_EXECUTOR_MODEL: 'auto',
    },
    models: { preflight: async () => ({ ready: true }) },
    run: async (call) => {
      calls.push(call.command);
      return { ok: true, stdout: 'sandbox-ready' };
    },
  });
  assert.equal(result.ready, true);
  assert.equal(result.checks.externalReviewer, true);
  assert.equal(result.checks.claudeAuth, undefined);
  assert.deepEqual(calls, ['codex']);
});

test('request waits for real checks, then makes the PR ready without executing Claude', async () => {
  const batch = batchFixture();
  let checks = false;
  const calls = [];
  const args = {
    repo,
    batch,
    gh: {
      viewIssue: async () => ({ state: 'open' }),
      reviewFeedback: async () => ({ ...feedback(batch), isDraft: true }),
      requiredChecks: async () => ({ ok: checks }),
      draftReady: async () => calls.push('ready'),
    },
    workspace: {},
    save: async () => calls.push('save'),
    report: async () => calls.push('report'),
    block: async () => assert.fail('not blocked'),
  };
  await externalReviewStep(args);
  assert.equal(batch.phase, 'waiting-checks');
  assert.equal(batch.externalReview, undefined);
  checks = true;
  await externalReviewStep(args);
  assert.equal(batch.phase, 'waiting-review');
  assert.equal(batch.externalReview.status, 'requested');
  assert.deepEqual(calls, ['save', 'ready', 'save', 'report']);
});

async function workerFixture(t, { conflict = false, verdict = 'approved' } = {}) {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'external-review-test-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  git('init', '-b', 'main');
  git('config', 'user.name', 'Synthetic QA');
  git('config', 'user.email', 'qa@example.invalid');
  const packet = 'artifacts/task-validation/bug-batch-17';
  await mkdir(path.join(cwd, packet), { recursive: true });
  for (const file of ['task-contract.md', 'implementation-plan.md'])
    await writeFile(path.join(cwd, packet, file), 'Synthetic criteria');
  await writeFile(path.join(cwd, 'feature.ts'), 'export const value=0;');
  git('add', '.');
  git('commit', '-m', 'Synthetic fixture');
  const batch = batchFixture();
  batch.sha = git('rev-parse', 'HEAD');
  batch.baseSha = batch.sha;
  batch.phase = 'waiting-review';
  batch.externalReview = {
    status: 'requested',
    subjectSha: batch.sha,
    feedbackFingerprint: feedbackFingerprint(feedback(batch)),
  };
  const state = { schemaVersion: 1, repository: repo, batches: [batch] };
  let remote;
  let calls = 0;
  let publications = 0;
  let failPost = false;
  const store = {
    save: async (value) => {
      if (conflict) throw new Error('CAS conflict');
      remote = structuredClone(value);
    },
  };
  const github = {
    viewIssue: async () => ({ state: 'open' }),
    reviewFeedback: async () => feedback(batch),
    requiredChecks: async () => ({ ok: true }),
    publishExternalReview: async () => {
      if (failPost) {
        failPost = false;
        throw new Error('POST failed');
      }
      publications++;
    },
    commentIssue: async () => {},
  };
  const run = async (call) => {
    if (call.command !== 'claude') return runProcess(call);
    if (call.args[0] === '--help')
      return {
        ok: true,
        stdout:
          '--print --output-format --json-schema --tools --permission-mode --restricted --setting-sources --strict-mcp-config --mcp-config',
      };
    if (call.args[0] === 'auth') return { ok: true, stdout: '{"loggedIn":true}' };
    assert.equal(remote.batches[0].reviews.at(-1).status, 'running');
    calls++;
    return {
      ok: true,
      stdout: JSON.stringify({
        structured_output: {
          subject_sha: batch.sha,
          verdict,
          summary: 'Synthetic review',
          findings:
            verdict === 'approved'
              ? []
              : [
                  {
                    severity: 'medium',
                    file: 'feature.ts',
                    line: 1,
                    problem: 'Missing filter',
                    requested_change: 'Fix filter',
                    test_expectation: 'Rows render',
                  },
                ],
        },
      }),
    };
  };
  return {
    cwd,
    state,
    batch,
    store,
    github,
    run,
    calls: () => calls,
    publications: () => publications,
    failPost: () => {
      failPost = true;
    },
  };
}

test('external harness reserves remotely before inference, publishes hashed approval and Codex accepts the exact revision', async (t) => {
  const f = await workerFixture(t);
  await reviewExternalBatch(f);
  assert.equal(f.calls(), 1);
  assert.equal(f.batch.externalReview.status, 'published');
  assert.equal(f.publications(), 1);
  await externalReviewStep({
    repo,
    batch: f.batch,
    gh: f.github,
    workspace: {},
    save: async () => {},
    report: async () => {},
    block: async () => assert.fail('approval blocked'),
  });
  assert.equal(f.batch.phase, 'ready');
  assert.equal(f.batch.approvedSha, f.batch.sha);
});

test('external publication failure is retryable without another model call; a CAS conflict prevents inference', async (t) => {
  const f = await workerFixture(t);
  f.failPost();
  await assert.rejects(reviewExternalBatch(f), /POST failed/);
  assert.equal(f.batch.externalReview.status, 'finished');
  assert.equal(f.calls(), 1);
  await reviewExternalBatch(f);
  assert.equal(f.calls(), 1);
  assert.equal(f.batch.externalReview.status, 'published');
  const conflict = await workerFixture(t, { conflict: true });
  await assert.rejects(reviewExternalBatch(conflict), /CAS conflict/);
  assert.equal(conflict.calls(), 0);
});

test('Claude findings trigger fresh Codex correction, test/simplification/QA, new SHA and a new bounded request', async (t) => {
  const f = await workerFixture(t, { verdict: 'changes-requested' });
  await reviewExternalBatch(f);
  const phases = [];
  const workspace = {
    prepare: async () => {},
    execute: async () => {
      phases.push('fix');
      return { status: 'implemented' };
    },
    verify: async () => phases.push('test'),
    simplify: async () => {
      phases.push('simplify');
      return { status: 'implemented' };
    },
    qa: async () => {
      phases.push('qa');
      return { status: 'verified' };
    },
    checkpoint: async () => 'b'.repeat(40),
    publish: async () => phases.push('publish'),
    issueEvidence: async () => 'Synthetic evidence',
  };
  await externalReviewStep({
    repo,
    batch: f.batch,
    gh: f.github,
    workspace,
    save: async () => {},
    report: async () => {},
    block: async () => assert.fail('correction blocked'),
  });
  assert.deepEqual(phases, ['fix', 'test', 'simplify', 'test', 'qa', 'publish']);
  assert.equal(f.batch.sha, 'b'.repeat(40));
  assert.equal(f.batch.reviews.length, 1);
  assert.equal(f.batch.implementation.length, 2);
  assert.equal(f.batch.externalReview.status, 'requested');
  assert.equal(f.batch.externalReview.subjectSha, f.batch.sha);
});

test('new human comments invalidate approval and exhausted review budgets block correction instead of starting round five', async (t) => {
  const f = await workerFixture(t);
  await reviewExternalBatch(f);
  f.github.reviewFeedback = async () => ({
    ...feedback(f.batch),
    comments: [{ id: 99, body: 'Please fix this edge case' }],
  });
  const last = f.batch.reviews[0];
  f.batch.reviews = Array.from({ length: 4 }, (_, index) => ({ ...last, round: index + 1 }));
  const content = f.batch.reviewReports['claude-review-1.json'];
  f.batch.reviewReports['claude-review-4.json'] = content;
  f.batch.reviewLedger.rounds = Array.from({ length: 4 }, (_, index) => ({
    ...f.batch.reviewLedger.rounds[0],
    round: index + 1,
  }));
  let reason;
  await externalReviewStep({
    repo,
    batch: f.batch,
    gh: f.github,
    workspace: {},
    save: async () => {},
    report: async () => {},
    block: async (batch, text) => {
      reason = text;
      batch.phase = 'blocked';
    },
  });
  assert.match(reason, /Four external/);
  assert.equal(f.batch.phase, 'blocked');
  assert.equal(f.calls(), 1);
});

test('human feedback arriving with review publication is retained rather than silently included in approval', async (t) => {
  const f = await workerFixture(t);
  f.github.reviewFeedback = async () => ({
    ...feedback(f.batch),
    comments: f.publications() ? [{ id: 501, body: 'Concurrent edge case' }] : [],
  });
  await reviewExternalBatch(f);
  assert.equal(f.batch.externalReview.feedbackChanged, true);
});

test('draft or foreign PRs and an exhausted external budget never start a model', async (t) => {
  const f = await workerFixture(t);
  f.github.reviewFeedback = async () => ({ ...feedback(f.batch), isDraft: true });
  await assert.rejects(reviewExternalBatch(f));
  assert.equal(f.calls(), 0);
  f.github.reviewFeedback = async () => ({ ...feedback(f.batch), headRepo: 'attacker/fork' });
  await assert.rejects(reviewExternalBatch(f));
  assert.equal(f.calls(), 0);
  f.github.reviewFeedback = async () => feedback(f.batch);
  f.batch.reviews = Array.from({ length: 4 }, (_, i) => ({
    round: i + 1,
    subjectSha: 'b'.repeat(40),
    status: 'failed',
  }));
  await assert.rejects(reviewExternalBatch(f), /Four-review limit/);
  assert.equal(f.calls(), 0);
});

test('closed source issues block the external harness and Codex before review or correction', async (t) => {
  const f = await workerFixture(t);
  f.github.viewIssue = async () => ({ state: 'closed' });
  await assert.rejects(reviewExternalBatch(f), /closed or cancelled/);
  assert.equal(f.calls(), 0);
  let reason;
  await externalReviewStep({
    repo,
    batch: f.batch,
    gh: f.github,
    workspace: {},
    save: async () => {},
    report: async () => {},
    block: async (batch, text) => {
      reason = text;
      batch.phase = 'blocked';
    },
  });
  assert.match(reason, /closed or cancelled/);
  assert.equal(f.batch.phase, 'blocked');
});
