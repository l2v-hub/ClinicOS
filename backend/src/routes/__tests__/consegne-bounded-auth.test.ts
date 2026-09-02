import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import express from 'express';
import type { Server } from 'node:http';
import { prisma } from '../../lib/prisma.js';
import consegneRouter from '../consegne.js';

let server: Server;
let base = '';
const run = `${Date.now()}${Math.random().toString(36).slice(2)}`;
const actorA = `op-a-${run}`;
const actorB = `op-b-${run}`;
const patientId = `patient-${run}`;
const foreignPatientId = `patient-foreign-${run}`;
const foreignId = `handover-foreign-${run}`;
const legacyId = `handover-legacy-${run}`;
const headers = (id: string, role = 'operatore') => ({
  'X-Operator-Id': id,
  'X-Operator-Role': role,
});

before(async () => {
  await prisma.user.createMany({
    data: [
      {
        id: `user-a-${run}`,
        email: `a-${run}@example.test`,
        passwordHash: 'test-only',
        fullName: 'Ada Autrice',
      },
      {
        id: `user-b-${run}`,
        email: `b-${run}@example.test`,
        passwordHash: 'test-only',
        fullName: 'Bruno Assegnato',
      },
    ],
  });
  await prisma.operator.createMany({
    data: [
      { id: actorA, userId: `user-a-${run}` },
      { id: actorB, userId: `user-b-${run}` },
    ],
  });
  await prisma.patient.createMany({
    data: [
      {
        id: patientId,
        medicalRecordNumber: `MRN-${run}`,
        firstName: 'Carla',
        lastName: 'Rossi',
        dateOfBirth: new Date('1980-01-01T00:00:00.000Z'),
        registeredById: actorA,
      },
      {
        id: foreignPatientId,
        medicalRecordNumber: `MRN-FOREIGN-${run}`,
        firstName: 'Fiorella',
        lastName: 'Segreta',
        dateOfBirth: new Date('1985-02-02T00:00:00.000Z'),
        registeredById: actorB,
      },
    ],
  });
  await prisma.consegna.createMany({
    data: [
      {
        id: foreignId,
        pazienteId: patientId,
        pazienteNome: 'Rossi, Carla',
        note: 'segreto esterno',
        scadenza: '2026-08-29',
        operatoreAssegnato: 'Bruno Assegnato',
        operatoreAssegnatoId: actorB,
        creatoDA: 'Bruno Assegnato',
        creatoDaId: actorB,
      },
      {
        id: legacyId,
        pazienteId: patientId,
        pazienteNome: 'Rossi, Carla',
        note: 'record legacy',
        scadenza: '2026-08-29',
        operatoreAssegnato: 'Ada Autrice',
        creatoDA: 'Ada Autrice',
      },
      ...Array.from({ length: 55 }, (_, index) => ({
        id: `handover-page-${String(index).padStart(2, '0')}-${run}`,
        pazienteId: patientId,
        pazienteNome: 'Rossi, Carla',
        note:
          index >= 35
            ? `pressione pagination ${index} `.padEnd(4_000, 'x')
            : `pressione pagination ${index}`,
        scadenza: '2026-08-29',
        operatoreAssegnato: '',
        creatoDA: 'Ada Autrice',
        creatoDaId: actorA,
        createdAt: new Date(Date.now() + index * 1_000),
      })),
    ],
  });

  const app = express();
  app.use(express.json());
  app.use('/consegne', consegneRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
      resolve();
    });
  });
});

