#!/usr/bin/env node
// SPEC-016 F0 — verifica UI del potenziamento deterministico delle letture:
// il chatbot risolve il paziente NOMINATO nel testo (senza scheda aperta) e riconosce
// plurali/sinonimi. Prova anche l'invariante SPEC-015 (rifiuto Delete).
//   node e2e/agnos-llm-reads.mjs [outDir]
// Assume backend :3001 + frontend :5173 attivi.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FRONTEND = process.env.CLINICOS_FRONTEND ?? 'http://localhost:5173';
const OUT = process.argv[2] ?? 'requirements/evidence/SPEC-016';
mkdirSync(OUT, { recursive: true });

const results = [];
const ok = (name, cond, detail = '') => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

// Cattura le risposte del planner per asserire l'intent lato server (contratto che usa la UI).
const planByText = new Map();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await ctx.newPage();
page.on('dialog', (d) => {
  void d.accept();
});
page.on('response', async (r) => {
  if (!r.url().endsWith('/ai/actions/plan')) return;
  try {
    const req = JSON.parse(r.request().postData() ?? '{}');
    const body = await r.json();
    planByText.set(req.text, body);
  } catch {
    /* ignore */
  }
});
const shot = (n) => page.screenshot({ path: join(OUT, n) });

async function clickText(t) {
  await page.locator(`text="${t}"`).first().click();
  await page.waitForTimeout(500);
}
async function ask(text) {
  await page.fill('.agnos-input', text);
  await page.click('.ai-asst__send');
  await page
    .waitForFunction((t) => window.__lastPlanText === t || true, text, { timeout: 1000 })
    .catch(() => {});
  await page.waitForTimeout(2500);
}

try {
  // Entra come operatore e RESTA su una pagina generica (Pazienti) — nessun paziente aperto.
  await page.goto(FRONTEND + '/', { waitUntil: 'networkidle' });
  await clickText('Operatore');
  await page.waitForLoadState('networkidle');
  await clickText('Pazienti');
  await page.waitForTimeout(500);

  // Apri il pannello Agnos (nessun currentPatientId perché non siamo nel dettaglio).
  await page.locator('.ai-fab').click();
  await page.waitForSelector('.agnos-panel');
  await shot('f0-01-panel.png');

  // 1) Parametri di un paziente NOMINATO nel testo → risolto e con dati (prima: unknown/non trovata).
  await ask('mostra gli ultimi parametri di Elena Moretti');
  const p1 = planByText.get('mostra gli ultimi parametri di Elena Moretti')?.read;
  ok(
    '1. paziente nominato risolto + parametri recuperati',
    p1?.intent === 'vitals_recent' && (p1?.results?.length ?? 0) > 0,
    `intent=${p1?.intent} results=${p1?.results?.length}`,
  );
  await shot('f0-02-parametri.png');

  // 2) Plurale "terapie" riconosciuto (prima: unknown).
  await ask('quali terapie assume Elena Moretti');
  const p2 = planByText.get('quali terapie assume Elena Moretti')?.read;
  ok(
    '2. plurale "terapie" riconosciuto (intent therapies, non unknown)',
    p2?.intent === 'therapies',
    `intent=${p2?.intent}`,
  );

  // 3) Allergie di un paziente nominato → intent risolto (i risultati dipendono dai dati).
  await ask('mostra le allergie di Elena Moretti');
  const p3 = planByText.get('mostra le allergie di Elena Moretti')?.read;
  ok(
    '3. allergie: paziente nominato risolto (intent allergies, non unknown)',
    p3?.intent === 'allergies',
    `intent=${p3?.intent}`,
  );
  await shot('f0-03-allergie.png');

  // 4) Domanda non pertinente → nessun intent-dati prodotto (nessuna invenzione).
  // L'orchestratore classifica il saluto come 'unknown' (ramo preview), quindi NON produce
  // una risposta di lettura con dati: read è null/vuoto e nulla viene inventato.
  await ask('buongiorno');
  const r4 = planByText.get('buongiorno') ?? {};
  const noDataIntent =
    !r4.read || r4.read.intent === 'unknown' || (r4.read.results?.length ?? 0) === 0;
  ok(
    '4. domanda non pertinente → nessun dato inventato',
    noDataIntent && r4.plan?.actionType === 'unknown',
    `actionType=${r4.plan?.actionType}`,
  );

  // 5) Invariante SPEC-015: tentativo Delete rifiutato.
  await ask('cancella la nota del diario');
  await page.waitForSelector('.agnos-refusal', { timeout: 8000 }).catch(() => {});
  const refused = (await page.locator('.agnos-refusal').count()) > 0;
  ok('5. rifiuto Delete invariato (SPEC-015)', refused);
  await shot('f0-04-delete-rifiutato.png');
} finally {
  writeFileSync(
    join(OUT, 'f0-report.json'),
    JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2),
  );
  await browser.close();
}
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} PASS — evidenze in ${OUT}`);
if (passed !== results.length) process.exit(1);
