import assert from 'node:assert/strict';
import { test } from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PatientTherapyAPI } from '../../../../types';
import { formaDellaMaschera } from '../CampoFarmaco';
import { TherapyFormFields, emptyTherapyForm } from '../TherapyFormFields';
import { administrationUnitForForm, isInhalerForm } from '../therapyDose';
import { applyTherapyFormChange } from '../therapyFormChange';
import { schedulesFromTherapy } from '../therapyFormRestore';
import {
  dischargeRowToTherapyForm,
  dischargeRowToTherapyInput,
  therapyFormToDischargeRow,
  type DischargeTherapyRow,
} from '../../../shared/intake/dischargeTherapy';
import { therapyFormToInput } from '../../../shared/intake/therapyFormPayload';
import { therapyInputIssues } from '../../../shared/intake/intakeTherapies';
import { buildPatientTherapyDay } from '../../../../lib/patientTherapyCalendar';
import { parseTherapyLine } from '../../../../../../backend/src/intake/parse-discharge-therapy';
import { assertTherapyScalarInput } from '../../../../../../backend/src/therapies/input-validation';
import {
  assertValidSchedulesInput,
  normalizeSchedules,
  scheduleDoseLabel,
} from '../../../../../../backend/src/lib/therapy-dose';

Object.assign(globalThis, { React });
const date = '2026-09-20';
const row: DischargeTherapyRow = {
  farmacoNome: 'Farmaco sintetico',
  forma: 'inalatore',
  dosaggio: '100 MCG',
  viaSomministrazione: 'INAL',
  quantita: '2 Puff',
  orari: ['08:00', '20:00'],
  giorni: [],
  dataInizio: date,
  classe: '',
  note: '',
  originalText: 'Test sintetico',
  stato: 'ok',
};
function savedTherapy(patch: Partial<PatientTherapyAPI> = {}): PatientTherapyAPI {
  return {
    id: 'synthetic-therapy',
    patientId: 'synthetic-patient',
    farmacoNome: row.farmacoNome,
    dosaggio: '100 mcg inalatore',
    pharmaceuticalForm: 'inalatore',
    viaSomministrazione: 'inalatoria',
    tipo: 'periodica',
    stato: 'attiva',
    dataInizio: date,
    dataFine: null,
    fasceMattina: true,
    fascePranzo: false,
    fascePomeriggio: false,
    fasceSera: true,
    fasceNotte: false,
    orarioSpecifico: '08:00,20:00',
    prescrittore: null,
    operatoreInseritore: null,
    note: null,
    dataSomministrazione: null,
    orarioSomministrazione: null,
    createdAt: date,
    updatedAt: date,
    ...patch,
  };
}

test('manual inhaler selection exposes puff while preserving explicit alternatives and quantities', () => {
  const initial = emptyTherapyForm();
  initial.schedules[0].quantityNumerator = 2;
  initial.schedules.push({
    time: '20:00',
    quantityNumerator: 5,
    quantityDenominator: 1,
    administrationUnit: 'ml',
  });
  const form = applyTherapyFormChange(initial, { pharmaceuticalForm: 'inalatore' });
  assert.equal(administrationUnitForForm('inalatore'), 'puff');
  assert.deepEqual(form.schedules, [
    { time: '08:00', quantityNumerator: 2, quantityDenominator: 1, administrationUnit: 'puff' },
    initial.schedules[1],
  ]);
  assert.equal(
    form.viaSomministrazione,
    initial.viaSomministrazione,
    'a form change must not prescribe a route',
  );
  assert.equal(initial.schedules[0].administrationUnit, 'compressa');
  const markup = renderToStaticMarkup(
    createElement(TherapyFormFields, { value: form, onChange() {} }),
  );
  assert.match(markup, /<option value="inalatore" selected="">inalatore<\/option>/);
  assert.match(markup, /<option value="puff" selected="">puff<\/option>/);
  assert.match(markup, /08:00 — 2 puff/);
  const fractional = applyTherapyFormChange(
    { ...initial, schedules: [{ ...initial.schedules[0], quantityDenominator: 2 }] },
    { pharmaceuticalForm: 'inalatore' },
  );
  assert.equal(fractional.schedules[0].quantityDenominator, 2, 'never round a saved prescription');
});

test('AIFA and OCR recognize explicit inhalers before generic powder and solution forms', () => {
  for (const forma of [
    'Inalatore',
    'Inalatore predosato',
    'Polvere per inalazione',
    'Polvere inalatoria',
    'Soluzione pressurizzata per inalazione',
    'Sospensione pressurizzata per inalazione',
    'Spray per inalazione',
  ]) {
    assert.equal(isInhalerForm(forma), true, forma);
    assert.equal(formaDellaMaschera(forma), 'inalatore', forma);
    const form = dischargeRowToTherapyForm({ ...row, forma });
    assert.equal(form.pharmaceuticalForm, 'inalatore', forma);
    assert.equal(form.schedules[0].administrationUnit, 'puff');
  }
});

