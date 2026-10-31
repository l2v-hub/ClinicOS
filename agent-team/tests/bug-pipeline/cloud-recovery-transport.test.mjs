import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  processRecovery,
  recoverySelector,
  main,
} from '../../src/bug-pipeline/cloud-review-recovery-worker.mjs';
import { childEnvironment } from '../../src/bug-pipeline/process.mjs';

const sha = 'a'.repeat(40),
  selector = { pr: 82, sha, round: 5, requestNonce: 'technical-request' };
const report = {
  subject_sha: sha,
  verdict: 'approved',
  summary: 'Synthetic layout evidence supports acceptance.',
  findings: [],
};
function fixture() {
  const calls = [];
  const options = {
    selector,
    actor: 'maintainer',
    runId: '9001',
    cwd: '/synthetic-empty',
    env: {},
    github: {
      authorizedMaintainer: async () => {
        calls.push('maintainer');
        return true;
      },
    },
    controller: {
      prepare: async () => {
        calls.push('prepare');
        return { subject: { sha, canonicalRecoveryPlan: {} }, fingerprint: 'frozen' };
      },
      claim: async (_s, args) => {
        calls.push('claim');
        assert.equal(args.expectedFingerprint, 'frozen');
        return { nonce: 'one-execution' };
      },
      fail: async (_claim, code) => {
        calls.push('fail');
        assert.equal(code, 'claude-recovery-provider-failed');
      },
      retain: async (_claim, value) => {
        calls.push('retain');
        assert.deepEqual(value, report);
      },
      publish: async () => {
        calls.push('publish');
        return {
          report,
          reportSha256: 'b'.repeat(64),
          reviewId: 99,
          reviewUrl: 'https://example.test/review/99',
        };
      },
    },
    retrieve: async () => {
      calls.push('retrieve');
      return { packet: { subject_sha: sha }, tracked: new Set(['src/layout.mjs']) };
    },
    probe: async () => {
      calls.push('probe');
      return {
        profile: { model: 'claude-opus-4-7', contextWindow: 1000000, maxOutputTokens: 64000 },
      };
    },
    run: async (call) => {
      calls.push('model');
      assert.equal(call.command, 'claude');
      assert.equal(call.envMode, 'review');
      assert.equal(call.cwd, '/synthetic-empty');
      assert.equal(call.args[call.args.indexOf('--tools') + 1], '');
      assert.ok(call.args.includes('--restricted'));
      return { ok: true, code: 0, stdout: JSON.stringify({ structured_output: report }) };
    },
  };
  return { options, calls };
}

