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
