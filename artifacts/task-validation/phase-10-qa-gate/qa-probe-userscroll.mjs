import { chromium } from 'playwright';
const [OUT, NANNI] = process.argv.slice(2);
const b = await chromium.launch();
async function run(kind) {
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: kind === 'touch' });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:5199');
  await page.getByRole('button', { name: /Infermiere 1/ }).first().click();
  await page.waitForSelector('.teams-sidebar');
  await page.waitForTimeout(1200);
  await page.locator('.teams-sidebar').getByRole('button', { name: 'Turno' }).click();
  await page.waitForTimeout(1500);
  await page.getByText('Nanni, Miriam').first().click();
  await page.getByText('Nanni, Miriam').first().waitFor();
  await page.waitForTimeout(2500);
  await page.locator('.teams-sidebar').getByRole('button', { name: 'Consegne' }).click();
  await page.waitForTimeout(250);
  const top = () => page.evaluate(() => Math.round(document.querySelector('[data-chart-part="consegne"]')?.getBoundingClientRect().top ?? -1));
  const t0 = await top();
  // user scrolls UP right after the tap, while parts are still loading
  await page.mouse.move(640, 500);
  if (kind === 'touch') {
    await page.dispatchEvent('main', 'touchstart', {}).catch(() => {});
    await page.evaluate(() => { const s = document.querySelector('.cr-detail-content') || document.scrollingElement; s.scrollBy(0, -1200); });
  } else {
    await page.mouse.wheel(0, -1200);
  }
  await page.waitForTimeout(150);
  const tUser = await top();
  const samples = [];
  for (let i = 0; i < 8; i++) { await page.waitForTimeout(500); samples.push(await top()); }
  const fought = samples.some((s) => Math.abs(s) < 120 && Math.abs(tUser) >= 120);
  console.log(kind, JSON.stringify({ afterTap: t0, afterUserScroll: tUser, next4s: samples, pinFoughtUser: fought }));
  await page.screenshot({ path: `${OUT}/QA-F1-userscroll-${kind}.png` });
  await ctx.close();
}
await run('wheel');
await run('touch');
await b.close();