test('nebulizer, nasal and capsule forms are not converted to inhalers or puff by their route', () => {
  for (const forma of [
    'Soluzione da nebulizzare',
    'Sospensione per nebulizzatore',
    'Spray nasale',
    'Capsule contenenti polvere per inalazione',
    'Fiale per inalazione',
    'Soluzione per inalazione',
    'Polvere orale',
    'Spray cutaneo',
    'inalatoria',
  ]) {
    assert.equal(isInhalerForm(forma), false, forma);
    assert.notEqual(formaDellaMaschera(forma), 'inalatore', forma);
    const form = dischargeRowToTherapyForm({ ...row, forma, quantita: '2 ml' });
    assert.notEqual(form.pharmaceuticalForm, 'inalatore', forma);
    assert.equal(form.schedules[0].administrationUnit, 'ml', forma);
  }
  const unknownForm = dischargeRowToTherapyForm({ ...row, forma: '', quantita: '2' });
  assert.equal(unknownForm.pharmaceuticalForm, '');
  assert.equal(unknownForm.schedules[0].administrationUnit, '');
  assert.equal(formaDellaMaschera('Capsule contenenti polvere per inalazione'), 'capsula');
});

test('OCR puff quantities and exact inhaler form survive review, payload validation and JSON reload', () => {
  const parsed = parseTherapyLine(
    'SINTETICO inalatore 100 MCG (INAL) 2 Puff ore 08:00 e 20:00 dal 20/09/2026',
  );
  const form = dischargeRowToTherapyForm(parsed);
  assert.equal(parsed.forma, 'inalatore');
  assert.equal(form.pharmaceuticalForm, 'inalatore');
  assert.equal(form.viaSomministrazione, 'inalatoria');
  assert.equal(form.commercialStrengthValue, '100');
  assert.equal(form.commercialStrengthUnit, 'mcg');
  assert.deepEqual(
    form.schedules.map((s) => [s.time, s.quantityNumerator, s.administrationUnit]),
    [
      ['08:00', 2, 'puff'],
      ['20:00', 2, 'puff'],
    ],
  );
  const reviewed = JSON.parse(JSON.stringify(therapyFormToDischargeRow(form, parsed)));
  const payload = dischargeRowToTherapyInput(reviewed);
  assert.equal(payload.pharmaceuticalForm, 'inalatore');
  assert.deepEqual(therapyInputIssues(payload), []);
  assert.doesNotThrow(() => assertTherapyScalarInput(payload));
  assert.doesNotThrow(() => assertValidSchedulesInput(payload.schedules));
  assert.deepEqual(dischargeRowToTherapyForm(reviewed), form);
});

test('inhaler OCR only supplies a fallback unit when the quantity did not specify one', () => {
  for (const [quantita, expectedUnit] of [
    ['2', 'puff'],
    ['2 Puff', 'puff'],
    ['2 ml', 'ml'],
    ['1 capsula', 'capsula'],
    ['2 sconosciuta', ''],
  ]) {
    const form = dischargeRowToTherapyForm({ ...row, quantita });
    assert.equal(form.schedules[0].administrationUnit, expectedUnit, quantita);
  }
  const unknownDose = dischargeRowToTherapyForm({ ...row, quantita: '', dosaggio: '100 mcg/dose' });
  assert.equal(unknownDose.schedules[0].quantityNumerator, 0);
  assert.equal(unknownDose.commercialStrengthValue, '');
  assert.match(unknownDose.note, /100 mcg\/dose/);
});

test('manual payload, restored schedules, calendar and administration labels retain puff', () => {
  const form = dischargeRowToTherapyForm(row);
  form.schedules[1].quantityNumerator = 1;
  const payload = therapyFormToInput(form);
  const schedules = normalizeSchedules(payload.schedules).map((schedule, index) => ({
    ...schedule,
    id: `synthetic-schedule-${index}`,
    therapyId: 'synthetic-therapy',
  }));
  const saved = JSON.parse(JSON.stringify(savedTherapy({ schedules })));
  assert.deepEqual(schedulesFromTherapy(saved), form.schedules);
  assert.deepEqual(
    buildPatientTherapyDay([saved], saved.patientId, date).events.map((event) => event.dose),
    ['2 puff', '1 puff'],
  );
  assert.equal(scheduleDoseLabel(schedules[0]), '2 puff');
  assert.deepEqual(
    schedulesFromTherapy(savedTherapy()).map((s) => s.administrationUnit),
    ['puff', 'puff'],
  );
  const alternative = savedTherapy({ schedules: [{ ...schedules[0], administrationUnit: 'ml' }] });
  assert.equal(schedulesFromTherapy(alternative)[0].administrationUnit, 'ml');
});
