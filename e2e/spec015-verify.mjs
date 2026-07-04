#!/usr/bin/env node
// SPEC-015 runtime verification harness (pattern: run-clinicos/driver.mjs).
//
//   node e2e/spec015-verify.mjs perf <out.json>   # T002/T032 — network request census per flow
//   node e2e/spec015-verify.mjs us1  <outDir>     # T013 — Agnos chat pilot: vitale + diario + refusal
//
// Assumes backend :3001 + frontend :5173 running. Screenshots/JSON land in <outDir>.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FRONTEND = process.env.CLINICOS_FRONTEND ?? 'http://localhost:5173';
const BACKEND = 'http://localhost:3001';

async function newPage(browser, onRequest) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  if (onRequest) page.on('request', (r) => { if (r.url().startsWith(BACKEND)) onRequest({ method: r.method(), url: r.url() }); });
  return page;
}

async function clickText(page, label) {
  await page.locator(`text="${label}"`).first().click();
  await page.waitForTimeout(600);
}

async function enterAsOperatore(page) {
  await page.goto(FRONTEND + '/', { waitUntil: 'networkidle' });
  await clickText(page, 'Operatore');
  await page.waitForLoadState('networkidle');
}

function dupes(reqs) {
  const seen = new Map();
  for (const r of reqs) { const k = `${r.method} ${r.url}`; seen.set(k, (seen.get(k) ?? 0) + 1); }
  return [...seen.entries()].filter(([, n]) => n > 1).map(([k, n]) => ({ request: k, count: n }));
}

async function perf(outFile) {
  const browser = await chromium.launch();
  const flows = {};
  let bucket = [];
  const page = await newPage(browser, (r) => bucket.push(r));

  await enterAsOperatore(page);
  await page.waitForTimeout(1500);
  flows['avvio-dashboard'] = bucket; bucket = [];

  await clickText(page, 'Agenda');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  flows['apertura-agenda'] = bucket; bucket = [];

  await clickText(page, 'Pazienti');
  await page.waitForLoadState('networkidle');
  await clickText(page, 'Moretti, Elena');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  flows['dettaglio-paziente'] = bucket; bucket = [];

  const report = {};
  for (const [name, reqs] of Object.entries(flows)) {
    report[name] = { total: reqs.length, duplicates: dupes(reqs), requests: reqs.map((r) => `${r.method} ${r.url}`) };
  }
  writeFileSync(outFile, JSON.stringify({ measuredAt: new Date().toISOString(), flows: report }, null, 2));
  for (const [name, f] of Object.entries(report)) {
    console.log(`${name}: ${f.total} richieste, ${f.duplicates.length} duplicate ${f.duplicates.map((d) => `[${d.count}x ${d.request}]`).join(' ')}`);
  }
  await browser.close();
}

async function openAgnos(page) {
  await page.locator('.ai-fab').click();
  await page.waitForSelector('.agnos-panel');
}

async function agnosCommand(page, text) {
  await page.fill('.agnos-input', text);
  await page.click('.ai-asst__send');
}

async function us1(outDir) {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await newPage(browser);
  const shot = (name) => page.screenshot({ path: join(outDir, name), fullPage: false });
  const results = [];
  const ok = (name, cond, detail = '') => { results.push({ name, pass: !!cond, detail }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${detail}`); };

  await enterAsOperatore(page);
  await clickText(page, 'Pazienti');
  await clickText(page, 'Moretti, Elena');
  await page.waitForLoadState('networkidle');

  // — vitale: comando → preview → conferma → sync UI
  await openAgnos(page);
  await shot('us1-01-panel.png');
  await agnosCommand(page, 'registra temperatura 37,2 alle 14');
  await page.waitForSelector('.voice-preview', { timeout: 10000 });
  await shot('us1-02-preview-vitale.png');
  const canConfirm = await page.locator('.voice-actions .btn-primary:not([disabled])').count();
  ok('preview vitale con conferma attiva', canConfirm === 1);
  await page.click('.voice-actions .btn-primary');
  await page.waitForSelector('.voice-done, .agnos-preview__stato--ok', { timeout: 10000 });
  await shot('us1-03-confermato-vitale.png');
  ok('vitale eseguito', true);

  // — nota diario
  await agnosCommand(page, 'aggiungi nota al diario: paziente tranquillo e collaborante');
  await page.waitForSelector('.voice-actions .btn-primary', { timeout: 10000 });
  await shot('us1-04-preview-diario.png');
  await page.click('.voice-actions .btn-primary');
  await page.waitForSelector('.voice-done >> nth=1, .agnos-preview__stato--ok >> nth=1', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await shot('us1-05-confermato-diario.png');

  // — read senza conferma
  await agnosCommand(page, 'mostra i parametri di oggi');
  await page.waitForTimeout(2500);
  const bodyTxt = await page.locator('.ai-asst__body').innerText();
  ok('read risponde senza conferma', /37,?2|temperatura/i.test(bodyTxt), '(risposta contiene il parametro)');
  await shot('us1-06-read.png');

  // — tentativo delete: rifiuto (anteprima US2)
  await agnosCommand(page, "cancella l'ultima nota del diario");
  await page.waitForSelector('.agnos-refusal', { timeout: 10000 });
  const refusalTxt = await page.locator('.agnos-refusal').last().innerText();
  ok('delete rifiutato con rinvio alla UI', /interfaccia/i.test(refusalTxt), refusalTxt.slice(0, 80));
  await shot('us1-07-delete-rifiutato.png');

  // — fonte di verità: cartella via API contiene il vitale appena creato
  const patients = await (await fetch(`${BACKEND}/patients`)).json();
  const moretti = patients.find((p) => p.lastName === 'Moretti');
  const cartella = await (await fetch(`${BACKEND}/patients/${moretti.id}/cartella`)).json();
  const vitals = JSON.stringify(cartella);
  ok('vitale persistito nel backend (cartella API)', /37[.,]2/.test(vitals));

  // — sync UI: la Panoramica del dettaglio mostra il vitale senza reload ("Ultimi parametri")
  await page.locator('.ai-drawer__scrim').click();
  await page.waitForTimeout(1000);
  let pageTxt = await page.locator('body').innerText();
  ok('vitale visibile in UI senza reload', /37[.,]2/.test(pageTxt));
  await shot('us1-08-parametri-sync.png');

  // — persistenza dopo refresh
  await page.reload({ waitUntil: 'networkidle' });
  await clickText(page, 'Operatore');
  await clickText(page, 'Pazienti');
  await clickText(page, 'Moretti, Elena');
  await page.waitForTimeout(1000);
  pageTxt = await page.locator('body').innerText();
  ok('vitale persistito dopo refresh', /37[.,]2/.test(pageTxt));
  await shot('us1-09-parametri-persistenza.png');

  writeFileSync(join(outDir, 'us1-report.json'), JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2));
  await browser.close();
  if (results.some((r) => !r.pass)) process.exit(1);
}

const [mode, out] = process.argv.slice(2);
if (mode === 'perf') await perf(out ?? 'requirements/evidence/SPEC-015/perf-before.json');
else if (mode === 'us1') await us1(out ?? 'requirements/evidence/SPEC-015');
else { console.error('usage: spec015-verify.mjs perf|us1 [out]'); process.exit(2); }
