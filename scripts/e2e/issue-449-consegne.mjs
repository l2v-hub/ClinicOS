// #449 — Consegne: scrivere in 3 interazioni dalla pagina (paziente, testo, Invia), un solo gesto
// di conferma per nota (pagina Consegne e diario del paziente), un solo nome («consegna»),
// identità in una riga, nessuna guida, storico e filtri dietro un link.
// LOCAL synthetic stack only (backend AUTH_MODE=demo + simulator, DB seeded with Nanni Miriam).
// Usage (repo root): DATABASE_URL=<local DB> [TRACE=1] node scripts/e2e/issue-449-consegne.mjs <outDir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import pg from 'pg';

const FRONT = process.env.FRONT ?? 'http://127.0.0.1:5211';
const OUT = process.argv[2] ?? 'artifacts/task-validation/449-consegne-scrivere-e-confermare';
const DB = process.env.DATABASE_URL;
if (!DB || !/127\.0\.0\.1|localhost/.test(DB)) throw new Error('DATABASE_URL must be a LOCAL DB');
for (const d of ['screenshots', 'trace', 'test-results'])
  mkdirSync(`${OUT}/${d}`, { recursive: true });

const db = new pg.Client({ connectionString: DB });
await db.connect();
const nanni = (
  await db.query(`SELECT id FROM "Patient" WHERE "medicalRecordNumber"='DEMO-P10-Miriam-Nanni'`)
).rows[0]?.id;
const results = [];
const consoleErrors = [];
const check = (id, name, ok, detail = '') => {
  results.push({ id, name, result: ok ? 'PASS' : 'FAIL', detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? ' — ' + detail : ''}`);
};
const browser = await chromium.launch();
async function login(role) {
  const context = await browser.newContext({
    viewport: { width: 1180, height: 820 },
    hasTouch: true,
  });
  if (process.env.TRACE) await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text()))
      consoleErrors.push(`${role}: ${m.text().slice(0, 200)}`);
  });
  await page.goto(FRONT);
  await page
    .getByRole('button', { name: new RegExp(role) })
    .first()
    .click();
  await page.waitForSelector('.teams-sidebar', { timeout: 30000 });
  await page.locator('.teams-sidebar').getByRole('button', { name: 'Consegne' }).first().click();
  await page.waitForSelector('.handover-workspace', { timeout: 30000 });
  await page.waitForTimeout(2500);
  return { context, page };
}
const OLD_NAMES = /Nuova nota|Segnalazione|Nuova consegna|Come funziona la conferma/;
/** Solo l'interfaccia (pulsanti, titoli, etichette, schede, riepiloghi), non i dati salvati: il
 *  «tipo» delle consegne già scritte è contenuto, non un'etichetta. */
const uiText = (page) =>
  page.evaluate(() =>
    [
      ...document.querySelectorAll(
        '.handover-workspace :is(button, h1, h2, h3, label, summary, [role=tab], option)',
      ),
    ]
      .filter((el) => !el.closest('.consegna-card, .diario-card'))
      .map((el) => el.textContent.trim())
      .join(' | '),
  );
/** Pulsanti di conferma per scheda: mai più di uno. */
const confirmsPerCard = (page, selector) =>
  page.evaluate(
    (sel) =>
      [...document.querySelectorAll(sel)].map(
        (card) =>
          [...card.querySelectorAll('button')].filter((b) =>
            /^(Letta|Ho capito|Conferma lettura)$/.test(b.textContent.trim()),
          ).length,
      ),
    selector,
  );

// ── Infermiere: scrive una consegna in 3 interazioni ────────────────────────────────────────────
const MARK = `E2E-449 ${Date.now()}`;
{
  const { context, page } = await login('Infermiere 1');
  await page.screenshot({ path: `${OUT}/screenshots/01-consegne-apertura.png` });
  const text = await uiText(page);
  check(
    'AC3a',
    'no old names on the Consegne page (unread view)',
    !OLD_NAMES.test(text),
    (text.match(OLD_NAMES) ?? [''])[0],
  );
  const quick = page.locator('section[aria-label="Scrivi una consegna"]');
  const posts = [];
  page.on(
    'request',
    (r) => r.method() === 'POST' && /\/consegne$/.test(r.url()) && posts.push(r.postDataJSON()),
  );
  // 1) paziente
  await quick.locator('select').first().selectOption(nanni);
  // 2) testo
  await quick.locator('textarea').first().fill(`${MARK} pressione 90/60, ricontrollare alle 14`);
  // 3) Invia
  await quick.getByRole('button', { name: /^Invia$/ }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/screenshots/02-consegna-inviata.png` });
  const row = (
    await db.query(`SELECT id, "pazienteId", priorita, note FROM "Consegna" WHERE note LIKE $1`, [
      `${MARK}%`,
    ])
  ).rows[0];
  check(
    'AC1',
    'a handover is written and sent from the page in 3 interactions (patient, text, Invia)',
    posts.length === 1 &&
      row?.pazienteId === nanni &&
      (await quick.getByText(/Consegna inviata per/).count()) === 1,
    `POST ${posts.length} · DB ${row ? row.id : 'missing'}`,
  );
  // vista per paziente: un solo «Scrivi consegna», filtri chiusi
  await page.getByRole('button', { name: 'Per paziente', exact: true }).click();
  await page.waitForTimeout(2500);
  const rounds = await uiText(page);
  const filtersVisible = await page
    .getByRole('button', { name: 'Filtra storico' })
    .isVisible()
    .catch(() => false);
  await page.screenshot({ path: `${OUT}/screenshots/03-per-paziente.png` });
  check(
    'AC3b',
    'no old names in the per-patient view, one «Scrivi consegna» entry point',
    !OLD_NAMES.test(rounds) && (rounds.match(/Scrivi consegna/g) ?? []).length === 1,
    `${(rounds.match(OLD_NAMES) ?? ['ok'])[0]} · «Scrivi consegna» ×${(rounds.match(/Scrivi consegna/g) ?? []).length}`,
  );
  check(
    'AC5a',
    'history and date filters sit behind «Storico e filtri per data»',
    !filtersVisible && (await page.getByText('Storico e filtri per data').count()) > 0,
  );
  // QA: con il diario di Nanni aperto sotto, l'invio dal modulo in cima si vede subito
  await page.locator('.handover-rounds__select', { hasText: 'Nanni' }).first().click();
  await page.waitForTimeout(2500);
  const before = await page.locator('.diario-card').count();
  const MARK2 = `${MARK} bis`;
  const absentBefore = await page.locator('.diario-card', { hasText: MARK2 }).count();
  const quick2 = page.locator('section[aria-label="Scrivi una consegna"]');
  await quick2.locator('select').first().selectOption(nanni);
  await quick2.locator('textarea').first().fill(`${MARK2} diuresi scarsa`);
  await quick2.getByRole('button', { name: /^Invia$/ }).click();
  await page.waitForTimeout(3500);
  const after = await page.locator('.diario-card').count();
  const shown = await page.locator('.diario-card', { hasText: MARK2 }).count();
  await page.screenshot({ path: `${OUT}/screenshots/06-diario-aggiornato.png` });
  check(
    'AC1c',
    'the diary below shows a handover sent from the top form without switching view',
    // la pagina del diario è fissa a 50 voci: conta la scheda nuova, non il totale (#449 QA)
    absentBefore === 0 && shown === 1,
    `new card ${absentBefore}→${shown} · cards ${before}→${after}`,
  );
  // QA: un invio per un altro paziente non ricostruisce il diario aperto (filtri e storico restano)
  await page.locator('.handover-rounds__select', { hasText: 'Verdi' }).first().click();
  await page.waitForTimeout(2500);
  await page.locator('.diario-history > summary').first().click();
  await page.locator('.diario-history input[type=date]').first().fill('2026-10-01');
  await page.getByRole('button', { name: 'Filtra storico' }).click();
  await page.waitForTimeout(2000);
  const quick3 = page.locator('section[aria-label="Scrivi una consegna"]');
  await quick3.locator('select').first().selectOption(nanni);
  await quick3.locator('textarea').first().fill(`${MARK} ter per Nanni`);
  await quick3.getByRole('button', { name: /^Invia$/ }).click();
  await page.waitForTimeout(3000);
  const kept = await page.evaluate(() => ({
    open: document.querySelector('.diario-history')?.open ?? null,
    from: document.querySelector('.diario-history input[type=date]')?.value ?? null,
  }));
  check(
    'AC1d',
    'a send for another patient leaves the open diary as it was (history and filter kept)',
    kept.open === true && kept.from === '2026-10-01',
    JSON.stringify(kept),
  );
  if (process.env.TRACE) await context.tracing.stop({ path: `${OUT}/trace/infermiere.zip` });
  await context.close();
}

