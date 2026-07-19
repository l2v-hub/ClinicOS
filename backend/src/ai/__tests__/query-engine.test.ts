import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateQueryPlan } from '../gateway/query/validate.js';
import { runQueryPlan } from '../gateway/query/engine.js';

// Seed-independent: assertions hold on an empty (migrated) test DB — shape/type/authz, not counts.
const CTX = {
  userId: 'op',
  tenantId: 'clinicos',
  roles: ['operatore'],
  permittedPatientIds: null,
  requestId: 'r',
};
const ON = { AI_FACILITY_QUERIES_ENABLED: 'true', AI_DEFAULT_TENANT: 'clinicos' };
const OFF = { AI_FACILITY_QUERIES_ENABLED: 'false', AI_DEFAULT_TENANT: 'clinicos' };

test('016 F3: facility flag OFF → forbidden', async () => {
  const plan = validateQueryPlan({ steps: [{ id: 's1', from: 'room', select: ['numero'] }] })!;
  await assert.rejects(() => runQueryPlan(plan, CTX, OFF), /struttura non abilitate|forbidden/i);
});

test('016 F3: count aggregate returns a number (empty DB → 0)', async () => {
  const plan = validateQueryPlan({
    steps: [
      {
        id: 's1',
        from: 'roomAssignment',
        filter: [{ field: 'endDate', op: 'isNull' }],
        aggregate: { op: 'count' },
      },
    ],
  })!;
  const out = await runQueryPlan(plan, CTX, ON);
  assert.equal(out.rows.length, 1);
  assert.equal(typeof (out.rows[0] as { value: number }).value, 'number');
});

test('016 F3: countDistinct returns a number', async () => {
  const plan = validateQueryPlan({
    steps: [
      {
        id: 's1',
        from: 'roomAssignment',
        filter: [{ field: 'endDate', op: 'isNull' }],
        aggregate: { op: 'countDistinct', field: 'roomId' },
      },
    ],
  })!;
  const out = await runQueryPlan(plan, CTX, ON);
  assert.equal(typeof (out.rows[0] as { value: number }).value, 'number');
});

test('016 F3: from+filter+select returns arrays (rows + sources)', async () => {
  const plan = validateQueryPlan({
    steps: [
      {
        id: 's1',
        from: 'room',
        filter: [{ field: 'stato', op: 'eq', value: 'attiva' }],
        select: ['numero', 'stato'],
        limit: 50,
      },
    ],
  })!;
  const out = await runQueryPlan(plan, CTX, ON);
  assert.ok(Array.isArray(out.rows));
  assert.ok(Array.isArray(out.sources));
});

test('016 F3: relate 1-hop does not crash (patient + bed on roomAssignment)', async () => {
  const plan = validateQueryPlan({
    steps: [
      {
        id: 's1',
        from: 'roomAssignment',
        filter: [{ field: 'endDate', op: 'isNull' }],
        relate: ['patient', 'bed'],
        select: ['patient.lastName', 'bed.label'],
        limit: 20,
      },
    ],
  })!;
  const out = await runQueryPlan(plan, CTX, ON);
  assert.ok(Array.isArray(out.rows));
});

test('016 F3: patient-scoped without resolved patient → bad_request', async () => {
  const plan = validateQueryPlan({
    steps: [
      { id: 's1', from: 'vitalSign', filter: [{ field: 'etichetta', op: 'eq', value: 'PA' }] },
    ],
  })!;
  await assert.rejects(() => runQueryPlan(plan, CTX, ON), /paziente|bad_request/i);
});

test('016 F3: runIf skips step2 when step1 empty', async () => {
  const plan = validateQueryPlan({
    steps: [
      {
        id: 's1',
        from: 'room',
        filter: [{ field: 'numero', op: 'eq', value: '__no_such_room__' }],
        select: ['numero'],
      },
      {
        id: 's2',
        from: 'room',
        runIf: { step: 's1', predicate: 'nonEmpty' },
        aggregate: { op: 'count' },
      },
    ],
    answer: { primaryStep: 's2' },
  })!;
  const out = await runQueryPlan(plan, CTX, ON);
  assert.deepEqual(out.rows, []);
});

test('016 F3: tenant isolation rejects a foreign tenant', async () => {
  const plan = validateQueryPlan({
    steps: [{ id: 's1', from: 'room', aggregate: { op: 'count' } }],
  })!;
  await assert.rejects(() => runQueryPlan(plan, { ...CTX, tenantId: 'other' }, ON), /tenant/i);
});
