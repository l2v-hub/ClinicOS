import test from 'node:test';
import assert from 'node:assert/strict';
import { syncIssueReviews } from '../../src/bug-pipeline/issue-review-sync.mjs';
const repo = 'l2v-hub/ClinicOS';
const standalone = () => ({
  id: 'standalone-pr-81',
  pr: { number: 81 },
  sha: 'a'.repeat(40),
  implementation: [],
  reviews: [],
  issues: [],
});
test('sync discovers standalone without processing, mirroring, saving or restarting it', async () => {
  const subject = standalone(),
    state = { schemaVersion: 1, repository: repo, batches: [], standaloneReviews: [subject] },
    before = structuredClone(state),
    calls = [];
  const result = await syncIssueReviews({
    github: {
      createStateStore: () => ({ load: async () => state, save: () => assert.fail('save') }),
    },
    communication: {
      mirrorFeedback: () => assert.fail('standalone mirror'),
      publishState: async (s, options) => {
        calls.push({ s, options });
        return { label: 'codex-review-ready' };
      },
    },
  });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].options, { collection: 'standaloneReviews' });
  assert.equal(result.batches[0].label, 'codex-review-ready');
  assert.deepEqual(state, before);
});
test('sync rejects duplicate standalone identities before any projection', async () => {
  const a = standalone();
  const state = {
    schemaVersion: 1,
    repository: repo,
    batches: [],
    standaloneReviews: [a, { ...a, id: 'other' }],
  };
  await assert.rejects(
    syncIssueReviews({
      github: { createStateStore: () => ({ load: async () => state }) },
      communication: { publishState: () => assert.fail('write') },
    }),
    /Duplicate/,
  );
});
test('sync skips merged and deployed standalone subjects', async () => {
  const a = standalone();
  for (const status of ['merged', 'deployed']) {
    const state = {
      schemaVersion: 1,
      repository: repo,
      batches: [],
      standaloneReviews: [{ ...a, release: { status } }],
    };
    const r = await syncIssueReviews({
      github: { createStateStore: () => ({ load: async () => state }) },
      communication: { publishState: () => assert.fail('write') },
    });
    assert.equal(r.batches.length, 0);
  }
});

const syncBatch = (number = 17) => ({
  id: `bug-batch-${number}`,
  branch: `codex/bug-batch-${number}`,
  issues: [number],
  phase: 'blocked',
  implementation: [{ round: 1, status: 'failed' }],
  reviews: [],
  pr: { number: number + 100 },
  sha: 'b'.repeat(40),
  reason: 'Synthetic retained finding',
});
const newOnly = (protectedSubjects = []) => ({
  active: true,
  automation: { enabled: true, mode: 'new-unclaimed-only', protectedSubjects },
});
async function observedSync(state, publish) {
  const before = JSON.stringify(state),
    calls = [];
  const result = await syncIssueReviews({
    github: {
      createStateStore: () => ({
        load: async () => state,
        save: () => assert.fail('sync never saves canonical state'),
      }),
    },
    communication: {
      mirrorFeedback: async (subject) => {
        calls.push(`mirror:${subject.id}`);
        return { forwarded: 1 };
      },
      publishState: async (subject, options) => {
        calls.push(`publish:${options.collection}:${subject.id}`);
        return publish ? publish(subject) : { label: 'review-blocked' };
      },
    },
  });
  assert.equal(
    JSON.stringify(state),
    before,
    'canonical entities, claims, approvals and budgets stay byte-identical',
  );
  return { result, calls };
}

test('active global takeover skips every eligible subject before any feedback mirror or projection', async () => {
  const a = syncBatch(),
    b = standalone();
  const state = {
    schemaVersion: 1,
    repository: repo,
    batches: [a],
    standaloneReviews: [b],
    operatorTakeover: { active: true },
  };
  const { result, calls } = await observedSync(state);
  assert.deepEqual(calls, []);
  assert.equal(result.status, 'skipped');
  assert.deepEqual(
    result.batches,
    [a, b].map((subject) => ({ id: subject.id, status: 'skipped', reason: 'operator-owned' })),
  );
});

