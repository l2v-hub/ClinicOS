// BUG-065 (#103) E2E: consegna edit is INLINE (no overlapping modal window). Creates a synthetic
// consegna, opens its edit, asserts the inline panel is present and NO .modal-overlay exists.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
const URL = process.env.APP_URL ?? 'http://localhost:5173';
const outDir = process.argv[2] ?? 'docs/qa/issues/103/final';
const PAZ = 'ZZ-TEST, Consegna';

const browser = await chromium.launch();
const report = {};
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('dialog', (d) => d.accept());
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.getByText('Operatore', { exact: true }).click();
  await page.waitForTimeout(1200);
  await page.getByText('Consegne').first().click();
  await page.waitForTimeout(1000);
  // create a consegna
  await page.getByRole('button', { name: /Nuova consegna/i }).click();
  await page.waitForTimeout(400);
  await page.getByPlaceholder('Cognome, Nome').fill(PAZ);
  await page
    .getByPlaceholder(/Istruzioni per il prossimo operatore/)
    .fill('Nota di prova sintetica');
  await page.getByRole('button', { name: /Crea consegna/i }).click();
  await page.waitForTimeout(1000);
  report.cardCreated = ((await page.textContent('body')) ?? '').includes(PAZ);
  // open edit on the card
  await page.getByRole('button', { name: 'Modifica consegna' }).first().click();
  await page.waitForTimeout(500);
  report.inlineEditPresent = (await page.locator('.consegna-edit-inline').count()) > 0;
  report.noModalOverlay = (await page.locator('.modal-overlay').count()) === 0;
  await page.screenshot({ path: resolve(outDir, 'after.png'), fullPage: true });
  console.log(JSON.stringify(report, null, 2));
  await page.close();
} finally {
  await browser.close();
}
