// Invocability + GUI parity: patients.*, parameters.*, clinical_record.save and
// intake.patient_review tools reach the SAME services as routes/patients.ts,
// routes/patient-parameter-readings.ts and routes/patient-intake-review.ts.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import patientsRouter from '../../routes/patients.js';
import { createToolRegistry } from '../registry.js';
import { patientTools } from '../capabilities/patients.js';
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

const registry = createToolRegistry(patientTools);
let owner: TestOperator;
let stranger: TestOperator;
let patientId = '';
let secondPatientId = '';
let strangerPatientId = '';
let gui: Awaited<ReturnType<typeof serve>>;

before(async () => {
  captureAudit();
  owner = await createOperator('pt-owner');
  stranger = await createOperator('pt-stranger');
  patientId = (await createPatient('pt-own', owner)).id;
  secondPatientId = (await createPatient('pt-own2', owner)).id;
  strangerPatientId = (await createPatient('pt-foreign', stranger)).id;
  gui = await serve('/patients', patientsRouter);
});

after(async () => {
  restoreAudit();
  await gui?.close();
  await cleanup([owner, stranger], [patientId, secondPatientId, strangerPatientId]);
});

const http = (path: string, op: TestOperator, init: RequestInit = {}) =>
  fetch(`${gui.base}${path}`, { ...init, headers: demoHeaders(op) });

const measuredAt = (minute: number) =>
  new Date(Date.UTC(2026, 8, 15, 8, minute, 0, 0)).toISOString();

// ── patients.list_page / patients.search ──────────────────────────────────

test('GUI == Tool: patients.list_page returns the same scoped page as GET /patients/page', async () => {
  const res = await http('/patients/page?limit=100', owner);
  assert.equal(res.status, 200);
  const httpPage = (await res.json()) as { items: { id: string }[]; hasMore: boolean };
  const tool = await registry.invoke<{ items: { id: string }[]; hasMore: boolean }>(
    'patients.list_page',
    { query: { limit: '100' } },
    ctxOf(owner),
  );
  assert.equal(tool.ok, true, JSON.stringify(tool));
  if (!tool.ok) return;
  const toolIds = tool.data.items.map((item) => item.id);
  assert.deepEqual(
    toolIds,
    httpPage.items.map((item) => item.id),
  );
  assert.equal(tool.data.hasMore, httpPage.hasMore);
  assert.deepEqual([...toolIds].sort(), [patientId, secondPatientId].sort());
  assert.ok(!toolIds.includes(strangerPatientId));
});

test('patients.list_page refuses q like the route (text search belongs to patients.search)', async () => {
  const res = await http('/patients/page?q=Tool', owner);
  assert.equal(res.status, 400);
  const tool = await registry.invoke('patients.list_page', { query: { q: 'Tool' } }, ctxOf(owner));
  assert.equal(tool.ok, false);
  if (!tool.ok) assert.equal(tool.error.code, 'invalid_input');
});

test('patients.search finds scoped patients by name; blank q is invalid_input', async () => {
  const hit = await registry.invoke<{ items: { id: string }[] }>(
    'patients.search',
    { body: { q: 'Tool pt-own2' } },
    ctxOf(owner),
  );
  assert.equal(hit.ok, true, JSON.stringify(hit));
  if (hit.ok)
    assert.deepEqual(
      hit.data.items.map((i) => i.id),
      [secondPatientId],
    );

  const foreign = await registry.invoke<{ items: { id: string }[] }>(
    'patients.search',
    { body: { q: 'Tool pt-foreign' } },
    ctxOf(owner),
  );
  assert.equal(foreign.ok, true);
  if (foreign.ok) assert.equal(foreign.data.items.length, 0);

  const blank = await registry.invoke('patients.search', { body: { q: '   ' } }, ctxOf(owner));
  assert.equal(blank.ok, false);
  if (!blank.ok) assert.equal(blank.error.code, 'invalid_input');
});

// ── parameters.* ──────────────────────────────────────────────────────────

