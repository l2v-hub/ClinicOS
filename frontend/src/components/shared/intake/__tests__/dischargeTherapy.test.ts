import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dischargeRowToTherapyForm,
  dischargeRowToTherapyInput,
  therapyFormToDischargeRow,
  type DischargeTherapyRow,
} from '../dischargeTherapy';

const scaleRow: DischargeTherapyRow = {
  farmacoNome: 'Insulina test',
  forma: 'FL',
  dosaggio: '100 UI/ML',
  viaSomministrazione: 'SC',
  quantita: '',
  orari: [],
  giorni: [],
  dataInizio: '2033-01-01',
  classe: '',
  note: '',
  originalText: 'Istruzione insulinica condizionale',
  stato: 'da_verificare',
  doseMode: 'glucose_scale',
  glucoseScale: [
    { minMgDl: 200, maxMgDl: 250, units: 4 },
    { minMgDl: 251, maxMgDl: 300, units: 6 },
  ],
};

test('una scala senza orari non inventa una somministrazione alle 08:00', () => {
  const form = dischargeRowToTherapyForm(scaleRow);
  assert.equal(form.doseMode, 'glucose_scale');
  assert.deepEqual(form.schedules, []);
});

test('schema e orari revisionati sopravvivono fino al payload di conferma', () => {
  const form = dischargeRowToTherapyForm(scaleRow);
  const reviewed = therapyFormToDischargeRow(
    {
      ...form,
      schedules: [
        {
          time: '08:00',
          quantityNumerator: 1,
          quantityDenominator: 1,
          administrationUnit: 'unità',
        },
        {
          time: '12:00',
          quantityNumerator: 1,
          quantityDenominator: 1,
          administrationUnit: 'unità',
        },
      ],
    },
    scaleRow,
  );
  assert.equal(reviewed.stato, 'ok');
  const payload = dischargeRowToTherapyInput(reviewed);
  assert.deepEqual(
    (payload.schedules as Array<{ time: string }>).map((schedule) => schedule.time),
    ['08:00', '12:00'],
  );
  assert.deepEqual(payload.doseProtocol, {
    kind: 'blood_glucose',
    measurementUnit: 'mg/dL',
    doseUnit: 'unità',
    rules: scaleRow.glucoseScale,
  });
});
