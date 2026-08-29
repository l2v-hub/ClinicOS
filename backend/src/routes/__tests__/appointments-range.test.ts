import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import appointmentsRouter from '../appointments.js';

let server: Server;
let base = '';
const headers = { 'X-Operator-Id': 'op-test', 'X-Operator-Role': 'operatore' };

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/appointments', appointmentsRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
      resolve();
    });
  });
});

after(async () => new Promise<void>((resolve) => server.close(() => resolve())));

test('appointment reads are authenticated, no-store and require a bounded range', async () => {
  const unauth = await fetch(`${base}/appointments?date=2030-01-01`);
  assert.equal(unauth.status, 401);
  assert.match(unauth.headers.get('cache-control') ?? '', /no-store/);
  for (const query of ['', '?date=2030-02-30', '?from=2030-01-01&to=2030-03-01']) {
    const response = await fetch(`${base}/appointments${query}`, { headers });
    assert.equal(response.status, 400);
    assert.match(response.headers.get('cache-control') ?? '', /no-store/);
  }
});

test('appointment writes reject spoofed/invalid fields before persistence', async () => {
  const response = await fetch(`${base}/appointments`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId: 'p1',
      operatorId: 'op-test',
      data: '2030-02-30',
      ora: '08:00',
    }),
  });
  assert.equal(response.status, 400);
});
