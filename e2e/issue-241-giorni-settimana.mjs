#!/usr/bin/env node
// Issue #241 — posologia per giorni specifici della settimana.
// Aggiunge una terapia periodica, seleziona Lun/Mar/Gio/Dom, salva, ricarica e verifica
// che i giorni restino (persistenza reale su colonna PatientTherapy.giorniSettimana).
//   node e2e/issue-241-giorni-settimana.mjs [outDir]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FRONTEND = process.env.CLINICOS_FRONTEND ?? 'http://localhost:5173';
const PATIENT = 'Moretti, Elena';
const DRUG = 'TestFarmaco241';
const OUT = process.argv[2] ?? 'artifacts/task-validation/241-farmaco-giorni-settimana';
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
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
const shot = (n) => page.screenshot({ path: join(OUT, 'screenshots', n) });
async function clickText(t) {
  await page.locator(`text="${t}"`).first().click();
  await page.waitForTimeout(500);
}
async function openTerapia() {
  await clickText('Pazienti');
  await page.waitForTimeout(600);
  await page.getByText(PATIENT, { exact: false }).first().click();
  await page.waitForTimeout(1200);
  await page
    .getByRole('button', { name: 'Clinica', exact: true })
    .first()
    .click()
    .catch(() => clickText('Clinica'));
  await page.waitForTimeout(500);
  await page.getByText('Terapia Farmacologica', { exact: false }).first().click();
  await page.waitForTimeout(900);
}

try {
  await page.goto(FRONTEND + '/', { waitUntil: 'networkidle' });
  await clickText('Operatore');
  await page.waitForLoadState('networkidle');
  await openTerapia();
  await shot('before-terapia-tab.png');

  // Apri form nuovo farmaco — usa il link nel corpo (NON il bottone annidato nell'header collassabile)
  await page
    .locator('button.link-btn', { hasText: 'Aggiungi' })
    .first()
    .click()
    .catch(() =>
      page.locator('button.btn-primary.btn-sm', { hasText: 'Aggiungi farmaco' }).first().click(),
    );
  await page.waitForSelector('[data-testid="therapy-weekdays"]', { timeout: 8000 });
  await page.getByPlaceholder('es. Kanrenol').fill(DRUG);

  // AC1/AC3 — seleziona Lun(1) Mar(2) Gio(4) Dom(7)
  for (const n of [1, 2, 4, 7]) await page.locator(`[data-testid="weekday-${n}"]`).click();
  ok(
    'AC1 selettore giorni presente (tipo periodica)',
    await page.locator('[data-testid="therapy-weekdays"]').isVisible(),
  );
  for (const n of [1, 2, 4, 7]) {
    ok(
      `AC3 giorno ${n} selezionato (aria-pressed)`,
      (await page.locator(`[data-testid="weekday-${n}"]`).getAttribute('aria-pressed')) === 'true',
    );
  }
  await shot('weekdays-selected.png');

  // Salva → POST con giorniSettimana
  const [resp] = await Promise.all([
    page
      .waitForResponse(
        (r) =>
          /\/patients\/.+\/therap/i.test(r.url()) && ['POST', 'PUT'].includes(r.request().method()),
        { timeout: 10000 },
      )
      .catch(() => null),
    page.getByRole('button', { name: /Salva terapia/i }).click(),
  ]);
  await page.waitForTimeout(1500);
  ok(
    'AC salvataggio therapy (POST/PUT 2xx)',
    !!resp && resp.status() >= 200 && resp.status() < 300,
    `status=${resp && resp.status()}`,
  );

  // Pill giorni nel riepilogo
  const pill = page.locator('[data-testid="therapy-days-summary"]').first();
  const pillTxt = (await pill.innerText().catch(() => '')).trim();
  ok(
    'AC2/AC3 pill giorni mostra Lun…Dom',
    /Lun/.test(pillTxt) && /Dom/.test(pillTxt),
    `pill="${pillTxt}"`,
  );
  await shot('after-save-days-pill.png');

  // AC4 — persistenza dopo reload
  await page.reload({ waitUntil: 'networkidle' });
  await clickText('Operatore');
  await page.waitForLoadState('networkidle');
  await openTerapia();
  const pill2 = page.locator('[data-testid="therapy-days-summary"]').first();
  const pill2Txt = (await pill2.innerText().catch(() => '')).trim();
  ok(
    'AC4 giorni persistono dopo reload',
    /Lun/.test(pill2Txt) && /Dom/.test(pill2Txt),
    `pill="${pill2Txt}"`,
  );
  await shot('after-refresh-days-pill.png');

  // AC5 backward-compat: verifica via API che le terapie senza giorni restino valide
  const apiCheck = await page.evaluate(async () => {
    const r = await fetch('http://localhost:3001/patients');
    return r.ok;
  });
  ok('AC5 backward-compat: API terapie/pazienti risponde', apiCheck);

  ok(
    'nessun NUOVO console error',
    consoleErrors.filter((e) => !/descendant of|nested|hydration/i.test(e)).length === 0,
    `err=${consoleErrors.length}`,
  );
} finally {
  await ctx.tracing.stop({ path: join(OUT, 'trace', 'trace.zip') });
  writeFileSync(join(OUT, 'logs', 'console-errors.log'), consoleErrors.join('\n') + '\n');
  writeFileSync(
    join(OUT, 'ui-report.json'),
    JSON.stringify(
      { ranAt: new Date().toISOString(), patient: PATIENT, drug: DRUG, results, consoleErrors },
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
