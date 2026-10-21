import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createExactDemoDispatcher,
  createExactDispatchPoster,
} from '../../src/bug-pipeline/exact-demo-dispatch.mjs';
import { DEMO_TARGET, DEMO_SOURCE_POLICIES } from '../../src/bug-pipeline/demo-deployment.mjs';

const sha = 'a'.repeat(40),
  id = '12345678-1234-4123-8123-123456789abc';
function fixture(operation = 'preflight') {
  let clock = Date.parse('2026-10-21T20:00:00Z'),
    posted = 0,
    progress,
    main = sha,
    available = false;
  const run = {
    id: 55,
    run_attempt: 1,
    status: 'completed',
    conclusion: 'success',
    head_sha: sha,
    head_branch: 'main',
    repository: { full_name: 'l2v-hub/ClinicOS' },
    head_repository: { full_name: 'l2v-hub/ClinicOS' },
    path: '.github/workflows/deploy-demo-exact-commit.yml',
    event: 'workflow_dispatch',
    display_title: `demo-exact ${operation} ${sha} ${id}`,
  };
  const receipt = {
    schemaVersion: 1,
    kind: operation === 'preflight' ? 'clinicos-demo-preflight' : 'clinicos-demo-backend',
    sourcePolicy: DEMO_SOURCE_POLICIES.exact,
    repository: 'l2v-hub/ClinicOS',
    sourceRef: 'refs/heads/main',
    mergeSha: sha,
    reviewedSha: sha,
    runId: 55,
    runAttempt: 1,
    target: { ...DEMO_TARGET },
    verifiedAt: new Date(clock).toISOString(),
    deployment: { id: '12345678-1234-4123-8123-123456789def', status: 'SUCCESS', commitHash: sha },
    ready: { status: 'ready', tier: 'demo', deploymentId: '12345678-1234-4123-8123-123456789def' },
  };
  const requests = [],
    saved = [];
  const f = {
    run,
    receipt,
    requests,
    saved,
    main(value) {
      main = value;
    },
    available(value) {
      available = value;
    },
    get progress() {
      return progress;
    },
    get posted() {
      return posted;
    },
    async post(body) {
      assert.equal(progress.phase, 'intent');
      assert.deepEqual(body, {
        ref: 'main',
        inputs: { reviewed_sha: sha, operation, dispatch_id: id },
      });
      posted++;
      available = true;
    },
    list() {
      return available ? [run] : [];
    },
    reader: {
      async getJson(route) {
        requests.push(route);
        if (route === 'commits/main') return { sha: main };
        if (route === 'actions/runs/55') return run;
        const list = f.list();
        return { total_count: list.length, workflow_runs: list };
      },
      async artifact(actual, kind) {
        assert.equal(actual.id, 55);
        assert.equal(kind, receipt.kind);
        return {
          receipt,
          receiptSha256: 'e'.repeat(64),
          artifactDigest: `sha256:${'f'.repeat(64)}`,
        };
      },
    },
    async save(value) {
      progress = structuredClone(value);
      saved.push(progress);
    },
    async ensure(extra = {}) {
      const d = createExactDemoDispatcher({
        reader: f.reader,
        postDispatch: (body) => f.post(body),
        now: () => clock,
        delay: async (ms) => {
          clock += ms;
        },
        newId: () => id,
        timeoutMs: 20,
        pollMs: 10,
      });
      return d.ensure({
        operation,
        ...(operation === 'deploy' ? { expectedSha: sha } : {}),
        progress,
        saveProgress: f.save,
        ...extra,
      });
    },
  };
  return f;
}

test('single fixed main dispatch precedes authenticated correlated immutable receipt for both operations', async () => {
  for (const operation of ['preflight', 'deploy']) {
    const f = fixture(operation);
    const proof = await f.ensure();
    assert.equal(f.posted, 1);
    assert.equal(proof.runUrl, 'https://github.com/l2v-hub/ClinicOS/actions/runs/55');
    assert.deepEqual(
      f.saved.map((p) => p.phase),
      ['intent', 'submitted', 'observed', 'succeeded'],
    );
    await f.ensure();
    assert.equal(f.posted, 1);
  }
});

