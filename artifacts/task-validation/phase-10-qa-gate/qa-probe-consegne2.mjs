import { chromium } from 'playwright';
const [OUT, NANNI] = process.argv.slice(2);
const b = await chromium.launch();
async function run(label, pre) {
  const page = await (await b.newContext({ viewport: { width: 1180, height: 820 } })).newPage();
  await page.goto('http://127.0.0.1:5199');
  await page.getByRole('button', { name: /Infermiere 1/ }).first().click();
  await page.waitForSelector('.teams-sidebar');
  await page.waitForTimeout(1200);
  await page.goto(`http://127.0.0.1:5199/#/dettaglio-paziente/${NANNI}`);
  await page.getByText('Nanni, Miriam').first().waitFor();
  await page.waitForTimeout(2500);
  if (pre) { await page.locator('.teams-sidebar').getByRole('button', { name: pre }).click(); await page.waitForTimeout(1800); }
  await page.locator('.teams-sidebar').getByRole('button', { name: 'Consegne' }).click();
  const out = [];
  for (const t of [300, 1000, 2500, 5000]) {
    await page.waitForTimeout(t - (out.length ? [300, 1000, 2500, 5000][out.length - 1] : 0));
    out.push(await page.evaluate(() => { const el = document.querySelector('[data-chart-part="consegne"]'); return el ? Math.round(el.getBoundingClientRect().top) : null; }));
  }
  const active = await page.locator('.top-nav__item.is-active').allInnerTexts();
  console.log(label, JSON.stringify({ tops: out, active }));
  await page.screenshot({ path: `${OUT}/QA-DL-Consegne-${label}.png` });
  await page.context().close();
}
await run('from-panoramica', null);
await run('from-parametri', 'Parametri');
await run('from-terapia', 'Terapia');
await b.close();
