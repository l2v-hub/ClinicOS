import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEntity, resolveField, QUERY_SCHEMA } from '../gateway/query/schema.js';

test('016 F3: known entity resolves; unknown denied', () => {
  assert.ok(getEntity('roomAssignment'));
  assert.equal(getEntity('secretTable'), null);
});

test('016 F3: field resolves incl 1-hop relation; unknown field/relation denied', () => {
  assert.ok(resolveField('roomAssignment', 'endDate'));
  assert.ok(resolveField('roomAssignment', 'room.numero'));
  assert.equal(resolveField('roomAssignment', 'room.secret'), null);
  assert.equal(resolveField('roomAssignment', 'ssn'), null);
  assert.equal(resolveField('roomAssignment', 'notARelation.x'), null);
});

test('016 F3: >1 hop is denied', () => {
  assert.equal(resolveField('roomAssignment', 'room.beds.label'), null);
});

test('016 F3: authz classes and vitalSign custom loader', () => {
  assert.equal(QUERY_SCHEMA.room.authz, 'facility');
  assert.equal(QUERY_SCHEMA.patient.authz, 'public');
  assert.equal(QUERY_SCHEMA.vitalSign.authz, 'patient-scoped');
  assert.equal(QUERY_SCHEMA.vitalSign.custom, true);
});
