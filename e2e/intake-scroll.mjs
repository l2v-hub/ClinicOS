// BUG-074: verify the intake popup stays large and only the inner body scrolls.
// header + stepper + footer pinned; body overflow-y auto; page behind does not move.
// Synthetic local DB only — no prod, no PHI. Screenshots to the out dir.
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const out = process.argv[2] ?? '.';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
let failed = false;
const check = (cond, msg) => {
  if (!cond) {
    failed = true;
    console.log('FAIL:', msg);
  } else console.log('ok  :', msg);
};

try {
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(600);
  await page.getByText('Operatore', { exact: true }).click();
  await page.waitForTimeout(900);
  await page.getByText('Pazienti').first().click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /Nuovo paziente/i }).click();

  const dialog = page.getByRole('dialog');
  const body = page.getByTestId('patient-intake-body');
  const header = page.getByTestId('patient-intake-header');
  const stepper = page.getByTestId('patient-intake-stepper');
  const footer = page.getByTestId('patient-intake-footer');
  await body.waitFor({ state: 'visible', timeout: 15000 });

  await check(await header.isVisible(), 'header visible');
  await check(await stepper.isVisible(), 'stepper visible');
  await check(await footer.isVisible(), 'footer visible');

  // Popup large: width close to 96vw, height close to 94vh.
  const dlgBox = await dialog.locator('.import-modal--intake').boundingBox();
  await check(dlgBox.height >= 0.9 * 768, `popup tall (${Math.round(dlgBox.height)}px of 768)`);
  await check(dlgBox.width >= 0.9 * 1366, `popup wide (${Math.round(dlgBox.width)}px of 1366)`);

  const m = await body.evaluate((el) => ({
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    overflowY: getComputedStyle(el).overflowY,
  }));
  await check(
    m.scrollHeight > m.clientHeight,
    `body scrollable (scrollH ${m.scrollHeight} > clientH ${m.clientHeight})`,
  );
  await check(/auto|scroll/.test(m.overflowY), `body overflowY=${m.overflowY}`);

  // record geometry, then scroll body to the bottom
  const pageYBefore = await page.evaluate(() => window.scrollY);
  const footY0 = (await footer.boundingBox()).y;
  const headY0 = (await header.boundingBox()).y;
  await page.screenshot({ path: resolve(out, 'patient-intake-popup-full-size.png') });

  await body.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(300);

  const footY1 = (await footer.boundingBox()).y;
  const headY1 = (await header.boundingBox()).y;
  const pageYAfter = await page.evaluate(() => window.scrollY);
  const scrolled = await body.evaluate((el) => el.scrollTop);

  await check(scrolled > 0, `body scrolled to ${scrolled}px`);
  await check(Math.abs(footY1 - footY0) < 2, 'footer stayed put after body scroll');
  await check(Math.abs(headY1 - headY0) < 2, 'header stayed put after body scroll');
  await check(
    pageYBefore === pageYAfter,
    `outer page did not scroll (${pageYBefore}->${pageYAfter})`,
  );
  await check(
    (await footer.isVisible()) && (await header.isVisible()),
    'header+footer still visible at bottom',
  );

  // no global horizontal scroll
  const hOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  await check(!hOverflow, 'no global horizontal scroll');

  await page.screenshot({ path: resolve(out, 'patient-intake-scroll-bottom.png') });

  console.log(failed ? 'RESULT: FAIL' : 'RESULT: PASS', '| consoleErrors', errors.length);
  if (errors.length) console.log('first err:', errors[0]);
  process.exit(failed ? 1 : 0);
} catch (e) {
  console.log('SCRIPT ERROR:', e.message);
  await page.screenshot({ path: resolve(out, 'patient-intake-FAIL.png') }).catch(() => {});
  process.exit(2);
} finally {
  await browser.close();
}
