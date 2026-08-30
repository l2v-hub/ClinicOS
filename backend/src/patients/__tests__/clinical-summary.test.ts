import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  assemblePatientClinicalSummaries,
  buildPatientClinicalSummaryQuery,
  MAX_CLINICAL_SUMMARY_PATIENTS,
  type PatientClinicalSummaryProjection,
} from '../clinical-summary.js';

test('clinical summary query projects derived scalars and never the full chart blob', () => {
  const query = buildPatientClinicalSummaryQuery(['patient-a', 'patient-b']);
  const sql = query.strings.join('?');

  assert.match(sql, /FROM "Cartella" chart/);
  assert.match(sql, /chart\."patientId" IN/);
  assert.match(sql, /jsonb_typeof/);
  assert.match(sql, /jsonb_array_length/);
  assert.match(sql, /AS "hasCriticalVitals"/);
  assert.match(sql, /AS "terapieCompletate"/);
  assert.doesNotMatch(sql, /SELECT\s+chart\."data"/);
  assert.doesNotMatch(sql, /AS "data"/);
});

test('clinical summary window rejects empty and oversized query inputs', () => {
  assert.throws(() => buildPatientClinicalSummaryQuery([]), /between 1 and 100/);
  assert.throws(
    () =>
      buildPatientClinicalSummaryQuery(
        Array.from({ length: MAX_CLINICAL_SUMMARY_PATIENTS + 1 }, (_, index) => `p-${index}`),
      ),
    /between 1 and 100/,
  );
});

test('summary assembly preserves requested order and fills missing charts safely', () => {
  const projection: PatientClinicalSummaryProjection = {
    patientId: 'patient-b',
    statoRicovero: 'ricoverato',
    hasCriticalVitals: true,
    hasHighRisk: true,
    allergieCount: 2,
    hasSevereAllergy: true,
    terapieTotali: 3,
    terapieCompletate: 1,
  };
  const result = assemblePatientClinicalSummaries(
    ['patient-a', 'patient-b'],
    [projection],
    new Map([
      ['patient-a', 1],
      ['patient-b', 2],
    ]),
  );

  assert.deepEqual(result, [
    {
      patientId: 'patient-a',
      statoRicovero: null,
      hasCriticalVitals: false,
      hasHighRisk: false,
      allergieCount: 0,
      hasSevereAllergy: false,
      terapieTotali: 0,
      terapieCompletate: 0,
      consegneAperte: 1,
    },
    { ...projection, consegneAperte: 2 },
  ]);
});

test('patients route no longer selects Cartella.data for the page summary', () => {
  const route = readFileSync(new URL('../../routes/patients.ts', import.meta.url), 'utf8');
  const block = route
    .split("router.get('/clinical-summary',")[1]
    ?.split("router.patch('/:id/parameters'")[0];
  assert.ok(block);
  assert.match(block, /loadPatientClinicalSummaryRows\(scopedPatientIds\)/);
  assert.match(block, /assemblePatientClinicalSummaries/);
  assert.doesNotMatch(block, /cartella\.findMany|select:\s*\{\s*patientId:\s*true,\s*data:\s*true/);
  assert.ok(
    block.indexOf('patientScopeWhere(actor)') <
      block.indexOf('loadPatientClinicalSummaryRows(scopedPatientIds)'),
    'ownership must be resolved before clinical rows are loaded',
  );
});
