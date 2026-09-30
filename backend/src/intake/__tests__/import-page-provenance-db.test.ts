// backend/src/intake/__tests__/import-page-provenance-db.test.ts
// Ingresso 3b — OCR text per page (AC3) and page provenance of AI-filled intake fields (AC4).
// DB test in the style of draft-import-link-db.test.ts: runs in the CI `gate` job against the
// disposable Postgres service; locally it fails without DATABASE_URL (expected). HTTP calls go
// through the real routers (requireOperator, rate limit, ownership, page-session guard).
// Synthetic data only.

import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import type { Server } from 'node:http';
import { prisma } from '../../lib/prisma.js';
import aiJobsRouter from '../../routes/ai-jobs.js';
import intakeDraftsRouter from '../../routes/intake-drafts.js';
import { extractionConfig, groupHash, pageHash } from '../../ai/upload/pages/inputs.js';
import { assembleResult, buildGroupResult } from '../../ai/upload/pages/results.js';
import { hash, type Manifest } from '../../ai/upload/pages/model.js';
import { reviewHash } from '../../ai/upload/pages/review.js';
import { clearPageSession } from '../../ai/upload/pages/cleanup.js';
import { createTestOperator } from '../../test-support/operator-fixture.js';

type Json = Record<string, unknown>;
const RUN = randomUUID().slice(0, 8);
const OWNER = `TEST-PTXT-OWNER-${RUN}`;
const OTHER = `TEST-PTXT-OTHER-${RUN}`;
const jobIds: string[] = [];
let cleanupOwner: () => Promise<void>;
let server: Server;
let base = '';

// Page 1: identity header. Page 2: clinical text. Synthetic patient.
const PAGE1 =
  'Paziente: Sintetico Paziente, nato il 02/03/1950\nC.F. PZN STC 50C02 H501K\nReparto sintetico';
const PAGE2 =
  '## ANAMNESI\nIperteso da anni\n\n## DIAGNOSI\nScompenso cardiaco\n\n## TERAPIA\nRamipril 5 mg 1 cp ore 8\n\n## ALLERGIE\nPenicillina';
const RAW = {
  anagrafica: { nome: 'Sintetico', cognome: 'Paziente', dataNascita: '1950-03-02', sesso: 'M' },
  cartella: {
    codiceFiscale: 'PZNSTC50C02H501K',
    diagnosi: [{ descrizione: 'Scompenso cardiaco' }],
    allergie: [{ allergene: 'Penicillina' }],
  },
};

