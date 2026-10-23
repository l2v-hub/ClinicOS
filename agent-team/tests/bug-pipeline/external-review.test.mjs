import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { externalReviewStep as actualExternalReviewStep } from '../../src/bug-pipeline/external-review.mjs';
import {
  reviewExternalBatch as actualReviewExternalBatch,
  claudeFailureCode,
} from '../../src/bug-pipeline/claude-review-cron.mjs';
import { runProcess } from '../../src/adapters/process-runner.mjs';
import { feedbackFingerprint, sha256 } from '../../src/bug-pipeline/contracts.mjs';
import { doctor } from '../../src/bug-pipeline/cli.mjs';

const communication = {
  publishState: async () => {},
  mirrorFeedback: async () => {},
};
const externalReviewStep = (args) => actualExternalReviewStep({ communication, ...args });
const reviewExternalBatch = (args) => actualReviewExternalBatch({ communication, ...args });

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
    workspace: {
      prepare: async () => {},
      finalQa: async () => ({
        status: 'verified',
        summary: 'Fresh independent QA',
      }),
    },
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
  f.batch.reviews = Array.from({ length: 4 }, (_, index) => ({
    ...last,
    round: index + 1,
  }));
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
  f.github.reviewFeedback = async () => ({
    ...feedback(f.batch),
    isDraft: true,
  });
  await assert.rejects(reviewExternalBatch(f));
  assert.equal(f.calls(), 0);
  f.github.reviewFeedback = async () => ({
    ...feedback(f.batch),
    headRepo: 'attacker/fork',
  });
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

test('new cron records bounded failure codes and publishes failure state without exposing local output or retrying inference', async (t) => {
  const f = await workerFixture(t);
  const notifications = [];
  await assert.rejects(
    reviewExternalBatch({
      ...f,
      communication: {
        mirrorFeedback: async () => {},
        publishState: async (batch) =>
          notifications.push({
            phase: batch.phase,
            status: batch.externalReview.status,
            code: batch.externalReview.failureCode,
          }),
      },
      run: async (call) =>
        call.command === 'claude' && call.args.includes('--print')
          ? {
              ok: false,
              code: 1,
              error: 'timeout',
              stderr: 'private diagnostic must never leave the host',
            }
          : f.run(call),
    }),
  );
  assert.equal(f.batch.reviews.length, 1);
  assert.equal(f.batch.reviews[0].status, 'failed');
  assert.equal(f.batch.externalReview.failureCode, 'claude-timeout');
  assert.equal(f.batch.phase, 'blocked');
  assert.deepEqual(
    notifications.map((item) => item.status),
    ['running', 'failed'],
  );
  assert.ok(!JSON.stringify(f.batch).includes('private diagnostic'));
  await assert.rejects(reviewExternalBatch(f), /not available/);
  assert.equal(f.batch.reviews.length, 1);
});

test('failure classification accepts only fixed result codes and never copies arbitrary model output', () => {
  const cases = [
    [{ ok: false, error: 'timeout' }, 'claude-timeout'],
    [{ ok: false, error: 'output-limit' }, 'claude-output-limit'],
    [{ ok: false, error: 'secret raw error', code: 1 }, 'claude-nonzero-exit'],
    [{ ok: true, stdout: 'not json' }, 'claude-invalid-json'],
    [{ ok: true, stdout: '{"subtype":"error_max_turns"}' }, 'claude-turn-limit'],
    [
      {
        ok: true,
        stdout: '{"is_error":true,"error":{"type":"authentication_error"}}',
      },
      'claude-authentication-error',
    ],
    [
      {
        ok: true,
        stdout: '{"is_error":true,"error":{"type":"rate_limit_error"}}',
      },
      'claude-rate-limit',
    ],
    [
      {
        ok: true,
        stdout: '{"is_error":true,"error":{"type":"overloaded_error"}}',
      },
      'claude-overloaded',
    ],
    [
      { ok: true, stdout: '{"is_error":true,"error":{"type":"raw secret"}}' },
      'claude-execution-error',
    ],
    [{ ok: true, stdout: '{}' }, 'claude-missing-structured-report'],
    [{ ok: true, stdout: '{"structured_output":{}}' }, null],
  ];
  for (const [input, expected] of cases) assert.equal(claudeFailureCode(input), expected);
});

