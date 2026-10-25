import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, writeFile, rm, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import {
  createWorkspace,
  runImplementationStages,
  knownFailedCorrection,
} from '../../src/bug-pipeline/workspace.mjs';
import { createCommentReviewHandoff } from '../../src/bug-pipeline/comment-review-handoff.mjs';
import { externalReviewStep } from '../../src/bug-pipeline/external-review.mjs';
import {
  historyDigest,
  attemptLimit,
  reserveImplementation,
} from '../../src/bug-pipeline/attempt-budget.mjs';

const exec = promisify(execFile);
const repo = 'l2v-hub/ClinicOS';
const git = async (cwd, ...args) => (await exec('git', args, { cwd })).stdout.trim();
const clone = structuredClone;

// QA1 F1's real post-checkpoint capture-failure call chain, retained unchanged
// through its original settlement + allowance + resume refusal assertions below.
async function fixture(t, { unknownPublish = false, externalVerifier = true } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'controller-checkpoint-recovery-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await git(root, 'init', '-b', 'main');
  await git(root, 'config', 'user.email', 'synthetic-controller@example.invalid');
  await git(root, 'config', 'user.name', 'Synthetic controller');
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, 'src/feature.ts'), 'export const value = 1;\n');
  await git(root, 'add', '.');
  await git(root, 'commit', '-m', 'synthetic fixture');
  const id = 'bug-batch-17',
    branch = `codex/${id}`;
  const cwd = path.join(root, 'agent-team/.worktrees', id);
  await git(root, 'worktree', 'add', '-b', branch, cwd, 'main');
  const packet = path.join(cwd, 'artifacts/task-validation', id);
  await mkdir(packet, { recursive: true });
  const packetHashes = {};
  for (const file of ['task-contract.md', 'implementation-plan.md', 'analysis.md']) {
    const content = '# Synthetic fixed checkpoint fixture\n';
    await writeFile(path.join(packet, file), content);
    packetHashes[file] = createHash('sha256').update(content).digest('hex');
  }
  await git(cwd, 'add', '.');
  await git(cwd, 'commit', '-m', 'synthetic frozen packet');
  const sourceSha = await git(cwd, 'rev-parse', 'HEAD');
  const batch = {
    id,
    branch,
    issues: [17],
    sha: sourceSha,
    baseSha: sourceSha,
    packetHashes,
    phase: 'blocked',
    pr: { number: 81 },
    plan: {
      title: 'Synthetic controller',
      analysis: 'Fault injection',
      feature: 'controller',
      rationale: 'test',
      issues: [17],
      scope: ['src/feature.ts'],
      acceptance: [{ issue: 17, criteria: ['Synthetic regression is verified.'] }],
      tasks: [
        { title: 'Synthetic fix', files: ['src/feature.ts'], steps: ['Change synthetic value.'] },
      ],
      evidence: [
        {
          issue: 17,
          screenshot: `artifacts/task-validation/${id}/evidence/17.png`,
          trace: `artifacts/task-validation/${id}/evidence/17.zip`,
          video: '',
        },
      ],
      verification: [
        { command: 'node', args: ['--test', 'src/feature.test.mjs'] },
        { command: 'npm', args: ['--prefix', 'frontend', 'run', 'build'] },
      ],
    },
    implementation: [1, 2, 3, 4].map((round) => ({
      round,
      status: round === 4 ? 'running' : 'failed',
    })),
    reviews: [{ round: 1, status: 'changes-requested', subjectSha: sourceSha }],
    externalReview: { status: 'published', subjectSha: sourceSha },
  };
  let failNextCapture = false,
    faultInjected = false,
    paid = 0,
    publish = 0;
  const workspace = createWorkspace({
    root,
    repo,
    run: async ({ command, args, cwd: runCwd }) => {
      if (command === 'codex') {
        const evidenceFixture = fileURLToPath(
          new URL(
            '../../../artifacts/task-validation/codex-triage-bug-github-e-piano-per-claude/',
            import.meta.url,
          ),
        );
        await mkdir(path.join(packet, 'evidence'), { recursive: true });
        await copyFile(
          path.join(evidenceFixture, 'result.png'),
          path.join(packet, 'evidence/17.png'),
        );
        await copyFile(
          path.join(evidenceFixture, 'trace.zip'),
          path.join(packet, 'evidence/17.zip'),
        );
        return { ok: true, code: 0, stdout: '# tests 1\n# pass 1\n', stderr: '' };
      }
      assert.equal(command, 'git');
      if (failNextCapture && args[0] === 'worktree' && args[1] === 'list') {
        failNextCapture = false;
        faultInjected = true;
        return { ok: false, stdout: '', stderr: 'Synthetic transient capture failure' };
      }
      if (args.includes('push')) {
        publish++;
        throw Object.assign(new Error('Synthetic unknown publication outcome'), {
          code: 'github-write-uncertain',
        });
      }
      const stdout = await git(runCwd, ...args);
      if (!unknownPublish && !faultInjected && args.includes('commit')) failNextCapture = true;
      return { ok: true, stdout, stderr: '' };
    },
    models: {
      execute: async () => {
        paid++;
        await writeFile(path.join(cwd, 'src/feature.ts'), `export const value = ${paid + 1};\n`);
        return { status: 'implemented' };
      },
      simplify: async () => ({ status: 'implemented' }),
      qa: async () => ({ status: 'verified', summary: 'Synthetic controller fixture' }),
    },
  });
  await assert.rejects(
    runImplementationStages({
      batch,
      workspace,
      save: async () => {},
      context: {
        phase: 'external-review-correction',
        round: 4,
        implementationRound: 4,
        feedback: null,
      },
    }),
    (error) =>
      error.code === (unknownPublish ? 'github-write-uncertain' : 'controller-execution-failed'),
  );
  assert.notEqual(batch.sha, sourceSha);
  assert.equal(batch.controllerProgress.status, 'running');
  assert.equal(batch.controllerProgress.next, 6);
  assert.equal(batch.implementation[3].status, 'running');
  const checkpointSha = batch.sha;
  batch.phase = 'blocked';
  batch.failureCode = unknownPublish ? 'github-write-uncertain' : 'controller-execution-failed';
  let remote = { schemaVersion: 1, repository: repo, batches: [clone(batch)] };
  const observed = {
    state: 'OPEN',
    isDraft: false,
    head: sourceSha,
    headRef: branch,
    headRepo: repo,
    headIsFork: false,
    baseRef: 'main',
    comments: [],
    unresolved: false,
    changesRequested: false,
  };
  let onObserve = () => {},
    onAuthorize = () => {},
    failSave = false;
  const github = {
    authorized: async () => true,
    authorizedMaintainer: async () => true,
    createStateStore: () => ({
      load: async () => clone(remote),
      save: async (state, options) => {
        await options.guard();
        if (failSave) throw new Error('Synthetic save failed');
        remote = clone(state);
      },
    }),
    reviewFeedback: async () => {
      onObserve();
      return clone(observed);
    },
    viewIssue: async () => ({ state: 'open' }),
    requiredChecks: async () => ({ ok: true }),
  };
  let nonce = 0;
  const handoff = createCommentReviewHandoff({
    github,
    cwd: root,
    workspace,
    run: async () => ({ ok: true, stdout: JSON.stringify({ login: 'synthetic-maintainer' }) }),
    authorizationVerifier: externalVerifier
      ? async ({ binding }) => {
          onAuthorize(binding);
          return {
            provenance: 'user-session',
            grantId: 'test:grant',
            sourceRef: 'test:session',
            consumptionNonce: `test:${++nonce}`,
            binding,
          };
        }
      : undefined,
  });
  const settle = () =>
    handoff.recover(81, {
      action: 'settle-implementation',
      expectedSha: checkpointSha,
      token: historyDigest(remote.batches[0].controllerProgress),
      round: 4,
      reason: 'Audited capture failure settlement',
      authorizationRef: 'test:settle',
    });
  const extend = () =>
    handoff.extendBudget(81, {
      kind: 'implementation',
      limit: 5,
      reason: 'One fresh correction',
      authorizationRef: 'test:allowance',
    });
  const resume = () =>
    handoff.recover(81, {
      action: 'resume',
      expectedSha: remote.batches[0].sha,
      token: historyDigest({
        phase: remote.batches[0].phase,
        failureCode: remote.batches[0].failureCode,
      }),
      reason: 'Resume after exact reconciliation',
    });
  const options = () => ({
    action: 'reconcile-implementation-checkpoint',
    expectedSha: checkpointSha,
    token: historyDigest(remote.batches[0].controllerProgress),
    round: 4,
    reason: 'Exact native remote and local checkpoint reconciliation',
    authorizationRef: 'test:reconcile',
  });
  return {
    root,
    cwd,
    batch,
    workspace,
    github,
    handoff,
    observed,
    sourceSha,
    checkpointSha,
    current: () => remote.batches[0],
    state: () => remote,
    paid: () => paid,
    publish: () => publish,
    settle,
    extend,
    resume,
    options,
    onObserve: (fn) => {
      onObserve = fn;
    },
    onAuthorize: (fn) => {
      onAuthorize = fn;
    },
    failSave: (value) => {
      failSave = value;
    },
  };
}

