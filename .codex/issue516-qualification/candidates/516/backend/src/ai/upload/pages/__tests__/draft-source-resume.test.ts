import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { prisma } from '../../../../lib/prisma.js';
import { reopenPages } from '../lifecycle.js';
import { ImportSessionError } from '../model.js';

const actor = { id: 'owner', role: 'operator' };
const request = { requestId: 'intent', expectedRevision: 7, resumeDraft: { id: 'draft', expectedVersion: 4 } };
const keys = ['$transaction', '$queryRaw', 'importJob', 'patientIntakeDraft', 'importDocument', 'importProcessingUnit', 'importMutation', 'importAudit'] as const;
const original = Object.fromEntries(keys.map((key) => [key, Reflect.get(prisma, key)]));
afterEach(() => Object.assign(prisma, original));

function fixture(changes: { job?: Record<string, unknown>; draft?: Record<string, unknown>; docs?: number; units?: number } = {}) {
  const data = { clinical: { operatorChoice: 'synthetic' }, _importSource: { manifestRevision: 6, reviewHash: 'old' } };
  const job: Record<string, any> = { id: 'job', createdById: 'owner', status: 'expired', manifestRevision: 7,
    manifest: { version: 1, groups: [], pages: [] }, totalBytes: 0, resultData: null, resultSummary: null,
    runToken: null, runRevision: null, leaseExpiresAt: null, createdPatientId: null, confirmedAt: null,
    currentFileName: null, stage: null, error: null, errorCode: null, expiresAt: new Date('2020-01-01'),
    createdAt: new Date('2019-01-01'), startedAt: null, maxFiles: 30, maxPages: 30, maxTotalBytes: 25000000,
    model: 'mock', documents: [], processingUnits: [], ...changes.job };
  const draft: Record<string, any> = { id: 'draft', createdById: 'owner', status: 'draft', version: 4,
    importJobId: 'job', confirmedPatientId: null, data, ...changes.draft };
  const writes: string[] = [], locks: string[] = [];
  const receipts = new Map<string, Record<string, unknown>>();
  let queue = Promise.resolve();
  Object.assign(prisma, {
    $transaction: <T>(fn: (tx: typeof prisma) => Promise<T>) => {
      const result = queue.then(() => fn(prisma));
      queue = result.then(() => undefined, () => undefined);
      return result;
    },
    $queryRaw: async (strings: TemplateStringsArray | { sql: string }, ...values: unknown[]) => {
      const sql = Array.isArray(strings) ? strings.join('') : (strings as { sql: string }).sql;
      if (sql.includes('FOR UPDATE')) { locks.push(sql.includes('"ImportJob"') ? 'job' : 'draft'); return [{ id: values[0] }]; }
      if (sql.includes('FROM "PatientIntakeDraft"')) return [{ id: draft.id, status: draft.status, source: draft.data._importSource }];
      throw new Error('Unexpected SQL');
    },
    importJob: { findUnique: async () => ({ ...job, documents: [], processingUnits: [] }),
      update: async ({ data: patch }: { data: Record<string, unknown> }) => { writes.push('job'); Object.assign(job, patch); return job; } },
    patientIntakeDraft: { findUnique: async () => draft,
      update: async ({ data: patch }: { data: { version: { increment: number } } }) => {
        writes.push('draft'); draft.version += patch.version.increment; return draft;
      } },
    importDocument: { count: async () => changes.docs ?? 0 },
    importProcessingUnit: { count: async () => changes.units ?? 0 },
    importMutation: {
      findUnique: async ({ where }: { where: { jobId_requestId: { requestId: string } } }) => receipts.get(where.jobId_requestId.requestId) ?? null,
      create: async ({ data: row }: { data: Record<string, unknown> }) => { writes.push('receipt'); receipts.set(String(row.requestId), row); return row; },
    },
    importAudit: { create: async ({ data: row }: { data: Record<string, unknown> }) => {
      writes.push('audit'); assert.match(String(row.detail), /reupload-required/); return row;
    } },
  });
  return { job, draft, data, writes, locks, receipts };
}
async function refuses(body: unknown, changes = {}, as = actor, code?: string) {
  const f = fixture(changes);
  await assert.rejects(reopenPages('job', body, as), (error: unknown) => {
    assert.ok(error instanceof ImportSessionError);
    if (code) assert.equal(error.code, code);
    return true;
  });
  assert.deepEqual(f.writes, []);
}

