import assert from 'node:assert/strict';
import { historyDigest, implementationAttempts } from './attempt-budget.mjs';

// This module cannot authenticate JSON. The verifier is injected by a trusted host
// that observes the actual user session, or verifies an external maintainer source.
// The CLI intentionally supplies no default verifier or environment-based substitute.
export function authorizationBinding({
  state,
  subject,
  actor,
  action,
  reservation = null,
  budget = null,
}) {
  const collections = ['batches', 'manualBatches', 'standaloneReviews'];
  const entities = collections.flatMap((collection) =>
    (state[collection] ?? []).map((item) => ({ collection, item })),
  );
  const owners = entities.filter(({ item }) => item === subject);
  assert.equal(owners.length, 1, 'Authorization needs one canonical owner');
  const collection = owners[0].collection;
  assert.equal(state.repository, 'l2v-hub/ClinicOS', 'Authorization repository changed');
  assert.ok(typeof subject.id === 'string' && subject.id.length > 0 && subject.id.length <= 200);
  assert.ok(
    !entities.some(
      ({ item }) =>
        item !== subject &&
        (item.id === subject.id ||
          (subject.pr?.number && item.pr?.number === subject.pr.number) ||
          subject.issues?.some((number) => item.issues?.includes(number))),
    ),
    'Conflicting durable authorization owner',
  );
  const pr = subject.pr?.number ?? null;
  const reviewIssue =
    pr === null
      ? (subject.reviewIssue ?? (action === 'resume-observation' ? subject.issues?.[0] : undefined))
      : null;
  if (pr === null) {
    assert.ok(
      collection === 'manualBatches' ||
        (collection === 'batches' &&
          action === 'resume-observation' &&
          subject.controllerProgress?.status === 'interrupted'),
      'Issue-only authorization needs a manual owner or exact interrupted initial work',
    );
    assert.ok(
      Number.isSafeInteger(reviewIssue) && reviewIssue > 0,
      'Exact issue coordinate required',
    );
    assert.ok(subject.issues?.includes(reviewIssue), 'Issue is outside the actual cohort');
  }
  return {
    version: 1,
    repository: state.repository,
    collection,
    entityId: subject.id,
    pr,
    reviewIssue,
    actor,
    action,
    subjectSha: subject.sha ?? null,
    historyDigest: historyDigest({
      implementation: implementationAttempts(subject),
      reviews: subject.reviews,
      qaHistory: subject.qaHistory ?? [],
      mergeHistory: subject.mergeHistory ?? [],
      recoveryHistory: subject.recoveryHistory ?? [],
      budgetExtensions: subject.budgetExtensions ?? [],
      finalQa: subject.codexFinalReview ?? null,
      finalQaHistory: subject.codexFinalReviewHistory ?? [],
      finalQaInfrastructure: subject.codexFinalQaInfrastructure ?? null,
      finalQaAllowances: subject.finalQaAllowances ?? [],
      finalQaResolutions: subject.finalQaHistoryResolutions ?? [],
      controllerInterruption: subject.controllerInterruption ?? null,
      controllerProgress: subject.controllerProgress ?? null,
    }),
    reservation,
    budget,
  };
}

