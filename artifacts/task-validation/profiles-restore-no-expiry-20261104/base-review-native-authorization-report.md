# Complete unchanged native authorization and budget modules

Whole unchanged source dependencies at 6872ad02b78a9cfd147a4a9cb78f335e8d9f177f; source hashes are verified, no excerpt is represented as a full module. Changed modules are supplied in full before/after by the native reviewer.

## agent-team/src/bug-pipeline/operator-authorization.mjs

SHA256 d5b01b3c9820921df87d911c56ab1e12bf0172420a6b82fc0205479bd80c8dc8

```text
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
      ...(subject.workItems ? { workItems: subject.workItems } : {}),
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
      (!subject.workItems ||
        (progress.workItemsSha256 === subject.workItems.specSha256 &&
          progress.workItemsBindingSha256 === subject.workItems.bindingSha256)) &&
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

```

## agent-team/src/bug-pipeline/attempt-budget.mjs

SHA256 555b457b375c4fe35b1e73f2081671e951748503adf598cf0312a5ce8d6e6094

```text
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';

export const ENTITY_COLLECTIONS = Object.freeze(['batches', 'manualBatches', 'standaloneReviews']);
export const historyDigest = (value) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
const digest = /^[a-f0-9]{64}$/;
export const implementationAttempts = (subject) => [
  ...subject.implementation,
  ...(subject.operatorContinuations ?? []),
];
export const activeImplementation = (subject) =>
  implementationAttempts(subject).some((entry) =>
    ['running', 'implemented-awaiting-independent-qa'].includes(entry.status),
  );
export const spentAttempts = (subject, kind) =>
  kind === 'implementation' ? implementationAttempts(subject).length : subject[kind].length;
const history = (subject, kind) =>
  kind === 'implementation' ? implementationAttempts(subject) : subject[kind];

// A cutover is pinned by the trusted state owner before new actions, never by adoption.
// Its digest freezes the exact historical JSON prefix without inventing live grants.
function legacyExtensionCount(subject, extensions) {
  const cutover = subject.budgetAuthorizationCutover;
  if (cutover === undefined) return 0;
  assert.equal(cutover.schemaVersion, 1, 'Invalid budget authorization cutover');
  assert.ok(
    Number.isSafeInteger(cutover.legacyCount) &&
      cutover.legacyCount >= 0 &&
      cutover.legacyCount <= extensions.length,
    'Invalid budget legacy prefix count',
  );
  assert.ok(
    typeof cutover.actor === 'string' &&
      cutover.actor.length > 0 &&
      typeof cutover.authorizationRef === 'string' &&
      cutover.authorizationRef.length > 0 &&
      typeof cutover.at === 'string' &&
      Number.isFinite(Date.parse(cutover.at)),
    'Cutover needs the trusted owner audit coordinates',
  );
  assert.match(cutover.legacyDigest, digest);
  assert.equal(
    cutover.legacyDigest,
    historyDigest(extensions.slice(0, cutover.legacyCount)),
    'Budget legacy prefix changed',
  );
  return cutover.legacyCount;
}
function validateExtensionAuthorization(subject, entry, collection) {
  const authorization = entry.authorization;
  assert.ok(
    ['user-session', 'distinct-maintainer-comment'].includes(authorization?.provenance),
    'Budget extension requires external authorization provenance',
  );
  for (const field of ['grantId', 'consumptionNonce', 'sourceRef'])
    assert.ok(
      typeof authorization[field] === 'string' &&
        /^[A-Za-z0-9_:.#/-]{1,200}$/.test(authorization[field]),
      'Invalid authorization identity',
    );
  const binding = authorization.binding;
  assert.ok(binding && typeof binding === 'object' && !Array.isArray(binding));
  assert.equal(
    authorization.bindingDigest,
    historyDigest(binding),
    'Authorization content changed',
  );
  assert.equal(binding.version, 1);
  assert.equal(binding.repository, 'l2v-hub/ClinicOS');
  assert.ok(ENTITY_COLLECTIONS.includes(binding.collection));
  if (collection) assert.equal(binding.collection, collection, 'Authorization collection changed');
  if (subject.kind === 'standalone-pr-review')
    assert.equal(binding.collection, 'standaloneReviews');
  assert.equal(binding.entityId, subject.id);
  assert.equal(binding.pr, subject.pr?.number ?? null);
  assert.equal(binding.reviewIssue, subject.pr?.number ? null : subject.reviewIssue);
  assert.equal(binding.actor, entry.actor);
  assert.equal(binding.action, 'extend-budget');
  assert.ok(binding.subjectSha === null || /^[a-f0-9]{40}$/.test(binding.subjectSha));
  assert.match(binding.historyDigest, digest);
  assert.equal(binding.reservation, null);
  assert.deepEqual(binding.budget, {
    kind: entry.kind,
    previousLimit: entry.previousLimit,
    limit: entry.limit,
  });
}

// Stored receipts bind content; only the injected mutator verifier authenticates a grant.
export function attemptLimit(subject, kind, collection) {
  assert.ok(['implementation', 'reviews'].includes(kind));
  let limit =
    kind === 'implementation' ? Math.max(4, subject.operatorContinuations?.[0]?.round ?? 4) : 4;
  const extensions = subject.budgetExtensions ?? [];
  assert.ok(Array.isArray(extensions) && extensions.length <= 56);
  const legacyCount = legacyExtensionCount(subject, extensions);
  for (const [index, entry] of extensions.entries()) {
    assert.ok(['implementation', 'reviews'].includes(entry.kind));
    assert.ok(entry.actor && entry.at && entry.reason && entry.authorizationRef && entry.nonce);
    assert.equal(entry.entityId, subject.id);
    if (subject.pr?.number) {
      assert.equal(entry.pr, subject.pr.number);
    } else if (index >= legacyCount) {
      assert.equal(entry.collection, 'manualBatches', 'Issue-only allowance needs manual owner');
      assert.equal(entry.pr, null, 'Issue allowance must not invent a PR');
      assert.ok(
        Number.isSafeInteger(subject.reviewIssue) && subject.reviewIssue > 0,
        'Issue-only allowance needs an existing reviewIssue',
      );
      assert.equal(entry.reviewIssue, subject.reviewIssue, 'Issue allowance coordinate changed');
      assert.ok(
        subject.issues?.includes(subject.reviewIssue),
        'Issue is outside the actual cohort',
      );
    }
    if (index >= legacyCount) validateExtensionAuthorization(subject, entry, collection);
    assert.ok(
      Number.isSafeInteger(entry.historyLength) &&
        entry.historyLength >= 0 &&
        entry.historyLength <= history(subject, entry.kind).length,
    );
    assert.match(entry.historyDigest, digest);
    assert.equal(
      historyDigest(history(subject, entry.kind).slice(0, entry.historyLength)),
      entry.historyDigest,
      'Extended budget history changed',
    );
    if (entry.kind !== kind) continue;
    assert.equal(entry.previousLimit, limit);
    assert.ok(Number.isSafeInteger(entry.limit) && entry.limit === limit + 1 && entry.limit <= 32);
    limit = entry.limit;
  }
  return limit;
}

export function validateOperatorContinuations(state) {
  for (const key of ENTITY_COLLECTIONS)
    for (const subject of state[key] ?? []) {
      for (const kind of ['implementation', 'reviews']) attemptLimit(subject, kind, key);
      if (subject.finalQaAllowances || subject.finalQaHistoryResolutions) {
        finalQaLimit(subject, finalQaIdentity(subject));
        finalQaAccounting(subject, subject.codexFinalReview, finalQaIdentity(subject));
      }
      const continuations = subject.operatorContinuations ?? [];
      assert.ok(Array.isArray(continuations) && continuations.length <= 32);
      for (const [index, record] of continuations.entries()) {
        assert.equal(
          record.kind,
          index === 0
            ? 'explicit-operator-compatibility-continuation'
            : 'audited-budget-continuation',
        );
        assert.equal(record.round, subject.implementation.length + index + 1);
        assert.ok(
          [
            'running',
            'implemented-awaiting-independent-qa',
            'passed',
            'failed',
            'blocked',
          ].includes(record.status),
        );
        assert.ok(record.owner && record.nonce && record.startedAt && record.reason);
        assert.match(record.contractSha256, digest);
        assert.match(record.preservedEntityDigest, digest);
        assert.equal(
          record.preservedLegacyImplementationDigest,
          historyDigest(subject.implementation),
        );
        assert.ok(
          subject.reviews.some(
            (_, i) =>
              historyDigest(subject.reviews.slice(0, i + 1)) ===
              record.preservedLegacyReviewsDigest,
          ) || record.preservedLegacyReviewsDigest === historyDigest([]),
          'Legacy review history changed',
        );
        assert.ok(
          state.operatorTakeover?.subjects?.some(
            (item) =>
              item.collection === key &&
              item.id === subject.id &&
              (item.pr === subject.pr?.number ||
                (key === 'manualBatches' &&
                  !subject.pr &&
                  item.pr === null &&
                  item.reviewIssue === subject.reviewIssue)),
          ),
          'Continuation authorization belongs to this exact durable entity',
        );
        assert.equal(
          record.authorizationRef,
          state.operatorTakeover?.nonce,
          'Continuation requires the durable operator authorization',
        );
        assert.ok(
          state.operatorTakeover?.continuePastFourPreserveHistory === true,
          'Continuation requires explicit history-preserving authorization',
        );
        if (index > 0 && record.round <= 4) {
          assert.equal(
            record.budgetSource,
            'default-four',
            'Within-default continuation needs audited budget provenance',
          );
          assert.equal(
            record.budgetExtensionNonce,
            undefined,
            'Default allowance is not an extension',
          );
          assert.equal(record.owner, continuations[0].owner, 'Default continuation owner changed');
          assert.ok(
            !continuations.slice(0, index).some((previous) => previous.nonce === record.nonce),
            'Default continuation reservation nonce replay',
          );
        } else if (index > 0) {
          assert.equal(
            record.budgetSource,
            undefined,
            'Beyond-default continuation requires its own extension',
          );
          assert.ok(
            subject.budgetExtensions?.some(
              (entry) =>
                entry.kind === 'implementation' &&
                entry.nonce === record.budgetExtensionNonce &&
                entry.limit === record.round,
            ),
            'Each further continuation needs its own explicit allowance',
          );
        }
      }
      assert.ok(
        spentAttempts(subject, 'implementation') <= attemptLimit(subject, 'implementation'),
      );
    }
}

export function reserveImplementation(subject, now = () => new Date()) {
  assert.ok(!activeImplementation(subject), 'Another implementation worker owns this subject');
  const round = spentAttempts(subject, 'implementation') + 1;
  assert.ok(round <= attemptLimit(subject, 'implementation'), 'Implementation allowance exhausted');
  const attempt = { round, status: 'running' };
  if (!subject.operatorContinuations?.length) subject.implementation.push(attempt);
  else {
    const extension = subject.budgetExtensions?.find(
      (entry) => entry.kind === 'implementation' && entry.limit === round,
    );
    assert.ok(round <= 4 || extension, 'An explicit next allowance is required');
    const lineage = subject.operatorContinuations[0];
    Object.assign(attempt, {
      kind: 'audited-budget-continuation',
      ...(round <= 4
        ? { budgetSource: 'default-four' }
        : { budgetExtensionNonce: extension.nonce }),
      owner: round <= 4 ? lineage.owner : extension.actor,
      nonce: randomUUID(),
      startedAt: now().toISOString(),
      reason: round <= 4 ? lineage.reason : extension.reason,
      authorizationRef: lineage.authorizationRef,
      contractSha256: lineage.contractSha256,
      baseSha: subject.sha ?? lineage.baseSha,
      preservedLegacyImplementationDigest: historyDigest(subject.implementation),
      preservedLegacyReviewsDigest: historyDigest(subject.reviews),
      preservedEntityDigest: historyDigest(subject),
    });
    subject.operatorContinuations.push(attempt);
  }
  return attempt;
}

export const finalQaIdentity = (
  subject,
  fingerprint = subject.externalReview?.feedbackFingerprint ?? subject.feedbackFingerprint,
) => ({
  subjectSha: subject.sha,
  claudeRound: subject.reviews.length,
  feedbackFingerprint: fingerprint,
});
const sameQaIdentity = (a, b) =>
  a && ['subjectSha', 'claudeRound', 'feedbackFingerprint'].every((key) => a[key] === b[key]);
export function strictLegacyFinalQa(record) {
  return Boolean(
    record &&
    Object.keys(record).sort().join(',') === 'claudeRound,status,subjectSha,summary' &&
    /^[a-f0-9]{40}$/.test(record.subjectSha) &&
    Number.isSafeInteger(record.claudeRound) &&
    record.claudeRound > 0 &&
    ['verified', 'changes-requested'].includes(record.status) &&
    typeof record.summary === 'string' &&
    record.summary.trim(),
  );
}
const legacyQaKey = (record) =>
  `legacy:${historyDigest([record.subjectSha, record.claudeRound, record.status, record.summary])}`;
export function finalQaHistoryDigest(subject) {
  return historyDigest({
    current: subject.codexFinalReview ?? null,
    qaHistory: subject.qaHistory ?? [],
    history: subject.codexFinalReviewHistory ?? [],
    infrastructure: subject.codexFinalQaInfrastructure ?? null,
    allowances: subject.finalQaAllowances ?? [],
    resolutions: subject.finalQaHistoryResolutions ?? [],
  });
}
function finalQaAuthorization(subject, entry, action, identity) {
  const auth = entry.authorization,
    binding = auth?.binding;
  assert.ok(
    ['user-session', 'distinct-maintainer-comment'].includes(auth?.provenance),
    'Final QA requires trusted authorization',
  );
  assert.equal(auth.bindingDigest, historyDigest(binding));
  assert.equal(binding.repository, 'l2v-hub/ClinicOS');
  assert.equal(binding.entityId, subject.id);
  assert.equal(binding.pr, subject.pr?.number ?? null);
  assert.equal(binding.actor, entry.actor);
  assert.equal(binding.action, action);
  assert.equal(binding.subjectSha, identity.subjectSha);
  assert.deepEqual(binding.budget, entry.budget);
  assert.deepEqual(entry.budget.identity, identity);
  for (const key of ['grantId', 'consumptionNonce', 'sourceRef'])
    assert.match(auth[key] ?? '', /^[A-Za-z0-9_:.#/-]{1,200}$/);
}
export function finalQaLimit(subject, identity) {
  let limit = 3;
  assert.ok(
    Array.isArray(subject.finalQaAllowances ?? []) &&
      (subject.finalQaAllowances ?? []).length <= 128,
  );
  for (const entry of subject.finalQaAllowances ?? []) {
    assert.ok(entry.actor && entry.at && entry.reason && entry.authorizationRef && entry.nonce);
    finalQaAuthorization(subject, entry, 'extend-final-qa', entry.identity);
    assert.deepEqual(entry.budget, {
      kind: 'final-qa',
      identity: entry.identity,
      previousLimit: entry.previousLimit,
      limit: entry.limit,
      historyDigest: entry.historyDigest,
    });
    assert.match(entry.historyDigest, digest);
    if (!sameQaIdentity(entry.identity, identity)) continue;
    assert.equal(entry.previousLimit, limit);
    assert.equal(entry.limit, limit + 1);
    assert.ok(entry.limit <= 32);
    limit = entry.limit;
  }
  return limit;
}
export function finalQaAccounting(subject, prior, identity, { recordOrigins = false } = {}) {
  const infrastructure = subject.codexFinalQaInfrastructure ?? { attempts: [] };
  if (recordOrigins) subject.codexFinalQaInfrastructure = infrastructure;
  const known = new Set(),
    ambiguous = new Set();
  if (
    !Array.isArray(infrastructure.attempts) ||
    !Array.isArray(subject.qaHistory ?? []) ||
    !Array.isArray(subject.codexFinalReviewHistory ?? []) ||
    !Array.isArray(infrastructure.legacyOrigins ?? [])
  )
    return {
      infrastructure,
      keys: [],
      ambiguous: true,
      ambiguousDigests: [historyDigest('malformed-history')],
      spent: 0,
    };
  const spentStatus = (status) =>
    ['running', 'failed', 'verified', 'changes-requested'].includes(status);
  const other = (entry) =>
    (typeof entry.subjectSha === 'string' &&
      /^[a-f0-9]{40}$/.test(entry.subjectSha) &&
      entry.subjectSha !== identity.subjectSha) ||
    (Number.isSafeInteger(entry.claudeRound) && entry.claudeRound !== identity.claudeRound) ||
    (typeof entry.feedbackFingerprint === 'string' &&
      entry.feedbackFingerprint.trim() &&
      entry.feedbackFingerprint !== identity.feedbackFingerprint);
  const include = (entry, origin, archived) => {
    if (
      entry?.status === 'not-started' &&
      entry.invocation?.status === 'not-started' &&
      entry.invocation?.boundary === 'ownership-observation' &&
      entry.invocation?.nonce === entry.nonce
    )
      return;
    if (['waiting-checks', 'blocked'].includes(entry?.status)) return;
    if (archived && !spentStatus(entry?.status)) return;
    if (strictLegacyFinalQa(entry)) {
      if (entry.subjectSha !== identity.subjectSha || entry.claudeRound !== identity.claudeRound)
        return;
      const key = legacyQaKey(entry);
      known.add(key);
      if (recordOrigins) {
        infrastructure.legacyOrigins ??= [];
        if (!infrastructure.legacyOrigins.some((x) => x.key === key))
          infrastructure.legacyOrigins.push({
            key,
            sourceSchema: 'main-final-qa-v1',
            original: structuredClone(entry),
          });
      }
      return;
    }
    if (entry && other(entry)) return;
    if (
      !entry ||
      !spentStatus(entry.status) ||
      !sameQaIdentity(entry, identity) ||
      typeof entry.nonce !== 'string' ||
      !entry.nonce.trim() ||
      typeof entry.reservedAt !== 'string' ||
      !Number.isFinite(Date.parse(entry.reservedAt))
    ) {
      ambiguous.add(historyDigest(entry ?? null));
      return;
    }
    const key = `nonce:${entry.nonce}`;
    if (known.has(key)) return;
    known.add(key);
    if (archived && recordOrigins)
      infrastructure.attempts.push({
        ...structuredClone(entry),
        legacy: true,
        importedFrom: origin,
      });
  };
  for (const origin of infrastructure.legacyOrigins ?? []) {
    assert.ok(
      strictLegacyFinalQa(origin.original) &&
        origin.key === legacyQaKey(origin.original) &&
        origin.sourceSchema === 'main-final-qa-v1',
      'Invalid legacy QA provenance',
    );
    include(origin.original, 'legacy-origin', true);
  }
  for (const entry of [...infrastructure.attempts]) include(entry, 'infrastructure', false);
  for (const [origin, entries] of [
    ['current', prior ? [prior] : []],
    ['qaHistory', subject.qaHistory ?? []],
    ['codexFinalReviewHistory', subject.codexFinalReviewHistory ?? []],
  ])
    for (const entry of entries) include(entry, origin, true);
  let spent = known.size;
  for (const resolution of subject.finalQaHistoryResolutions ?? []) {
    finalQaAuthorization(subject, resolution, 'recover-final-qa', resolution.identity);
    assert.deepEqual(resolution.budget, {
      kind: 'final-qa-history',
      identity: resolution.identity,
      limit: resolution.sealedLimit,
      historyDigest: resolution.historyDigest,
      ambiguousDigests: resolution.ambiguousDigests,
      knownKeys: resolution.knownKeys,
    });
    assert.ok(
      Number.isSafeInteger(resolution.sealedLimit) &&
        resolution.sealedLimit >= 3 &&
        resolution.sealedLimit <= 32,
    );
    if (!sameQaIdentity(resolution.identity, identity)) continue;
    for (const value of resolution.ambiguousDigests) ambiguous.delete(value);
    spent = Math.max(
      spent,
      resolution.sealedLimit +
        [...known].filter((key) => !resolution.knownKeys.includes(key)).length,
    );
  }
  return {
    infrastructure,
    keys: [...known].sort(),
    ambiguous: ambiguous.size > 0,
    ambiguousDigests: [...ambiguous].sort(),
    spent,
  };
}

```

