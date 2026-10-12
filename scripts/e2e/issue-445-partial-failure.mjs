// #445 QA regression — a dose refused in a partially failed «Conferma» must never be re-proposed
// and overwritten as administered. Scenario from the independent QA: first /confirm fails (500),
// the second dose is recorded as «Rifiutata dal paziente», then «Annulla» and reopen at once.
// LOCAL synthetic stack only. Resets today's doses of the target block first (local DB only).
// Usage (repo root): DATABASE_URL=<local DB> node scripts/e2e/issue-445-partial-failure.mjs <outDir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import pg from 'pg';

const FRONT = process.env.FRONT ?? 'http://127.0.0.1:5211';
const OUT =
  process.argv[2] ?? 'artifacts/task-validation/445-turno-infermiere-somministra-sul-posto';
const DB = process.env.DATABASE_URL;
if (!DB || !/127\.0\.0\.1|localhost/.test(DB)) throw new Error('DATABASE_URL must be a LOCAL DB');
mkdirSync(`${OUT}/screenshots`, { recursive: true });
mkdirSync(`${OUT}/test-results`, { recursive: true });

const db = new pg.Client({ connectionString: DB });
await db.connect();
const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
const nanni = (
  await db.query(`SELECT id FROM "Patient" WHERE "medicalRecordNumber"='DEMO-P10-Miriam-Nanni'`)
).rows[0]?.id;
await db.query(`DELETE FROM "MedicationAdministration" WHERE date=$1 AND "patientId"=$2`, [
  today,
  nanni,
]);

const results = [];
const check = (id, name, ok, detail = '') => {
  results.push({ id, name, result: ok ? 'PASS' : 'FAIL', detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? ' — ' + detail : ''}`);
};
const rowsDb = async () =>
  (
    await db.query(
      `SELECT "farmacoNome", ora, stato, motivo FROM "MedicationAdministration" WHERE date=$1 AND "patientId"=$2 ORDER BY "farmacoNome"`,
      [today, nanni],
    )
  ).rows;

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1180, height: 820 } })).newPage();
const posts = [];
page.on('request', (r) => {
  if (r.method() === 'POST' && /therapy-slots\/(confirm|not-administered)$/.test(r.url()))
    posts.push({ url: new URL(r.url()).pathname, therapyId: r.postDataJSON()?.therapyId });
});
await page.goto(FRONT);
await page
  .getByRole('button', { name: /Infermiere 1/ })
  .first()
  .click();
await page.waitForSelector('.adesso-queue', { timeout: 30000 });
await page.waitForTimeout(3000);

const index = await page.evaluate(() =>
  [...document.querySelectorAll('.adesso-dose__block')].findIndex(
    (b) =>
      /Nanni Miriam/.test(b.querySelector('.adesso-dose__who')?.textContent ?? '') &&
      b.querySelectorAll('.adesso-dose__drugs li').length >= 2,
  ),
);
if (index < 0) throw new Error('no Nanni block with 2 doses: check the seed / time of day');
const block = page.locator('.adesso-dose__block').nth(index);

// 1) il primo /confirm fallisce; la seconda dose è rifiutata dal paziente
let failNext = true;
await page.route('**/therapy-slots/confirm', (route) => {
  if (failNext) {
    failNext = false;
    return route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: '{"error":"Errore simulato"}',
    });
  }
  return route.continue();
});
await block.locator('button', { hasText: /^Somministra \d+$/ }).click();
const panel = block.locator('.turno-dose-panel');
await panel
  .getByRole('button', { name: /^Altro esito:/ })
  .nth(1)
  .click();
await panel.getByRole('button', { name: 'Rifiutata dal paziente' }).click();
await panel.getByRole('button', { name: /^Conferma/ }).click();
await panel.locator('.turno-dose-panel__error').first().waitFor({ timeout: 10000 });
await page.screenshot({ path: `${OUT}/screenshots/qa-01-errore-parziale.png` });
const afterFail = await rowsDb();
check(
  'R1',
  'partial failure: the refused dose is written, the failed one is not',
  afterFail.length === 1 &&
    afterFail[0].stato === 'non_erogata' &&
    afterFail[0].motivo === 'rifiutata_paziente',
  JSON.stringify(afterFail),
);

// 2) «Annulla» subito: il blocco non ripropone la dose già registrata
await panel.getByRole('button', { name: 'Annulla' }).click();
const drugsNow = await block.locator('.adesso-dose__drugs li').allTextContents();
const button = (
  await block
    .locator('button', { hasText: /^Somministra/ })
    .first()
    .textContent()
).trim();
await page.screenshot({ path: `${OUT}/screenshots/qa-02-dopo-annulla.png` });
check(
  'R2',
  'after «Annulla» the block keeps only the dose not yet recorded',
  drugsNow.length === 1 &&
    button === 'Somministra' &&
    !drugsNow.some((d) => d.includes(afterFail[0].farmacoNome)),
  `${JSON.stringify(drugsNow)} · ${button}`,
);

// 3) riapertura e conferma: solo la dose fallita parte; il rifiuto resta
posts.length = 0;
await block
  .locator('button', { hasText: /^Somministra/ })
  .first()
  .click();
const rows = await block.locator('.turno-dose-panel__row').count();
await block
  .locator('.turno-dose-panel')
  .getByRole('button', { name: /^Conferma/ })
  .click();
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/screenshots/qa-03-riapertura.png` });
const final = await rowsDb();
check(
  'R3',
  'reopen lists one dose and sends one write',
  rows === 1 && posts.length === 1 && posts[0].url === '/therapy-slots/confirm',
  `rows ${rows}, posts ${JSON.stringify(posts)}`,
);
check(
  'R4',
  'the refusal is never overwritten as administered',
  final.length === 2 &&
    final.some((r) => r.stato === 'non_erogata' && r.motivo === 'rifiutata_paziente') &&
    final.some((r) => r.stato === 'erogata') &&
    final.find((r) => r.farmacoNome === afterFail[0].farmacoNome)?.stato === 'non_erogata',
  JSON.stringify(final),
);

await browser.close();
await db.end();
const pass = results.every((r) => r.result === 'PASS');
writeFileSync(
  `${OUT}/test-results/partial-failure.json`,
  JSON.stringify({ pass, results }, null, 2),
);
console.log(pass ? 'PASS #445 partial failure' : 'FAIL #445 partial failure');
process.exit(pass ? 0 : 1);
