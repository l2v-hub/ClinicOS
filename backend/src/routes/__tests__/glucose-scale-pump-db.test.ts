// Schema insulinico in pompa (ml/h) con bolo nella fascia più alta: creato via HTTP, riletto dal
// DB, protetto dalle sovrapposizioni e somministrato con la dose risolta dal server.
process.env.RESIDENT_SCOPE_CONFIG ??= JSON.stringify({ fallback: 'registered_by_me' });
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import { prisma } from '../../lib/prisma.js';
import patientTherapiesRouter from '../patient-therapies.js';
import therapyRouter from '../therapy.js';

let server: Server;
let base = '';
let patientId = '';
let ownerUserId = '';
const operatorId = `pump-op-${Date.now()}`;
const headers = {
  'Content-Type': 'application/json',
  'X-Operator-Id': operatorId,
  'X-Operator-Role': 'operatore',
};
const pumpProtocol = {
  kind: 'blood_glucose',
  doseUnit: 'ml/h',
  rules: [
    { minMgDl: 140, maxMgDl: 150, units: 1 },
    { minMgDl: 151, maxMgDl: 200, units: 2 },
    {
      minMgDl: 351,
      maxMgDl: null,
      units: 6,
      extraDoses: [{ amount: 6, unit: 'unità', label: 'bolo' }],
    },
  ],
};

before(async () => {
  const user = await prisma.user.create({
    data: {
      email: `pump-owner-${Date.now()}@example.test`,
      passwordHash: 'not-used-by-route-test',
      fullName: 'Pump Owner',
      operator: { create: { id: operatorId, ruolo: 'operatore' } },
    },
  });
  ownerUserId = user.id;
  const patient = await prisma.patient.create({
    data: {
      medicalRecordNumber: `MRN-PUMP-${Date.now()}`,
      firstName: 'Sintetico',
      lastName: 'Pompa',
      dateOfBirth: new Date('1950-01-01'),
      sex: 'M',
      registeredById: operatorId,
    },
  });
  patientId = patient.id;
  const app = express();
  app.use(express.json());
  app.use('/patients', patientTherapiesRouter);
  app.use('/therapy-slots', therapyRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.patient.delete({ where: { id: patientId } }).catch(() => {});
  await prisma.user.delete({ where: { id: ownerUserId } }).catch(() => {});
});

test('AC4: schema in pompa creato, riletto, protetto dalle sovrapposizioni e somministrato', async () => {
  const created = await fetch(`${base}/patients/${patientId}/therapies`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      farmacoNome: 'Insulina rapida',
      viaSomministrazione: 'EV',
      tipo: 'periodica',
      stato: 'attiva',
      dataInizio: '2033-04-01',
      doseMode: 'glucose_scale',
      doseProtocol: pumpProtocol,
      schedules: [{ time: '12:00', quantityNumerator: 1, quantityDenominator: 1 }],
    }),
  });
  assert.equal(created.status, 201, await created.clone().text());
  const therapyId = ((await created.json()) as { id: string }).id;

  // Persistenza: il protocollo riletto dal DB è quello inviato, con unità e bolo.
  const saved = await prisma.patientTherapy.findUniqueOrThrow({ where: { id: therapyId } });
  assert.deepEqual(saved.doseProtocol, { ...pumpProtocol, measurementUnit: 'mg/dL' });

  // Due dosi per la stessa glicemia: rifiutato, nulla cambia.
  const overlap = await fetch(`${base}/patients/${patientId}/therapies/${therapyId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      doseMode: 'glucose_scale',
      doseProtocol: {
        ...pumpProtocol,
        rules: [
          { minMgDl: 140, maxMgDl: 200, units: 1 },
          { minMgDl: 200, maxMgDl: 250, units: 2 },
        ],
      },
    }),
  });
  assert.equal(overlap.status, 400, await overlap.text());
  const unchanged = await prisma.patientTherapy.findUniqueOrThrow({ where: { id: therapyId } });
  assert.deepEqual(unchanged.doseProtocol, saved.doseProtocol);

  const confirm = (date: string, measuredGlucose: number) =>
    fetch(`${base}/therapy-slots/confirm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ patientId, therapyId, fascia: 'pranzo', date, measuredGlucose }),
    });
  const high = await confirm('2033-04-05', 420);
  assert.equal(high.status, 200, await high.text());
  const record = await prisma.medicationAdministration.findFirstOrThrow({
    where: { therapyId, date: '2033-04-05' },
  });
  assert.equal(record.farmacoDose, '6 ml/h + 6 unità (bolo) (glicemia 420 mg/dL)');
  assert.deepEqual(record.doseContext, {
    kind: 'blood_glucose',
    glucoseMgDl: 420,
    doseUnits: 6,
    doseUnit: 'ml/h',
    extraDoses: [{ amount: 6, unit: 'unità', label: 'bolo' }],
  });

  // 201-350 non è prescritto: nessuna dose inventata.
  const gap = await confirm('2033-04-06', 260);
  assert.equal(gap.status, 409, await gap.text());
});
