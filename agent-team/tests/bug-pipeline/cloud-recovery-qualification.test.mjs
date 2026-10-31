import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalRecoveryQualification,
  qualifyRecoveryWithoutInference,
} from '../../src/bug-pipeline/cloud-recovery-qualification.mjs';
import { processRecovery } from '../../src/bug-pipeline/cloud-review-recovery-worker.mjs';
import { CLOUD_CLAUDE_VERSION } from '../../src/bug-pipeline/cloud-review-worker.mjs';
import { fixture, authorize, selector, report, base } from './cloud-recovery-fixture.mjs';

function runtime(f) {
  const calls = [];
  const observed = {
    id: 9000,
    repository: { full_name: 'l2v-hub/ClinicOS' },
    status: 'completed',
    conclusion: 'success',
    event: 'workflow_dispatch',
    path: '.github/workflows/claude-cloud-review.yml',
    head_branch: 'main',
    head_sha: base,
  };
  const controls = { observed, version: CLOUD_CLAUDE_VERSION, pinnedVersion: CLOUD_CLAUDE_VERSION };
  const run = async (call) => {
    calls.push({ command: call.command, args: call.args });
    if (call.command === 'gh') {
      assert.equal(call.envMode, 'controller');
      const result = call.args[1].endsWith('/actions/runs/9000')
        ? controls.observed
        : {
            encoding: 'base64',
            type: 'file',
            path: 'scripts/automation/claude-cloud-tools/package.json',
            content: Buffer.from(
              JSON.stringify({
                dependencies: { '@anthropic-ai/claude-code': controls.pinnedVersion },
              }),
            ).toString('base64'),
          };
      return { ok: true, stdout: JSON.stringify(result) };
    }
    assert.equal(call.command, 'claude');
    if (call.args[0] === '--version')
      return { ok: true, stdout: `${controls.version} (Claude Code)` };
    assert.ok(call.args.includes('--print'), 'Only the actual review may use inference');
    assert.equal(f.request().execution.status, 'running', 'Inference must follow durable CAS');
    return { ok: true, code: 0, stdout: JSON.stringify({ structured_output: report }) };
  };
  return {
    calls,
    controls,
    run,
    options: {
      github: f.github,
      controller: f.core,
      run,
      cwd: '/synthetic-empty',
      env: {},
      selector,
      actor: 'maintainer',
      runId: '123',
      retrieve: async () => ({
        packet: { subject_sha: selector.sha },
        tracked: new Set(['src/feature.ts']),
      }),
    },
  };
}

test('canonical qualification requires the saved successful receipt tied to its trusted worker SHA', () => {
  const f = fixture();
  const receipt = canonicalRecoveryQualification(f.request());
  assert.equal(receipt.runId, 9000);
  for (const mutation of [
    (r) => {
      delete r.probe;
    },
    (r) => {
      r.probe.status = 'empty';
    },
    (r) => {
      r.probe.providerExecuted = false;
    },
    (r) => {
      r.probe.runId = '../wrong';
    },
    (r) => {
      r.probe.receiptSha256 = 'wrong';
    },
    (r) => {
      r.trustedWorkerSource.sha = 'a'.repeat(40);
    },
  ]) {
    const request = structuredClone(f.request());
    mutation(request);
    assert.throws(() => canonicalRecoveryQualification(request));
  }
});

test('saved probe qualification only reads its exact run and pinned manifest plus --version; no inference', async () => {
  const f = fixture(),
    r = runtime(f);
  const receipt = canonicalRecoveryQualification(f.request());
  const result = await qualifyRecoveryWithoutInference({
    receipt,
    run: r.run,
    cwd: '/synthetic-empty',
  });
  assert.equal(result.providerExecuted, false);
  assert.equal(result.reusedProbeRunId, 9000);
  assert.deepEqual(result.profile, receipt.profile);
  assert.deepEqual(
    r.calls.map((x) => x.command),
    ['gh', 'gh', 'claude'],
  );
  assert.deepEqual(r.calls.at(-1).args, ['--version']);
  assert.ok(r.calls[1].args[1].endsWith(`?ref=${base}`));
});

test('unavailable, foreign, failed, wrong-source or wrong-workflow probe and changed CLI fail without inference', async () => {
  for (const mutation of [
    (r) => {
      r.controls.observed.conclusion = 'failure';
    },
    (r) => {
      r.controls.observed.repository.full_name = 'other/repo';
    },
    (r) => {
      r.controls.observed.head_sha = 'd'.repeat(40);
    },
    (r) => {
      r.controls.observed.event = 'schedule';
    },
    (r) => {
      r.controls.observed.path = '.github/workflows/other.yml';
    },
    (r) => {
      r.controls.observed.head_branch = 'untrusted';
    },
    (r) => {
      r.controls.version = '0.0.0';
    },
    (r) => {
      r.controls.pinnedVersion = '0.0.0';
    },
  ]) {
    const f = fixture(),
      r = runtime(f);
    await authorize(f);
    mutation(r);
    await assert.rejects(processRecovery(r.options));
    assert.ok(!r.calls.some((x) => x.args.includes('--print')));
    assert.equal(f.request().execution, undefined);
    f.assertPreserved();
  }
});

test('default qualification with real recovery core uses exactly one --print after CAS, replay spends zero', async () => {
  const f = fixture(),
    r = runtime(f);
  await authorize(f);
  assert.equal((await processRecovery(r.options)).status, 'published');
  assert.equal(r.calls.filter((x) => x.args.includes('--print')).length, 1);
  const calls = r.calls.length;
  await assert.rejects(processRecovery(r.options));
  assert.equal(r.calls.length, calls, 'Replay cannot even repeat read-only CLI qualification');
  f.assertPreserved();
});

test('missing capability and concurrent recovery never spend an extra model invocation including qualification', async () => {
  const missing = fixture(),
    blocked = runtime(missing);
  await assert.rejects(processRecovery(blocked.options));
  assert.deepEqual(blocked.calls, []);
  const f = fixture(),
    r = runtime(f);
  await authorize(f);
  const result = await Promise.allSettled([processRecovery(r.options), processRecovery(r.options)]);
  assert.equal(result.filter((x) => x.status === 'fulfilled').length, 1);
  assert.equal(r.calls.filter((x) => x.args.includes('--print')).length, 1);
  assert.equal(f.calls.filter((x) => x.kind === 'post').length, 1);
  f.assertPreserved();
});