test('transient issue-notification failure does not waste or retry the reserved model call', async (t) => {
  const f = await workerFixture(t);
  let notifications = 0;
  await reviewExternalBatch({
    ...f,
    communication: {
      mirrorFeedback: async () => {},
      publishState: async () => {
        notifications++;
        if (notifications < 3) throw new Error('Synthetic notification outage');
      },
    },
  });
  assert.equal(f.calls(), 1);
  assert.equal(f.batch.reviews.length, 1);
  assert.equal(f.batch.externalReview.status, 'published');
  assert.equal(notifications, 3);
});

test('issue notification outage after reserving a correction does not spend another implementation attempt or block real fixes', async (t) => {
  const f = await workerFixture(t, { verdict: 'changes-requested' });
  await reviewExternalBatch(f);
  const phases = [];
  await externalReviewStep({
    repo,
    batch: f.batch,
    gh: f.github,
    communication: {
      mirrorFeedback: async () => {},
      publishState: async () => {
        throw new Error('Synthetic notification outage');
      },
    },
    workspace: {
      prepare: async () => {},
      execute: async () => {
        phases.push('fix');
        return { status: 'implemented' };
      },
      verify: async () => phases.push('test'),
      simplify: async () => ({ status: 'implemented' }),
      qa: async () => ({ status: 'verified' }),
      checkpoint: async () => 'b'.repeat(40),
      publish: async () => phases.push('publish'),
      issueEvidence: async () => 'Synthetic evidence',
    },
    save: async () => {},
    report: async () => {},
    block: async (_, reason) => assert.fail(reason),
  });
  assert.deepEqual(phases, ['fix', 'test', 'test', 'publish']);
  assert.equal(f.batch.implementation.length, 2);
  assert.equal(f.batch.implementation.at(-1).status, 'passed');
  assert.equal(f.batch.reviews.length, 1);
  assert.equal(f.batch.externalReview.status, 'requested');
});

test('comment channel is preserved when requesting the next exact-SHA review', async () => {
  const batch = batchFixture();
  batch.reviewChannel = 'github-comments';
  await externalReviewStep({
    repo,
    batch,
    gh: {
      viewIssue: async () => ({ state: 'open' }),
      reviewFeedback: async () => feedback(batch),
      requiredChecks: async () => ({ ok: true }),
    },
    workspace: {},
    save: async () => {},
    report: async () => {},
    block: async () => assert.fail('no block'),
  });
  assert.equal(batch.externalReview.status, 'comment-requested');
  assert.equal(batch.externalReview.channel, 'github-comments');
  assert.match(batch.externalReview.requestId, /^[a-f0-9-]{36}$/);
});

test('Claude approval on comment channel requires a new independent Codex QA before readiness', async (t) => {
  const fixture = await workerFixture(t);
  await reviewExternalBatch(fixture);
  const { batch } = fixture;
  batch.externalReview.channel = 'github-comments';
  const calls = [];
  const args = {
    repo,
    batch,
    gh: {
      ...fixture.github,
      createStateStore: () => ({
        load: async () => ({ schemaVersion: 1, repository: repo, batches: [batch] }),
      }),
    },
    workspace: {
      prepare: async () => calls.push('prepare'),
      finalQa: async () => {
        calls.push('codex-qa');
        return {
          status: 'verified',
          summary: 'Independent synthetic review PASS',
        };
      },
    },
    save: async () => calls.push('save'),
    report: async () => {},
    block: async () => assert.fail('no block'),
  };
  await externalReviewStep(args);
  assert.equal(batch.codexFinalReview.status, 'verified');
  assert.equal(batch.codexFinalReview.subjectSha, batch.sha);
  assert.equal(batch.phase, 'ready');
  assert.equal(batch.approvedSha, batch.sha);
  assert.deepEqual(
    calls.filter((x) => x !== 'save'),
    ['prepare', 'codex-qa'],
  );
  await externalReviewStep(args);
  assert.equal(
    calls.filter((x) => x === 'codex-qa').length,
    1,
    'same immutable approval must not spend another QA session',
  );
});