before(async () => {
  cleanupOwner = await createTestOperator(OWNER, `test-ptxt-owner-${RUN}@clinicos.test`);
  const app = express();
  app.use(express.json());
  app.use('/ai/extraction/jobs', aiJobsRouter);
  app.use('/intake/drafts', intakeDraftsRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const info = server.address();
      base = `http://127.0.0.1:${typeof info === 'object' && info ? info.port : 0}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.patientIntakeDraft.deleteMany({ where: { createdById: { in: [OWNER, OTHER] } } });
  await prisma.importJob.deleteMany({ where: { id: { in: jobIds } } });
  await cleanupOwner();
  await prisma.$disconnect();
});

async function call(method: string, path: string, body?: unknown, operator = OWNER) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Operator-Id': operator,
      'X-Operator-Role': 'operatore',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, headers: res.headers, body: (await res.json()) as Json };
}

/**
 * A page session with one letter (p1 identity header, p2 clinical text). `ocr` decides which
 * pages have a completed OCR row; `review` publishes the assembled review.
 */
async function pageJob(opts: { review?: boolean; ocr?: Array<'p1' | 'p2'> } = {}) {
  const jobId = `test-ptxt-${RUN}-${jobIds.length}`;
  const documentId = `${jobId}-doc`;
  const sha = hash([jobId, 'synthetic']);
  const m: Manifest = {
    version: 1,
    groups: [{ id: 'g1', label: 'Lettera 1', sortOrder: 0 }],
    pages: [
      { id: 'p1', documentId, sourcePageNumber: 1, groupId: 'g1', sortOrder: 0 },
      { id: 'p2', documentId, sourcePageNumber: 2, groupId: 'g1', sortOrder: 1 },
    ],
  };
  const texts = { p1: PAGE1, p2: PAGE2 };
  const ocr = opts.ocr ?? ['p1', 'p2'];
  const shas = new Map([[documentId, sha]]);
  const outputs = new Map(m.pages.map((p) => [p.id, hash({ rawText: texts[p.id as 'p1'] })]));
  const inputHash = groupHash(m, 'g1', shas, extractionConfig().digest, outputs);
  const full = `${PAGE1}\n\n${PAGE2}`;
  const group = JSON.parse(JSON.stringify(buildGroupResult(m, 'g1', inputHash, full, RAW, 'mock')));
  const result = JSON.parse(JSON.stringify(assembleResult(m, 1, [group])));
  jobIds.push(jobId);
  await prisma.importJob.create({
    data: {
      id: jobId,
      status: opts.review ? 'review_ready' : 'processing_pages',
      createdById: OWNER,
      maxFiles: 5,
      maxTotalBytes: 10 * 1024 * 1024,
      expiresAt: new Date(Date.now() + 60_000),
      manifest: m as object,
      manifestRevision: 1,
      ...(opts.review
        ? {
            resultData: result,
            resultSummary: {
              source: result._source,
              unresolvedConflicts: 0,
              reviewHash: reviewHash(result),
            },
          }
        : {}),
    },
  });
  await prisma.importDocument.create({
    data: {
      id: documentId,
      jobId,
      filename: 'sintetico.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 10,
      sha256: sha,
      storagePath: '',
      sortOrder: 0,
      status: 'uploaded',
    },
  });
  for (const p of m.pages) {
    const done = ocr.includes(p.id as 'p1');
    await prisma.importProcessingUnit.create({
      data: {
        jobId,
        kind: 'ocr',
        unitKey: p.id,
        inputHash: pageHash(p, sha),
        status: done ? 'completed' : 'running',
        ...(done
          ? { result: { rawText: texts[p.id as 'p1'] }, outputHash: outputs.get(p.id)! }
          : {}),
      },
    });
  }
  if (ocr.length === m.pages.length)
    await prisma.importProcessingUnit.create({
      data: {
        jobId,
        kind: 'extraction',
        unitKey: 'g1',
        inputHash,
        status: 'completed',
        result: group,
        outputHash: hash(group),
      },
    });
  return { jobId, documentId, m, result: result as Json };
}

const text = (jobId: string, pageId: string, operator = OWNER) =>
  call('GET', `/ai/extraction/jobs/${jobId}/pages/${pageId}/text`, undefined, operator);

describe('GET /ai/extraction/jobs/:id/pages/:pageId/text (AC3)', () => {
  test('owner gets 200 with the page text, manifestRevision and no-store', async () => {
    const { jobId } = await pageJob();
    const res = await text(jobId, 'p2');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
      pageId: 'p2',
      status: 'completed',
      rawText: PAGE2,
      manifestRevision: 1,
    });
    assert.equal(res.headers.get('cache-control'), 'private, no-store');
  });

  test('another operator and an unknown page are 404', async () => {
    const { jobId } = await pageJob();
    const foreign = await text(jobId, 'p1', OTHER);
    assert.equal(foreign.status, 404);
    assert.ok(!JSON.stringify(foreign.body).includes('Sintetico'));
    const missing = await text(jobId, 'nope');
    assert.equal(missing.status, 404);
    assert.equal((await text(`missing-${RUN}`, 'p1')).status, 404);
  });

  test('OCR not ready: 200 with rawText null', async () => {
    const { jobId } = await pageJob({ ocr: ['p1'] });
    const res = await text(jobId, 'p2');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'running');
    assert.equal(res.body.rawText, null);
  });

  test('a replaced page never returns the old text', async () => {
    const { jobId, m } = await pageJob();
    const replacement = `${jobId}-doc2`;
    await prisma.importDocument.create({
      data: {
        id: replacement,
        jobId,
        filename: 'sostituita.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 10,
        sha256: hash([jobId, 'replacement']),
        storagePath: '',
        sortOrder: 1,
        status: 'uploaded',
      },
    });
    const next = structuredClone(m);
    next.pages[0].documentId = replacement;
    await prisma.importJob.update({
      where: { id: jobId },
      data: { manifest: next as object, manifestRevision: 2 },
    });
    const res = await text(jobId, 'p1');
    assert.equal(res.status, 200);
    assert.equal(res.body.rawText, null);
    assert.equal(res.body.status, 'pending');
    assert.equal(res.body.manifestRevision, 2);
  });

  test('a cancelled session responds 404 like the other page resources', async () => {
    const { jobId } = await pageJob();
    await prisma.$transaction((tx) => clearPageSession(tx, jobId, 'cancelled'));
    assert.equal((await text(jobId, 'p1')).status, 404);
  });

  test('the text never reaches the logs', async () => {
    const { jobId } = await pageJob();
    const seen: string[] = [];
    const methods = ['log', 'info', 'warn', 'error', 'debug'] as const;
    const saved = methods.map((m) => console[m]);
    for (const m of methods)
      console[m] = (...args: unknown[]) => void seen.push(args.map(String).join(' '));
    try {
      await text(jobId, 'p1');
      await text(jobId, 'p2');
      await text(jobId, 'p1', OTHER);
    } finally {
      methods.forEach((m, i) => (console[m] = saved[i]));
    }
    assert.ok(!seen.some((l) => l.includes('Sintetico') || l.includes('Iperteso')));
  });
});

describe('merge-import records the pages of AI fields (AC4)', () => {
  async function linkedDraft(jobId: string) {
    const draft = await prisma.patientIntakeDraft.create({
      data: { status: 'draft', source: 'manual', createdById: OWNER, data: {} },
    });
    const linked = await call('POST', `/intake/drafts/${draft.id}/import-job`, {
      importJobId: jobId,
      expectedDraftVersion: 0,
      requestId: `link-${randomUUID()}`,
    });
    assert.equal(linked.status, 200, JSON.stringify(linked.body));
    return draft.id;
  }
  const p1 = (documentId: string) => ({ groupId: 'g1', pageId: 'p1', documentId });
  const p2 = (documentId: string) => ({ groupId: 'g1', pageId: 'p2', documentId });

  test('per letter and final: _fieldOrigin carries the right pages; GET and PATCH keep them', async () => {
    const { jobId, documentId, result } = await pageJob({ review: true });
    const draftId = await linkedDraft(jobId);
    const letter = await call('POST', `/intake/drafts/${draftId}/merge-import`, {
      requestId: `merge-${randomUUID()}`,
      expectedDraftVersion: 1,
      groupId: 'g1',
    });
    assert.equal(letter.status, 200, JSON.stringify(letter.body));
    let origin = (await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: draftId } }))
      .data as Json;
    let o = origin._fieldOrigin as Record<string, Json>;
    assert.deepEqual(o['anagrafica.lastName'].pages, [p1(documentId)]);
    assert.deepEqual(o['anagrafica.dateOfBirth'].pages, [p1(documentId)]);
    assert.deepEqual(o['anagrafica.codiceFiscale'].pages, [p1(documentId)]);
    assert.deepEqual(o['anagrafica.sex'].pages, [p1(documentId)]);
    assert.deepEqual(o['allergie'].pages, [p2(documentId)]);
    // "Scompenso cardiaco" is too short to anchor a page (fewer than 5 words / 30 characters).
    assert.equal(o['diagnosi'].pages, undefined);
    assert.equal(o['allergieStatus'].pages, undefined);

    const source = result._source as Json;
    const fin = await call('POST', `/intake/drafts/${draftId}/merge-import`, {
      requestId: `final-${randomUUID()}`,
      expectedDraftVersion: 2,
      manifestRevision: source.manifestRevision,
      resultHash: source.resultHash,
    });
    assert.equal(fin.status, 200, JSON.stringify(fin.body));
    origin = (await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: draftId } }))
      .data as Json;
    o = origin._fieldOrigin as Record<string, Json>;
    assert.deepEqual(o['anagrafica.lastName'].pages, [p1(documentId)]);
    assert.deepEqual(o['anagrafica.lastName'].groupIds, ['g1']);
    assert.equal(o['anagrafica.lastName'].final, true);
    assert.deepEqual(o['allergie'].pages, [p2(documentId)]);
    assert.deepEqual(o['allergie'].groupIds, ['g1']);

    // Persistence: GET returns the pages; a client PATCH cannot overwrite _fieldOrigin.
    const got = await call('GET', `/intake/drafts/${draftId}`);
    assert.equal(got.status, 200);
    const gotOrigin = object(object(got.body.data)._fieldOrigin);
    assert.deepEqual(object(gotOrigin['anagrafica.lastName']).pages, [p1(documentId)]);
    const patched = await call('PATCH', `/intake/drafts/${draftId}`, {
      expectedDraftVersion: 3,
      ingresso: { note: 'sintetica' },
      _fieldOrigin: {},
      _fieldProposals: [],
    });
    assert.equal(patched.status, 200, JSON.stringify(patched.body));
    const after = (await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: draftId } }))
      .data as Json;
    const kept = after._fieldOrigin as Record<string, Json>;
    assert.deepEqual(kept['anagrafica.lastName'].pages, [p1(documentId)]);
  });
});

function object(v: unknown): Json {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {};
}
