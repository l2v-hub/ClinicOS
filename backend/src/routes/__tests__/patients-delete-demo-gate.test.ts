// Cancellazione fisica disattivata di default + endpoint demo/seed bloccati in produzione
// (task: disattivare-cancellazione-fisica-e-proteggere-endpoint-demo).
//
// Prima di questo task, ALLOW_PATIENT_DELETE assente => cancellazione ABILITATA di default
// (rischio: DELETE /patients/:id disponibile ovunque senza opt-in esplicito). Ora il default
// e' invertito: la cancellazione fisica funziona SOLO con ALLOW_PATIENT_DELETE=true esplicito.
// Allo stesso modo, /patients/seed e /patients/demo-setup — che creano/sovrascrivono dati
// paziente — richiedono un ruolo admin/manager e restano disabilitati in produzione.

import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import patientsRouter from '../patients.js';

let server: Server;
let base = '';

const OPERATOR_HEADERS = { 'X-Operator-Id': 'test-operatore', 'X-Operator-Role': 'operatore' };
const MANAGER_HEADERS = { 'X-Operator-Id': 'test-manager', 'X-Operator-Role': 'manager' };

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

test('AC4: POST /patients/seed in produzione fallisce chiuso senza Entra configurato', async () => {
  process.env.NODE_ENV = 'production';
  const res = await fetch(`${base}/patients/seed`, { method: 'POST', headers: OPERATOR_HEADERS });
  assert.equal(res.status, 503);
  const body = (await res.json()) as { error?: string };
  assert.ok(body.error);
});

test('AC4: POST /patients/demo-setup in produzione fallisce chiuso senza Entra configurato', async () => {
  process.env.NODE_ENV = 'production';
  const res = await fetch(`${base}/patients/demo-setup`, {
    method: 'POST',
    headers: OPERATOR_HEADERS,
  });
  assert.equal(res.status, 503);
  const body = (await res.json()) as { error?: string };
  assert.ok(body.error);
});

test('AC5: un operatore non puo eseguire il seed fuori produzione', async () => {
  process.env.NODE_ENV = 'test';
  const res = await fetch(`${base}/patients/seed`, { method: 'POST', headers: OPERATOR_HEADERS });
  assert.equal(res.status, 403);
});

test('AC5: un operatore non puo eseguire il demo setup fuori produzione', async () => {
  process.env.NODE_ENV = 'development';
  const res = await fetch(`${base}/patients/demo-setup`, {
    method: 'POST',
    headers: OPERATOR_HEADERS,
  });
  assert.equal(res.status, 403);
});

test("AC6: un manager raggiunge l'handler seed fuori produzione", async () => {
  process.env.NODE_ENV = 'test';
  const res = await fetch(`${base}/patients/seed`, { method: 'POST', headers: MANAGER_HEADERS });
  // In assenza di DATABASE_URL l'handler puo rispondere 500: il contratto qui e' che RBAC non lo
  // blocchi e che solo il gestore autorizzato possa raggiungere Prisma.
  assert.notEqual(res.status, 403);
});

test("AC6: un manager raggiunge l'handler demo setup fuori produzione", async () => {
  process.env.NODE_ENV = 'development';
  const res = await fetch(`${base}/patients/demo-setup`, {
    method: 'POST',
    headers: MANAGER_HEADERS,
  });
  assert.notEqual(res.status, 403);
});

test('AC7: entrambe le route demo dichiarano esplicitamente RBAC admin/manager', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../patients.ts', import.meta.url), 'utf8');
  assert.match(source, /router\.post\('\/seed', requireRole\('admin', 'manager'\)/);
  assert.match(source, /router\.post\('\/demo-setup', requireRole\('admin', 'manager'\)/);
});