test('same-round transport uses qualified source before one claim and retains real report before publication', async () => {
  const f = fixture(),
    result = await processRecovery(f.options);
  assert.equal(result.status, 'published');
  assert.equal(result.round, 5);
  assert.equal(result.newRound, false);
  assert.deepEqual(f.calls, [
    'maintainer',
    'prepare',
    'retrieve',
    'probe',
    'claim',
    'model',
    'retain',
    'publish',
  ]);
});
test('non-maintainer, missing capability, source failure, bad qualification and CAS loss invoke no review', async () => {
  for (const failure of ['actor', 'prepare', 'retrieve', 'probe', 'claim']) {
    const f = fixture();
    if (failure === 'actor') f.options.github.authorizedMaintainer = async () => false;
    else if (['prepare', 'claim'].includes(failure))
      f.options.controller[failure] = async () => {
        throw Error('Synthetic guard denial');
      };
    else
      f.options[failure] = async () => {
        throw Error('Synthetic preflight denial');
      };
    await assert.rejects(processRecovery(f.options));
    assert.ok(!f.calls.includes('model'));
    assert.ok(!f.calls.includes('publish'));
  }
});
test('nonzero/throw/invalid/stale outputs spend only failed technical execution, never publish or retry', async () => {
  for (const kind of ['nonzero', 'throw', 'invalid', 'stale']) {
    const f = fixture();
    let invocations = 0;
    f.options.run = async () => {
      invocations++;
      if (kind === 'throw') throw Error('Synthetic transport');
      return kind === 'nonzero'
        ? { ok: false, code: 1, stdout: '' }
        : {
            ok: true,
            code: 0,
            stdout:
              kind === 'invalid'
                ? '{}'
                : JSON.stringify({ structured_output: { ...report, subject_sha: 'c'.repeat(40) } }),
          };
    };
    const result = await processRecovery(f.options);
    assert.equal(result.status, 'provider-failed');
    assert.equal(invocations, 1);
    assert.ok(f.calls.includes('fail'));
    assert.ok(!f.calls.includes('retain'));
    assert.ok(!f.calls.includes('publish'));
  }
});
test('retain/publication uncertainty returns genuine report and never reclassifies it as provider failure', async () => {
  for (const stage of ['retain', 'publish']) {
    const f = fixture();
    f.options.controller[stage] = async () => {
      throw Error('Synthetic uncertain write');
    };
    const result = await processRecovery(f.options);
    assert.equal(result.status, 'publication-uncertain');
    assert.deepEqual(result.report, report);
    assert.ok(!f.calls.includes('fail'));
    assert.equal(f.calls.filter((x) => x === 'model').length, 1);
  }
});
test('selector rejects coercion, traversal, leading zeros, extra whitespace and malformed SHA/nonce', () => {
  const env = {
    CLOUD_RECOVERY_PR: '82',
    CLOUD_RECOVERY_SHA: sha,
    CLOUD_RECOVERY_ROUND: '5',
    CLOUD_RECOVERY_REQUEST_NONCE: 'technical-request',
  };
  assert.deepEqual(recoverySelector(env), selector);
  for (const [key, value] of [
    ['CLOUD_RECOVERY_PR', '082'],
    ['CLOUD_RECOVERY_PR', '82;command'],
    ['CLOUD_RECOVERY_ROUND', '0'],
    ['CLOUD_RECOVERY_SHA', 'A'.repeat(40)],
    ['CLOUD_RECOVERY_REQUEST_NONCE', '../path'],
    ['CLOUD_RECOVERY_REQUEST_NONCE', 'x\n'],
  ])
    assert.throws(() => recoverySelector({ ...env, [key]: value }));
});
test('main refuses schedule, label, non-main and foreign repo before any provider call', async () => {
  const env = {
    GITHUB_REPOSITORY: 'l2v-hub/ClinicOS',
    GITHUB_ACTIONS: 'true',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
  };
  for (const change of [
    { GITHUB_EVENT_NAME: 'schedule' },
    { GITHUB_EVENT_NAME: 'issues' },
    { GITHUB_REF: 'refs/heads/unreviewed' },
    { GITHUB_REPOSITORY: 'example/fork' },
  ])
    await assert.rejects(main({ env: { ...env, ...change } }));
});
test('review child isolation has subscription token only; no GitHub/API/proxy credentials or alternative provider', () => {
  const env = childEnvironment(
    'review',
    {
      PATH: '/bin',
      CLAUDE_REVIEW_AUTH_MODE: 'subscription',
      CLAUDE_CODE_OAUTH_TOKEN: 'synthetic-oauth',
      GH_TOKEN: 'synthetic-gh',
      ANTHROPIC_API_KEY: 'synthetic-api',
      OPENAI_API_KEY: 'synthetic-other',
      HTTPS_PROXY: 'synthetic-proxy',
      ANTHROPIC_BASE_URL: 'synthetic-provider',
    },
    '/synthetic-runtime',
  );
  assert.equal(env.CLAUDE_CODE_OAUTH_TOKEN, 'synthetic-oauth');
  for (const key of [
    'GH_TOKEN',
    'GITHUB_TOKEN',
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'HTTPS_PROXY',
    'ANTHROPIC_BASE_URL',
  ])
    assert.equal(env[key], undefined);
});
test('workflow recovery remains explicit and uses constant trusted entry with same concurrency and no permission escalation', async () => {
  const workflow = await readFile(
    new URL('../../../.github/workflows/claude-cloud-review.yml', import.meta.url),
    'utf8',
  );
  assert.ok(workflow.includes('options: [probe, review, recover]'));
  for (const key of ['recovery_pr', 'recovery_sha', 'recovery_round', 'recovery_request_nonce'])
    assert.ok(workflow.includes(key + ':'));
  assert.ok(
    workflow.includes(
      'node agent-team/src/bug-pipeline/cloud-review-recovery-worker.mjs --recover',
    ),
  );
  assert.ok(workflow.includes('group: clinicos-claude-cloud-review-'));
  assert.equal(workflow.split('permissions:\n')[1].split('\njobs:')[0].trim(), 'contents: read');
  assert.ok(workflow.includes('ref: refs/heads/main'));
  assert.ok(workflow.includes('persist-credentials: false'));
  assert.ok(workflow.indexOf('npm ci') < workflow.indexOf('CLAUDE_CODE_OAUTH_TOKEN:'));
});
