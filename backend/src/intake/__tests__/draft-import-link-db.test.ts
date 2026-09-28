// backend/src/intake/__tests__/draft-import-link-db.test.ts
// Documents inside an open intake draft: link / unlink / merge-import / field proposals.
// DB test in the style of seed-draft-from-import.test.ts (runs in the CI `gate` job against the
// disposable Postgres service). HTTP calls go through the real router so ownership, status codes
// and error codes are the ones the frontend will see. Synthetic data only.

import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import type { Server } from 'node:http';
import { prisma } from '../../lib/prisma.js';
import intakeDraftsRouter from '../../routes/intake-drafts.js';
import { confirmDraft } from '../../ai/upload/confirm-service.js';
import { getPageJob } from '../../ai/upload/pages/repository.js';
import { extractionConfig, groupHash, pageHash } from '../../ai/upload/pages/inputs.js';
import { assembleResult, buildGroupResult } from '../../ai/upload/pages/results.js';
import { hash, type Manifest } from '../../ai/upload/pages/model.js';
import { reviewHash } from '../../ai/upload/pages/review.js';
import { createTestOperator } from '../../test-support/operator-fixture.js';

type Json = Record<string, unknown>;
const RUN = randomUUID().slice(0, 8);
const OWNER = `TEST-LINK-OWNER-${RUN}`;
const OTHER = `TEST-LINK-OTHER-${RUN}`;
const ADMIN = `TEST-LINK-ADMIN-${RUN}`;
const jobIds: string[] = [];
let cleanupOwner: () => Promise<void>;
let server: Server;
let base = '';

const TEXT =
  '## ANAMNESI\nIperteso da anni\n\n## DIAGNOSI\nScompenso cardiaco\n\n## TERAPIA\nRamipril 5 mg 1 cp ore 8\n\n## ALLERGIE\nPenicillina';
const RAW = {
  anagrafica: { nome: 'Sintetico', cognome: 'Paziente', dataNascita: '1950-03-02', sesso: 'M' },
  cartella: {
    diagnosi: [{ descrizione: 'Scompenso cardiaco' }],
    allergie: [{ allergene: 'Penicillina' }],
  },
};
const PATIENT = {
  phone: '+39 333 000 0000',
  firstName: 'Sintetico',
  lastName: 'Paziente',
  dateOfBirth: '1950-03-02',
  codiceFiscale: 'PZNSTC50C02H501K',
};

before(async () => {
  cleanupOwner = await createTestOperator(OWNER, `test-link-owner-${RUN}@clinicos.test`);
  const app = express();
  app.use(express.json());
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
  await prisma.patientIntakeDraft.deleteMany({
    where: { createdById: { in: [OWNER, OTHER, ADMIN] } },
  });
  await prisma.importJob.deleteMany({ where: { id: { in: jobIds } } });
  await cleanupOwner();
  await prisma.$disconnect();
});

