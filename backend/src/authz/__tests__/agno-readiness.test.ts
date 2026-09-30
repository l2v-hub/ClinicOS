// Agno Readiness Harness (Phase 2). Exercises the path the Agno runtime will use, with no
// privileged test path: simulated identity → GET /tools (discovery filtered by policy) →
// POST /tools/:name/invoke → existing service → Postgres → AiAuditEvent attribution.
//
//   1. select/use a simulated identity           5. business logic reached (DB row)
//   2. enumerate the tools actually available     6. forbidden invocation → DENIED (tool AND route)
//   3. denied tools are not offered               7. audit + identity/role attribution
//   4. invoke an allowed tool with a controlled payload

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
let doctor: Session;
let oss: Session;
let doctorPatientId = '';
let ossPatientId = '';

before(async () => {
  ({ base, close } = await startApp());
  doctor = await login(base, 'SIM-DOCTOR-1');
  oss = await login(base, 'SIM-OSS-1');
  doctorPatientId = (await createPatientOwnedBy('SIM-DOCTOR-1', 'agno-doc')).id;
  ossPatientId = (await createPatientOwnedBy('SIM-OSS-1', 'agno-oss')).id;
});

after(async () => {
  await prisma.patient.deleteMany({ where: { id: { in: [doctorPatientId, ossPatientId] } } });
  await close();
});

test('1. identity: the session names the identity; the role comes from the server policy', async () => {
  const me = await call(base, doctor, 'GET', '/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.id, 'SIM-DOCTOR-1');
  assert.equal(me.body.name, 'Medico 1');
  assert.equal(me.body.appRole, 'doctor');
  assert.equal(me.body.roleSource, 'assignment');
  assert.equal(me.body.identitySource, 'simulator');
  assert.equal(me.body.capabilities['therapy.create'].requiresConfirmation, true);

  const ossMe = await call(base, oss, 'GET', '/auth/me');
  assert.equal(ossMe.body.appRole, 'oss');
  assert.equal(ossMe.body.capabilities['therapy.create'].allowed, false);
});

test('2-3. discovery: each identity gets exactly its allowed tools; denied tools are not offered', async () => {
  const doctorTools = await call(base, doctor, 'GET', '/tools', undefined, {
    'X-Tool-Origin': 'ai',
  });
  const ossTools = await call(base, oss, 'GET', '/tools', undefined, { 'X-Tool-Origin': 'ai' });
  assert.equal(doctorTools.status, 200);
  const doctorNames = new Set<string>(doctorTools.body.tools.map((t: { name: string }) => t.name));
  const ossNames = new Set<string>(ossTools.body.tools.map((t: { name: string }) => t.name));

  for (const name of ['diary.create', 'therapy.create', 'narrative.save', 'assessments.finalize']) {
    assert.ok(doctorNames.has(name), `doctor sees ${name}`);
  }
  const therapyCreate = doctorTools.body.tools.find(
    (t: { name: string }) => t.name === 'therapy.create',
  );
  assert.equal(
    therapyCreate.requiresConfirmation,
    true,
    'prescribing is offered with confirmation',
  );
  assert.ok(
    !doctorNames.has('administration.confirm'),
    'baseline: administration is a nursing act',
  );

  for (const name of [
    'therapy.create',
    'administration.confirm',
    'documents.upload',
    'narrative.list',
  ]) {
    assert.ok(!ossNames.has(name), `OSS must not be offered ${name}`);
  }
  for (const name of ['consegne.create', 'diary.create', 'parameters.create_reading']) {
    assert.ok(ossNames.has(name), `OSS sees ${name}`);
  }
  assert.ok(ossNames.size < doctorNames.size);

  // Agnos action catalog follows the same policy.
  const ossCatalog = await call(base, oss, 'GET', '/ai/actions/catalog');
  const doctorCatalog = await call(base, doctor, 'GET', '/ai/actions/catalog');
  const enabled = (catalog: { name: string; enabled: boolean }[], name: string) =>
    catalog.find((entry) => entry.name === name)?.enabled;
  assert.equal(enabled(ossCatalog.body, 'create_appointment'), false);
  assert.equal(enabled(doctorCatalog.body, 'create_appointment'), true);
});

test('4-5-7. allowed invocation reaches the business logic and is attributed to Doctor 1', async () => {
  const requestId = `${runTag}-agno-diary`;
  const response = await call(
    base,
    doctor,
    'POST',
    '/tools/diary.create/invoke',
    {
      requestId,
      input: {
        patientId: doctorPatientId,
        body: {
          content: 'Visita di controllo',
          entryDateTime: '2026-09-30T09:00',
          priority: 'normale',
        },
      },
    },
    { 'X-Tool-Origin': 'ai' },
  );
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.ok, true);
  const entry = await prisma.patientDiaryEntry.findUniqueOrThrow({
    where: { id: response.body.data.entry.id },
  });
  assert.equal(entry.patientId, doctorPatientId);
  assert.equal(entry.authorType, 'medico', 'identity reached the business rule (Operator.ruolo)');
  assert.equal(entry.authorName, 'Medico 1');

  const audit = await waitForAudit({ requestId, actionType: 'tool:diary.create' });
  assert.ok(audit, 'audit row persisted');
  assert.equal(audit!.operatorId, 'SIM-DOCTOR-1');
  assert.equal(audit!.operatorRole, 'doctor');
  assert.equal(audit!.channel, 'ai');
  assert.equal(audit!.outcome, 'ok');
  assert.ok(!JSON.stringify(audit).includes('Visita di controllo'), 'no clinical text in audit');
});

