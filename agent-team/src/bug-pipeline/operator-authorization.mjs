import assert from 'node:assert/strict';
import { historyDigest, implementationAttempts } from './attempt-budget.mjs';
import { knownFailedCorrection } from './workspace.mjs';
import { relativeFile, safeText } from './contracts.mjs';

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
      ? (subject.reviewIssue ??
        (['resume-observation', 'settle-implementation'].includes(action)
          ? subject.issues?.[0]
          : undefined))
      : null;
  if (pr === null) {
    assert.ok(
      collection === 'manualBatches' ||
        (collection === 'batches' &&
          ((action === 'resume-observation' &&
            subject.controllerProgress?.status === 'interrupted') ||
            (action === 'settle-implementation' &&
              subject.controllerProgress?.status === 'running'))),
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

export function implementationCheckpointRecovery(subject, { round, progressSha256 }) {
  const progress = subject.controllerProgress;
  const attempt = implementationAttempts(subject).at(-1);
  const steps = [
    'execute',
    'verify-before',
    'simplify',
    'verify-after',
    'qa',
    'checkpoint',
    'publish',
  ];
  assert.ok(
    progress?.status === 'failed' &&
      progress.schemaVersion === 1 &&
      subject.phase === 'blocked' &&
      subject.failureCode === 'implementation-recovery-settled' &&
      !subject.release &&
      subject.codexFinalReview?.status !== 'running' &&
      progress.failedStep === 'recovery' &&
      progress.failureCode === 'implementation-recovery-settled' &&
      !progress.checkpointRecovery &&
      ['pr-feedback', 'review-correction', 'external-review-correction'].includes(progress.flow) &&
      Number.isSafeInteger(round) &&
      round > 0 &&
      round <= 32 &&
      progress.round === round &&
      (progress.implementationRound ?? round) === round &&
      attempt?.round === round &&
      attempt.status === 'failed' &&
      !implementationAttempts(subject).some((item) =>
        ['running', 'implemented-awaiting-independent-qa'].includes(item.status),
      ) &&
      !subject.reviews.some((item) => item.status === 'running') &&
      [6, 7].includes(progress.next) &&
      progress.completed?.length === progress.next &&
      progress.completed.every((entry, index) => entry.step === steps[index]) &&
      progress.completed[5].sha === subject.sha &&
      (!progress.pending || progress.pending === steps[progress.next]) &&
      /^[a-f0-9]{40}$/.test(progress.sourceSha ?? '') &&
      progress.sourceSha !== subject.sha &&
      subject.externalReview?.status === 'published' &&
      progress.sourceSha === subject.externalReview.subjectSha &&
      progress.sourceSha === subject.reviews.at(-1)?.subjectSha &&
      progress.planSha256 === historyDigest(subject.plan) &&
      progress.feedbackSha256 === historyDigest(progress.feedback ?? null),
    'Exact settled post-checkpoint correction required',
  );
  assert.equal(progressSha256, historyDigest(progress), 'Implementation progress changed');
  return { sourceSha: progress.sourceSha, checkpointSha: subject.sha, round, progressSha256 };
}

// Settlement records an operator's decision about an ambiguous paid attempt. It
// grants no invocation, checkpoint reuse, review approval, or budget extension.
export async function settleImplementationAttempt({
  state,
  subject,
  actor,
  reference,
  verifier,
  reason,
  progressSha256,
  round,
  now = () => new Date(),
}) {
  const progress = subject.controllerProgress;
  const attempts = implementationAttempts(subject);
  const attempt = attempts.at(-1);
  const steps = [
    'execute',
    'verify-before',
    'simplify',
    'verify-after',
    'qa',
    'checkpoint',
    'publish',
  ];
  assert.ok(
    progress?.schemaVersion === 1 &&
      progress.status === 'running' &&
      ['implementation', 'pr-feedback', 'review-correction', 'external-review-correction'].includes(
        progress.flow,
      ) &&
      Number.isSafeInteger(round) &&
      round > 0 &&
      round <= 32 &&
      progress.round === round &&
      (progress.implementationRound ?? round) === round &&
      attempt?.round === round &&
      attempt.status === 'running' &&
      attempts.filter((item) => item.status === 'running').length === 1 &&
      !subject.reviews.some((item) => item.status === 'running') &&
      Number.isSafeInteger(progress.next) &&
      progress.next >= 0 &&
      progress.next <= steps.length &&
      Array.isArray(progress.completed) &&
      progress.completed.length === progress.next &&
      progress.completed.every((entry, index) => entry.step === steps[index]) &&
      (!progress.pending || progress.pending === steps[progress.next]) &&
      progress.planSha256 === historyDigest(subject.plan) &&
      progress.feedbackSha256 === historyDigest(progress.feedback ?? null),
    'Exact running implementation journal and latest attempt required',
  );
  assert.equal(progressSha256, historyDigest(progress), 'Implementation progress changed');
  assert.ok(typeof actor === 'string' && actor.trim() && actor.length <= 200);
  assert.ok(typeof reason === 'string' && reason.trim() && reason.length <= 1000);
  const budget = { kind: 'controller-settlement', round, progressSha256 };
  const binding = authorizationBinding({
    state,
    subject,
    actor,
    action: 'settle-implementation',
    budget,
  });
  const authorization = await consumeOperatorAuthorization({ verifier, reference, binding, state });
  assert.deepEqual(
    authorizationBinding({ state, subject, actor, action: 'settle-implementation', budget }),
    binding,
    'Implementation changed during authorization',
  );
  const previous = structuredClone(progress);
  progress.status = 'failed';
  progress.failedStep = 'recovery';
  progress.failureCode = 'implementation-recovery-settled';
  delete progress.checkpoint;
  delete progress.resumeAuthorization;
  attempt.status = 'failed';
  subject.phase = 'blocked';
  subject.failureCode = progress.failureCode;
  delete subject.approvedSha;
  subject.recoveryHistory ??= [];
  subject.recoveryHistory.push({
    action: 'settle-implementation',
    actor,
    reason,
    at: now().toISOString(),
    subjectSha: subject.sha ?? null,
    round,
    progressSha256,
    previous,
    authorization,
  });
  return authorization;
}

// A trusted host may archive a known failed verification checkpoint only after
// independently observing that its old runner output is unavailable. This does
// not settle a running invocation or grant a new attempt.
export async function archiveUnavailableFailedOutput({
  state, subject, actor, reference, verifier, verifyUnavailability,
  evidence, progressSha256, checkpointSha256, reason, now = () => new Date(),
}) {
  const progress = subject.controllerProgress;
  const attempts = implementationAttempts(subject);
  const attempt = attempts.at(-1);
  const steps = ['execute', 'verify-before', 'simplify', 'verify-after', 'qa', 'checkpoint', 'publish'];
  assert.ok(
    progress?.schemaVersion === 1 && knownFailedCorrection(subject) &&
      progress.status === 'failed' && subject.phase === 'blocked' &&
      subject.failureCode === 'workspace-verification-failed' &&
      progress.failureCode === subject.failureCode &&
      ['verify-before', 'verify-after'].includes(progress.failedStep) &&
      progress.checkpoint?.schemaVersion === 1 &&
      typeof progress.checkpoint.cwd === 'string' && progress.checkpoint.cwd.length > 0 &&
      typeof progress.checkpoint.branch === 'string' && progress.checkpoint.branch.length > 0 &&
      progress.checkpoint.head === subject.sha &&
      progress.checkpoint.planSha256 === progress.planSha256 &&
      progress.checkpoint.baseSha === subject.baseSha &&
      progress.checkpoint.output !== null &&
      typeof progress.checkpoint.output === 'object' &&
      !Array.isArray(progress.checkpoint.output) &&
      Object.entries(progress.checkpoint.output).every(([file, identity]) =>
        relativeFile(file) === file && (identity === null || (
          identity !== null && typeof identity === 'object' && !Array.isArray(identity) &&
          /^[a-f0-9]{64}$/.test(identity.sha256) &&
          Number.isSafeInteger(identity.bytes) && identity.bytes >= 0 &&
          typeof identity.executable === 'boolean' &&
          Object.keys(identity).sort().join(',') === 'bytes,executable,sha256'
        ))),
      progress.checkpoint.packetHashes !== null &&
      typeof progress.checkpoint.packetHashes === 'object' &&
      !Array.isArray(progress.checkpoint.packetHashes) &&
      Object.entries(progress.checkpoint.packetHashes).every(([file, digest]) =>
        relativeFile(file) === file && /^[a-f0-9]{64}$/.test(digest)),
      Number.isSafeInteger(progress.next) &&
      progress.next === (progress.failedStep === 'verify-before' ? 1 : 3) &&
      Array.isArray(progress.completed) && progress.completed.length === progress.next &&
      progress.completed.every((item, index) => item.step === steps[index]) &&
      progress.pending === progress.failedStep &&
      attempt?.status === 'failed' && attempt.round === (progress.implementationRound ?? progress.round) &&
      !attempts.some((item) => item.status === 'running') &&
      !subject.reviews.some((item) => item.status === 'running') &&
      subject.codexFinalReview?.status !== 'running' && !subject.release,
    'Exact known failed verification checkpoint required',
  );
  assert.equal(progressSha256, historyDigest(progress), 'Failed progress changed');
  assert.ok(typeof reason === 'string' && reason.trim() && reason.length <= 1000);
  assert.ok(typeof actor === 'string' && actor.trim() && actor.length <= 200);
  safeText(reason);
  safeText(actor);
  assert.ok(evidence?.origin === 'github-actions' && Number.isSafeInteger(evidence.runId) &&
    evidence.runId > 0 && evidence.runId <= Number.MAX_SAFE_INTEGER &&
    evidence.conclusion === 'success' &&
    typeof evidence.artifactName === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(evidence.artifactName) &&
    evidence.outputStatus === 'unavailable' &&
    typeof evidence.observedAt === 'string' && evidence.observedAt.length <= 30 &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(evidence.observedAt) &&
    !Number.isNaN(Date.parse(evidence.observedAt)) &&
    Object.keys(evidence).sort().join(',') ===
      'artifactName,conclusion,observedAt,origin,outputStatus,runId',
  'Exact external failed output observation required');
  assert.equal(typeof verifyUnavailability, 'function', 'Trusted external output observer required');
  const checkpoint = structuredClone(progress.checkpoint);
  assert.equal(checkpointSha256, historyDigest(checkpoint), 'Canonical failed checkpoint changed');
  const observationRequest = { evidence: structuredClone(evidence), repository: state.repository,
    batchId: subject.id, sourceSha: subject.sha, failedStep: progress.failedStep,
    failureCode: progress.failureCode };
  const observed = await verifyUnavailability(structuredClone(observationRequest));
  assert.deepEqual(observed, { ...observationRequest, terminal: true, onlyDiagnosticArtifact: true },
    'External terminal artifact observation changed');
  const budget = { kind: 'failed-verification-output-unavailable',
    progressSha256, checkpointSha256,
    sourceSha: progress.sourceSha, planSha256: progress.planSha256,
    feedbackSha256: progress.feedbackSha256, evidenceSha256: historyDigest(evidence) };
  const binding = authorizationBinding({ state, subject, actor,
    action: 'archive-unavailable-failed-output', budget });
  const authorization = await consumeOperatorAuthorization({ verifier, reference, binding, state });
  assert.deepEqual(authorizationBinding({ state, subject, actor,
    action: 'archive-unavailable-failed-output', budget }), binding,
  'Failed output authorization state changed');
  assert.equal(historyDigest(progress), progressSha256, 'Failed progress changed during authorization');
  assert.equal(historyDigest(progress.checkpoint), checkpointSha256,
    'Canonical checkpoint changed during authorization');
  const previous = structuredClone(progress);
  subject.recoveryHistory ??= [];
  subject.recoveryHistory.push({ action: 'archive-unavailable-failed-output', actor,
    at: now().toISOString(), reason, subjectSha: subject.sha, progressSha256,
    checkpointSha256: budget.checkpointSha256, evidence: structuredClone(evidence),
    previous, authorization });
  delete progress.checkpoint;
  return authorization;
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
