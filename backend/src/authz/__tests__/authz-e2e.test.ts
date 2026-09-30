// Phase 2 end-to-end: Identity → Role → Policy → Tool discovery → Tool invocation → Backend →
// Business logic → Audit, dynamic Save/Apply on an already-open session, historical integrity.
// This is the ONLY test file that changes the active policy (tests run sequentially inside it);
// it restores the Nurse permission at the end.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma.js';
import {
  call,
  createPatientOwnedBy,
  login,
  runTag,
  startApp,
  waitForAudit,
  type Session,
} from './harness-support.js';

let base = '';
let close: () => Promise<void> = async () => {};
let admin: Session;
let supervisor: Session;
let doctor: Session;
let nurse: Session;
let oss: Session;
let doctorPatientId = '';
let nursePatientId = '';
let ossPatientId = '';
const createdConsegne: string[] = [];

const consegna = (pazienteId: string, note: string) => ({
  pazienteId,
  priorita: 'normale',
  tipo: 'clinica',
  note,
  oraScadenza: '18:00',
});

async function activePolicy(session: Session) {
  const response = await call(base, session, 'GET', '/authz/policy');
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return response.body as {
    active: { version: number; document: { grants: Record<string, Record<string, string>> } };
  };
}

before(async () => {
  ({ base, close } = await startApp());
  [admin, supervisor, doctor, nurse, oss] = await Promise.all(
    ['SIM-ADMIN', 'SIM-SUPERVISOR-1', 'SIM-DOCTOR-1', 'SIM-NURSE-1', 'SIM-OSS-1'].map((id) =>
      login(base, id),
    ),
  );
  doctorPatientId = (await createPatientOwnedBy('SIM-DOCTOR-1', 'e2e-doc')).id;
  nursePatientId = (await createPatientOwnedBy('SIM-NURSE-1', 'e2e-nurse')).id;
  ossPatientId = (await createPatientOwnedBy('SIM-OSS-1', 'e2e-oss')).id;
});

after(async () => {
  await prisma.consegna.deleteMany({ where: { id: { in: createdConsegne } } });
  await prisma.patient.deleteMany({
    where: { id: { in: [doctorPatientId, nursePatientId, ossPatientId] } },
  });
  await close();
});

test('Doctor 1 → allowed tool (with confirmation) → backend → business logic → success → audit Doctor 1', async () => {
  const body = {
    farmacoNome: 'Bisoprololo',
    dataInizio: '2033-03-01',
    dosaggio: '2,5 mg',
    viaSomministrazione: 'orale',
    tipo: 'periodica',
    fasceMattina: true,
  };
  const unconfirmed = await call(base, doctor, 'POST', '/tools/therapy.create/invoke', {
    input: { patientId: doctorPatientId, body },
  });
  assert.equal(unconfirmed.status, 428, 'ALLOWED_WITH_CONFIRMATION needs an explicit confirmation');
  assert.equal(unconfirmed.body.error.code, 'confirmation_required');
  assert.equal(await prisma.patientTherapy.count({ where: { patientId: doctorPatientId } }), 0);

  const requestId = `${runTag}-doctor-therapy`;
  const confirmed = await call(
    base,
    doctor,
    'POST',
    '/tools/therapy.create/invoke',
    { requestId, confirmed: true, input: { patientId: doctorPatientId, body } },
    { 'X-Tool-Origin': 'ai' },
  );
  assert.equal(confirmed.status, 200, JSON.stringify(confirmed.body));
  const therapy = await prisma.patientTherapy.findUniqueOrThrow({
    where: { id: confirmed.body.data.id },
  });
  assert.equal(therapy.farmacoNome, 'Bisoprololo');
  assert.equal(therapy.operatoreInseritore, 'Doctor 1', 'prescription attributed to Doctor 1');

  const audit = await waitForAudit({ requestId, actionType: 'tool:therapy.create' });
  assert.equal(audit?.operatorId, 'SIM-DOCTOR-1');
  assert.equal(audit?.operatorRole, 'doctor');
  assert.equal(audit?.outcome, 'ok');
});