test('explicit resume preserves draft JSON and IDs, opens empty source, and advances once', async () => {
  const f = fixture();
  const before = structuredClone(f.data);
  const view = await reopenPages('job', request, actor);
  assert.equal(view.id, 'job');
  assert.equal(view.status, 'uploaded');
  assert.equal(view.manifest.revision, 8);
  assert.equal(view.manifest.pages.length, 0);
  assert.equal(view.manifest.groups.length, 1);
  assert.equal(view.review.draftSourceIsCurrent, false);
  assert.equal(f.draft.version, 5);
  assert.deepEqual(f.draft.data, before);
  assert.deepEqual(f.locks.slice(0, 2), ['job', 'draft']);
  assert.deepEqual(f.writes, ['job', 'draft', 'receipt', 'audit']);
});

test('same intent replay and racing requests make one mutation; altered key conflicts', async () => {
  const f = fixture();
  await Promise.all([reopenPages('job', request, actor), reopenPages('job', request, actor)]);
  assert.equal(f.job.manifestRevision, 8);
  assert.equal(f.draft.version, 5);
  assert.equal(f.receipts.size, 1);
  assert.deepEqual(f.writes, ['job', 'draft', 'receipt', 'audit']);
  await assert.rejects(reopenPages('job', { ...request, expectedRevision: 8 }, actor),
    (error: unknown) => error instanceof ImportSessionError && error.code === 'idempotency_conflict');
  await assert.rejects(reopenPages('job', { ...request, resumeDraft: { id: 'draft', expectedVersion: 5 } }, actor),
    (error: unknown) => error instanceof ImportSessionError && error.code === 'idempotency_conflict');
  f.job.status = 'processing_pages';
  f.job.runToken = 'new-process';
  const current = await reopenPages('job', request, actor);
  assert.equal(current.status, 'processing');
  f.draft.importJobId = 'other';
  await assert.rejects(reopenPages('job', request, actor));
  assert.equal(f.writes.length, 4);
});

for (const [name, changes, as] of [
  ['other actor', {}, { id: 'other', role: 'operator' }],
  ['other owner', { draft: { createdById: 'other' } }, actor],
  ['wrong link', { draft: { importJobId: 'other' } }, actor],
  ['closed draft', { draft: { status: 'confirmed' } }, actor],
  ['patient link', { draft: { confirmedPatientId: 'patient' } }, actor],
  ['cancelled', { job: { status: 'cancelled' } }, actor],
  ['confirmed', { job: { status: 'confirmed' } }, actor],
  ['retained page', { job: { manifest: { version: 1, groups: [], pages: [{}] } } }, actor],
  ['retained group', { job: { manifest: { version: 1, groups: [{}], pages: [] } } }, actor],
  ['retained document', { docs: 1 }, actor],
  ['retained unit', { units: 1 }, actor],
  ['result', { job: { resultData: {} } }, actor],
  ['result summary', { job: { resultSummary: {} } }, actor],
  ['run', { job: { runToken: 'live' } }, actor],
  ['run revision', { job: { runRevision: 7 } }, actor],
  ['lease', { job: { leaseExpiresAt: new Date() } }, actor],
  ['stage', { job: { stage: 'ocr' } }, actor],
  ['not expired', { job: { status: 'failed' } }, actor],
  ['confirmed timestamp', { job: { confirmedAt: new Date() } }, actor],
  ['bytes', { job: { totalBytes: 1 } }, actor],
] as const) test(`rejects ${name} without writes`, () => refuses(request, changes, as));

test('malformed or stale intent cannot fall through ordinary reopen', async () => {
  await refuses({ ...request, resumeDraft: null });
  await refuses({ ...request, resumeDraft: { id: 'draft' } });
  await refuses({ ...request, expectedRevision: -1 });
  await refuses({ ...request, requestId: '' });
  await refuses({ ...request, resumeDraft: { id: 'draft', expectedVersion: 3 } }, {}, actor, 'draft_version_conflict');
  await refuses({ ...request, expectedRevision: 6 }, {}, actor, 'revision_conflict');
});

test('ordinary reopen remains compatible', async () => {
  const f = fixture({ job: { status: 'failed' } });
  const view = await reopenPages('job', { expectedRevision: 7 });
  assert.equal(view.status, 'uploaded');
  assert.deepEqual(f.writes, ['job']);
});
