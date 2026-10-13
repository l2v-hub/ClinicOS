// #450 (decisione del responsabile 13/10/2026: resta la pagina completa, correzioni minime).
// Una sola opzione documenti; «Ingresso» non completata con i soli data/ora automatici; niente
// riquadro che ripete l'anagrafica né testi ovvi; la creazione a mano funziona (paziente nel DB).
// LOCAL synthetic stack only. Usage (repo root):
//   DATABASE_URL=<local DB> [TRACE=1] node scripts/e2e/issue-450-ingresso.mjs <outDir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import pg from 'pg';

const FRONT = process.env.FRONT ?? 'http://127.0.0.1:5211';
const OUT = process.argv[2] ?? 'artifacts/task-validation/450-ingresso-correzioni-minime';
const DB = process.env.DATABASE_URL;
if (!DB || !/127\.0\.0\.1|localhost/.test(DB)) throw new Error('DATABASE_URL must be a LOCAL DB');
for (const d of ['screenshots', 'trace', 'test-results'])
  mkdirSync(`${OUT}/${d}`, { recursive: true });

const db = new pg.Client({ connectionString: DB });
await db.connect();
const results = [];
const consoleErrors = [];
const check = (id, name, ok, detail = '') => {
  results.push({ id, name, result: ok ? 'PASS' : 'FAIL', detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1180, height: 820 },
  hasTouch: true,
});
if (process.env.TRACE) await context.tracing.start({ screenshots: true, snapshots: true });
const page = await context.newPage();
page.on('console', (m) => {
  if (m.type() === 'error' && !/Failed to load resource/.test(m.text()))
    consoleErrors.push(m.text().slice(0, 200));
});
await page.goto(FRONT);
await page
  .getByRole('button', { name: /Infermiere 1/ })
  .first()
  .click();
await page.waitForSelector('.teams-sidebar', { timeout: 30000 });
await page.locator('.teams-sidebar').getByRole('button', { name: 'Pazienti' }).click();
await page.getByRole('button', { name: /^Nuovo ingresso$/ }).click();
await page.waitForSelector('.nps__options', { timeout: 15000 });
await page.screenshot({ path: `${OUT}/screenshots/01-nuovo-ingresso.png` });
const options = await page.locator('.nps-option .nps-option__title').allTextContents();
const how = await page.getByText('Come funziona').count();
check(
  'AC1',
  'one documents option (letter or transfer) plus «A mano», no explainer box',
  options.length === 2 &&
    /Lettera o trasferimento/.test(options[0]) &&
    options[1] === 'A mano' &&
    how === 0,
  JSON.stringify(options),
);

await page.getByText('A mano', { exact: true }).click();
await page.waitForSelector('.intake-index', { timeout: 15000 });
await page.waitForTimeout(1500);
const ingressoStatus = await page.evaluate(() => {
  const item = [...document.querySelectorAll('.intake-index__item')].find((el) =>
    /Ingresso/.test(el.querySelector('.intake-index__label')?.textContent ?? ''),
  );
  return {
    done: !!item?.querySelector('.intake-index__mark--done'),
    text: item?.querySelector('.ds-sr-only')?.textContent ?? null,
  };
});
const presa = await page
  .locator('input[type=date]')
  .nth(1)
  .inputValue()
  .catch(() => '');
await page.screenshot({ path: `${OUT}/screenshots/02-a-mano-apertura.png` });
check(
  'AC2',
  '«Ingresso» is not complete when only the automatic date/time are set',
  !ingressoStatus.done && !/completata/.test(ingressoStatus.text ?? ''),
  JSON.stringify({ ...ingressoStatus, presa }),
);

const anagrafica = await page.locator('#intake-sec-anagrafica').innerText();
check(
  'AC3',
  'no box repeating the demographics, no required-fields paragraph, no obvious hints',
  !/Anagrafica da completare|Per registrare l’ingresso servono|Gli altri dati possono essere completati|Usato per calcolare il CF|Sigla provincia/.test(
    anagrafica,
  ),
  anagrafica.slice(0, 120).replace(/\s+/g, ' '),
);

// creazione a mano (dati sintetici): il codice fiscale lo calcola l'app
const MARK = `Prova${Date.now().toString().slice(-6)}`;
await page
  .getByLabel(/^Cognome/)
  .first()
  .fill(MARK);
await page.getByLabel(/^Nome/).first().fill('Ingresso');
// data di nascita diversa a ogni giro: lo stesso codice fiscale sarebbe (giustamente) un duplicato
const n = Date.now();
const birth = `${1925 + (n % 50)}-${String(1 + ((n >> 6) % 12)).padStart(2, '0')}-${String(1 + ((n >> 10) % 28)).padStart(2, '0')}`;
await page.locator('[data-demographic-field="dateOfBirth"]').fill(birth);
await page
  .locator('#intake-sec-anagrafica .npm-field', { hasText: 'Sesso' })
  .locator('select')
  .selectOption('F');
await page.getByLabel(/^Comune di nascita/).fill('Milano');
await page.getByLabel(/^Provincia di nascita/).fill('MI');
await page.waitForTimeout(1500);
const cf = await page.locator('[data-demographic-field="codiceFiscale"]').inputValue();
await page.screenshot({ path: `${OUT}/screenshots/03-anagrafica-compilata.png` });
await page.getByRole('button', { name: /Crea paziente/ }).click();
await page.waitForTimeout(4000);
await page.screenshot({ path: `${OUT}/screenshots/04-dopo-crea.png` });
const created = (
  await db.query(`SELECT id, "codiceFiscale" FROM "Patient" WHERE "lastName" = $1`, [MARK])
).rows[0];
check(
  'AC4',
  'manual creation still works (patient in the local DB)',
  !!created,
  `CF ${cf} · ${created?.id ?? 'missing'}`,
);

if (process.env.TRACE) await context.tracing.stop({ path: `${OUT}/trace/ingresso.zip` });
await browser.close();
await db.end();
const pass = results.every((r) => r.result === 'PASS');
writeFileSync(
  `${OUT}/test-results/ingresso-${process.env.LABEL ?? 'run'}.json`,
  JSON.stringify({ pass, results, consoleErrors }, null, 2),
);
console.log(pass ? 'PASS #450' : 'FAIL #450', '| console errors:', consoleErrors.length);
process.exit(pass ? 0 : 1);
