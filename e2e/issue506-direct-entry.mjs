import assert from 'node:assert/strict';
import { mkdir, writeFile, mkdtemp, rm, rename } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { chromium, expect } from 'playwright/test';
import { job, result } from '../frontend/src/components/shared/import/__tests__/fixtures.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const packet = path.join(root, 'artifacts/task-validation/506-direct-import-entry-followup');
const out = process.env.QA_EVIDENCE_DIR ? path.resolve(process.env.QA_EVIDENCE_DIR) : path.join(packet, 'evidence');
assert(out.startsWith(packet + path.sep), 'Evidence must remain inside this follow-up packet');
const origin = process.env.QA_ORIGIN ?? 'http://127.0.0.1:5297';
assert(/^http:\/\/127\.0\.0\.1:\d+$/.test(origin), 'Synthetic loopback only');
for (const name of ['screenshots', 'trace', 'video', 'test-results', 'playwright-report']) await mkdir(path.join(out, name), { recursive: true });
const cache = await mkdtemp(path.join(os.tmpdir(), 'clinicos-direct506-'));
const results = [];
let server, browser;

async function assertPage(page, width) {
  const region = page.locator('.patient-workspace');
  await expect(region).toBeVisible();
  assert.equal(await page.locator('[aria-modal="true"]').count(), 0);
  const metrics = await region.evaluate(element => {
    const rect = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    const hittable = e => { const r = e.getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!top && e.contains(top); };
    const bar = document.querySelector('.compact-topbar');
    const nav = document.querySelector('.teams-sidebar');
    return { bounds: rect(element), topbar: rect(bar), sidebar: rect(nav), main: rect(document.querySelector('main.page-content')),
      topbarHittable: hittable(bar.querySelector('button')), desktopNavHittable: innerWidth < 1024 || hittable(nav.querySelector('button')) };
  });
  const b = metrics.bounds;
  assert(b.y >= metrics.topbar.y + metrics.topbar.height - 1, 'Workspace below topbar');
  assert(b.x >= metrics.main.x - 1 && b.x + b.width <= width + 1 && b.y + b.height <= 1001);
  if (width >= 1024) assert(b.x >= metrics.sidebar.x + metrics.sidebar.width - 1, 'Workspace beside sidebar');
  assert(metrics.topbarHittable && metrics.desktopNavHittable, 'Real shell controls must not be covered');
  return metrics;
}

