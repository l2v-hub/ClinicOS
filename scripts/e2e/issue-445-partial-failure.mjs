// #445 QA regression — an outcome possibly already written is never re-proposed and overwritten.
// Three scenarios on Nanni's 08:00 block (Ramipril + Metformina), today's doses reset before each:
//  S1 the first /confirm fails (500) while Metformina is refused → refusal kept, reopen sends only
//     the failed dose once the queue re-reads.
//  S2 the refusal reaches the server but the reply is lost → «esito incerto», Metformina stays out
//     of the panel and the DB keeps non_erogata.
//  S3 the refusal fails without being written (500) → it comes back after the re-read with the
//     nurse's «Rifiutata dal paziente» still chosen, never as «Somministrata».
// LOCAL synthetic stack only. Usage (repo root):
//   DATABASE_URL=<local DB> node scripts/e2e/issue-445-partial-failure.mjs <outDir>
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
const results = [];
const check = (id, name, ok, detail = '') => {
  results.push({ id, name, result: ok ? 'PASS' : 'FAIL', detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? ' — ' + detail : ''}`);
};
const rowsDb = async () =>
  (
    await db.query(
      `SELECT "farmacoNome", stato, motivo FROM "MedicationAdministration" WHERE date=$1 AND "patientId"=$2 ORDER BY "farmacoNome"`,
      [today, nanni],
    )
  ).rows;

const browser = await chromium.launch();

/** Fresh session on the Turno with today's Nanni doses reset; returns page, block and the POSTs. */
async function open() {
  await db.query(`DELETE FROM "MedicationAdministration" WHERE date=$1 AND "patientId"=$2`, [
    today,
    nanni,
  ]);
  const page = await (
    await browser.newContext({ viewport: { width: 1180, height: 820 } })
  ).newPage();
  const posts = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && /therapy-slots\/(confirm|not-administered)$/.test(r.url()))
      posts.push(new URL(r.url()).pathname);
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
  return { page, posts, block: page.locator('.adesso-dose__block').nth(index) };
}
const panelOf = (block) => block.locator('.turno-dose-panel');
async function refuseSecond(block) {
  const row = panelOf(block).locator('.turno-dose-panel__row', { hasText: 'Metformina' });
  await row.getByRole('button', { name: /^Altro esito:/ }).click();
  await row.getByRole('button', { name: 'Rifiutata dal paziente' }).click();
}
/** Waits until the queue re-read after the attempt has landed (no dose «in verifica» left). */
const settled = (block) =>
  block
    .page()
    .waitForFunction(() => !document.querySelector('.adesso-dose__held'), null, { timeout: 15000 });

// ── S1: 500 on the first /confirm, Metformina refused ───────────────────────────────────────────
{
  const { page, posts, block } = await open();
  let fail = true;
  await page.route('**/therapy-slots/confirm', (route) => {
    if (fail) {
      fail = false;
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: '{"error":"Errore simulato"}',
      });
    }
    return route.continue();
  });
  await block.locator('button', { hasText: /^Somministra \d+$/ }).click();
  await refuseSecond(block);
  await panelOf(block)
    .getByRole('button', { name: /^Conferma/ })
    .click();
  await panelOf(block).locator('.turno-dose-panel__error').first().waitFor({ timeout: 10000 });
  await page.screenshot({ path: `${OUT}/screenshots/qa-s1-errore-parziale.png` });
  const afterFail = await rowsDb();
  check(
    'S1a',
    'refusal written, failed dose not written',
    afterFail.length === 1 &&
      afterFail[0].stato === 'non_erogata' &&
      afterFail[0].motivo === 'rifiutata_paziente',
    JSON.stringify(afterFail),
  );
  await panelOf(block).getByRole('button', { name: 'Annulla' }).click();
  await settled(block);
  posts.length = 0;
  await block
    .locator('button', { hasText: /^Somministra/ })
    .first()
    .click();
  const rows = await panelOf(block).locator('.turno-dose-panel__drug').allTextContents();
  await panelOf(block)
    .getByRole('button', { name: /^Conferma/ })
    .click();
  await page.waitForTimeout(2500);
  const final = await rowsDb();
  check(
    'S1b',
    'reopen lists only the failed dose and sends one write',
    rows.length === 1 &&
      !rows[0].includes('Metformina') &&
      posts.length === 1 &&
      posts[0] === '/therapy-slots/confirm',
    `${JSON.stringify(rows)} · ${JSON.stringify(posts)}`,
  );
  check(
    'S1c',
    'refusal never overwritten',
    final.find((r) => r.farmacoNome === 'Metformina')?.stato === 'non_erogata' &&
      final.find((r) => r.farmacoNome === 'Ramipril')?.stato === 'erogata',
    JSON.stringify(final),
  );
  await page.context().close();
}

// ── S2: refusal written, reply lost ─────────────────────────────────────────────────────────────
{
  const { page, posts, block } = await open();
  await page.route('**/therapy-slots/not-administered', async (route) => {
    await route.fetch(); // the server writes…
    return route.abort('connectionreset'); // …the tablet never hears back
  });
  await block.locator('button', { hasText: /^Somministra \d+$/ }).click();
  await panelOf(block).locator('input[type=checkbox]').first().uncheck(); // only Metformina
  await refuseSecond(block);
  await panelOf(block)
    .getByRole('button', { name: /^Conferma/ })
    .click();
  const error = panelOf(block).locator('.turno-dose-panel__error').first();
  await error.waitFor({ timeout: 10000 });
  const errorText = await error.textContent();
  await page.screenshot({ path: `${OUT}/screenshots/qa-s2-risposta-persa.png` });
  check(
    'S2a',
    'lost reply says the outcome is uncertain, not «non registrata»',
    /esito incerto/.test(errorText) && !/non è stata registrata/.test(errorText),
    errorText,
  );
  await panelOf(block).getByRole('button', { name: 'Annulla' }).click();
  await settled(block);
  posts.length = 0;
  await block
    .locator('button', { hasText: /^Somministra/ })
    .first()
    .click();
  const rows = await panelOf(block).locator('.turno-dose-panel__drug').allTextContents();
  await panelOf(block)
    .getByRole('button', { name: /^Conferma/ })
    .click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/screenshots/qa-s2-riapertura.png` });
  const final = await rowsDb();
  check(
    'S2b',
    'reopen never proposes the possibly written refusal',
    rows.length === 1 &&
      !rows[0].includes('Metformina') &&
      !posts.includes('/therapy-slots/not-administered'),
    `${JSON.stringify(rows)} · ${JSON.stringify(posts)}`,
  );
  check(
    'S2c',
    'DB keeps the refusal',
    final.find((r) => r.farmacoNome === 'Metformina')?.stato === 'non_erogata' &&
      final.find((r) => r.farmacoNome === 'Metformina')?.motivo === 'rifiutata_paziente',
    JSON.stringify(final),
  );
  await page.context().close();
}

