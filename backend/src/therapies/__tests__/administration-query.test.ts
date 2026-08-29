import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_MEDICATION_ADMINISTRATIONS,
  MedicationAdministrationQueryError,
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
