import assert from 'node:assert/strict';
import { historyDigest, implementationAttempts } from './attempt-budget.mjs';

// This module cannot authenticate JSON. The verifier is injected by a trusted host
// that observes the actual user session, or verifies an external maintainer source.
// The CLI intentionally supplies no default verifier or environment-based substitute.
export function authorizationBinding({ state, subject, actor, action, reservation = null, budget = null }) {
  const collections = ['batches', 'manualBatches', 'standaloneReviews'];
  const entities = collections.flatMap((collection) =>
    (state[collection] ?? []).map((item) => ({ collection, item })));
  const owners = entities.filter(({ item }) => item === subject);
  assert.equal(owners.length, 1, 'Authorization needs one canonical owner');
  const collection = owners[0].collection;
  assert.equal(state.repository, 'l2v-hub/ClinicOS', 'Authorization repository changed');
  assert.ok(typeof subject.id === 'string' && subject.id.length > 0 && subject.id.length <= 200);
  assert.ok(!entities.some(({ item }) => item !== subject &&
    (item.id === subject.id || (subject.pr?.number && item.pr?.number === subject.pr.number) ||
      subject.issues?.some((number) => item.issues?.includes(number)))),
    'Conflicting durable authorization owner');
  const pr = subject.pr?.number ?? null;
  const reviewIssue = pr === null ? subject.reviewIssue : null;
  if (pr === null) {
    assert.equal(collection, 'manualBatches', 'Issue-only authorization needs a manual owner');
    assert.ok(Number.isSafeInteger(reviewIssue) && reviewIssue > 0, 'Exact issue coordinate required');
    assert.ok(subject.issues?.includes(reviewIssue), 'Issue is outside the actual cohort');
  }
  return {
    version: 1, repository: state.repository, collection, entityId: subject.id,
    pr, reviewIssue, actor, action, subjectSha: subject.sha ?? null,
    historyDigest: historyDigest({
      implementation: implementationAttempts(subject), reviews: subject.reviews,
      qaHistory: subject.qaHistory ?? [], mergeHistory: subject.mergeHistory ?? [],
      recoveryHistory: subject.recoveryHistory ?? [], budgetExtensions: subject.budgetExtensions ?? [],
    }),
    reservation, budget,
  };
}

export async function consumeOperatorAuthorization({ verifier, reference, binding, state }) {
  assert.equal(typeof verifier, 'function', 'Trusted external authorization verifier unavailable');
  assert.ok(typeof reference === 'string' && reference.length > 0 && reference.length <= 200,
    'External authorization reference required');
  // Host verification must atomically consume this exact action, not merely return
  // an administrative permission check. A long-lived session grant can authorize
  // many separately consumed actions without asking the user again.
  const result = await verifier({ reference, binding: structuredClone(binding), consume: true });
  assert.ok(result && ['user-session', 'distinct-maintainer-comment'].includes(result.provenance),
    'Verified external provenance required');
  assert.deepEqual(result.binding, binding, 'External authorization binding mismatch');
  for (const field of ['grantId', 'consumptionNonce', 'sourceRef'])
    assert.ok(typeof result[field] === 'string' && /^[A-Za-z0-9_:.#/-]{1,200}$/.test(result[field]),
      'Bounded external authorization identity required');
  const used = ['batches', 'manualBatches', 'standaloneReviews'].flatMap((key) => state[key] ?? [])
    .flatMap((subject) => [...(subject.budgetExtensions ?? []), ...(subject.recoveryHistory ?? []),
      ...(subject.reviewHandoffHistory ?? [])]);
  assert.ok(!used.some((entry) => entry.authorization?.consumptionNonce === result.consumptionNonce),
    'Authorization consumption replay');
  return {
    provenance: result.provenance, grantId: result.grantId,
    consumptionNonce: result.consumptionNonce, sourceRef: result.sourceRef,
    binding: structuredClone(binding), bindingDigest: historyDigest(binding),
  };
}
