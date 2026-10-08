import test from 'node:test';
import assert from 'node:assert/strict';
import type { Prisma } from '@prisma/client';
import {
  parseTherapyAdministrationBody,
  resolveAuthoritativeTherapy,
  TherapyWriteInputError,
  TherapyNotFoundError,
} from '../therapy-write.js';

const actor = { id: 'synthetic-nurse', role: 'nurse', name: 'Synthetic Operator' };
const input = {
  patientId: 'synthetic-patient',
  therapyId: 'synthetic-therapy',
  date: '2030-03-01',
  fascia: 'mattina' as const,
};
const therapy = {
  farmacoNome: 'Synthetic insulin',
  dosaggio: 'Dose secondo schema glicemico',
  viaSomministrazione: 'sottocute',
  giorniSettimana: null,
  fasceMattina: true,
  doseMode: 'glucose_scale',
  doseProtocol: {
    kind: 'blood_glucose',
    rules: [
      { minMgDl: 200, maxMgDl: 300, units: 6 },
      { minMgDl: 350, maxMgDl: 450, units: 8 },
    ],
  },
  schedules: [
    {
      time: '08:00',
      fascia: 'mattina',
      quantityNumerator: 1,
      quantityDenominator: 1,
      administrationUnit: 'unità',
    },
  ],
};
const txFor = (value: unknown) =>
  ({ patientTherapy: { findFirst: async () => value } }) as unknown as Prisma.TransactionClient;

test('glucose reading boundary accepts numeric integers only, rejects dose spoof', () => {
  assert.equal(
    parseTherapyAdministrationBody({ ...input, measuredGlucose: 280 }, false).measuredGlucose,
    280,
  );
  for (const measuredGlucose of ['280', null, 9, 1001, 280.5, NaN]) {
    assert.throws(
      () => parseTherapyAdministrationBody({ ...input, measuredGlucose }, false),
      TherapyWriteInputError,
    );
  }
  assert.throws(
    () => parseTherapyAdministrationBody({ ...input, doseContext: { doseUnits: 12 } }, false),
    TherapyWriteInputError,
  );
});

test('conditional dose is resolved from saved protocol, never schedule placeholder', async () => {
  const resolved = await resolveAuthoritativeTherapy(
    txFor(therapy),
    { ...input, measuredGlucose: 280 },
    actor,
  );
  assert.equal(resolved.farmacoDose, '6 unità (glicemia 280 mg/dL)');
  assert.deepEqual(resolved.doseContext, { kind: 'blood_glucose', glucoseMgDl: 280, doseUnits: 6 });
  assert.equal(resolved.farmacoVia, 'sottocute');
});

test('missing reading and uncovered interval block administration without fallback dose', async () => {
  await assert.rejects(
    resolveAuthoritativeTherapy(txFor(therapy), input, actor),
    TherapyWriteInputError,
  );
  await assert.rejects(
    resolveAuthoritativeTherapy(txFor(therapy), { ...input, measuredGlucose: 325 }, actor),
    (error: unknown) => error instanceof TherapyWriteInputError && error.status === 409,
  );
  await assert.rejects(
    resolveAuthoritativeTherapy(
      txFor({ ...therapy, doseProtocol: {} }),
      { ...input, measuredGlucose: 280 },
      actor,
    ),
    TherapyWriteInputError,
  );
});

test('not-administered records do not require glucose but still require scoped therapy', async () => {
  const resolved = await resolveAuthoritativeTherapy(txFor(therapy), input, actor, {
    requireDoseMeasurement: false,
  });
  assert.equal(resolved.doseContext, undefined);
  assert.equal(resolved.farmacoDose, 'Dose non determinata (schema glicemico)');
  await assert.rejects(
    resolveAuthoritativeTherapy(txFor(null), input, actor, { requireDoseMeasurement: false }),
    TherapyNotFoundError,
  );
});

test('fixed therapies retain exact fraction label without glucose', async () => {
  const resolved = await resolveAuthoritativeTherapy(
    txFor({ ...therapy, doseMode: 'fixed', doseProtocol: null }),
    input,
    actor,
  );
  assert.equal(resolved.farmacoDose, '1 unità');
  assert.equal(resolved.doseContext, undefined);
});
