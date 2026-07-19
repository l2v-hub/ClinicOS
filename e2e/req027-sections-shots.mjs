// REQ-027 screenshots: drives the REAL SPA review with a synthetic Imola `_sections`
// fixture injected via network mocking (model-independent). Produces the mandatory
// imola-*.png set at desktop, plus a tablet final-review.
//   node e2e/req027-sections-shots.mjs <frontendUrl> <outDir>
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { SECTIONS_FIXTURE, SHOTS } from './req027-sections-fixture.mjs';

const FRONTEND = process.argv[2] ?? 'http://localhost:4173';
const outDir = process.argv[3] ?? '.';
mkdirSync(outDir, { recursive: true });

// a real (tiny) file for the file input — content irrelevant, upload is mocked.
const tmpFile = resolve(tmpdir(), 'imola-lettera.pdf');
writeFileSync(tmpFile, '%PDF-1.4\n% synthetic\n');

const JOB = {
  id: 'job-demo',
  status: 'uploaded',
  stage: null,
  completedFiles: 1,
  totalFiles: 1,
  currentFileName: null,
  elapsedSeconds: 0,
  canRetry: false,
  canCancel: true,
  maxFiles: 10,
  maxTotalBytes: 26214400,
  totalBytes: 1024,
  fileCount: 1,
  error: null,
  model: null,
  documents: [
    {
      id: 'doc-1',
      filename: 'lettera-dimissione.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      sortOrder: 0,
      status: 'uploaded',
      logicalDoc: null,
    },
  ],
};

async function mock(page) {
  await page.route('**/*', async (route) => {
    const req = route.request();
    const url = req.url();
    const m = req.method();
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.includes('/ai/extraction/status'))
      return json({ available: true, provider: 'mock', model: 'demo', errors: [] });
    if (url.includes('/ai/extraction/capabilities')) return json({});
    if (url.endsWith('/ai/extraction/schema')) return json({});
    if (url.includes('/ai/extraction/jobs')) {
      if (m === 'POST' && url.endsWith('/process'))
        return json({ ...JOB, status: 'queued', stage: 'queued' });
      if (m === 'POST' && url.endsWith('/retry')) return json({ ...JOB, status: 'queued' });
      if (m === 'POST' && url.endsWith('/confirm'))
        return json(
          {
            status: 'created',
            patient: {
              id: 'p1',
              firstName: 'Mario',
              lastName: 'Bianchi',
              medicalRecordNumber: 'MRN-DEMO',
            },
          },
          201,
        );
      if (m === 'GET' && url.endsWith('/result'))
        return json({
          status: 'review_ready',
          model: 'demo',
          resultData: { _sections: SECTIONS_FIXTURE, rawText: '', _full: {} },
        });
      if (m === 'GET') return json({ ...JOB, status: 'review_ready', stage: 'completed' });
      if (m === 'POST')
        return json({
          job: JOB,
          outcomes: [{ filename: 'lettera-dimissione.pdf', status: 'accepted' }],
        });
      return json(JOB);
    }
    if (url.includes('/patients/settings')) return json({ allowDelete: false });
    if (url.match(/\/patients(\?|$)/))
      return json([
        {
          id: 'p1',
          medicalRecordNumber: 'MRN-1',
          firstName: 'Anna',
          lastName: 'Verdi',
          dateOfBirth: '1950-01-01',
          sex: 'F',
        },
      ]);
    return route.continue();
  });
}

async function reachReview(page) {
  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(700);
  await page.getByText('Operatore', { exact: true }).click();
  await page.waitForTimeout(900);
  await page.getByText('Pazienti').first().click();
  await page.waitForTimeout(700);
  await page.getByText('Importa dimissione').first().click();
  await page.waitForTimeout(500);
  await page.setInputFiles('input[type=file][multiple]', [tmpFile]);
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: /Avvia elaborazione/i }).click();
  await page.waitForSelector('[data-testid="sections-review"]', { timeout: 15000 });
  await page.waitForTimeout(600);
}

const browser = await chromium.launch();
let fail = 0;
try {
  // ── Desktop: full mandatory set ──
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('dialog', (d) => d.accept());
  const errors = [];
  page.on('console', (e) => e.type() === 'error' && errors.push(e.text()));
  await mock(page);
  await reachReview(page);
  for (const [key, name] of SHOTS) {
    const el = page.locator(`[data-testid="srev-${key}"]`);
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await el.screenshot({ path: resolve(outDir, `${name}.png`) });
  }
  await page
    .locator('.import-modal')
    .screenshot({ path: resolve(outDir, 'imola-final-review.png') });
  console.log(`desktop: shots=${SHOTS.length + 1} consoleErrors=${errors.length}`);
  if (errors.length) console.log('first error:', errors[0]);
  await page.close();

  // ── Tablet: final review ──
  const tab = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  tab.on('dialog', (d) => d.accept());
  await mock(tab);
  await reachReview(tab);
  await tab
    .locator('.import-modal')
    .screenshot({ path: resolve(outDir, 'imola-final-review-tablet.png') });
  console.log('tablet: final-review captured');
  await tab.close();
} catch (err) {
  fail = 1;
  console.log('FAILED:', err.message);
} finally {
  await browser.close();
}
process.exit(fail);
