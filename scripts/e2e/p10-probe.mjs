// Interactive probe: run a list of steps (JSON) for a role, screenshot + dump visible buttons.
import { writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
const [OUT, ROLE, STEPS] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const steps = JSON.parse(STEPS);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
const page = await ctx.newPage();
const log = [];
page.on('console', (m) => m.type() === 'error' && log.push('console: ' + m.text().slice(0, 200)));
page.on(
  'response',
  (r) =>
    r.status() >= 400 &&
    log.push(`http ${r.status()} ${r.request().method()} ${r.url().slice(0, 140)}`),
);
await page.goto('http://127.0.0.1:5199');
await page
  .getByRole('button', { name: new RegExp(ROLE) })
  .first()
  .click();
await page.waitForSelector('.teams-sidebar', { timeout: 20000 });
await page.waitForTimeout(1500);
let i = 0;
for (const s of steps) {
  i++;
  try {
    if (s.side)
      await page.locator('.teams-sidebar').getByRole('button', { name: s.side }).first().click();
    if (s.btn)
      await page
        .getByRole('button', { name: new RegExp(s.btn) })
        .nth(s.nth ?? 0)
        .click();
    if (s.text)
      await page
        .getByText(s.text, { exact: false })
        .nth(s.nth ?? 0)
        .click();
    if (s.css)
      await page
        .locator(s.css)
        .nth(s.nth ?? 0)
        .click();
    if (s.fill) await page.getByLabel(new RegExp(s.fill[0])).first().fill(s.fill[1]);
    if (s.eval) log.push('eval: ' + JSON.stringify(await page.evaluate(s.eval)));
  } catch (e) {
    log.push(`step ${i} FAIL ${JSON.stringify(s)}: ${e.message.split('\n')[0]}`);
  }
  await page.waitForTimeout(s.wait ?? 1500);
  await page.screenshot({ path: `${OUT}/${String(i).padStart(2, '0')}.png`, fullPage: !!s.full });
}
log.push('hash: ' + (await page.evaluate(() => location.hash)));
log.push(
  'buttons: ' +
    JSON.stringify(
      (await page.locator('main button:visible, .main-area-clean button:visible').allInnerTexts())
        .map((t) => t.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .slice(0, 80),
    ),
);
writeFileSync(`${OUT}/log.txt`, log.join('\n'));
console.log(log.join('\n'));
await b.close();
