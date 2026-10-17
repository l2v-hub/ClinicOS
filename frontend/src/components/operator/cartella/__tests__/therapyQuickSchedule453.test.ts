import test from 'node:test';
import assert from 'node:assert/strict';
import {
  quickSchedule,
  durationEnd,
  prescriptionSentence,
  nextPrescriptionOccurrence,
  QUICK_SCHEDULES,
} from '../therapyQuickSchedule';
import { formToPayload } from '../therapyFormMapping';
import { selectDrugPackage } from '../drugPackageSelection';
import type { TherapyFormValue } from '../TherapyFormFields';
const base: TherapyFormValue = {
  farmacoNome: 'QA compressa',
  pharmaceuticalForm: 'compressa',
  commercialStrengthValue: '5',
  commercialStrengthUnit: 'mg',
  allowedFractions: ['1', '1/2'],
  viaSomministrazione: 'orale',
  tipo: 'periodica',
  stato: 'attiva',
  dataInizio: '2026-10-23',
  dataFine: '',
  schedules: [
    {
      time: '10:15',
      quantityNumerator: 1,
      quantityDenominator: 2,
      administrationUnit: 'compressa',
    },
  ],
  giorniSettimana: [],
  prescrittore: '',
  note: '',
  dataSomministrazione: '2026-10-23',
  orarioSomministrazione: '',
};
test('quick schedules preserve explicit fractional dose and equal manual payload', () => {
  for (const preset of QUICK_SCHEDULES) {
    const quick = quickSchedule(base, preset.times);
    const manual = {
      ...base,
      schedules: preset.times.map((time) => ({ ...base.schedules[0], time })),
    };
    assert.deepEqual(formToPayload(quick, 'QA1', 'QA'), formToPayload(manual, 'QA1', 'QA'));
  }
  assert.equal(base.schedules[0].time, '10:15');
});
test('inclusive civil duration handles DST, leap/month/year boundaries and invalid dates', () => {
  assert.equal(durationEnd('2026-10-23', 7), '2026-10-29');
  assert.equal(durationEnd('2026-03-27', 7), '2026-04-02');
  assert.equal(durationEnd('2028-02-27', 3), '2028-02-29');
  assert.equal(durationEnd('2026-12-29', 7), '2027-01-04');
  assert.equal(durationEnd('2026-02-30', 7), '');
});
test('sentence renders the actual payload schedule dose unit route and dates', () => {
  const v = {
    ...quickSchedule(base, ['08:00', '20:00']),
    dataFine: durationEnd(base.dataInizio, 7),
  };
  const s = prescriptionSentence(v),
    p = formToPayload(v, 'QA1', 'QA');
  assert.match(s, /1\/2 compressa alle 08:00; 1\/2 compressa alle 20:00/);
  assert.ok(s.includes(p.viaSomministrazione));
  assert.ok(s.includes(p.dataInizio));
  assert.ok(s.includes(p.dataFine!));
});
test('structured single ingredient strength is prefilled, ambiguous packages stay unconfirmed', () => {
  const drug = {
    aic: 'QA00001',
    denominazione: 'Synthetic',
    linkFi: null,
    linkRcp: null,
    forma: 'compressa',
    principiAttivi: [{ nome: 'QA', quantita: 5, unita: 'mg' }],
  };
  assert.equal(selectDrugPackage(drug, 'compressa').commercialStrengthValue, '5');
  assert.equal(
    selectDrugPackage(
      { ...drug, principiAttivi: [...drug.principiAttivi, ...drug.principiAttivi] },
      'compressa',
    ).commercialStrengthValue,
    '',
  );
  assert.equal(
    selectDrugPackage({ ...drug, principiAttivi: [] }, 'compressa').commercialStrengthValue,
    '',
  );
});

test('next occurrence uses actual facility date, weekday and end bounds and never predicts suspended/import-unconfirmed doses', () => {
  const payload = formToPayload(
    {
      ...base,
      dataInizio: '2026-10-23',
      dataFine: '2026-10-29',
      schedules: [{ ...base.schedules[0], time: '08:00' }],
    },
    'QA',
    'QA',
  );
  assert.equal(
    nextPrescriptionOccurrence(payload, new Date('2026-10-23T07:00:00Z')),
    '2026-10-24T08:00',
  );
  assert.equal(
    nextPrescriptionOccurrence(
      { ...payload, giorniSettimana: '1' },
      new Date('2026-10-23T07:00:00Z'),
    ),
    '2026-10-26T08:00',
  );
  assert.equal(
    nextPrescriptionOccurrence(
      { ...payload, dataFine: '2026-10-23' },
      new Date('2026-10-23T07:00:00Z'),
    ),
    null,
  );
  assert.equal(
    nextPrescriptionOccurrence({ ...payload, stato: 'sospesa' }, new Date('2026-10-23T07:00:00Z')),
    null,
  );
  assert.equal(
    nextPrescriptionOccurrence({ ...payload, stato: '' }, new Date('2026-10-23T07:00:00Z')),
    null,
  );
  assert.equal(
    nextPrescriptionOccurrence(
      { ...payload, dataInizio: '2026-02-30' },
      new Date('2026-10-23T07:00:00Z'),
    ),
    null,
  );
});

test('an existing different evening dose is preserved when a preset retains its time', () => {
  const mixed = {
    ...base,
    schedules: [
      { ...base.schedules[0], time: '08:00' },
      { ...base.schedules[0], time: '20:00', quantityNumerator: 2, quantityDenominator: 1 },
    ],
  };
  const next = quickSchedule(mixed, ['08:00', '14:00', '20:00']);
  assert.equal(next.schedules.find((s) => s.time === '20:00')?.quantityNumerator, 2);
  assert.equal(next.schedules.find((s) => s.time === '08:00')?.quantityDenominator, 2);
  assert.equal(mixed.schedules.length, 2);
});
