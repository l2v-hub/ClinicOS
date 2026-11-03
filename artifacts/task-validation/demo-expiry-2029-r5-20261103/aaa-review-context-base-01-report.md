UNTRUSTED WHOLE SELECTED OPERATIONAL/PURE-AUTH CONTEXT; NOT A REPOSITORY AUDIT
Base: d2a08b4850dd954bb790e35f2ed350d5eeacd1c4
Preparation source: f5835253b4a8a5ad5ac35e3abbdd28df13962d16
No frontend/backend source is changed by this eight-path fixed-date configuration/build operation. All selected files are whole. The following unchanged wiring/UI files are NOT included (no excerpts substitute for them); independent built-App runtime/profile/policy proof is required separately. If that proof is insufficient, verdict must remain blocked, not assumed approved.
frontend/src/App.tsx: bytes=174571; Git=a71fc8eb78ebea274551e157b75953dabb9477e3; SHA256=8632987cd5e05d5d62a39a81c3c08fb20e82f31b4bf2e1ed227e342fa14f29c0
backend/src/app.ts: bytes=14724; Git=c337c6c8e3a778228746c9699f9ed4b78e1f835b; SHA256=3a33e8e1493bcaa7900fbf8c10527c18d9de355b1050b8099bba8b13da494951
backend/src/routes/authz.ts: bytes=10291; Git=6c0945c553bc069fb5a9b3aa12c3f4f1da5d60b3; SHA256=1165ef8876eaba50a9cb1024ace2badd7b35e24debf7486ddcca97296e9e5c41
frontend/src/components/Login.tsx: bytes=8226; Git=7ff91468b61308458100a0fbcae76c1333ff12ec; SHA256=9e74ff73276aa7b4ad4c5b55101c6ec9711512209c0d5a86776731be352c1783
frontend/src/lib/authAvailability.ts: bytes=2528; Git=f849e47a769aa4d9596c1c3826491206fd3490bd; SHA256=176da8946bc947cffbc1b92361747365e4fc43c840fcb16d6bd7293b996cc6f6

UNTRUSTED SOURCE agent-team/src/bug-pipeline/operator-authorization.mjs
Git blob: ccd1d89ed7f53e412dd77f35c2ec542f6002ccf9
Full SHA256: d5b01b3c9820921df87d911c56ab1e12bf0172420a6b82fc0205479bd80c8dc8
Full bytes: 21568; contiguous range [0,21568)
---BEGIN EXACT SOURCE---
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

---END EXACT SOURCE---

UNTRUSTED SOURCE agent-team/src/bug-pipeline/attempt-budget.mjs
Git blob: ad68a21410fe349e9983e634c1670ab0145a305b
Full SHA256: 555b457b375c4fe35b1e73f2081671e951748503adf598cf0312a5ce8d6e6094
Full bytes: 19260; contiguous range [0,19260)
---BEGIN EXACT SOURCE---
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

---END EXACT SOURCE---