test('wrong repository, workflow, event, SHA, attempt and operation title never prove success', async () => {
  for (const [key, value] of [
    ['repository', { full_name: 'attacker/repo' }],
    ['head_repository', { full_name: 'attacker/repo' }],
    ['path', '.github/workflows/deploy-backend.yml'],
    ['event', 'push'],
    ['head_sha', 'b'.repeat(40)],
    ['run_attempt', 2],
    ['display_title', `demo-exact deploy ${sha} ${id}`],
  ]) {
    const f = fixture();
    f.run[key] = value;
    await assert.rejects(f.ensure(), /identity|timed out/);
    assert.equal(f.posted, 1);
    await assert.rejects(f.ensure(), /identity|timed out/);
    assert.equal(f.posted, 1);
  }
});

test('old, absent, ambiguous and failed runs fail closed without repeating POST', async () => {
  for (const scenario of [
    'old',
    'missing',
    'ambiguous',
    'failed',
    'pending',
    'missing-receipt',
    'wrong-policy',
  ]) {
    const f = fixture();
    if (scenario === 'old') f.available(true);
    if (scenario === 'missing') f.list = () => [];
    if (scenario === 'ambiguous') f.list = () => (f.posted ? [f.run, { ...f.run, id: 56 }] : []);
    if (scenario === 'failed') f.run.conclusion = 'failure';
    if (scenario === 'pending') f.run.status = 'queued';
    if (scenario === 'missing-receipt')
      f.reader.artifact = async () => {
        throw Error('receipt absent');
      };
    if (scenario === 'wrong-policy') f.receipt.sourcePolicy = DEMO_SOURCE_POLICIES.trigger;
    await assert.rejects(f.ensure(), /identity|timed out|ambiguous|failed|receipt|policy/);
    await assert.rejects(f.ensure(), /identity|timed out|ambiguous|failed|receipt|policy/);
    assert.equal(f.posted, 1, scenario);
  }
});

test('changed main at dispatch or proof recheck prevents mutation or acceptance', async () => {
  const f = fixture('deploy');
  f.main('b'.repeat(40));
  await assert.rejects(f.ensure(), /main changed/);
  assert.equal(f.posted, 0);
  const g = fixture();
  const save = g.save;
  g.save = async (value) => {
    await save(value);
    if (value.phase === 'intent') g.main('b'.repeat(40));
  };
  await assert.rejects(g.ensure(), /main changed/);
  assert.equal(g.posted, 0);
  assert.equal(g.progress.phase, 'intent');
  const h = fixture();
  const artifact = h.reader.artifact;
  h.reader.artifact = async (...args) => {
    const proof = await artifact(...args);
    h.main('b'.repeat(40));
    return proof;
  };
  await assert.rejects(h.ensure(), /main changed/);
  assert.equal(h.progress.phase, 'observed');
});

test('uncertain dispatch retains intent and subsequent invocation discovers without redispatch', async () => {
  const f = fixture();
  const post = f.post;
  f.post = async (body) => {
    await post(body);
    throw Error('uncertain POST');
  };
  await assert.rejects(f.ensure(), /uncertain POST/);
  assert.equal(f.progress.phase, 'intent');
  const proof = await f.ensure();
  assert.equal(proof.progress.phase, 'succeeded');
  assert.equal(f.posted, 1);
});

test('run attempt changed while reading artifact invalidates a previously completed run', async () => {
  const f = fixture();
  const artifact = f.reader.artifact;
  f.reader.artifact = async (...args) => {
    const proof = await artifact(...args);
    f.run.run_attempt = 2;
    return proof;
  };
  await assert.rejects(f.ensure(), /identity/);
  assert.equal(f.progress.phase, 'observed');
});

test('fixed dispatch transport has bounded output, one literal endpoint and no retries', async () => {
  const calls = [];
  const post = createExactDispatchPoster({
    cwd: '/tmp',
    run: async (input) => {
      calls.push(input);
      return { ok: true, stdout: '' };
    },
  });
  await post({
    ref: 'main',
    inputs: { reviewed_sha: sha, operation: 'preflight', dispatch_id: id },
  });
  assert.deepEqual(calls[0].args, [
    'api',
    'repos/l2v-hub/ClinicOS/actions/workflows/deploy-demo-exact-commit.yml/dispatches',
    '-X',
    'POST',
    '--input',
    '-',
  ]);
  assert.equal(calls[0].maxOutputBytes, 64 * 1024);
  const failed = createExactDispatchPoster({
    run: async () => ({ ok: false, stdout: '', stderr: 'secret should not escape' }),
  });
  await assert.rejects(
    failed({ ref: 'main', inputs: { reviewed_sha: sha, operation: 'preflight', dispatch_id: id } }),
    /acknowledgement uncertain/,
  );
  await assert.rejects(post({ ref: 'other', inputs: {} }), /fixed main/);
});
