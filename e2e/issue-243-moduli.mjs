#!/usr/bin/env node
// Issue #243 — sezione "Moduli" operativa (griglia) invece del messaggio "in arrivo".
// Apre il wizard di presa in carico, avanza allo step 4 "Moduli" e asserisce la griglia
// dei moduli operativi (nessun "Moduli configurabili — in arrivo").
//   node e2e/issue-243-moduli.mjs [outDir]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FRONTEND = process.env.CLINICOS_FRONTEND ?? 'http://localhost:5173';
const OUT = process.argv[2] ?? 'artifacts/task-validation/243-moduli-section-operative';
for (const d of ['screenshots', 'video', 'trace', 'logs']) mkdirSync(join(OUT, d), { recursive: true });

const results = [];
const ok = (name, cond, detail = '') => { results.push({ name, pass: !!cond, detail }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };
const consoleErrors = [];
const MODULES = ['medicazioni', 'contenzioni', 'braden', 'tinetti', 'nrs', 'dimissione'];

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

  // Apri il wizard "Nuovo paziente"
  await page.getByRole('button', { name: /Nuovo paziente/i }).click();
  await page.waitForSelector('[data-testid="intake-step-1"]', { timeout: 10000 });
  await page.waitForTimeout(800);

  // Step 1 — anagrafica minima valida (dati sintetici)
  const nome = page.getByPlaceholder('Mario', { exact: true });
  await nome.click(); await nome.pressSequentially('Test', { delay: 20 });
  const cognome = page.getByPlaceholder('Rossi', { exact: true });
  await cognome.click(); await cognome.pressSequentially('Moduli243', { delay: 20 });
  const dob = page.locator('[data-testid="intake-step-1"] input[type="date"]');
  await dob.fill('1980-01-01');
  await dob.press('Tab');
  await page.waitForTimeout(800);
  ok('step 1 anagrafica compilata, wizard aperto', await page.locator('[data-testid="patient-intake-body"]').isVisible());

  // Avanti fino allo step 4 "Moduli" — avanza finché lo stepper è su "4. Moduli"
  const activeStepTxt = () => page.locator('[data-testid="patient-intake-stepper"] .is-active').innerText().catch(() => '');
  for (let guard = 0; guard < 8; guard++) {
    const cur = (await activeStepTxt()).trim();
    if (/Moduli/i.test(cur)) break;
    await page.locator('footer button.btn-primary').click({ timeout: 6000 });
    await page.waitForTimeout(1200);
  }
  await page.waitForSelector('[data-testid="intake-modules-grid"]', { timeout: 8000 });
  await shot('intake-step4-moduli.png');

  // Assert: stepper su "4. Moduli" attivo
  const activeStep = (await page.locator('[data-testid="patient-intake-stepper"] .is-active').innerText().catch(() => '')).trim();
  ok('step 4 "Moduli" attivo', /Moduli/i.test(activeStep), `active=${activeStep}`);

  // AC1 — nessun messaggio "in arrivo" bloccante
  const bodyTxt = await page.locator('[data-testid="patient-intake-body"]').innerText();
  ok('AC1 nessun "Moduli configurabili — in arrivo"', !/Moduli configurabili\s*[—-]\s*in arrivo/i.test(bodyTxt), `snippet=${bodyTxt.slice(0,60)}`);

  // AC2 — griglia moduli disponibili
  ok('AC2 griglia moduli visibile', await page.locator('[data-testid="intake-modules-grid"]').isVisible());
  let cardsOk = 0;
  for (const m of MODULES) {
    const vis = await page.locator(`[data-testid="intake-module-${m}"]`).isVisible().catch(() => false);
    if (vis) cardsOk++;
  }
  ok('AC2 tutte le 6 card moduli presenti', cardsOk === MODULES.length, `card=${cardsOk}/${MODULES.length}`);

  // AC3 — ogni card ha uno status-badge (Disponibile / In arrivo non bloccante)
  const badges = await page.locator('[data-testid="intake-modules-grid"] .status-badge').count();
  ok('AC3 badge di stato per ogni modulo', badges >= MODULES.length, `badge=${badges}`);

  // chiudi senza creare paziente
  await page.getByRole('button', { name: /Annulla/i }).click().catch(() => {});
  ok('nessun console error', consoleErrors.filter((e) => !/descendant of|nested|hydration/i.test(e)).length === 0, `errors=${consoleErrors.length}`);
} finally {
  await ctx.tracing.stop({ path: join(OUT, 'trace', 'trace.zip') });
  writeFileSync(join(OUT, 'logs', 'console-errors.log'), consoleErrors.join('\n') + '\n');
  writeFileSync(join(OUT, 'ui-report.json'), JSON.stringify({ ranAt: new Date().toISOString(), results, consoleErrors }, null, 2));
  await ctx.close();
  await browser.close();
}
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} PASS — evidenze in ${OUT}`);
if (passed !== results.length) process.exit(1);
