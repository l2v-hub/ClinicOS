import { chromium } from 'playwright';
const [OUT, NANNI] = process.argv.slice(2);
const b = await chromium.launch();
const page = await (await b.newContext({ viewport: { width: 1180, height: 820 } })).newPage();
await page.goto('http://127.0.0.1:5199');
await page.getByRole('button', { name: /Infermiere 1/ }).first().click();
await page.waitForSelector('.teams-sidebar');
await page.goto(`http://127.0.0.1:5199/#/dettaglio-paziente/${NANNI}`);
await page.getByText('Nanni, Miriam').first().waitFor();
await page.waitForTimeout(1500);
await page.locator('.teams-sidebar').getByRole('button', { name: 'Consegne' }).click();
for (const t of [500, 2000, 4000]) {
  await page.waitForTimeout(t === 500 ? 500 : t - 500);
  const info = await page.evaluate(() => {
    const el = document.querySelector('[data-chart-part="consegne"]');
    return { exists: !!el, top: el ? Math.round(el.getBoundingClientRect().top) : null, vh: innerHeight, text: el ? el.textContent.slice(0, 80) : null, parts: [...document.querySelectorAll('[data-chart-part]')].map((e) => e.getAttribute('data-chart-part')) };
  });
  console.log(t, JSON.stringify(info));
}
await page.screenshot({ path: `${OUT}/QA-DL-Consegne-4s.png` });
// Same via Clinica rail → is the consegne part reachable at all?
await b.close();
