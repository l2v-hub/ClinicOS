import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDraftTherapySelection } from '../therapy-selection.js';

const form = {
  farmacoNome: 'Synthetic insulin',
  dataInizio: '2030-03-01',
  viaSomministrazione: 'sottocute',
  tipo: 'periodica',
  stato: 'attiva',
  doseMode: 'glucose_scale',
  glucoseScale: [{ minMgDl: '200', maxMgDl: '300', units: '6' }],
  schedules: [
    { time: '08:00', quantityNumerator: 1, quantityDenominator: 1, administrationUnit: 'unità' },
  ],
};
const input = {
  ...form,
  doseMode: 'glucose_scale' as const,
  doseProtocol: { kind: 'blood_glucose', rules: [{ minMgDl: 200, maxMgDl: 300, units: 6 }] },
  intakeSource: { type: 'manual' as const, index: 0 },
};

test('scale confirmation remains tied to saved reviewed dose rules', () => {
  assert.doesNotThrow(() => validateDraftTherapySelection({ terapia: [form] }, [input]));
  assert.throws(
    () =>
      validateDraftTherapySelection({ terapia: [form] }, [
        {
          ...input,
          doseProtocol: {
            kind: 'blood_glucose',
            rules: [{ minMgDl: 200, maxMgDl: 300, units: 8 }],
          },
        },
      ]),
    /schema glicemico/,
  );
  assert.throws(
    () => validateDraftTherapySelection({ terapia: [form] }, [{ ...input, doseMode: 'fixed' }]),
    /modalità dose/,
  );
});

test('conditional mode does not bypass source conflicts or omitted therapy safeguards', () => {
  assert.throws(
    () => validateDraftTherapySelection({ terapia: [form] }, []),
    /manca dalla conferma/,
  );
  assert.throws(
    () =>
      validateDraftTherapySelection(
        { terapiaImport: [{ stato: 'ok', reviewedTherapy: form, sourceOutdated: true }] },
        [
          {
            ...input,
            intakeSource: { type: 'import', index: 0 },
          },
        ],
      ),
    /fonte della terapia/,
  );
});

test('blank saved dose must not become a zero-dose prescription by coercion', () => {
  const blank = { ...form, glucoseScale: [{ minMgDl: '200', maxMgDl: '300', units: '' }] };
  assert.throws(
    () =>
      validateDraftTherapySelection({ terapia: [blank] }, [
        {
          ...input,
          doseProtocol: {
            kind: 'blood_glucose',
            rules: [{ minMgDl: 200, maxMgDl: 300, units: 0 }],
          },
        },
      ]),
    /Unità non valide/,
  );
});

test('pump scale: unit and band extra doses are part of the reviewed prescription', () => {
  const pumpForm = {
    ...form,
    glucoseDoseUnit: 'ml/h',
    glucoseScale: [
      { minMgDl: '151', maxMgDl: '200', units: '2' },
      {
        minMgDl: '351',
        maxMgDl: '',
        units: '6',
        extraDoses: [{ amount: '6', unit: 'unità', route: '', label: 'bolo' }],
      },
    ],
  };
  const pumpInput = {
    ...input,
    doseProtocol: {
      kind: 'blood_glucose',
      doseUnit: 'ml/h',
      rules: [
        { minMgDl: 151, maxMgDl: 200, units: 2 },
        {
          minMgDl: 351,
          maxMgDl: null,
          units: 6,
          extraDoses: [{ amount: 6, unit: 'unità', label: 'bolo' }],
        },
      ],
    },
  };
  assert.doesNotThrow(() => validateDraftTherapySelection({ terapia: [pumpForm] }, [pumpInput]));
  // Stesse fasce in unità invece che ml/h: non è la prescrizione rivista.
  assert.throws(
    () =>
      validateDraftTherapySelection({ terapia: [pumpForm] }, [
        { ...pumpInput, doseProtocol: { ...pumpInput.doseProtocol, doseUnit: 'unità' } },
      ]),
    /schema glicemico/,
  );
  // Il bolo omesso alla conferma non passa.
  assert.throws(
    () =>
      validateDraftTherapySelection({ terapia: [pumpForm] }, [
        {
          ...pumpInput,
          doseProtocol: {
            ...pumpInput.doseProtocol,
            rules: pumpInput.doseProtocol.rules.map(({ minMgDl, maxMgDl, units }) => ({
              minMgDl,
              maxMgDl,
              units,
            })),
          },
        },
      ]),
    /schema glicemico/,
  );
});
