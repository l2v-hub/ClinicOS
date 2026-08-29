import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { after, before, test } from 'node:test';
import express from 'express';
import { prisma } from '../../lib/prisma.js';
import actionsRouter from '../ai-actions.js';
import voiceRouter from '../ai-voice.js';
import narrativeRouter from '../narrative-sections.js';
import therapyRouter from '../patient-therapies.js';

const suffix = `clinical-scope-${Date.now()}`;
let server: Server;
let base = '';
let operatorAId = '';
let operatorBId = '';
let managerId = '';
let patientAId = '';
let patientBId = '';
let therapyBId = '';
const originalAuthMode = process.env.AUTH_MODE;
const originalNodeEnv = process.env.NODE_ENV;

function headers(operatorId: string, role = 'operatore'): Record<string, string> {
  return { 'X-Operator-Id': operatorId, 'X-Operator-Role': role };
}

before(async () => {
  process.env.AUTH_MODE = 'demo';
  process.env.NODE_ENV = 'test';
  const [operatorA, operatorB, manager] = await Promise.all([
    prisma.user.create({
      data: {
        email: `${suffix}-a@example.test`,
        passwordHash: 'test-only',
        fullName: 'Alice Scope',
        operator: { create: { ruolo: 'infermiere' } },
      },
      include: { operator: true },
    }),
    prisma.user.create({
      data: {
        email: `${suffix}-b@example.test`,
        passwordHash: 'test-only',
        fullName: 'Bruno Scope',
        operator: { create: { ruolo: 'medico' } },
      },
      include: { operator: true },
    }),
    prisma.user.create({
      data: {
        email: `${suffix}-manager@example.test`,
        passwordHash: 'test-only',
        fullName: 'Marta Scope',
        role: 'MANAGER',
        operator: { create: { ruolo: 'manager' } },
      },
      include: { operator: true },
    }),
  ]);
  operatorAId = operatorA.operator!.id;
  operatorBId = operatorB.operator!.id;
  managerId = manager.operator!.id;

  const [patientA, patientB] = await Promise.all([
    prisma.patient.create({
      data: {
        medicalRecordNumber: `${suffix}-mrn-a`,
        firstName: 'Paziente',
        lastName: 'A',
        dateOfBirth: new Date('1970-01-01'),
        registeredById: operatorAId,
      },
    }),
    prisma.patient.create({
      data: {
        medicalRecordNumber: `${suffix}-mrn-b`,
        firstName: 'Paziente',
        lastName: 'B',
        dateOfBirth: new Date('1970-01-01'),
        registeredById: operatorBId,
      },
    }),
  ]);
  patientAId = patientA.id;
  patientBId = patientB.id;
  const therapyB = await prisma.patientTherapy.create({
    data: {
      patientId: patientBId,
      farmacoNome: 'Terapia B',
      dosaggio: '10 mg',
      dataInizio: '2026-08-29',
    },
  });
  therapyBId = therapyB.id;

  const app = express();
  app.use(express.json());
  app.use('/patients', therapyRouter);
  app.use('/patients', narrativeRouter);
  app.use('/ai/actions', actionsRouter);
  app.use('/ai/voice', voiceRouter);
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
  await prisma.patient.deleteMany({ where: { id: { in: [patientAId, patientBId] } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: suffix } } });
  if (originalAuthMode === undefined) delete process.env.AUTH_MODE;
  else process.env.AUTH_MODE = originalAuthMode;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
});

test('ordinary operator cannot access another patient clinical resources', async () => {
  const attempts: Array<[string, RequestInit]> = [
    [`/${patientBId}/therapies`, {}],
    [`/${patientBId}/therapies`, { method: 'POST', body: JSON.stringify({}) }],
    [`/${patientBId}/therapies/${therapyBId}`, { method: 'PUT', body: JSON.stringify({}) }],
    [`/${patientBId}/therapies/${therapyBId}`, { method: 'DELETE' }],
    [`/${patientBId}/medication-administrations`, {}],
    [`/${patientBId}/narrative-sections`, {}],
    [`/${patientBId}/narrative-sections/ALLERGIES`, {}],
    [
      `/${patientBId}/narrative-sections/ALLERGIES`,
      { method: 'PUT', body: JSON.stringify({ reviewedText: 'Intrusione' }) },
    ],
    [
      `/${patientBId}/narrative-sections/ALLERGIES`,
      { method: 'PATCH', body: JSON.stringify({ reviewedText: 'Intrusione' }) },
    ],
  ];
  for (const [path, init] of attempts) {
    const response = await fetch(`${base}/patients${path}`, {
      ...init,
      headers: { ...headers(operatorAId), 'Content-Type': 'application/json' },
    });
    assert.equal(response.status, 404, `${init.method ?? 'GET'} ${path}`);
    assert.match(response.headers.get('cache-control') ?? '', /private, no-store/);
  }
  assert.equal(await prisma.patientNarrativeSection.count({ where: { patientId: patientBId } }), 0);
  assert.notEqual(await prisma.patientTherapy.findUnique({ where: { id: therapyBId } }), null);
});