## agent-team/src/bug-pipeline/review-policy.mjs

SHA256 5c8d5f4980a34606e1ba71be81f2b6597c09efc4eafaa912afbbac49c358db20

```text
export const STANDALONE_INFRASTRUCTURE_SCOPES = Object.freeze([
  '.agents/',
  '.claude/',
  '.github/',
  'agent-team/src/',
  'agent-team/tests/',
  'scripts/quality-gate/',
  'docs/',
  'CLAUDE.md',
  'AGENTS.md',
]);

export function isStandaloneInfrastructureFile(file) {
  if (
    typeof file !== 'string' ||
    file.length === 0 ||
    file.startsWith('/') ||
    file.includes('\\') ||
    /\p{Cc}/u.test(file)
  )
    return false;

  const segments = file.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..'))
    return false;

  return (
    file === 'CLAUDE.md' ||
    file === 'AGENTS.md' ||
    STANDALONE_INFRASTRUCTURE_SCOPES.some((scope) =>
      scope.endsWith('/') ? file.startsWith(scope) : file === scope,
    )
  );
}

export function standaloneMergePolicy(input = {}) {
  const { files, infrastructureFiles } = input ?? {};
  if (
    !Array.isArray(files) ||
    files.length === 0 ||
    !Array.isArray(infrastructureFiles) ||
    infrastructureFiles.length === 0 ||
    !files.every(
      (file) =>
        isStandaloneInfrastructureFile(file) &&
        infrastructureFiles.some(
          (allowed) =>
            typeof allowed === 'string' &&
            (file === allowed || (allowed.endsWith('/') && file.startsWith(allowed))),
        ),
    )
  )
    return 'unsupported-infrastructure-scope';
  return null;
}

```

