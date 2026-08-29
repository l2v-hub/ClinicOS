import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_MEDICATION_ADMINISTRATIONS,
  encodeMedicationAdministrationCursor,
  MedicationAdministrationQueryError,
  parseMedicationAdministrationPageQuery,
  parseMedicationAdministrationQuery,
} from '../administration-query.js';

test('medication administration query defaults and caps its result size', () => {
  assert.deepEqual(parseMedicationAdministrationQuery({}), { date: undefined, limit: 100 });
  assert.deepEqual(parseMedicationAdministrationQuery({ date: '2026-08-29', limit: '25' }), {
    date: '2026-08-29',
    limit: 25,
  });
  assert.equal(
    parseMedicationAdministrationQuery({ limit: '999999' }).limit,
    MAX_MEDICATION_ADMINISTRATIONS,
  );
});

test('medication administration page cursor is stable and bound to the date filter', () => {
  const cursor = encodeMedicationAdministrationCursor(
    {
      date: '2026-08-29',
      createdAt: new Date('2026-08-29T10:00:00.000Z'),
      id: 'admin-1',
    },
    '2026-08-29',
  );
  assert.deepEqual(parseMedicationAdministrationPageQuery({ date: '2026-08-29', cursor }), {
    date: '2026-08-29',
    limit: 100,
    cursor: {
      date: '2026-08-29',
      createdAt: new Date('2026-08-29T10:00:00.000Z'),
      id: 'admin-1',
    },
  });
  assert.throws(
    () => parseMedicationAdministrationPageQuery({ date: '2026-08-28', cursor }),
    MedicationAdministrationQueryError,
  );
  assert.equal(parseMedicationAdministrationPageQuery({ limit: '500' }).limit, 100);
});

test('medication administration query rejects malformed dates and non-positive/non-integer limits', () => {
  for (const query of [
    { date: '2026-02-30' },
    { date: ['2026-08-29'] },
    { limit: '-1' },
    { limit: '10foo' },
    { limit: '1.5' },
    { limit: ['10'] },
  ]) {
    assert.throws(
      () => parseMedicationAdministrationQuery(query),
      (error: unknown) => error instanceof MedicationAdministrationQueryError,
    );
  }
});
