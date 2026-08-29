import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PatientPageInputError,
  decodePatientPageCursor,
  encodePatientPageCursor,
  parsePatientPageQuery,
} from '../pagination.js';

test('patient page query defaults to a bounded page and trims search', () => {
  assert.deepEqual(parsePatientPageQuery({ q: '  Rossi  ' }), {
    limit: 50,
    q: 'Rossi',
    sex: undefined,
    cursor: undefined,
  });
});

test('patient page query clamps the limit and rejects ambiguous integers', () => {
  assert.equal(parsePatientPageQuery({ limit: '999' }).limit, 100);
  assert.equal(parsePatientPageQuery({ limit: '1' }).limit, 1);
  for (const limit of ['0', '-1', '10foo', '1.5', '']) {
    assert.throws(() => parsePatientPageQuery({ limit }), PatientPageInputError);
  }
});

test('patient page query validates sex, search length and scalar values', () => {
  assert.equal(parsePatientPageQuery({ sex: 'F' }).sex, 'F');
  assert.throws(() => parsePatientPageQuery({ sex: 'X' }), PatientPageInputError);
  assert.throws(() => parsePatientPageQuery({ q: 'a'.repeat(81) }), PatientPageInputError);
  assert.throws(() => parsePatientPageQuery({ q: ['Rossi', 'Verdi'] }), PatientPageInputError);
});

test('patient page cursor round-trips and is bound to normalized filters', () => {
  const cursor = encodePatientPageCursor(
    { lastName: 'Rossi', firstName: 'Mario', id: 'patient-1' },
    { q: 'rossi', sex: 'M' },
  );
  assert.deepEqual(decodePatientPageCursor(cursor, { q: 'rossi', sex: 'M' }), {
    lastName: 'Rossi',
    firstName: 'Mario',
    id: 'patient-1',
  });
  assert.throws(
    () => decodePatientPageCursor(cursor, { q: 'verdi', sex: 'M' }),
    PatientPageInputError,
  );
});

test('patient page cursor rejects malformed, oversized and incomplete payloads', () => {
  const incomplete = Buffer.from(JSON.stringify({ v: 1, id: 'patient-1' })).toString('base64url');
  for (const cursor of ['not-base64!', 'a'.repeat(1025), incomplete]) {
    assert.throws(() => decodePatientPageCursor(cursor, {}), PatientPageInputError);
  }
});
