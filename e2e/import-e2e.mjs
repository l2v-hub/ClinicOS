// Deterministic end-to-end gate for the AI import flow (REQ-020).
// Boots the Express app against the DB with the MOCK provider and drives the full
// happy path at the API level: multi-file upload (with one rejected) -> extract ->
// merged review -> transactional confirm -> patient persisted. Plus failure paths.
// No browser, no real key, no real data. Run: tsx e2e/import-e2e.mjs
import assert from 'node:assert/strict';
import app from '../backend/src/app.js';
import { prisma } from '../backend/src/lib/prisma.js';
import { FIXTURES } from './fixtures.mjs';

const OP = { 'X-Operator-Id': 'op-e2e', 'X-Operator-Role': 'operatore' };
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const { port } = server.address();
const base = `http://127.0.0.1:${port}/ai/extraction/jobs`;
const af = (url, opts = {}) => fetch(url, { ...opts, headers: { ...OP, ...(opts.headers ?? {}) } });

const createdPatientIds = [];
const createdJobIds = [];

function form(files) {
  const fd = new FormData();
  for (const f of files) fd.append('files', new Blob([f.buf], { type: f.type }), f.name);
  return fd;
}

try {
  // 0. Auth gate: no operator header -> 401.
  let res = await fetch(base, { method: 'POST', body: form([{ name: 'x.pdf', buf: FIXTURES.pdf, type: 'application/pdf' }]) });
  assert.equal(res.status, 401, 'anonymous import rejected (401)');

  // 1. Multi-file upload: pdf + jpg accepted, invalid exe-as-pdf rejected (valids kept).
  res = await af(base, {
    method: 'POST',
    body: form([
      { name: 'dimissione-sintetica.pdf', buf: FIXTURES.pdf, type: 'application/pdf' },
      { name: 'foto-documento.jpg', buf: FIXTURES.jpg, type: 'image/jpeg' },
      { name: 'non-ammesso.pdf', buf: FIXTURES.invalidExe, type: 'application/pdf' },
    ]),
  });
  assert.equal(res.status, 201, 'job created');
  let body = await res.json();
  const jobId = body.job.id;
  createdJobIds.push(jobId);
  assert.equal(body.job.fileCount, 2, 'two valid files');
  assert.ok(body.outcomes.find((o) => o.filename === 'non-ammesso.pdf')?.status === 'rejected', 'invalid rejected');

  // 2. Extract (mock) -> review_ready, merged proposal with provenance.
  res = await af(`${base}/${jobId}/process`, { method: 'POST' });
  body = await res.json();
  assert.equal(body.status, 'review_ready', 'review_ready after extraction');
  res = await af(`${base}/${jobId}/result`);
  const result = await res.json();
  assert.ok(result.resultData?._merge?.version, 'merged proposal present');
  assert.equal(result.resultData.anagrafica.nome.status, 'missing', 'no invented data');

  // 3. Confirm with reviewed synthetic patient -> created + persisted.
  const SYNTH = { firstName: 'E2ETest', lastName: 'Sintetico', dateOfBirth: '1955-09-09', sex: 'M', phone: '000' };
  res = await af(`${base}/${jobId}/confirm`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient: SYNTH, cartella: { statoRicovero: 'ricoverato' } }),
  });
  assert.equal(res.status, 201, 'patient created');
  body = await res.json();
  createdPatientIds.push(body.patient.id);
  assert.equal(body.status, 'created');

  // 4. Expected synthetic data persisted.
  const persisted = await prisma.patient.findUnique({ where: { id: body.patient.id } });
  assert.equal(persisted?.firstName, 'E2ETest');
  assert.equal(persisted?.lastName, 'Sintetico');
  const cartella = await prisma.cartella.findUnique({ where: { patientId: body.patient.id } });
  assert.equal((cartella?.data).statoRicovero, 'ricoverato');

  // 5. Idempotent re-confirm -> no duplicate.
  res = await af(`${base}/${jobId}/confirm`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient: SYNTH }),
  });
  body = await res.json();
  assert.equal(body.status, 'idempotent', 'no duplicate on re-confirm');

  // 6. No secrets leaked in any status/result payload.
  res = await af(`${base}/${jobId}`);
  const finalJob = await res.text();
  assert.ok(!/AIza[0-9A-Za-z_-]{10,}/.test(finalJob), 'no API key in job payload');

  console.log('REQ-020 import-e2e: HAPPY PATH + FAILURE PATHS PASS (mock, synthetic)');
} finally {
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