after(async () => {
  await prisma.consegna.deleteMany({
    where: { pazienteId: { in: [patientId, foreignPatientId] } },
  });
  await prisma.patient.deleteMany({ where: { id: { in: [patientId, foreignPatientId] } } });
  await prisma.operator.deleteMany({ where: { id: { in: [actorA, actorB] } } });
  await prisma.user.deleteMany({ where: { id: { in: [`user-a-${run}`, `user-b-${run}`] } } });
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('consegne feed is private, bounded, keyset paged and scoped before limit', async () => {
  const unauthenticated = await fetch(`${base}/consegne`);
  assert.equal(unauthenticated.status, 401);
  assert.match(unauthenticated.headers.get('cache-control') ?? '', /private, no-store/);

  const firstResponse = await fetch(`${base}/consegne?limit=20`, { headers: headers(actorA) });
  assert.equal(firstResponse.status, 200);
  assert.match(firstResponse.headers.get('cache-control') ?? '', /private, no-store/);
  const firstPayload = await firstResponse.text();
  assert.ok(Buffer.byteLength(firstPayload, 'utf8') < 100_000);
  const first = JSON.parse(firstPayload) as {
    items: Array<{ id: string }>;
    pageInfo: { hasMore: boolean; nextCursor: string | null };
    summary: { total: number; open: number };
  };
  assert.equal(first.items.length, 20);
  assert.equal(first.pageInfo.hasMore, true);
  assert.equal(first.summary.total, 55);
  assert.ok(first.items.every((row) => row.id !== foreignId && row.id !== legacyId));

  const actorOverview = (await fetch(`${base}/consegne/overview`, {
    headers: headers(actorA),
  }).then((response) => response.json())) as {
    scope: string;
    summary: { total: number; open: number };
    urgentPreview: unknown[];
    openPreview: unknown[];
  };
  assert.equal(actorOverview.scope, 'operator');
  assert.equal(actorOverview.summary.total, 55);
  assert.equal(actorOverview.summary.open, 55);
  assert.ok(actorOverview.openPreview.length <= 5);

  const second = (await fetch(
    `${base}/consegne?limit=20&cursor=${encodeURIComponent(first.pageInfo.nextCursor!)}`,
    { headers: headers(actorA) },
  ).then((response) => response.json())) as { items: Array<{ id: string }> };
  assert.equal(second.items.length, 20);
  assert.equal(new Set([...first.items, ...second.items].map((row) => row.id)).size, 40);

  const search = await fetch(`${base}/consegne?q=pressione%2054`, {
    headers: headers(actorA),
  });
  assert.equal(search.status, 200);
  const searchPage = (await search.json()) as { items: Array<{ id: string }> };
  assert.deepEqual(
    searchPage.items.map((row) => row.id),
    [`handover-page-54-${run}`],
  );

  const adminPage = (await fetch(`${base}/consegne?q=legacy`, {
    headers: headers('admin-test', 'admin'),
  }).then((response) => response.json())) as { items: Array<{ id: string }> };
  assert.deepEqual(
    adminPage.items.map((row) => row.id),
    [legacyId],
  );
  const adminOverview = (await fetch(`${base}/consegne/overview`, {
    headers: headers('admin-test', 'admin'),
  }).then((response) => response.json())) as {
    scope: string;
    summary: { total: number };
    byOperator: Record<string, number>;
  };
  assert.equal(adminOverview.scope, 'facility');
  assert.equal(adminOverview.summary.total, 57);
  assert.equal(adminOverview.byOperator[actorB], 1);
});

test('consegne writes derive identities and reject IDOR or spoofed fields', async () => {
  const spoofed = await fetch(`${base}/consegne`, {
    method: 'POST',
    headers: { ...headers(actorA), 'Content-Type': 'application/json' },
    body: JSON.stringify({ pazienteId: patientId, note: 'test', creatoDA: 'Mallory' }),
  });
  assert.equal(spoofed.status, 400);

  const createdResponse = await fetch(`${base}/consegne`, {
    method: 'POST',
    headers: { ...headers(actorA), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pazienteId: patientId,
      note: 'Controllare saturazione',
      scadenza: '2026-08-29',
      operatoreAssegnatoId: actorB,
    }),
  });
  assert.equal(createdResponse.status, 201);
  const created = (await createdResponse.json()) as {
    id: string;
    pazienteNome: string;
    creatoDaId: string;
    creatoDA: string;
    operatoreAssegnatoId: string;
    operatoreAssegnato: string;
  };
  assert.equal(created.pazienteNome, 'Rossi, Carla');
  assert.equal(created.creatoDaId, actorA);
  assert.equal(created.creatoDA, 'Ada Autrice');
  assert.equal(created.operatoreAssegnatoId, actorB);
  assert.equal(created.operatoreAssegnato, 'Bruno Assegnato');

  const foreignAttempt = await fetch(`${base}/consegne`, {
    method: 'POST',
    headers: { ...headers(actorA), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pazienteId: foreignPatientId,
      note: 'Tentativo fuori perimetro',
      scadenza: '2026-08-29',
    }),
  });
  const missingAttempt = await fetch(`${base}/consegne`, {
    method: 'POST',
    headers: { ...headers(actorA), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pazienteId: `missing-${run}`,
      note: 'Tentativo inesistente',
      scadenza: '2026-08-29',
    }),
  });
  assert.equal(foreignAttempt.status, 404);
  assert.equal(missingAttempt.status, 404);
  assert.deepEqual(await foreignAttempt.json(), await missingAttempt.json());
  assert.equal(
    await prisma.consegna.count({
      where: { pazienteId: foreignPatientId, creatoDaId: actorA },
    }),
    0,
  );

  const managerCreate = await fetch(`${base}/consegne`, {
    method: 'POST',
    headers: { ...headers('manager-test', 'manager'), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pazienteId: foreignPatientId,
      note: 'Consegna autorizzata dal manager',
      scadenza: '2026-08-29',
    }),
  });
  assert.equal(managerCreate.status, 201);

  const assignedStatus = await fetch(`${base}/consegne/${created.id}`, {
    method: 'PUT',
    headers: { ...headers(actorB), 'Content-Type': 'application/json' },
    body: JSON.stringify({ stato: 'in_corso' }),
  });
  assert.equal(assignedStatus.status, 200);
  const assignedContent = await fetch(`${base}/consegne/${created.id}`, {
    method: 'PUT',
    headers: { ...headers(actorB), 'Content-Type': 'application/json' },
    body: JSON.stringify({ note: 'manomessa' }),
  });
  assert.equal(assignedContent.status, 404);
  const foreignDelete = await fetch(`${base}/consegne/${foreignId}`, {
    method: 'DELETE',
    headers: headers(actorA),
  });
  assert.equal(foreignDelete.status, 404);
  const authorDelete = await fetch(`${base}/consegne/${created.id}`, {
    method: 'DELETE',
    headers: headers(actorA),
  });
  assert.equal(authorDelete.status, 204);
});

test('consegne rejects malformed bounds and cursor/filter mismatch', async () => {
  for (const query of ['?limit=21', '?limit=10foo', '?status=open', '?q=---', '?offset=0']) {
    const response = await fetch(`${base}/consegne${query}`, { headers: headers(actorA) });
    assert.equal(response.status, 400, query);
  }
  const first = (await fetch(`${base}/consegne?status=aperta&limit=1`, {
    headers: headers(actorA),
  }).then((response) => response.json())) as { pageInfo: { nextCursor: string } };
  const mismatched = await fetch(
    `${base}/consegne?status=completata&limit=1&cursor=${encodeURIComponent(first.pageInfo.nextCursor)}`,
    { headers: headers(actorA) },
  );
  assert.equal(mismatched.status, 400);
});
