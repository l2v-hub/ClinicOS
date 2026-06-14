// REQ-018 integration smoke: transactional confirm. Boots the app against the
// local DB, runs upload→process→confirm, and asserts idempotency + duplicate
// detection + persistence. Cleans up created patients/jobs afterwards.
//   AI_PROVIDER=mock DATABASE_URL=... node ../node_modules/tsx/dist/cli.mjs scripts/confirm-smoke.mts
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { runJob } from '../src/ai/upload/job-service.js';

const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from('synthetic confirm test')]);
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const { port } = server.address() as { port: number };
const base = `http://127.0.0.1:${port}/ai/extraction/jobs`;
// REQ-019: import endpoints require an operator role header.
const OP = { 'X-Operator-Id': 'op-smoke', 'X-Operator-Role': 'operatore' };
const af = (url: string, opts: RequestInit = {}) =>
  fetch(url, { ...opts, headers: { ...OP, ...(opts.headers as Record<string, string> ?? {}) } });

const createdPatientIds: string[] = [];
const createdJobIds: string[] = [];

async function newReviewReadyJob(): Promise<string> {
  const fd = new FormData();
  fd.append('files', new Blob([PDF], { type: 'application/pdf' }), 'dimissione.pdf');
  let res = await af(base, { method: 'POST', body: fd });
  const body = await res.json();
  const jobId = body.job.id as string;
  createdJobIds.push(jobId);
  res = await af(`${base}/${jobId}/process`, { method: 'POST' });
  assert.equal(res.status, 202, 'process 202 async');
  await runJob(jobId);
  const pj = await (await af(`${base}/${jobId}`)).json();
  assert.equal(pj.status, 'review_ready', 'job review_ready');
  return jobId;
}

const PATIENT = { firstName: 'TestSint', lastName: 'Paziente', dateOfBirth: '1950-05-05', sex: 'M', phone: '000' };

try {
  // 1. Confirm -> creates patient transactionally.
  const job1 = await newReviewReadyJob();
  let res = await af(`${base}/${job1}/confirm`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient: PATIENT, cartella: { statoRicovero: 'ricoverato' } }),
  });
  assert.equal(res.status, 201, 'first confirm 201 created');
  let data = await res.json();
  assert.equal(data.status, 'created');
  const pid = data.patient.id;
  createdPatientIds.push(pid);
  assert.ok(data.patient.medicalRecordNumber.startsWith('MRN-'), 'MRN assigned');

  // 2. Job is now confirmed + linked.
  res = await af(`${base}/${job1}`);
  let job = await res.json();
  assert.equal(job.status, 'confirmed', 'job confirmed after commit');

  // 3. Double confirm of the SAME job -> idempotent, no duplicate.
  res = await af(`${base}/${job1}/confirm`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient: PATIENT }),
  });
  assert.equal(res.status, 200, 'second confirm 200 idempotent');
  data = await res.json();
  assert.equal(data.status, 'idempotent');
  assert.equal(data.patient.id, pid, 'same patient, not duplicated');

  // 4. A NEW job with same name/dob -> duplicate flagged (409).
  const job2 = await newReviewReadyJob();
  res = await af(`${base}/${job2}/confirm`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient: PATIENT }),
  });
  assert.equal(res.status, 409, 'duplicate flagged 409');
  data = await res.json();
  assert.equal(data.status, 'duplicate');
  assert.equal(data.duplicate.id, pid, 'points at the existing patient');

  // 5. Override duplicate -> creates a second patient.
  res = await af(`${base}/${job2}/confirm`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient: PATIENT, confirmDuplicate: true }),
  });
  assert.equal(res.status, 201, 'override 201 created');
  data = await res.json();
  createdPatientIds.push(data.patient.id);
  assert.notEqual(data.patient.id, pid, 'distinct second patient');

  // 6. Persisted: patient + cartella really in the DB (refresh shows it).
  const persisted = await prisma.patient.findUnique({ where: { id: pid } });
  assert.ok(persisted, 'patient persisted');
  const cartella = await prisma.cartella.findUnique({ where: { patientId: pid } });
  assert.ok(cartella, 'cartella persisted');

  // 7. Required-field validation rejects bad payload.
  const job3 = await newReviewReadyJob();
  res = await af(`${base}/${job3}/confirm`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient: { firstName: '', lastName: '', dateOfBirth: '' } }),
  });
  assert.equal(res.status, 400, 'missing required -> 400, no patient created');

  // 8. Audit trail written.
  const audits = await prisma.importAudit.findMany({ where: { jobId: job1 } });
  assert.ok(audits.some((a) => a.action === 'confirm_committed'), 'audit confirm_committed present');

  console.log('REQ-018 confirm-smoke: ALL ASSERTIONS PASS');
} finally {
  // Cleanup synthetic data.
  for (const id of createdPatientIds) {
    await prisma.cartella.deleteMany({ where: { patientId: id } }).catch(() => {});
    await prisma.patient.delete({ where: { id } }).catch(() => {});
  }
  for (const id of createdJobIds) {
    await prisma.importAudit.deleteMany({ where: { jobId: id } }).catch(() => {});
    await prisma.importDocument.deleteMany({ where: { jobId: id } }).catch(() => {});
    await prisma.importJob.delete({ where: { id } }).catch(() => {});
  }
  server.close();
  await prisma.$disconnect();
}
