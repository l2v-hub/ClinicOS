import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import express from 'express';
import type { Server } from 'node:http';
import { prisma } from '../../lib/prisma.js';
import noteRouter from '../note.js';

let server: Server;
let base = '';
const run = `${Date.now()}${Math.random().toString(36).slice(2)}`;
const actorA = `note-scope-a-${run}`;
const actorB = `note-scope-b-${run}`;
const ownPatientId = `note-patient-a-${run}`;
const foreignPatientId = `note-patient-b-${run}`;
const marker = `note-scope-${run}`;
const headers = (id: string, role = 'operatore') => ({
  'X-Operator-Id': id,
  'X-Operator-Role': role,
  'Content-Type': 'application/json',
});

before(async () => {
  await prisma.user.createMany({
    data: [
      {
        id: `note-user-a-${run}`,
        email: `note-a-${run}@example.test`,
        passwordHash: 'test-only',
        fullName: 'Ada Note',
      },
      {
        id: `note-user-b-${run}`,
        email: `note-b-${run}@example.test`,
        passwordHash: 'test-only',
        fullName: 'Bruno Note',
      },
    ],
  });
  await prisma.operator.createMany({
    data: [
      { id: actorA, userId: `note-user-a-${run}` },
      { id: actorB, userId: `note-user-b-${run}` },
    ],
  });
  await prisma.patient.createMany({
    data: [
      {
        id: ownPatientId,
        medicalRecordNumber: `NOTE-MRN-A-${run}`,
        firstName: 'Carla',
        lastName: 'Rossi',
        dateOfBirth: new Date('1980-01-01T00:00:00.000Z'),
        registeredById: actorA,
      },
      {
        id: foreignPatientId,
        medicalRecordNumber: `NOTE-MRN-B-${run}`,
        firstName: 'Fiorella',
        lastName: 'Segreta',
        dateOfBirth: new Date('1985-02-02T00:00:00.000Z'),
        registeredById: actorB,
      },
    ],
  });

  const app = express();
  app.use(express.json());
  app.use('/notes', noteRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
      resolve();
    });
  });
});

after(async () => {
  await prisma.nota.deleteMany({ where: { messaggio: { startsWith: marker } } });
  await prisma.patient.deleteMany({ where: { id: { in: [ownPatientId, foreignPatientId] } } });
  await prisma.operator.deleteMany({ where: { id: { in: [actorA, actorB] } } });
  await prisma.user.deleteMany({
    where: { id: { in: [`note-user-a-${run}`, `note-user-b-${run}`] } },
  });
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('note creation requires an explicit recipient and scopes linked patients', async () => {
  const missingRecipient = await fetch(`${base}/notes`, {
    method: 'POST',
    headers: headers(actorA),
    body: JSON.stringify({ messaggio: `${marker}-missing-recipient` }),
  });
  assert.equal(missingRecipient.status, 400);

  const ownResponse = await fetch(`${base}/notes`, {
    method: 'POST',
    headers: headers(actorA),
    body: JSON.stringify({
      destinatarioId: actorB,
      pazienteId: ownPatientId,
      messaggio: `${marker}-own`,
    }),
  });
  assert.equal(ownResponse.status, 201);
  const own = (await ownResponse.json()) as {
    id: string;
    pazienteId: string;
    pazienteNome: string;
  };
  assert.equal(own.pazienteId, ownPatientId);
  assert.equal(own.pazienteNome, 'Rossi, Carla');

  const beforeRejected = await prisma.nota.count({ where: { messaggio: { startsWith: marker } } });
  const responses = await Promise.all(
    [foreignPatientId, `missing-${run}`].map((pazienteId) =>
      fetch(`${base}/notes`, {
        method: 'POST',
        headers: headers(actorA),
        body: JSON.stringify({
          destinatarioId: actorB,
          pazienteId,
          messaggio: `${marker}-rejected`,
        }),
      }),
    ),
  );
  assert.deepEqual(
    responses.map((response) => response.status),
    [404, 404],
  );
  assert.deepEqual(await responses[0].json(), await responses[1].json());
  assert.equal(
    await prisma.nota.count({ where: { messaggio: { startsWith: marker } } }),
    beforeRejected,
  );

  const patchResponses = await Promise.all(
    [foreignPatientId, `missing-${run}`].map((pazienteId) =>
      fetch(`${base}/notes/${own.id}`, {
        method: 'PUT',
        headers: headers(actorA),
        body: JSON.stringify({ pazienteId }),
      }),
    ),
  );
  assert.deepEqual(
    patchResponses.map((response) => response.status),
    [404, 404],
  );
  assert.deepEqual(await patchResponses[0].json(), await patchResponses[1].json());
  assert.equal(
    (await prisma.nota.findUnique({ where: { id: own.id }, select: { pazienteId: true } }))
      ?.pazienteId,
    ownPatientId,
  );

  const managerResponse = await fetch(`${base}/notes`, {
    method: 'POST',
    headers: headers(`note-manager-${run}`, 'manager'),
    body: JSON.stringify({
      destinatarioId: 'tutti',
      pazienteId: foreignPatientId,
      messaggio: `${marker}-manager`,
    }),
  });
  assert.equal(managerResponse.status, 201);
});
