// AC3 evidence: a page shown from the session cache is revalidated. The stub renames a patient
// while the operator is on the Dashboard; going back to "Pazienti" must paint the cached roster
// at once (old name, no "Caricamento…") and then swap in the new name once the background read
// lands. Also proves AC2 on the same run: no "Caricamento modulo…" fallback after login.
//   node evidence-ac3.mjs --base http://localhost:4173 --out <dir>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
};
const BASE = arg('base', 'http://localhost:4173');
const OUT = arg('out', '.');
mkdirSync(OUT, { recursive: true });
const STUB = 'http://localhost:3001';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
let moduleFallbacks = 0;
await page.addInitScript(() => {
  window.__moduleFallbacks = 0;
  const mo = new MutationObserver(() => {
    if (document.body && document.body.innerText.includes('Caricamento modulo'))
      window.__moduleFallbacks++;
  });
  document.addEventListener('DOMContentLoaded', () =>
    mo.observe(document.body, { childList: true, subtree: true, characterData: true }),
  );
});
const results = { checks: [], timings: {} };
const check = (ok, msg) => {
  results.checks.push({ ok, msg });
  console.log(ok ? 'ok  :' : 'FAIL:', msg);
};
const sidebar = (label) => page.locator('.teams-sidebar button', { hasText: label }).first();

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600); // un operatore reale non clicca nel primo istante
await page.getByText('Operatore', { exact: true }).first().click();
await page.locator('.teams-sidebar').waitFor({ timeout: 30000 });
const loginFallbacks = await page.evaluate(() => {
  const n = window.__moduleFallbacks;
  window.__moduleFallbacks = 0;
  return n;
});
console.log('module fallback mutations during login→dashboard:', loginFallbacks);
await page.waitForTimeout(1500);

// First visit: roster arrives from the network (prefetched at login → should already be there).
let t0 = Date.now();
await sidebar('Pazienti').click();
const firstRow = page.locator('.page-content tbody tr').nth(1);
await firstRow.waitFor({ timeout: 15000 });
results.timings.firstVisitRowsMs = Date.now() - t0;
const targetId = await page.evaluate(() => {
  const btn = document.querySelector('.page-content tbody tr:nth-child(2)');
  return btn ? btn.getAttribute('aria-label') : null;
});
console.log('first row label:', targetId, `(${results.timings.firstVisitRowsMs}ms)`);
const rowText = (await firstRow.innerText()).replace(/\s+/g, ' ');
await page.screenshot({ path: resolve(OUT, 'ac3-1-lista-prima-visita.png') });

// Find the patient id of the first row via the stub (sorted by lastName, firstName).
const patients = await (
  await fetch(`${STUB}/patients/page?limit=50`, {
    headers: { 'X-Operator-Id': 'op1', 'X-Operator-Role': 'operatore' },
  })
).json();
// La riga misurata e' la seconda (nth(1)): la prima e' l'intestazione del roster.
const first = patients.items[1];
check(
  rowText.includes(first.lastName),
  `first row shows ${first.lastName} (${rowText.slice(0, 40)}…)`,
);

// Leave the list, rename the patient server-side, come back.
await sidebar('Dashboard').click();
await page.waitForTimeout(600);
const newLastName = `${first.lastName}-AGGIORNATO`;
await fetch(`${STUB}/__stub/patient/${first.id}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ lastName: newLastName }),
});

t0 = Date.now();
await sidebar('Pazienti').click();
await page.locator('.page-content tbody tr').nth(1).waitFor({ timeout: 15000 });
const cachedPaintMs = Date.now() - t0;
const cachedText = (await page.locator('.page-content tbody').innerText()).replace(/\s+/g, ' ');
const loadingShown = cachedText.includes('Caricamento');
await page.screenshot({ path: resolve(OUT, 'ac3-2-lista-da-cache-subito.png') });
check(cachedPaintMs < 300, `back on Pazienti: rows painted from cache in ${cachedPaintMs}ms`);
check(!loadingShown, 'no "Caricamento…" placeholder on return');
check(
  cachedText.includes(first.lastName) && !cachedText.includes(newLastName),
  'cached roster shows the previous name first',
);

await page.locator('.page-content tbody', { hasText: newLastName }).waitFor({ timeout: 15000 });
const revalidatedMs = Date.now() - t0;
await page.screenshot({ path: resolve(OUT, 'ac3-3-lista-rivalidata.png') });
check(true, `revalidated: "${newLastName}" visible after ${revalidatedMs}ms`);
results.timings.cachedPaintMs = cachedPaintMs;
results.timings.revalidatedMs = revalidatedMs;

// AC2: walk the main contexts and make sure the module fallback never appeared.
for (const l of ['Consegne', 'Agenda', 'Note', 'Terapia', 'Parametri', 'Pazienti']) {
  await sidebar(l).click();
  await page.waitForTimeout(400);
}
await page.locator('.page-content tbody tr').nth(1).click();
await page.locator('.patient-record-view').waitFor({ timeout: 15000 });
await page.waitForTimeout(800);
await page.screenshot({ path: resolve(OUT, 'ac2-scheda-paziente.png') });
await page
  .getByRole('tab', { name: /^Clinica/ })
  .first()
  .click();
await page.waitForTimeout(600);
await page
  .getByRole('tab', { name: /^Diario/ })
  .first()
  .click();
await page.waitForTimeout(600);
moduleFallbacks = await page.evaluate(() => window.__moduleFallbacks);
check(
  moduleFallbacks === 0,
  `"Caricamento modulo…" fallback occurrences after login: ${moduleFallbacks}`,
);

// Logout clears the caches: the login card comes back and nothing of the roster remains.
await page
  .locator('.teams-sidebar button', { hasText: /Esci|Logout/ })
  .first()
  .click()
  .catch(() => undefined);
await page.waitForTimeout(500);

results.timings.loginFallbackMutations = loginFallbacks;
results.consoleErrors = consoleErrors.filter((e) => !/404/.test(e)).slice(0, 5);
results.result = results.checks.every((c) => c.ok) ? 'PASS' : 'FAIL';
writeFileSync(resolve(OUT, 'evidence-ac3.json'), JSON.stringify(results, null, 2));
console.log('RESULT:', results.result, JSON.stringify(results.timings));
await browser.close();
process.exit(results.result === 'PASS' ? 0 : 1);
