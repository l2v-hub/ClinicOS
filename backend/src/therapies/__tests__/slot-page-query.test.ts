import assert from 'node:assert/strict';
import test from 'node:test';
import {
  encodeTherapySlotCursor,
  parseTherapySlotPageQuery,
  therapySlotScopeFingerprint,
  TherapySlotPageInputError,
} from '../slot-page-query.js';

test('therapy slot cursor is opaque, date-bound and limit is bounded', () => {
  const scope = therapySlotScopeFingerprint({ registeredById: 'operator-1' });
  const cursor = encodeTherapySlotCursor('2030-06-15', scope, 'therapy_123');
  assert.deepEqual(parseTherapySlotPageQuery({ limit: '25', cursor }, '2030-06-15', scope), {
    limit: 25,
    cursorId: 'therapy_123',
  });
  assert.throws(
    () => parseTherapySlotPageQuery({ limit: '251' }, '2030-06-15', scope),
    TherapySlotPageInputError,
  );
  assert.throws(
    () => parseTherapySlotPageQuery({ cursor }, '2030-06-16', scope),
    TherapySlotPageInputError,
  );
  assert.throws(
    () => parseTherapySlotPageQuery({ cursor: 'x'.repeat(513) }, '2030-06-15', scope),
    TherapySlotPageInputError,
  );
  assert.throws(
    () => parseTherapySlotPageQuery({ unexpected: '1' }, '2030-06-15', scope),
    TherapySlotPageInputError,
  );
  assert.throws(
    () =>
      parseTherapySlotPageQuery(
        { cursor },
        '2030-06-15',
        therapySlotScopeFingerprint({ registeredById: 'operator-2' }),
      ),
    TherapySlotPageInputError,
  );
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
});