test('OSS 1 → forbidden capability → DENIED (tool, direct backend route, Agnos read tools)', async () => {
  const tool = await call(base, oss, 'POST', '/tools/administration.list_slots/invoke', {
    input: { query: { date: '2033-03-01' } },
  });
  assert.equal(tool.status, 403);
  const route = await call(base, oss, 'GET', '/therapy-slots?date=2033-03-01');
  assert.equal(route.status, 403);
  assert.equal(route.body.capability, 'administration.list_slots');

  // Agnos: the same OSS asks for therapies through the assistant → the read tool is refused.
  const ask = await call(base, oss, 'POST', '/ai/assistant/query', {
    question: 'Quali terapie ha il paziente?',
    currentPatientId: ossPatientId,
  });
  assert.equal(ask.status, 200, JSON.stringify(ask.body));
  assert.match(String(ask.body.refusal ?? ''), /non consentito al tuo ruolo/i);

  // Technical Administrator: least privilege on clinical writes, full access to structure.
  const adminDiary = await call(base, admin, 'POST', `/patients/${doctorPatientId}/diary`, {
    content: 'x',
    entryDateTime: '2026-09-30T10:00',
    priority: 'normale',
  });
  assert.equal(adminDiary.status, 403);
  const rooms = await call(base, admin, 'GET', '/admin/rooms');
  assert.equal(rooms.status, 200);
});

test('Dynamic policy: Administrator Save/Apply on Nurse; the open Nurse 1 session follows at its next call', async () => {
  // Before: Nurse 1 creates a handover (historical record under the current policy).
  const before = await call(
    base,
    nurse,
    'POST',
    '/consegne',
    consegna(nursePatientId, 'Prima della revoca'),
  );
  assert.equal(before.status, 201, JSON.stringify(before.body));
  createdConsegne.push(before.body.id);
  const historicalAudit = await waitForAudit({
    operatorId: 'SIM-NURSE-1',
    actionType: 'consegne.create',
    outcome: 'ok',
  });
  assert.equal(historicalAudit?.operatorRole, 'nurse');
  const nurseToolsBefore = await call(base, nurse, 'GET', '/tools');
  assert.ok(
    nurseToolsBefore.body.tools.some((t: { name: string }) => t.name === 'consegne.create'),
  );

  const policy = await activePolicy(admin);
  const proposed = structuredClone(policy.active.document);
  proposed.grants.nurse['consegne.create'] = 'DENIED';

  const impact = await call(base, admin, 'POST', '/authz/policy/impact', { document: proposed });
  assert.equal(impact.status, 200, JSON.stringify(impact.body));
  const nurseImpact = impact.body.roles.find((r: { roleId: string }) => r.roleId === 'nurse');
  assert.deepEqual(nurseImpact.lost, ['consegne.create']);
  assert.deepEqual(nurseImpact.toolsLost, ['consegne.create'], 'Agno will lose the tool');
  assert.ok(nurseImpact.identities.includes('SIM-NURSE-1'));

  // Save (draft): not applied yet → the nurse is still allowed.
  const draft = await call(base, admin, 'POST', '/authz/policy/versions', {
    document: proposed,
    basedOnVersion: policy.active.version,
    note: `${runTag}: revoca consegne infermiere`,
    apply: false,
  });
  assert.equal(draft.status, 201, JSON.stringify(draft.body));
  assert.equal(draft.body.status, 'draft');
  const stillAllowed = await call(
    base,
    nurse,
    'POST',
    '/consegne',
    consegna(nursePatientId, 'Bozza non applicata'),
  );
  assert.equal(stillAllowed.status, 201);
  createdConsegne.push(stillAllowed.body.id);

  // Apply: system-wide, effective on the ALREADY OPEN nurse session (same token).
  const applied = await call(
    base,
    admin,
    'POST',
    `/authz/policy/versions/${draft.body.version}/apply`,
  );
  assert.equal(applied.status, 200, JSON.stringify(applied.body));
  assert.equal(applied.body.status, 'active');

  const denied = await call(
    base,
    nurse,
    'POST',
    '/consegne',
    consegna(nursePatientId, 'Dopo la revoca'),
  );
  assert.equal(denied.status, 403);
  assert.equal(denied.body.code, 'capability_denied');
  const deniedTool = await call(base, nurse, 'POST', '/tools/consegne.create/invoke', {
    input: { body: consegna(nursePatientId, 'Dopo la revoca (tool)') },
  });
  assert.equal(deniedTool.status, 403);
  const nurseToolsAfter = await call(base, nurse, 'GET', '/tools');
  assert.ok(
    !nurseToolsAfter.body.tools.some((t: { name: string }) => t.name === 'consegne.create'),
  );
  const catalog = await call(base, nurse, 'GET', '/ai/actions/catalog');
  assert.equal(
    catalog.body.find((a: { name: string }) => a.name === 'create_consegna').enabled,
    false,
    'Agnos no longer proposes the action',
  );
  const me = await call(base, nurse, 'GET', '/auth/me');
  assert.equal(me.body.capabilities['consegne.create'].allowed, false);
  assert.equal(me.body.policyVersion, draft.body.version);
  // Other capabilities of the nurse are untouched.
  const list = await call(base, nurse, 'GET', `/consegne?patientId=${nursePatientId}`);
  assert.equal(list.status, 200);

  // Historical integrity: yesterday's record and its audit keep identity and role.
  const kept = await prisma.consegna.findUniqueOrThrow({ where: { id: before.body.id } });
  assert.equal(kept.creatoDaId, 'SIM-NURSE-1');
  const auditAgain = await prisma.aiAuditEvent.findUniqueOrThrow({
    where: { id: historicalAudit!.id },
  });
  assert.equal(auditAgain.operatorRole, 'nurse');
  assert.equal(auditAgain.outcome, 'ok');

  // Versions and before/after are recorded with the author.
  const versions = await call(base, admin, 'GET', '/authz/policy/versions');
  const row = versions.body.versions.find(
    (v: { version: number }) => v.version === draft.body.version,
  );
  assert.equal(row.status, 'active');
  assert.equal(row.createdById, 'SIM-ADMIN');
  assert.equal(row.createdByRole, 'administrator');
  assert.deepEqual(row.changeSummary.grants, [
    { roleId: 'nurse', capabilityId: 'consegne.create', before: 'ALLOWED', after: 'DENIED' },
  ]);

  // Optimistic concurrency: a proposal based on the superseded version is rejected.
  const stale = await call(base, admin, 'POST', '/authz/policy/versions', {
    document: policy.active.document,
    basedOnVersion: policy.active.version,
    apply: true,
  });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.code, 'policy_version_conflict');

  // Restore (Save + Apply in one step) → the same session is allowed again.
  const current = await activePolicy(admin);
  const restored = structuredClone(current.active.document);
  restored.grants.nurse['consegne.create'] = 'ALLOWED';
  const restore = await call(base, admin, 'POST', '/authz/policy/versions', {
    document: restored,
    basedOnVersion: current.active.version,
    note: `${runTag}: ripristino`,
    apply: true,
  });
  assert.equal(restore.status, 201, JSON.stringify(restore.body));
  const again = await call(
    base,
    nurse,
    'POST',
    '/consegne',
    consegna(nursePatientId, 'Dopo il ripristino'),
  );
  assert.equal(again.status, 201);
  createdConsegne.push(again.body.id);
});

