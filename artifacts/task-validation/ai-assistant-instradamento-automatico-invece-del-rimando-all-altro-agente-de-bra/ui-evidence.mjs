#!/usr/bin/env node
// EVIDENZA UI (Playwright, browser reale) per il task:
//   1) il pannello chat non è più marchiato «Agnos» e dichiara di essere un assistente virtuale;
//   2) i chip «Assistente clinico / Gestione struttura» non esistono più (niente scelta manuale);
//   3) da Operatore, una domanda clinica riceve la RISPOSTA e non il vecchio rimando
//      «Questa richiesta è di competenza dell'assistente ... Selezionalo per ottenere la risposta».
//
// Il backend non è disponibile su questa macchina (nessun Postgres locale): POST /ai/actions/plan
// è servito da uno stub che restituisce ciò che il backend ORA produce per quella domanda
// (agent:'clinical', dati + fonti). Il comportamento del backend è provato separatamente da
// assistant-agent-routing.check.mts, che gira il servizio reale.
//
// Uso: node ui-evidence.mjs [baseUrl]   (default http://localhost:4173)

import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(DIR, 'screenshots');
const BASE = process.argv[2] ?? 'http://localhost:4173';
fs.mkdirSync(SHOTS, { recursive: true });

const CLINICAL_ANSWER = {
  read: {
    intent: 'allergies',
    scope: 'patient',
    plan: { intent: 'allergies', scope: 'patient', tools: [], requiresCrossPatientAccess: false },
    results: [{ id: 'A1', sostanza: 'penicillina', gravita: 'alta' }],
    sources: [
      {
        sourceType: 'allergia',
        patientId: 'P1',
        recordId: 'A1',
        label: 'Allergia — penicillina',
        exactText: 'Allergia nota a penicillina (gravità alta).',
        recordedAt: '2026-08-01T08:00:00.000Z',
      },
    ],
    navigation: [],
    notFound: false,
    truncated: false,
    mode: 'deterministic',
    composed: false,
    // ← il campo che prova l'instradamento automatico: la chat non ha chiesto il clinico
    agent: 'clinical',
  },
  plan: { actionType: 'read_allergies', channel: 'testo' },
};

const failures = [];
const check = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures.push(msg);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

let planRequestBody = null;
await page.route('**/ai/actions/plan', async (route) => {
  planRequestBody = route.request().postDataJSON();
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(CLINICAL_ANSWER),
  });
});

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(1500);
const roleBtn = page.getByText('Operatore', { exact: true }).first();
if (await roleBtn.count()) {
  await roleBtn.click();
  await page.waitForTimeout(1500);
}

// ── 1. il FAB si chiama «Assistente virtuale ClinicOS» ────────────────────────────
const fab = page.getByRole('button', { name: 'Assistente virtuale ClinicOS' });
check((await fab.count()) === 1, 'il FAB espone il nome «Assistente virtuale ClinicOS»');
check(
  (await page.getByRole('button', { name: /Agnos/i }).count()) === 0,
  'nessun controllo visibile si chiama ancora «Agnos»',
);
await fab.click();
await page.waitForTimeout(800);

const dialog = page.getByRole('dialog', { name: 'Assistente virtuale ClinicOS' });
check(await dialog.isVisible(), 'il pannello si apre come dialog «Assistente virtuale ClinicOS»');
await page.screenshot({ path: path.join(SHOTS, '01-pannello-aperto.png') });

// ── 2. intestazione: assistente virtuale dichiarato, nessun chip di selezione ─────
const header = await dialog.innerText();
check(/Assistente virtuale/.test(header), 'l’intestazione dice «Assistente virtuale»');
check(/\bIA\b/.test(header), 'il badge «IA» è visibile');
check(/Non è un operatore umano/.test(header), 'il pannello dichiara che non è un operatore umano');
// \b…\b: «diagnosi» contiene la sottostringa "agnos" ed è testo legittimo del pannello.
check(!/\bAgnos\b/i.test(header), 'nessuna occorrenza di «Agnos» nel testo del pannello');
check(
  (await dialog.getByRole('group', { name: 'Seleziona assistente' }).count()) === 0,
  'i chip di scelta dell’assistente non esistono più',
);
check(
  (await dialog.getByRole('button', { name: 'Assistente clinico' }).count()) === 0,
  'non c’è più un pulsante «Assistente clinico» da selezionare',
);

// ── 3. domanda clinica da Operatore → risposta, non rimando ──────────────────────
const input = page.getByLabel('Comando per l’assistente virtuale');
await input.click();
await input.fill('che allergie ha?');
await Promise.all([
  page.waitForResponse((r) => /\/ai\/actions\/plan$/.test(r.url())),
  page.getByRole('button', { name: 'Invia' }).click(),
]);
await page.waitForTimeout(1200);

check(
  planRequestBody !== null && planRequestBody.agent === undefined,
  'la chat non invia più un agente scelto a mano (è l’intent a decidere)',
);
const body = await dialog.innerText();
check(!/Selezionalo per ottenere la risposta/.test(body), 'nessun messaggio «Selezionalo…»');
check(!/competenza dell/i.test(body), 'nessun messaggio «è di competenza dell’assistente…»');
check(/1 risultato/.test(body), 'la risposta clinica viene mostrata all’operatore');
check(/Allergia — penicillina/.test(body), 'la fonte clinica è citata nella risposta');

await page.screenshot({ path: path.join(SHOTS, '02-risposta-clinica-operatore.png') });
await dialog.screenshot({ path: path.join(SHOTS, '03-pannello-dettaglio.png') });

await browser.close();
console.log(`\n${failures.length ? `FAILED (${failures.length})` : 'ALL CHECKS PASSED'}`);
process.exit(failures.length ? 1 : 0);
