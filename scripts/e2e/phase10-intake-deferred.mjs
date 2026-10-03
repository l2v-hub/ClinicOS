// Phase 10 — owner bug P10-INT-1 (local synthetic stack only): an intake draft holding a therapy
// row deferred for a document conflict must not offer «Reincludi», must keep autosaving and must
// not block «Crea paziente».
// Usage: DATABASE_URL=<local DB> node scripts/e2e/phase10-intake-deferred.mjs <outDir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import pg from 'pg';

const FRONT = process.env.FRONT ?? 'http://127.0.0.1:5199';
const OUT = process.argv[2] ?? 'artifacts/phase10-intake';
const DB = process.env.DATABASE_URL;
if (!DB || !/127\.0\.0\.1|localhost/.test(DB)) throw new Error('DATABASE_URL must be a LOCAL DB');
mkdirSync(`${OUT}/screens`, { recursive: true });
const db = new pg.Client({ connectionString: DB });
await db.connect();
const results = [];
const http = [];
const check = (id, name, ok, detail = '') => {
  results.push({ id, name, result: ok ? 'PASS' : 'FAIL', detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1180, height: 820 },
  hasTouch: true,
});
await context.tracing.start({ screenshots: true, snapshots: true });
const page = await context.newPage();
page.on('response', (r) => {
  if (r.status() >= 400 && /intake/.test(r.url()))
    http.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
});
const shot = (n) => page.screenshot({ path: `${OUT}/screens/${n}.png` });
try {
  await page.goto(FRONT);
  await page
    .getByRole('button', { name: /Infermiere 1/ })
    .first()
    .click();
  await page.waitForSelector('.teams-sidebar', { timeout: 20000 });
  await page.locator('.teams-sidebar').getByRole('button', { name: 'Pazienti' }).click();
  await page.getByRole('button', { name: /^Nuovo ingresso$/ }).click();
  await page.getByText('A mano', { exact: true }).click();
  await page
    .getByText(/Bozza (in compilazione|salvata)/)
    .first()
    .waitFor({ timeout: 15000 });
  const draft = (
    await db.query(
      `SELECT id, data FROM "PatientIntakeDraft" WHERE status='draft' ORDER BY "createdAt" DESC LIMIT 1`,
    )
  ).rows[0];
  await page.getByRole('button', { name: 'Chiudi e salva la bozza' }).click();
  await page.waitForTimeout(1500);

  // Same shape the server writes for a row whose documents disagree (draft-source.ts).
  const source = { groupId: 'p10-g1', inputHash: 'p10-h1' };
  const row = {
    farmacoNome: 'Amlodipina',
    forma: 'cpr',
    dosaggio: '5 mg',
    viaSomministrazione: 'OS',
    quantita: '1 cpr',
    orari: ['08:00'],
    giorni: [],
    dataInizio: '',
    classe: '',
    note: '',
    originalText: 'Amlodipina 5 mg 1 cpr ore 8',
    stato: 'da_verificare',
    importSource: source,
    importSources: [source],
    sourceOutdated: false,
    conflictDeferred: true,
    conflictId: 'p10-conflict-1',
    excludedFromConfirm: true,
  };
  const data = {
    ...(draft.data ?? {}),
    terapiaImport: [row],
    _importSource: { groupHashes: { 'p10-g1': 'p10-h1' } },
  };
  await db.query(`UPDATE "PatientIntakeDraft" SET data=$2, version=version+1 WHERE id=$1`, [
    draft.id,
    data,
  ]);

  await page.getByRole('button', { name: /^Nuovo ingresso$/ }).click();
  await page.getByText('A mano', { exact: true }).click();
  const review = page.getByTestId('discharge-therapy-review');
  await review.waitFor({ timeout: 15000 });
  const rowEl = review.getByTestId('discharge-therapy-row').first();
  await rowEl.scrollIntoViewIfNeeded();
  const reincludi = await rowEl.getByRole('button', { name: /Reincludi/ }).count();
  const rowText = await rowEl.innerText();
  await shot('INT-1-deferred-row');
  check('P10-INT-1a', 'Conflict-deferred row offers no «Reincludi»', reincludi === 0);
  check(
    'P10-INT-1b',
    'Conflict-deferred row explains why it stays in draft',
    /diversi|conflitt/i.test(rowText),
    rowText.replace(/\s+/g, ' ').slice(0, 200),
  );

  // Autosave keeps working with the deferred row present.
  await page
    .getByLabel(/^Cognome/)
    .first()
    .fill('Prova');
  await page.getByLabel(/^Nome/).first().fill('Differita');
  await page.getByText(/Bozza salvata alle/).waitFor({ timeout: 15000 });
  const saved = (await db.query(`SELECT data FROM "PatientIntakeDraft" WHERE id=$1`, [draft.id]))
    .rows[0].data;
  check(
    'P10-INT-1c',
    'Autosave succeeds with a deferred row (no 409, row still excluded)',
    saved?.anagrafica?.lastName === 'Prova' &&
      saved.terapiaImport?.[0]?.excludedFromConfirm === true &&
      !http.some((h) => h.startsWith('409')),
    http.join(', '),
  );
  const banner = await page.getByText('Bozza non salvata').count();
  check('P10-INT-1d', 'No «Bozza non salvata» banner', banner === 0);
  await shot('INT-1-autosaved');

  // Missing steps must not list the deferred row as a blocker.
  const missing = await page
    .locator('.intake-index, [data-testid="intake-index"]')
    .first()
    .innerText()
    .catch(() => '');
  check(
    'P10-INT-1e',
    'Deferred row is not a blocking step for «Crea paziente»',
    !/Amlodipina/.test(missing),
    missing.replace(/\s+/g, ' ').slice(0, 240),
  );
  await shot('INT-1-index');

  // P10-INT-4: one-tap prescriber «Dimissione ospedaliera» on an intake therapy.
  const therapySection = page.getByTestId('intake-section-terapia');
  await therapySection.scrollIntoViewIfNeeded();
  await therapySection.getByRole('button', { name: '+ Aggiungi farmaco', exact: true }).click();
  const chips = therapySection.getByTestId('therapy-prescriber-suggestions').last();
  await chips.scrollIntoViewIfNeeded();
  const chip = chips.getByRole('button', { name: 'Dimissione ospedaliera' });
  const pressedBefore = await chip.getAttribute('aria-pressed');
  await chip.click();
  await page.waitForTimeout(400);
  const pressedAfter = await chip.getAttribute('aria-pressed');
  const prescriberValue = await therapySection
    .getByLabel(/^Prescrittore/)
    .last()
    .inputValue()
    .catch(() => '');
  await shot('INT-4-prescriber');
  check(
    'P10-INT-4',
    'Intake prescriber «Dimissione ospedaliera» filled with one tap (not before)',
    pressedBefore === 'false' &&
      pressedAfter === 'true' &&
      prescriberValue === 'Dimissione ospedaliera',
    `value «${prescriberValue}»`,
  );

  // P10-INT-5: Parametri iniziali without IP M / IP P, with DTX 20 (persisted by autosave).
  const params = page.getByTestId('intake-section-parametri');
  await params.scrollIntoViewIfNeeded();
  const headers = (await params.locator('th, [role=columnheader]').allInnerTexts()).map((t) =>
    t.replace(/\s+/g, ' ').trim(),
  );
  await shot('INT-5-parametri');
  check(
    'P10-INT-5a',
    'Parametri iniziali: no IP M / IP P columns, DTX 20 present',
    headers.some((h) => /DTX 20/.test(h)) &&
      !headers.some((h) => /^IP ?[MP]\b|IPM|pomeriggio/i.test(h)),
    headers.join(' | ').slice(0, 300),
  );
} catch (e) {
  check('P10-INT-1', 'journey completed', false, e.message.split('\n')[0]);
  await shot('INT-1-error').catch(() => {});
} finally {
  await context.tracing.stop({ path: `${OUT}/trace-intake-deferred.zip` });
  writeFileSync(`${OUT}/results-intake.json`, JSON.stringify({ results, http }, null, 2));
  await browser.close();
  await db.end();
}