async function call(
  method: string,
  path: string,
  body?: unknown,
  operator = OWNER,
  role = 'operatore',
) {
  const res = await fetch(`${base}/intake/drafts${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Operator-Id': operator,
      'X-Operator-Role': role,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as Json };
}

async function draftFor(operator = OWNER, data: Json = {}) {
  return prisma.patientIntakeDraft.create({
    data: { status: 'draft', source: 'manual', createdById: operator, data: data as object },
  });
}

/**
 * A page session with one letter whose OCR + extraction units are current. `stale` keeps only an
 * extraction unit computed for an outdated input; `review` publishes the assembled review.
 */
async function pageJob(
  opts: { status?: string; review?: boolean; stale?: boolean; owner?: string } = {},
) {
  const jobId = `test-link-${RUN}-${jobIds.length}`;
  const documentId = `${jobId}-doc`;
  const sha = hash([jobId, 'synthetic']);
  const m: Manifest = {
    version: 1,
    groups: [{ id: 'g1', label: 'Lettera 1', sortOrder: 0 }],
    pages: [{ id: 'p1', documentId, sourcePageNumber: 1, groupId: 'g1', sortOrder: 0 }],
  };
  const shas = new Map([[documentId, sha]]);
  const ocrResult = { rawText: TEXT };
  const ocrOutput = hash(ocrResult);
  const inputHash = groupHash(
    m,
    'g1',
    shas,
    extractionConfig().digest,
    new Map([['p1', ocrOutput]]),
  );
  const group = JSON.parse(JSON.stringify(buildGroupResult(m, 'g1', inputHash, TEXT, RAW, 'mock')));
  const result = JSON.parse(JSON.stringify(assembleResult(m, 1, [group])));
  jobIds.push(jobId);
  await prisma.importJob.create({
    data: {
      id: jobId,
      status: opts.status ?? (opts.review ? 'review_ready' : 'processing_pages'),
      createdById: opts.owner ?? OWNER,
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
  await prisma.importProcessingUnit.create({
    data: {
      jobId,
      kind: 'ocr',
      unitKey: 'p1',
      inputHash: pageHash(m.pages[0], sha),
      status: 'completed',
      result: ocrResult,
      outputHash: ocrOutput,
    },
  });
  await prisma.importProcessingUnit.create({
    data: {
      jobId,
      kind: 'extraction',
      unitKey: 'g1',
      inputHash: opts.stale ? hash(['outdated', inputHash]) : inputHash,
      status: 'completed',
      result: group,
      outputHash: hash(group),
    },
  });
  return { jobId, result: result as Json, groupOutput: hash(group) };
}

async function link(draftId: string, jobId: string, version = 0, operator = OWNER) {
  return call(
    'POST',
    `/${draftId}/import-job`,
    { importJobId: jobId, expectedDraftVersion: version, requestId: `link-${randomUUID()}` },
    operator,
  );
}
const read = async (id: string) => prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id } });

describe('link / unlink (AC2)', () => {
  test('owner links an open draft; renews the job; second link on the job is 409', async () => {
    const { jobId } = await pageJob();
    const before = (await prisma.importJob.findUniqueOrThrow({ where: { id: jobId } })).expiresAt;
    const draft = await draftFor();
    const requestId = `link-${randomUUID()}`;
    const body = { importJobId: jobId, expectedDraftVersion: 0, requestId };
    const linked = await call('POST', `/${draft.id}/import-job`, body);
    assert.equal(linked.status, 200);
    assert.equal(linked.body.importJobId, jobId);
    assert.equal(linked.body.version, 1);
    const job = await prisma.importJob.findUniqueOrThrow({ where: { id: jobId } });
    assert.ok(job.expiresAt > before, 'job expiry renewed');
    // Same requestId replay → same draft, no second bump.
    const replay = await call('POST', `/${draft.id}/import-job`, body);
    assert.equal(replay.status, 200);
    assert.equal(replay.body.version, 1);
    const second = await draftFor();
    const clash = await link(second.id, jobId);
    assert.equal(clash.status, 409);
    assert.equal(clash.body.code, 'import_job_linked');
    const again = await link(draft.id, jobId, 1);
    assert.equal(again.status, 409);
    assert.equal(again.body.code, 'draft_linked');
  });

  test('ownership: foreign draft and foreign job are both 404', async () => {
    const { jobId } = await pageJob();
    const draft = await draftFor();
    assert.equal((await link(draft.id, jobId, 0, OTHER)).status, 404, 'foreign draft');
    const otherDraft = await draftFor(OTHER);
    const foreignJob = await link(otherDraft.id, jobId, 0, OTHER);
    assert.equal(foreignJob.status, 404, 'foreign job');
    assert.equal((await read(otherDraft.id)).importJobId, null);
  });

  test('confirmed, cancelled or legacy jobs, stale versions and closed drafts are refused', async () => {
    const confirmed = await pageJob({ status: 'confirmed' });
    const cancelled = await pageJob({ status: 'cancelled' });
    const draft = await draftFor();
    assert.equal((await link(draft.id, confirmed.jobId)).body.code, 'session_closed');
    assert.equal((await link(draft.id, cancelled.jobId)).body.code, 'session_closed');
    const legacyId = `test-link-${RUN}-legacy`;
    jobIds.push(legacyId);
    await prisma.importJob.create({
      data: {
        id: legacyId,
        status: 'review_ready',
        createdById: OWNER,
        maxFiles: 5,
        maxTotalBytes: 1000,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const legacy = await link(draft.id, legacyId);
    assert.equal(legacy.status, 409);
    assert.equal(legacy.body.code, 'session_version');
    const { jobId } = await pageJob();
    const stale = await link(draft.id, jobId, 7);
    assert.equal(stale.status, 409);
    assert.equal(stale.body.code, 'draft_version_conflict');
    const closed = await prisma.patientIntakeDraft.create({
      data: { status: 'confirmed', createdById: OWNER, data: {} },
    });
    assert.equal((await link(closed.id, jobId)).body.code, 'draft_closed');
  });

  test('unlink cancels the session and keeps the values; refused after the final merge', async () => {
    const { jobId } = await pageJob();
    const draft = await draftFor(OWNER, { anagrafica: { phone: '+39 333 1234567' } });
    await link(draft.id, jobId);
    const merged = await call('POST', `/${draft.id}/merge-import`, {
      requestId: `m-${randomUUID()}`,
      expectedDraftVersion: 1,
      groupId: 'g1',
    });
    assert.equal(merged.status, 200);
    const unlinked = await call('DELETE', `/${draft.id}/import-job`);
    assert.equal(unlinked.status, 200);
    assert.equal(unlinked.body.importJobId, null);
    const data = unlinked.body.data as Json;
    assert.equal((data.anagrafica as Json).firstName, 'Sintetico', 'AI-filled value kept');
    assert.equal((data.anagrafica as Json).phone, '+39 333 1234567');
    assert.equal(data._fieldOrigin, undefined);
    assert.equal(data._aiMerge, undefined);
    const job = await prisma.importJob.findUniqueOrThrow({ where: { id: jobId } });
    assert.equal(job.status, 'cancelled');
    assert.equal(await prisma.importDocument.count({ where: { jobId } }), 0);
    const notLinked = await call('DELETE', `/${draft.id}/import-job`);
    assert.equal(notLinked.body.code, 'draft_not_linked');

    const review = await pageJob({ review: true });
    const finalDraft = await draftFor();
    await link(finalDraft.id, review.jobId);
    const source = review.result._source as Json;
    const fin = await call('POST', `/${finalDraft.id}/merge-import`, {
      requestId: `f-${randomUUID()}`,
      expectedDraftVersion: 1,
      manifestRevision: source.manifestRevision,
      resultHash: source.resultHash,
    });
    assert.equal(fin.status, 200);
    const refused = await call('DELETE', `/${finalDraft.id}/import-job`);
    assert.equal(refused.status, 409);
    assert.equal(refused.body.code, 'import_source_attached');
    assert.equal(
      (await prisma.importJob.findUniqueOrThrow({ where: { id: review.jobId } })).status,
      'review_ready',
    );
  });
});

describe('merge-import (AC3)', () => {
  test('per letter: fills blanks, versioned and idempotent; stale version is 409', async () => {
    const { jobId, groupOutput } = await pageJob();
    const view = await getPageJob(jobId);
    assert.equal(view.manifest.groups[0].resultHash, groupOutput, 'job view exposes resultHash');
    const draft = await draftFor(OWNER, { anagrafica: { firstName: 'Operatore' } });
    await link(draft.id, jobId);
    const body = { requestId: `m-${randomUUID()}`, expectedDraftVersion: 1, groupId: 'g1' };
    const merged = await call('POST', `/${draft.id}/merge-import`, body);
    assert.equal(merged.status, 200);
    assert.equal(merged.body.version, 2);
    const data = merged.body.data as Json;
    assert.equal((data.anagrafica as Json).firstName, 'Operatore', 'operator value kept');
    assert.equal((data.anagrafica as Json).lastName, 'Paziente');
    assert.equal(((data.diagnosi as Json[])[0] as Json).descrizione, 'Scompenso cardiaco');
    assert.equal(data.terapiaImport, undefined, 'letter merge never touches therapy');
    assert.equal(data._importSource, undefined);
    const proposals = data._fieldProposals as Json[];
    assert.equal(proposals.length, 1);
    assert.equal(proposals[0].path, 'anagrafica.firstName');
    const replay = await call('POST', `/${draft.id}/merge-import`, body);
    assert.equal(replay.status, 200);
    assert.equal(replay.body.version, 2, 'same requestId → same result');
    const stale = await call('POST', `/${draft.id}/merge-import`, {
      ...body,
      requestId: `m-${randomUUID()}`,
    });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.code, 'draft_version_conflict');
    const outdated = await call('POST', `/${draft.id}/merge-import`, {
      requestId: `m-${randomUUID()}`,
      expectedDraftVersion: 2,
      groupId: 'g1',
      resultHash: 'not-the-current-hash',
    });
    assert.equal(outdated.body.code, 'group_result_outdated');
    // Persistence: the server keys survive a reload.
    const reloaded = await call('GET', `/${draft.id}`);
    assert.ok((reloaded.body.data as Json)._fieldOrigin);
    assert.equal(((reloaded.body.data as Json)._fieldProposals as Json[]).length, 1);
  });

  test('per letter ignores units of an outdated input hash', async () => {
    const { jobId } = await pageJob({ stale: true });
    const view = await getPageJob(jobId);
    assert.equal(view.manifest.groups[0].resultHash, null);
    const draft = await draftFor();
    await link(draft.id, jobId);
    const res = await call('POST', `/${draft.id}/merge-import`, {
      requestId: `m-${randomUUID()}`,
      expectedDraftVersion: 1,
      groupId: 'g1',
    });
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'group_not_ready');
    const all = await call('POST', `/${draft.id}/merge-import`, {
      requestId: `m-${randomUUID()}`,
      expectedDraftVersion: 1,
    });
    assert.equal(all.status, 200);
    assert.equal(all.body.version, 1, 'nothing current to merge → no write');
    assert.equal(((all.body.data as Json).anagrafica as Json | undefined)?.lastName, undefined);
  });

  test('final requires the current, fully resolved review', async () => {
    const processing = await pageJob();
    const draft = await draftFor();
    await link(draft.id, processing.jobId);
    const early = await call('POST', `/${draft.id}/merge-import`, {
      requestId: `f-${randomUUID()}`,
      expectedDraftVersion: 1,
      manifestRevision: 1,
      resultHash: 'x',
    });
    assert.equal(early.status, 409);
    assert.equal(early.body.code, 'import_review_outdated');

    const review = await pageJob({ review: true });
    const reviewed = await draftFor();
    await link(reviewed.id, review.jobId);
    const source = review.result._source as Json;
    const wrong = await call('POST', `/${reviewed.id}/merge-import`, {
      requestId: `f-${randomUUID()}`,
      expectedDraftVersion: 1,
      manifestRevision: source.manifestRevision,
      resultHash: 'another-hash',
    });
    assert.equal(wrong.body.code, 'import_review_outdated');
    await prisma.importJob.update({
      where: { id: review.jobId },
      data: {
        resultData: {
          ...review.result,
          _review: { decisions: [], unresolvedConflictIds: ['c1'] },
        } as object,
      },
    });
    const unresolved = await call('POST', `/${reviewed.id}/merge-import`, {
      requestId: `f-${randomUUID()}`,
      expectedDraftVersion: 1,
      manifestRevision: source.manifestRevision,
      resultHash: source.resultHash,
    });
    assert.equal(unresolved.body.code, 'unresolved_conflicts');
    await prisma.importJob.update({
      where: { id: review.jobId },
      data: { resultData: review.result as object },
    });
    const ok = await call('POST', `/${reviewed.id}/merge-import`, {
      requestId: `f-${randomUUID()}`,
      expectedDraftVersion: 1,
      manifestRevision: source.manifestRevision,
      resultHash: source.resultHash,
    });
    assert.equal(ok.status, 200);
    const data = ok.body.data as Json;
    assert.deepEqual(
      (data.terapiaImport as Json[]).map((r) => r.originalText),
      ['Ramipril 5 mg 1 cp ore 8'],
    );
    assert.equal((data._importSource as Json).resultHash, source.resultHash);
    assert.equal((data._aiMerge as Json).final, source.resultHash);
  });
});

describe('field proposals, PATCH and confirm (AC3, AC4)', () => {
  test('confirm is blocked while a field proposal is pending; decide is versioned + idempotent', async () => {
    const { jobId } = await pageJob();
    const draft = await draftFor(OWNER, { anagrafica: { firstName: 'Operatore' } });
    await link(draft.id, jobId);
    const merged = await call('POST', `/${draft.id}/merge-import`, {
      requestId: `m-${randomUUID()}`,
      expectedDraftVersion: 1,
      groupId: 'g1',
    });
    const pid = String(((merged.body.data as Json)._fieldProposals as Json[])[0].id);
    await assert.rejects(
      () => confirmDraft(draft.id, { patient: PATIENT }, { id: OWNER }),
      (err: { code?: string; status?: number }) =>
        err.code === 'field_proposals_pending' && err.status === 409,
    );
    const confirmHttp = await call('POST', `/${draft.id}/confirm`, { patient: PATIENT });
    assert.equal(confirmHttp.status, 409);
    assert.equal(confirmHttp.body.code, 'field_proposals_pending');
    assert.equal((await read(draft.id)).status, 'draft');

    const stale = await call('POST', `/${draft.id}/field-proposals/${pid}/decide`, {
      action: 'apply',
      requestId: `d-${randomUUID()}`,
      expectedDraftVersion: 1,
    });
    assert.equal(stale.body.code, 'draft_version_conflict');
    const body = { action: 'apply', requestId: `d-${randomUUID()}`, expectedDraftVersion: 2 };
    const applied = await call('POST', `/${draft.id}/field-proposals/${pid}/decide`, body);
    assert.equal(applied.status, 200);
    assert.equal(applied.body.version, 3);
    const data = applied.body.data as Json;
    assert.equal((data.anagrafica as Json).firstName, 'Sintetico');
    assert.equal(((data._fieldProposals as Json[])[0] as Json).status, 'applied');
    const replay = await call('POST', `/${draft.id}/field-proposals/${pid}/decide`, body);
    assert.equal(replay.status, 200);
    assert.equal(replay.body.version, 3);
    const decided = await call('POST', `/${draft.id}/field-proposals/${pid}/decide`, {
      action: 'keep',
      requestId: `d-${randomUUID()}`,
      expectedDraftVersion: 3,
    });
    assert.equal(decided.body.code, 'proposal_decided');
  });

  test('PATCH ignores the server keys (200) and renews a linked job', async () => {
    const plain = await draftFor();
    const res = await call('PATCH', `/${plain.id}`, {
      anagrafica: { firstName: 'Nome' },
      _fieldOrigin: { 'anagrafica.firstName': { by: 'ai', value: 'Nome' } },
      _fieldProposals: [{ id: 'x', path: 'anagrafica.firstName', status: 'pending' }],
      _aiMerge: { final: 'forged' },
    });
    assert.equal(res.status, 200);
    const data = res.body.data as Json;
    assert.equal((data.anagrafica as Json).firstName, 'Nome');
    assert.equal(data._fieldOrigin, undefined);
    assert.equal(data._fieldProposals, undefined);
    assert.equal(data._aiMerge, undefined);

    const { jobId } = await pageJob();
    const linkedDraft = await draftFor(OWNER, { anagrafica: { firstName: 'Operatore' } });
    await link(linkedDraft.id, jobId);
    const merged = await call('POST', `/${linkedDraft.id}/merge-import`, {
      requestId: `m-${randomUUID()}`,
      expectedDraftVersion: 1,
      groupId: 'g1',
    });
    const before = merged.body.data as Json;
    await prisma.importJob.update({
      where: { id: jobId },
      data: { expiresAt: new Date(Date.now() + 1000) },
    });
    const edit = { ingresso: { note: 'sintetica' }, _fieldProposals: [], _fieldOrigin: {} };
    // A6: a linked draft without _importSource is versioned like a page-session draft.
    const unversioned = await call('PATCH', `/${linkedDraft.id}`, edit);
    assert.equal(unversioned.status, 409);
    assert.equal(unversioned.body.code, 'draft_version_required');
    const stalePatch = await call('PATCH', `/${linkedDraft.id}`, {
      ...edit,
      expectedDraftVersion: 1,
    });
    assert.equal(stalePatch.status, 409);
    assert.equal(stalePatch.body.code, 'draft_version_conflict');
    const patched = await call('PATCH', `/${linkedDraft.id}`, { ...edit, expectedDraftVersion: 2 });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.version, 3);
    const after = patched.body.data as Json;
    assert.deepEqual(after._fieldProposals, before._fieldProposals, 'proposals not forged away');
    assert.deepEqual(after._fieldOrigin, before._fieldOrigin);
    const job = await prisma.importJob.findUniqueOrThrow({ where: { id: jobId } });
    assert.ok(job.expiresAt.getTime() > Date.now() + 5000, 'linked job expiry renewed');
  });
});

describe('QA follow-up (A2, idempotency, expiry, keep)', () => {
  test('A2: even an admin cannot link documents and a chart of different operators', async () => {
    const { jobId } = await pageJob(); // owned by OWNER
    const draft = await draftFor(OTHER);
    const res = await call(
      'POST',
      `/${draft.id}/import-job`,
      { importJobId: jobId, expectedDraftVersion: 0, requestId: `link-${randomUUID()}` },
      ADMIN,
      'admin',
    );
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'owner_mismatch');
    assert.equal((await read(draft.id)).importJobId, null);
    // Same owner through an admin is allowed.
    const own = await draftFor(OWNER);
    const ok = await call(
      'POST',
      `/${own.id}/import-job`,
      { importJobId: jobId, expectedDraftVersion: 0, requestId: `link-${randomUUID()}` },
      ADMIN,
      'admin',
    );
    assert.equal(ok.status, 200);
  });

  test('a link on an expired session is refused', async () => {
    const { jobId } = await pageJob({ status: 'expired' });
    const draft = await draftFor();
    const res = await link(draft.id, jobId);
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'session_closed');
  });

  test('the same requestId with a different payload is 409 idempotency_conflict', async () => {
    const { jobId } = await pageJob();
    const draft = await draftFor();
    await link(draft.id, jobId);
    const requestId = `m-${randomUUID()}`;
    const first = await call('POST', `/${draft.id}/merge-import`, {
      requestId,
      expectedDraftVersion: 1,
      groupId: 'g1',
    });
    assert.equal(first.status, 200);
    const reused = await call('POST', `/${draft.id}/merge-import`, {
      requestId,
      expectedDraftVersion: 2,
    });
    assert.equal(reused.status, 409);
    assert.equal(reused.body.code, 'idempotency_conflict');
    assert.equal((await read(draft.id)).version, 2);
  });

  test("'keep' via HTTP leaves the operator value and closes the proposal", async () => {
    const { jobId } = await pageJob();
    const draft = await draftFor(OWNER, { anagrafica: { firstName: 'Operatore' } });
    await link(draft.id, jobId);
    const merged = await call('POST', `/${draft.id}/merge-import`, {
      requestId: `m-${randomUUID()}`,
      expectedDraftVersion: 1,
      groupId: 'g1',
    });
    const pid = String(((merged.body.data as Json)._fieldProposals as Json[])[0].id);
    const kept = await call('POST', `/${draft.id}/field-proposals/${pid}/decide`, {
      action: 'keep',
      requestId: `d-${randomUUID()}`,
      expectedDraftVersion: 2,
    });
    assert.equal(kept.status, 200);
    const data = kept.body.data as Json;
    assert.equal((data.anagrafica as Json).firstName, 'Operatore');
    assert.equal(((data._fieldProposals as Json[])[0] as Json).status, 'kept');
    // A later merge of the same letter does not raise the kept value again.
    const again = await call('POST', `/${draft.id}/merge-import`, {
      requestId: `m-${randomUUID()}`,
      expectedDraftVersion: 3,
    });
    assert.equal(again.status, 200);
    assert.equal(
      ((again.body.data as Json)._fieldProposals as Json[]).filter((p) => p.status === 'pending')
        .length,
      0,
    );
  });
});
