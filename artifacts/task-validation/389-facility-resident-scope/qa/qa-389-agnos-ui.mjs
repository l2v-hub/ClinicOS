// QA #389 — Agnos panel on a doctor-registered resident, as the nurse (local stack only).
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
const OUT = 'artifacts/task-validation/389-facility-resident-scope/qa';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
const calls = [];
page.on('response', (r) => { if (/\/ai\//.test(r.url())) calls.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`); });
await page.goto('http://127.0.0.1:5204');
await page.getByRole('button', { name: /Infermiere 1/ }).first().click();
await page.waitForSelector('.teams-sidebar');
await page.locator('.teams-sidebar').getByRole('button', { name: 'Pazienti' }).first().click();
await page.locator('.plist-list').getByText('Neri').first().click();
await page.waitForTimeout(2000);
await page.locator('.teams-sidebar').getByRole('button', { name: /^Assistente$/ }).first().click(); // sidebar Agnos panel (/ai/actions/plan)
await page.waitForTimeout(1500);
const box = page.locator('textarea, input[type="text"]').last();
await box.fill('ultimi parametri vitali');
await box.press('Enter');
await page.waitForTimeout(4000);
await page.screenshot({ path: `${OUT}/screens/06-r2-agnos-sidebar-infermiere-neri.png` });
writeFileSync(`${OUT}/agnos-ui-r2.json`, JSON.stringify({ calls }, null, 2));
console.log(calls);
await browser.close();
