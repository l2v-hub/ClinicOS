#!/usr/bin/env node
// Issue #130 — riproduzione PRIMA del fix: il comando consegna non è riconosciuto come write.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const FRONTEND = process.env.CLINICOS_FRONTEND ?? 'http://localhost:5176';
const OUT = 'docs/qa/issues/130/final';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
await page.goto(FRONTEND + '/', { waitUntil: 'networkidle' });
await page.locator('text="Operatore"').first().click();
await page.waitForLoadState('networkidle');
await page.waitForSelector('.ai-fab', { timeout: 20000 });
await page.locator('.ai-fab').click();
await page.waitForSelector('.agnos-panel');
await page.fill('.agnos-input', 'Aggiungi una consegna per Elena Moretti: controllare la pressione dopo cena');
await page.click('.ai-asst__send');
await page.waitForTimeout(4000);
const body = await page.locator('.ai-asst__body').innerText();
console.log('--- Agnos response ---');
console.log(body);
await page.screenshot({ path: `${OUT}/before.png` });
await browser.close();