test('own patient access works and client authorship is ignored', async () => {
  const create = await fetch(`${base}/patients/${patientAId}/therapies`, {
    method: 'POST',
    headers: { ...headers(operatorAId), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      farmacoNome: 'Terapia A',
      dosaggio: '5 mg',
      dataInizio: '2026-08-29',
      operatoreInseritore: 'Autore contraffatto',
    }),
  });
  assert.equal(create.status, 201, await create.text());
  const createdTherapy = (await create.json()) as { id: string; operatoreInseritore: string };
  assert.equal(createdTherapy.operatoreInseritore, operatorAId);

  const saveNarrative = await fetch(`${base}/patients/${patientAId}/narrative-sections/ALLERGIES`, {
    method: 'PUT',
    headers: { ...headers(operatorAId), 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviewedText: 'Nessuna', updatedBy: 'Autore contraffatto' }),
  });
  assert.equal(saveNarrative.status, 200, await saveNarrative.text());
  const stored = await prisma.patientNarrativeSection.findUniqueOrThrow({
    where: { patientId_sectionKey: { patientId: patientAId, sectionKey: 'ALLERGIES' } },
  });
  assert.equal(stored.updatedBy, operatorAId);
});

test('manager retains global access while missing and unauthorized patients share 404', async () => {
  const managerRead = await fetch(`${base}/patients/${patientBId}/therapies`, {
    headers: headers(managerId, 'manager'),
  });
  assert.equal(managerRead.status, 200, await managerRead.text());

  const unauthorized = await fetch(`${base}/patients/${patientBId}/therapies`, {
    headers: headers(operatorAId),
  });
  const missing = await fetch(`${base}/patients/missing-${suffix}/therapies`, {
    headers: headers(operatorAId),
  });
  assert.equal(unauthorized.status, 404);
  assert.equal(missing.status, 404);
  assert.deepEqual(await unauthorized.json(), await missing.json());
});

test('text and voice assistant deny foreign-patient preview and execution', async () => {
  const planPayload = {
    text: 'registra pressione 130 su 80 alle 9',
    transcript: 'registra pressione 130 su 80 alle 9',
    currentPatientId: patientBId,
  };
  const textPlan = await fetch(`${base}/ai/actions/plan`, {
    method: 'POST',
    headers: { ...headers(operatorAId), 'Content-Type': 'application/json' },
    body: JSON.stringify(planPayload),
  });
  assert.equal(textPlan.status, 403, await textPlan.text());

  const voicePlan = await fetch(`${base}/ai/voice/plan`, {
    method: 'POST',
    headers: { ...headers(operatorAId), 'Content-Type': 'application/json' },
    body: JSON.stringify(planPayload),
  });
  assert.equal(voicePlan.status, 403, await voicePlan.text());

  const execute = await fetch(`${base}/ai/actions/execute`, {
    method: 'POST',
    headers: { ...headers(operatorAId), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'aggiungi una nota al diario con tentativo fuori scope',
      patientId: patientBId,
      idempotencyKey: `${suffix}-foreign`,
      confirmed: true,
    }),
  });
  assert.equal(execute.status, 403, await execute.text());
  assert.equal(await prisma.patientDiaryEntry.count({ where: { patientId: patientBId } }), 0);

  const unverifiedManagerPlan = await fetch(`${base}/ai/actions/plan`, {
    method: 'POST',
    headers: { ...headers(managerId, 'manager'), 'Content-Type': 'application/json' },
    body: JSON.stringify(planPayload),
  });
  assert.equal(unverifiedManagerPlan.status, 403, await unverifiedManagerPlan.text());
});
