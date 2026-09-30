// Invocability + GUI parity: intake.* tools reach the SAME services as routes/intake-drafts.ts
// (draft-service, confirm-service) behind the SAME draft ownership check (requireOwnedIntakeDraft).

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma.js';
import intakeDraftsRouter from '../../routes/intake-drafts.js';
import { createToolRegistry } from '../registry.js';
import { intakeTools } from '../capabilities/intake.js';
import {
  captureAudit,
  cleanup,
  createOperator,
  ctxOf,
  demoHeaders,
  restoreAudit,
  runId,
  serve,
  type TestOperator,
} from './support.js';

const registry = createToolRegistry(intakeTools);
let owner: TestOperator;
let stranger: TestOperator;
let admin: TestOperator;
let gui: Awaited<ReturnType<typeof serve>>;
const draftIds: string[] = [];

before(async () => {
  captureAudit();
  owner = await createOperator('intake-owner');
  stranger = await createOperator('intake-stranger');
  admin = await createOperator('intake-admin', 'admin');
  gui = await serve('/intake/drafts', intakeDraftsRouter);
});

after(async () => {
  restoreAudit();
  await gui.close();
  const drafts = await prisma.patientIntakeDraft.findMany({
    where: { createdById: { in: [owner.operatorId, stranger.operatorId, admin.operatorId] } },
    select: { id: true, confirmedPatientId: true },
  });
  const patientIds = [
    ...new Set(drafts.map((d) => d.confirmedPatientId).filter((x): x is string => !!x)),
  ];
  await prisma.patientIntakeDraft.deleteMany({ where: { id: { in: drafts.map((d) => d.id) } } });
  await prisma.cartella.deleteMany({ where: { patientId: { in: patientIds } } });
  await cleanup([owner, stranger, admin], patientIds);
});

async function toolDraft(op: TestOperator): Promise<string> {
  const created = await registry.invoke<{ id: string }>('intake.create_draft', {}, ctxOf(op));
  assert.equal(created.ok, true, JSON.stringify(created));
  if (!created.ok) throw new Error('create failed');
  draftIds.push(created.data.id);
  return created.data.id;
}

async function http(method: string, path: string, op: TestOperator, body?: unknown) {
  const res = await fetch(`${gui.base}/intake/drafts${path}`, {
    method,
    headers: demoHeaders(op),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}

const patientPayload = (lastName: string) => ({
  patient: { firstName: 'Intake', lastName, dateOfBirth: '1941-03-04', sex: 'F' },
  cartella: { statoRicovero: 'ricoverato', reparto: 'RSA A' },
});

test('intake.create_draft / update_draft / get_draft / list_drafts persist the same draft the GUI sees', async () => {
  const id = await toolDraft(owner);
  const row = await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id } });
  assert.equal(row.createdById, owner.operatorId);
  assert.equal(row.source, 'manual');
  assert.equal(row.status, 'draft');

  const patched = await registry.invoke<{ version: number }>(
    'intake.update_draft',
    {
      draftId: id,
      body: { anagrafica: { nome: 'Intake', cognome: 'Autosave' }, _aiMerge: { x: 1 } },
    },
    ctxOf(owner),
  );
  assert.equal(patched.ok, true, JSON.stringify(patched));
  const stored = await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id } });
  assert.deepEqual((stored.data as Record<string, unknown>).anagrafica, {
    nome: 'Intake',
    cognome: 'Autosave',
  });
  // server-owned key dropped by the service, exactly as on the route
  assert.equal(Object.hasOwn(stored.data as object, '_aiMerge'), false);

  const viaTool = await registry.invoke<Record<string, unknown>>(
    'intake.get_draft',
    { draftId: id },
    ctxOf(owner),
  );
  const viaHttp = await http('GET', `/${id}`, owner);
  assert.equal(viaTool.ok, true);
  assert.equal(viaHttp.status, 200);
  if (viaTool.ok) assert.deepEqual(JSON.parse(JSON.stringify(viaTool.data)), viaHttp.body);

  const listTool = await registry.invoke<{ id: string }[]>('intake.list_drafts', {}, ctxOf(owner));
  const listHttp = await http('GET', '', owner);
  assert.equal(listTool.ok, true);
  if (listTool.ok) {
    assert.ok(listTool.data.some((d) => d.id === id));
    assert.deepEqual(
      listTool.data.map((d) => d.id),
      (listHttp.body as unknown as { id: string }[]).map((d) => d.id),
    );
  }
  const strangerList = await registry.invoke<{ id: string }[]>(
    'intake.list_drafts',
    {},
    ctxOf(stranger),
  );
  if (strangerList.ok)
    assert.equal(
      strangerList.data.some((d) => d.id === id),
      false,
    );
});

