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

test('loop 3: pagina e overview pazienti restano dietro requireOperator', async () => {
  const [page, parametersPage, overview] = await Promise.all([
    fetch(`${base}/patients/page`),
    fetch(`${base}/patients/parameters/page`),
    fetch(`${base}/patients/clinical-summary/overview`),
  ]);
  assert.equal(page.status, 401);
  assert.equal(parametersPage.status, 401);
  assert.equal(overview.status, 401);
});

test('loop 3: input non validi sono respinti prima di interrogare il database', async () => {
  const headers = { 'X-Operator-Id': 'test-operatore', 'X-Operator-Role': 'operatore' };
  const patientIds = Array.from({ length: 101 }, (_, index) => `patient-${index}`).join(',');
  const [badLimit, badParametersLimit, badPeriod, badCursor, oversizedSummary] = await Promise.all([
    fetch(`${base}/patients/page?limit=10foo`, { headers }),
    fetch(`${base}/patients/parameters/page?limit=0`, { headers }),
    fetch(`${base}/patients/parameters/page?month=13&year=2026`, { headers }),
    fetch(`${base}/patients/page?cursor=not-base64!`, { headers }),
    fetch(`${base}/patients/clinical-summary?patientIds=${patientIds}`, { headers }),
  ]);
  assert.equal(badLimit.status, 400);
  assert.equal(badLimit.headers.get('cache-control'), 'private, no-store');
  assert.equal(badParametersLimit.status, 400);
  assert.equal(badPeriod.status, 400);
  assert.equal(badCursor.status, 400);
  assert.equal(oversizedSummary.status, 400);
});

test('loop 6: PATCH parametri richiede auth e valida il payload prima del database', async () => {
  const unauthenticated = await fetch(`${base}/patients/patient-1/parameters`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month: {} }),
  });
  assert.equal(unauthenticated.status, 401);

  const invalid = await fetch(`${base}/patients/patient-1/parameters`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Operator-Id': 'test-operatore',
      'X-Operator-Role': 'operatore',
    },
    body: JSON.stringify({ month: { id: '../bad' } }),
  });
  assert.equal(invalid.status, 400);

  const missingBody = await fetch(`${base}/patients/patient-1/parameters`, {
    method: 'PATCH',
    headers: {
      'X-Operator-Id': 'test-operatore',
      'X-Operator-Role': 'operatore',
    },
  });
  assert.equal(missingBody.status, 400);

  const spoofedSignature = await fetch(`${base}/patients/patient-1/parameters`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Operator-Id': 'test-operatore',
      'X-Operator-Role': 'operatore',
    },
    body: JSON.stringify({
      month: {
        id: 'month-1',
        mese: 8,
        anno: 2026,
        createdAt: '2026-08-29T00:00:00.000Z',
        giorni: [{ giorno: 29, firmaIpM: 'altro-operatore' }],
      },
    }),
  });
  assert.equal(spoofedSignature.status, 400);
});

test('loop 6: clinical-summary richiede sempre una lista pazienti esplicita', async () => {
  const res = await fetch(`${base}/patients/clinical-summary`, {
    headers: { 'X-Operator-Id': 'test-operatore', 'X-Operator-Role': 'operatore' },
  });
  assert.equal(res.status, 400);
});

test('AC1: PUT /patients/:id/cartella senza header operatore risponde 401 (mai raggiunge la scrittura)', async () => {
  const res = await fetch(`${base}/patients/qualsiasi-id/cartella`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { anamnesi: {} } }),
  });
  assert.equal(res.status, 401);
});

test('loop 6: il roster legacy autenticato è dismesso con 410', async () => {
  const res = await fetch(`${base}/patients`, {
    headers: { 'X-Operator-Id': 'test-operatore', 'X-Operator-Role': 'operatore' },
  });
  assert.equal(res.status, 410);
  assert.equal(res.headers.get('deprecation'), 'true');
});

test('AC2: ruolo non ammesso resta 403 (non un generico errore 401/500)', async () => {
  const res = await fetch(`${base}/patients`, {
    headers: { 'X-Operator-Id': 'test-intruso', 'X-Operator-Role': 'ospite' },
  });
  assert.equal(res.status, 403);
});