// ── Medico: la consegna è nella sua coda, una sola azione per scheda, identità in una riga ──────
{
  const { context, page } = await login('Medico 1');
  await page.screenshot({
    path: `${OUT}/screenshots/04-medico-non-confermate.png`,
    fullPage: true,
  });
  const perCard = await confirmsPerCard(page, '.consegna-card');
  const mine = page.locator('.consegna-card', { hasText: `${MARK} pressione` });
  const identityLines = await page.evaluate(() =>
    [...document.querySelectorAll('.consegna-card')].map((c) => ({
      oneLine: !!c.querySelector('.consegna-card__who'),
      noisy: /Nato\/a il|CF da completare|Anagrafica da completare/.test(c.textContent),
    })),
  );
  check(
    'AC2a',
    'Consegne page: no card shows more than one confirmation button',
    perCard.length > 0 && perCard.every((n) => n <= 1),
    JSON.stringify(perCard),
  );
  check(
    'AC5b',
    'identity on one line, no repeated registry gaps, no reading guide',
    identityLines.every((c) => c.oneLine && !c.noisy) &&
      (await page.getByText('Come funziona la conferma').count()) === 0,
    JSON.stringify(identityLines.slice(0, 4)),
  );
  check(
    'AC1b',
    "the sent handover reaches a colleague's queue with «Letta»",
    (await mine.count()) === 1 &&
      (await mine.locator('button', { hasText: /^Letta$/ }).count()) === 1,
  );
  // diario della cartella: stessa regola
  await page.goto(`${FRONT}/#/dettaglio-paziente/${nanni}/diario`);
  await page.waitForTimeout(3500);
  const diaryCards = await confirmsPerCard(page, '.diario-card');
  await page.screenshot({ path: `${OUT}/screenshots/05-diario-cartella.png`, fullPage: true });
  check(
    'AC2b',
    'patient diary: no entry shows more than one confirmation button',
    diaryCards.length > 0 && diaryCards.every((n) => n <= 1),
    JSON.stringify(diaryCards),
  );
  if (process.env.TRACE) await context.tracing.stop({ path: `${OUT}/trace/medico.zip` });
  await context.close();
}

await browser.close();
await db.end();
const pass = results.every((r) => r.result === 'PASS');
writeFileSync(
  `${OUT}/test-results/consegne-${process.env.LABEL ?? 'run'}.json`,
  JSON.stringify({ pass, results, consoleErrors }, null, 2),
);
console.log(pass ? 'PASS #449' : 'FAIL #449', '| console errors:', consoleErrors.length);
process.exit(pass ? 0 : 1);
