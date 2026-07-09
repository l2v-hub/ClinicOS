#!/usr/bin/env node
// Issue #246 — foto/allegati per Esami, RX e Consulenze specialistiche.
// Carica un'immagine di test in ciascuna delle 3 sezioni, verifica la chip e la persistenza
// nella sezione corretta dopo reload.
//   node e2e/issue-246-foto.mjs [outDir]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const FRONTEND = process.env.CLINICOS_FRONTEND ?? 'http://localhost:5173';
const PATIENT = 'Moretti, Elena';
const IMG = resolve('e2e/_test-exam-photo.png');
const OUT = process.argv[2] ?? 'artifacts/task-validation/246-foto-esami-rx-consulenze';
for (const d of ['screenshots', 'video', 'trace', 'logs']) mkdirSync(join(OUT, d), { recursive: true });

const results = [];
const ok = (name, cond, detail = '') => { results.push({ name, pass: !!cond, detail }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };
const consoleErrors = [];
const SECTIONS = [['esame', 'Esami'], ['rx', 'RX'], ['consulenza', 'Consulenze']];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, recordVideo: { dir: join(OUT, 'video'), size: { width: 1366, height: 900 } } });
await ctx.tracing.start({ screenshots: true, snapshots: true, sources: true });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
const shot = (n) => page.screenshot({ path: join(OUT, 'screenshots', n), fullPage: true });
async function clickText(t) { await page.locator(`text="${t}"`).first().click(); await page.waitForTimeout(500); }
async function openEsami() {
  await clickText('Pazienti');
  await page.waitForTimeout(600);
  await page.getByText(PATIENT, { exact: false }).first().click();
  await page.waitForTimeout(1200);
  await clickText('Clinica');
  await page.waitForTimeout(500);
  await page.locator('text="Esami & Consulenze"').first().click();
  await page.waitForSelector('[data-testid="photos-esame"]', { timeout: 8000 });
  await page.waitForTimeout(500);
}
async function uploadTo(type) {
  const [resp] = await Promise.all([
    page.waitForResponse((r) => /\/patients\/.+\/documents$/.test(r.url()) && r.request().method() === 'POST', { timeout: 12000 }).catch(() => null),
    page.locator(`[data-testid="photos-${type}"] input[type="file"]`).setInputFiles(IMG),
  ]);
  await page.waitForTimeout(1200);
  return resp;
}
const chipCount = (type) => page.locator(`[data-testid="photos-${type}"] a.srev-chip`).count();

try {
  await page.goto(FRONTEND + '/', { waitUntil: 'networkidle' });
  await clickText('Operatore');
  await page.waitForLoadState('networkidle');
  await openEsami();
  await shot('before-esami-sezioni.png');

  // AC1/AC2/AC3 — upload in ciascuna delle 3 sezioni
  for (const [type, label] of SECTIONS) {
    const resp = await uploadTo(type);
    ok(`upload ${label} → POST /documents 2xx`, !!resp && resp.status() >= 200 && resp.status() < 300, `status=${resp && resp.status()}`);
    ok(`${label}: chip allegato visibile nella sezione`, (await chipCount(type)) >= 1, `chips=${await chipCount(type)}`);
  }
  await shot('after-upload-3-sezioni.png');

  const before = { esame: await chipCount('esame'), rx: await chipCount('rx'), consulenza: await chipCount('consulenza') };

  // AC4 — persistenza dopo reload, ciascun allegato nella sezione corretta
  await page.reload({ waitUntil: 'networkidle' });
  await clickText('Operatore');
  await page.waitForLoadState('networkidle');
  await openEsami();
  for (const [type, label] of SECTIONS) {
    ok(`AC4 ${label}: allegato persiste nella sezione corretta dopo reload`, (await chipCount(type)) >= 1, `chips=${await chipCount(type)}`);
  }
  await shot('after-refresh-3-sezioni.png');

  ok('nessun NUOVO console error', consoleErrors.filter((e) => !/descendant of|nested|hydration/i.test(e)).length === 0, `err=${consoleErrors.length}`);
  writeFileSync(join(OUT, 'logs', 'upload-persistence.log'),
    `chip prima del reload: ${JSON.stringify(before)}\nchip dopo reload: ${JSON.stringify({ esame: await chipCount('esame'), rx: await chipCount('rx'), consulenza: await chipCount('consulenza') })}\n`);
} finally {
  await ctx.tracing.stop({ path: join(OUT, 'trace', 'trace.zip') });
  writeFileSync(join(OUT, 'logs', 'console-errors.log'), consoleErrors.join('\n') + '\n');
  writeFileSync(join(OUT, 'ui-report.json'), JSON.stringify({ ranAt: new Date().toISOString(), patient: PATIENT, results, consoleErrors }, null, 2));
  await ctx.close();
  await browser.close();
}
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} PASS — evidenze in ${OUT}`);
if (passed !== results.length) process.exit(1);
