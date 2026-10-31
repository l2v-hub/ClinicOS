import assert from 'node:assert/strict';
import { createCloudReviewRecovery } from '../../src/bug-pipeline/cloud-review-recovery.mjs';
import {
  attemptLimit,
  historyDigest,
  implementationAttempts,
} from '../../src/bug-pipeline/attempt-budget.mjs';

const clone = (x) => structuredClone(x);
const sha = 'b'.repeat(40),
  base = 'c'.repeat(40);
const selector = { pr: 82, sha, round: 5, requestNonce: 'request-one' };
const report = {
  subject_sha: sha,
  verdict: 'approved',
  summary: 'Synthetic source evidence supports criteria.',
  findings: [],
};
function fixture({ verifier = true } = {}) {
  const reviews = Array.from({ length: 4 }, (_, index) => ({
    round: index + 1,
    subjectSha: 'a'.repeat(40),
    status: index === 3 ? 'approved' : 'changes-requested',
  }));
  const batch = {
    id: 'bug-batch-17',
    pr: { number: 81 },
    sha: 'a'.repeat(40),
    issues: [17],
    phase: 'blocked',
    implementation: [{ round: 1, status: 'passed' }],
    reviews,
    operatorCoordination: { active: true, owner: 'codex-owner', nonce: 'original-owner' },
    release: { status: 'merged', mergeSha: base },
    releaseHold: { code: 'ONLINE_ACCEPTANCE_FAILED' },
  };
  const binding = {
    version: 1,
    repository: 'l2v-hub/ClinicOS',
    collection: 'batches',
    entityId: batch.id,
    pr: 81,
    reviewIssue: null,
    actor: 'maintainer',
    action: 'extend-budget',
    subjectSha: batch.sha,
    historyDigest: 'f'.repeat(64),
    reservation: null,
    budget: { kind: 'reviews', previousLimit: 4, limit: 5 },
  };
  batch.budgetExtensions = [
    {
      entityId: batch.id,
      pr: 81,
      kind: 'reviews',
      actor: 'maintainer',
      at: '2026-10-30T00:00:00Z',
      nonce: 'existing-extension',
      reason: 'Existing synthetic allowance',
      authorizationRef: 'test:old',
      previousLimit: 4,
      limit: 5,
      historyLength: 4,
      historyDigest: historyDigest(reviews),
      authorization: {
        provenance: 'user-session',
        grantId: 'old-grant',
        consumptionNonce: 'old-consumption',
        sourceRef: 'test:old',
        binding,
        bindingDigest: historyDigest(binding),
      },
    },
  ];
  const failed = {
    round: 5,
    nonce: 'failed-five',
    subjectSha: sha,
    status: 'failed-authentication-no-inference',
    maximumCalls: 1,
    authFailure: {
      pr: 82,
      subjectSha: sha,
      attemptNonce: 'failed-five',
      durationApiMs: 0,
      inputTokens: 0,
      outputTokens: 0,
      modelUsageEmpty: true,
      noReviewProduced: true,
      rawPrivateSha256: 'd'.repeat(64),
    },
  };
  const followup = {
    id: 'direct-followup',
    pr: 82,
    prHead: sha,
    baseSha: base,
    branch: 'codex/synthetic-followup',
    owner: 'codex-owner',
    nonce: 'followup-one',
    globalReviewRound: 5,
    maximumAdditionalReviews: 1,
    reviews: [failed],
    sourceManifest: [
      { path: 'src/feature.ts', blob: 'e'.repeat(40), sha256: 'f'.repeat(64), bytes: 5 },
    ],
    acceptance: 'The synthetic value persists.',
    scope: ['src/feature.ts'],
    codeSha: 'd'.repeat(40),
    ci: { status: 'passed', sha },
    qa: {
      status: 'passed',
      sourceSha: 'd'.repeat(40),
      reportSha256: 'e'.repeat(64),
      evidence: 'artifacts/task-validation/synthetic-followup/evidence/qa',
    },
  };
  const accounting = {
    originalReviews: historyDigest(reviews),
    consumedFollowupReview: historyDigest(followup.reviews),
    budgetExtensions: historyDigest(batch.budgetExtensions),
    implementation: historyDigest(implementationAttempts(batch)),
    release: historyDigest(batch.release),
    reviewLimit: 5,
    totalConsumedRounds: 5,
  };
  followup.technicalRecoveryRequests = [
    {
      nonce: selector.requestNonce,
      pr: 82,
      subjectSha: sha,
      existingGlobalRound: 5,
      existingReviewNonce: failed.nonce,
      preservedAccounting: accounting,
      status: 'authorized-blocked-missing-trusted-same-round-route',
      authorization: { action: 'record-only' },
      probe: {
        status: 'probe-passed',
        providerExecuted: true,
        runId: 9000,
        headSha: base,
        receiptSha256: 'c'.repeat(64),
        profile: { model: 'claude-opus-5-5', contextWindow: 1000000, maxOutputTokens: 128000 },
      },
      trustedWorkerSource: { sha: base },
    },
  ];
  batch.postMergeFollowups = [followup];
  let remote = { repository: 'l2v-hub/ClinicOS', schemaVersion: 1, batches: [batch] },
    revision = 0;
  const calls = [],
    controls = {
      revoked: false,
      head: sha,
      checks: true,
      beforeGuard: null,
      beforePost: null,
      postFailure: false,
      overwriteAfterPost: false,
      publisherLogin: 'maintainer',
      comments: [],
    };
  const github = {
    createStateStore() {
      let expected;
      return {
        load: async () => {
          expected = revision;
          return clone(remote);
        },
        observe: async () => clone(remote),
        save: async (next, { guard }) => {
          const savedRevision = expected;
          if (controls.beforeGuard) {
            const action = controls.beforeGuard;
            controls.beforeGuard = null;
            await action();
          }
          await guard();
          assert.equal(savedRevision, revision, 'CAS conflict');
          remote = clone(next);
          revision++;
        },
      };
    },
    authorizedMaintainer: async () => !controls.revoked,
    requiredChecks: async () => ({ ok: controls.checks }),
    reviewFeedback: async () => ({
      number: 82,
      state: 'OPEN',
      isDraft: false,
      head: controls.head,
      headRef: followup.branch,
      headRepo: 'l2v-hub/ClinicOS',
      headIsFork: false,
      baseRef: 'main',
      publisherLogin: controls.publisherLogin,
      comments: clone(controls.comments),
    }),
    publishExternalReview: async (pr, subject, body, round, owner, { guard }) => {
      if (controls.beforePost) await controls.beforePost();
      await guard();
      calls.push({ kind: 'post', pr, sha: subject, report: clone(body), round, owner: owner.id });
      if (controls.postFailure) throw new Error('Publication acknowledgement uncertain');
      if (controls.overwriteAfterPost) {
        remote.batches[0].postMergeFollowups[0].technicalRecoveryRequests[0].execution.nonce =
          'other';
        revision++;
      }
      return {
        id: 101,
        state: 'COMMENTED',
        commit_id: sha,
        html_url: 'https://github.com/l2v-hub/ClinicOS/pull/82#synthetic',
      };
    },
  };
  const authorizationVerifier = verifier
    ? async ({ reference, binding: requestBinding, consume }) => {
        assert.equal(reference, 'test:human');
        assert.equal(consume, true);
        calls.push({ kind: 'authorization', action: requestBinding.action });
        return {
          provenance: 'user-session',
          grantId: 'technical-grant',
          consumptionNonce: 'technical-consumption',
          sourceRef: reference,
          binding: clone(requestBinding),
        };
      }
    : undefined;
  let counter = 0;
  const controller = () =>
    createCloudReviewRecovery({
      github,
      authorizationVerifier,
      nonce: () => `new-${++counter}`,
      now: () => new Date('2026-10-31T12:00:00Z'),
    });
  const core = controller(),
    preserved = clone(accounting);
  return {
    core,
    controller,
    github,
    calls,
    controls,
    preserved,
    state: () => remote,
    mutate: (action) => {
      action(remote);
      revision++;
    },
    request: () => remote.batches[0].postMergeFollowups[0].technicalRecoveryRequests[0],
    assertPreserved() {
      const b = remote.batches[0],
        f = b.postMergeFollowups[0];
      assert.equal(historyDigest(b.reviews), preserved.originalReviews);
      assert.equal(historyDigest(f.reviews), preserved.consumedFollowupReview);
      assert.equal(historyDigest(b.budgetExtensions), preserved.budgetExtensions);
      assert.equal(historyDigest(implementationAttempts(b)), preserved.implementation);
      assert.equal(historyDigest(b.release), preserved.release);
      assert.equal(attemptLimit(b, 'reviews'), 5);
      assert.equal(b.reviews.length + f.reviews.length, 5);
    },
  };
}
async function authorize(f) {
  return f.core.authorize(selector, { actor: 'maintainer', reference: 'test:human' });
}
async function claim(f) {
  await authorize(f);
  const prepared = await f.core.prepare(selector);
  return f.core.claim(selector, {
    expectedFingerprint: prepared.fingerprint,
    actor: 'maintainer',
    runId: '123',
  });
}

export { fixture, authorize, claim, selector, report, sha, base };
