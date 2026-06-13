// One-off: drive the discharge-import flow to the Revisione step and screenshot it.
// Requires backend (:3001, AI_PROVIDER=mock) + frontend (:5173) running.
//   node review-shot.mjs <outDir>
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FRONTEND = 'http://localhost:5173';
const outDir = process.argv[2] ?? '.';
const pdfPath = resolve(outDir, 'synthetic-dimissione.pdf');
writeFileSync(pdfPath, '%PDF-1.4\nSynthetic discharge letter — no real patient data.\n%%EOF');

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.getByText('Operatore', { exact: true }).click();
  await page.waitForTimeout(1500);
  await page.getByText('Pazienti').first().click();
  await page.waitForTimeout(1000);
  await page.getByText('Importa dimissione').first().click();
  await page.waitForTimeout(800);

  // Upload a synthetic file into the hidden multiple file input.
  await page.setInputFiles('input[type=file][multiple]', pdfPath);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: resolve(outDir, 'req017-upload-with-file.png') });
  console.log('SHOT upload-with-file');

  // Start processing -> review step.
  await page.getByRole('button', { name: /Avvia elaborazione/i }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: resolve(outDir, 'req017-review.png') });
  const body = (await page.textContent('body')) ?? '';
  console.log('SHOT review  reachedReview=' + body.includes('Crea paziente') + ' consoleErrors=' + errors.length);
  if (errors.length) console.log('first error:', errors[0]);
} finally {
  await browser.close();
}