function approvedExternalArgs() {
  const batch = batchFixture();
  const raw = JSON.stringify({
    subject_sha: batch.sha,
    verdict: 'approved',
    summary: 'Synthetic review',
    findings: [],
  });
  batch.reviews = [{ round: 1, status: 'approved', subjectSha: batch.sha }];
  batch.reviewReports = { 'claude-review-1.json': raw };
  batch.reviewLedger = {
    rounds: [
      {
        round: 1,
        verdict: 'approved',
        subject_sha: batch.sha,
        review_sha256: sha256(raw),
      },
    ],
  };
  batch.externalReview = {
    status: 'published',
    subjectSha: batch.sha,
    feedbackFingerprint: feedbackFingerprint(feedback(batch)),
    feedbackChanged: false,
  };
  const log = [];
  const args = {
    repo,
    batch,
    gh: {
      viewIssue: async () => ({ state: 'open' }),
      reviewFeedback: async () => feedback(batch),
      requiredChecks: async () => ({ ok: true }),
    },
    workspace: {
      prepare: async () => log.push('prepare'),
      finalQa: async () => {
        assert.equal(batch.codexFinalReview.status, 'running');
        assert.equal(
          batch.codexFinalReview.feedbackFingerprint,
          batch.externalReview.feedbackFingerprint,
        );
        assert.ok(log.includes('save:running'), 'durable reservation must precede fresh inference');
        log.push('qa');
        return { status: 'verified', summary: 'Independent final QA' };
      },
    },
    save: async () => log.push(`save:${batch.codexFinalReview?.status}`),
    report: async () => {},
    block: async (_, reason) => {
      batch.phase = 'blocked';
      batch.reason = reason;
      batch.approvedSha = null;
      log.push('blocked');
    },
  };
  return { args, batch, log };
}

test('standard external approval requires one fresh durable SHA/round/feedback-bound final QA', async () => {
  const { args, batch, log } = approvedExternalArgs();
  await externalReviewStep(args);
  assert.equal(batch.phase, 'ready');
  assert.equal(batch.codexFinalReview.subjectSha, batch.sha);
  assert.equal(batch.codexFinalReview.claudeRound, 1);
  assert.match(batch.codexFinalReview.nonce, /^[a-f0-9-]{36}$/);
  await externalReviewStep(args);
  assert.equal(log.filter((x) => x === 'qa').length, 1);
});

test('pending native checks or unresolved feedback never invoke final QA or transfer approval', async () => {
  for (const kind of ['checks', 'unresolved', 'changesRequested']) {
    const { args, batch, log } = approvedExternalArgs();
    if (kind === 'checks') args.gh.requiredChecks = async () => ({ ok: false });
    else {
      const f = { ...feedback(batch), [kind]: true };
      batch.externalReview.feedbackFingerprint = feedbackFingerprint(f);
      args.gh.reviewFeedback = async () => f;
    }
    await externalReviewStep(args);
    assert.equal(batch.phase, 'waiting-checks');
    assert.equal(batch.codexFinalReview, undefined);
    assert.equal(log.includes('qa'), false);
    assert.notEqual(batch.approvedSha, batch.sha);
  }
});

test('stale final QA bindings require a fresh session and retain previous evidence', async () => {
  for (const stale of [
    { subjectSha: 'b'.repeat(40) },
    { claudeRound: 0 },
    { feedbackFingerprint: 'old-feedback' },
  ]) {
    const { args, batch, log } = approvedExternalArgs();
    const old = {
      status: 'verified',
      subjectSha: batch.sha,
      claudeRound: 1,
      feedbackFingerprint: batch.externalReview.feedbackFingerprint,
      summary: 'Old QA',
      ...stale,
    };
    batch.codexFinalReview = structuredClone(old);
    await externalReviewStep(args);
    assert.equal(log.filter((x) => x === 'qa').length, 1);
    assert.deepEqual(batch.codexFinalReviewHistory, [old]);
    assert.equal(batch.phase, 'ready');
  }
});

test('running final QA ownership is not restarted even when its SHA is stale', async () => {
  const { args, batch, log } = approvedExternalArgs();
  const running = {
    status: 'running',
    subjectSha: 'b'.repeat(40),
    claudeRound: 1,
  };
  batch.codexFinalReview = structuredClone(running);
  await externalReviewStep(args);
  assert.deepEqual(batch.codexFinalReview, running);
  assert.equal(log.includes('qa'), false);
  assert.equal(batch.phase, 'blocked');
});

