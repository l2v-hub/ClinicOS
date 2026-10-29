import assert from 'node:assert/strict';
import { mkdir, writeFile, mkdtemp, rm, rename } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { chromium, expect } from 'playwright/test';
import { FIXTURES } from './fixtures.mjs';
import { job, result } from '../frontend/src/components/shared/import/__tests__/fixtures.ts';

const origin = process.env.QA_ORIGIN ?? 'http://127.0.0.1:5196';
assert(
  /^http:\/\/127\.0\.0\.1:\d+$/.test(origin),
  'Only an isolated localhost QA server is allowed',
);
const root = fileURLToPath(new URL('../', import.meta.url));
const nativeOutput = path.join(root, 'artifacts/task-validation/bug-batch-506/evidence');
const out = process.env.QA_EVIDENCE_DIR ? path.resolve(process.env.QA_EVIDENCE_DIR) : nativeOutput;
assert(
  out === nativeOutput || out.startsWith(nativeOutput + path.sep),
  'Evidence must remain in the owned native packet directory',
);
for (const d of ['screenshots', 'trace', 'video', 'test-results'])
  await mkdir(`${out}/${d}`, { recursive: true });
const cache = await mkdtemp(path.join(os.tmpdir(), 'clinicos-e2e-506-'));
let server, browser;
const results = [];
async function measuredContrast(locator) {
  const value = await locator.evaluate((element) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const rgba = (color) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data).map((n) => n / 255);
    };
    const mix = (color, background) =>
      color.slice(0, 3).map((n, i) => n * color[3] + background[i] * (1 - color[3]));
    const layers = [];
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.backgroundImage !== 'none')
        throw new Error('Contrast measurement requires the actual solid background');
      const color = rgba(style.backgroundColor);
      layers.push(color);
      if (color[3] === 1) break;
    }
    let background = [1, 1, 1];
    for (const layer of layers.reverse()) background = mix(layer, background);
    const foreground = mix(rgba(getComputedStyle(element).color), background);
    const luminance = (color) =>
      color
        .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4))
        .reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
    const a = luminance(foreground),
      b = luminance(background);
    return { ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), foreground, background };
  });
  assert(value.ratio >= 4.5, `Actual normal text contrast must reach4.5:1; got${value.ratio}`);
  return value;
}