async function originalQa1RefusalAssertions(f) {
  await f.settle();
  await f.extend();
  const current = f.current();
  assert.equal(current.controllerProgress.status, 'failed');
  assert.equal(current.implementation[3].status, 'failed');
  assert.equal(attemptLimit(current, 'implementation'), 5);
  assert.equal(knownFailedCorrection(current), false);
  await assert.rejects(f.resume(), /unused audited correction and review allowances/);
  f.observed.head = current.sha;
  await assert.rejects(f.resume(), /unused audited correction and review allowances/);
  assert.equal(f.paid(), 1);
  assert.equal(f.publish(), 0);
}

test('QA1 F1 unchanged refusal assertions followed by authorized unpublished source restoration and budgeted fresh correction', async (t) => {
  const f = await fixture(t);
  await originalQa1RefusalAssertions(f);
  f.observed.head = f.sourceSha;
  const opts = f.options();
  const previous = clone(f.current().controllerProgress);
  const repaired = await f.handoff.recover(81, opts);
  assert.equal(repaired.sha, f.sourceSha);
  assert.equal(await git(f.cwd, 'rev-parse', 'HEAD'), f.sourceSha);
  assert.equal(await git(f.cwd, 'status', '--porcelain'), '');
  assert.equal(
    await git(
      f.cwd,
      'rev-parse',
      `refs/clinicos/checkpoint-recovery/${repaired.id}/${f.checkpointSha}`,
    ),
    f.checkpointSha,
  );
  assert.equal(repaired.controllerProgress.checkpointRecovery.outcome, 'source-restored');
  assert.deepEqual(repaired.controllerProgress.completed, previous.completed);
  assert.deepEqual(repaired.recoveryHistory.at(-1).previous.progress, previous);
  assert.equal(repaired.implementation.length, 4);
  assert.equal(repaired.implementation[3].status, 'failed');
  assert.equal(knownFailedCorrection(repaired), true);
  await assert.rejects(f.handoff.recover(81, opts), /durable subject SHA/);
  await f.resume();
  const current = f.current();
  await f.workspace.prepare(current);
  const next = reserveImplementation(current);
  assert.equal(next.round, 5);
  assert.equal(f.paid(), 1, 'Reconciliation and resume perform no inference');
  f.workspace.publish = async () => {};
  await runImplementationStages({
    batch: current,
    workspace: f.workspace,
    save: async () => {},
    context: {
      phase: 'external-review-correction',
      round: next.round,
      implementationRound: next.round,
      feedback: current.controllerProgress.feedback,
    },
  });
  assert.equal(f.paid(), 2, 'The separately budgeted fresh correction can execute');
  assert.equal(current.controllerProgress.status, 'completed');
  assert.equal(
    current.controllerProgressHistory.at(-1).checkpointRecovery.outcome,
    'source-restored',
  );
  assert.equal(current.implementation[3].status, 'failed');
});

