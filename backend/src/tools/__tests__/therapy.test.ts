// Invocability + GUI parity: administration.* and therapy.create tools reach the SAME services as
// routes/therapy.ts and routes/patient-therapies.ts and produce the same business outcome.
// administration.confirm is critical: HTTP route and tool must leave identical
// MedicationAdministration row state (shared implementation: therapies/administration-record.ts).

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma.js';
import therapySlotsRouter from '../../routes/therapy.js';
import patientTherapiesRouter from '../../routes/patient-therapies.js';
import { createToolRegistry } from '../registry.js';
import { therapyTools } from '../capabilities/therapy.js';
import type { InvokeContext } from '../registry.js';
import {
  captureAudit,
  cleanup,
  createOperator,
  createPatient,
  ctxOf,
  demoHeaders,
  restoreAudit,
  serve,
  type TestOperator,
} from './support.js';

const registry = createToolRegistry(therapyTools);
const DAY = '2033-04-05';
const OTHER_DAY = '2033-04-06';
let owner: TestOperator;
let stranger: TestOperator;
let admin: TestOperator;
let patientId = '';
let strangerPatientId = '';
let therapyHttp = '';
let therapyTool = '';
let strangerTherapy = '';

// Demo-mode HTTP identity carries no display name → operatoreNome falls back to the id.
// The parity tool context mirrors that exactly.
const nameless = (op: TestOperator): InvokeContext => ({
  identity: { operatorId: op.operatorId, role: op.role },
  origin: 'test',
});

async function prescribe(pid: string, farmacoNome: string) {
  const therapy = await prisma.patientTherapy.create({
    data: {
      patientId: pid,
      farmacoNome,
      dosaggio: '10 mg',
      viaSomministrazione: 'orale',
      tipo: 'periodica',
      stato: 'attiva',
      dataInizio: '2033-01-01',
      fasceMattina: true,
    },
  });
  return therapy.id;
}

before(async () => {
  captureAudit();
  owner = await createOperator('ther-owner');
  stranger = await createOperator('ther-stranger');
  admin = await createOperator('ther-admin', 'admin');
  patientId = (await createPatient('ther-own', owner)).id;
  strangerPatientId = (await createPatient('ther-foreign', stranger)).id;
  therapyHttp = await prescribe(patientId, 'Farmaco HTTP');
  therapyTool = await prescribe(patientId, 'Farmaco Tool');
  strangerTherapy = await prescribe(strangerPatientId, 'Farmaco Estraneo');
});

after(async () => {
  restoreAudit();
  const ids = [patientId, strangerPatientId];
  await prisma.medicationAdministration.deleteMany({ where: { patientId: { in: ids } } });
  await prisma.patientTherapy.deleteMany({ where: { patientId: { in: ids } } });
  await cleanup([owner, stranger, admin], ids);
});

const administration = (therapyId: string, extra: Record<string, unknown> = {}) => ({
  patientId,
  therapyId,
  date: DAY,
  fascia: 'mattina',
  ...extra,
});

function rowState(row: Record<string, unknown>) {
  const {
    id: _id,
    therapyId: _t,
    farmacoNome: _f,
    confirmedAt,
    createdAt: _c,
    updatedAt: _u,
    ...rest
  } = row;
  return { ...rest, confirmed: confirmedAt instanceof Date };
}

