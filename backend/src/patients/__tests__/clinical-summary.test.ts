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
      allergeni: [],
      parametriCritici: [],
      rischiElevati: [],
      consegneAperte: 1,
    },
    { ...projection, allergeni: [], parametriCritici: [], rischiElevati: [], consegneAperte: 2 },
  ]);
});

test('patients route no longer selects Cartella.data for the page summary', () => {
  const route = readFileSync(new URL('../../routes/patients.ts', import.meta.url), 'utf8');
  const block = route
    .split("router.get('/clinical-summary',")[1]
    ?.split("router.patch('/:id/parameters'")[0];
  assert.ok(block);
  // The composition is shared with the Tool Layer (patients/clinical-summary-service.ts).
  assert.match(block, /loadScopedPatientClinicalSummaries\(req\.query\.patientIds, actor\)/);
  assert.doesNotMatch(block, /cartella\.findMany|select:\s*\{\s*patientId:\s*true,\s*data:\s*true/);
  const service = readFileSync(new URL('../clinical-summary-service.ts', import.meta.url), 'utf8');
  assert.match(service, /loadPatientClinicalSummaryRows\(scopedPatientIds\)/);
  assert.match(service, /assemblePatientClinicalSummaries/);
  assert.doesNotMatch(
    service,
    /cartella\.findMany|select:\s*\{\s*patientId:\s*true,\s*data:\s*true/,
  );
  assert.ok(
    service.indexOf('patientScopeWhere(actor)') <
      service.indexOf('loadPatientClinicalSummaryRows(scopedPatientIds)'),
    'ownership must be resolved before clinical rows are loaded',
  );
});

test('clinical summary names WHICH allergen / critical parameter / risk (bounded, additive)', () => {
  const sql = buildPatientClinicalSummaryQuery(['patient-a']).strings.join('?');
  assert.match(sql, /AS "allergeni"/);
  assert.match(sql, /AS "parametriCritici"/);
  assert.match(sql, /AS "rischiElevati"/);
  // Bounded lists: every detail list has a LIMIT and short strings (LEFT), never the chart blob.
  assert.equal(sql.match(/LIMIT \?/g)?.length, 3);
  assert.doesNotMatch(sql, /SELECT\s+chart\."data"/);
  const projection: PatientClinicalSummaryProjection = {
    patientId: 'p',
    statoRicovero: null,
    hasCriticalVitals: true,
    hasHighRisk: true,
    allergieCount: 1,
    hasSevereAllergy: true,
    terapieTotali: 0,
    terapieCompletate: 0,
    allergeni: [{ allergene: 'Penicillina', gravita: 'grave' }],
    parametriCritici: [{ etichetta: 'PA', valore: '85/50', unita: 'mmHg' }],
    rischiElevati: [{ tipo: 'caduta', livello: 'alto', descrizione: null }],
  };
  const [summary] = assemblePatientClinicalSummaries(['p'], [projection], new Map());
  assert.deepEqual(summary.allergeni, [{ allergene: 'Penicillina', gravita: 'grave' }]);
  assert.deepEqual(summary.parametriCritici, [{ etichetta: 'PA', valore: '85/50', unita: 'mmHg' }]);
  assert.deepEqual(summary.rischiElevati, [{ tipo: 'caduta', livello: 'alto', descrizione: null }]);
});
