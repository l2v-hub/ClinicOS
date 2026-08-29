import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import { adminRouter, patientAssignmentRouter } from '../admin-rooms.js';
import operatorsRouter from '../operators.js';

const OPERATOR_HEADERS = {
  'X-Operator-Id': 'operator-test',
  'X-Operator-Role': 'operatore',
  'Content-Type': 'application/json',
};
const MANAGER_HEADERS = {
  'X-Operator-Id': 'manager-test',
  'X-Operator-Role': 'manager',
  'Content-Type': 'application/json',
};

let server: Server;
let base = '';

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/admin', adminRouter);
  app.use('/patients', patientAssignmentRouter);
  app.use('/operators', operatorsRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const info = server.address();
      const port = typeof info === 'object' && info ? info.port : 0;
      base = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('operator cannot create rooms', async () => {
  const response = await fetch(`${base}/admin/rooms`, {
    method: 'POST',
    headers: OPERATOR_HEADERS,
    body: JSON.stringify({ numero: 'SEC-TEST' }),
  });
  assert.equal(response.status, 403);
});

test('room and assignment endpoints forbid caching of clinical occupancy', async () => {
  for (const path of ['/admin/not-a-route', '/patients/not-a-patient/room-assignments/missing']) {
    const response = await fetch(`${base}${path}`, { headers: OPERATOR_HEADERS });
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
});

test('room assignment read scope rejects unsupported unbounded variants before querying', async () => {
  const response = await fetch(`${base}/patients/patient-other/room-assignments?scope=history`, {
    headers: OPERATOR_HEADERS,
  });
  assert.equal(response.status, 400);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

test('invalid room, bed and assignment input returns 400 before Prisma', async () => {
  const requests: Array<Promise<Response>> = [
    fetch(`${base}/admin/beds/available?startDate=2026-02-30`, { headers: MANAGER_HEADERS }),
    fetch(`${base}/admin/rooms`, {
      method: 'POST',
      headers: MANAGER_HEADERS,
      body: JSON.stringify({ numero: 'X', tipo: 'altra', numBeds: 9 }),
    }),
    fetch(`${base}/admin/rooms/room-x`, {
      method: 'PUT',
      headers: MANAGER_HEADERS,
      body: JSON.stringify({ tipo: 'tripla' }),
    }),
    fetch(`${base}/admin/rooms/room-x/beds`, {
      method: 'POST',
      headers: MANAGER_HEADERS,
      body: JSON.stringify({ label: 'A', stato: 'occupato' }),
    }),
    fetch(`${base}/patients/patient-x/room-assignments`, {
      method: 'POST',
      headers: MANAGER_HEADERS,
      body: JSON.stringify({ bedId: 'bed-x', startDate: '2026-08-30', endDate: '2026-08-29' }),
    }),
    fetch(`${base}/patients/patient-x/room-assignments/assignment-x`, {
      method: 'PUT',
      headers: MANAGER_HEADERS,
      body: JSON.stringify({ endDate: '29/08/2026' }),
    }),
  ];

  for (const response of await Promise.all(requests)) {
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
});

test('operator cannot create or alter operators', async () => {
  const createResponse = await fetch(`${base}/operators`, {
    method: 'POST',
    headers: OPERATOR_HEADERS,
    body: JSON.stringify({ nome: 'Test', cognome: 'Security' }),
  });
  assert.equal(createResponse.status, 403);

  const updateResponse = await fetch(`${base}/operators/operator-other`, {
    method: 'PUT',
    headers: OPERATOR_HEADERS,
    body: JSON.stringify({ stato: 'attivo' }),
  });
  assert.equal(updateResponse.status, 403);

  const fullDirectoryResponse = await fetch(`${base}/operators`, {
    headers: OPERATOR_HEADERS,
  });
  assert.equal(fullDirectoryResponse.status, 403);
});

test('operator cannot change patient room assignments', async () => {
  const response = await fetch(`${base}/patients/patient-other/room-assignments`, {
    method: 'POST',
    headers: OPERATOR_HEADERS,
    body: JSON.stringify({ bedId: 'bed-other', startDate: '2026-08-29' }),
  });
  assert.equal(response.status, 403);
});