test('parameters.list_page returns only scoped patients (same as GET /patients/parameters/page)', async () => {
  const res = await http('/patients/parameters/page?month=9&year=2026', owner);
  assert.equal(res.status, 200);
  const httpPage = (await res.json()) as { items: { patient: { id: string } }[] };
  const tool = await registry.invoke<{ items: { patient: { id: string } }[] }>(
    'parameters.list_page',
    { query: { month: '9', year: '2026' } },
    ctxOf(owner),
  );
  assert.equal(tool.ok, true, JSON.stringify(tool));
  if (!tool.ok) return;
  const ids = tool.data.items.map((i) => i.patient.id);
  assert.deepEqual(
    ids,
    httpPage.items.map((i) => i.patient.id),
  );
  assert.ok(ids.includes(patientId));
  assert.ok(!ids.includes(strangerPatientId));
});

test('parameters.save_month merges the month into Cartella with firmaIpM = actor; foreign → not_found', async () => {
  const month = {
    id: `${runId}-m9`,
    mese: 9,
    anno: 2026,
    createdAt: '2026-09-01T00:00:00.000Z',
    giorni: [{ giorno: 3, pa: '120/80', fc: '72' }],
  };
  const saved = await registry.invoke<{ patientId: string }>(
    'parameters.save_month',
    { patientId, body: { month } },
    ctxOf(owner),
  );
  assert.equal(saved.ok, true, JSON.stringify(saved));
  const cartella = await prisma.cartella.findUniqueOrThrow({ where: { patientId } });
  const months = (cartella.data as { parametriMensili: Array<Record<string, unknown>> })
    .parametriMensili;
  const stored = months.find((m) => m.mese === 9 && m.anno === 2026) as {
    giorni: Array<Record<string, unknown>>;
  };
  assert.equal(stored.giorni[0].pa, '120/80');
  assert.equal(stored.giorni[0].firmaIpM, owner.operatorId);

  const foreign = await registry.invoke(
    'parameters.save_month',
    { patientId: strangerPatientId, body: { month } },
    ctxOf(owner),
  );
  assert.equal(foreign.ok, false);
  if (!foreign.ok) assert.equal(foreign.error.code, 'not_found');
  assert.equal(await prisma.cartella.count({ where: { patientId: strangerPatientId } }), 0);

  const invalid = await registry.invoke(
    'parameters.save_month',
    { patientId, body: { month: { ...month, mese: 13 } } },
    ctxOf(owner),
  );
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.equal(invalid.error.code, 'invalid_input');
});

test('GUI == Tool: parameters.create_reading persists the same reading as POST parameter-readings', async () => {
  const httpRequestId = randomUUID();
  const toolRequestId = randomUUID();
  const values = { pa: '130/85', fc: '76', spo2: '97' };

  const res = await fetch(`${gui.base}/patients/${patientId}/parameter-readings`, {
    method: 'POST',
    headers: demoHeaders(owner),
    body: JSON.stringify({ requestId: httpRequestId, measuredAt: measuredAt(1), values }),
  });
  assert.equal(res.status, 201);
  const tool = await registry.invoke<{
    reading: { id: string };
    replayed: boolean;
    summary: { count: number };
  }>(
    'parameters.create_reading',
    {
      patientId,
      body: { requestId: toolRequestId, measuredAt: measuredAt(2), values },
    },
    ctxOf(owner),
  );
  assert.equal(tool.ok, true, JSON.stringify(tool));
  if (!tool.ok) return;
  assert.equal(tool.data.replayed, false);
  assert.equal(tool.data.summary.count, 2);

  const rows = await prisma.patientParameterReading.findMany({
    where: { patientId, requestId: { in: [httpRequestId, toolRequestId] } },
  });
  assert.equal(rows.length, 2);
  const httpRow = rows.find((r) => r.requestId === httpRequestId)!;
  const toolRow = rows.find((r) => r.requestId === toolRequestId)!;
  assert.deepEqual(toolRow.values, httpRow.values);
  assert.equal(toolRow.authorOperatorId, owner.operatorId);
  assert.equal(toolRow.authorOperatorId, httpRow.authorOperatorId);
  assert.equal(toolRow.authorName, httpRow.authorName);

  // Replaying the GUI's requestId through the tool is recognised as the same reading.
  const replay = await registry.invoke<{ reading: { id: string }; replayed: boolean }>(
    'parameters.create_reading',
    { patientId, body: { requestId: httpRequestId, measuredAt: measuredAt(1), values } },
    ctxOf(owner),
  );
  assert.equal(replay.ok, true);
  if (replay.ok) {
    assert.equal(replay.data.replayed, true);
    assert.equal(replay.data.reading.id, httpRow.id);
  }
});