// ── S3: refusal NOT written (500) → comes back with the refusal still chosen ────────────────────
{
  const { page, block } = await open();
  await page.route('**/therapy-slots/not-administered', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: '{"error":"Errore simulato"}',
    }),
  );
  await block.locator('button', { hasText: /^Somministra \d+$/ }).click();
  await panelOf(block).locator('input[type=checkbox]').first().uncheck();
  await refuseSecond(block);
  await panelOf(block)
    .getByRole('button', { name: /^Conferma/ })
    .click();
  await panelOf(block).locator('.turno-dose-panel__error').first().waitFor({ timeout: 10000 });
  await panelOf(block).getByRole('button', { name: 'Annulla' }).click();
  await settled(block);
  await block
    .locator('button', { hasText: /^Somministra/ })
    .first()
    .click();
  const metformina = panelOf(block).locator('.turno-dose-panel__row', { hasText: 'Metformina' });
  const note = (await metformina.locator('.turno-dose-panel__note').textContent()).trim();
  await page.screenshot({ path: `${OUT}/screenshots/qa-s3-scelta-mantenuta.png` });
  check(
    'S3',
    'a refusal that was not written comes back still refused, never as «Somministrata»',
    (await metformina.count()) === 1 &&
      /Rifiutata dal paziente/.test(note) &&
      (await rowsDb()).length === 0,
    note,
  );
  await page.context().close();
}

await browser.close();
await db.end();
const pass = results.every((r) => r.result === 'PASS');
writeFileSync(
  `${OUT}/test-results/partial-failure.json`,
  JSON.stringify({ pass, results }, null, 2),
);
console.log(pass ? 'PASS #445 partial failure' : 'FAIL #445 partial failure');
process.exit(pass ? 0 : 1);
