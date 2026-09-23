import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseTherapySlotPageQuery,
  therapySlotScopeFingerprint,
  TherapySlotPageInputError,
} from '../slot-page-query.js';
import { decodeRosterCursor, encodeRosterCursor, type RosterBinding } from '../../roster/cursor.js';

test('therapy slot parser preserves opaque cursors and bounds scalar query fields', () => {
  const scope = therapySlotScopeFingerprint({ registeredById: 'operator-1' });
  const binding: RosterBinding = {
    view: 'therapy',
    scope,
    contextId: null,
    contextVersion: null,
    revision: null,
    order: { criterion: 'name', direction: 'asc' },
    filters: {},
    asOf: '2030-06-15',
    epoch: { roster: '1', therapy: '2' },
  };
  const cursor = encodeRosterCursor(binding, {
    patientId: 'patient_123',
    therapyId: 'therapy_123',
  });
  assert.deepEqual(parseTherapySlotPageQuery({ limit: '25', cursor }), {
    limit: 25,
    cursor,
  });
  assert.deepEqual(decodeRosterCursor(cursor, binding), {
    patientId: 'patient_123',
    therapyId: 'therapy_123',
  });
  assert.throws(() => parseTherapySlotPageQuery({ limit: '251' }), TherapySlotPageInputError);
  assert.throws(() => decodeRosterCursor(cursor, { ...binding, asOf: '2030-06-16' }), {
    code: 'roster_changed',
  });
  assert.throws(
    () => parseTherapySlotPageQuery({ cursor: 'x'.repeat(4097) }),
    TherapySlotPageInputError,
  );
  assert.throws(() => parseTherapySlotPageQuery({ unexpected: '1' }), TherapySlotPageInputError);
  assert.throws(
    () =>
      decodeRosterCursor(cursor, {
        ...binding,
        scope: therapySlotScopeFingerprint({ registeredById: 'operator-2' }),
      }),
    { code: 'roster_changed' },
  );
  assert.deepEqual(
    parseTherapySlotPageQuery({ sort: 'location', direction: 'desc', contextId: 'context-1' }),
    {
      limit: 100,
      sort: 'location',
      direction: 'desc',
      contextId: 'context-1',
    },
  );
  for (const query of [
    { sort: 'location' },
    { direction: 'asc' },
    { sort: 'cf', direction: 'asc' },
  ])
    assert.throws(() => parseTherapySlotPageQuery(query));
});

test('scope fingerprints are stable, order-independent and separate global access', () => {
  assert.equal(
    therapySlotScopeFingerprint({ patientIds: ['p2', 'p1'] }),
    therapySlotScopeFingerprint({ patientIds: ['p1', 'p2'] }),
  );
  assert.notEqual(
    therapySlotScopeFingerprint({ registeredById: 'operator-1' }),
    therapySlotScopeFingerprint({}),
  );
  assert.notEqual(
    therapySlotScopeFingerprint({ patientIds: ['p1'], registeredById: 'operator-1' }),
    therapySlotScopeFingerprint({ patientIds: ['p1'], registeredById: 'operator-2' }),
  );
});