export async function consumeOperatorAuthorization({ verifier, reference, binding, state }) {
  assert.equal(typeof verifier, 'function', 'Trusted external authorization verifier unavailable');
  assert.ok(
    typeof reference === 'string' && reference.length > 0 && reference.length <= 200,
    'External authorization reference required',
  );
  // Host verification must atomically consume this exact action, not merely return
  // an administrative permission check. A long-lived session grant can authorize
  // many separately consumed actions without asking the user again.
  const result = await verifier({ reference, binding: structuredClone(binding), consume: true });
  assert.ok(
    result && ['user-session', 'distinct-maintainer-comment'].includes(result.provenance),
    'Verified external provenance required',
  );
  assert.deepEqual(result.binding, binding, 'External authorization binding mismatch');
  for (const field of ['grantId', 'consumptionNonce', 'sourceRef'])
    assert.ok(
      typeof result[field] === 'string' && /^[A-Za-z0-9_:.#/-]{1,200}$/.test(result[field]),
      'Bounded external authorization identity required',
    );
  const used = ['batches', 'manualBatches', 'standaloneReviews']
    .flatMap((key) => state[key] ?? [])
    .flatMap((subject) => [
      ...(subject.budgetExtensions ?? []),
      ...(subject.recoveryHistory ?? []),
      ...(subject.reviewHandoffHistory ?? []),
      ...(subject.finalQaAllowances ?? []),
      ...(subject.finalQaHistoryResolutions ?? []),
    ]);
  assert.ok(
    !used.some((entry) => entry.authorization?.consumptionNonce === result.consumptionNonce),
    'Authorization consumption replay',
  );
  return {
    provenance: result.provenance,
    grantId: result.grantId,
    consumptionNonce: result.consumptionNonce,
    sourceRef: result.sourceRef,
    binding: structuredClone(binding),
    bindingDigest: historyDigest(binding),
  };
}

export function observationProgressDigest(progress) {
  const copy = structuredClone(progress);
  delete copy.resumeAuthorization;
  return historyDigest(copy);
}
function validateObservationCheckpoint(subject) {
  const progress = subject.controllerProgress,
    steps = ['execute', 'verify-before', 'simplify', 'verify-after', 'qa', 'checkpoint', 'publish'];
  assert.ok(
    progress?.status === 'interrupted' &&
      progress.schemaVersion === 1 &&
      ['implementation', 'pr-feedback', 'review-correction', 'external-review-correction'].includes(
        progress.flow,
      ) &&
      Number.isSafeInteger(progress.round) &&
      progress.round > 0 &&
      progress.round <= 32 &&
      (progress.sourceSha === null || /^[a-f0-9]{40}$/.test(progress.sourceSha ?? '')) &&
      Number.isSafeInteger(progress.next) &&
      progress.next >= 0 &&
      progress.next <= steps.length &&
      Array.isArray(progress.completed) &&
      progress.completed.length === progress.next &&
      progress.completed.every(
        (entry, index) =>
          entry.step === steps[index] && (entry.step !== 'checkpoint' || entry.sha === subject.sha),
      ) &&
      progress.planSha256 === historyDigest(subject.plan) &&
      progress.feedbackSha256 === historyDigest(progress.feedback ?? null) &&
      progress.checkpoint &&
      (!progress.pending || progress.pending === steps[progress.next]),
    'Exact retained implementation checkpoint required',
  );
  return progress;
}
export function validateObservationResume(subject) {
  const progress = validateObservationCheckpoint(subject),
    receipt = progress.resumeAuthorization;
  assert.ok(
    receipt &&
      ['user-session', 'distinct-maintainer-comment'].includes(receipt.provenance) &&
      receipt.bindingDigest === historyDigest(receipt.binding),
    'Trusted observation recovery receipt required',
  );
  const binding = receipt.binding;
  assert.ok(
    binding.repository === 'l2v-hub/ClinicOS' &&
      binding.collection === 'batches' &&
      binding.entityId === subject.id &&
      binding.action === 'resume-observation' &&
      binding.subjectSha === (subject.sha ?? null) &&
      binding.pr === (subject.pr?.number ?? null) &&
      binding.budget?.kind === 'controller-observation' &&
      binding.budget.progressSha256 === observationProgressDigest(progress) &&
      binding.budget.interruptionSha256 === historyDigest(subject.controllerInterruption),
    'Observation recovery receipt identity changed',
  );
  return progress;
}
// Trusted canonical hosts can also recover an initial batch before a PR exists.
// The ordinary CLI still has no default authorization verifier.
export async function authorizeObservationResume({
  state,
  subject,
  actor,
  reference,
  verifier,
  reason,
  now = () => new Date(),
}) {
  const progress = validateObservationCheckpoint(subject),
    interruption = subject.controllerInterruption;
  assert.ok(
    progress?.status === 'interrupted' &&
      interruption?.beforeInvocation === true &&
      interruption.code === 'ownership-observation-failed' &&
      progress.checkpoint &&
      interruption.progressSha256 === observationProgressDigest(progress),
    'Only a proven pre-invocation observation interruption can resume',
  );
  assert.ok(!progress.resumeAuthorization, 'Observation recovery already authorized');
  assert.ok(typeof reason === 'string' && reason.trim() && reason.length <= 1000);
  const budget = {
    kind: 'controller-observation',
    progressSha256: observationProgressDigest(progress),
    interruptionSha256: historyDigest(interruption),
  };
  const binding = authorizationBinding({
    state,
    subject,
    actor,
    action: 'resume-observation',
    budget,
  });
  const authorization = await consumeOperatorAuthorization({ verifier, reference, binding, state });
  progress.resumeAuthorization = authorization;
  validateObservationResume(subject);
  subject.recoveryHistory ??= [];
  subject.recoveryHistory.push({
    action: 'resume-observation',
    actor,
    at: now().toISOString(),
    reason,
    subjectSha: subject.sha ?? null,
    previous: structuredClone(interruption),
    authorization,
  });
  subject.phase = 'planned';
  delete subject.failureCode;
  return authorization;
}