test('native checks or PR identity/feedback changing during final QA cannot become ready', async () => {
  for (const kind of ['checks', 'head', 'baseRef', 'headRepo', 'headIsFork', 'comments']) {
    const { args, batch, log } = approvedExternalArgs();
    let changed = false;
    const qa = args.workspace.finalQa;
    args.workspace.finalQa = async () => {
      const result = await qa();
      changed = true;
      return result;
    };
    args.gh.requiredChecks = async () => ({
      ok: !changed || kind !== 'checks',
    });
    args.gh.reviewFeedback = async () => ({
      ...feedback(batch),
      ...(changed
        ? {
            head: kind === 'head' ? 'b'.repeat(40) : batch.sha,
            baseRef: kind === 'baseRef' ? 'other' : 'main',
            headRepo: kind === 'headRepo' ? 'foreign/repo' : repo,
            headIsFork: kind === 'headIsFork',
            comments:
              kind === 'comments'
                ? [
                    {
                      id: 1,
                      body: 'new actionable feedback',
                      user: { login: 'human' },
                    },
                  ]
                : [],
          }
        : {}),
    });
    await externalReviewStep(args);
    assert.equal(log.filter((x) => x === 'qa').length, 1);
    assert.notEqual(batch.approvedSha, batch.sha);
    assert.equal(batch.phase, kind === 'checks' ? 'waiting-checks' : 'blocked');
  }
});

test('final QA exception is recorded without hiding a model retry or granting approval', async () => {
  const { args, batch, log } = approvedExternalArgs();
  args.workspace.finalQa = async () => {
    log.push('qa');
    throw new Error('synthetic model failure');
  };
  await assert.rejects(externalReviewStep(args), /synthetic model failure/);
  assert.equal(batch.codexFinalReview.status, 'failed');
  assert.equal(log.filter((x) => x === 'qa').length, 1);
  assert.notEqual(batch.approvedSha, batch.sha);
  assert.equal(batch.implementation.length, 1);
});

test('final QA findings use the existing consumed correction budget and new-SHA review request', async () => {
  const { args, batch, log } = approvedExternalArgs();
  args.workspace.finalQa = async () => ({
    status: 'blocked',
    summary: 'Correct regression first',
  });
  args.workspace.execute = async (_, options) => {
    assert.equal(options.phase, 'external-review-correction');
    assert.equal(options.feedback.codex.status, 'changes-requested');
    log.push('correction');
    return { status: 'implemented' };
  };
  args.workspace.verify = async () => {};
  args.workspace.simplify = async () => ({ status: 'implemented' });
  args.workspace.qa = async () => ({ status: 'verified' });
  args.workspace.checkpoint = async () => 'b'.repeat(40);
  args.workspace.publish = async () => {};
  args.workspace.issueEvidence = async () => 'Synthetic evidence';
  await externalReviewStep(args);
  assert.equal(batch.implementation.length, 2);
  assert.equal(batch.implementation[1].status, 'passed');
  assert.equal(batch.reviews.length, 1);
  assert.equal(batch.externalReview.status, 'requested');
  assert.equal(batch.externalReview.subjectSha, 'b'.repeat(40));
  assert.notEqual(batch.approvedSha, batch.sha);
});

test('native checks becoming pending before QA wait with no inference and resume after checks recover', async () => {
  const { args, batch, log } = approvedExternalArgs();
  let pending = false;
  args.workspace.prepare = async () => {
    pending = true;
  };
  args.gh.requiredChecks = async () => ({ ok: !pending });
  await externalReviewStep(args);
  assert.equal(batch.phase, 'waiting-checks');
  assert.equal(batch.codexFinalReview.status, 'waiting-checks');
  assert.equal(log.includes('qa'), false);
  pending = false;
  args.workspace.prepare = async () => {};
  await externalReviewStep(args);
  assert.equal(batch.phase, 'ready');
  assert.equal(log.filter((x) => x === 'qa').length, 1);
  assert.equal(batch.codexFinalReviewHistory[0].status, 'waiting-checks');
});

test('stale published handoff cannot invoke QA or transfer an otherwise valid old report', async () => {
  const { args, batch, log } = approvedExternalArgs();
  batch.externalReview.subjectSha = 'c'.repeat(40);
  await externalReviewStep(args);
  assert.equal(batch.phase, 'blocked');
  assert.equal(log.includes('qa'), false);
  assert.notEqual(batch.approvedSha, batch.sha);
});

