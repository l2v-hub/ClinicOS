import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confirmPayloadFromDraft } from '../confirm-payload.js';

const actor = {
  id: 'operator-test',
  name: 'Operatore Test',
  role: 'operatore',
};

test('la conferma usa anagrafica e terapie della bozza, ignorando contenuto clinico alternativo', () => {
  const result = confirmPayloadFromDraft(
    {
      anagrafica: {
        firstName: 'Nome bozza',
        lastName: 'Cognome bozza',
        dateOfBirth: '1970-01-01',
      },
      terapia: [
        {
          farmacoNome: 'Insulina test',
          dataInizio: '2033-01-01',
          tipo: 'periodica',
          stato: 'attiva',
          viaSomministrazione: 'SC',
          allowedFractions: ['1'],
          schedules: [
            {
              time: '08:00',
              quantityNumerator: 1,
              quantityDenominator: 1,
              administrationUnit: 'unità',
            },
          ],
          doseMode: 'glucose_scale',
          glucoseScale: [
            { minMgDl: '200', maxMgDl: '250', units: '4' },
            { minMgDl: '251', maxMgDl: '300', units: '6' },
          ],
        },
      ],
    },
    {
      patient: { firstName: 'Dato non accettato' },
      therapies: [{ farmacoNome: 'Terapia non accettata' }],
      confirmDuplicate: true,
    },
    actor,
  );

  assert.equal(result.patient.firstName, 'Nome bozza');
  assert.equal(result.confirmDuplicate, true);
  assert.equal(result.therapies?.[0]?.farmacoNome, 'Insulina test');
  assert.deepEqual(result.therapies?.[0]?.doseProtocol, {
    kind: 'blood_glucose',
    measurementUnit: 'mg/dL',
    doseUnit: 'unità',
    rules: [
      { minMgDl: 200, maxMgDl: 250, units: 4 },
      { minMgDl: 251, maxMgDl: 300, units: 6 },
    ],
  });
});

test('la terapia importata conserva schema, orari e giorni revisionati', () => {
  const result = confirmPayloadFromDraft(
    {
      anagrafica: { firstName: 'Test', lastName: 'Import', dateOfBirth: '1970-01-01' },
      terapiaImport: [
        {
          farmacoNome: 'Insulina importata',
          dataInizio: '2033-01-01',
          viaSomministrazione: 'SC',
          forma: 'fiala',
          orari: ['08:00', '12:00', '18:00'],
          giorni: ['Lun', 'Mer', 'Ven'],
          doseMode: 'glucose_scale',
          glucoseScale: [{ minMgDl: 200, maxMgDl: 300, units: 6 }],
          stato: 'ok',
          originalText: 'Fonte dimissione revisionata',
        },
      ],
    },
    {},
    actor,
  );

  const therapy = result.therapies?.[0];
  assert.equal(therapy?.giorniSettimana, '1,3,5');
  assert.deepEqual(
    (therapy?.schedules as Array<{ time: string }>).map((schedule) => schedule.time),
    ['08:00', '12:00', '18:00'],
  );
  assert.equal(therapy?.doseMode, 'glucose_scale');
});