test('recognized new-only handback preserves protected subjects while ordinary unowned feedback still synchronizes', async () => {
  const held = syncBatch(),
    fresh = syncBatch(18),
    review = standalone();
  const state = {
    schemaVersion: 1,
    repository: repo,
    batches: [held, fresh],
    standaloneReviews: [review],
    operatorTakeover: newOnly([
      { collection: 'batches', id: held.id },
      { collection: 'standaloneReviews', id: review.id },
    ]),
  };
  const { result, calls } = await observedSync(state);
  assert.deepEqual(calls, [`mirror:${fresh.id}`, `publish:batches:${fresh.id}`]);
  assert.equal(result.status, 'synced');
  assert.equal(result.batches.find((row) => row.id === fresh.id).forwarded, 1);
  for (const subject of [held, review])
    assert.deepEqual(
      result.batches.find((row) => row.id === subject.id),
      { id: subject.id, status: 'skipped', reason: 'operator-owned' },
    );
});

test('takeover subject identities remain protected despite changed SHA and an explicit new-queue handback', async () => {
  const subject = syncBatch();
  const takeover = newOnly();
  takeover.subjects = [{ collection: 'batches', id: subject.id, sha: 'a'.repeat(40) }];
  const { result, calls } = await observedSync({
    schemaVersion: 1,
    repository: repo,
    batches: [subject],
    operatorTakeover: takeover,
  });
  assert.deepEqual(calls, []);
  assert.equal(result.batches[0].reason, 'operator-owned');
});

test('active subject coordination and unfinished release coordination independently prevent sync', async () => {
  for (const coordination of [
    { operatorCoordination: { active: true, finishedAt: 'historical-but-still-active' } },
    { operatorReleaseCoordination: { stage: 'awaiting-provider-proof' } },
  ]) {
    const batch = { ...syncBatch(), ...coordination };
    const { result, calls } = await observedSync({
      schemaVersion: 1,
      repository: repo,
      batches: [batch],
      operatorTakeover: newOnly(),
    });
    assert.deepEqual(calls, []);
    assert.equal(result.batches[0].status, 'skipped');
    assert.equal(result.batches[0].reason, 'operator-owned');
  }
});

test('finished coordination allows existing unowned sync without weakening feedback processing', async () => {
  const batch = {
    ...syncBatch(),
    operatorCoordination: { active: false },
    operatorReleaseCoordination: { stage: 'finished' },
  };
  const { result, calls } = await observedSync({
    schemaVersion: 1,
    repository: repo,
    batches: [batch],
    operatorTakeover: newOnly(),
  });
  assert.deepEqual(calls, [`mirror:${batch.id}`, `publish:batches:${batch.id}`]);
  assert.equal(result.batches[0].status, 'synced');
  assert.equal(result.batches[0].forwarded, 1);
});

test('malformed or disabled automation handback cannot silently enable owned synchronization', async () => {
  for (const automation of [
    undefined,
    {},
    { enabled: true, mode: 'all', protectedSubjects: [] },
    { enabled: false, mode: 'new-unclaimed-only', protectedSubjects: [] },
  ]) {
    const { result, calls } = await observedSync({
      schemaVersion: 1,
      repository: repo,
      batches: [syncBatch()],
      operatorTakeover: { active: true, automation },
    });
    assert.deepEqual(calls, []);
    assert.equal(result.status, 'skipped');
  }
});

test('released subjects remain omitted and closed unowned subjects retain their original disposition', async () => {
  for (const status of ['merged', 'deployed']) {
    const subject = { ...standalone(), release: { status } };
    const { result, calls } = await observedSync({
      schemaVersion: 1,
      repository: repo,
      batches: [],
      standaloneReviews: [subject],
      operatorTakeover: { active: true },
    });
    assert.deepEqual(result.batches, []);
    assert.deepEqual(calls, []);
  }
  const subject = standalone();
  const { result } = await observedSync(
    { schemaVersion: 1, repository: repo, batches: [], standaloneReviews: [subject] },
    async () => {
      throw Object.assign(new Error('synthetic closed'), { code: 'review-subject-closed' });
    },
  );
  assert.equal(result.status, 'synced');
  assert.deepEqual(result.batches, [{ id: subject.id, status: 'skipped', reason: 'closed' }]);
});

test('unowned projection failure remains partial and never publishes private error text', async () => {
  const { result } = await observedSync(
    { schemaVersion: 1, repository: repo, batches: [syncBatch()] },
    async () => {
      throw new Error('synthetic private provider body');
    },
  );
  assert.equal(result.status, 'partial');
  assert.deepEqual(result.batches, [{ id: 'bug-batch-17', status: 'blocked' }]);
  assert.ok(!JSON.stringify(result).includes('private provider'));
});
