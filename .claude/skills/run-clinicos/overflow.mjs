import { chromium } from 'playwright';
const FRONTEND = 'http://localhost:5173';
for (const vp of [
  { n: 'desktop', width: 1366, height: 768 },
  { n: 'tablet', width: 1024, height: 768 },
]) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(900);
  await page.getByText('Operatore', { exact: true }).click();
  await page.waitForTimeout(1400);
  const check = async (label) => {
    const r = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
    }));
    console.log(
      `${vp.n.padEnd(8)} ${label.padEnd(10)} scrollW=${r.sw} clientW=${r.cw} overflow=${r.sw > r.cw ? 'YES(' + (r.sw - r.cw) + 'px)' : 'no'}`,
    );
  };
  await check('Dashboard');
  await page.getByText('Pazienti').first().click();
  await page.waitForTimeout(900);
  await check('Pazienti');
  await page.getByText('Moretti, Elena').first().click();
  await page.waitForTimeout(1100);
  await check('Detail');
  await page.getByText('Parametri').first().click();
  await page.waitForTimeout(900);
  await check('Parametri');
  await page.getByText('Agenda').first().click();
  await page.waitForTimeout(900);
  await check('Agenda');
  await browser.close();
}