test('final QA findings cannot renew exhausted implementation or review budgets', async () => {
  for (const exhausted of ['implementation', 'reviews']) {
    const { args, batch, log } = approvedExternalArgs();
    if (exhausted === 'implementation')
      batch.implementation = [1, 2, 3, 4].map((round) => ({
        round,
        status: 'passed',
      }));
    else {
      const report = batch.reviewReports['claude-review-1.json'];
      batch.reviews = [1, 2, 3, 4].map((round) => ({
        round,
        status: 'approved',
        subjectSha: batch.sha,
      }));
      batch.reviewReports['claude-review-4.json'] = report;
      batch.reviewLedger.rounds = [1, 2, 3, 4].map((round) => ({
        round,
        verdict: 'approved',
        subject_sha: batch.sha,
        review_sha256: sha256(report),
      }));
    }
    const history = structuredClone(batch[exhausted]);
    args.workspace.finalQa = async () => ({
      status: 'blocked',
      summary: 'Concrete finding',
    });
    args.workspace.execute = async () => assert.fail('exhausted correction cannot execute');
    await externalReviewStep(args);
    assert.equal(batch.phase, 'blocked');
    assert.deepEqual(batch[exhausted], history);
    assert.notEqual(batch.approvedSha, batch.sha);
  }
});

test('new feedback cannot start a correction while the prior final QA session remains running', async () => {
  const { args, batch, log } = approvedExternalArgs();
  batch.codexFinalReview = {
    status: 'running',
    subjectSha: batch.sha,
    claudeRound: 1,
  };
  batch.externalReview.feedbackChanged = true;
  args.workspace.execute = async () =>
    assert.fail('live QA ownership prevents concurrent correction');
  await externalReviewStep(args);
  assert.equal(batch.phase, 'blocked');
  assert.equal(batch.implementation.length, 1);
  assert.equal(log.includes('qa'), false);
  assert.equal(batch.codexFinalReview.status, 'running');
});

test('automatic external review ownership loss skips without correction, status block or model effects', async () => {
  const { args, batch, log } = approvedExternalArgs();
  const before = structuredClone(batch);
  args.communication = {
    mirrorFeedback: async (_, options) => {
      assert.deepEqual(options, { automatic: true });
      throw Object.assign(new Error('synthetic handover'), { code: 'review-operator-owned' });
    },
    publishState: async () => assert.fail('no retry publication'),
  };
  args.block = async () => assert.fail('new owner cannot receive generic blocked state');
  await assert.rejects(externalReviewStep(args), (error) => error.code === 'review-operator-owned');
  assert.deepEqual(batch, before);
  assert.deepEqual(log, []);
});

test('ownership loss in automatic informational publication is not swallowed before a correction model', async () => {
  const { args, batch, log } = approvedExternalArgs();
  batch.externalReview.feedbackChanged = true;
  args.communication = {
    mirrorFeedback: async (_, options) => assert.equal(options.automatic, true),
    publishState: async (_, options) => {
      assert.equal(options.automatic, true);
      throw Object.assign(new Error('synthetic handover'), { code: 'review-operator-owned' });
    },
  };
  args.workspace.execute = async () => assert.fail('model cannot start after observed handover');
  args.block = async () => assert.fail('no block to new operator owner');
  await assert.rejects(externalReviewStep(args), (error) => error.code === 'review-operator-owned');
  assert.equal(log.includes('qa'), false);
  assert.equal(
    batch.implementation.at(-1).status,
    'running',
    'already reserved claim is preserved, not relabelled failed',
  );
});

test('automatic external comment handoff inherits ownership context before native reconciliation or model work', async () => {
  const { args, batch, log } = approvedExternalArgs();
  batch.externalReview.channel = 'github-comments';
  args.gh.createStateStore = () => ({
    load: async () => ({
      schemaVersion: 1,
      repository: repo,
      batches: [batch],
      operatorTakeover: { active: true },
    }),
  });
  args.communication = {
    mirrorFeedback: async () => assert.fail('no later publication'),
    publishState: async () => assert.fail('no later publication'),
  };
  args.block = async () => assert.fail('owner cannot receive generic blocked state');
  const before = structuredClone(batch);
  await assert.rejects(externalReviewStep(args), (error) => error.code === 'review-operator-owned');
  assert.deepEqual(batch, before);
  assert.deepEqual(log, []);
});