test('intake.update_draft: service validation (immutable import field) → invalid_input, like the route 400', async () => {
  const id = await toolDraft(owner);
  const viaTool = await registry.invoke(
    'intake.update_draft',
    { draftId: id, body: { _narrative: {} } },
    ctxOf(owner),
  );
  assert.equal(viaTool.ok, false);
  if (!viaTool.ok) assert.equal(viaTool.error.code, 'invalid_input');
  assert.equal((await http('PATCH', `/${id}`, owner, { _narrative: {} })).status, 400);
});

test('intake.create_draft: inaccessible import job → not_found, nothing created (route 404)', async () => {
  const before = await prisma.patientIntakeDraft.count({
    where: { createdById: owner.operatorId },
  });
  const viaTool = await registry.invoke(
    'intake.create_draft',
    { body: { source: 'import', importJobId: `${runId}-missing-job` } },
    ctxOf(owner),
  );
  assert.equal(viaTool.ok, false);
  if (!viaTool.ok) assert.equal(viaTool.error.code, 'not_found');
  const viaHttp = await http('POST', '', owner, { importJobId: `${runId}-missing-job` });
  assert.equal(viaHttp.status, 404);
  assert.equal(
    await prisma.patientIntakeDraft.count({ where: { createdById: owner.operatorId } }),
    before,
  );
});

test('draft ownership: another operatore gets not_found on get/update/confirm; admin may read', async () => {
  const id = await toolDraft(owner);
  for (const [name, input] of [
    ['intake.get_draft', { draftId: id }],
    ['intake.update_draft', { draftId: id, body: { anagrafica: { nome: 'Hijack' } } }],
    ['intake.confirm_draft', { draftId: id, body: patientPayload(`Hijack ${runId}`) }],
  ] as const) {
    const result = await registry.invoke(name, input, ctxOf(stranger));
    assert.equal(result.ok, false, name);
    if (!result.ok) {
      assert.equal(result.error.code, 'not_found', name);
      assert.equal(result.error.domainCode, 'draft_not_found', name);
    }
  }
  assert.equal((await http('GET', `/${id}`, stranger)).status, 404);
  assert.equal(
    (await http('POST', `/${id}/confirm`, stranger, patientPayload(`Hijack ${runId}`))).status,
    404,
  );
  const row = await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id } });
  assert.equal(row.status, 'draft');
  assert.equal(row.version, 0);
  assert.equal(
    await prisma.patient.count({ where: { lastName: `Hijack ${runId}` } }),
    0,
    'no patient created by the stranger',
  );

  const asAdmin = await registry.invoke<{ id: string }>(
    'intake.get_draft',
    { draftId: id },
    ctxOf(admin),
  );
  assert.equal(asAdmin.ok, true);
  if (asAdmin.ok) assert.equal(asAdmin.data.id, id);

  const missing = await registry.invoke(
    'intake.get_draft',
    { draftId: `${runId}-nope` },
    ctxOf(owner),
  );
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.error.code, 'not_found');
});

