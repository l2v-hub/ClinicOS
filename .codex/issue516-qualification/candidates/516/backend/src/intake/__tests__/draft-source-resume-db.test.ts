// Synthetic SQL + HTTP regression. Run only with a disposable test DATABASE_URL and AUTH_MODE=demo.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import express from 'express';
import type { Server } from 'node:http';
import { prisma } from '../../lib/prisma.js';
import { requireOperator } from '../../ai/auth.js';
import importPagesRouter from '../../routes/import-pages.js';

const suffix = randomUUID().slice(0, 8);
const owner = `TEST-RESUME-${suffix}`;
const other = `TEST-OTHER-${suffix}`;
const jobId = `test-resume-job-${suffix}`;
const draftId = `test-resume-draft-${suffix}`;
const saved = { clinical: { operatorChoice: 'synthetic' }, _importSource: { manifestRevision: 6, reviewHash: 'old' } };
const intent = { expectedRevision: 7, requestId: `resume-${suffix}`, resumeDraft: { id: draftId, expectedVersion: 4 } };
let server: Server;
let base: string;

before(async () => {
  assert.equal(process.env.NODE_ENV, 'test', 'isolated test mode required');
  assert.ok(process.env.DATABASE_URL && !/production|railway/i.test(process.env.DATABASE_URL), 'disposable database required');
  process.env.AUTH_MODE = 'demo';
  await prisma.importJob.create({ data: {
    id: jobId, createdById: owner, status: 'expired', manifestRevision: 7,
    manifest: { version: 1, groups: [], pages: [] }, maxFiles: 5, maxTotalBytes: 10_000_000,
    expiresAt: new Date('2020-01-01'),
  } });
  await prisma.patientIntakeDraft.create({ data: {
    id: draftId, createdById: owner, status: 'draft', source: 'import', importJobId: jobId,
    version: 4, data: saved,
  } });
  const app = express();
  app.use(express.json());
  app.use(requireOperator);
  app.use('/ai/extraction/jobs', importPagesRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.patientIntakeDraft.deleteMany({ where: { id: draftId } });
  await prisma.importJob.deleteMany({ where: { id: jobId } });
  await prisma.$disconnect();
});

async function call(body: unknown, operator = owner) {
  const response = await fetch(`${base}/ai/extraction/jobs/${jobId}/reopen`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Operator-Id': operator, 'X-Operator-Role': 'operator' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() as Record<string, any> };
}

test('same linked practice resumes once and HTTP enforces current owner, versions and intent', async () => {
  const denied = await call(intent, other);
  assert.equal(denied.status, 404);
  assert.equal((await call({ ...intent, resumeDraft: null })).status, 400);
  const first = await call(intent);
  assert.equal(first.status, 200);
  assert.equal(first.body.id, jobId);
  assert.equal(first.body.manifest.revision, 8);
  assert.equal(first.body.manifest.groups.length, 1);
  assert.equal(first.body.manifest.pages.length, 0);
  assert.equal(first.body.review.draftSourceIsCurrent, false);
  const replay = await call(intent);
  assert.equal(replay.status, 200);
  assert.deepEqual(replay.body.manifest, first.body.manifest);
  assert.equal((await call({ ...intent, expectedRevision: 8 })).status, 409);
  assert.equal((await call({ ...intent, requestId: `stale-${suffix}` })).status, 409);
  const job = await prisma.importJob.findUniqueOrThrow({ where: { id: jobId } });
  const draft = await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: draftId } });
  assert.equal(job.manifestRevision, 8);
  assert.equal(draft.version, 5);
  assert.equal(draft.importJobId, jobId);
  assert.deepEqual(draft.data, saved);
  assert.equal(await prisma.importDocument.count({ where: { jobId } }), 0);
  assert.equal(await prisma.importMutation.count({ where: { jobId, action: 'resume-expired-draft' } }), 1);
});