test('administration.confirm: GUI parity — route and tool leave identical MedicationAdministration state', async () => {
  const http = await serve('/therapy-slots', therapySlotsRouter);
  try {
    const response = await fetch(`${http.base}/therapy-slots/confirm`, {
      method: 'POST',
      headers: demoHeaders(owner),
      body: JSON.stringify(administration(therapyHttp)),
    });
    assert.equal(response.status, 200);
    const viaTool = await registry.invoke<{ id: string }>(
      'administration.confirm',
      { body: administration(therapyTool) },
      nameless(owner),
    );
    assert.equal(viaTool.ok, true, JSON.stringify(viaTool));

    const httpRow = await prisma.medicationAdministration.findUniqueOrThrow({
      where: { therapyId_date_fascia: { therapyId: therapyHttp, date: DAY, fascia: 'mattina' } },
    });
    const toolRow = await prisma.medicationAdministration.findUniqueOrThrow({
      where: { therapyId_date_fascia: { therapyId: therapyTool, date: DAY, fascia: 'mattina' } },
    });
    assert.equal(toolRow.stato, 'erogata');
    assert.equal(toolRow.operatoreId, owner.operatorId);
    assert.equal(toolRow.farmacoNome, 'Farmaco Tool');
    assert.equal(httpRow.farmacoNome, 'Farmaco HTTP');
    assert.deepEqual(
      rowState(toolRow as unknown as Record<string, unknown>),
      rowState(httpRow as unknown as Record<string, unknown>),
    );

    // Second confirmation: route 409 ⇔ tool conflict; the row does not change.
    const again = await fetch(`${http.base}/therapy-slots/confirm`, {
      method: 'POST',
      headers: demoHeaders(owner),
      body: JSON.stringify(administration(therapyHttp)),
    });
    assert.equal(again.status, 409);
    const toolAgain = await registry.invoke(
      'administration.confirm',
      { body: administration(therapyTool) },
      nameless(owner),
    );
    assert.equal(toolAgain.ok, false);
    if (!toolAgain.ok) {
      assert.equal(toolAgain.error.code, 'conflict');
      assert.equal(toolAgain.error.domainCode, 'already_administered');
    }
  } finally {
    await http.close();
  }
});

