// Posizione di sicurezza delle rotte /farmaci.
//
// L'anagrafica e' open data AIFA e si consulta senza credenziali; il ricaricamento no, perche'
// scarica ~82 MB di CSV e sostituisce l'intera tabella. Questo test fissa quel confine: se un
// domani qualcuno rimonta `requireOperator` sull'intero router, la lettura torna a rispondere 401
// e la ricerca farmaci muore di nuovo in silenzio — e questi test lo dicono subito.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import farmaciRouter from '../farmaci.js';

let server: Server;
let base = '';

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/farmaci', farmaciRouter);
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

test('AC1: /farmaci/stato risponde senza header operatore', async () => {
  const res = await fetch(`${base}/farmaci/stato`);
  assert.notEqual(res.status, 401, 'la consultazione non deve chiedere credenziali');
  assert.equal(res.status, 200);
  const body = (await res.json()) as { caricata?: boolean };
  assert.equal(typeof body.caricata, 'boolean');
});

test('AC2: /farmaci/cerca risponde senza header operatore', async () => {
  const res = await fetch(`${base}/farmaci/cerca?q=tachipirina&limite=1`);
  assert.notEqual(res.status, 401);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { esiti?: unknown[] };
  assert.ok(Array.isArray(body.esiti), 'la risposta deve contenere il campo esiti');
});

test('AC2: la ricerca senza q resta un errore di richiesta, non di autenticazione', async () => {
  const res = await fetch(`${base}/farmaci/cerca`);
  assert.equal(res.status, 400);
});

test('AC2: query e principio attivo troppo lunghi sono rifiutati prima del lavoro sul database', async () => {
  const oversized = 'a'.repeat(81);
  const [search, doses] = await Promise.all([
    fetch(`${base}/farmaci/cerca?q=${oversized}`),
    fetch(`${base}/farmaci/dosaggi?pa=${oversized}`),
  ]);
  assert.equal(search.status, 400);
  assert.equal(doses.status, 400);
});

test('AC3: /farmaci/dosaggi risponde senza header operatore', async () => {
  const res = await fetch(`${base}/farmaci/dosaggi?pa=paracetamolo`);
  assert.notEqual(res.status, 401);
  assert.equal(res.status, 200);
});

test('AC4: /farmaci/ricarica senza header resta 401 — la scrittura non si apre', async () => {
  const res = await fetch(`${base}/farmaci/ricarica`, { method: 'POST' });
  assert.equal(res.status, 401);
});

test('AC4: /farmaci/ricarica con ruolo non privilegiato resta 403', async () => {
  const res = await fetch(`${base}/farmaci/ricarica`, {
    method: 'POST',
    headers: { 'X-Operator-Id': 'test-operatore', 'X-Operator-Role': 'operatore' },
  });
  assert.equal(res.status, 403);
});

test('AC5: cerca e dosaggi condividono un limite pubblico per IP', async () => {
  let blockedSearch: Response | null = null;
  for (let i = 0; i < 65; i++) {
    const response = await fetch(`${base}/farmaci/cerca`);
    if (response.status === 429) {
      blockedSearch = response;
      break;
    }
  }
  assert.ok(blockedSearch, 'la ricerca ripetuta deve raggiungere il limite');
  assert.ok(blockedSearch.headers.get('retry-after'));

  const blockedDoses = await fetch(`${base}/farmaci/dosaggi`);
  assert.equal(blockedDoses.status, 429, 'dosaggi deve condividere il budget di ricerca');
  assert.ok(blockedDoses.headers.get('retry-after'));
});
