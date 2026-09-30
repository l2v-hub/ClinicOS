// HTTP contract of GET /ai/extraction/jobs/:id/pages/:pageId/text without a database
// (Ingresso 3b, AC3). The owner guard and the handler are the production ones with injected
// loaders; the end-to-end version through the real router is import-page-provenance-db.test.ts.
// Synthetic text only.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { Server } from 'node:http';

process.env.DATABASE_URL ??= 'postgresql://unit:unit@127.0.0.1:1/unit_no_db';

type Json = Record<string, unknown>;
let pageText: typeof import('../page-text.js');
let inputs: typeof import('../inputs.js');
let model: typeof import('../model.js');
let server: Server;
let base = '';

const SECRET = 'Testo clinico sintetico della pagina: Rossi Mario, scompenso cardiaco';
const M = {
  version: 1 as const,
  groups: [{ id: 'g1', label: 'Lettera 1', sortOrder: 0 }],
  pages: [
    { id: 'p1', documentId: 'd1', sourcePageNumber: 1, groupId: 'g1', sortOrder: 0 },
    { id: 'p2', documentId: 'd1', sourcePageNumber: 2, groupId: 'g1', sortOrder: 1 },
  ],
};
const SHAS = new Map([['d1', 'sha-current']]);
const units = () => [
  {
    unitKey: 'p1',
    inputHash: inputs.pageHash(M.pages[0], 'sha-current'),
    status: 'completed',
    result: { rawText: SECRET },
  },
  {
    unitKey: 'p2',
    inputHash: inputs.pageHash(M.pages[1], 'sha-current'),
    status: 'running',
    result: null,
  },
];

before(async () => {
  pageText = await import('../page-text.js');
  inputs = await import('../inputs.js');
  model = await import('../model.js');
  const { createOwnedResourceParamGuard } = await import('../../../ownership-policy.js');
  const app = express();
  app.use((req: Request & { operator?: Json }, _res, next) => {
    req.operator = { id: String(req.header('X-Operator-Id')), role: 'operatore' };
    next();
  });
  app.param(
    'id',
    createOwnedResourceParamGuard(
      async (id) => (id === 'job-1' ? { createdById: 'owner' } : null),
      'Job non trovato',
    ),
  );
  app.get('/jobs/:id/pages/:pageId/text', (req, res, next) =>
    pageText
      .pageTextHandler(async (_jobId, pageId) =>
        pageText.pageTextView(M, 4, SHAS, pageId, units()),
      )(req, res)
      .catch(next),
  );
  app.use((e: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (e instanceof model.ImportSessionError)
      res.status(e.status).json({ error: e.message, code: e.code });
    else next(e);
  });
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const info = server.address();
      base = `http://127.0.0.1:${typeof info === 'object' && info ? info.port : 0}`;
      resolve();
    });
  });
});
after(() => new Promise<void>((resolve) => server.close(() => resolve())));

async function get(path: string, operator = 'owner') {
  const res = await fetch(`${base}${path}`, { headers: { 'X-Operator-Id': operator } });
  return { status: res.status, headers: res.headers, body: (await res.json()) as Json };
}

describe('GET /jobs/:id/pages/:pageId/text — contract (AC3)', () => {
  test('owner gets 200 with the text, the revision and no-store', async () => {
    const res = await get('/jobs/job-1/pages/p1/text');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
      pageId: 'p1',
      status: 'completed',
      rawText: SECRET,
      manifestRevision: 4,
    });
    assert.equal(res.headers.get('cache-control'), 'private, no-store');
  });

  test('OCR not ready yet: 200 with rawText null', async () => {
    const res = await get('/jobs/job-1/pages/p2/text');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'running');
    assert.equal(res.body.rawText, null);
    assert.equal(res.headers.get('cache-control'), 'private, no-store');
  });

  test('another operator and an unknown page are both 404, without text', async () => {
    const foreign = await get('/jobs/job-1/pages/p1/text', 'someone-else');
    assert.equal(foreign.status, 404);
    assert.ok(!JSON.stringify(foreign.body).includes('Rossi'));
    const missing = await get('/jobs/job-1/pages/nope/text');
    assert.equal(missing.status, 404);
    assert.equal(missing.body.code, 'not_found');
  });

  test('the text never reaches the logs', async () => {
    const seen: string[] = [];
    const methods = ['log', 'info', 'warn', 'error', 'debug'] as const;
    const saved = methods.map((m) => console[m]);
    for (const m of methods)
      console[m] = (...args: unknown[]) => void seen.push(args.map(String).join(' '));
    try {
      await get('/jobs/job-1/pages/p1/text');
      await get('/jobs/job-1/pages/nope/text');
      await get('/jobs/job-1/pages/p1/text', 'someone-else');
    } finally {
      methods.forEach((m, i) => (console[m] = saved[i]));
    }
    assert.ok(!seen.some((line) => line.includes('Rossi') || line.includes('scompenso')));
  });
});

describe('pageTextView — current version only (AC3)', () => {
  test('a replaced page (new document bytes) never returns the old text', () => {
    const replaced = new Map([['d1', 'sha-after-replace']]);
    const view = pageText.pageTextView(M, 5, replaced, 'p1', units());
    assert.equal(view.rawText, null);
    assert.equal(view.status, 'pending');
  });

  test('a failed OCR unit returns its status and no text', () => {
    const failed = units().map((u) => ({ ...u, status: 'failed' }));
    const view = pageText.pageTextView(M, 4, SHAS, 'p1', failed);
    assert.deepEqual(view, { pageId: 'p1', status: 'failed', rawText: null, manifestRevision: 4 });
  });

  test('an emptied manifest (expired or cancelled session) makes every page 404', () => {
    const empty = { version: 1 as const, groups: [], pages: [] };
    assert.throws(
      () => pageText.pageTextView(empty, 6, SHAS, 'p1', []),
      (e: unknown) => e instanceof model.ImportSessionError && e.status === 404,
    );
  });
});