test('Claude1 F3 recovered infrastructure failure retries only final QA and preserves code budget', async () => {
  const { args, batch, log } = approvedExternalArgs();
  const prior = {
    status: 'failed',
    subjectSha: batch.sha,
    claudeRound: 1,
    feedbackFingerprint: batch.externalReview.feedbackFingerprint,
    nonce: 'prior-failed',
    reservedAt: '2026-10-22T00:00:00Z',
  };
  batch.codexFinalReview = structuredClone(prior);
  args.workspace.execute = async () => assert.fail('infrastructure retry must not implement');
  await externalReviewStep(args);
  assert.equal(log.filter((x) => x === 'qa').length, 1);
  assert.equal(batch.phase, 'ready');
  assert.equal(batch.implementation.length, 1);
  assert.deepEqual(batch.codexFinalReviewHistory, [prior]);
});

test('Claude1 F3 final-QA inference retries are durably bounded independently of implementation', async () => {
  const { args, batch, log } = approvedExternalArgs();
  const before = structuredClone(batch.implementation);
  let calls = 0;
  args.workspace.finalQa = async () => {
    calls++;
    throw new Error('bounded infrastructure outage');
  };
  args.workspace.execute = async () => assert.fail('infrastructure never implements');
  for (let n = 0; n < 3; n++) {
    batch.phase = 'waiting-review'; // Explicit operator recovery, never an automatic unblock.
    await assert.rejects(externalReviewStep(args), /bounded infrastructure outage/);
    assert.equal(batch.codexFinalQaInfrastructure.attempts.length, n + 1);
    assert.ok(batch.codexFinalQaInfrastructure.attempts.every((x) => x.status === 'failed'));
  }
  batch.phase = 'waiting-review';
  await externalReviewStep(args);
  assert.equal(calls, 3);
  assert.equal(batch.codexFinalReview.failureCode, 'final-qa-infrastructure-exhausted');
  assert.equal(batch.phase, 'blocked');
  assert.deepEqual(batch.implementation, before);
  const history = structuredClone(batch.codexFinalReviewHistory);
  await externalReviewStep(args);
  assert.equal(calls, 3);
  assert.deepEqual(batch.codexFinalReviewHistory, history);
  assert.equal(log.includes('correction'), false);
});
test('Claude1 F3 waiting checks and pre-inference identity polling spend no infrastructure inference slots', async () => {
  const { args, batch, log } = approvedExternalArgs();
  let waiting = true;
  args.workspace.prepare = async () => {};
  let checks = 0;
  args.gh.requiredChecks = async () => ({ ok: ++checks % 2 === 1 || !waiting });
  for (let n = 0; n < 5; n++) {
    await externalReviewStep(args);
    assert.equal(batch.codexFinalReview.status, 'waiting-checks');
  }
  assert.equal(batch.codexFinalQaInfrastructure, undefined);
  assert.equal(log.includes('qa'), false);
  waiting = false;
  await externalReviewStep(args);
  assert.equal(batch.phase, 'ready');
  assert.equal(batch.codexFinalQaInfrastructure.attempts.length, 1);
});
test('Claude1 F3 unusable final QA verdict is infrastructure failure and never a code correction', async () => {
  const { args, batch } = approvedExternalArgs();
  args.workspace.finalQa = async () => ({ status: 'unavailable' });
  args.workspace.execute = async () => assert.fail('unavailable verdict must not implement');
  await assert.rejects(externalReviewStep(args), /no usable verdict/);
  assert.equal(batch.codexFinalReview.status, 'failed');
  assert.equal(batch.implementation.length, 1);
});

