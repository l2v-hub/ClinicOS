// Cancellazione fisica disattivata di default + endpoint demo/seed bloccati in produzione
// (task: disattivare-cancellazione-fisica-e-proteggere-endpoint-demo).
//
// Prima di questo task, ALLOW_PATIENT_DELETE assente => cancellazione ABILITATA di default
// (rischio: DELETE /patients/:id disponibile ovunque senza opt-in esplicito). Ora il default
// e' invertito: la cancellazione fisica funziona SOLO con ALLOW_PATIENT_DELETE=true esplicito.
// Allo stesso modo, /patients/seed e /patients/demo-setup — che creano/sovrascrivono dati
// paziente — rispondono 403 quando NODE_ENV === 'production', indipendentemente dagli header
// operatore (quel gate e' header-based e spoofabile, non e' una vera difesa da solo).

import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import patientsRouter from '../patients.js';

let server: Server;
let base = '';

const OPERATOR_HEADERS = { 'X-Operator-Id': 'test-operatore', 'X-Operator-Role': 'operatore' };

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

// Ogni test salva/ripristina le env var che tocca, per non contaminare gli altri test del file
// (e gli altri file eseguiti nello stesso processo `node --test`).
let savedAllowDelete: string | undefined;
let savedNodeEnv: string | undefined;

beforeEach(() => {
  savedAllowDelete = process.env.ALLOW_PATIENT_DELETE;
  savedNodeEnv = process.env.NODE_ENV;
});

afterEach(() => {
  if (savedAllowDelete === undefined) delete process.env.ALLOW_PATIENT_DELETE;
  else process.env.ALLOW_PATIENT_DELETE = savedAllowDelete;
  if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = savedNodeEnv;
});

test('AC1/AC2: DELETE /patients/:id senza ALLOW_PATIENT_DELETE risponde 403 (default ora disabilitato)', async () => {
  delete process.env.ALLOW_PATIENT_DELETE;
  const res = await fetch(`${base}/patients/qualsiasi-id`, {
    method: 'DELETE',
    headers: OPERATOR_HEADERS,
  });
  assert.equal(res.status, 403);
  const body = (await res.json()) as { error?: string };
  assert.ok(body.error);
});

test("AC2: DELETE /patients/:id con ALLOW_PATIENT_DELETE=true non e' piu' bloccato dal gate (comportamento normale)", async () => {
  process.env.ALLOW_PATIENT_DELETE = 'true';
  const res = await fetch(`${base}/patients/qualsiasi-id`, {
    method: 'DELETE',
    headers: OPERATOR_HEADERS,
  });
  // Con il gate esplicitamente abilitato la richiesta raggiunge l'handler reale: mai 403.
  // Puo' fallire piu' avanti (404 id inesistente, o 500 se il DB non e' raggiungibile in
  // questo ambiente) — cio' che conta e' che il gate non la blocchi.
  assert.notEqual(res.status, 403);
});

test('AC3: GET /patients/settings senza ALLOW_PATIENT_DELETE riflette deleteEnabled: false', async () => {
  delete process.env.ALLOW_PATIENT_DELETE;
  const res = await fetch(`${base}/patients/settings`, { headers: OPERATOR_HEADERS });
  assert.equal(res.status, 200);
  const body = (await res.json()) as { deleteEnabled?: boolean };
  assert.equal(body.deleteEnabled, false);
});

test('AC3: GET /patients/settings con ALLOW_PATIENT_DELETE=true riflette deleteEnabled: true', async () => {
  process.env.ALLOW_PATIENT_DELETE = 'true';
  const res = await fetch(`${base}/patients/settings`, { headers: OPERATOR_HEADERS });
  assert.equal(res.status, 200);
  const body = (await res.json()) as { deleteEnabled?: boolean };
  assert.equal(body.deleteEnabled, true);
});

test('AC4: POST /patients/seed con NODE_ENV=production risponde 403 prima di toccare il DB', async () => {
  process.env.NODE_ENV = 'production';
  const res = await fetch(`${base}/patients/seed`, { method: 'POST', headers: OPERATOR_HEADERS });
  assert.equal(res.status, 403);
  const body = (await res.json()) as { error?: string };
  assert.ok(body.error);
});

test('AC4: POST /patients/demo-setup con NODE_ENV=production risponde 403 prima di toccare il DB', async () => {
  process.env.NODE_ENV = 'production';
  const res = await fetch(`${base}/patients/demo-setup`, {
    method: 'POST',
    headers: OPERATOR_HEADERS,
  });
  assert.equal(res.status, 403);
  const body = (await res.json()) as { error?: string };
  assert.ok(body.error);
});

test("AC4: POST /patients/seed con NODE_ENV diverso da production non e' bloccato dal gate", async () => {
  process.env.NODE_ENV = 'test';
  const res = await fetch(`${base}/patients/seed`, { method: 'POST', headers: OPERATOR_HEADERS });
  // Il gate NODE_ENV non deve bloccarla: puo' comunque fallire piu' avanti (es. 500 se il DB
  // non e' raggiungibile in questo ambiente) — cio' che conta e' che non sia 403.
  assert.notEqual(res.status, 403);
});

test("AC4: POST /patients/demo-setup con NODE_ENV diverso da production non e' bloccato dal gate", async () => {
  process.env.NODE_ENV = 'development';
  const res = await fetch(`${base}/patients/demo-setup`, {
    method: 'POST',
    headers: OPERATOR_HEADERS,
  });
  assert.notEqual(res.status, 403);
});
