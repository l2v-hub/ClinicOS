import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dispatchQueryData } from '../assistant/service.js';

// Seed-independent: exercises the query_data dispatch → validate → engine path on the migrated test DB.
const CTX = {
  userId: 'op',
  tenantId: 'clinicos',
  roles: ['operatore'],
  permittedPatientIds: null,
  requestId: 'r',
};
const ON = { AI_FACILITY_QUERIES_ENABLED: 'true', AI_DEFAULT_TENANT: 'clinicos' };
const OFF = { AI_FACILITY_QUERIES_ENABLED: 'false', AI_DEFAULT_TENANT: 'clinicos' };

test('016 F3: dispatchQueryData occupancy count returns a number', async () => {
  const out = await dispatchQueryData(
    { steps: [{ id: 's1', from: 'roomAssignment', aggregate: { op: 'count' } }] },
    CTX,
    ON,
  );
  assert.equal(typeof (out.data[0] as { value: number }).value, 'number');
});

test('016 F3: invalid plan → empty result (no throw)', async () => {
  const out = await dispatchQueryData({ steps: [{ id: 's1', from: 'secretTable' }] }, CTX, ON);
  assert.deepEqual(out.data, []);
  assert.deepEqual(out.sourceRefs, []);
});

test('016 F3: facility off → forbidden propagates (clean refusal upstream)', async () => {
  await assert.rejects(
    () =>
      dispatchQueryData(
        { steps: [{ id: 's1', from: 'room', aggregate: { op: 'count' } }] },
        CTX,
        OFF,
      ),
    /forbidden|struttura/i,
  );
});
