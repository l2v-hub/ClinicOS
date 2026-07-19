// PHI-safe landing/auth probe of the DEPLOYED app. Confirms the Operatore flow + import
// entry point selectors before we spend an AI run. Screenshots ONLY the landing (no patient
// data on it). Reports which expected controls are visible.
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const URL = process.env.PROD_URL ?? 'https://clinicos-eosin.vercel.app';
const outDir = process.argv[2] ?? '.';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(outDir, 'prod-landing.png') });
  const body = (await page.textContent('body')) ?? '';
  const has = (t) => body.includes(t);
  console.log(
    JSON.stringify(
      {
        url: URL,
        hasOperatore: has('Operatore'),
        hasManager: has('Manager') || has('Responsabile'),
        hasPazienti: has('Pazienti'),
        title: await page.title(),
        consoleErrors: errs.slice(0, 5),
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