test('QA1 F1 observed checkpoint publication requests a new-head review without republish or old-review correction', async (t) => {
  const f = await fixture(t);
  await originalQa1RefusalAssertions(f);
  const reviewHistory = clone(f.current().reviews);
  const opts = f.options();
  const repaired = await f.handoff.recover(81, opts);
  assert.equal(repaired.sha, f.checkpointSha);
  assert.equal(repaired.phase, 'waiting-checks');
  assert.equal(repaired.externalReview, null);
  assert.equal(repaired.controllerProgress.status, 'completed');
  assert.equal(repaired.controllerProgress.completed[6].step, 'publish');
  assert.equal(repaired.controllerProgress.checkpointRecovery.outcome, 'publication-observed');
  await assert.rejects(f.handoff.recover(81, opts), /Exact settled/);
  const next = f.current();
  await externalReviewStep({
    repo,
    batch: next,
    gh: f.github,
    workspace: {
      prepare: async () => assert.fail('No old-review correction'),
      execute: async () => assert.fail('No new inference'),
      publish: async () => assert.fail('No blind publication'),
    },
    communication: { publishState: async () => {}, mirrorFeedback: async () => {} },
    save: async () => {},
    report: async () => {},
    block: async () => assert.fail('Native new head is reviewable'),
  });
  assert.equal(next.externalReview.status, 'requested');
  assert.equal(next.externalReview.subjectSha, f.checkpointSha);
  assert.deepEqual(next.reviews, reviewHistory);
  assert.equal(next.implementation.length, 4);
  assert.equal(next.implementation[3].status, 'failed');
  assert.equal(f.paid(), 1);
  assert.equal(f.publish(), 0);
});

