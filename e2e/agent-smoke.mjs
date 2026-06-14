// REQ-021 ExtractionAgent smoke: boots the app with the mock agent and verifies
// the agent loop decides NEW vs EXISTING patient and that 'existing' confirm
// updates the existing cartella. No real model/data. Cleans up after.
//   AI_PROVIDER=mock DATABASE_URL=... node e2e/agent-smoke.mjs
import assert from 'node:assert/strict';
import app from '../backend/src/app.js';
import { prisma } from '../backend/src/lib/prisma.js';

const OP = { 'X-Operator-Id': 'op-agent', 'X-Operator-Role': 'operatore' };
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const { port } = server.address();
const base = `http://127.0.0.1:${port}/ai/extraction/jobs`;
const af = (url, opts = {}) => fetch(url, { ...opts, headers: { ...OP, ...(opts.headers ?? {}) } });
const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from('synthetic agent test'), Buffer.from('%%EOF')]);

const jobs = [];
let existingPatientId;
async function reviewReadyJob() {
  const fd = new FormData();
  fd.append('files', new Blob([PDF], { type: 'application/pdf' }), 'd.pdf');
  let r = await af(base, { method: 'POST', body: fd });
  const b = await r.json();
  jobs.push(b.job.id);
  r = await af(`${base}/${b.job.id}/process`, { method: 'POST' });
  const pj = await r.json();
  assert.equal(pj.status, 'review_ready', `review_ready (got ${pj.status}/${pj.error ?? ''})`);
  const res = await (await af(`${base}/${b.job.id}/result`)).json();
  return { jobId: b.job.id, proposal: res.resultData };
}

try {
  // Ensure no AgentMock Sintetico exists yet.
  await prisma.patient.deleteMany({ where: { firstName: 'AgentMock', lastName: 'Sintetico' } });

  // 1. No existing match -> agent proposes a NEW patient; tool was called.
  let { proposal } = await reviewReadyJob();
  assert.equal(proposal._target.mode, 'new', 'agent targets new when no match');
  assert.equal(proposal.anagrafica.nome.status, 'extracted', 'agent filled nome (not empty)');

  // 2. Create that patient, then re-run -> agent targets EXISTING.
  const created = await prisma.patient.create({
    data: { medicalRecordNumber: `MRN-AGENT-${port}`, firstName: 'AgentMock', lastName: 'Sintetico', dateOfBirth: new Date('1970-01-01') },
  });
  existingPatientId = created.id;
  await prisma.cartella.create({ data: { patientId: created.id, data: { statoRicovero: 'dimesso', diagnosi: [] } } });

  const second = await reviewReadyJob();
  assert.equal(second.proposal._target.mode, 'existing', 'agent targets existing when match found');
  assert.equal(second.proposal._target.patientId, existingPatientId, 'targets the right patient');

  // 3. Confirm 'existing' -> updates cartella, no new patient.
  const before = await prisma.patient.count();
  let r = await af(`${base}/${second.jobId}/confirm`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'existing', patientId: existingPatientId, patient: { firstName: 'AgentMock', lastName: 'Sintetico', dateOfBirth: '1970-01-01' }, cartella: { statoRicovero: 'ricoverato', diagnosi: [{ descrizione: 'Nuova diagnosi' }] } }),
  });
  assert.equal(r.status, 200, 'existing confirm 200');
  const cr = await r.json();
  assert.equal(cr.status, 'updated', 'status updated (not created)');
  const after = await prisma.patient.count();
  assert.equal(after, before, 'no new patient created');
  const cart = await prisma.cartella.findUnique({ where: { patientId: existingPatientId } });
  assert.equal((cart.data).statoRicovero, 'ricoverato', 'scalar updated');
  assert.equal((cart.data).diagnosi.length, 1, 'diagnosi appended');

  console.log('REQ-021 agent-smoke: NEW + EXISTING paths PASS');
} finally {
  for (const id of jobs) {
    await prisma.importAudit.deleteMany({ where: { jobId: id } }).catch(() => {});
    await prisma.importDocument.deleteMany({ where: { jobId: id } }).catch(() => {});
    await prisma.importJob.delete({ where: { id } }).catch(() => {});
  }
  if (existingPatientId) {
    await prisma.cartella.deleteMany({ where: { patientId: existingPatientId } }).catch(() => {});
    await prisma.patient.delete({ where: { id: existingPatientId } }).catch(() => {});
  }
  server.close();
  await prisma.$disconnect();
}
