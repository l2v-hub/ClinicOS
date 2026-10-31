import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { attemptLimit, historyDigest, implementationAttempts } from './attempt-budget.mjs';
import { authorizationBinding, consumeOperatorAuthorization } from './operator-authorization.mjs';
import { handoffFeedbackFingerprint } from './comment-review-handoff.mjs';
import { relativeFile, safeText } from './contracts.mjs';
import { validateReview } from '../../../scripts/quality-gate/claude-bug-review.mjs';

const REPO = 'l2v-hub/ClinicOS';
const SHA = /^[a-f0-9]{40}$/;
const HASH = /^[a-f0-9]{64}$/;
const ACTION = 'execute-cloud-review-recovery';
const clone = (value) => structuredClone(value);
const finiteFailures = new Set([
  'claude-authentication-error',
  'claude-rate-limit',
  'claude-timeout',
  'claude-nonzero-exit',
  'claude-spawn-failed',
  'claude-output-limit',
  'review-validation-failed',
  'source-validation-failed',
  'claude-recovery-provider-failed',
]);
const denied = () =>
  Object.assign(new Error('Cloud recovery identity or ownership changed'), {
    code: 'recovery-ownership-changed',
  });
function selectorValue(value) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value));
  assert.deepEqual(Object.keys(value).sort(), ['pr', 'requestNonce', 'round', 'sha']);
  assert.ok(Number.isSafeInteger(value.pr) && value.pr > 0);
  assert.match(value.sha ?? '', SHA);
  assert.ok(Number.isSafeInteger(value.round) && value.round > 0 && value.round <= 32);
  assert.match(value.requestNonce ?? '', /^[A-Za-z0-9_.:-]{1,200}$/);
  return clone(value);
}
function locate(state, input) {
  const selector = selectorValue(input);
  assert.equal(state?.repository, REPO);
  const matches = (state.batches ?? []).flatMap((batch) =>
    (batch.postMergeFollowups ?? [])
      .filter((followup) => followup.pr === selector.pr)
      .map((followup) => ({ batch, followup })),
  );
  assert.equal(matches.length, 1, 'Exactly one original canonical owner required');
  const { batch, followup } = matches[0];
  assert.ok(
    !['batches', 'manualBatches', 'standaloneReviews']
      .flatMap((k) => state[k] ?? [])
      .some((x) => x.pr?.number === selector.pr),
    'A native subject already owns this PR',
  );
  assert.equal(batch.operatorCoordination?.active, true);
  assert.ok(batch.operatorCoordination.owner && batch.operatorCoordination.nonce);
  assert.equal(followup.owner, batch.operatorCoordination.owner);
  assert.ok(followup.nonce && followup.branch);
  assert.equal(followup.prHead, selector.sha);
  assert.match(followup.baseSha ?? '', SHA);
  assert.ok(['merged', 'deployed'].includes(batch.release?.status));
  assert.equal(
    batch.release.mergeSha,
    followup.baseSha,
    'Follow-up must bind its actual original merge',
  );
  assert.equal(followup.globalReviewRound, selector.round);
  assert.equal(followup.maximumAdditionalReviews, 1);
  assert.match(followup.codeSha ?? '', SHA);
  assert.equal(followup.qa?.status, 'passed');
  assert.equal(followup.qa.sourceSha, followup.codeSha);
  assert.match(followup.qa.reportSha256 ?? '', HASH);
  assert.equal(followup.ci?.status, 'passed');
  assert.equal(followup.ci.sha, selector.sha);
  assert.equal(followup.reviews?.length, 1);
  const review = followup.reviews[0];
  assert.equal(review.round, selector.round);
  assert.equal(review.subjectSha, selector.sha);
  assert.equal(review.status, 'failed-authentication-no-inference');
  assert.ok(review.nonce);
  assert.equal(review.maximumCalls, 1);
  const failure = review.authFailure;
  assert.equal(failure?.attemptNonce, review.nonce);
  assert.equal(failure.subjectSha, selector.sha);
  assert.equal(failure.pr, selector.pr);
  assert.equal(failure.durationApiMs, 0);
  assert.equal(failure.inputTokens, 0);
  assert.equal(failure.outputTokens, 0);
  assert.equal(failure.modelUsageEmpty, true);
  assert.equal(failure.noReviewProduced, true);
  assert.match(failure.rawPrivateSha256 ?? '', HASH);
  const spent =
    batch.reviews.length +
    (batch.postMergeFollowups ?? []).reduce((sum, item) => sum + (item.reviews?.length ?? 0), 0);
  assert.equal(spent, selector.round, 'Only the latest consumed round may recover');
  assert.ok(spent <= attemptLimit(batch, 'reviews'));
  const requests = (followup.technicalRecoveryRequests ?? []).filter(
    (x) => x.nonce === selector.requestNonce,
  );
  assert.equal(requests.length, 1);
  const request = requests[0];
  assert.equal(request.pr, selector.pr);
  assert.equal(request.subjectSha, selector.sha);
  assert.equal(request.existingGlobalRound, selector.round);
  assert.equal(request.existingReviewNonce, review.nonce);
  const accounting = request.preservedAccounting;
  assert.equal(accounting?.originalReviews, historyDigest(batch.reviews));
  assert.equal(accounting.consumedFollowupReview, historyDigest(followup.reviews));
  assert.equal(accounting.budgetExtensions, historyDigest(batch.budgetExtensions));
  assert.equal(accounting.implementation, historyDigest(implementationAttempts(batch)));
  assert.equal(accounting.release, historyDigest(batch.release));
  assert.equal(accounting.reviewLimit, attemptLimit(batch, 'reviews'));
  assert.equal(accounting.totalConsumedRounds, spent);
  return { state, selector, batch, followup, request, review };
}
function semantic(value) {
  const { batch, followup, request, selector } = value;
  const requests = clone(followup.technicalRecoveryRequests);
  const selected = requests.find((x) => x.nonce === request.nonce);
  delete selected.executionAuthorization;
  delete selected.execution;
  return historyDigest({
    selector,
    batch: {
      id: batch.id,
      pr: batch.pr,
      sha: batch.sha,
      phase: batch.phase,
      owner: batch.operatorCoordination,
      implementation: implementationAttempts(batch),
      reviews: batch.reviews,
      budgetExtensions: batch.budgetExtensions,
      release: batch.release,
      releaseHold: batch.releaseHold,
    },
    followup: { ...followup, technicalRecoveryRequests: requests },
  });
}
function reservation(value) {
  return {
    kind: 'same-round-cloud-review-recovery',
    selector: value.selector,
    batchId: value.batch.id,
    batchNonce: value.batch.operatorCoordination.nonce,
    followupId: value.followup.id,
    followupNonce: value.followup.nonce,
    failedReviewNonce: value.review.nonce,
    failedReviewDigest: historyDigest(value.review),
    subjectFingerprint: semantic(value),
  };
}
function verifyAuthorization(value) {
  const saved = value.request.executionAuthorization;
  assert.ok(saved?.authorization, 'An execution capability is required, not a request receipt');
  assert.equal(saved.subjectFingerprint, semantic(value));
  const history = value.batch.recoveryHistory ?? [];
  assert.equal(history.length, saved.previousHistoryLength + 1);
  assert.equal(
    historyDigest(history.slice(0, saved.previousHistoryLength)),
    saved.previousHistoryDigest,
  );
  const entry = history.at(-1);
  assert.equal(entry.action, ACTION);
  assert.equal(entry.requestNonce, value.request.nonce);
  assert.equal(entry.token, saved.auditNonce);
  assert.deepEqual(entry.authorization, saved.authorization);
  const restored = {
    ...value.batch,
    recoveryHistory: history.slice(0, saved.previousHistoryLength),
  };
  const state = {
    ...value.state,
    batches: value.state.batches.map((x) => (x === value.batch ? restored : x)),
  };
  const binding = authorizationBinding({
    state,
    subject: restored,
    actor: saved.authorization.binding.actor,
    action: ACTION,
    reservation: reservation(value),
    budget: null,
  });
  assert.deepEqual(saved.authorization.binding, binding);
  assert.equal(saved.authorization.bindingDigest, historyDigest(binding));
  assert.ok(
    ['user-session', 'distinct-maintainer-comment'].includes(saved.authorization.provenance),
  );
  return saved;
}
function packetSubject(value) {
  const { followup: f, selector, batch, request, review } = value;
  const packetPath = f.packet?.path ?? f.qa?.evidence?.split('/evidence/')[0];
  relativeFile(packetPath);
  assert.ok(packetPath.startsWith('artifacts/task-validation/'));
  assert.ok(
    Array.isArray(f.sourceManifest) && f.sourceManifest.length > 0 && f.sourceManifest.length <= 80,
  );
  assert.deepEqual([...f.scope].sort(), f.sourceManifest.map((x) => x.path).sort());
  assert.equal(new Set(f.scope).size, f.scope.length);
  for (const file of f.sourceManifest) {
    relativeFile(file.path);
    assert.match(file.blob ?? '', SHA);
    assert.match(file.sha256 ?? '', HASH);
    assert.ok(Number.isSafeInteger(file.bytes) && file.bytes >= 0 && file.bytes <= 256 * 1024);
  }
  const acceptance = safeText(f.acceptance);
  const text =
    `Canonical recovery implementation plan (NOT committed in reviewed SHA).\n` +
    `Reviewed SHA: ${selector.sha}\nOriginal failed reservation: ${review.nonce}\n` +
    `Acceptance: ${acceptance}\nScope:\n${f.sourceManifest.map((x) => x.path).join('\n')}\n`;
  return {
    id: f.id,
    kind: 'post-merge-review-recovery',
    pr: { number: selector.pr },
    sha: selector.sha,
    baseSha: f.baseSha,
    branch: f.branch,
    packet: { path: packetPath },
    sourceManifest: clone(f.sourceManifest),
    plan: {
      scope: f.sourceManifest.map((x) => x.path),
      acceptance,
      provenance: 'canonical-recovery',
    },
    recoveryRequestNonce: request.nonce,
    failedReviewNonce: review.nonce,
    canonicalRecoveryPlan: {
      text,
      sourceManifest: clone(f.sourceManifest),
      requestNonce: request.nonce,
      failedReviewNonce: review.nonce,
      sourceSha: selector.sha,
      provenance: 'canonical-recovery',
      evidenceFiles: [
        `${f.qa.evidence}/public/qa-summary.json`,
        `${f.qa.evidence}/public/validation-report.md`,
      ],
    },
    reviews: [...batch.reviews, ...f.reviews].map((x) => ({
      round: x.round,
      status: x.status,
      subjectSha: x.subjectSha,
    })),
    reviewReports: clone(batch.reviewReports ?? {}),
  };
}

