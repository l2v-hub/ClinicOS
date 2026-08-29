import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import { prisma } from '../../lib/prisma.js';
import patientDiaryRouter from '../patient-diary.js';

const suffix = `diary-scope-${Date.now()}`;
let server: Server;
let base = '';
let operatorAId = '';
let operatorBId = '';
let managerId = '';
let patientAId = '';
let patientBId = '';
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
        fullName: 'Alice Autorevole',
        operator: { create: { ruolo: 'infermiere' } },
      },
      include: { operator: true },
    }),
    prisma.user.create({
      data: {
        email: `${suffix}-b@example.test`,
        passwordHash: 'test-only',
        fullName: 'Bruno Operatore',
        operator: { create: { ruolo: 'medico' } },
      },
      include: { operator: true },
    }),
    prisma.user.create({
      data: {
        email: `${suffix}-manager@example.test`,
        passwordHash: 'test-only',
        fullName: 'Marta Manager',
        role: 'MANAGER',
        operator: { create: { ruolo: 'operatore' } },
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
  await prisma.patientDiaryEntry.createMany({
    data: [1, 2, 3].map((number) => ({
      id: `${suffix}-entry-00${number}`,
      patientId: patientAId,
      authorType: 'infermiere',
      authorName: 'Alice Autorevole',
      content: `Voce ${number}`,
      entryDateTime: '2026-08-29T10:00',
    })),
  });

  const app = express();
  app.use(express.json());
  app.use('/patients', patientDiaryRouter);
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

test('ordinary operator cannot read or write another operator patient diary', async () => {
  const read = await fetch(`${base}/patients/${patientBId}/diary`, {
    headers: headers(operatorAId),
  });
  assert.equal(read.status, 404);
  assert.match(read.headers.get('cache-control') ?? '', /private, no-store/);

  const write = await fetch(`${base}/patients/${patientBId}/diary`, {
    method: 'POST',
    headers: { ...headers(operatorAId), 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Intrusione', entryDateTime: '2026-08-29T11:00' }),
  });
  assert.equal(write.status, 404);
  assert.equal(await prisma.patientDiaryEntry.count({ where: { patientId: patientBId } }), 0);
});

test('manager sees an existing patient while missing and unauthorized patients share 404', async () => {
  const managerRead = await fetch(`${base}/patients/${patientBId}/diary`, {
    headers: headers(managerId, 'manager'),
  });
  assert.equal(managerRead.status, 200, await managerRead.text());
  const missing = await fetch(`${base}/patients/missing-${suffix}/diary`, {
    headers: headers(managerId, 'manager'),
  });
  assert.equal(missing.status, 404);
});

test('diary keyset pages are bounded, stable and exact at the final page', async () => {
  const first = await fetch(`${base}/patients/${patientAId}/diary?limit=2`, {
    headers: headers(operatorAId),
  });
  assert.equal(first.status, 200, await first.text());
  const firstPage = (await first.json()) as {
    entries: Array<{ id: string }>;
    hasMore: boolean;
    nextCursor: string;
  };
  assert.deepEqual(
    firstPage.entries.map((entry) => entry.id),
    [`${suffix}-entry-003`, `${suffix}-entry-002`],
  );
  assert.equal(firstPage.hasMore, true);

  const second = await fetch(
    `${base}/patients/${patientAId}/diary?limit=2&cursor=${encodeURIComponent(firstPage.nextCursor)}`,
    { headers: headers(operatorAId) },
  );
  assert.equal(second.status, 200, await second.text());
  const secondPage = (await second.json()) as {
    entries: Array<{ id: string }>;
    hasMore: boolean;
    nextCursor: null;
  };
  assert.deepEqual(
    secondPage.entries.map((entry) => entry.id),
    [`${suffix}-entry-001`],
  );
  assert.equal(secondPage.hasMore, false);
  assert.equal(secondPage.nextCursor, null);
});

test('diary create and update ignore spoofed authorship', async () => {
  const createdResponse = await fetch(`${base}/patients/${patientAId}/diary`, {
    method: 'POST',
    headers: { ...headers(operatorAId), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      authorType: 'medico',
      authorName: 'Autore Falso',
      content: 'Voce verificata',
      entryDateTime: '2026-08-29T12:00',
    }),
  });
  assert.equal(createdResponse.status, 201, await createdResponse.text());
  const created = (await createdResponse.json()) as {
    entry: { id: string; authorType: string; authorName: string };
  };
  assert.equal(created.entry.authorType, 'infermiere');
  assert.equal(created.entry.authorName, 'Alice Autorevole');

  const updatedResponse = await fetch(`${base}/patients/${patientAId}/diary/${created.entry.id}`, {
    method: 'PUT',
    headers: { ...headers(operatorAId), 'Content-Type': 'application/json' },
    body: JSON.stringify({ authorType: 'medico', authorName: 'Autore Falso', content: 'Modifica' }),
  });
  assert.equal(updatedResponse.status, 200, await updatedResponse.text());
  const updated = (await updatedResponse.json()) as {
    entry: { authorType: string; authorName: string };
  };
  assert.equal(updated.entry.authorType, 'infermiere');
  assert.equal(updated.entry.authorName, 'Alice Autorevole');
});
