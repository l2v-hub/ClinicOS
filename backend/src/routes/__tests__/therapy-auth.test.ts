// Gate minimo requireOperator su /therapy-slots (AC1/AC2 del task
// "gate-minimo-requireoperator-su-route-cliniche"). Gli slot terapia espongono nominativo
// paziente e farmaci somministrati: niente lettura ne' scrittura senza operatore identificato.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import therapyRouter from '../therapy.js';

let server: Server;
let base = '';

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/therapy-slots', therapyRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const info = server.address();
      const porta = typeof info === 'object' && info ? info.port : 0;
      base = `http://127.0.0.1:${porta}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('AC1: GET /therapy-slots senza header operatore risponde 401', async () => {
  const res = await fetch(`${base}/therapy-slots?date=2030-01-01`);
  assert.equal(res.status, 401);
  assert.match(res.headers.get('cache-control') ?? '', /no-store/);
});

test('AC5: GET terapia rifiuta date mancanti/impossibili prima del database', async () => {
  const headers = { 'X-Operator-Id': 'test-operatore', 'X-Operator-Role': 'operatore' };
  const missing = await fetch(`${base}/therapy-slots`, { headers });
  const impossible = await fetch(`${base}/therapy-slots?date=2030-02-30`, { headers });
  assert.equal(missing.status, 400);
  assert.equal(impossible.status, 400);
  assert.match(missing.headers.get('cache-control') ?? '', /no-store/);
});

test('AC1: POST /therapy-slots/confirm senza header operatore risponde 401 (mai somministra)', async () => {
  const res = await fetch(`${base}/therapy-slots/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId: 'p1',
      farmacoNome: 'Tachipirina',
      date: '2030-01-01',
      fascia: 'mattina',
    }),
  });
  assert.equal(res.status, 401);
});

test('AC2: GET /therapy-slots con ruolo "operatore" ammesso risponde con il comportamento normale', async () => {
  const res = await fetch(`${base}/therapy-slots?date=2030-01-01`, {
    headers: { 'X-Operator-Id': 'test-operatore', 'X-Operator-Role': 'operatore' },
  });
  assert.notEqual(res.status, 401);
  assert.notEqual(res.status, 403);
});

test('AC2: ruolo non ammesso resta 403', async () => {
  const res = await fetch(`${base}/therapy-slots?date=2030-01-01`, {
    headers: { 'X-Operator-Id': 'test-intruso', 'X-Operator-Role': 'ospite' },
  });
  assert.equal(res.status, 403);
});