/** A separate execution of an existing consumed round; never a native new-round claim. */
export function createCloudReviewRecovery({
  github,
  authorizationVerifier,
  now = () => new Date(),
  nonce = randomUUID,
}) {
  const store = github.createStateStore();
  const load = async (selector) => locate(await store.load(), selector);
  const observe = async (selector) => locate(await store.observe(), selector);
  async function live(value, actor) {
    assert.ok(actor && (await github.authorizedMaintainer(actor)), 'Maintainer required');
    const authorizer = value.request.executionAuthorization?.authorization.binding.actor;
    if (authorizer && authorizer !== actor)
      assert.ok(await github.authorizedMaintainer(authorizer), 'Authorizing maintainer revoked');
    assert.equal((await github.requiredChecks(value.selector.pr)).ok, true);
    const feedback = await github.reviewFeedback(value.selector.pr);
    assert.equal(feedback.state, 'OPEN');
    assert.equal(feedback.isDraft, false);
    assert.equal(feedback.head, value.selector.sha);
    assert.equal(feedback.headRef, value.followup.branch);
    assert.equal(feedback.headRepo, REPO);
    assert.equal(feedback.headIsFork, false);
    assert.equal(feedback.baseRef, 'main');
    return handoffFeedbackFingerprint(feedback, actor, feedback.publisherLogin ?? actor);
  }
  function preparedFingerprint(value, feedback) {
    return historyDigest({ semantic: semantic(value), feedback });
  }
  async function guard(selector, expected, actor, execution) {
    try {
      let current = await observe(selector);
      verifyAuthorization(current);
      const feedback = await live(current, actor);
      assert.equal(preparedFingerprint(current, feedback), expected);
      if (execution === undefined) assert.equal(current.request.execution, undefined);
      else assert.equal(historyDigest(current.request.execution), historyDigest(execution));
      current = await observe(selector); // Recheck after all source/auth network awaits.
      verifyAuthorization(current);
      assert.equal(preparedFingerprint(current, feedback), expected);
      if (execution === undefined) assert.equal(current.request.execution, undefined);
      else assert.equal(historyDigest(current.request.execution), historyDigest(execution));
      return current;
    } catch {
      throw denied();
    }
  }
  async function save(value, previous, actor, finalGuard) {
    value.state.updatedAt = now().toISOString();
    await store.save(value.state, {
      guard: async () => {
        const current = await observe(value.selector);
        assert.equal(JSON.stringify(current.batch), previous, 'Canonical recovery changed');
        await live(current, actor);
        if (finalGuard) await finalGuard();
        assert.equal(JSON.stringify((await observe(value.selector)).batch), previous);
      },
    });
  }
  async function authorize(input, { actor, reference }) {
    const value = await load(input),
      before = JSON.stringify(value.batch);
    assert.equal(value.request.executionAuthorization, undefined);
    assert.equal(value.request.execution, undefined);
    assert.ok(
      !(value.followup.technicalRecoveryRequests ?? []).some((x) => x.execution !== undefined),
    );
    await live(value, actor);
    const binding = authorizationBinding({
      state: value.state,
      subject: value.batch,
      actor,
      action: ACTION,
      reservation: reservation(value),
      budget: null,
    });
    const authorization = await consumeOperatorAuthorization({
      state: value.state,
      verifier: authorizationVerifier,
      reference,
      binding,
    });
    const history = value.batch.recoveryHistory ?? [];
    const saved = {
      authorization,
      subjectFingerprint: semantic(value),
      previousHistoryLength: history.length,
      previousHistoryDigest: historyDigest(history),
      auditNonce: nonce(),
      authorizedAt: now().toISOString(),
    };
    value.request.executionAuthorization = saved;
    value.batch.recoveryHistory = [
      ...history,
      {
        action: ACTION,
        at: saved.authorizedAt,
        requestNonce: value.request.nonce,
        token: saved.auditNonce,
        authorization,
      },
    ];
    await save(value, before, actor);
    return clone(saved);
  }
  async function prepare(input) {
    const value = await load(input),
      authorization = verifyAuthorization(value);
    assert.equal(value.request.execution, undefined, 'Recovery already consumed');
    assert.ok(!value.followup.technicalRecoveryRequests.some((x) => x.execution !== undefined));
    const actor = authorization.authorization.binding.actor;
    const feedback = await live(value, actor),
      fingerprint = preparedFingerprint(value, feedback);
    await guard(value.selector, fingerprint, actor, undefined);
    return { subject: packetSubject(value), fingerprint };
  }
  async function claim(input, { expectedFingerprint, actor, runId }) {
    const value = await load(input),
      before = JSON.stringify(value.batch);
    verifyAuthorization(value);
    assert.match(expectedFingerprint ?? '', HASH);
    assert.match(String(runId), /^[1-9][0-9]{0,19}$/);
    assert.ok(!value.followup.technicalRecoveryRequests.some((x) => x.execution !== undefined));
    const feedback = await live(value, actor);
    assert.equal(preparedFingerprint(value, feedback), expectedFingerprint);
    const execution = {
      nonce: nonce(),
      actor,
      runId: String(runId),
      status: 'running',
      subjectSha: value.selector.sha,
      round: value.selector.round,
      fingerprint: expectedFingerprint,
      startedAt: now().toISOString(),
    };
    value.request.execution = execution;
    await save(value, before, actor, () =>
      guard(value.selector, expectedFingerprint, actor, undefined),
    );
    return { selector: clone(value.selector), ...clone(execution) };
  }
  function owned(value, claim) {
    verifyAuthorization(value);
    const execution = value.request.execution;
    assert.ok(
      execution &&
        execution.nonce === claim.nonce &&
        execution.actor === claim.actor &&
        execution.runId === claim.runId &&
        execution.fingerprint === claim.fingerprint,
    );
    assert.equal(execution.subjectSha, claim.selector.sha);
    assert.equal(execution.round, claim.selector.round);
    return execution;
  }
  async function fail(rawClaim, code) {
    assert.ok(finiteFailures.has(code));
    const claim = clone(rawClaim),
      value = await load(claim.selector);
    const before = JSON.stringify(value.batch),
      execution = owned(value, claim),
      previous = clone(execution);
    assert.equal(execution.status, 'running');
    assert.equal(execution.report, undefined);
    Object.assign(execution, {
      status: 'failed',
      failureCode: code,
      completedAt: now().toISOString(),
    });
    await save(value, before, claim.actor, () =>
      guard(value.selector, claim.fingerprint, claim.actor, previous),
    );
    return clone(execution);
  }
  async function retain(rawClaim, rawReport, { tracked }) {
    const claim = clone(rawClaim),
      report = validateReview(clone(rawReport), claim.selector.sha, tracked);
    const value = await load(claim.selector),
      before = JSON.stringify(value.batch);
    const execution = owned(value, claim),
      previous = clone(execution);
    assert.equal(execution.status, 'running');
    assert.equal(execution.report, undefined);
    Object.assign(execution, {
      status: 'report-retained',
      report,
      reportSha256: historyDigest(report),
      retainedAt: now().toISOString(),
    });
    await save(value, before, claim.actor, () =>
      guard(value.selector, claim.fingerprint, claim.actor, previous),
    );
    return clone(execution);
  }
  async function publish(rawClaim) {
    const claim = clone(rawClaim),
      value = await load(claim.selector);
    const execution = owned(value, claim),
      previous = clone(execution);
    assert.ok(['report-retained', 'published'].includes(execution.status));
    assert.equal(historyDigest(execution.report), execution.reportSha256);
    const publicationGuard = () => guard(claim.selector, claim.fingerprint, claim.actor, previous);
    await publicationGuard();
    if (execution.status === 'published') return clone(execution);
    const published = await github.publishExternalReview(
      claim.selector.pr,
      claim.selector.sha,
      clone(execution.report),
      claim.selector.round,
      value.batch,
      { guard: publicationGuard },
    );
    assert.equal(published.commit_id, claim.selector.sha);
    assert.equal(published.state, 'COMMENTED');
    assert.ok(Number.isSafeInteger(published.id) && published.id > 0);
    // Keep the actual full report even when publication/CAS acknowledgement is uncertain.
    const next = await load(claim.selector),
      before = JSON.stringify(next.batch);
    const current = owned(next, claim);
    assert.deepEqual(current, previous);
    Object.assign(current, {
      status: 'published',
      reviewId: published.id,
      reviewUrl: published.html_url,
      publishedAt: now().toISOString(),
    });
    await save(next, before, claim.actor, publicationGuard);
    return clone(current);
  }
  return { authorize, prepare, claim, fail, retain, publish };
}
