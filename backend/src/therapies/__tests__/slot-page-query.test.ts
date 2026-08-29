import assert from 'node:assert/strict';
import test from 'node:test';
import {
  encodeTherapySlotCursor,
  parseTherapySlotPageQuery,
  TherapySlotPageInputError,
} from '../slot-page-query.js';

test('therapy slot cursor is opaque, date-bound and limit is bounded', () => {
  const cursor = encodeTherapySlotCursor('2030-06-15', 'therapy_123');
  assert.deepEqual(parseTherapySlotPageQuery({ limit: '25', cursor }, '2030-06-15'), {
    limit: 25,
    cursorId: 'therapy_123',
  });
  assert.throws(
    () => parseTherapySlotPageQuery({ limit: '251' }, '2030-06-15'),
    TherapySlotPageInputError,
  );
  assert.throws(
    () => parseTherapySlotPageQuery({ cursor }, '2030-06-16'),
    TherapySlotPageInputError,
  );
  assert.throws(
    () => parseTherapySlotPageQuery({ cursor: 'x'.repeat(513) }, '2030-06-15'),
    TherapySlotPageInputError,
  );
  assert.throws(
    () => parseTherapySlotPageQuery({ unexpected: '1' }, '2030-06-15'),
    TherapySlotPageInputError,
  );
});
