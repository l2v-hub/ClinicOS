import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:4173', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(900);
const res = await page.evaluate(async () => {
  const hits = [];
  const t0 = performance.now();
  const btn = [...document.querySelectorAll('button, [role=button]')].find((b) => b.textContent.trim().startsWith('Operatore'));
  btn.click();
  while (performance.now() - t0 < 2500) {
    const txt = document.body.innerText;
    const i = txt.indexOf('Caricamento modulo');
    if (i >= 0) hits.push({ t: Math.round(performance.now() - t0), around: txt.slice(Math.max(0, i - 60), i + 40).replace(/\n/g, '|') });
    await new Promise((r) => setTimeout(r, 5));
  }
  return { hits: hits.length, first: hits[0], last: hits[hits.length - 1] };
});
console.log(JSON.stringify(res));
await browser.close();