try {
  server = await createServer({ configFile: false, envDir: false, root: path.join(root, 'frontend'), cacheDir: cache,
    plugins: [react()], define: { 'import.meta.env.VITE_API_URL': JSON.stringify('/__fixture_api') },
    resolve: { alias: { '@': path.join(root, 'frontend/src') } },
    server: { host: '127.0.0.1', port: Number(new URL(origin).port), strictPort: true, fs: { allow: [root, cache] } } });
  await server.listen();
  browser = await chromium.launch({ headless: true, executablePath: process.env.QA_CHROMIUM_EXECUTABLE || undefined });
  for (const width of [1440, 1024, 768, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, recordVideo: { dir: path.join(out, 'video'), size: { width: Math.min(width, 1280), height: 900 } } });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await context.newPage(), errors = [], requests = [];
    let draft = null, draftCreations = 0, jobCreations = 0, patches = 0, ready = false;
    let lazyHeld = true, lazyStarted = false, releaseLazy;
    const snapshot = () => {
      const value = job(ready ? 3 : 1);
      if (ready) { value.status = 'review_ready'; value.review = { ...value.review, manifestRevision: 3, resultHash: 'hash-one', canProceed: true, unresolvedConflicts: 0 }; }
      if (draft) value.review = { ...value.review, draftId: draft.id, draftSourceIsCurrent: true };
      return value;
    };
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP${response.status()} ${new URL(response.url()).pathname}`); });
    await page.route('**/*', async route => {
      const url = new URL(route.request().url()), method = route.request().method();
      if (url.hostname === 'fonts.googleapis.com') return route.fulfill({ contentType: 'text/css', body: '' });
      if (url.origin !== origin) { errors.push('Unexpected outbound ' + url.hostname); return route.abort(); }
      if (url.pathname === '/src/components/shared/DischargeImportModal.tsx' && lazyHeld) {
        lazyStarted = true; await new Promise(resolve => { releaseLazy = resolve; }); lazyHeld = false;
      }
      if (!url.pathname.startsWith('/__fixture_api/')) return route.continue();
      const endpoint = url.pathname.slice('/__fixture_api'.length);
      requests.push({ path: endpoint, method });
      assert.equal(route.request().headers()['x-operator-id'], 'operator-qa-direct506', 'Every clinical fixture request must carry the explicit synthetic actor');
      let value;
      if (method === 'GET' && endpoint === '/ai/extraction/status') value = { available: true, provider: 'mock', model: 'mock', errors: [] };
      else if (method === 'GET' && endpoint === '/patients/page') value = { items: [], hasMore: false, nextCursor: null };
      else if (method === 'GET' && endpoint === '/patients/settings') value = { deleteEnabled: false };
      else if (method === 'GET' && endpoint === '/intake/drafts') value = draft ? [draft] : [];
      else if (method === 'POST' && endpoint === '/ai/extraction/jobs') { jobCreations++; value = { job: snapshot() }; }
      else if (method === 'GET' && endpoint === '/ai/extraction/jobs/job-one') value = snapshot();
      else if (method === 'GET' && endpoint === '/ai/extraction/jobs/job-one/result') {
        const data = result(); data._conflicts = []; data._review = { decisions: [], unresolvedConflictIds: [] };
        data._sections = { sections: [], demographics: { firstName: 'Ada QA', lastName: 'Sintetica506' }, allergies: { status: 'not_documented' } };
        value = { resultData: data };
      } else if (method === 'POST' && endpoint === '/intake/drafts/from-import') {
        assert.equal(draft, null, 'The same practice must not create a duplicate draft'); draftCreations++;
        draft = { id: 'draft-qa-direct506', source: 'import', status: 'draft', version: 0, importJobId: 'job-one', data: {} }; value = draft;
      } else if (endpoint === '/intake/drafts/draft-qa-direct506' && ['GET', 'PATCH'].includes(method)) {
        assert(draft);
        if (method === 'PATCH') { const { expectedDraftVersion, ...patch } = route.request().postDataJSON(); assert.equal(expectedDraftVersion, draft.version); draft = { ...draft, version: draft.version + 1, data: { ...draft.data, ...patch } }; patches++; }
        value = draft;
      } else { errors.push(`Unexpected fixture ${method} ${endpoint}`); return route.fulfill({ status: 500, json: { error: 'Unexpected synthetic fixture route' } }); }
      return route.fulfill({ json: value });
    });
    try {
      await page.goto(`${origin}/e2e/issue506-direct-entry.html`);
      const importButton = page.getByRole('button', { name: 'Importa lettera di dimissione', exact: true });
      await expect(importButton).toBeEnabled(); await importButton.click();
      await expect.poll(() => lazyStarted).toBe(true);
      await expect(page.getByRole('heading', { name: 'Apertura modulo…', exact: true })).toBeVisible();
      const lazyBounds = await assertPage(page, width);
      assert.equal(jobCreations, 0, 'No job creation before actual lazy module release');
      await page.screenshot({ path: path.join(out, `screenshots/loading-${width}.png`), fullPage: true });
      releaseLazy();
      const region = page.locator('.patient-workspace');
      await expect(region.getByRole('heading', { name: 'Importa lettere di dimissione', exact: true })).toBeVisible();
      await expect(region.getByRole('heading', { name: 'Aggiungi la lettera di dimissione', exact: true })).toBeVisible();
      const importBounds = await assertPage(page, width);
      if (width < 1024) {
        await page.getByRole('button', { name: 'Apri navigazione', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Pazienti QA', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Apri navigazione', exact: true }).click();
      }
      await page.screenshot({ path: path.join(out, `screenshots/direct-import-${width}.png`), fullPage: true });
      await region.getByRole('button', { name: 'Chiudi e riprendi la sessione', exact: true }).click();
      await expect(region).toHaveCount(0); ready = true;
      // The fixture backend now reports its synthetic completed review; no provider is invoked.
      await importButton.click();
      await expect(region.getByRole('heading', { name: 'Revisione delle lettere', exact: true })).toBeVisible();
      await assertPage(page, width);
      await page.screenshot({ path: path.join(out, `screenshots/direct-review-${width}.png`), fullPage: true });
      // For a new target this real review control opens the intake DRAFT, not patient confirmation.
      await region.getByRole('button', { name: 'Crea paziente', exact: true }).click();
      await expect(region.getByRole('heading', { name: /Nuovo ingresso/ })).toBeVisible();
      await assertPage(page, width); assert.equal(draftCreations, 1);
      const firstName = page.locator('[data-demographic-field="firstName"]');
      await expect(firstName).toHaveValue('Ada QA'); await firstName.fill('Ada QA diretta');
      await page.screenshot({ path: path.join(out, `screenshots/direct-handoff-${width}.png`), fullPage: true });
      await region.getByRole('button', { name: 'Annulla ingresso e salva la bozza', exact: true }).click();
      await expect(region).toHaveCount(0); await page.reload();
      const resume = page.getByRole('button', { name: /^Riprendi bozza ·/ });
      await expect(resume).toHaveCount(1); await expect(resume).toContainText('Ada QA diretta'); await resume.click();
      await expect(firstName).toHaveValue('Ada QA diretta'); await assertPage(page, width);
      await firstName.fill('Ada QA persistente');
      await page.getByRole('button', { name: 'Cambia pagina QA', exact: true }).click();
      await expect(region).toHaveCount(0); assert.equal(draft.data.anagrafica.firstName, 'Ada QA persistente');
      if (width < 1024) await page.getByRole('button', { name: 'Apri navigazione', exact: true }).click();
      await page.getByRole('button', { name: 'Pazienti QA', exact: true }).click();
      await expect(resume).toContainText('Ada QA persistente'); await resume.click();
      await expect(firstName).toHaveValue('Ada QA persistente'); await assertPage(page, width);
      await page.screenshot({ path: path.join(out, `screenshots/actual-resume-${width}.png`), fullPage: true });
      await region.getByRole('button', { name: 'Annulla ingresso e salva la bozza', exact: true }).click();
      await expect(region).toHaveCount(0);
      await page.goto(`${origin}/e2e/issue506-direct-entry.html?dialog=1`);
      await importButton.click();
      const dialog = page.getByRole('dialog', { name: /Nuovo ingresso/ });
      await expect(dialog).toBeVisible(); assert.equal(await dialog.getAttribute('aria-modal'), 'true');
      const dialogClose = dialog.getByRole('button', { name: 'Annulla ingresso e salva la bozza', exact: true });
      await expect(dialogClose).toBeEnabled(); await expect(dialogClose).toBeFocused();
      await expect(dialog.locator('[data-demographic-field="firstName"]')).toHaveValue('Ada QA persistente');
      await expect(page.locator('.patient-workspace')).toHaveCount(0);
      await page.screenshot({ path: path.join(out, `screenshots/default-dialog-${width}.png`), fullPage: true });
      const documentPanel = dialog.getByTestId('intake-document-panel');
      await expect(documentPanel).toBeVisible();
      await page.keyboard.press('Escape'); await expect(documentPanel).toHaveCount(0);
      await expect(dialog).toBeVisible(); // Existing document-panel Escape has priority over its parent.
      await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(importButton).toBeFocused();
      assert.equal(jobCreations, 1); assert.equal(draftCreations, 1); assert(patches >= 3);
      assert(!requests.some(r => r.path.endsWith('/confirm') || (r.path.startsWith('/patients/') && r.method !== 'GET')), 'No patient confirmation/write');
      assert.deepEqual(errors, []);
      results.push({ width, status: 'PASS', actualPatientListEntry: true, lazyBounds, importBounds, actualResume: true, draftId: draft.id, jobCreations, draftCreations, patches, persistedAfterReload: true, defaultDialogPreserved: true, errors, requests });
    } catch (error) {
      await page.screenshot({ path: path.join(out, `screenshots/failure-${width}.png`), fullPage: true });
      await writeFile(path.join(out, 'test-results/failure.json'), JSON.stringify({ width, status: 'FAILED', message: error.message, errors, requests }, null, 2));
      throw error;
    } finally {
      releaseLazy?.();
      await context.tracing.stop({ path: path.join(out, `trace/direct506-${width}.zip`) });
      const video = page.video(); await context.close();
      if (video) await rename(await video.path(), path.join(out, `video/direct506-${width}.webm`));
    }
  }
  await writeFile(path.join(out, 'test-results/browser.json'), JSON.stringify({ source: 'actual PatientList and AIImportStatus with synthetic localhost API fixtures', results }, null, 2));
  await writeFile(path.join(out, 'playwright-report/index.html'), '<!doctype html><meta charset="utf-8"><title>Actual direct entry506 QA</title><h1>Actual PatientList entry — synthetic QA</h1><p>Generated companion for actual runner results, not a Playwright Test reporter.</p><a href="../test-results/browser.json">Actual assertions</a><ul>' + results.map(r => `<li>${r.width}: PASS — one job/one draft, actual lazy entry, handoff and resume. <a href="../screenshots/actual-resume-${r.width}.png">Result</a></li>`).join('') + '</ul>');
  console.log(JSON.stringify({ status: 'PASS', widths: results.map(r => r.width), actualEntry: true, syntheticOnly: true }));
} finally {
  await browser?.close(); await server?.close();
  assert.equal(path.dirname(path.resolve(cache)), path.resolve(os.tmpdir()));
  assert(path.basename(cache).startsWith('clinicos-direct506-'), 'Only the owned temporary Vite cache may be removed');
  await rm(cache, { recursive: true, force: true });
}
