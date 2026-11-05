import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cleanupFailure, isCleanupFailure } from '../../src/bug-pipeline/native-guard-outcome.mjs';
import { boundedCleanup } from '../../src/bug-pipeline/native-guard-session.mjs';
import {
  makeQualificationInput,
  validateQualificationContext,
  qualifyNativeGuard,
} from '../../src/bug-pipeline/native-guard-qualification.mjs';

const sha = 'a'.repeat(40);
const hash = (v) => createHash('sha256').update(v).digest('hex');
const env = {
  GITHUB_ACTIONS: 'true',
  GITHUB_REPOSITORY: 'l2v-hub/ClinicOS',
  GITHUB_REF: 'refs/heads/main',
  GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_SHA: sha,
  GITHUB_WORKFLOW_SHA: sha,
  GITHUB_WORKFLOW_REF: 'l2v-hub/ClinicOS/.github/workflows/claude-cloud-review.yml@refs/heads/main',
};
const profile = { model: 'claude-opus-5-5', contextWindow: 1000000, maxOutputTokens: 128000 };
const build = {
  workerSourceSha: sha,
  sourceSha256: 'b'.repeat(64),
  cliSha256: 'bc1aad9982c7b59c7d889ff92595d61cf46e0a6eae074cb551d932a989bcd222',
  imageDigest: 'sha256:9f0dde62d10e7ff7a310ecaebd66225f6b46c17e6cb778449a77b05d3541bea2',
};

test('qualification input includes whole current-size context plus explicit CI headroom', () => {
  const input = makeQualificationInput(sha);
  assert.equal(Buffer.byteLength(input), 843365 + 40960);
  assert.ok(input.includes(sha));
  assert.equal(input, makeQualificationInput(sha));
});

test('qualification is explicit exact trusted-main dispatch, never a schedule or candidate', () => {
  assert.equal(validateQualificationContext(env), sha);
  for (const [key, value] of Object.entries({
    GITHUB_REF: 'refs/pull/527/merge',
    GITHUB_EVENT_NAME: 'schedule',
    GITHUB_WORKFLOW_SHA: 'b'.repeat(40),
    GITHUB_REPOSITORY: 'untrusted/ClinicOS',
    GITHUB_ACTIONS: 'false',
  }))
    assert.throws(
      () => validateQualificationContext({ ...env, [key]: value }),
      /native-qualification-rejected/,
    );
});

function fixture(overrides = {}) {
  let sourceCalls = 0;
  return {
    sourceCalls: () => sourceCalls,
    health: async () => ({
      status: 'probe-passed',
      profile,
      providerExecuted: true,
      ...overrides.health,
    }),
    source: async ({ input, outputCap, schema }) => {
      sourceCalls++;
      return {
        ok: true,
        providerExecuted: true,
        report: { subject_sha: sha, status: 'synthetic-context-verified' },
        profile,
        proof: {
          inputSha256: hash(input),
          schemaSha256: hash(JSON.stringify(schema)),
          bodySha256: 'c'.repeat(64),
          contextSha256: 'd'.repeat(64),
          model: profile.model,
          actualMaxTokens: outputCap,
          outputTokens: 50,
          contextBytes: 896696,
          requiredTokensUpperBound: 995000,
          forwardAttempts: 1,
          forwarded: true,
          policyStatus: 'settled-empty',
          responseMatchesNative: true,
          runtimeIsolationVerified: true,
          binaryVerified: true,
          imageDigest: build.imageDigest,
          cliSha256: build.cliSha256,
          ...overrides.proof,
        },
        ...overrides.result,
      };
    },
  };
}

test('qualification propagates only branded cleanup failures', async () => {
  const f = fixture();
  let actual;
  try {
    await boundedCleanup(() => {
      throw Error('private');
    }, 50)();
  } catch (error) {
    actual = error;
  }
  for (const error of [actual, cleanupFailure(), Error('native-session-cleanup-failed')]) {
    let observed;
    try {
      await qualifyNativeGuard({
        env,
        build,
        health: f.health,
        source: async () => {
          throw error;
        },
      });
    } catch (failure) {
      observed = failure;
    }
    assert.equal(isCleanupFailure(observed), isCleanupFailure(error));
    assert.equal(
      observed.message,
      isCleanupFailure(error) ? 'native-session-cleanup-failed' : 'native-qualification-rejected',
    );
  }
});

test('synthetic unit receipt binds complete input, actual cap, genuine default and build', async () => {
  const f = fixture();
  const receipt = await qualifyNativeGuard({ env, build, health: f.health, source: f.source });
  assert.equal(receipt.status, 'native-profile-qualified');
  assert.equal(receipt.syntheticOnly, true);
  assert.equal(receipt.profile.maxOutputTokens, 128000);
  assert.equal(receipt.requestOutputCap, 32768);
  assert.equal(receipt.sourceBytes, 884325);
  assert.equal(receipt.applicationReviewClaimed, false);
  assert.equal(receipt.workerSourceSha, sha);
  assert.equal(f.sourceCalls(), 1);
});

test('profile, missing isolation, policy, retry, report and actual-cap failures cannot qualify', async () => {
  for (const proof of [
    { runtimeIsolationVerified: false },
    { binaryVerified: false },
    { responseMatchesNative: false },
    { policyStatus: 'policy-unproven' },
    { forwardAttempts: 2 },
    { forwarded: false },
    { actualMaxTokens: 128000 },
    { inputSha256: '0'.repeat(64) },
    { requiredTokensUpperBound: 1000001 },
    { outputTokens: 32769 },
    { cliSha256: '0'.repeat(64) },
  ]) {
    const f = fixture({ proof });
    await assert.rejects(
      qualifyNativeGuard({ env, build, health: f.health, source: f.source }),
      /native-qualification-rejected/,
    );
    assert.equal(f.sourceCalls(), 1);
  }
  const f = fixture({ health: { profile: { ...profile, contextWindow: 200000 } } });
  await assert.rejects(
    qualifyNativeGuard({ env, build, health: f.health, source: f.source }),
    /native-qualification-rejected/,
  );
  assert.equal(f.sourceCalls(), 0);
});