test('Policy administration is itself protected and validated', async () => {
  const nurseView = await call(base, nurse, 'GET', '/authz/policy');
  assert.equal(nurseView.status, 403);
  const supervisorView = await call(base, supervisor, 'GET', '/authz/policy');
  assert.equal(supervisorView.status, 200, 'Supervisor: read-only view of the policy');
  const policy = supervisorView.body;
  const supervisorEdit = await call(base, supervisor, 'POST', '/authz/policy/versions', {
    document: policy.active.document,
    basedOnVersion: policy.active.version,
    apply: true,
  });
  assert.equal(supervisorEdit.status, 403);

  const lockout = structuredClone(policy.active.document);
  for (const role of Object.keys(lockout.grants))
    lockout.grants[role]['authz.manage_policy'] = 'DENIED';
  const rejected = await call(base, admin, 'POST', '/authz/policy/versions', {
    document: lockout,
    basedOnVersion: policy.active.version,
    apply: true,
  });
  assert.equal(rejected.status, 400);
  assert.equal(rejected.body.code, 'invalid_policy');

  // Removing an assignment is not silent: the fallback to a legacy role is flagged before Apply.
  const unassigned = structuredClone(policy.active.document);
  delete unassigned.assignments['SIM-SUPERVISOR-1'];
  const fallback = await call(base, admin, 'POST', '/authz/policy/impact', {
    document: unassigned,
  });
  assert.equal(fallback.status, 200);
  const warnings = (fallback.body.warnings as string[]).join(' | ');
  assert.match(
    warnings,
    /SIM-SUPERVISOR-1 perde l’assegnazione e ricade sul ruolo legacy "legacy_admin"/,
  );
  assert.match(warnings, /SIM-SUPERVISOR-1 potrà gestire ruoli e permessi/);

  const escalation = structuredClone(policy.active.document);
  escalation.grants.oss['nope.escalate'] = 'ALLOWED';
  const unknown = await call(base, admin, 'POST', '/authz/policy/impact', { document: escalation });
  assert.equal(unknown.status, 400);
});
