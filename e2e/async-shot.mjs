// REQ-022 evidence: capture the async import UI (upload, processing progress,
// review) at desktop + tablet. Requires backend (:3001, mock) + frontend (:5173).
//   node e2e/async-shot.mjs <outDir>
import { chromium } from 'playwright';
import { writeFixtures } from './fixtures.mjs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const FRONTEND = 'http://localhost:5173';
const outDir = process.argv[2] ?? '.';
const fx = writeFixtures(resolve(tmpdir(), 'clinicos-r22-fixtures'));
const VPS = [
  { n: 'desktop', width: 1366, height: 768 },
  { n: 'tablet', width: 1024, height: 768 },
];

const browser = await chromium.launch();
try {
  for (const vp of VPS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    page.on('dialog', (d) => d.accept());
    const errs = [];
    page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800);
    await page.getByText('Operatore', { exact: true }).click();
    await page.waitForTimeout(1300);
    await page.getByText('Pazienti').first().click();
    await page.waitForTimeout(800);
    await page.getByText('Importa dimissione').first().click();
    await page.waitForTimeout(600);
    await page.setInputFiles('input[type=file][multiple]', [fx.pdf, fx.jpg]);
    await page.waitForTimeout(900);
    await page.screenshot({ path: resolve(outDir, `after-${vp.n}.png`) });

    await page.getByRole('button', { name: /Avvia elaborazione/i }).click();
    await page.waitForTimeout(400); // catch the processing/progress state
    await page.screenshot({ path: resolve(outDir, `processing-${vp.n}.png`) });
    await page.waitForTimeout(3000); // wait for the worker + review
    await page.screenshot({ path: resolve(outDir, `review-${vp.n}.png`) });
    const body = (await page.textContent('body')) ?? '';
    console.log(
      `${vp.n}: reachedReview=${body.includes('Crea paziente') || body.includes('Aggiorna paziente')} consoleErrors=${errs.length}`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
