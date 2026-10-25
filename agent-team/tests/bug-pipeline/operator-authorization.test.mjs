import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizationBinding, consumeOperatorAuthorization } from '../../src/bug-pipeline/operator-authorization.mjs';
import { attemptLimit, historyDigest } from '../../src/bug-pipeline/attempt-budget.mjs';

function fixture() {
  const subject = { id: 'manual-81', pr: { number: 81 }, sha: 'a'.repeat(40),
    implementation: [1, 2, 3, 4].map((round) => ({ round, status: 'failed' })), reviews: [] };
  const state = { repository: 'l2v-hub/ClinicOS', manualBatches: [subject] };
  const binding = authorizationBinding({ state, subject, actor: 'same-account',
    action: 'extend-budget', budget: { kind: 'implementation', previousLimit: 4, limit: 5 } });
  const result = { provenance: 'user-session', grantId: 'external-session',
    consumptionNonce: 'consumption-1', sourceRef: 'session:instruction-1', binding };
  return { subject, state, binding, result };
}

test('free text and mutable receipt JSON cannot substitute for trusted external verifier', async () => {
  const f = fixture();
  for (const verifier of [undefined, f.result, JSON.stringify(f.result)])
    await assert.rejects(consumeOperatorAuthorization({ ...f, verifier, reference: 'user said yes' }),
      /verifier unavailable/);
  assert.equal(attemptLimit(f.subject, 'implementation'), 4);
});

test('verified external user session permits same-account round5 with one-use exact binding', async () => {
  const f = fixture();
  let consumed = false;
  const verifier = async (request) => {
    assert.equal(request.consume, true);
    assert.deepEqual(request.binding, f.binding);
    assert.equal(consumed, false, 'Host single-use consumption');
    consumed = true;
    return f.result;
  };
  const before = JSON.stringify(f.subject.implementation);
  const authorization = await consumeOperatorAuthorization({ ...f, verifier, reference: 'session:1' });
  f.subject.budgetExtensions = [{ entityId: f.subject.id, pr: 81, kind: 'implementation',
    previousLimit: 4, limit: 5, actor: 'same-account', at: '2026-10-18T00:00:00Z',
    reason: 'Observed session instruction', authorizationRef: 'session:1', nonce: 'extension-5',
    historyLength: 4, historyDigest: historyDigest(f.subject.implementation), authorization }];
  assert.equal(attemptLimit(f.subject, 'implementation'), 5);
  assert.equal(JSON.stringify(f.subject.implementation), before);
  await assert.rejects(consumeOperatorAuthorization({ ...f, verifier: async () => f.result,
    reference: 'session:1' }), /replay/);
});

test('wrong owner, history, action, head, budget and reservation are rejected at verifier boundary', async () => {
  const f = fixture();
  for (const [field, value] of Object.entries({ entityId: 'other-owner', historyDigest: 'f'.repeat(64),
    subjectSha: 'b'.repeat(40), action: 'force-live-recovery', budget: { limit: 32 },
    reservation: { token: 'other' } })) {
    await assert.rejects(consumeOperatorAuthorization({ ...f, reference: 'session:1',
      verifier: async () => ({ ...f.result, binding: { ...f.binding, [field]: value } }) }),
    /binding mismatch/);
  }
  await assert.rejects(consumeOperatorAuthorization({ ...f, reference: 'session:1',
    verifier: async () => ({ ...f.result, provenance: 'self-authored-json' }) }), /provenance/);
});

test('only canonical manual issue owner can receive absent-PR authorization', () => {
  const f = fixture();
  f.subject.pr = null;
  assert.throws(() => authorizationBinding({ ...f, actor: 'operator', action: 'extend-budget' }), /issue coordinate/);
  f.subject.reviewIssue = 470;
  f.subject.issues = [470];
  const binding = authorizationBinding({ ...f, actor: 'operator', action: 'extend-budget' });
  assert.equal(binding.pr, null);
  assert.equal(binding.reviewIssue, 470);
  f.state.standaloneReviews = f.state.manualBatches;
  delete f.state.manualBatches;
  assert.throws(() => authorizationBinding({ ...f, actor: 'operator', action: 'extend-budget' }), /manual owner/);
});