for (const invalid of [
  'unknown-head',
  'unavailable-observation',
  'changed-observation',
  'dirty-local',
  'foreign-branch',
  'changed-token',
  'changed-round',
]) {
  test(`checkpoint recovery refuses ${invalid} before source restoration or inference`, async (t) => {
    const f = await fixture(t);
    await f.settle();
    const before = clone(f.current());
    const opts = f.options();
    if (invalid === 'unknown-head') f.observed.head = 'f'.repeat(40);
    if (invalid === 'unavailable-observation')
      f.onObserve(() => {
        throw new Error('Synthetic native observation unavailable');
      });
    if (invalid === 'changed-observation')
      f.onAuthorize(() => {
        f.observed.head = 'f'.repeat(40);
      });
    if (invalid === 'dirty-local') await writeFile(path.join(f.cwd, 'src/feature.ts'), 'dirty');
    if (invalid === 'foreign-branch') await git(f.cwd, 'switch', '-c', 'foreign');
    if (invalid === 'changed-token') opts.token = 'f'.repeat(64);
    if (invalid === 'changed-round') opts.round = 3;
    await assert.rejects(f.handoff.recover(81, opts));
    assert.deepEqual(f.current(), before);
    assert.equal(await git(f.cwd, 'rev-parse', 'HEAD'), f.checkpointSha);
    assert.equal(f.paid(), 1);
    assert.equal(f.publish(), 0);
  });
}

for (const observedHead of ['unknown', 'source', 'checkpoint']) {
  test(`unknown publish stays blocked until native ${observedHead} head observation is usable`, async (t) => {
    const f = await fixture(t, { unknownPublish: true });
    assert.equal(f.batch.controllerProgress.pending, 'publish');
    await f.settle();
    const opts = f.options();
    if (observedHead === 'unknown') {
      f.observed.head = 'f'.repeat(40);
      await assert.rejects(f.handoff.recover(81, opts), /not authoritatively observed/);
      assert.equal(f.current().phase, 'blocked');
    } else {
      f.observed.head = observedHead === 'source' ? f.sourceSha : f.checkpointSha;
      const repaired = await f.handoff.recover(81, opts);
      assert.equal(repaired.sha, f.observed.head);
      assert.equal(repaired.phase, observedHead === 'source' ? 'blocked' : 'waiting-checks');
      if (observedHead === 'source') await assert.rejects(f.resume(), /allowances/);
    }
    assert.equal(f.paid(), 1);
    assert.equal(f.publish(), 1, 'The uncertain original push is never replayed');
    assert.equal(f.current().implementation.length, 4);
    assert.equal(attemptLimit(f.current(), 'implementation'), 4);
  });
}

test('checkpoint source restoration is recoverable after a failed state save and still needs an allowance', async (t) => {
  const f = await fixture(t);
  await f.settle();
  const opts = f.options();
  f.failSave(true);
  await assert.rejects(f.handoff.recover(81, opts), /Synthetic save failed/);
  assert.equal(f.current().sha, f.checkpointSha);
  assert.equal(await git(f.cwd, 'rev-parse', 'HEAD'), f.sourceSha);
  f.failSave(false);
  const repaired = await f.handoff.recover(81, opts);
  assert.equal(repaired.sha, f.sourceSha);
  assert.equal(repaired.recoveryHistory.filter((item) => item.action === opts.action).length, 1);
  await assert.rejects(f.resume(), /allowances/);
  assert.equal(f.paid(), 1);
  assert.equal(f.publish(), 0);
});

test('checkpoint reconciliation cannot consume free-text maintainer permission without the injected verifier', async (t) => {
  const f = await fixture(t);
  await f.settle();
  const before = clone(f.current());
  const untrusted = createCommentReviewHandoff({
    github: f.github,
    cwd: f.root,
    workspace: f.workspace,
    run: async () => ({ ok: true, stdout: JSON.stringify({ login: 'synthetic-maintainer' }) }),
  });
  await assert.rejects(untrusted.recover(81, f.options()), /verifier unavailable/);
  assert.deepEqual(f.current(), before);
  assert.equal(await git(f.cwd, 'rev-parse', 'HEAD'), f.checkpointSha);
  assert.equal(f.paid(), 1);
  assert.equal(f.publish(), 0);
});

test('a remote checkpoint published after failed restoration-save reconciles the archived checkpoint without replay', async (t) => {
  const f = await fixture(t);
  await f.settle();
  const opts = f.options();
  f.failSave(true);
  await assert.rejects(f.handoff.recover(81, opts), /Synthetic save failed/);
  assert.equal(await git(f.cwd, 'rev-parse', 'HEAD'), f.sourceSha);
  f.failSave(false);
  f.observed.head = f.checkpointSha;
  const repaired = await f.handoff.recover(81, opts);
  assert.equal(repaired.sha, f.checkpointSha);
  assert.equal(await git(f.cwd, 'rev-parse', 'HEAD'), f.checkpointSha);
  assert.equal(await git(f.cwd, 'status', '--porcelain'), '');
  assert.equal(repaired.externalReview, null);
  assert.equal(repaired.controllerProgress.checkpointRecovery.outcome, 'publication-observed');
  assert.equal(f.paid(), 1);
  assert.equal(f.publish(), 0);
});