test('GUI == Tool: intake.confirm_draft creates the same Patient/Cartella outcome as POST /:id/confirm; replay is idempotent', async () => {
  const httpDraftId = await toolDraft(owner);
  const toolDraftId = await toolDraft(owner);
  const httpLast = `Http ${runId}`;
  const toolLast = `Tool ${runId}`;

  const viaHttp = await http('POST', `/${httpDraftId}/confirm`, owner, patientPayload(httpLast));
  assert.equal(viaHttp.status, 201, JSON.stringify(viaHttp.body));
  assert.equal(viaHttp.body.status, 'created');

  const viaTool = await registry.invoke<{
    status: string;
    patient: { id: string; lastName: string };
  }>(
    'intake.confirm_draft',
    { draftId: toolDraftId, body: patientPayload(toolLast) },
    ctxOf(owner),
  );
  assert.equal(viaTool.ok, true, JSON.stringify(viaTool));
  if (!viaTool.ok) return;
  assert.equal(viaTool.data.status, 'created');
  assert.equal(viaTool.data.patient.lastName, toolLast);

  const [pHttp, pTool] = await Promise.all([
    prisma.patient.findUniqueOrThrow({ where: { id: viaHttp.body.patient.id } }),
    prisma.patient.findUniqueOrThrow({ where: { id: viaTool.data.patient.id } }),
  ]);
  for (const p of [pHttp, pTool]) {
    assert.equal(p.registeredById, owner.operatorId);
    assert.equal(p.firstName, 'Intake');
    assert.equal(p.sex, 'F');
    assert.equal(p.dateOfBirth?.toISOString().slice(0, 10), '1941-03-04');
  }
  const [cHttp, cTool] = await Promise.all([
    prisma.cartella.findUniqueOrThrow({ where: { patientId: pHttp.id } }),
    prisma.cartella.findUniqueOrThrow({ where: { patientId: pTool.id } }),
  ]);
  const { _importedFromDraft: fromHttp, ...restHttp } = cHttp.data as Record<string, unknown>;
  const { _importedFromDraft: fromTool, ...restTool } = cTool.data as Record<string, unknown>;
  assert.equal(fromHttp, httpDraftId);
  assert.equal(fromTool, toolDraftId);
  assert.deepEqual(restTool, restHttp);

  const [dHttp, dTool] = await Promise.all([
    prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: httpDraftId } }),
    prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: toolDraftId } }),
  ]);
  assert.equal(dHttp.status, 'confirmed');
  assert.equal(dTool.status, 'confirmed');
  assert.equal(dHttp.confirmedPatientId, pHttp.id);
  assert.equal(dTool.confirmedPatientId, pTool.id);

  // Replay: tool on its own draft and on the GUI-confirmed draft → idempotent, same patient.
  const replay = await registry.invoke<{ status: string; patient: { id: string } }>(
    'intake.confirm_draft',
    { draftId: toolDraftId, body: patientPayload(toolLast) },
    ctxOf(owner),
  );
  assert.equal(replay.ok, true);
  if (replay.ok) {
    assert.equal(replay.data.status, 'idempotent');
    assert.equal(replay.data.patient.id, pTool.id);
  }
  const crossReplay = await registry.invoke<{ status: string; patient: { id: string } }>(
    'intake.confirm_draft',
    { draftId: httpDraftId, body: patientPayload(httpLast) },
    ctxOf(owner),
  );
  assert.equal(crossReplay.ok, true);
  if (crossReplay.ok) {
    assert.equal(crossReplay.data.status, 'idempotent');
    assert.equal(crossReplay.data.patient.id, pHttp.id);
  }
  const httpReplay = await http('POST', `/${toolDraftId}/confirm`, owner, patientPayload(toolLast));
  assert.equal(httpReplay.status, 200);
  assert.equal(httpReplay.body.status, 'idempotent');
  assert.equal(httpReplay.body.patient.id, pTool.id);
  assert.equal(
    await prisma.patient.count({ where: { lastName: { in: [httpLast, toolLast] } } }),
    2,
  );

  // Duplicate detection: route 409 ⇔ tool conflict, no patient written.
  const dupToolDraft = await toolDraft(owner);
  const dupHttpDraft = await toolDraft(owner);
  const dupTool = await registry.invoke(
    'intake.confirm_draft',
    { draftId: dupToolDraft, body: patientPayload(toolLast) },
    ctxOf(owner),
  );
  assert.equal(dupTool.ok, false);
  if (!dupTool.ok) {
    assert.equal(dupTool.error.code, 'conflict');
    assert.equal(dupTool.error.domainCode, 'duplicate_patient');
    assert.equal((dupTool.error.details?.duplicate as { id: string }).id, pTool.id);
  }
  const dupHttp = await http('POST', `/${dupHttpDraft}/confirm`, owner, patientPayload(toolLast));
  assert.equal(dupHttp.status, 409);
  assert.equal(dupHttp.body.duplicate.id, pTool.id);
  assert.equal(await prisma.patient.count({ where: { lastName: toolLast } }), 1);
  assert.equal(
    (await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: dupToolDraft } })).status,
    'draft',
  );
});

test('intake.confirm_draft: invalid identity (missing names) → invalid_input like the route 400', async () => {
  const id = await toolDraft(owner);
  const bad = { patient: { firstName: '', lastName: '' } };
  const viaTool = await registry.invoke(
    'intake.confirm_draft',
    { draftId: id, body: bad },
    ctxOf(owner),
  );
  assert.equal(viaTool.ok, false);
  const viaHttp = await http('POST', `/${id}/confirm`, owner, bad);
  assert.equal(viaHttp.status, 400);
  if (!viaTool.ok) {
    assert.equal(viaTool.error.code, 'invalid_input');
    assert.equal(viaTool.error.message, viaHttp.body.error);
  }
  assert.equal(
    (await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id } })).status,
    'draft',
  );
});
