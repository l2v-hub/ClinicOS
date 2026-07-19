// Navigate Operatore -> Pazienti -> <patient> -> Clinica -> <tab>, optionally scroll a label
// into view / click to open an inline editor, then full-page screenshot. PHI-safe (seed data).
//   node e2e/shot-cartella-card.mjs <patient> <tab> <scrollToText> <out.png> [click:<text>]
// Mirrors .claude/skills/run-clinicos/driver.mjs navigation (getByText().first().click()).
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const URL = process.env.APP_URL ?? 'http://localhost:5173';
const [patient, tab, scrollTo, out, interact] = process.argv.slice(2);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('dialog', (d) => d.accept());
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.getByText('Operatore', { exact: true }).click();
  await page.waitForTimeout(1500);
  for (const label of ['Pazienti', patient, 'Clinica', tab]) {
    await page.getByText(label).first().click();
    await page.waitForTimeout(1200);
    console.log(`clicked "${label}"`);
  }
  if (scrollTo) {
    try {
      await page
        .getByText(scrollTo, { exact: false })
        .first()
        .scrollIntoViewIfNeeded({ timeout: 5000 });
    } catch {
      /* */
    }
    await page.waitForTimeout(400);
  }
  if (interact?.startsWith('click:')) {
    await page.getByText(interact.slice(6), { exact: false }).first().click();
    await page.waitForTimeout(700);
  }
  await page.screenshot({ path: resolve(out), fullPage: true });
  const body = (await page.textContent('body')) ?? '';
  console.log(
    JSON.stringify({
      out,
      bodyChars: body.length,
      hasScrollTo: scrollTo ? body.includes(scrollTo) : null,
    }),
  );
  await page.close();
} finally {
  await browser.close();
}