## scripts/automation/configure-demo-source.mjs

SHA256 3bac135aaecfe5c95b48f38f613f27a0326d8ebb905a4753cb5ecc0d1513264b

```text
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const TARGET = Object.freeze({
  projectId: 'bddf5d1b-ee83-4362-8238-a79721f795e5',
  environmentId: '8021987e-8eaa-4bc8-a102-20566db5e6b4',
  serviceId: 'c000f011-0349-4ea9-9b56-13c625b5767b',
  repository: 'l2v-hub/ClinicOS',
  branch: 'main',
  domain: 'clinicos-backend-demo.up.railway.app',
});
export const ENDPOINT = 'https://backboard.railway.com/graphql/v2';
export const INVENTORY_QUERY = `query($projectId:String!,$environmentId:String!,$serviceId:String!){
  projectToken{project{id} environment{id name}}
  serviceInstance(environmentId:$environmentId,serviceId:$serviceId){
    serviceId environmentId rootDirectory source{repo}
    domains{serviceDomains{domain} customDomains{domain}}
  }
  deploymentTriggers(projectId:$projectId,environmentId:$environmentId,serviceId:$serviceId,first:2){
    pageInfo{hasNextPage}
    edges{node{id provider projectId environmentId serviceId repository branch checkSuites baseEnvironmentOverrideId}}
  }
}`;
export const UPDATE_BRANCH = `mutation($id:String!,$input:DeploymentTriggerUpdateInput!){
  deploymentTriggerUpdate(id:$id,input:$input){id branch}
}`;
export const CREATE_MAIN = `mutation($input:DeploymentTriggerCreateInput!){
  deploymentTriggerCreate(input:$input){
    id provider projectId environmentId serviceId repository branch checkSuites baseEnvironmentOverrideId
  }
}`;
export const MAIN_ENDPOINT = 'https://api.github.com/repos/l2v-hub/ClinicOS/git/ref/heads/main';
const MAX_BYTES = 262_144;
// GraphQL ID is opaque: accept bounded identifiers without assuming UUID storage.
const ID = /^[A-Za-z0-9][A-Za-z0-9_:/+=.-]{0,199}(?![\s\S])/;
const SHA = /^[a-f0-9]{40}(?![\s\S])/;
const DIGEST = /^[a-f0-9]{64}(?![\s\S])/;
const SECRET = /(?:gh[pousr]_[A-Za-z0-9]|github_pat_|sk-(?:ant-|proj-)|eyJ[A-Za-z0-9_-]{10,}\.)/;

export class ConfigurationError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
const fail = (code) => {
  throw new ConfigurationError(code);
};
const freeze = (value) => {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') freeze(child);
  }
  return Object.freeze(value);
};
export const inventoryDigest = (inventory) =>
  createHash('sha256').update(JSON.stringify(inventory)).digest('hex');

function projectTrigger(node) {
  if (
    node?.projectId !== TARGET.projectId ||
    node?.environmentId !== TARGET.environmentId ||
    node?.serviceId !== TARGET.serviceId
  )
    fail('DEMO_SOURCE_TRIGGER_TARGET_MISMATCH');
  if (node.repository !== TARGET.repository) fail('DEMO_SOURCE_FOREIGN_REPOSITORY');
  if (typeof node.provider !== 'string' || node.provider.toLowerCase() !== 'github')
    fail('DEMO_SOURCE_FOREIGN_PROVIDER');
  if (
    typeof node.id !== 'string' ||
    !ID.test(node.id) ||
    SECRET.test(node.id) ||
    typeof node.branch !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}(?![\s\S])/.test(node.branch) ||
    SECRET.test(node.branch) ||
    typeof node.checkSuites !== 'boolean' ||
    (node.baseEnvironmentOverrideId !== null &&
      (typeof node.baseEnvironmentOverrideId !== 'string' ||
        !ID.test(node.baseEnvironmentOverrideId) ||
        SECRET.test(node.baseEnvironmentOverrideId)))
  )
    fail('DEMO_SOURCE_INVALID_METADATA');
  return {
    id: node.id,
    provider: node.provider,
    projectId: node.projectId,
    environmentId: node.environmentId,
    serviceId: node.serviceId,
    repository: node.repository,
    branch: node.branch,
    checkSuites: node.checkSuites,
    baseEnvironmentOverrideId: node.baseEnvironmentOverrideId,
  };
}

// Only these validated metadata fields may enter an artifact. Provider errors,
// variables, URLs, headers, response extensions and arbitrary object keys never do.
export function projectInventory(data) {
  const token = data?.projectToken;
  const instance = data?.serviceInstance;
  if (
    token?.project?.id !== TARGET.projectId ||
    token?.environment?.id !== TARGET.environmentId ||
    token?.environment?.name !== 'demo' ||
    instance?.serviceId !== TARGET.serviceId ||
    instance?.environmentId !== TARGET.environmentId ||
    instance?.source?.repo !== TARGET.repository
  )
    fail('DEMO_SOURCE_TARGET_MISMATCH');
  const rootDirectory = instance.rootDirectory;
  if (
    rootDirectory !== null &&
    (typeof rootDirectory !== 'string' ||
      rootDirectory.length > 256 ||
      !/^\/?[A-Za-z0-9._/-]*(?![\s\S])/.test(rootDirectory) ||
      SECRET.test(rootDirectory))
  )
    fail('DEMO_SOURCE_INVALID_METADATA');
  const domains = [];
  for (const kind of ['serviceDomains', 'customDomains']) {
    const entries = instance.domains?.[kind];
    if (!Array.isArray(entries) || entries.length > 32) fail('DEMO_SOURCE_INVALID_METADATA');
    for (const entry of entries) {
      const domain = entry?.domain;
      if (
        typeof domain !== 'string' ||
        domain.length > 253 ||
        !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?![\s\S])/.test(domain) ||
        SECRET.test(domain)
      )
        fail('DEMO_SOURCE_INVALID_METADATA');
      domains.push({ kind, domain });
    }
  }
  if (!domains.some(({ domain }) => domain === TARGET.domain)) fail('DEMO_SOURCE_DOMAIN_MISMATCH');
  domains.sort((a, b) => a.kind.localeCompare(b.kind) || a.domain.localeCompare(b.domain));
  const connection = data?.deploymentTriggers;
  if (
    !Array.isArray(connection?.edges) ||
    connection.edges.length > 2 ||
    typeof connection?.pageInfo?.hasNextPage !== 'boolean'
  )
    fail('DEMO_SOURCE_INVALID_METADATA');
  const triggers = connection.edges.map((edge) => projectTrigger(edge?.node));
  if (new Set(triggers.map(({ id }) => id)).size !== triggers.length)
    fail('DEMO_SOURCE_INVALID_METADATA');
  triggers.sort((a, b) => a.id.localeCompare(b.id));
  return freeze({
    schemaVersion: 1,
    projectId: TARGET.projectId,
    environmentId: TARGET.environmentId,
    environmentName: 'demo',
    serviceId: TARGET.serviceId,
    repository: TARGET.repository,
    rootDirectory,
    domains,
    triggers,
    hasMoreTriggers: connection.pageInfo.hasNextPage,
  });
}

export function classify(inventory) {
  if (inventory.hasMoreTriggers || inventory.triggers.length > 1) return 'duplicate-triggers';
  if (!inventory.triggers.length) return 'missing-trigger';
  return inventory.triggers[0].branch === TARGET.branch ? 'already-main' : 'branch-change-required';
}

async function readBoundedJson(response, endpoint) {
  if (!response.ok || response.redirected || (response.url && response.url !== endpoint))
    fail('DEMO_SOURCE_REQUEST_FAILED');
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > MAX_BYTES) fail('DEMO_SOURCE_RESPONSE_TOO_LARGE');
    chunks.push(Buffer.from(chunk));
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    fail('DEMO_SOURCE_INVALID_RESPONSE');
  }
}

export function createClient({ token, fetchImpl = fetch } = {}) {
  if (typeof token !== 'string' || !token.trim()) fail('DEMO_SOURCE_TOKEN_MISSING');
  return async (query, variables) => {
    try {
      const response = await fetchImpl(ENDPOINT, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
        headers: { 'Content-Type': 'application/json', 'Project-Access-Token': token },
        body: JSON.stringify({ query, variables }),
      });
      const body = await readBoundedJson(response, ENDPOINT);
      if (!body?.data || body.errors) fail('DEMO_SOURCE_API_REJECTED');
      return body.data;
    } catch (error) {
      if (error instanceof ConfigurationError) throw error;
      fail('DEMO_SOURCE_REQUEST_FAILED');
    }
  };
}

export function createMainVerifier({ token, reviewedSha, fetchImpl = fetch } = {}) {
  if (typeof token !== 'string' || !token.trim() || !SHA.test(reviewedSha ?? ''))
    fail('DEMO_SOURCE_MAIN_HEAD_UNAVAILABLE');
  return async () => {
    let body;
    try {
      const response = await fetchImpl(MAIN_ENDPOINT, {
        method: 'GET',
        redirect: 'error',
        cache: 'no-store',
        signal: AbortSignal.timeout(30_000),
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Cache-Control': 'no-cache',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'ClinicOS-demo-source-configuration',
        },
      });
      body = await readBoundedJson(response, MAIN_ENDPOINT);
    } catch {
      fail('DEMO_SOURCE_MAIN_HEAD_UNAVAILABLE');
    }
    if (
      body?.ref !== 'refs/heads/main' ||
      body?.object?.type !== 'commit' ||
      !SHA.test(body?.object?.sha ?? '')
    )
      fail('DEMO_SOURCE_MAIN_HEAD_UNAVAILABLE');
    if (body.object.sha !== reviewedSha) fail('DEMO_SOURCE_CURRENT_MAIN_DRIFT');
  };
}

export function validateContext(env) {
  if (
    env.GITHUB_EVENT_NAME !== 'workflow_dispatch' ||
    env.GITHUB_REPOSITORY !== TARGET.repository ||
    env.GITHUB_REF !== 'refs/heads/main' ||
    !SHA.test(env.GITHUB_SHA ?? '') ||
    env.CONFIGURE_DEMO_REVIEWED_SHA !== env.GITHUB_SHA ||
    !/^[1-9][0-9]{0,19}(?![\s\S])/.test(env.GITHUB_RUN_ID ?? '') ||
    !/^[1-9][0-9]{0,9}(?![\s\S])/.test(env.GITHUB_RUN_ATTEMPT ?? '')
  )
    fail('DEMO_SOURCE_TRUSTED_MAIN_REQUIRED');
  return {
    repository: TARGET.repository,
    reviewedSha: env.GITHUB_SHA,
    runId: env.GITHUB_RUN_ID,
    runAttempt: env.GITHUB_RUN_ATTEMPT,
  };
}

const matchesCreatePolicy = (trigger) =>
  trigger?.branch === TARGET.branch &&
  trigger.checkSuites === true &&
  trigger.baseEnvironmentOverrideId === null;

export async function configure({
  client,
  operation = 'inspect',
  expectedDigest,
  assertFreshContext = async () => {},
} = {}) {
  if (!['inspect', 'set-main', 'create-main'].includes(operation))
    fail('DEMO_SOURCE_INVALID_OPERATION');
  if (operation !== 'inspect' && !DIGEST.test(expectedDigest ?? ''))
    fail('DEMO_SOURCE_EXPECTED_DIGEST_REQUIRED');
  const variables = {
    projectId: TARGET.projectId,
    environmentId: TARGET.environmentId,
    serviceId: TARGET.serviceId,
  };
  const inspect = async () => projectInventory(await client(INVENTORY_QUERY, variables));
  await assertFreshContext();
  const before = await inspect();
  const beforeDigest = inventoryDigest(before);
  if (operation === 'inspect') {
    await assertFreshContext();
    return {
      operation,
      outcome: classify(before),
      inventory: before,
      inventorySha256: beforeDigest,
    };
  }
  if (beforeDigest !== expectedDigest) fail('DEMO_SOURCE_INVENTORY_DRIFT');
  const decision = classify(before);
  if (decision === 'duplicate-triggers') fail('DEMO_SOURCE_DUPLICATE_TRIGGERS');
  const creating = operation === 'create-main';
  if (!creating && decision === 'missing-trigger') fail('DEMO_SOURCE_MISSING_TRIGGER');
  if (creating && before.triggers.length && !matchesCreatePolicy(before.triggers[0]))
    fail('DEMO_SOURCE_CREATE_CONFLICT');
  await assertFreshContext();
  const fresh = await inspect();
  if (inventoryDigest(fresh) !== beforeDigest) fail('DEMO_SOURCE_INVENTORY_DRIFT');
  if (decision === 'already-main') {
    await assertFreshContext();
    return { operation, outcome: 'unchanged', inventory: fresh, inventorySha256: beforeDigest };
  }
  // Railway offers no trigger revision/CAS field. Re-read immediately before the
  // one write and verify afterwards; any detected concurrent drift blocks success.
  const expectedAfter = structuredClone(before);
  if (creating) {
    const result = await client(CREATE_MAIN, {
      input: {
        ...variables,
        repository: TARGET.repository,
        branch: TARGET.branch,
        // Official schema leaves provider as String. No alternate literal retry.
        provider: 'github',
        checkSuites: true,
        rootDirectory: before.rootDirectory,
      },
    });
    let created;
    try {
      created = projectTrigger(result?.deploymentTriggerCreate);
    } catch {
      fail('DEMO_SOURCE_CREATE_UNCONFIRMED');
    }
    if (!matchesCreatePolicy(created)) fail('DEMO_SOURCE_CREATE_UNCONFIRMED');
    expectedAfter.triggers = [created];
  } else {
    expectedAfter.triggers[0].branch = TARGET.branch;
    const trigger = before.triggers[0];
    const result = await client(UPDATE_BRANCH, {
      id: trigger.id,
      input: { branch: TARGET.branch },
    });
    if (
      result?.deploymentTriggerUpdate?.id !== trigger.id ||
      result.deploymentTriggerUpdate.branch !== TARGET.branch
    )
      fail('DEMO_SOURCE_UPDATE_UNCONFIRMED');
  }
  const after = await inspect();
  if (inventoryDigest(after) !== inventoryDigest(expectedAfter))
    fail(creating ? 'DEMO_SOURCE_POST_CREATE_DRIFT' : 'DEMO_SOURCE_POST_UPDATE_DRIFT');
  await assertFreshContext();
  return {
    operation,
    outcome: creating ? 'trigger-created' : 'branch-updated',
    previousInventorySha256: beforeDigest,
    inventory: after,
    inventorySha256: inventoryDigest(after),
  };
}

// Serialize a validated projection, never the provider response or caller extras.
export function serializeReceipt(
  context,
  result,
  { capturedAt = new Date().toISOString(), forbiddenValues = [] } = {},
) {
  const safeContext = validateContext({
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_REPOSITORY: context.repository,
    GITHUB_SHA: context.reviewedSha,
    CONFIGURE_DEMO_REVIEWED_SHA: context.reviewedSha,
    GITHUB_RUN_ID: context.runId,
    GITHUB_RUN_ATTEMPT: context.runAttempt,
  });
  const raw = result.inventory;
  const kinds = ['serviceDomains', 'customDomains'];
  if (
    raw?.schemaVersion !== 1 ||
    !Array.isArray(raw.domains) ||
    raw.domains.length > 64 ||
    raw.domains.some((entry) => !kinds.includes(entry?.kind)) ||
    !Array.isArray(raw.triggers)
  )
    fail('DEMO_SOURCE_INVALID_RECEIPT');
  const inventory = projectInventory({
    projectToken: {
      project: { id: raw.projectId },
      environment: { id: raw.environmentId, name: raw.environmentName },
    },
    serviceInstance: {
      serviceId: raw.serviceId,
      environmentId: raw.environmentId,
      rootDirectory: raw.rootDirectory,
      source: { repo: raw.repository },
      domains: Object.fromEntries(
        kinds.map((kind) => [
          kind,
          raw.domains.filter((entry) => entry.kind === kind).map(({ domain }) => ({ domain })),
        ]),
      ),
    },
    deploymentTriggers: {
      pageInfo: { hasNextPage: raw.hasMoreTriggers },
      edges: raw.triggers.map((node) => ({ node })),
    },
  });
  const outcomes = {
    inspect: ['missing-trigger', 'duplicate-triggers', 'already-main', 'branch-change-required'],
    'set-main': ['unchanged', 'branch-updated'],
    'create-main': ['unchanged', 'trigger-created'],
  };
  if (
    !Object.hasOwn(outcomes, result.operation) ||
    !outcomes[result.operation].includes(result.outcome) ||
    result.inventorySha256 !== inventoryDigest(inventory) ||
    typeof capturedAt !== 'string' ||
    !Number.isFinite(Date.parse(capturedAt)) ||
    new Date(capturedAt).toISOString() !== capturedAt
  )
    fail('DEMO_SOURCE_INVALID_RECEIPT');
  const changed = ['branch-updated', 'trigger-created'].includes(result.outcome);
  if (changed && !DIGEST.test(result.previousInventorySha256 ?? ''))
    fail('DEMO_SOURCE_INVALID_RECEIPT');
  const receipt = {
    schemaVersion: 1,
    ...safeContext,
    capturedAt,
    operation: result.operation,
    outcome: result.outcome,
    ...(changed ? { previousInventorySha256: result.previousInventorySha256 } : {}),
    inventory,
    inventorySha256: result.inventorySha256,
  };
  const json = JSON.stringify(receipt);
  if (
    Buffer.byteLength(json) > 32_768 ||
    SECRET.test(json) ||
    forbiddenValues.some(
      (value) => typeof value === 'string' && value.length > 0 && json.includes(value),
    )
  )
    fail('DEMO_SOURCE_INVALID_RECEIPT');
  return json;
}

async function main() {
  const context = validateContext(process.env);
  const result = await configure({
    client: createClient({ token: process.env.RAILWAY_TOKEN }),
    operation: process.env.CONFIGURE_DEMO_OPERATION || 'inspect',
    expectedDigest: process.env.CONFIGURE_DEMO_EXPECTED_DIGEST,
    assertFreshContext: createMainVerifier({
      token: process.env.GITHUB_TOKEN,
      reviewedSha: context.reviewedSha,
    }),
  });
  const receipt = serializeReceipt(context, result, {
    forbiddenValues: [process.env.RAILWAY_TOKEN, process.env.GITHUB_TOKEN],
  });
  await writeFile('demo-source-configuration-receipt.json', `${receipt}\n`, {
    flag: 'wx',
    mode: 0o600,
  });
  console.log(`DEMO_SOURCE_CONFIGURATION_RECEIPT ${receipt}`);
  console.log(`DEMO_SOURCE_CONFIGURATION_OK ${result.outcome} ${result.inventorySha256}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(
      error instanceof ConfigurationError ? error.code : 'DEMO_SOURCE_CONFIGURATION_FAILED',
    );
    process.exitCode = 1;
  });
}

```
