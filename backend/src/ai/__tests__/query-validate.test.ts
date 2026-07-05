import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateQueryPlan } from '../gateway/query/validate.js';

test('016 F3: valid single-step plan accepted', () => {
  const p = validateQueryPlan({ steps: [{ id: 's1', from: 'roomAssignment', filter: [{ field: 'endDate', op: 'isNull' }], aggregate: { op: 'countDistinct', field: 'roomId' } }] });
  assert.ok(p);
  assert.equal(p!.steps[0].entity, 'roomAssignment');
  assert.equal(p!.primaryStep, 's1');
});

test('016 F3: reserved patient filter is allowed (resolved by engine)', () => {
  const p = validateQueryPlan({ steps: [{ id: 's1', from: 'vitalSign', filter: [{ field: 'patient', op: 'eq', value: 'Folli' }, { field: 'etichetta', op: 'eq', value: 'PA' }] }] });
  assert.ok(p);
});

test('016 F3: unknown entity rejected', () => {
  assert.equal(validateQueryPlan({ steps: [{ id: 's1', from: 'secretTable' }] }), null);
});

test('016 F3: unknown field rejected', () => {
  assert.equal(validateQueryPlan({ steps: [{ id: 's1', from: 'room', filter: [{ field: 'ssn', op: 'eq', value: 'x' }] }] }), null);
});

test('016 F3: unknown relation rejected', () => {
  assert.equal(validateQueryPlan({ steps: [{ id: 's1', from: 'room', relate: ['secret'] }] }), null);
});

test('016 F3: bad operator rejected', () => {
  assert.equal(validateQueryPlan({ steps: [{ id: 's1', from: 'room', filter: [{ field: 'numero', op: 'DROP' as never, value: 1 }] }] }), null);
});

test('016 F3: too many steps rejected', () => {
  assert.equal(validateQueryPlan({ steps: Array.from({ length: 5 }, (_, i) => ({ id: 's' + i, from: 'room' })) }), null);
});

test('016 F3: duplicate step id rejected', () => {
  assert.equal(validateQueryPlan({ steps: [{ id: 's1', from: 'room' }, { id: 's1', from: 'bed' }] }), null);
});

test('016 F3: runIf referencing unknown step rejected', () => {
  assert.equal(validateQueryPlan({ steps: [{ id: 's1', from: 'room', runIf: { step: 'sX', predicate: 'nonEmpty' } }] }), null);
});

test('016 F3: bindFrom referencing prior step accepted; unknown step rejected', () => {
  assert.ok(validateQueryPlan({ steps: [{ id: 's1', from: 'roomAssignment', select: ['patientId'] }, { id: 's2', from: 'patient', bindFrom: { step: 's1', field: 'patientId', into: 'id' } }] }));
  assert.equal(validateQueryPlan({ steps: [{ id: 's2', from: 'patient', bindFrom: { step: 'sX', field: 'patientId', into: 'id' } }] }), null);
});

test('016 F3: empty plan rejected', () => {
  assert.equal(validateQueryPlan({ steps: [] }), null);
  assert.equal(validateQueryPlan({}), null);
  assert.equal(validateQueryPlan(null), null);
});
