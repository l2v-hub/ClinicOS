#!/usr/bin/env node
// Issue #242 — screenshot + trace del report generato da issue-242-parse.ts (superficie QA controllata).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
const OUT = 'artifacts/task-validation/242-diagnosis-excludes-pharmacological-therapy';
for (const d of ['screenshots', 'trace']) mkdirSync(join(OUT, d), { recursive: true });
const url = 'file://' + resolve(OUT, 'report.html').replace(/\\/g, '/');
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
await ctx.tracing.start({ screenshots: true, snapshots: true, sources: true });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'load' });
const verdict = (await page.locator('#verdict').innerText()).trim();
const diagText = await page.locator('[data-testid="diag"]').innerText();
const therText = await page.locator('[data-testid="ther"]').innerText();
const drugsInDiag = ['Ramipril', 'Bisoprololo', 'Furosemide'].filter((d) => diagText.includes(d));
const ok =
  verdict.includes('correttamente separate') &&
  drugsInDiag.length === 0 &&
  therText.includes('Ramipril');
console.log('verdict:', verdict);
console.log(
  'drugs in diagnosi:',
  drugsInDiag.length,
  '| therapy ha Ramipril:',
  therText.includes('Ramipril'),
);
await page.screenshot({
  path: join(OUT, 'screenshots', 'diagnosi-terapia-separate.png'),
  fullPage: true,
});
await ctx.tracing.stop({ path: join(OUT, 'trace', 'trace.zip') });
await browser.close();
console.log(ok ? '\nPASS — screenshot+trace salvati' : '\nFAIL');
if (!ok) process.exit(1);