function settlementFixture() {
  const f = fixture();
  f.subject.implementation[3].status = 'running';
  f.subject.plan = { scope: ['src/feature.ts'] };
  f.subject.controllerProgress = {
    schemaVersion: 1,
    status: 'running',
    flow: 'external-review-correction',
    round: 4,
    implementationRound: 4,
    sourceSha: f.subject.sha,
    planSha256: historyDigest(f.subject.plan),
    feedback: null,
    feedbackSha256: historyDigest(null),
    next: 1,
    completed: [{ step: 'execute' }],
    pending: 'verify-before',
    checkpoint: { stale: true },
  };
  return {
    ...f,
    actor: 'maintainer',
    reference: 'test:settle',
    reason: 'Audited settlement of an interrupted paid attempt',
    round: 4,
    progressSha256: historyDigest(f.subject.controllerProgress),
  };
}

test('Claude504 exact authorized settlement fails the running journal and attempt once without a new allowance', async () => {
  const { settleImplementationAttempt } =
    await import('../../src/bug-pipeline/operator-authorization.mjs');
  const f = settlementFixture();
  const previous = structuredClone(f.subject);
  let calls = 0;
  const verifier = async ({ binding, consume }) => {
    calls++;
    assert.equal(consume, true);
    assert.equal(binding.action, 'settle-implementation');
    assert.deepEqual(binding.budget, {
      kind: 'controller-settlement',
      round: 4,
      progressSha256: f.progressSha256,
    });
    return {
      provenance: 'distinct-maintainer-comment',
      grantId: 'test:grant',
      sourceRef: 'test:comment',
      consumptionNonce: 'test:settlement-1',
      binding,
    };
  };
  await settleImplementationAttempt({ ...f, verifier });
  assert.equal(f.subject.controllerProgress.status, 'failed');
  assert.equal(f.subject.controllerProgress.failureCode, 'implementation-recovery-settled');
  assert.equal(f.subject.implementation[3].status, 'failed');
  assert.deepEqual(f.subject.implementation.slice(0, 3), previous.implementation.slice(0, 3));
  assert.deepEqual(f.subject.controllerProgress.completed, previous.controllerProgress.completed);
  assert.equal(f.subject.controllerProgress.checkpoint, undefined);
  assert.equal(f.subject.recoveryHistory.length, 1);
  assert.deepEqual(f.subject.recoveryHistory[0].previous, previous.controllerProgress);
  assert.equal(attemptLimit(f.subject, 'implementation'), 4);
  assert.equal(f.subject.implementation.length, 4);
  await assert.rejects(settleImplementationAttempt({ ...f, verifier }), /Exact running/);
  assert.equal(calls, 1);
});

test('Claude504 settlement refuses absent auth, changed digest/round/history, wrong binding and replay', async () => {
  const { settleImplementationAttempt } =
    await import('../../src/bug-pipeline/operator-authorization.mjs');
  for (const invalid of ['no-auth', 'progress', 'round', 'binding', 'history', 'replay']) {
    const f = settlementFixture();
    if (invalid === 'progress') f.subject.controllerProgress.completed[0].detail = 'changed';
    if (invalid === 'round') f.round = 3;
    if (invalid === 'replay')
      f.subject.recoveryHistory = [{ authorization: { consumptionNonce: 'test:used' } }];
    const before = structuredClone(f.subject);
    const verifier =
      invalid === 'no-auth'
        ? undefined
        : async ({ binding }) => {
            if (invalid === 'history') f.subject.implementation[0].status = 'passed';
            return {
              provenance: 'user-session',
              grantId: 'test:grant',
              sourceRef: 'test:session',
              consumptionNonce: 'test:used',
              binding: invalid === 'binding' ? { ...binding, action: 'extend-budget' } : binding,
            };
          };
    await assert.rejects(settleImplementationAttempt({ ...f, verifier }));
    if (invalid === 'history') before.implementation[0].status = 'passed';
    assert.deepEqual(f.subject, before, 'Refused settlement must not mutate history');
  }
});