const qaIntent = (batch, nonce, status = 'failed') => ({
  status,
  nonce,
  subjectSha: batch.sha,
  claudeRound: batch.reviews.length,
  feedbackFingerprint: batch.externalReview.feedbackFingerprint,
  reservedAt: '2026-10-17T00:00:00.000Z',
});
test('QA6-F3 duplicate legacy intents across ledger and recovery histories count once, preserving originals', async () => {
  const { args, batch } = approvedExternalArgs();
  const legacy = qaIntent(batch, 'one-legacy-session');
  batch.qaHistory = [structuredClone(legacy)];
  batch.codexFinalReviewHistory = [structuredClone(legacy)];
  batch.codexFinalQaInfrastructure = {
    attempts: [structuredClone(legacy), structuredClone(legacy)],
  };
  const originalQaHistory = structuredClone(batch.qaHistory),
    originalLedger = structuredClone(batch.codexFinalQaInfrastructure.attempts);
  let calls = 0;
  args.workspace.finalQa = async () => {
    calls++;
    throw new Error('synthetic infrastructure failure');
  };
  args.workspace.execute = async () => assert.fail('infrastructure is not a code correction');
  for (let i = 0; i < 2; i++) {
    batch.phase = 'waiting-review';
    await assert.rejects(externalReviewStep(args), /synthetic infrastructure failure/);
  }
  batch.phase = 'waiting-review';
  await externalReviewStep(args);
  assert.equal(calls, 2);
  assert.equal(batch.codexFinalReview.failureCode, 'final-qa-infrastructure-exhausted');
  assert.deepEqual(batch.qaHistory, originalQaHistory);
  assert.deepEqual(batch.codexFinalQaInfrastructure.attempts.slice(0, 2), originalLedger);
  assert.deepEqual(batch.codexFinalReviewHistory[0], legacy);
  assert.equal(new Set(batch.codexFinalQaInfrastructure.attempts.map((x) => x.nonce)).size, 3);
  assert.equal(batch.implementation.length, 1);
});
test('QA6-F3 other identities and waiting/pre-QA blocked metadata never consume inference allowance', async () => {
  const { args, batch, log } = approvedExternalArgs();
  const metadata = ['waiting-checks', 'blocked'].map((status) =>
    qaIntent(batch, 'metadata-' + status, status),
  );
  const other = [
    { subjectSha: 'b'.repeat(40) },
    { claudeRound: 9 },
    { feedbackFingerprint: 'other-feedback' },
  ].map((patch, i) => ({ ...qaIntent(batch, 'other-' + i), ...patch }));
  batch.qaHistory = [...metadata, ...other];
  batch.codexFinalReviewHistory = structuredClone(batch.qaHistory);
  batch.codexFinalQaInfrastructure = { attempts: structuredClone(metadata) };
  const original = structuredClone(batch.qaHistory);
  await externalReviewStep(args);
  assert.equal(batch.phase, 'ready');
  assert.equal(log.filter((x) => x === 'qa').length, 1);
  assert.deepEqual(batch.qaHistory, original);
  assert.equal(
    batch.codexFinalQaInfrastructure.attempts.filter((x) => x.status === 'verified').length,
    1,
  );
});
test('QA6-F3 ambiguous spent legacy intent cannot trigger inference or implementation retry', async () => {
  for (const missing of [
    'nonce',
    'subjectSha',
    'claudeRound',
    'feedbackFingerprint',
    'reservedAt',
  ]) {
    const { args, batch, log } = approvedExternalArgs();
    const ambiguous = qaIntent(batch, 'missing');
    delete ambiguous[missing];
    batch.qaHistory = [structuredClone(ambiguous)];
    args.workspace.execute = async () =>
      assert.fail('ambiguous legacy intent is not a code finding');
    await externalReviewStep(args);
    assert.equal(batch.phase, 'blocked', missing);
    assert.equal(batch.codexFinalReview.failureCode, 'final-qa-infrastructure-history-ambiguous');
    assert.deepEqual(batch.qaHistory, [ambiguous]);
    assert.equal(log.includes('qa'), false);
    assert.equal(batch.implementation.length, 1);
  }
});

test('QA6-F5 typed ownership loss inside correction preserves the already reserved running tombstone', async () => {
  const { args, batch } = approvedExternalArgs();
  batch.externalReview.feedbackChanged = true;
  args.workspace.prepare = async () => {};
  args.workspace.execute = async () => {
    throw Object.assign(new Error('observed owner'), { code: 'review-operator-owned' });
  };
  args.block = async () => assert.fail('no operator block');
  await assert.rejects(externalReviewStep(args), (error) => error.code === 'review-operator-owned');
  assert.equal(batch.implementation.at(-1).status, 'running');
});