test('6-7. forbidden capability is denied at the tool AND at the backend route, and audited', async () => {
  const therapyBody = {
    farmacoNome: 'Ramipril',
    dataInizio: '2033-02-01',
    dosaggio: '5 mg',
    viaSomministrazione: 'orale',
    tipo: 'periodica',
    fasceMattina: true,
  };
  const requestId = `${runTag}-agno-denied`;
  const viaTool = await call(
    base,
    oss,
    'POST',
    '/tools/therapy.create/invoke',
    { requestId, input: { patientId: ossPatientId, body: therapyBody } },
    { 'X-Tool-Origin': 'ai' },
  );
  assert.equal(viaTool.status, 403);
  assert.equal(viaTool.body.error.domainCode, 'capability_denied');

  // Bypassing Agno and the GUI: the route itself refuses before any handler runs.
  const viaRoute = await call(
    base,
    oss,
    'POST',
    `/patients/${ossPatientId}/therapies`,
    therapyBody,
  );
  assert.equal(viaRoute.status, 403);
  assert.equal(viaRoute.body.code, 'capability_denied');
  assert.equal(viaRoute.body.capability, 'therapy.create');
  assert.equal(await prisma.patientTherapy.count({ where: { patientId: ossPatientId } }), 0);

  // Path-shape variants Express would still route (case, trailing slash) meet the same decision.
  for (const variant of [
    `/PATIENTS/${ossPatientId}/Therapies`,
    `/patients/${ossPatientId}/therapies/`,
  ]) {
    const bypass = await call(base, oss, 'POST', variant, therapyBody);
    assert.equal(bypass.status, 403, `${variant} → ${bypass.status}`);
  }
  const head = await fetch(`${base}/therapy-slots?date=2033-03-01`, {
    method: 'HEAD',
    headers: { Authorization: `Bearer ${oss.token}` },
  });
  assert.equal(head.status, 403, 'HEAD is decided like GET');

  // A malformed escape in the path is denied and never crashes the process (audit is best-effort).
  const malformed = await call(base, oss, 'POST', '/patients/%E0%A4%A/therapies', therapyBody);
  assert.equal(malformed.status, 403);
  const alive = await call(base, oss, 'GET', '/auth/me');
  assert.equal(alive.status, 200, 'backend still up after a malformed URI');

  // Self-declared role headers cannot escalate a simulator session.
  const spoofed = await call(
    base,
    oss,
    'POST',
    `/patients/${ossPatientId}/therapies`,
    therapyBody,
    {
      'X-Operator-Id': 'SIM-ADMIN',
      'X-Operator-Role': 'admin',
    },
  );
  assert.equal(spoofed.status, 403);

  const toolAudit = await waitForAudit({ requestId, actionType: 'tool:therapy.create' });
  assert.equal(toolAudit?.operatorId, 'SIM-OSS-1');
  assert.equal(toolAudit?.operatorRole, 'oss');
  assert.equal(toolAudit?.outcome, 'denied');
  const routeAudit = await waitForAudit({
    operatorId: 'SIM-OSS-1',
    actionType: 'therapy.create',
    outcome: 'denied',
  });
  assert.equal(routeAudit?.operatorRole, 'oss');
  assert.equal(routeAudit?.channel, 'gui');
});

test('no privileged path: without a simulator session, self-declared identities are refused', async () => {
  const headersOnly = await call(base, null, 'GET', '/tools', undefined, {
    'X-Operator-Id': 'SIM-ADMIN',
    'X-Operator-Role': 'admin',
  });
  assert.equal(headersOnly.status, 401);
  assert.equal(headersOnly.body.code, 'simulator_session_required');
  const tampered = await call(
    base,
    { identityId: 'x', token: `${doctor.token}x` },
    'GET',
    '/tools',
  );
  assert.equal(tampered.status, 401);
});
