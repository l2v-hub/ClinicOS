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

// Extensions are controller-owned durable records, never adoption-manifest input.
// The first legacy-compatible operator reservation authorizes only its already spent round.
export function attemptLimit(subject, kind) {
  assert.ok(['implementation', 'reviews'].includes(kind));
  let limit =
    kind === 'implementation' ? Math.max(4, subject.operatorContinuations?.[0]?.round ?? 4) : 4;
  assert.ok(
    Array.isArray(subject.budgetExtensions ?? []) && (subject.budgetExtensions?.length ?? 0) <= 56,
  );
  for (const entry of subject.budgetExtensions ?? []) {
    assert.ok(['implementation', 'reviews'].includes(entry.kind));
    assert.ok(entry.actor && entry.at && entry.reason && entry.authorizationRef && entry.nonce);
    assert.equal(entry.entityId, subject.id);
    if (subject.pr?.number) {
      assert.equal(entry.pr, subject.pr.number);
    } else {
      assert.equal(entry.collection, 'manualBatches', 'Issue-only allowance needs manual owner');
      assert.equal(entry.pr, null, 'Issue allowance must not invent a PR');
      assert.ok(Number.isSafeInteger(subject.reviewIssue) && subject.reviewIssue > 0,
        'Issue-only allowance needs an existing reviewIssue');
      assert.equal(entry.reviewIssue, subject.reviewIssue, 'Issue allowance coordinate changed');
      assert.ok(subject.issues?.includes(subject.reviewIssue), 'Issue is outside the actual cohort');
      const authorization = entry.authorization;
      assert.ok(['user-session', 'distinct-maintainer-comment'].includes(authorization?.provenance),
        'Issue allowance requires external authorization provenance');
      assert.ok(authorization.grantId && authorization.consumptionNonce && authorization.sourceRef);
      const binding = authorization.binding;
      assert.equal(authorization.bindingDigest, historyDigest(binding), 'Authorization content changed');
      assert.equal(binding.collection, 'manualBatches');
      assert.equal(binding.entityId, subject.id);
      assert.equal(binding.pr, null);
      assert.equal(binding.reviewIssue, subject.reviewIssue);
      assert.equal(binding.actor, entry.actor);
      assert.equal(binding.action, 'extend-budget');
      assert.deepEqual(binding.budget, {
        kind: entry.kind, previousLimit: entry.previousLimit, limit: entry.limit,
      });
    }
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
      for (const kind of ['implementation', 'reviews']) attemptLimit(subject, kind);
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
              item.collection === key && item.id === subject.id &&
              (item.pr === subject.pr?.number ||
                (key === 'manualBatches' && !subject.pr && item.pr === null &&
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
        if (index > 0)
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
    const extension = subject.budgetExtensions.find(
      (entry) => entry.kind === 'implementation' && entry.limit === round,
    );
    assert.ok(extension, 'An explicit next allowance is required');
    const lineage = subject.operatorContinuations[0];
    Object.assign(attempt, {
      kind: 'audited-budget-continuation',
      budgetExtensionNonce: extension.nonce,
      owner: extension.actor,
      nonce: randomUUID(),
      startedAt: now().toISOString(),
      reason: extension.reason,
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
