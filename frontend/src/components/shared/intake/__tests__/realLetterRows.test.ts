// 2026-10-11: righe prodotte dal backend per la lettera reale segnalata (valori anonimi, struttura
// identica): la basale arriva come 10 unità alle 08:00, l'eparina come 1 fiala, lo schema HUMALOG
// con le fasce come scritte e la sovrapposizione sul 250 segnalata all'operatore, mai corretta.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dischargeRowToTherapyForm, type DischargeTherapyRow } from '../dischargeTherapy';
import { validateGlucoseScaleRows } from '../../../operator/cartella/glucoseScale';

const base: DischargeTherapyRow = {
  farmacoNome: '',
  forma: '',
  dosaggio: '',
  viaSomministrazione: '',
  quantita: '',
  orari: [],
  giorni: [],
  dataInizio: '2026-10-11',
  classe: '',
  note: '',
  originalText: 'Fonte sintetica',
  stato: 'da_verificare',
  doseMode: 'fixed',
};

test('basale: 10 unità alle 08:00', () => {
  const form = dischargeRowToTherapyForm({
    ...base,
    farmacoNome: 'LANTUS',
    forma: 'FL SC',
    dosaggio: '100 UI /ML',
    quantita: '10 UI',
    orari: ['08:00'],
  });
  assert.equal(form.doseMode, 'fixed');
  assert.deepEqual(
    form.schedules.map((s) => [s.time, s.quantityNumerator, s.administrationUnit]),
    [['08:00', 10, 'unità']],
  );
});

test('eparina: "1 F" è una fiala', () => {
  const form = dischargeRowToTherapyForm({
    ...base,
    farmacoNome: 'CALCIPARINA',
    dosaggio: '5000U/0,2 ML',
    quantita: '1 F',
    orari: ['08:00', '20:00'],
  });
  assert.deepEqual(
    form.schedules.map((s) => [s.time, s.quantityNumerator, s.administrationUnit]),
    [
      ['08:00', 1, 'fiala'],
      ['20:00', 1, 'fiala'],
    ],
  );
});

test('schema HUMALOG: fasce come nel documento, sovrapposizione segnalata', () => {
  const form = dischargeRowToTherapyForm({
    ...base,
    farmacoNome: 'HUMALOG',
    dosaggio: '100 UI/ML',
    doseMode: 'glucose_scale',
    glucoseScale: [
      { minMgDl: 200, maxMgDl: 250, units: 4 },
      { minMgDl: 250, maxMgDl: 300, units: 6 },
      { minMgDl: 350, maxMgDl: 450, units: 8 },
    ],
  });
  assert.equal(form.doseMode, 'glucose_scale');
  assert.deepEqual(form.glucoseScale, [
    { minMgDl: '200', maxMgDl: '250', units: '4' },
    { minMgDl: '250', maxMgDl: '300', units: '6' },
    { minMgDl: '350', maxMgDl: '450', units: '8' },
  ]);
  const { errors } = validateGlucoseScaleRows(form.glucoseScale ?? []);
  assert.ok(errors.includes('Le fasce glicemiche non possono sovrapporsi.'), errors.join(' | '));
});

test('un numero ambiguo col punto ("1.000") non precompila mai un valore: lo inserisce l operatore', () => {
  const form = dischargeRowToTherapyForm({
    ...base,
    farmacoNome: 'TACHIPIRINA',
    dosaggio: '1.000 MG',
    quantita: '1 Cpr',
    orari: ['08:00'],
  });
  assert.equal(form.commercialStrengthValue, '');
  assert.match(form.note, /Dosaggio: 1\.000 MG/);
  const insulin = dischargeRowToTherapyForm({
    ...base,
    farmacoNome: 'INSULINA',
    dosaggio: '100 UI/ML',
    quantita: '1.000 UI',
    orari: ['08:00'],
  });
  assert.equal(insulin.schedules[0].quantityNumerator, 0);
  assert.match(insulin.note, /Quantità: 1\.000 UI/);
});

test('i decimali col punto restano decimali (0.125 MG non diventa 125 mg)', () => {
  for (const [raw, value] of [
    ['0.125 MG', '0.125'],
    ['0.075 MG', '0.075'],
    ['1.5 MG', '1.5'],
    ['0,125 MG', '0.125'],
  ]) {
    const form = dischargeRowToTherapyForm({ ...base, farmacoNome: 'X', dosaggio: raw });
    assert.equal(form.commercialStrengthValue, value, raw);
  }
});
