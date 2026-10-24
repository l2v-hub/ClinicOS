import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from 'playwright/test';
import { job, result } from '../frontend/src/components/shared/import/__tests__/fixtures.ts';

const origin = process.env.QA_ORIGIN ?? 'http://127.0.0.1:5196';
assert(/^http:\/\/127\.0\.0\.1:\d+$/.test(origin), 'Only an isolated localhost QA server is allowed');
const out = process.env.QA_EVIDENCE_DIR ?? 'artifacts/task-validation/bug-batch-506-507-import-layout-e-data-inizio-terapia';
for (const d of ['screenshots', 'trace', 'video', 'test-results']) await mkdir(`${out}/${d}`, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const results = [];
try {
  for (const width of [1440, 1024, 768, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, recordVideo: { dir: `${out}/video`, size: { width: Math.min(width, 1280), height: 900 } } });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await context.newPage();
    const errors = [], requests = [];
    let resumed = false, reviewMode = false, patches = 0;
    let draft = { id: 'draft-qa-506', status: 'draft', source: 'import', version: 1, importJobId: 'job-one', data: { anagrafica: { firstName: 'Ada QA', lastName: 'Sintetica', sex: 'F' }, ingresso: { dataPresa: '2026-10-01' } } };
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`); });
    await page.route('**/*', async route => {
      const u = new URL(route.request().url());
      if (u.hostname === 'fonts.googleapis.com') return route.fulfill({ contentType: 'text/css', body: '' });
      if (u.origin !== origin) { errors.push(`Unexpected outbound host: ${u.hostname}`); return route.abort(); }
      if (!u.pathname.startsWith('/__fixture_api/')) return route.continue();
      const path = u.pathname.slice('/__fixture_api'.length), method = route.request().method();
      requests.push({ path, method });
      let value;
      if (path === '/ai/extraction/jobs' && method === 'POST') value = { job: job() };
      else if (path === '/ai/extraction/jobs/job-one') { value = job(reviewMode ? 3 : 1); if (reviewMode) value.status = 'review_ready'; if (resumed) value.review = { ...value.review, draftId: draft.id, draftSourceIsCurrent: true }; }
      else if (path === '/ai/extraction/jobs/job-one/result') value = { resultData: result() };
      else if (path === '/intake/drafts/draft-qa-506') {
        if (method === 'PATCH') { const { expectedDraftVersion, ...patch } = route.request().postDataJSON(); assert.equal(expectedDraftVersion, draft.version); draft = { ...draft, version: draft.version + 1, data: { ...draft.data, ...patch } }; patches++; }
        value = draft;
      } else { errors.push(`Unexpected fixture endpoint: ${method} ${path}`); return route.fulfill({ status: 500, json: { error: 'Unexpected fixture endpoint' } }); }
      return route.fulfill({ json: value });
    });
    try {
      await page.goto(`${origin}/e2e/issue506-workspace.html`);
      const importTrigger = page.getByRole('button', { name: 'Importa dimissione', exact: true });
      await importTrigger.click();
      const region = page.locator('.patient-workspace');
      await expect(region.getByRole('heading', { name: 'Importa lettere di dimissione' })).toBeVisible();
      await expect(region.getByRole('region', { name: 'Aggiungi la lettera di dimissione' })).toBeVisible();
      const assertBounds = async () => {
        const b = await region.boundingBox(), top = await page.locator('.compact-topbar').boundingBox(), main = await page.locator('main.page-content').boundingBox();
        assert(b && top && main); assert(b.y >= top.y + top.height - 1, 'workspace must start below topbar');
        assert(b.x >= main.x - 1); assert(b.x + b.width <= width + 1); assert(b.y + b.height <= 1001);
        if (width >= 1024) { const sidebar = await page.locator('.teams-sidebar').boundingBox(); assert(sidebar); assert(b.x >= sidebar.x + sidebar.width - 1, 'workspace must not overlap sidebar'); }
        return b;
      };
      const bounds = await assertBounds();
      assert.equal(await region.getAttribute('aria-modal'), null); assert.equal(await page.locator('.modal-overlay').count(), 0);
      // Replaced content must not remain a hidden keyboard target.
      assert.equal(await importTrigger.evaluate(e => !!e.closest('[inert]')), true);
      await page.getByRole('button', { name: 'Profilo QA', exact: true }).click();
      if (width < 1024) await page.getByRole('button', { name: 'Apri navigazione' }).click();
      await page.getByRole('button', { name: 'Pazienti QA', exact: true }).click();
      await expect(page.getByLabel('Navigazioni')).toHaveText('2');
      await page.screenshot({ path: `${out}/screenshots/import-${width}.png`, fullPage: true });
      await region.getByRole('button', { name: 'Chiudi e riprendi la sessione', exact: true }).click();
      await expect(region).toHaveCount(0);
      assert.equal(await importTrigger.evaluate(e => !!e.closest('[inert]')), false);
      resumed = true;
      await page.getByRole('button', { name: 'Riprendi bozza', exact: true }).click();
      await expect(region.getByRole('heading', { name: /Nuovo ingresso/ })).toBeVisible();
      await assertBounds();
      const first = page.locator('[data-demographic-field="firstName"]');
      await expect(first).toHaveValue('Ada QA'); await first.fill('Ada QA aggiornata');
      await page.getByRole('button', { name: 'Cambia pagina QA', exact: true }).click();
      await expect(region).toHaveCount(0);
      assert.equal(draft.data.anagrafica.firstName, 'Ada QA aggiornata', 'navigation must flush the pending edit before leaving'); assert(patches > 0);
      await page.getByRole('button', { name: 'Riprendi bozza', exact: true }).click();
      await expect(first).toHaveValue('Ada QA aggiornata');
      await page.screenshot({ path: `${out}/screenshots/resumed-draft-${width}.png`, fullPage: true });
      await page.reload();
      await page.getByRole('button', { name: 'Riprendi bozza', exact: true }).click();
      await expect(page.locator('[data-demographic-field="firstName"]')).toHaveValue('Ada QA aggiornata');
      await assertBounds();
      await page.reload(); resumed = false; reviewMode = true;
      await page.getByRole('button', { name: 'Importa dimissione', exact: true }).click();
      await expect(region.getByRole('heading', { name: 'Revisione delle lettere' })).toBeVisible();
      await assertBounds();
      await page.getByRole('button', { name: 'Profilo QA', exact: true }).click();
      const confirmation = page.getByRole('alertdialog', { name: "Chiudere l'importazione?" });
      await expect(confirmation).toBeVisible(); assert.equal(await confirmation.getAttribute('aria-modal'), 'true');
      await page.keyboard.press('Escape'); await expect(confirmation).toHaveCount(0);
      await expect(region.getByRole('heading', { name: 'Revisione delle lettere' })).toBeVisible();
      await assertBounds();
      await page.screenshot({ path: `${out}/screenshots/review-${width}.png`, fullPage: true });
      assert.deepEqual(errors, []);
      results.push({ width, bounds, resumedDraft: true, reviewPhase: true, nestedConfirmationEscapePreserved: true, navigationClicks: 3, immediateNavigationFlushedPendingSave: true, patches, reloadPersistence: 'synthetic fixture server state', errors, requests, status: 'PASS' });
    } finally {
      await context.tracing.stop({ path: `${out}/trace/issue506-${width}.zip` });
      await context.close();
    }
  }
  await writeFile(`${out}/test-results/browser.json`, JSON.stringify({ results, status: 'PASS', scope: 'Actual routed NewPatientFlow/DischargeImportModal/IntakeWorkspace, real production CSS and isolated synthetic HTTP fixtures; not real backend/OCR/provider validation' }, null, 2));
  console.log(JSON.stringify({ status: 'PASS', viewports: results.map(r => r.width), persistedDrafts: results.length }));
} finally { await browser.close(); }
