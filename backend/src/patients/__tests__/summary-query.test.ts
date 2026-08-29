import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PatientSummaryInputError, parsePatientSummaryIds } from '../summary-query.js';

test('summary IDs preserve legacy absence and normalize a bounded unique batch', () => {
  assert.equal(parsePatientSummaryIds(undefined), undefined);
  assert.deepEqual(parsePatientSummaryIds(' patient-1,patient-2,patient-1 '), [
    'patient-1',
    'patient-2',
  ]);
});

test('summary IDs reject empty, repeated query values, invalid IDs and oversized batches', () => {
  const tooMany = Array.from({ length: 101 }, (_, index) => `patient-${index}`).join(',');
  for (const value of ['', ['patient-1', 'patient-2'], 'patient/1', tooMany]) {
    assert.throws(() => parsePatientSummaryIds(value), PatientSummaryInputError);
  }
});
