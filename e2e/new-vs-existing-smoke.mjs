// REQ-021 (current architecture): the discharge import targets a NEW or EXISTING patient
// at CONFIRM time. Extraction itself runs in the clinicos-ai-runtime service (mock provider
// here -> deterministic EMPTY proposal that never invents data); the operator supplies the
// reviewed patient and chooses new/existing at confirm. There is no in-process "agent" that
// auto-decides the target anymore (that module was removed with the runtime split).
//
// Verifies, against the real backend + runtime:
//  - upload -> process(202) -> worker -> review_ready
//  - confirm mode:'new'      -> 201 created
//  - re-import + mode:'existing' -> 200 updated (cartella merged, NO new patient)
//  - confirm mode:'new' with the SAME identity -> 409 duplicate (no second patient)
//   AI_RUNTIME_URL=... AI_RUNTIME_SERVICE_TOKEN=... DATABASE_URL=... node e2e/new-vs-existing-smoke.mjs
import assert from 'node:assert/strict';
import app from '../backend/src/app.js';
import { prisma } from '../backend/src/lib/prisma.js';
import { runJob } from '../backend/src/ai/upload/job-service.js';

const OP = { 'X-Operator-Id': 'op-targeting', 'X-Operator-Role': 'operatore' };
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const { port } = server.address();
const base = `http://127.0.0.1:${port}/ai/extraction/jobs`;
const af = (url, opts = {}) => fetch(url, { ...opts, headers: { ...OP, ...(opts.headers ?? {}) } });
const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from('synthetic targeting test'), Buffer.from('%%EOF')]);

const SYNTH = { firstName: 'TargetMock', lastName: 'Sintetico', dateOfBirth: '1970-01-01' };
const jobs = [];
let createdId;

async function reviewReadyJob() {
  const fd = new FormData();
  fd.append('files', new Blob([PDF], { type: 'application/pdf' }), 'd.pdf');
  let r = await af(base, { method: 'POST', body: fd });
  const b = await r.json();
  jobs.push(b.job.id);
  r = await af(`${base}/${b.job.id}/process`, { method: 'POST' });
  assert.equal(r.status, 202, 'process 202 async');
  await runJob(b.job.id);
  const pj = await (await af(`${base}/${b.job.id}`)).json();
  assert.equal(pj.status, 'review_ready', `review_ready (got ${pj.status}/${pj.error ?? ''})`);
  return b.job.id;
}

try {
  await prisma.patient.deleteMany({ where: { firstName: SYNTH.firstName, lastName: SYNTH.lastName } });

  // 1. Confirm as NEW -> patient created (201).
  const job1 = await reviewReadyJob();
  let r = await af(`${base}/${job1}/confirm`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'new', patient: SYNTH, cartella: { statoRicovero: 'ricoverato' } }),
  });
  assert.equal(r.status, 201, 'new confirm -> 201');
  createdId = (await r.json()).patient.id;

  // 2. Re-import + confirm EXISTING -> cartella updated (200), NO new patient.
  const before = await prisma.patient.count();
  const job2 = await reviewReadyJob();
  r = await af(`${base}/${job2}/confirm`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'existing', patientId: createdId, patient: SYNTH, cartella: { statoRicovero: 'dimesso', diagnosi: [{ descrizione: 'Nuova diagnosi' }] } }),
  });
  assert.equal(r.status, 200, 'existing confirm -> 200');
  assert.equal((await r.json()).status, 'updated', 'status updated (not created)');
  assert.equal(await prisma.patient.count(), before, 'no new patient created on existing');
  const cart = await prisma.cartella.findUnique({ where: { patientId: createdId } });
  assert.equal(cart.data.statoRicovero, 'dimesso', 'existing scalar updated');
  assert.equal(cart.data.diagnosi.length, 1, 'existing diagnosi appended');

  // 3. Confirm NEW with the SAME identity -> 409 duplicate, no second patient.
  const job3 = await reviewReadyJob();
  r = await af(`${base}/${job3}/confirm`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'new', patient: SYNTH, cartella: { statoRicovero: 'ricoverato' } }),
  });
  assert.equal(r.status, 409, 'same identity -> 409 duplicate');
  assert.equal((await r.json()).status, 'duplicate', 'flagged as duplicate');
  assert.equal(await prisma.patient.count(), before, 'duplicate did not create a patient');

  console.log('REQ-021 new/existing targeting (current architecture): PASS');
} finally {
  for (const id of jobs) {
    await prisma.importAudit.deleteMany({ where: { jobId: id } }).catch(() => {});
    await prisma.importDocument.deleteMany({ where: { jobId: id } }).catch(() => {});
    await prisma.importJob.delete({ where: { id } }).catch(() => {});
  }
  if (createdId) {
    await prisma.cartella.deleteMany({ where: { patientId: createdId } }).catch(() => {});
    await prisma.patient.delete({ where: { id: createdId } }).catch(() => {});
  }
  server.close();
  await prisma.$disconnect();
}
