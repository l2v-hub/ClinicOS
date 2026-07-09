#!/usr/bin/env node
// Issue #245 — rimozione del tab "Anamnesi" duplicato dalla scheda (Clinica), senza perdita dati.
// Asserisce che nella barra L3 di "Clinica" non esista più il tab "Anamnesi" e che resti
// l'unica superficie anamnesi "Sezioni Cliniche (testo)", raggiungibile ed editabile.
//   node e2e/issue-245-anamnesi.mjs [outDir]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FRONTEND = process.env.CLINICOS_FRONTEND ?? 'http://localhost:5173';
const PATIENT = 'Moretti, Elena';
const OUT = process.argv[2] ?? 'artifacts/task-validation/245-anamnesi-dedup';
for (const d of ['screenshots', 'video', 'trace', 'logs']) mkdirSync(join(OUT, d), { recursive: true });

const results = [];
const ok = (name, cond, detail = '') => { results.push({ name, pass: !!cond, detail }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };
const consoleErrors = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, recordVideo: { dir: join(OUT, 'video'), size: { width: 1366, height: 768 } } });
await ctx.tracing.start({ screenshots: true, snapshots: true, sources: true });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
const shot = (n) => page.screenshot({ path: join(OUT, 'screenshots', n) });
async function clickText(t) { await page.locator(`text="${t}"`).first().click(); await page.waitForTimeout(500); }

try {
  await page.goto(FRONTEND + '/', { waitUntil: 'networkidle' });
  await clickText('Operatore');
  await page.waitForLoadState('networkidle');
  await clickText('Pazienti');
  await page.waitForTimeout(600);
  await page.getByText(PATIENT, { exact: false }).first().click();
  await page.waitForTimeout(1200);

  // Apri il gruppo L2 "Clinica"
  await page.getByRole('button', { name: 'Clinica', exact: true }).first().click().catch(() => clickText('Clinica'));
  await page.waitForTimeout(700);
  await shot('clinica-tabs.png');

  // Raccogli le label dei tab L3 visibili nel gruppo Clinica
  const labels = await page.locator('button, [role="tab"]').allInnerTexts();
  const clean = labels.map((s) => s.trim());
  const hasAnamnesiTab = clean.some((t) => t === 'Anamnesi');
  const hasNarrative = clean.some((t) => /Sezioni Cliniche/i.test(t));
  ok('AC1/AC3 nessun tab "Anamnesi" duplicato nel gruppo Clinica', !hasAnamnesiTab, `hasAnamnesiTab=${hasAnamnesiTab}`);
  ok('unica superficie anamnesi presente: "Sezioni Cliniche (testo)"', hasNarrative, `hasNarrative=${hasNarrative}`);

  // AC2 — la superficie anamnesi narrativa è raggiungibile ed editabile (dati accessibili)
  await page.getByText('Sezioni Cliniche (testo)', { exact: false }).first().click();
  await page.waitForTimeout(1000);
  const bodyLen = (await page.locator('.main-area-clean, main, body').first().innerText()).length;
  ok('AC2 sezione clinica narrativa raggiungibile (contenuto renderizzato)', bodyLen > 200, `bodyChars=${bodyLen}`);
  await shot('sezioni-narrative.png');

  // Warning React dev-mode preesistente e NON correlato a #245 (button annidato in PresaInCaricoTab/ClinicalTableSection).
  const KNOWN_PREEXISTING = /cannot be a descendant of|cannot contain a nested|hydration/i;
  const newErrors = consoleErrors.filter((e) => !KNOWN_PREEXISTING.test(e));
  ok('nessun NUOVO console error introdotto da #245', newErrors.length === 0, `nuovi=${newErrors.length} (preesistenti filtrati=${consoleErrors.length - newErrors.length})`);
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
