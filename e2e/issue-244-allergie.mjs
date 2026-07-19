#!/usr/bin/env node
// Issue #244 — stato allergie esplicito (Presenti / Assenti / Paziente nega) + persistenza.
// Guida la UI reale (scheda paziente → modale Allergie), asserisce gli stati e la persistenza dopo reload.
//   node e2e/issue-244-allergie.mjs [outDir]
// Assume backend :3001 + frontend :5173 attivi con DB seeded.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FRONTEND = process.env.CLINICOS_FRONTEND ?? 'http://localhost:5173';
const PATIENT = 'Moretti, Elena';
const OUT = process.argv[2] ?? 'artifacts/task-validation/244-allergie-negata-assenti';
for (const d of ['screenshots', 'video', 'trace', 'logs'])
  mkdirSync(join(OUT, d), { recursive: true });

const results = [];
const ok = (name, cond, detail = '') => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};
const consoleErrors = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1366, height: 768 },
  recordVideo: { dir: join(OUT, 'video'), size: { width: 1366, height: 768 } },
});
await ctx.tracing.start({ screenshots: true, snapshots: true, sources: true });
const page = await ctx.newPage();
page.on('dialog', (d) => {
  void d.accept();
});
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
const shot = (n) => page.screenshot({ path: join(OUT, 'screenshots', n) });
async function clickText(t) {
  await page.locator(`text="${t}"`).first().click();
  await page.waitForTimeout(500);
}
async function openPatient() {
  await clickText('Pazienti');
  await page.waitForTimeout(600);
  await page.getByText(PATIENT, { exact: false }).first().click();
  await page.waitForTimeout(1200);
}
async function openAllergieModal() {
  await page
    .getByRole('button', { name: /Allergie/i })
    .first()
    .click();
  await page.waitForSelector('[data-testid="allergy-status"]', { timeout: 8000 });
}
async function setStatus(key) {
  const [resp] = await Promise.all([
    page
      .waitForResponse(
        (r) => /\/patients\/.+\/cartella/.test(r.url()) && r.request().method() !== 'GET',
        { timeout: 8000 },
      )
      .catch(() => null),
    page.locator(`[data-testid="allergy-status-${key}"]`).click(),
  ]);
  await page.waitForTimeout(800);
  return resp;
}
function closeModal() {
  return page
    .locator('.modal-close, [aria-label="Chiudi"]')
    .first()
    .click()
    .catch(() => page.keyboard.press('Escape'));
}

try {
  await page.goto(FRONTEND + '/', { waitUntil: 'networkidle' });
  await clickText('Operatore');
  await page.waitForLoadState('networkidle');
  await openPatient();
  await openAllergieModal();
  await shot('before-allergie-modal.png');
  ok(
    'selettore stato allergie visibile',
    await page.locator('[data-testid="allergy-status"]').isVisible(),
  );

  // AC2 — paziente nega
  const r1 = await setStatus('paziente_nega');
  ok(
    'AC2 stato "paziente nega" → badge allergy-denied',
    await page.locator('[data-testid="allergy-denied"]').isVisible(),
  );
  ok(
    'AC2 salvataggio persistito (PUT cartella)',
    !!r1 && r1.status() >= 200 && r1.status() < 300,
    `status=${r1 && r1.status()}`,
  );
  await shot('after-nega.png');

  // AC4 — persistenza dopo reload
  await page.reload({ waitUntil: 'networkidle' });
  await clickText('Operatore');
  await page.waitForLoadState('networkidle');
  await openPatient();
  await openAllergieModal();
  ok(
    'AC4 "paziente nega" persiste dopo reload',
    await page.locator('[data-testid="allergy-denied"]').isVisible(),
  );
  await shot('after-refresh-nega.png');

  // AC1 — assenti
  const r2 = await setStatus('assenti');
  ok(
    'AC1 stato "assenti" → badge allergy-none',
    await page.locator('[data-testid="allergy-none"]').isVisible(),
  );
  ok(
    'AC1 salvataggio persistito (PUT cartella)',
    !!r2 && r2.status() >= 200 && r2.status() < 300,
    `status=${r2 && r2.status()}`,
  );
  await shot('after-assenti.png');

  // AC4 bis — persistenza assenti dopo reload
  await page.reload({ waitUntil: 'networkidle' });
  await clickText('Operatore');
  await page.waitForLoadState('networkidle');
  await openPatient();
  await openAllergieModal();
  ok(
    'AC4 "assenti" persiste dopo reload',
    await page.locator('[data-testid="allergy-none"]').isVisible(),
  );
  await shot('after-refresh-assenti.png');

  // AC3 — aggiungere un allergene forza "presenti" e non perde il dettaglio (conflitto se stato != presenti)
  const r3 = await setStatus('presenti');
  ok(
    'AC3 stato "presenti" selezionabile',
    (await page.locator('[data-testid="allergy-status-presenti"]').getAttribute('aria-checked')) ===
      'true',
    `r3=${r3 && r3.status()}`,
  );
  await shot('after-presenti.png');

  ok('nessun console error', consoleErrors.length === 0, `errors=${consoleErrors.length}`);
} finally {
  await ctx.tracing.stop({ path: join(OUT, 'trace', 'trace.zip') });
  writeFileSync(join(OUT, 'logs', 'console-errors.log'), consoleErrors.join('\n') + '\n');
  writeFileSync(
    join(OUT, 'ui-report.json'),
    JSON.stringify(
      { ranAt: new Date().toISOString(), patient: PATIENT, results, consoleErrors },
      null,
      2,
    ),
  );
  await ctx.close();
  await browser.close();
}
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} PASS — evidenze in ${OUT}`);
if (passed !== results.length) process.exit(1);
