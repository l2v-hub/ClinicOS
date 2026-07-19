// REQ-022 async import smoke: verifies the asynchronous contract deterministically.
// - process ENQUEUES (202 + queued), no synchronous model wait
// - the worker step (runJob) drives the state machine to review_ready
// - orphaned in-flight jobs are reclaimed to queued (no work lost on restart)
// - a failed job can be retried without re-uploading; documents are preserved
// - retry is rejected when the job is not in a retryable state
// Mock provider; no real data. Cleans up.
//   AI_PROVIDER=mock DATABASE_URL=... node e2e/async-smoke.mjs
import assert from 'node:assert/strict';
import app from '../backend/src/app.js';
import { prisma } from '../backend/src/lib/prisma.js';
import { runJob } from '../backend/src/ai/upload/job-service.js';
import { reclaimOrphans } from '../backend/src/ai/upload/worker.js';

const OP = { 'X-Operator-Id': 'op-async', 'X-Operator-Role': 'operatore' };
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const { port } = server.address();
const base = `http://127.0.0.1:${port}/ai/extraction/jobs`;
const af = (url, opts = {}) => fetch(url, { ...opts, headers: { ...OP, ...(opts.headers ?? {}) } });
const PDF = Buffer.concat([
  Buffer.from('%PDF-1.4\n'),
  Buffer.from('async test'),
  Buffer.from('%%EOF'),
]);
const get = (id) => af(`${base}/${id}`).then((r) => r.json());

let jobId;
try {
  // 1. Upload + enqueue -> 202 queued (no synchronous model wait).
  const fd = new FormData();
  fd.append('files', new Blob([PDF], { type: 'application/pdf' }), 'd.pdf');
  jobId = (await (await af(base, { method: 'POST', body: fd })).json()).job.id;
  let res = await af(`${base}/${jobId}/process`, { method: 'POST' });
  assert.equal(res.status, 202, 'process returns 202');
  const enq = await res.json();
  assert.equal(enq.status, 'queued', 'status queued immediately');
  assert.ok(
    'elapsedSeconds' in enq && 'canCancel' in enq && 'stage' in enq,
    'status payload has async fields',
  );

  // 2. Worker step drives the state machine to review_ready.
  await runJob(jobId);
  let job = await get(jobId);
  assert.equal(
    job.status,
    'review_ready',
    `worker -> review_ready (got ${job.status}/${job.error ?? ''})`,
  );
  assert.equal(job.stage, 'completed', 'stage completed');

  // 3. Orphan reclaim: simulate a worker death mid-flight -> back to queued.
  await prisma.importJob.update({
    where: { id: jobId },
    data: { status: 'waiting_for_model', stage: 'model_processing' },
  });
  assert.ok((await reclaimOrphans()) >= 1, 'reclaimed orphaned job');
  assert.equal((await get(jobId)).status, 'queued', 'orphan back to queued (work not lost)');

  // 4. Retry a failed job without re-upload; documents preserved.
  await prisma.importJob.update({
    where: { id: jobId },
    data: { status: 'failed', error: '[provider_error] simulato', stage: 'error' },
  });
  res = await af(`${base}/${jobId}/retry`, { method: 'POST' });
  assert.equal(res.status, 202, 'retry returns 202');
  assert.equal((await res.json()).status, 'queued', 'retry re-queues');
  assert.ok(
    (await prisma.importDocument.count({ where: { jobId } })) >= 1,
    'documents preserved across retry',
  );
  await runJob(jobId);
  assert.equal((await get(jobId)).status, 'review_ready', 'retry completes to review_ready');

  // 5. Retry rejected when not retryable.
  assert.equal(
    (await af(`${base}/${jobId}/retry`, { method: 'POST' })).status,
    400,
    'retry on review_ready -> 400',
  );

  console.log('REQ-022 async-smoke: 202 + state-machine + reclaim + retry PASS');
} finally {
  if (jobId) {
    await prisma.importAudit.deleteMany({ where: { jobId } }).catch(() => {});
    await prisma.importDocument.deleteMany({ where: { jobId } }).catch(() => {});
    await prisma.importJob.delete({ where: { id: jobId } }).catch(() => {});
  }
  server.close();
  await prisma.$disconnect();
}
