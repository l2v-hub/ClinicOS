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
