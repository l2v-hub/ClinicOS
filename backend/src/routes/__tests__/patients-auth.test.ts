// Gate minimo requireOperator su /patients (AC1/AC2 del task "gate-minimo-requireoperator-su-route-cliniche").
//
// L'anagrafica e la cartella paziente sono dati reali, non open-data: a differenza di /farmaci
// (vedi farmaci-auth.test.ts) qui la lettura va protetta quanto la scrittura. Questo test fissa
// il confine opposto a quello di farmaci: senza header operatore la richiesta e' 401, con un
// ruolo ammesso il comportamento torna quello di sempre.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import patientsRouter from '../patients.js';

let server: Server;
let base = '';

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/patients', patientsRouter);
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

test('AC1: GET /patients senza header operatore risponde 401', async () => {
  const res = await fetch(`${base}/patients`);
  assert.equal(res.status, 401);
  const body = (await res.json()) as { error?: string };
  assert.ok(body.error);
});

test('AC1: GET /patients/settings senza header operatore risponde 401', async () => {
  // Anche una route "leggera" (flag UI) resta dietro al gate: router.use si applica
  // all'intero router, non solo alle route con dati clinici.
  const res = await fetch(`${base}/patients/settings`);
  assert.equal(res.status, 401);
});

test('AC1: PUT /patients/:id/cartella senza header operatore risponde 401 (mai raggiunge la scrittura)', async () => {
  const res = await fetch(`${base}/patients/qualsiasi-id/cartella`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { anamnesi: {} } }),
  });
  assert.equal(res.status, 401);
});

test('AC2: GET /patients con ruolo "operatore" ammesso risponde con il comportamento normale', async () => {
  const res = await fetch(`${base}/patients`, {
    headers: { 'X-Operator-Id': 'test-operatore', 'X-Operator-Role': 'operatore' },
  });
  // Non deve piu' essere 401/403: la richiesta autenticata raggiunge l'handler reale
  // (200 con la lista, o al piu' un 500 se il DB non e' raggiungibile in questo ambiente —
  // mai un errore di autenticazione).
  assert.notEqual(res.status, 401);
  assert.notEqual(res.status, 403);
});

test('AC2: ruolo non ammesso resta 403 (non un generico errore 401/500)', async () => {
  const res = await fetch(`${base}/patients`, {
    headers: { 'X-Operator-Id': 'test-intruso', 'X-Operator-Role': 'ospite' },
  });
  assert.equal(res.status, 403);
});