try {
  server = await createServer({
    configFile: false,
    envDir: false,
    root: path.join(root, 'frontend'),
    cacheDir: cache,
    plugins: [react()],
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('/__fixture_api') },
    resolve: { alias: { '@': path.join(root, 'frontend/src') } },
    server: {
      host: '127.0.0.1',
      port: Number(new URL(origin).port),
      strictPort: true,
      fs: { allow: [root, cache] },
    },
  });
  await server.listen();
  browser = await chromium.launch({
    executablePath: process.env.QA_CHROMIUM_EXECUTABLE || undefined,
    headless: true,
    args: ['--no-sandbox'],
  });
  for (const width of [1440, 1024, 768, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      recordVideo: { dir: `${out}/video`, size: { width: Math.min(width, 1280), height: 900 } },
    });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await context.newPage();
    const errors = [],
      requests = [];
    const contrasts = {};
    let resumed = false,
      reviewMode = false,
      reviewReady = false,
      patches = 0;
    let failDraftSave = false,
      failedSaveResponses = 0,
      draftCreations = 0;
    let expectedConsoleBudget = 0,
      expectedConsoleFailures = 0;
    const expectedSaveFailures = new Set();
    let holdDraftPatch = false, releaseDraftPatch, draftPatchStarted = false;
    let holdDraftCreation = false, releaseDraftCreation, draftCreationStarted = false;
    let releaseUpload,
      uploadStarted = false,
      uploadCompleted = false,
      uploadedSnapshot = null;
    let draft = {
      id: 'draft-qa-506',
      status: 'draft',
      source: 'import',
      version: 1,
      importJobId: 'job-one',
      data: {
        anagrafica: { firstName: 'Ada QA', lastName: 'Sintetica', sex: 'F' },
        ingresso: { dataPresa: '2026-10-01' },
      },
    };
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const location = m.location().url;
      if (
        expectedConsoleBudget > 0 &&
        location &&
        new URL(location, origin).pathname === '/__fixture_api/intake/drafts/from-import' &&
        /^Failed to load resource: the server responded with a status of 503\b/.test(m.text())
      ) {
        expectedConsoleBudget--;
        expectedConsoleFailures++;
        return;
      }
      errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('response', (r) => {
      if (
        expectedSaveFailures.has(r.request()) &&
        r.status() === 503 &&
        r.request().method() === 'POST' &&
        new URL(r.url()).pathname === '/__fixture_api/intake/drafts/from-import'
      ) {
        failedSaveResponses++;
        return;
      }
      if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`);
    });
    await page.route('**/*', async (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === 'fonts.googleapis.com')
        return route.fulfill({ contentType: 'text/css', body: '' });
      if (u.origin !== origin) {
        errors.push(`Unexpected outbound host: ${u.hostname}`);
        return route.abort();
      }
      if (!u.pathname.startsWith('/__fixture_api/')) return route.continue();
      const path = u.pathname.slice('/__fixture_api'.length),
        method = route.request().method();
      requests.push({ path, method });
      let value;
      if (path === '/ai/extraction/jobs' && method === 'POST') value = { job: job() };
      else if (path === '/ai/extraction/jobs/job-one') {
        value = uploadedSnapshot ?? job(reviewMode ? 3 : 1);
        if (reviewMode) value.status = 'review_ready';
        if (reviewReady)
          value.review = {
            ...value.review,
            canProceed: true,
            unresolvedConflicts: 0,
            manifestRevision: 3,
            resultHash: 'hash-one',
          };
        if (resumed)
          value.review = { ...value.review, draftId: draft.id, draftSourceIsCurrent: true };
      } else if (path === '/ai/extraction/jobs/job-one/result') {
        const data = result();
        if (reviewReady) {
          data._conflicts = [];
          data._review = { decisions: [], unresolvedConflictIds: [] };
        }
        value = { resultData: data };
      } else if (path === '/intake/drafts/from-import' && method === 'POST') {
        if (failDraftSave) {
          expectedSaveFailures.add(route.request());
          expectedConsoleBudget++;
          return route.fulfill({
            status: 503,
            json: {
              error: 'Salvataggio QA intenzionalmente non disponibile',
              code: 'synthetic_save_unavailable',
            },
          });
        }
        if (holdDraftCreation) {
          draftCreationStarted = true;
          await new Promise((resolve) => { releaseDraftCreation = resolve; });
          holdDraftCreation = false;
        }
        draftCreations++;
        resumed = true;
        draft = { ...draft, version: 0, data: {} };
        value = draft;
      } else if (path === '/ai/extraction/jobs/job-one/files' && method === 'POST') {
        uploadStarted = true;
        const match = /name="metadata"\r?\n\r?\n([^\r\n]+)/.exec(
          route.request().postDataBuffer().toString('utf8'),
        );
        assert(match, 'Actual upload must include its metadata');
        const metadata = JSON.parse(match[1]);
        await new Promise((resolve) => {
          releaseUpload = resolve;
        });
        const pageId = 'page-upload',
          documentId = 'document-upload';
        uploadedSnapshot = {
          ...job(2),
          totalBytes: FIXTURES.png.length,
          documents: [
            {
              id: documentId,
              filename: 'synthetic-upload.png',
              mimeType: 'image/png',
              sizeBytes: FIXTURES.png.length,
              pageCount: 1,
              contentUrl: `/__fixture_api/ai/extraction/jobs/job-one/files/${documentId}/content`,
            },
          ],
          manifest: {
            ...job(2).manifest,
            groups: [{ ...job().manifest.groups[0], pageCount: 1 }],
            pages: [
              {
                id: pageId,
                documentId,
                sourcePageNumber: 1,
                groupId: metadata.groupId,
                sortOrder: 0,
                status: 'pending',
                canRetry: false,
                errorCode: null,
                error: null,
              },
            ],
          },
          progress: { ...job().progress, totalPages: 1 },
        };
        value = {
          job: uploadedSnapshot,
          outcomes: [
            {
              filename: 'synthetic-upload.png',
              status: 'accepted',
              documentId,
              clientFileId: metadata.items[0].clientFileId,
              pageIds: [pageId],
            },
          ],
        };
        uploadCompleted = true;
      } else if (path === '/ai/extraction/jobs/job-one/files/document-upload/content')
        return route.fulfill({ contentType: 'image/png', body: FIXTURES.png });
      else if (path === '/intake/drafts/draft-qa-506') {
        if (method === 'PATCH') {
          if (holdDraftPatch) {
            draftPatchStarted = true;
            await new Promise((resolve) => { releaseDraftPatch = resolve; });
            holdDraftPatch = false;
          }
          const { expectedDraftVersion, ...patch } = route.request().postDataJSON();
          assert.equal(expectedDraftVersion, draft.version);
          draft = { ...draft, version: draft.version + 1, data: { ...draft.data, ...patch } };
          patches++;
        }
        value = draft;
      } else {
        errors.push(`Unexpected fixture endpoint: ${method} ${path}`);
        return route.fulfill({ status: 500, json: { error: 'Unexpected fixture endpoint' } });
      }
      return route.fulfill({ json: value });
    });
    try {
      await page.goto(`${origin}/e2e/issue506-workspace.html`);
      const importTrigger = page.getByRole('button', { name: 'Importa dimissione', exact: true });
      await importTrigger.click();
      const region = page.locator('.patient-workspace');
      await expect(
        region.getByRole('heading', { name: 'Importa lettere di dimissione' }),
      ).toBeVisible();
      await expect(
        region.getByRole('region', { name: 'Aggiungi la lettera di dimissione' }),
      ).toBeVisible();
      const assertBounds = async () => {
        const b = await region.boundingBox(),
          top = await page.locator('.compact-topbar').boundingBox(),
          main = await page.locator('main.page-content').boundingBox();
        assert(b && top && main);
        assert(b.y >= top.y + top.height - 1, 'workspace must start below topbar');
        assert(b.x >= main.x - 1);
        assert(b.x + b.width <= width + 1);
        assert(b.y + b.height <= 1001);
        if (width >= 1024) {
          const sidebar = await page.locator('.teams-sidebar').boundingBox();
          assert(sidebar);
          assert(b.x >= sidebar.x + sidebar.width - 1, 'workspace must not overlap sidebar');
        }
        return b;
      };
      const bounds = await assertBounds();
      assert.equal(await region.getAttribute('aria-modal'), null);
      assert.equal(await page.locator('.modal-overlay').count(), 0);
      // Replaced content must not remain a hidden keyboard target.
      assert.equal(await importTrigger.evaluate((e) => !!e.closest('[inert]')), true);
      await page.getByRole('button', { name: 'Profilo QA', exact: true }).click();
      if (width < 1024) await page.getByRole('button', { name: 'Apri navigazione' }).click();
      await page.getByRole('button', { name: 'Pazienti QA', exact: true }).click();
      await expect(page.getByLabel('Navigazioni')).toHaveText('2');
      await page.screenshot({ path: `${out}/screenshots/import-${width}.png`, fullPage: true });
      await region
        .getByRole('button', { name: 'Chiudi e riprendi la sessione', exact: true })
        .click();
      await expect(region).toHaveCount(0);
      assert.equal(await importTrigger.evaluate((e) => !!e.closest('[inert]')), false);
      resumed = true;
      await page.getByRole('button', { name: 'Riprendi bozza', exact: true }).click();
      await expect(region.getByRole('heading', { name: /Nuovo ingresso/ })).toBeVisible();
      await assertBounds();
      const first = page.locator('[data-demographic-field="firstName"]');
      await expect(first).toHaveValue('Ada QA');
      await first.fill('Ada QA aggiornata');
      await page.getByRole('button', { name: 'Cambia pagina QA', exact: true }).click();
      await expect(region).toHaveCount(0);
      assert.equal(
        draft.data.anagrafica.firstName,
        'Ada QA aggiornata',
        'navigation must flush the pending edit before leaving',
      );
      assert(patches > 0);
      await page.getByRole('button', { name: 'Riprendi bozza', exact: true }).click();
      await expect(first).toHaveValue('Ada QA aggiornata');
      await page.screenshot({
        path: `${out}/screenshots/resumed-draft-${width}.png`,
        fullPage: true,
      });
      // A save already in flight must explain why a shell route is refused.
      holdDraftPatch = true;
      await region.getByRole('button', { name: 'Annulla ingresso e salva la bozza', exact: true }).click();
      await expect.poll(() => draftPatchStarted).toBe(true);
      const navigationBeforeSave = await page.getByLabel('Navigazioni').textContent();
      await page.getByRole('button', { name: 'Cambia pagina QA', exact: true }).click();
      const operationNotice = region.getByRole('alert').filter({
        hasText: 'Operazione in corso. Attendi il completamento prima di cambiare pagina.',
      });
      await expect(operationNotice).toBeVisible();
      assert.equal(await operationNotice.evaluate((e) => !!e.closest('[inert]')), false);
      await expect(page.getByLabel('Navigazioni')).toHaveText(navigationBeforeSave);
      releaseDraftPatch();
      await expect(region).toHaveCount(0);
      await expect(operationNotice).toHaveCount(0);
      await page.getByRole('button', { name: 'Riprendi bozza', exact: true }).click();
      await expect(first).toHaveValue('Ada QA aggiornata');
      await page.getByRole('button', { name: 'Cambia pagina QA', exact: true }).click();
      await expect(region).toHaveCount(0);
      await page.getByRole('button', { name: 'Riprendi bozza', exact: true }).click();
      await expect(first).toHaveValue('Ada QA aggiornata');
      await first.fill('Ada QA history');
      await page.goBack();
      await expect(region).toHaveCount(0);
      await expect.poll(() => draft.data.anagrafica.firstName).toBe('Ada QA history');
      await page.getByRole('button', { name: 'Riprendi bozza', exact: true }).click();
      await expect(first).toHaveValue('Ada QA history');
      await page.reload();
      await page.getByRole('button', { name: 'Riprendi bozza', exact: true }).click();
      await expect(page.locator('[data-demographic-field="firstName"]')).toHaveValue(
        'Ada QA history',
      );
      await assertBounds();
      await page.reload();
      resumed = false;
      reviewMode = true;
      await page.getByRole('button', { name: 'Importa dimissione', exact: true }).click();
      await expect(region.getByRole('heading', { name: 'Revisione delle lettere' })).toBeVisible();
      await assertBounds();
      if (width < 1024) {
        await page.getByRole('button', { name: 'Apri navigazione' }).click();
        await expect(page.getByRole('alertdialog')).toHaveCount(0);
      }
      await page.getByRole('button', { name: 'Profilo QA', exact: true }).click();
      const confirmation = page.getByRole('alertdialog', { name: "Chiudere l'importazione?" });
      const assertConfirmationFits = async () => {
        await expect(confirmation).toBeVisible();
        await expect(
          confirmation.getByRole('heading', { name: "Chiudere l'importazione?", exact: true }),
          'Confirmation title must be fully visible inside the viewport',
        ).toBeInViewport({ ratio: 1 });
        await expect
          .poll(
            () =>
              confirmation
                .getByRole('heading', { name: "Chiudere l'importazione?", exact: true })
                .evaluate((element) => {
                  const rect = element.getBoundingClientRect();
                  const top = document.elementFromPoint(
                    rect.x + rect.width / 2,
                    rect.y + rect.height / 2,
                  );
                  return top === element || element.contains(top);
                }),
            { message: 'The application shell must not cover the confirmation title' },
          )
          .toBe(true);
        await expect
          .poll(
            () =>
              confirmation.locator('button:not([disabled])').evaluateAll((buttons) =>
                buttons.every((element) => {
                  const rect = element.getBoundingClientRect();
                  const top = document.elementFromPoint(
                    rect.x + rect.width / 2,
                    rect.y + rect.height / 2,
                  );
                  return top === element || element.contains(top);
                }),
              ),
            { message: 'The application shell must not cover confirmation controls' },
          )
          .toBe(true);
        const bounds = await confirmation.boundingBox();
        assert(
          bounds &&
            bounds.x >= 0 &&
            bounds.y >= 0 &&
            bounds.x + bounds.width <= width + 1 &&
            bounds.y + bounds.height <= 1001,
          'Confirmation and its controls must stay inside the viewport',
        );
      };
      await assertConfirmationFits();
      assert.equal(await confirmation.getAttribute('aria-modal'), 'true');
      await page.keyboard.press('Escape');
      await expect(confirmation).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Profilo QA', exact: true })).toBeFocused();
      await expect(region.getByRole('heading', { name: 'Revisione delle lettere' })).toBeVisible();
      await assertBounds();
      await page.screenshot({ path: `${out}/screenshots/review-${width}.png`, fullPage: true });
      await page.getByRole('button', { name: 'Cambia pagina QA', exact: true }).click();
      await assertConfirmationFits();
      await confirmation.getByRole('button', { name: 'Chiudi senza salvare', exact: true }).click();
      await expect(region).toHaveCount(0);
      await expect(page.getByLabel('Navigazioni')).toHaveText('1');
      // Claude round2: a failed save must cancel its route intent, not freeze
      // the surface or replay that old route on a later explicit header close.
      await page.reload();
      resumed = false;
      reviewMode = true;
      reviewReady = true;
      failDraftSave = true;
      await page.getByRole('button', { name: 'Importa dimissione', exact: true }).click();
      await expect(region.getByRole('heading', { name: 'Revisione delle lettere' })).toBeVisible();
      await page.getByRole('button', { name: 'Cambia pagina QA', exact: true }).click();
      await assertConfirmationFits();
      const saveAndClose = confirmation.getByRole('button', {
        name: 'Salva bozza e chiudi',
        exact: true,
      });
      await expect(saveAndClose).toBeEnabled();
      await saveAndClose.click();
      await expect(
        region.getByText('Salvataggio QA intenzionalmente non disponibile', { exact: true }),
      ).toBeVisible();
      contrasts.saveFailure = await measuredContrast(
        region.getByText('Salvataggio QA intenzionalmente non disponibile', { exact: true }),
      );
      assert.equal(failedSaveResponses, 1, 'Only the controlled negative save request is expected');
      failDraftSave = false;
      await expect(page.getByLabel('Navigazioni')).toHaveText('0');
      await page.getByRole('button', { name: 'Profilo QA', exact: true }).click();
      await expect(
        confirmation,
        'A failed save must allow a fresh navigation confirmation',
      ).toBeVisible();
      await confirmation
        .getByRole('button', { name: 'Continua la revisione', exact: true })
        .click();
      await expect(confirmation).toHaveCount(0);
      await region.locator('.import-modal__head button.icon-btn').click();
      await assertConfirmationFits();
      await page.screenshot({
        path: `${out}/screenshots/save-failure-recovered-${width}.png`,
        fullPage: true,
      });
      await confirmation.getByRole('button', { name: 'Chiudi senza salvare', exact: true }).click();
      await expect(region).toHaveCount(0);
      await expect(page.getByLabel('Navigazioni')).toHaveText('0');

      // Hold a review draft save with no route guard already pending.
      await page.reload();
      resumed = false;
      await page.getByRole('button', { name: 'Importa dimissione', exact: true }).click();
      await expect(region.getByRole('heading', { name: 'Revisione delle lettere' })).toBeVisible();
      holdDraftCreation = true;
      await region.locator('.import-modal__head button.icon-btn').click();
      await assertConfirmationFits();
      await confirmation.getByRole('button', { name: 'Salva bozza e chiudi', exact: true }).click();
      await expect.poll(() => draftCreationStarted).toBe(true);
      await page.getByRole('button', { name: 'Cambia pagina QA', exact: true }).click();
      await expect(operationNotice).toBeVisible();
      await expect(region.getByText('Caricamento in corso. Attendi il completamento prima di cambiare pagina.', { exact: true })).toHaveCount(0);
      await expect(page.getByLabel('Navigazioni')).toHaveText('0');
      releaseDraftCreation();
      await expect(region).toHaveCount(0);
      await expect(operationNotice).toHaveCount(0);
      await expect(page.getByLabel('Navigazioni')).toHaveText('0');
      assert.equal(draftCreations, 1, 'A completed save-and-close must create exactly one draft');
      draftCreationStarted = false;
      draftCreations = 0;

      // A successful confirmed save must still navigate exactly once.
      await page.reload();
      resumed = false;
      await page.getByRole('button', { name: 'Importa dimissione', exact: true }).click();
      await expect(region.getByRole('heading', { name: 'Revisione delle lettere' })).toBeVisible();
      await page.getByRole('button', { name: 'Cambia pagina QA', exact: true }).click();
      await assertConfirmationFits();
      await confirmation.getByRole('button', { name: 'Salva bozza e chiudi', exact: true }).click();
      await expect(region).toHaveCount(0);
      await expect(page.getByLabel('Navigazioni')).toHaveText('1');
      assert.equal(
        draftCreations,
        1,
        'One confirmed save must create one draft in the synthetic fixture',
      );

      // Hold an actual file upload. Its blocked-navigation notice must disappear
      // when the upload completes, without a second navigation interaction.
      await page.reload();
      resumed = false;
      reviewMode = false;
      reviewReady = false;
      await page.getByRole('button', { name: 'Importa dimissione', exact: true }).click();
      await expect(
        region.getByRole('region', { name: 'Aggiungi la lettera di dimissione' }),
      ).toBeVisible();
      await region.locator('input[type=file]').setInputFiles({
        name: 'synthetic-upload.png',
        mimeType: 'image/png',
        buffer: FIXTURES.png,
      });
      await expect.poll(() => uploadStarted).toBe(true);
      await page.getByRole('button', { name: 'Cambia pagina QA', exact: true }).click();
      const uploadNotice = region.getByText(
        'Caricamento in corso. Attendi il completamento prima di cambiare pagina.',
        { exact: true },
      );
      await expect(uploadNotice).toBeVisible();
      contrasts.uploadNotice = await measuredContrast(uploadNotice);
      await expect(page.getByLabel('Navigazioni')).toHaveText('0');
      assert.equal(typeof releaseUpload, 'function');
      releaseUpload();
      await expect.poll(() => uploadCompleted).toBe(true);
      await expect(
        uploadNotice,
        'Upload notice must clear after completion without another click',
      ).toHaveCount(0);
      await page.screenshot({
        path: `${out}/screenshots/upload-notice-cleared-${width}.png`,
        fullPage: true,
      });
      assert.deepEqual(errors, []);
      results.push({
        width,
        bounds,
        resumedDraft: true,
        reviewPhase: true,
        nestedConfirmationEscapePreserved: true,
        navigationClicks: 4,
        immediateNavigationFlushedPendingSave: true,
        browserBackFlushedPendingSave: true,
        confirmedNavigationReplayed: true,
        patches,
        reloadPersistence: 'synthetic fixture server state',
        saveFailureReleasedNavigation: true,
        laterHeaderCloseDidNotReplayRoute: true,
        successfulSaveNavigationCount: 1,
        failedSaveResponses,
        expectedConsoleFailures,
        uploadNoticeClearedWithoutInteraction: true,
        confirmationTitleAndBoundsVisible: true,
        confirmationUnoccluded: true,
        contrasts,
        errors,
        requests,
        status: 'PASS',
      });
    } catch (error) {
      await page
        .screenshot({ path: `${out}/screenshots/failure-${width}.png`, fullPage: true })
        .catch(() => {});
      await writeFile(
        `${out}/test-results/failure-${width}.json`,
        JSON.stringify(
          { status: 'FAIL', width, message: error.message, errors, failedSaveResponses, requests },
          null,
          2,
        ),
      );
      throw error;
    } finally {
      releaseUpload?.();
      await context.tracing.stop({ path: `${out}/trace/issue506-${width}.zip` });
      const video = page.video();
      await context.close();
      assert(video, 'A fresh native evidence video is required');
      await rename(await video.path(), `${out}/video/issue506-${width}.webm`);
    }
  }
  await writeFile(
    `${out}/test-results/browser.json`,
    JSON.stringify(
      {
        results,
        status: 'PASS',
        scope:
          'Actual routed NewPatientFlow/DischargeImportModal/IntakeWorkspace, real production CSS and isolated synthetic HTTP fixtures; not real backend/OCR/provider validation',
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      status: 'PASS',
      viewports: results.map((r) => r.width),
      persistedDrafts: results.length,
    }),
  );
} finally {
  await browser?.close();
  await server?.close();
  await rm(cache, { recursive: true, force: true });
}
