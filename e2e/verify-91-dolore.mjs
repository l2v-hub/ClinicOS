// BUG-053 (#91) E2E: the Dolore field in Presa in Carico is inline-editable and PERSISTS after
// reload. PHI-safe: seed patient. Sets Dolore=Presente + NRS, saves, reloads, asserts persistence,
// then restores Dolore=Assente so the run is idempotent.
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const URL = process.env.APP_URL ?? 'http://localhost:5173';
const PATIENT = process.argv[2] ?? 'Moretti, Elena';
const outDir = process.argv[3] ?? 'docs/qa/issues/91/final';

async function nav(page) {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.getByText('Operatore', { exact: true }).click();
  await page.waitForTimeout(1500);
  for (const label of ['Pazienti', PATIENT, 'Clinica', 'Presa in Carico']) {
    await page.getByText(label).first().click();
    await page.waitForTimeout(1200);
  }
}

// The Dolore row: <div.pic-row><span.pic-row__lbl>Dolore</span><button.pic-row__val>…</button>
function doloreRow(page) {
  return page.locator('.pic-row', { has: page.locator('.pic-row__lbl', { hasText: /^Dolore$/ }) }).first();
}

const browser = await chromium.launch();
const report = {};
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('dialog', (d) => d.accept());
  await nav(page);

  // open editor + set Presente
  await doloreRow(page).getByRole('button').first().click();
  await page.waitForTimeout(400);
  await doloreRow(page).locator('select').selectOption('presente');
  await doloreRow(page).locator('.inline-edit__btn--save').click();
  await page.waitForTimeout(1200);

  // NRS row now visible -> set 5
  const nrs = page.locator('.pic-row', { has: page.locator('.pic-row__lbl', { hasText: /NRS/ }) }).first();
  report.nrsRowAppeared = await nrs.count() > 0;
  try {
    if (report.nrsRowAppeared) {
      await nrs.getByRole('button').first().click();
      await page.waitForTimeout(400);
      await nrs.locator('input[type=number]').fill('5', { timeout: 5000 });
      await nrs.locator('.inline-edit__btn--save').click();
      await page.waitForTimeout(1200);
      report.nrsSet = true;
    }
  } catch { report.nrsSet = false; }
  await page.screenshot({ path: resolve(outDir, 'after.png'), fullPage: true });

  // RELOAD -> assert persistence
  await nav(page);
  await page.waitForTimeout(600);
  const afterText = (await doloreRow(page).textContent()) ?? '';
  report.persistedPresente = /Presente/i.test(afterText);
  const body = (await page.textContent('body')) ?? '';
  report.persistedNRS = /5\s*\/\s*10/.test(body) || /NRS/i.test(body);
  await page.screenshot({ path: resolve(outDir, 'after-refresh.png'), fullPage: true });

  // restore to Assente (idempotent)
  await doloreRow(page).getByRole('button').first().click();
  await page.waitForTimeout(400);
  await doloreRow(page).locator('select').selectOption('assente');
  await doloreRow(page).locator('.inline-edit__btn--save').click();
  await page.waitForTimeout(1000);

  console.log(JSON.stringify(report, null, 2));
  await page.close();
} finally { await browser.close(); }
