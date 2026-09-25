import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const reqs = [];
page.on('request', (r) => { if (r.url().startsWith('http://localhost:3001') && r.method() !== 'OPTIONS') reqs.push([Date.now(), r.url().replace('http://localhost:3001', '')]); });
await page.goto('http://localhost:4173', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(700);
await page.getByText('Operatore', { exact: true }).first().click();
await page.locator('.teams-sidebar').waitFor();
await page.waitForTimeout(1500);
await page.locator('.teams-sidebar button', { hasText: 'Pazienti' }).first().click();
await page.locator('.page-content tbody tr').nth(1).waitFor();
await page.waitForTimeout(800);
await page.locator('.page-content tbody tr').nth(1).click();
await page.locator('.patient-record-view').waitFor();
await page.waitForTimeout(3000); // let prefetch finish
const t0 = Date.now(); reqs.length = 0;
await page.getByRole('tab', { name: /^Diario/ }).first().click();
const samples = [];
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(50);
  samples.push(await page.evaluate(() => { const m = document.querySelector('.cr-detail-content') || document.querySelector('.page-content'); const t = m.innerText; return [t.length, /Caricamento/.test(t) ? 'L' : '-', t.slice(0, 60).replace(/\n/g, '|')]; }));
}
console.log(samples.map((s, i) => `${(i + 1) * 50}ms len=${s[0]} ${s[1]} ${s[2]}`).join('\n'));
console.log('requests after click:', reqs.map(([t, u]) => `${t - t0}ms ${u}`).join(' ; '));
await browser.close();
