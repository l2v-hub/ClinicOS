// Phase 10 exploratory browser pass: per role, screenshot main screens (synthetic local stack only).
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
const FRONT = process.env.FRONT ?? 'http://127.0.0.1:5199';
const OUT = process.argv[2] ?? 'artifacts/phase10-explore';
const ROLE = process.argv[3] ?? 'Infermiere 1';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1180, height: 820 },
  hasTouch: true,
});
const page = await context.newPage();
const log = [];
page.on('console', (m) => m.type() === 'error' && log.push('console: ' + m.text()));
page.on(
  'response',
  (r) => r.status() >= 400 && log.push(`http ${r.status()} ${r.request().method()} ${r.url()}`),
);
await page.goto(FRONT);
await page
  .getByRole('button', { name: new RegExp(ROLE) })
  .first()
  .click();
await page.waitForSelector('.teams-sidebar', { timeout: 20000 });
await page.waitForTimeout(2500);
const shot = async (n) => {
  await page.screenshot({ path: `${OUT}/${ROLE}-${n}.png` });
};
await shot('01-home');
const nav = await page.locator('.teams-sidebar button, .teams-sidebar a').allInnerTexts();
log.push('sidebar: ' + JSON.stringify(nav.map((s) => s.replace(/\s+/g, ' ').trim())));
for (const label of nav.map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean)) {
  try {
    await page
      .locator('.teams-sidebar')
      .getByRole('button', { name: label, exact: false })
      .first()
      .click({ timeout: 3000 });
    await page.waitForTimeout(1500);
    await shot('nav-' + label.replace(/[^a-z0-9]/gi, '_'));
  } catch (e) {
    log.push('nav fail ' + label + ' ' + e.message.split('\n')[0]);
  }
}
writeFileSync(`${OUT}/${ROLE}-log.txt`, log.join('\n'));
await browser.close();
