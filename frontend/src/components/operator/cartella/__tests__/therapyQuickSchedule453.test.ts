import test from 'node:test';
import assert from 'node:assert/strict';
import {
  quickSchedule,
  durationEnd,
  prescriptionSentence,
  nextPrescriptionOccurrence,
  QUICK_SCHEDULES,
  prescriptionAllergyAcknowledged,
  prescriptionAllergyScope,
  prescriptionAllergyWarning,
  type PrescriptionAllergyContext,
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

const documentedAllergies: PrescriptionAllergyContext = {
  phase: 'ready',
  snapshot: {
    status: 'presenti',
    items: [
      {
        allergene: 'Penicillina',
        gravita: 'grave',
        reazione: 'Anafilassi',
        documentato: '2026-10-17',
        documentatoDa: 'Medico QA',
        note: 'Dato registrato',
      },
    ],
  },
};

test('only an actual documented negative avoids acknowledgement; missing/error/loading never assert absence', () => {
  const contexts: PrescriptionAllergyContext[] = [
    { phase: 'loading' },
    { phase: 'error' },
    { phase: 'unavailable' },
    { phase: 'ready', snapshot: { items: [] } },
    { phase: 'ready', snapshot: { items: [], status: 'presenti' } },
    documentedAllergies,
    { phase: 'ready', snapshot: { ...documentedAllergies.snapshot, status: 'assenti' } },
  ];
  for (const context of contexts) {
    assert.equal(prescriptionAllergyWarning(context), true);
    assert.equal(prescriptionAllergyAcknowledged(context, 'scope', null), false);
  }
  for (const status of ['assenti', 'paziente_nega'] as const) {
    const context: PrescriptionAllergyContext = { phase: 'ready', snapshot: { items: [], status } };
    assert.equal(prescriptionAllergyWarning(context), false);
    assert.equal(prescriptionAllergyAcknowledged(context, 'scope', null), true);
  }
  assert.equal(prescriptionAllergyAcknowledged({ phase: 'loading' }, 'scope', 'scope'), false);
});

test('actual allergy warning may be confirmed without inventing a drug match and never changes prescription payload', () => {
  const before = formToPayload(base, 'QA1', 'QA');
  // The unrelated drug still needs compatibility verification; text matching cannot prove safety.
  const scope = prescriptionAllergyScope('QA1', 'doctor:QA', base, documentedAllergies);
  assert.equal(prescriptionAllergyAcknowledged(documentedAllergies, scope, null), false);
  assert.equal(prescriptionAllergyAcknowledged(documentedAllergies, scope, scope), true);
  assert.deepEqual(formToPayload(base, 'QA1', 'QA'), before);
});

test('acknowledgement cannot cross patient, operator, drug/package, strength, form or actual chart context', () => {
  const scope = prescriptionAllergyScope('QA1', 'doctor:QA', base, documentedAllergies);
  const otherScopes = [
    prescriptionAllergyScope('QA2', 'doctor:QA', base, documentedAllergies),
    prescriptionAllergyScope('QA1', 'doctor:OTHER', base, documentedAllergies),
    ...[
      { farmacoNome: 'Farmaco diverso' },
      { drugPackageRef: 'aic:123' },
      { drugPackageDetached: true },
      { commercialStrengthValue: '10' },
      { commercialStrengthUnit: 'ml' },
      { pharmaceuticalForm: 'soluzione' },
    ].map((change) =>
      prescriptionAllergyScope('QA1', 'doctor:QA', { ...base, ...change }, documentedAllergies),
    ),
    prescriptionAllergyScope('QA1', 'doctor:QA', base, {
      phase: 'ready',
      snapshot: {
        ...documentedAllergies.snapshot,
        items: [
          ...documentedAllergies.snapshot.items,
          { ...documentedAllergies.snapshot.items[0], allergene: 'Lattice' },
        ],
      },
    }),
    prescriptionAllergyScope('QA1', 'doctor:QA', base, {
      phase: 'ready',
      snapshot: {
        ...documentedAllergies.snapshot,
        items: [{ ...documentedAllergies.snapshot.items[0], reazione: 'Reazione aggiornata' }],
      },
    }),
    prescriptionAllergyScope('QA1', 'doctor:QA', base, { phase: 'error' }),
  ];
  for (const other of otherScopes) {
    assert.notEqual(other, scope);
    assert.equal(prescriptionAllergyAcknowledged(documentedAllergies, other, scope), false);
  }
});

test('unavailable context requires its own manual acknowledgement, which cannot authorize recovered clinical data', () => {
  const failed: PrescriptionAllergyContext = { phase: 'error' };
  const acknowledged = prescriptionAllergyScope('QA1', 'doctor:QA', base, failed);
  assert.equal(prescriptionAllergyAcknowledged(failed, acknowledged, acknowledged), true);
  const recovered = prescriptionAllergyScope('QA1', 'doctor:QA', base, documentedAllergies);
  assert.equal(
    prescriptionAllergyAcknowledged(documentedAllergies, recovered, acknowledged),
    false,
  );
});
