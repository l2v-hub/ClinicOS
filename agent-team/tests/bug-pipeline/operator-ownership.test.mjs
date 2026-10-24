import test from 'node:test';
import assert from 'node:assert/strict';
import {
  automationPaused,
  operatorOwns,
  claimedIssues,
  occupiedSubjects,
} from '../../src/bug-pipeline/operator-ownership.mjs';

const handback = () => ({
  active: true,
  nonce: 'test-takeover',
  automation: {
    enabled: true,
    mode: 'new-unclaimed-only',
    takeoverNonce: 'test-takeover',
    authorizedActor: 'maintainer',
    handedBackAt: '2026-10-22T00:00:00Z',
    protectedSubjects: [],
  },
});
test('active takeover is paused until exact explicit handback; no default or malformed substitute', () => {
  assert.equal(automationPaused({}), false);
  for (const automation of [
    undefined,
    {},
    { enabled: 'true', mode: 'new-unclaimed-only', protectedSubjects: [] },
    { enabled: true, mode: 'all', protectedSubjects: [] },
    { enabled: true, mode: 'new-unclaimed-only' },
    {
      enabled: true,
      mode: 'new-unclaimed-only',
      protectedSubjects: [{ collection: 'unknown', id: 'old' }],
    },
  ]) {
    assert.equal(automationPaused({ operatorTakeover: { active: true, automation } }), true);
  }
  assert.equal(automationPaused({ operatorTakeover: handback() }), false);
});
test('subject identity protections are a union and never keyed by mutable SHA', () => {
  const takeover = handback();
  takeover.subjects = [{ collection: 'batches', id: 'old', sha: 'old-head' }];
  takeover.automation.protectedSubjects.push({
    collection: 'manualBatches',
    id: 'manual',
  });
  const state = { operatorTakeover: takeover };
  assert.equal(operatorOwns(state, 'batches', { id: 'old', sha: 'new-head' }), true);
  assert.equal(operatorOwns(state, 'manualBatches', { id: 'manual' }), true);
  assert.equal(operatorOwns(state, 'standaloneReviews', { id: 'old' }), false);
  assert.equal(
    operatorOwns(state, 'batches', {
      id: 'new',
      operatorCoordination: { active: true, finishedAt: 'historical' },
    }),
    true,
  );
  assert.equal(
    operatorOwns(state, 'batches', {
      id: 'new',
      operatorCoordination: { active: false },
    }),
    false,
  );
});
test('non-finished operator release ownership is retained independently of handback', () => {
  const state = { operatorTakeover: handback() };
  for (const release of [{}, { stage: 'awaiting-proof' }, { finishedAt: '' }])
    assert.equal(
      operatorOwns(state, 'batches', {
        id: 'old',
        operatorReleaseCoordination: release,
      }),
      true,
    );
  for (const release of [
    { status: 'finished' },
    { stage: 'finished' },
    { finishedAt: '2026-10-22T00:00:00Z' },
  ])
    assert.equal(
      operatorOwns(state, 'batches', {
        id: 'old',
        operatorReleaseCoordination: release,
      }),
      false,
    );
});
test('all collections retain terminal claimed issues and nonterminal exact scope occupancy without mutation', () => {
  const state = {
    batches: [
      {
        id: 'old',
        issues: [1],
        release: { status: 'deployed' },
        plan: { scope: ['retired.ts'] },
      },
    ],
    manualBatches: [
      {
        id: 'manual',
        issues: [2],
        plan: { scope: ['shared.ts'] },
        sourceManifest: [{ path: 'helper.ts' }],
      },
    ],
    standaloneReviews: [{ id: 'review', issues: [3], sourceManifest: [{ path: 'feature.ts' }] }],
  };
  const before = JSON.stringify(state);
  assert.deepEqual([...claimedIssues(state)], [1, 2, 3]);
  assert.deepEqual(
    occupiedSubjects(state).map((x) => [x.collection, x.id, x.scope]),
    [
      ['manualBatches', 'manual', ['shared.ts', 'helper.ts']],
      ['standaloneReviews', 'review', ['feature.ts']],
    ],
  );
  assert.equal(JSON.stringify(state), before);
});

test('Claude1 F1 stale nonce and missing audit cannot replay an old handback', () => {
  const takeover = {
    active: true,
    nonce: 'new-nonce',
    automation: {
      enabled: true,
      mode: 'new-unclaimed-only',
      protectedSubjects: [],
      takeoverNonce: 'old-nonce',
      authorizedActor: 'maintainer',
      handedBackAt: '2026-10-22T00:00:00Z',
    },
  };
  assert.equal(automationPaused({ operatorTakeover: takeover }), true);
  takeover.automation.takeoverNonce = takeover.nonce;
  assert.equal(automationPaused({ operatorTakeover: takeover }), false);
  for (const field of ['takeoverNonce', 'authorizedActor', 'handedBackAt']) {
    const invalid = structuredClone(takeover);
    delete invalid.automation[field];
    assert.equal(automationPaused({ operatorTakeover: invalid }), true);
  }
});

test('QA6-F1 malformed takeover and active types fail closed even without schema validation', () => {
  for (const active of ['true', 'false', '', 0, 1, null, undefined, [], {}]) {
    const takeover = handback();
    takeover.active = active;
    assert.equal(automationPaused({ operatorTakeover: takeover }), true);
    assert.equal(operatorOwns({ operatorTakeover: takeover }, 'batches', { id: 'new' }), true);
  }
  for (const takeover of [null, false, 0, '', [], 'true'])
    assert.equal(automationPaused({ operatorTakeover: takeover }), true);
  const inactive = handback();
  inactive.active = false;
  assert.equal(automationPaused({ operatorTakeover: inactive }), false);
  assert.equal(automationPaused({ operatorTakeover: { nonce: 'legacy-budget-audit' } }), false);
  assert.equal(automationPaused({ operatorTakeover: { active: true } }), true);
});
