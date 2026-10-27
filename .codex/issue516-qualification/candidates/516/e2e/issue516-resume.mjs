// Actual React/browser flow with synthetic loopback HTTP, not authenticated backend E2E.
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

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = process.env.QA_ORIGIN ?? 'http://127.0.0.1:5197';
assert(/^http:\/\/127\.0\.0\.1:\d+$/.test(origin), 'Only isolated loopback is allowed');
const nativeOutput = path.join(root, 'artifacts/task-validation/bug-batch-516/evidence');
const out = process.env.QA_EVIDENCE_DIR ? path.resolve(process.env.QA_EVIDENCE_DIR) : nativeOutput;
assert(out === nativeOutput || out.startsWith(nativeOutput + path.sep));
for (const name of ['screenshots', 'trace', 'video', 'test-results'])
  await mkdir(path.join(out, name), { recursive: true });
const cache = await mkdtemp(path.join(os.tmpdir(), 'clinicos-e2e-516-'));
const entry = path.join(root, 'frontend/e2e/issue516-resume.tsx');
const html = `<html lang="it"><head><meta charset="UTF-8"><title>Issue516 synthetic QA</title></head><body><div id="root"></div><script type="module" src="/@fs/${entry}"></script></body></html>`;
const records = [];
const expectedBlobRetirements = [];
const draftListBoundaries = [];
let server, browser;
function fixture(mode) {
  const source = job(7);
  Object.assign(source, { status: 'expired', totalBytes: 0 });
  source.manifest.groups = [];
  source.review.draftId = 'draft-qa-516';
  if (mode === 'cancelled' || mode === 'confirmed') source.status = mode;
  if (mode === 'mismatch') source.review.draftId = 'other-draft';
  if (mode === 'malformed') source.capabilities.sessionVersion = 2;
  return {
    mode,
    source,
    draft: {
      id: 'draft-qa-516',
      importJobId: source.id,
      status: 'draft',
      source: 'import',
      version: 4,
      data: {
        anagrafica: { firstName: 'Ada QA', lastName: 'Sintetica', sex: 'F' },
        ingresso: { dataPresa: '2026-10-01' },
        noteOperatore: 'Synthetic retained operator value',
      },
    },
    calls: [],
    resumes: 0,
    created: 0,
    reads: 0,
    genericReads: 0,
    upload: false,
  };
}
try {
  server = await createServer({
    configFile: false,
    envDir: false,
    root: path.join(root, 'frontend'),
    cacheDir: cache,
    optimizeDeps: { entries: [entry] },
    plugins: [
      react(),
      {
        name: 'qa516-entry',
        configureServer(vite) {
          vite.middlewares.use('/__qa516', async (_req, response, next) => {
            try {
              response.setHeader('Content-Type', 'text/html');
              response.end(await vite.transformIndexHtml('/__qa516', html));
            } catch (error) {
              next(error);
            }
          });
        },
      },
    ],
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('/__fixture_api') },
    server: {
      host: '127.0.0.1',
      port: Number(new URL(origin).port),
      strictPort: true,
      fs: { allow: [root, cache] },
    },
  });
  await server.listen();
  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
    executablePath: process.env.QA_CHROMIUM_EXECUTABLE || undefined,
  });
  for (const width of [1280, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      recordVideo: {
        dir: path.join(out, 'video'),
        size: { width: Math.min(width, 1280), height: 900 },
      },
    });
    await context.tracing.start({ screenshots: false, snapshots: true });
    const page = await context.newPage();
    const errors = [],
      expectedResponses = new Map(),
      expectedFailures = new Set(),
      expectedConsole = [];
    let state, releaseResume;
    const retiredBlobUrls = new Set();
    async function decodeVisibleSourceImages() {
      const decoded = await page.locator('img[src^="blob:"]').evaluateAll(async (images) => {
        await Promise.all(images.map((image) => image.decode()));
        if (images.some((image) => !image.complete || image.naturalWidth === 0))
          throw new Error('Synthetic source image must decode before leaving its workspace');
        return images.map((image) => image.currentSrc || image.src);
      });
      for (const url of decoded) retiredBlobUrls.add(url);
    }
    async function withDraftListCompletion(boundary, trigger) {
      // The fixture refreshes on each outer open-state change, including close.
      // Register before the action; a cached count/networkidle is not completion.
      const responsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'GET' &&
          new URL(response.url()).origin === origin &&
          new URL(response.url()).pathname === '/__fixture_api/intake/drafts',
      );
      const [response] = await Promise.all([responsePromise, Promise.resolve().then(trigger)]);
      assert.equal(response.status(), 200, 'The fixture draft-list refresh must succeed');
      assert.equal(await response.finished(), null, 'Finish the draft-list body before navigation');
      draftListBoundaries.push({ width, mode: state.mode, boundary, status: 200, finished: true });
    }
    const close = async () => {
      await page.waitForLoadState('networkidle');
      await decodeVisibleSourceImages();
      await withDraftListCompletion('close-import', () =>
        page.getByRole('button', { name: 'Chiudi importazione', exact: true }).last().click(),
      );
    };
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const pathname = new URL(message.location().url || origin, origin).pathname;
      const match = expectedConsole.findIndex(
        (x) =>
          x.path === pathname &&
          (x.status
            ? new RegExp(
                `^Failed to load resource: the server responded with a status of ${x.status}\\b`,
              ).test(message.text())
            : /^Failed to load resource: net::ERR_FAILED/.test(message.text())),
      );
      if (match >= 0) expectedConsole.splice(match, 1);
      else errors.push(message.text());
    });
    page.on('response', (response) => {
      if (expectedResponses.get(response.request()) === response.status()) return;
      if (response.status() >= 400)
        errors.push(`HTTP ${response.status()} ${new URL(response.url()).pathname}`);
    });
    page.on('requestfailed', (request) => {
      if (expectedFailures.has(request)) return;
      const url = new URL(request.url());
      const failure = request.failure()?.errorText ?? 'unknown failure';
      // An already decoded image intentionally retired by an explicit navigation
      // can be cancelled by Chromium while its old document is being disposed.
      // This is recorded separately; unknown blobs, decode failures, HTTP failures
      // and other cancellation reasons remain hard failures.
      if (
        url.protocol === 'blob:' &&
        retiredBlobUrls.has(url.href) &&
        failure === 'net::ERR_ABORTED'
      ) {
        expectedBlobRetirements.push({ width, mode: state.mode, url: url.href, failure });
        return;
      }
      errors.push(
        `Failed request ${request.url()} (${failure}, mode=${state.mode}, retired=${retiredBlobUrls.has(url.href)})`,
      );
    });
    await page.route('**/*', async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (url.hostname === 'fonts.googleapis.com')
        return route.fulfill({ body: '', contentType: 'text/css' });
      if (url.origin !== origin) {
        errors.push(`Unexpected host ${url.hostname}`);
        return route.abort();
      }
      if (!url.pathname.startsWith('/__fixture_api/')) return route.continue();
      const endpoint = url.pathname.slice('/__fixture_api'.length),
        method = request.method();
      const reject = (status, code) => {
        expectedResponses.set(request, status);
        expectedConsole.push({ path: url.pathname, status });
        return route.fulfill({ status, json: { error: `Synthetic ${code}`, code } });
      };
      if (endpoint === '/intake/drafts' && method === 'GET')
        return route.fulfill({ json: state.candidates ?? [state.draft] });
      if (endpoint === '/intake/drafts/draft-qa-516' && method === 'GET') {
        if (state.mode === 'identity-denied') return reject(404, 'not_found');
        return route.fulfill({ json: state.draft });
      }
      if (state.newSource && endpoint === '/intake/drafts/draft-qa-516' && method === 'PATCH') {
        const { expectedDraftVersion, ...patch } = request.postDataJSON();
        assert.equal(expectedDraftVersion, state.draft.version);
        state.draft.data = { ...state.draft.data, ...patch };
        state.draft.version++;
        return route.fulfill({ json: state.draft });
      }
      if (endpoint === '/ai/extraction/jobs/job-one' && method === 'GET') {
        state.reads++;
        if (state.mode === 'forbidden') return reject(403, 'forbidden');
        if (state.mode === 'missing') return reject(404, 'not_found');
        if (state.mode === 'uncertain') return reject(503, 'unavailable');
        if (state.processing) {
          state.processing = false;
          state.source.status = 'review_ready';
        }
        return route.fulfill({ json: state.source });
      }
      if (endpoint === '/ai/extraction/jobs/job-one/reopen' && method === 'POST') {
        const body = request.postDataJSON();
        assert.deepEqual(Object.keys(body).sort(), [
          'expectedRevision',
          'requestId',
          'resumeDraft',
        ]);
        assert.equal(body.resumeDraft.id, state.draft.id);
        assert.equal(typeof body.requestId, 'string');
        state.calls.push(body);
        if (state.mode === 'conflict' && state.calls.length === 1) {
          state.draft.version++;
          return reject(409, 'draft_version_conflict');
        }
        if (!state.resumes) {
          assert.equal(body.expectedRevision, state.source.manifest.revision);
          assert.equal(body.resumeDraft.expectedVersion, state.draft.version);
          state.resumes++;
          state.source.status = 'uploaded';
          state.source.manifest.revision++;
          state.source.manifest.groups = [{ ...job().manifest.groups[0], id: 'replacement-group' }];
          state.draft.version++;
          if (state.mode === 'lost') {
            expectedFailures.add(request);
            expectedConsole.push({ path: url.pathname });
            return route.abort('failed');
          }
          if (state.mode === 'temporary') return reject(503, 'uncertain_response');
          if (state.mode === 'success')
            await new Promise((resolve) => {
              releaseResume = resolve;
            });
        } else
          assert.deepEqual(body, state.calls[0], 'Lost-response retry must preserve exact body');
        return route.fulfill({ json: state.source });
      }
      if (endpoint === '/ai/extraction/jobs/job-one/files' && method === 'POST') {
        const metadata = JSON.parse(
          /name="metadata"\r?\n\r?\n([^\r\n]+)/.exec(request.postDataBuffer().toString('utf8'))[1],
        );
        assert.equal(metadata.groupId, 'replacement-group');
        state.upload = true;
        state.source.totalBytes = FIXTURES.png.length;
        state.source.manifest.revision++;
        state.source.documents = [
          {
            id: 'replacement-document',
            filename: 'replacement-synthetic.png',
            mimeType: 'image/png',
            sizeBytes: FIXTURES.png.length,
            pageCount: 1,
            contentUrl:
              '/__fixture_api/ai/extraction/jobs/job-one/files/replacement-document/content',
          },
        ];
        state.source.manifest.groups[0].pageCount = 1;
        state.source.manifest.pages = [
          {
            id: 'replacement-page',
            documentId: 'replacement-document',
            sourcePageNumber: 1,
            groupId: metadata.groupId,
            sortOrder: 0,
            status: 'pending',
            canRetry: false,
            errorCode: null,
            error: null,
          },
        ];
        state.source.progress = { ...state.source.progress, totalPages: 1 };
        return route.fulfill({
          json: {
            job: state.source,
            outcomes: [
              {
                filename: 'replacement-synthetic.png',
                status: 'accepted',
                documentId: 'replacement-document',
                clientFileId: metadata.items[0].clientFileId,
                pageIds: ['replacement-page'],
              },
            ],
          },
        });
      }
      if (endpoint === '/ai/extraction/jobs/job-one/files/replacement-document/content')
        return route.fulfill({ contentType: 'image/png', body: FIXTURES.png });
      if (endpoint === '/ai/extraction/jobs/job-one/process' && method === 'POST') {
        assert(state.upload);
        // The real process endpoint acknowledges queued work; polling later reads its result.
        state.source.status = 'queued';
        state.processing = true;
        state.source.review = {
          ...state.source.review,
          manifestRevision: state.source.manifest.revision,
          resultHash: 'synthetic-replacement-hash',
          canProceed: true,
        };
        return route.fulfill({ json: state.source });
      }
      if (endpoint === '/ai/extraction/jobs/job-one/result') {
        const data = result();
        data._source = {
          manifestRevision: state.source.manifest.revision,
          resultHash: 'synthetic-replacement-hash',
        };
        data._conflicts = [];
        data._review = { decisions: [], unresolvedConflictIds: [] };
        return route.fulfill({ json: { resultData: data } });
      }
      if (endpoint === '/intake/drafts/draft-qa-516/refresh-import' && method === 'POST') {
        const body = request.postDataJSON();
        assert.equal(body.expectedDraftVersion, state.draft.version);
        assert.equal(body.manifestRevision, state.source.manifest.revision);
        state.source.review.draftSourceIsCurrent = true;
        state.draft.version++;
        return route.fulfill({ json: state.draft });
      }
      if (endpoint === '/ai/extraction/jobs/job-new' && method === 'GET') {
        state.genericReads++;
        if (state.newSource) return route.fulfill({ json: state.newSource });
        const value = job();
        value.id = 'job-new';
        value.documents = [
          {
            id: 'uncommitted-document',
            filename: 'uncommitted-source.png',
            mimeType: 'image/png',
            sizeBytes: FIXTURES.png.length,
            pageCount: 1,
            contentUrl:
              '/__fixture_api/ai/extraction/jobs/job-new/files/uncommitted-document/content',
          },
        ];
        value.manifest.groups[0].pageCount = 1;
        value.manifest.pages = [
          {
            id: 'uncommitted-page',
            documentId: 'uncommitted-document',
            sourcePageNumber: 1,
            groupId: 'letter-a',
            sortOrder: 0,
            status: 'pending',
            canRetry: false,
            error: null,
            errorCode: null,
          },
        ];
        return route.fulfill({ json: value });
      }
      if (state.newSource && endpoint === '/ai/extraction/jobs/job-new/result')
        return route.fulfill({ json: { resultData: state.newResult } });
      if (state.newSource && endpoint === '/intake/drafts/from-import' && method === 'POST') {
        const body = request.postDataJSON();
        state.seedCalls.push(body);
        assert.equal(body.importJobId, 'job-new');
        assert.equal(body.reviewedIdentity.firstName, 'MARIO');
        assert.equal(body.reviewedIdentity.lastName, 'Rossi');
        assert.equal(body.reviewedIdentity.dateOfBirth, '1980-01-01');
        assert.equal(body.reviewedIdentity.codiceFiscale, 'RSSMRA80A01H501U');
        const code =
          state.mode === 'identity-ambiguous'
            ? 'ambiguous_intake_drafts'
            : state.mode === 'identity-contradictory'
              ? 'intake_identity_conflict'
              : 'existing_intake_draft';
        expectedResponses.set(request, 409);
        expectedConsole.push({ path: url.pathname, status: 409 });
        const candidates = state.candidates.map((draft) => ({
          id: draft.id,
          version: draft.version,
          source: draft.source,
          importJobId: draft.importJobId,
          createdAt: '2026-10-01T10:00:00.000Z',
          updatedAt: '2026-10-02T10:00:00.000Z',
        }));
        return route.fulfill({
          status: 409,
          json: {
            code,
            error: 'Pratica già presente: verifica prima di proseguire.',
            ...(code === 'intake_identity_conflict' ? {} : { candidates, hasMore: false }),
          },
        });
      }
      if (endpoint === '/ai/extraction/jobs/job-new/files/uncommitted-document/content')
        return route.fulfill({ contentType: 'image/png', body: FIXTURES.png });
      if (
        method === 'POST' &&
        ['/ai/extraction/jobs', '/intake/drafts', '/intake/drafts/from-import'].includes(endpoint)
      )
        state.created++;
      errors.push(`Unexpected endpoint ${method} ${endpoint}`);
      return route.fulfill({ status: 500, json: { error: 'Unexpected synthetic endpoint' } });
    });
    try {
      for (const mode of [
        'success',
        'lost',
        'temporary',
        'conflict',
        'forbidden',
        'missing',
        'uncertain',
        'cancelled',
        'confirmed',
        'mismatch',
        'malformed',
        'preserve',
      ]) {
        await page.waitForLoadState('networkidle');
        await decodeVisibleSourceImages();
        await page.goto('about:blank');
        state = fixture(mode);
        const retained = structuredClone(state.draft.data);
        await withDraftListCompletion('mount', () => page.goto(`${origin}/__qa516`));
        await expect(page.getByLabel('Numero pratiche')).toHaveText('1');
        if (mode === 'preserve') {
          await page.evaluate(() =>
            localStorage.setItem('clinicos:import-session:operator-qa-516:MEDICO', 'job-new'),
          );
          await withDraftListCompletion('open-other', () =>
            page.getByRole('button', { name: 'Riprendi altra importazione', exact: true }).click(),
          );
          await expect(
            page.getByRole('article').filter({ hasText: 'uncommitted-source.png' }),
          ).toBeVisible();
          await close();
        }
        await withDraftListCompletion('open-existing', () =>
          page.getByRole('button', { name: 'Riprendi pratica sintetica', exact: true }).click(),
        );
        const action = page.getByRole('button', {
          name: 'Riprendi la pratica e ricarica i documenti',
          exact: true,
        });
        if (
          [
            'forbidden',
            'missing',
            'uncertain',
            'cancelled',
            'confirmed',
            'mismatch',
            'malformed',
          ].includes(mode)
        ) {
          await expect(page.getByRole('alert')).toBeVisible();
          await expect(action).toHaveCount(0);
          await expect(
            page.getByRole('button', { name: 'Nuova importazione', exact: true }),
          ).toHaveCount(0);
          assert.equal(state.calls.length, 0);
          assert.equal(state.created, 0);
          records.push({ width, mode, status: 'PASS', recoveryOffered: false, created: 0 });
          continue;
        }
        await expect(action).toBeVisible();
        const bounds = await action.boundingBox();
        assert(
          bounds &&
            bounds.x >= 0 &&
            bounds.x + bounds.width <= width &&
            bounds.y >= 0 &&
            bounds.y + bounds.height <= 1000,
          'The explicit recovery action fits the viewport',
        );
        assert(
          await action.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            const hit = document.elementFromPoint(
              rect.x + rect.width / 2,
              rect.y + rect.height / 2,
            );
            return !!hit && (hit === element || element.contains(hit));
          }),
          'The explicit recovery action is not covered',
        );
        if (mode === 'success')
          await page.screenshot({
            path: path.join(out, 'screenshots', `recovery-offered-${width}.png`),
            fullPage: true,
          });
        await expect(
          page.getByRole('button', { name: 'Nuova importazione', exact: true }),
        ).toHaveCount(0);
        assert.equal(state.calls.length, 0, 'No automatic resume');
        await action.click();
        if (mode === 'success') {
          await expect.poll(() => state.calls.length).toBe(1);
          await expect(action).toBeDisabled();
          await action.evaluate((element) => element.click());
          assert.equal(state.calls.length, 1);
          releaseResume();
          releaseResume = undefined;
        }
        if (mode === 'lost' || mode === 'temporary') {
          await expect(page.getByRole('alert')).toContainText('Riprova');
          await action.click();
          await expect.poll(() => state.calls.length).toBe(2);
          assert.deepEqual(state.calls[0], state.calls[1]);
        }
        if (mode === 'conflict') {
          await expect.poll(() => state.reads).toBeGreaterThan(1);
          await expect(action).toBeEnabled();
          assert.equal(state.calls.length, 1, 'Conflict never automatically repeats the mutation');
          await action.click();
          await expect.poll(() => state.calls.length).toBe(2);
          assert.notEqual(state.calls[0].requestId, state.calls[1].requestId);
          assert.equal(state.calls[1].resumeDraft.expectedVersion, 5);
        }
        await expect(
          page.getByRole('heading', { name: 'Aggiungi la lettera di dimissione', exact: true }),
        ).toBeVisible();
        assert.equal(state.resumes, 1);
        assert.equal(state.created, 0);
        assert.deepEqual(state.draft.data, retained);
        await page.screenshot({
          path: path.join(out, 'screenshots', `same-practice-${mode}-${width}.png`),
          fullPage: true,
        });
        if (mode === 'success') {
          await page.locator('input[type="file"]').first().setInputFiles({
            name: 'replacement-synthetic.png',
            mimeType: 'image/png',
            buffer: FIXTURES.png,
          });
          await expect.poll(() => state.upload).toBe(true);
          await page.getByRole('button', { name: 'Avvia elaborazione', exact: true }).click();
          await page.getByRole('button', { name: 'Rivedi le nuove pagine', exact: true }).click();
          await expect(page.locator('[data-draft-id="draft-qa-516"]')).toHaveCount(2);
          assert.deepEqual(state.draft.data, retained);
          await decodeVisibleSourceImages();
          await withDraftListCompletion('reload', () => page.reload());
          await expect(page.locator('[data-draft-id="draft-qa-516"]')).toHaveCount(2);
          assert.equal(state.draft.id, 'draft-qa-516');
          assert.equal(state.source.id, 'job-one');
        } else {
          await close();
          await expect(page.getByLabel('Numero pratiche')).toHaveText('1');
          if (mode === 'preserve') {
            await withDraftListCompletion('open-other', () =>
              page.getByRole('button', { name: 'Riprendi altra importazione', exact: true }).click(),
            );
            await expect(
              page.getByRole('article').filter({ hasText: 'uncommitted-source.png' }),
            ).toBeVisible();
            assert.equal(state.genericReads, 2);
          }
        }
        records.push({
          width,
          mode,
          status: 'PASS',
          sameDraft: state.draft.id,
          sameJob: state.source.id,
          created: state.created,
          resumeMutations: state.resumes,
          calls: state.calls.length,
        });
      }
      for (const mode of [
        'identity-review',
        'identity-import',
        'identity-manual',
        'identity-ambiguous',
        'identity-contradictory',
        'identity-denied',
      ]) {
        await page.waitForLoadState('networkidle');
        await decodeVisibleSourceImages();
        await page.goto('about:blank');
        state = fixture(mode);
        state.seedCalls = [];
        state.draft.data.anagrafica = {
          firstName: 'Mario',
          lastName: 'Rossi',
          dateOfBirth: '1980-01-01',
          codiceFiscale: 'RSSMRA80A01H501U',
        };
        if (!['identity-import', 'identity-review'].includes(mode)) {
          state.draft.source = 'manual';
          state.draft.importJobId = null;
        }
        if (mode === 'identity-review') {
          state.source.status = 'review_ready';
          state.source.review = {
            ...state.source.review,
            canProceed: true,
            draftSourceIsCurrent: false,
          };
        }
        if (mode === 'identity-contradictory')
          state.draft.data.anagrafica.dateOfBirth = '1980-01-02';
        state.candidates = [state.draft];
        if (mode === 'identity-ambiguous')
          state.candidates.push({ ...structuredClone(state.draft), id: 'historical-second-516' });
        state.newSource = job(3);
        Object.assign(state.newSource, { id: 'job-new', status: 'review_ready' });
        state.newSource.review = {
          ...state.newSource.review,
          canProceed: true,
          manifestRevision: 3,
          resultHash: 'identity-new-result',
        };
        state.newSource.documents = [
          {
            id: 'uncommitted-document',
            filename: 'uncommitted-source.png',
            mimeType: 'image/png',
            sizeBytes: FIXTURES.png.length,
            pageCount: 1,
            contentUrl:
              '/__fixture_api/ai/extraction/jobs/job-new/files/uncommitted-document/content',
          },
        ];
        state.newSource.manifest.groups[0].pageCount = 1;
        state.newSource.manifest.pages = [
          {
            id: 'uncommitted-page',
            documentId: 'uncommitted-document',
            sourcePageNumber: 1,
            groupId: 'letter-a',
            sortOrder: 0,
            status: 'completed',
            canRetry: false,
            error: null,
            errorCode: null,
          },
        ];
        state.newResult = result();
        state.newResult._source = { manifestRevision: 3, resultHash: 'identity-new-result' };
        state.newResult._conflicts = [];
        state.newResult._review = { decisions: [], unresolvedConflictIds: [] };
        state.newResult._narrative = {
          firstName: 'Mario',
          lastName: 'Rossi',
          dateOfBirth: '1980-01-01',
          fiscalCode: 'RSSMRA80A01H501U',
          allergyStatus: 'not_documented',
          diagnosisText: 'Sintetico: testo da conservare',
          boldTags: [],
          sourceReferences: [],
        };
        state.newResult._groups = [
          {
            groupId: 'letter-a',
            label: 'Lettera nuova sintetica',
            pageIds: ['uncommitted-page'],
            inputHash: 'identity-new-input',
            rawText: 'Sintetico: testo da conservare',
          },
        ];
        const retained = structuredClone(state.candidates);
        const sourceBefore = structuredClone(state.newSource);
        await withDraftListCompletion('mount', () => page.goto(`${origin}/__qa516`));
        await expect(page.getByLabel('Numero pratiche')).toHaveText(
          String(state.candidates.length),
        );
        await page.evaluate(() =>
          localStorage.setItem('clinicos:import-session:operator-qa-516:MEDICO', 'job-new'),
        );
        await withDraftListCompletion('open-other', () =>
          page.getByRole('button', { name: 'Riprendi altra importazione', exact: true }).click(),
        );
        const review = page.locator('.import-workspace--5050').first();
        await expect(review.locator('[data-demographic-field="firstName"]')).toBeVisible();
        await review.locator('[data-demographic-field="firstName"]').fill('MARIO');
        await review
          .locator('[data-demographic-field="address"]')
          .fill('Via sintetica 516 · correzione manuale non salvata');
        await review.getByRole('button', { name: 'Salva bozza e chiudi', exact: true }).click();
        const choice = review.getByRole('region', { name: 'Pratica già presente', exact: true });
        await expect(choice).toBeVisible();
        assert.equal(state.seedCalls.length, 1);
        assert.equal(state.created, 0);
        const openExisting = choice.getByRole('button', {
          name: 'Apri pratica salvata 1',
          exact: true,
        });
        if (mode === 'identity-contradictory') {
          await expect(openExisting).toHaveCount(0);
        } else {
          await expect(choice.locator('[data-existing-draft-id]')).toHaveCount(
            state.candidates.length,
          );
          await openExisting.click();
          const nested = page.getByRole('dialog').last();
          await expect(nested).toBeVisible();
          assert(
            await review.evaluate((element) => !!element.closest('[inert]')),
            'The actual portalled background review is inert during inspection',
          );
          if (mode === 'identity-review') {
            await expect(
              nested.getByRole('heading', { name: 'Revisione delle lettere', exact: true }),
            ).toBeVisible();
            const duplicateIds = await page.locator('[id]').evaluateAll((elements) => {
              const counts = new Map();
              for (const element of elements)
                counts.set(element.id, (counts.get(element.id) ?? 0) + 1);
              return [...counts].filter(([, count]) => count > 1).map(([id]) => id);
            });
            assert.deepEqual(
              duplicateIds,
              [],
              'Two mounted review forms must have unique accessible field IDs',
            );
            await page.keyboard.press('Escape');
          } else if (mode === 'identity-import') {
            await expect(
              nested.getByRole('button', {
                name: 'Riprendi la pratica e ricarica i documenti',
                exact: true,
              }),
            ).toBeVisible();
            assert.equal(
              state.resumes,
              0,
              'Existing expired practice still needs explicit recovery',
            );
            await nested
              .getByRole('button', { name: 'Chiudi importazione', exact: true })
              .last()
              .click();
          } else if (mode === 'identity-denied') {
            await expect(nested.getByRole('alert')).toContainText('Impossibile aprire la bozza');
            await nested.getByRole('button', { name: 'Annulla ingresso', exact: true }).click();
          } else {
            await expect(nested.locator('[data-demographic-field="firstName"]')).toHaveValue(
              'Mario',
            );
            const savedTime = nested.locator('[data-intake-section="ingresso"] input[type="time"]');
            await savedTime.focus();
            await expect(savedTime).toHaveValue('');
            await page.keyboard.press('Escape');
          }
          await expect(page.getByRole('dialog')).toHaveCount(0);
          await expect(review.locator('[data-demographic-field="firstName"]')).toHaveValue('MARIO');
          await expect(openExisting).toBeFocused();
        }
        await expect(review.locator('[data-demographic-field="firstName"]')).toHaveValue('MARIO');
        await expect(review.locator('[data-demographic-field="address"]')).toHaveValue(
          'Via sintetica 516 · correzione manuale non salvata',
        );
        await expect(review.locator('.iw-doc img')).toBeVisible();
        assert.deepEqual(
          state.newSource,
          sourceBefore,
          'New source and its document are untouched',
        );
        assert.deepEqual(
          state.candidates.map(({ version, ...draft }) => draft),
          retained.map(({ version, ...draft }) => draft),
          'No legacy practice data is merged, relinked or deleted',
        );
        assert.equal(state.created, 0, 'No third practice');
        assert.equal(state.seedCalls.length, 1, 'Inspection never reseeds');
        assert.equal(
          await page.evaluate(() =>
            localStorage.getItem('clinicos:import-session:operator-qa-516:MEDICO'),
          ),
          'job-new',
        );
        await page.screenshot({
          path: path.join(out, 'screenshots', `${mode}-${width}.png`),
          fullPage: true,
        });
        records.push({
          width,
          mode,
          status: 'PASS',
          existingPractices: retained.length,
          created: 0,
          retainedReview: true,
          retainedNewSource: true,
          explicitChoice: mode !== 'identity-contradictory',
        });
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(
        expectedConsole,
        [],
        'Every intentionally failed response has one expected console error',
      );
      await context.tracing.stop({ path: path.join(out, 'trace', `issue516-${width}.zip`) });
      const video = page.video();
      await context.close();
      assert(video);
      await rename(await video.path(), path.join(out, 'video', `issue516-${width}.webm`));
    } catch (error) {
      releaseResume?.();
      await page.screenshot({
        path: path.join(out, 'screenshots', `failure-${width}.png`),
        fullPage: true,
      });
      await writeFile(
        path.join(out, 'test-results', `failure-${width}.json`),
        JSON.stringify({ message: String(error), errors, records, draftListBoundaries }, null, 2),
      );
      await context.tracing.stop({
        path: path.join(out, 'trace', `issue516-${width}-failure.zip`),
      });
      const video = page.video();
      await context.close();
      if (video)
        await rename(await video.path(), path.join(out, 'video', `issue516-${width}-failure.webm`));
      throw error;
    }
  }
  await writeFile(
    path.join(out, 'test-results', 'browser.json'),
    JSON.stringify(
      { scope: 'synthetic loopback React only', records, expectedBlobRetirements, draftListBoundaries },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ status: 'PASS', cases: records.length }));
} finally {
  await browser?.close();
  await server?.close();
  await rm(cache, { recursive: true, force: true });
}
