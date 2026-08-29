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