test('parameters.create_reading: foreign patient → not_found, invalid values → invalid_input', async () => {
  const body = { requestId: randomUUID(), measuredAt: measuredAt(3), values: { fc: '80' } };
  const foreign = await registry.invoke(
    'parameters.create_reading',
    { patientId: strangerPatientId, body },
    ctxOf(owner),
  );
  assert.equal(foreign.ok, false);
  if (!foreign.ok) assert.equal(foreign.error.code, 'not_found');
  assert.equal(
    await prisma.patientParameterReading.count({ where: { patientId: strangerPatientId } }),
    0,
  );
  const httpInvalid = await fetch(`${gui.base}/patients/${patientId}/parameter-readings`, {
    method: 'POST',
    headers: demoHeaders(owner),
    body: JSON.stringify({ ...body, values: { pa: 'abc' } }),
  });
  assert.equal(httpInvalid.status, 400);
  const invalid = await registry.invoke(
    'parameters.create_reading',
    { patientId, body: { ...body, values: { pa: 'abc' } } },
    ctxOf(owner),
  );
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.equal(invalid.error.code, 'invalid_input');
});

test('parameters.list_readings returns the persisted readings; foreign → not_found', async () => {
  const list = await registry.invoke<{ readings: { patientId: string; values: unknown }[] }>(
    'parameters.list_readings',
    { patientId, query: { date: '2026-09-15' } },
    ctxOf(owner),
  );
  assert.equal(list.ok, true, JSON.stringify(list));
  if (list.ok) {
    assert.equal(list.data.readings.length, 2);
    assert.ok(list.data.readings.every((i) => i.patientId === patientId));
  }
  const foreign = await registry.invoke(
    'parameters.list_readings',
    { patientId: strangerPatientId },
    ctxOf(owner),
  );
  assert.equal(foreign.ok, false);
  if (!foreign.ok) assert.equal(foreign.error.code, 'not_found');
});

// ── clinical_record.save ──────────────────────────────────────────────────

test('GUI == Tool: clinical_record.save stores the same Cartella as PUT /patients/:id/cartella', async () => {
  const data = { anamnesi: { note: 'Ipertensione nota' }, codiceFiscale: 'RSSMRA40A01H501X' };
  const res = await fetch(`${gui.base}/patients/${secondPatientId}/cartella`, {
    method: 'PUT',
    headers: demoHeaders(owner),
    body: JSON.stringify({ data }),
  });
  assert.equal(res.status, 200);
  const httpBody = (await res.json()) as { data: unknown };

  // Same payload through the tool on a second patient without a Cartella: stored data must match.
  const freshId = (await createPatient('pt-own3', owner)).id;
  try {
    const tool = await registry.invoke<{ patientId: string; data: unknown }>(
      'clinical_record.save',
      { patientId: freshId, body: { data } },
      ctxOf(owner),
    );
    assert.equal(tool.ok, true, JSON.stringify(tool));
    if (!tool.ok) return;
    assert.equal(tool.data.patientId, freshId);
    assert.deepEqual(tool.data.data, httpBody.data);
    const [httpRow, toolRow] = await Promise.all([
      prisma.cartella.findUniqueOrThrow({ where: { patientId: secondPatientId } }),
      prisma.cartella.findUniqueOrThrow({ where: { patientId: freshId } }),
    ]);
    assert.deepEqual(toolRow.data, httpRow.data);
    assert.equal((toolRow.data as Record<string, unknown>).codiceFiscale, undefined);

    // Same legacy-history guard: new Tinetti history on a record without it → 409 conflict.
    const conflictBody = { data: { valutazioniTinetti: [{ id: 'x' }] } };
    const httpConflict = await fetch(`${gui.base}/patients/${secondPatientId}/cartella`, {
      method: 'PUT',
      headers: demoHeaders(owner),
      body: JSON.stringify(conflictBody),
    });
    assert.equal(httpConflict.status, 409);
    const toolConflict = await registry.invoke(
      'clinical_record.save',
      { patientId: freshId, body: conflictBody },
      ctxOf(owner),
    );
    assert.equal(toolConflict.ok, false);
    if (!toolConflict.ok) {
      assert.equal(toolConflict.error.code, 'conflict');
      assert.equal(toolConflict.error.domainCode, 'tinetti_legacy_read_only');
    }
  } finally {
    await prisma.patient.delete({ where: { id: freshId } }).catch(() => {});
  }
});

