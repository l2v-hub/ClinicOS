// Invocability + GUI parity: consegne.* and appointments.* tools reach the SAME services as
// routes/consegne.ts and routes/appointments.ts and produce the same business outcome.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma.js';
import consegneRouter from '../../routes/consegne.js';
import appointmentsRouter from '../../routes/appointments.js';
import { createToolRegistry } from '../registry.js';
import { consegneTools } from '../capabilities/consegne.js';
import { appointmentTools } from '../capabilities/appointments.js';
import {
  captureAudit,
  cleanup,
  createOperator,
  createPatient,
  ctxOf,
  demoHeaders,
  restoreAudit,
  runId,
  serve,
  type TestOperator,
} from './support.js';

// #389: the default resident scope is facility-wide. This suite exercises the scope-enforcement
// plumbing (out-of-scope residents denied), so it pins the restricted, still-supported mode.
process.env.RESIDENT_SCOPE_CONFIG ??= JSON.stringify({ fallback: 'registered_by_me' });

const registry = createToolRegistry([...consegneTools, ...appointmentTools]);
let owner: TestOperator;
let stranger: TestOperator;
let patientId = '';
let strangerPatientId = '';
let audit: ReturnType<typeof captureAudit>;

before(async () => {
  audit = captureAudit();
  owner = await createOperator('owner');
  stranger = await createOperator('stranger');
  patientId = (await createPatient('own', owner)).id;
  strangerPatientId = (await createPatient('foreign', stranger)).id;
});

after(async () => {
  restoreAudit();
  await prisma.appointment.deleteMany({
    where: { patientId: { in: [patientId, strangerPatientId] } },
  });
  await prisma.consegna.deleteMany({
    where: { pazienteId: { in: [patientId, strangerPatientId] } },
  });
  await cleanup([owner, stranger], [patientId, strangerPatientId]);
});

const consegnaBody = (requestId: string, note: string) => ({
  pazienteId: patientId,
  priorita: 'alta',
  tipo: 'clinica',
  note,
  oraScadenza: '10:00',
  requestId,
});

test('consegne.create → createConsegna persists with server-side author; replay is idempotent', async () => {
  const requestId = `${runId}-c1`;
  const first = await registry.invoke<{ id: string; creatoDaId: string; replayed: boolean }>(
    'consegne.create',
    { body: consegnaBody(requestId, 'Controllo parametri serali') },
    ctxOf(owner),
  );
  assert.equal(first.ok, true, JSON.stringify(first));
  if (!first.ok) return;
  const row = await prisma.consegna.findUniqueOrThrow({ where: { id: first.data.id } });
  assert.equal(row.creatoDaId, owner.operatorId);
  assert.equal(row.pazienteId, patientId);
  assert.equal(row.note, 'Controllo parametri serali');

  const replay = await registry.invoke<{ id: string; replayed: boolean }>(
    'consegne.create',
    { body: consegnaBody(requestId, 'Controllo parametri serali') },
    ctxOf(owner),
  );
  assert.equal(replay.ok, true);
  if (replay.ok) {
    assert.equal(replay.data.id, first.data.id);
    assert.equal(replay.data.replayed, true);
  }
  assert.equal(await prisma.consegna.count({ where: { pazienteId: patientId } }), 1);
});

test('consegne.create keeps patient scope: foreign patient → not_found, nothing written', async () => {
  const result = await registry.invoke(
    'consegne.create',
    { body: { ...consegnaBody(`${runId}-c2`, 'x'), pazienteId: strangerPatientId } },
    ctxOf(owner),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'not_found');
    assert.equal(result.error.domainCode, 'patient_not_found');
  }
  assert.equal(await prisma.consegna.count({ where: { pazienteId: strangerPatientId } }), 0);
});

test('consegne.create validation errors come from the existing parser (invalid_input)', async () => {
  const result = await registry.invoke(
    'consegne.create',
    { body: { ...consegnaBody(`${runId}-c3`, 'x'), oraScadenza: '99:99' } },
    ctxOf(owner),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'invalid_input');
});