test('administration.confirm: operator cannot administer another owner’s therapy (route 404 ⇔ tool not_found), nothing written', async () => {
  const http = await serve('/therapy-slots', therapySlotsRouter);
  try {
    const body = {
      patientId: strangerPatientId,
      therapyId: strangerTherapy,
      date: DAY,
      fascia: 'mattina',
    };
    const response = await fetch(`${http.base}/therapy-slots/confirm`, {
      method: 'POST',
      headers: demoHeaders(owner),
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 404);
    const viaTool = await registry.invoke('administration.confirm', { body }, ctxOf(owner));
    assert.equal(viaTool.ok, false);
    if (!viaTool.ok) assert.equal(viaTool.error.code, 'not_found');
    assert.equal(
      await prisma.medicationAdministration.count({ where: { therapyId: strangerTherapy } }),
      0,
    );
  } finally {
    await http.close();
  }
});

test('administration.confirm: slot not due (sera) → conflict; malformed body → invalid_input', async () => {
  const notDue = await registry.invoke(
    'administration.confirm',
    { body: administration(therapyTool, { date: OTHER_DAY, fascia: 'sera' }) },
    ctxOf(owner),
  );
  assert.equal(notDue.ok, false);
  if (!notDue.ok) assert.equal(notDue.error.code, 'conflict');
  const bad = await registry.invoke(
    'administration.confirm',
    { body: administration(therapyTool, { fascia: 'mezzanotte' }) },
    ctxOf(owner),
  );
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal(bad.error.code, 'invalid_input');
});

test('administration.record_not_administered: persists non_erogata with motivo; cannot downgrade an erogata slot', async () => {
  const result = await registry.invoke<{ stato: string }>(
    'administration.record_not_administered',
    {
      body: administration(therapyTool, {
        date: OTHER_DAY,
        motivo: 'Paziente a digiuno',
        note: 'Rivalutare',
      }),
    },
    ctxOf(owner),
  );
  assert.equal(result.ok, true, JSON.stringify(result));
  const row = await prisma.medicationAdministration.findUniqueOrThrow({
    where: {
      therapyId_date_fascia: { therapyId: therapyTool, date: OTHER_DAY, fascia: 'mattina' },
    },
  });
  assert.equal(row.stato, 'non_erogata');
  assert.equal(row.motivo, 'Paziente a digiuno');
  assert.equal(row.note, 'Rivalutare');
  assert.equal(row.operatoreId, owner.operatorId);
  assert.equal(row.operatoreNome, owner.name);
  assert.equal(row.confirmedAt, null);

  const downgrade = await registry.invoke(
    'administration.record_not_administered',
    { body: administration(therapyTool, { motivo: 'Rifiuto' }) },
    ctxOf(owner),
  );
  assert.equal(downgrade.ok, false);
  if (!downgrade.ok) {
    assert.equal(downgrade.error.code, 'conflict');
    assert.equal(downgrade.error.message, 'Terapia già erogata: stato non modificabile');
  }
  const still = await prisma.medicationAdministration.findUniqueOrThrow({
    where: { therapyId_date_fascia: { therapyId: therapyTool, date: DAY, fascia: 'mattina' } },
  });
  assert.equal(still.stato, 'erogata');

  const noReason = await registry.invoke(
    'administration.record_not_administered',
    { body: administration(therapyTool, { date: OTHER_DAY }) },
    ctxOf(owner),
  );
  assert.equal(noReason.ok, false);
  if (!noReason.ok) assert.equal(noReason.error.code, 'invalid_input');
});

type Slot = { fascia: string; patients: Array<{ patientId: string }> };

test('administration.list_slots: same slots as GET /therapy-slots, scoped to the operator; admin sees all', async () => {
  const http = await serve('/therapy-slots', therapySlotsRouter);
  try {
    const response = await fetch(`${http.base}/therapy-slots?date=${DAY}`, {
      headers: demoHeaders(owner),
    });
    assert.equal(response.status, 200);
    const httpSlots = (await response.json()) as Slot[];
    const viaTool = await registry.invoke<Slot[]>(
      'administration.list_slots',
      { query: { date: DAY } },
      ctxOf(owner),
    );
    assert.equal(viaTool.ok, true, JSON.stringify(viaTool));
    if (!viaTool.ok) return;
    assert.deepEqual(JSON.parse(JSON.stringify(viaTool.data)), httpSlots);
    const patientsIn = (slots: Slot[]) =>
      new Set(slots.flatMap((s) => s.patients.map((p) => p.patientId)));
    assert.equal(patientsIn(viaTool.data).has(patientId), true);
    assert.equal(patientsIn(viaTool.data).has(strangerPatientId), false);

    const asAdmin = await registry.invoke<Slot[]>(
      'administration.list_slots',
      { query: { date: DAY } },
      ctxOf(admin),
    );
    assert.equal(asAdmin.ok, true);
    if (asAdmin.ok) assert.equal(patientsIn(asAdmin.data).has(strangerPatientId), true);

    const bad = await registry.invoke(
      'administration.list_slots',
      { query: { date: '2033-13-40' } },
      ctxOf(owner),
    );
    assert.equal(bad.ok, false);
    if (!bad.ok) assert.equal(bad.error.code, 'invalid_input');
  } finally {
    await http.close();
  }
});

test('administration.list_slots_page: same page as GET /therapy-slots/page, scoped to the operator', async () => {
  const http = await serve('/therapy-slots', therapySlotsRouter);
  try {
    const response = await fetch(`${http.base}/therapy-slots/page?date=${DAY}&limit=50`, {
      headers: demoHeaders(owner),
    });
    assert.equal(response.status, 200);
    const httpPage = (await response.json()) as {
      slots: Slot[];
      pageInfo: { hasMore: boolean; loadedTherapies: number };
    };
    const viaTool = await registry.invoke<{
      slots: Slot[];
      pageInfo: { hasMore: boolean; loadedTherapies: number };
    }>('administration.list_slots_page', { query: { date: DAY, limit: '50' } }, ctxOf(owner));
    assert.equal(viaTool.ok, true, JSON.stringify(viaTool));
    if (!viaTool.ok) return;
    assert.deepEqual(JSON.parse(JSON.stringify(viaTool.data.slots)), httpPage.slots);
    assert.equal(viaTool.data.pageInfo.hasMore, httpPage.pageInfo.hasMore);
    assert.equal(viaTool.data.pageInfo.loadedTherapies, httpPage.pageInfo.loadedTherapies);
    const ids = new Set(viaTool.data.slots.flatMap((s) => s.patients.map((p) => p.patientId)));
    assert.equal(ids.has(patientId), true);
    assert.equal(ids.has(strangerPatientId), false);

    const bad = await registry.invoke(
      'administration.list_slots_page',
      { query: { date: DAY, limit: '0' } },
      ctxOf(owner),
    );
    assert.equal(bad.ok, false);
    if (!bad.ok) assert.equal(bad.error.code, 'invalid_input');
  } finally {
    await http.close();
  }
});

test('therapy.create: GUI parity with POST /patients/:id/therapies (server-owned inserting operator)', async () => {
  const http = await serve('/patients', patientTherapiesRouter);
  try {
    const body = {
      farmacoNome: 'Paracetamolo',
      dataInizio: '2033-02-01',
      dosaggio: '500 mg',
      viaSomministrazione: 'orale',
      tipo: 'periodica',
      fasceMattina: true,
      fasceSera: true,
      operatoreInseritore: 'client-spoof',
    };
    const response = await fetch(`${http.base}/patients/${patientId}/therapies`, {
      method: 'POST',
      headers: demoHeaders(owner),
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 201);
    const httpTherapy = (await response.json()) as { id: string };
    const viaTool = await registry.invoke<{ id: string }>(
      'therapy.create',
      { patientId, body },
      nameless(owner),
    );
    assert.equal(viaTool.ok, true, JSON.stringify(viaTool));
    if (!viaTool.ok) return;

    const pick = (t: Record<string, unknown>) => {
      const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = t;
      return rest;
    };
    const httpRow = await prisma.patientTherapy.findUniqueOrThrow({
      where: { id: httpTherapy.id },
    });
    const toolRow = await prisma.patientTherapy.findUniqueOrThrow({
      where: { id: viaTool.data.id },
    });
    assert.equal(toolRow.patientId, patientId);
    assert.equal(toolRow.farmacoNome, 'Paracetamolo');
    assert.equal(toolRow.operatoreInseritore, owner.operatorId);
    assert.deepEqual(
      pick(toolRow as unknown as Record<string, unknown>),
      pick(httpRow as unknown as Record<string, unknown>),
    );

    const named = await registry.invoke<{ operatoreInseritore: string }>(
      'therapy.create',
      { patientId, body },
      ctxOf(owner),
    );
    assert.equal(named.ok, true);
    if (named.ok) assert.equal(named.data.operatoreInseritore, owner.name);
  } finally {
    await http.close();
  }
});

test('therapy.create: missing required field → invalid_input (route 400); other owner patient → not_found', async () => {
  const before = await prisma.patientTherapy.count({ where: { patientId } });
  const missing = await registry.invoke(
    'therapy.create',
    { patientId, body: { dataInizio: '2033-02-01' } },
    ctxOf(owner),
  );
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.error.code, 'invalid_input');
  const badRange = await registry.invoke(
    'therapy.create',
    { patientId, body: { farmacoNome: 'X', dataInizio: '2033-02-10', dataFine: '2033-02-01' } },
    ctxOf(owner),
  );
  assert.equal(badRange.ok, false);
  if (!badRange.ok) assert.equal(badRange.error.code, 'invalid_input');
  assert.equal(await prisma.patientTherapy.count({ where: { patientId } }), before);

  const foreign = await registry.invoke(
    'therapy.create',
    { patientId: strangerPatientId, body: { farmacoNome: 'X', dataInizio: '2033-02-01' } },
    ctxOf(owner),
  );
  assert.equal(foreign.ok, false);
  if (!foreign.ok) {
    assert.equal(foreign.error.code, 'not_found');
    assert.equal(foreign.error.domainCode, 'patient_not_found');
  }
  assert.equal(await prisma.patientTherapy.count({ where: { patientId: strangerPatientId } }), 1);
});