test('clinical_record.save keeps patient scope: foreign patient → not_found, nothing written', async () => {
  const res = await fetch(`${gui.base}/patients/${strangerPatientId}/cartella`, {
    method: 'PUT',
    headers: demoHeaders(owner),
    body: JSON.stringify({ data: { x: 1 } }),
  });
  assert.equal(res.status, 404);
  const tool = await registry.invoke(
    'clinical_record.save',
    { patientId: strangerPatientId, body: { data: { x: 1 } } },
    ctxOf(owner),
  );
  assert.equal(tool.ok, false);
  if (!tool.ok) {
    assert.equal(tool.error.code, 'not_found');
    assert.equal(tool.error.domainCode, 'patient_not_found');
  }
  assert.equal(await prisma.cartella.count({ where: { patientId: strangerPatientId } }), 0);
});

// ── patients.clinical_summary ─────────────────────────────────────────────

test('patients.clinical_summary matches the route and drops out-of-scope ids', async () => {
  const ids = [patientId, strangerPatientId].join(',');
  const res = await http(`/patients/clinical-summary?patientIds=${ids}`, owner);
  assert.equal(res.status, 200);
  const httpBody = await res.json();
  const tool = await registry.invoke<Array<{ patientId: string }>>(
    'patients.clinical_summary',
    { query: { patientIds: ids } },
    ctxOf(owner),
  );
  assert.equal(tool.ok, true, JSON.stringify(tool));
  if (!tool.ok) return;
  assert.deepEqual(tool.data, httpBody);
  assert.deepEqual(
    tool.data.map((r) => r.patientId),
    [patientId],
  );
  const invalid = await registry.invoke(
    'patients.clinical_summary',
    { query: { patientIds: '' } },
    ctxOf(owner),
  );
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.equal(invalid.error.code, 'invalid_input');
});

// ── intake.patient_review ─────────────────────────────────────────────────

test('intake.patient_review returns the same review as the route; foreign → not_found', async () => {
  const res = await http(`/patients/${patientId}/intake-review`, owner);
  assert.equal(res.status, 200);
  const httpBody = await res.json();
  const tool = await registry.invoke<{ draftId: string | null; deferredTherapies: unknown[] }>(
    'intake.patient_review',
    { patientId },
    ctxOf(owner),
  );
  assert.equal(tool.ok, true, JSON.stringify(tool));
  if (!tool.ok) return;
  assert.deepEqual(JSON.parse(JSON.stringify(tool.data)), httpBody);
  assert.equal(tool.data.draftId, null);
  assert.deepEqual(tool.data.deferredTherapies, []);

  const foreign = await registry.invoke(
    'intake.patient_review',
    { patientId: strangerPatientId },
    ctxOf(owner),
  );
  assert.equal(foreign.ok, false);
  if (!foreign.ok) assert.equal(foreign.error.code, 'not_found');
});