test('GUI == Tool: consegne list/overview via HTTP route and via tool return the same data', async () => {
  const gui = await serve('/consegne', consegneRouter);
  try {
    const httpList = await (
      await fetch(`${gui.base}/consegne?patientId=${patientId}`, { headers: demoHeaders(owner) })
    ).json();
    const toolList = await registry.invoke<{ items: { id: string }[] }>(
      'consegne.list',
      { query: { patientId } },
      ctxOf(owner),
    );
    assert.equal(toolList.ok, true);
    if (toolList.ok) {
      assert.deepEqual(
        toolList.data.items.map((i) => i.id),
        (httpList.items as { id: string }[]).map((i) => i.id),
      );
      assert.equal(toolList.data.items.length, 1);
    }
    const httpOverview = await (
      await fetch(`${gui.base}/consegne/overview`, { headers: demoHeaders(owner) })
    ).json();
    const toolOverview = await registry.invoke('consegne.overview', {}, ctxOf(owner));
    assert.equal(toolOverview.ok, true);
    if (toolOverview.ok)
      assert.deepEqual(JSON.parse(JSON.stringify(toolOverview.data)), httpOverview);

    const httpSummary = await (
      await fetch(`${gui.base}/consegne/patient-summary`, {
        method: 'POST',
        headers: demoHeaders(owner),
        body: JSON.stringify({ patientIds: [patientId] }),
      })
    ).json();
    const toolSummary = await registry.invoke(
      'consegne.patient_summary',
      { body: { patientIds: [patientId] } },
      ctxOf(owner),
    );
    assert.equal(toolSummary.ok, true);
    if (toolSummary.ok) assert.deepEqual(toolSummary.data, httpSummary);
  } finally {
    await gui.close();
  }
});

test('appointments.create/update/list via tool == GUI outcome; slot conflict preserved', async () => {
  const body = {
    patientId,
    operatorId: owner.operatorId,
    data: '2034-02-03',
    ora: '09:30',
    tipologia: 'visita',
  };
  const created = await registry.invoke<{ id: string; ora: string }>(
    'appointments.create',
    { body },
    ctxOf(owner),
  );
  assert.equal(created.ok, true, JSON.stringify(created));
  if (!created.ok) return;

  const conflict = await registry.invoke('appointments.create', { body }, ctxOf(owner));
  assert.equal(conflict.ok, false);
  if (!conflict.ok) assert.equal(conflict.error.domainCode, 'slot_conflict');

  const gui = await serve('/appointments', appointmentsRouter);
  try {
    const httpConflict = await fetch(`${gui.base}/appointments`, {
      method: 'POST',
      headers: demoHeaders(owner),
      body: JSON.stringify(body),
    });
    assert.equal(httpConflict.status, 409);
    assert.equal(conflict.ok ? 0 : conflict.error.status, 409);

    const moved = await registry.invoke<{ ora: string }>(
      'appointments.update',
      { appointmentId: created.data.id, body: { ora: '11:00' } },
      ctxOf(owner),
    );
    assert.equal(moved.ok, true);
    if (moved.ok) assert.equal(moved.data.ora, '11:00');

    const httpList = await (
      await fetch(`${gui.base}/appointments?date=2034-02-03`, { headers: demoHeaders(owner) })
    ).json();
    const toolList = await registry.invoke(
      'appointments.list',
      { query: { date: '2034-02-03' } },
      ctxOf(owner),
    );
    assert.equal(toolList.ok, true);
    if (toolList.ok) assert.deepEqual(JSON.parse(JSON.stringify(toolList.data)), httpList);
  } finally {
    await gui.close();
  }

  const foreign = await registry.invoke(
    'appointments.update',
    { appointmentId: created.data.id, body: { ora: '12:00' } },
    ctxOf(stranger),
  );
  assert.equal(foreign.ok, false);
  if (!foreign.ok) assert.ok(['forbidden', 'not_found'].includes(foreign.error.code));
});

test('pipeline: unknown tool, missing identity, schema violation; audit is PHI-safe', async () => {
  const unknown = await registry.invoke('appointments.delete', {}, ctxOf(owner));
  assert.equal(unknown.ok, false);
  if (!unknown.ok) assert.equal(unknown.error.domainCode, 'tool_not_found');

  const anonymous = await registry.invoke('consegne.overview', {}, { identity: null });
  assert.equal(anonymous.ok, false);
  if (!anonymous.ok) assert.equal(anonymous.error.code, 'unauthenticated');

  const badSchema = await registry.invoke('consegne.create', { body: 'text' }, ctxOf(owner));
  assert.equal(badSchema.ok, false);
  if (!badSchema.ok) assert.equal(badSchema.error.code, 'invalid_input');

  const createEvent = audit.find((e) => e.tool === 'consegne.create' && e.outcome === 'ok');
  assert.ok(createEvent, 'audit event for successful create');
  assert.equal(createEvent!.operatorId, owner.operatorId);
  assert.equal(createEvent!.origin, 'test');
  assert.ok(createEvent!.fields.includes('body.note'));
  assert.ok(
    !JSON.stringify(createEvent).includes('Controllo parametri serali'),
    'no clinical values in audit',
  );
});
