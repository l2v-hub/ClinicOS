// Phase 3 end-to-end suite (Prompt 3 §20, A–J): the REAL Express app over HTTP, Role Simulator
// identities, real Postgres. Path under test:
//   natural language → /skills/converse → policy → interpreter → skill → workflow state →
//   Tool Layer (re-authorized) → existing services → Postgres → AiAuditEvent.
// The interpreter is the deterministic one here (no network in CI); the live Agno run is
// scripts/skills/agno-live-e2e.mjs (evidence in .ai-architecture/phase-3-skills/E2E_TEST_REPORT.md).
// The only sandbox is setSkillInvokeWrapper, used by H to simulate a backend failure.

process.env.SKILLS_INTERPRETER = 'deterministic';

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma.js';
import {
  call,
  login,
  runTag,
  startApp,
  waitForAudit,
  type Session,
} from '../../authz/__tests__/harness-support.js';
import { setSkillInvokeWrapper } from '../index.js';

let base = '';
let close: () => Promise<void>;
let admin: Session;
let nurse: Session;
let oss: Session;
let doctor: Session;
const tag = runTag.replace(/[^a-z]/g, '').slice(-5) || 'skl';
const Tag = tag.charAt(0).toUpperCase() + tag.slice(1);
const rossi = `Rossi${Tag}`;
const bianchi = `Bianchi${Tag}`;
const patients: Record<string, string> = {};

async function patient(key: string, firstName: string, lastName: string, owner: string) {
  const row = await prisma.patient.create({
    data: {
      medicalRecordNumber: `MRN-${runTag}-${key}`,
      firstName,
      lastName,
      dateOfBirth: new Date('1940-05-06T00:00:00.000Z'),
      sex: 'F',
      registeredById: owner,
    },
  });
  patients[key] = row.id;
  return row.id;
}

function say(session: Session, body: Record<string, unknown>) {
  return call(base, session, 'POST', '/skills/converse', body);
}

const readings = (patientId: string) =>
  prisma.patientParameterReading.count({ where: { patientId } });

async function activePolicy() {
  const response = await call(base, admin, 'GET', '/authz/policy');
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return response.body.active as {
    version: number;
    document: { grants: Record<string, Record<string, string>> };
  };
}

async function setGrant(role: string, capability: string, effect: string, note: string) {
  const policy = await activePolicy();
  const document = structuredClone(policy.document);
  document.grants[role][capability] = effect;
  const saved = await call(base, admin, 'POST', '/authz/policy/versions', {
    document,
    basedOnVersion: policy.version,
    note: `${runTag}: ${note}`,
    apply: true,
  });
  assert.equal(saved.status, 201, JSON.stringify(saved.body));
}

before(async () => {
  ({ base, close } = await startApp());
  [admin, nurse, oss, doctor] = await Promise.all(
    ['SIM-ADMIN', 'SIM-NURSE-1', 'SIM-OSS-1', 'SIM-DOCTOR-1'].map((id) => login(base, id)),
  );
  await patient('rossi', 'Mario', rossi, 'SIM-NURSE-1');
  await patient('bianchiAnna', 'Anna', bianchi, 'SIM-NURSE-1');
  await patient('bianchiLuca', 'Luca', bianchi, 'SIM-NURSE-1');
  await patient('ossPatient', 'Olga', `Verdi${Tag}`, 'SIM-OSS-1');
  await patient('doctorPatient', 'Dario', `Neri${Tag}`, 'SIM-DOCTOR-1');
});

after(async () => {
  setSkillInvokeWrapper(null);
  const ids = Object.values(patients);
  await prisma.consegna.deleteMany({ where: { pazienteId: { in: ids } } });
  await prisma.patientDiaryEntry.deleteMany({ where: { patientId: { in: ids } } });
  await prisma.patient.deleteMany({ where: { id: { in: ids } } });
  await close();
});

test('discovery: GET /skills reflects the policy per role', async () => {
  const byRole = async (session: Session) => {
    const response = await call(base, session, 'GET', '/skills');
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return new Map(
      (response.body.skills as { id: string; available: boolean }[]).map((s) => [
        s.id,
        s.available,
      ]),
    );
  };
  const n = await byRole(nurse);
  assert.equal(n.get('vitals.record'), true);
  assert.equal(n.get('therapy.due_administrations'), true);
  assert.equal(n.get('therapy.prescribe'), false, 'HIGH_RISK is never executable');
  const o = await byRole(oss);
  assert.equal(o.get('vitals.record'), true);
  assert.equal(
    o.get('therapy.due_administrations'),
    false,
    'OSS: administration.list_slots DENIED',
  );
  const a = await byRole(admin);
  assert.equal(a.get('vitals.record'), false);
  assert.equal(a.get('facility.occupancy'), true);
  const unauth = await call(base, null, 'GET', '/skills');
  assert.equal(unauth.status, 401);
});

test('A — read skill: natural language → skill → authorized read tool → backend → result', async () => {
  // Seed one reading through the Tool Layer (as the GUI/AI would).
  const seeded = await call(base, nurse, 'POST', '/tools/parameters.create_reading/invoke', {
    input: {
      patientId: patients.rossi,
      body: {
        requestId: crypto.randomUUID(),
        measuredAt: new Date(Date.now() - 3_600_000).toISOString(),
        values: { pa: '135/85', fc: '78' },
      },
    },
  });
  assert.equal(seeded.status, 200, JSON.stringify(seeded.body));

  const read = await say(nurse, {
    message: 'mostrami i parametri recenti di questo ospite',
    context: { currentPatientId: patients.rossi, currentPatientLabel: `${rossi} Mario` },
  });
  assert.equal(read.status, 200, JSON.stringify(read.body));
  assert.equal(read.body.status, 'COMPLETED', JSON.stringify(read.body));
  assert.equal(read.body.skillId, 'vitals.recent');
  assert.match(read.body.reply, /Pressione 135\/85/);
  assert.equal(read.body.interpreter, 'deterministic');
  const tool = await waitForAudit({
    actionType: 'tool:parameters.list_readings',
    requestId: `skill-${read.body.workflowId}`,
  });
  assert.ok(tool, 'the read went through the Tool Layer');
  assert.equal(tool.outcome, 'ok');
  assert.equal(tool.channel, 'ai');

  const overview = await say(nurse, {
    message: 'mostrami le informazioni disponibili su questo paziente',
    context: { currentPatientId: patients.rossi },
  });
  assert.equal(overview.body.status, 'COMPLETED', JSON.stringify(overview.body));
  assert.equal(overview.body.skillId, 'patient.overview');
  assert.match(overview.body.reply, /Ultima rilevazione/);
});

test('B + I — write skill: preview → explicit confirmation → persisted → verified → audit', async () => {
  const before = await readings(patients.rossi);
  const start = await say(nurse, {
    message: `registra pressione 120/80 e saturazione 97 per Mario ${rossi}`,
  });
  assert.equal(start.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(start.body));
  const preview = start.body.preview;
  assert.equal(preview.patient.id, patients.rossi);
  assert.equal(preview.values.Pressione, '120/80');
  assert.equal(preview.values['SpO₂'], '97');
  assert.equal(preview.tool, 'parameters.create_reading');
  assert.equal(preview.origin, 'ai');
  assert.equal(await readings(patients.rossi), before, 'nothing written before confirmation');

  const done = await say(nurse, { workflowId: start.body.workflowId, action: 'confirm' });
  assert.equal(done.body.status, 'COMPLETED', JSON.stringify(done.body));
  assert.equal(done.body.result.verified, true, 'read back through parameters.list_readings');
  assert.equal(await readings(patients.rossi), before + 1);
  const row = await prisma.patientParameterReading.findUnique({
    where: { id: done.body.result.readingId },
  });
  assert.deepEqual(row?.values, { pa: '120/80', spo2: '97' });
  assert.equal(row?.authorOperatorId, 'SIM-NURSE-1', 'identity reached the business rule');

  // I — audit reconstructs identity, role, skill, tool, confirmation, outcome, origin.
  const requestId = `skill-${start.body.workflowId}`;
  const stage = (s: string) => waitForAudit({ requestId, actionType: `skill:vitals.record:${s}` });
  const [request, proposal, confirmation, execution] = await Promise.all(
    ['request', 'proposal', 'confirmation', 'execute'].map(stage),
  );
  for (const event of [request, proposal, confirmation, execution]) {
    assert.ok(event);
    assert.equal(event!.operatorId, 'SIM-NURSE-1');
    assert.equal(event!.operatorRole, 'nurse');
    assert.equal(event!.channel, 'ai');
  }
  assert.ok(request!.fields.includes('interpreter:deterministic'));
  assert.ok(proposal!.fields.includes('tool:parameters.create_reading'));
  assert.ok(proposal!.fields.includes('value:pa'), 'field NAMES only');
  assert.ok(!proposal!.fields.some((f) => f.includes('120')), 'no values (PHI-safe)');
  assert.deepEqual(confirmation!.fields, ['confirmed']);
  assert.equal(execution!.outcome, 'ok');
  assert.equal(execution!.patientId, patients.rossi);
  const toolEvent = await waitForAudit({ requestId, actionType: 'tool:parameters.create_reading' });
  assert.equal(toolEvent?.outcome, 'ok');
  assert.equal(toolEvent?.operatorRole, 'nurse');
});

test('C — ambiguous or missing target → NEEDS_CLARIFICATION, no write', async () => {
  const counts = async () =>
    (await readings(patients.bianchiAnna)) +
    (await readings(patients.bianchiLuca)) +
    (await readings(patients.rossi));
  const before = await counts();
  const noTarget = await say(nurse, { message: 'aggiungi pressione 120/80' });
  assert.equal(noTarget.body.status, 'NEEDS_CLARIFICATION', JSON.stringify(noTarget.body));
  assert.equal(noTarget.body.pending, 'patient');
  assert.match(noTarget.body.reply, /Per quale ospite/);
  // Even an explicit confirm cannot skip the missing target.
  const forced = await say(nurse, { workflowId: noTarget.body.workflowId, action: 'confirm' });
  assert.equal(forced.body.status, 'NEEDS_CLARIFICATION');

  const twoMatches = await say(nurse, { message: `registra pressione 130/80 per ${bianchi}` });
  assert.equal(twoMatches.body.status, 'NEEDS_CLARIFICATION', JSON.stringify(twoMatches.body));
  assert.equal(twoMatches.body.candidates.length, 2);
  assert.equal(await counts(), before, 'no write on an ambiguous target');
});

test('D — identity without the capability → DENIED, confirmed by the backend', async () => {
  const before = await readings(patients.rossi);
  const denied = await say(admin, { message: `registra pressione 120/80 per Mario ${rossi}` });
  assert.equal(denied.body.status, 'DENIED', JSON.stringify(denied.body));
  assert.equal(denied.body.error.code, 'capability_denied');
  assert.match(denied.body.reply, /parameters\.create_reading/);
  // Backend confirmation: the same tool invoked directly is refused by the policy.
  const direct = await call(base, admin, 'POST', '/tools/parameters.create_reading/invoke', {
    input: {
      patientId: patients.rossi,
      body: {
        requestId: crypto.randomUUID(),
        measuredAt: new Date().toISOString(),
        values: { pa: '120/80' },
      },
    },
  });
  assert.equal(direct.status, 403);
  assert.equal(direct.body.error.domainCode, 'capability_denied');
  assert.equal(await readings(patients.rossi), before);
  const ossDenied = await say(oss, { message: 'quali somministrazioni ci sono oggi?' });
  assert.equal(ossDenied.body.status, 'DENIED', JSON.stringify(ossDenied.body));
  assert.ok(
    await waitForAudit({
      requestId: `skill-${ossDenied.body.workflowId}`,
      actionType: 'skill:therapy.due_administrations:denied',
    }),
  );
  // HIGH_RISK: even an allowed doctor gets a hand-off, never an execution.
  const prescribe = await say(doctor, {
    message: `prescrivi paracetamolo 1 g per Dario Neri${Tag}`,
  });
  assert.equal(prescribe.body.status, 'DENIED');
  assert.equal(prescribe.body.error.code, 'human_control_required');
});

test('E — multi-turn: structured state across turns, then completion', async () => {
  const before = await readings(patients.bianchiLuca);
  const t1 = await say(nurse, { message: 'Registra i parametri.' });
  assert.equal(t1.body.status, 'NEEDS_CLARIFICATION', JSON.stringify(t1.body));
  assert.match(t1.body.reply, /Per quale ospite/);
  const id = t1.body.workflowId;
  const t2 = await say(nurse, { workflowId: id, message: bianchi });
  assert.equal(t2.body.candidates.length, 2, JSON.stringify(t2.body));
  const luca =
    t2.body.candidates.findIndex((c: { id: string }) => c.id === patients.bianchiLuca) + 1;
  const t3 = await say(nurse, { workflowId: id, message: String(luca) });
  assert.equal(t3.body.status, 'NEEDS_CLARIFICATION', JSON.stringify(t3.body));
  assert.equal(t3.body.pending, 'values');
  assert.match(t3.body.reply, /Quali valori/);
  const t4 = await say(nurse, { workflowId: id, message: 'pressione 118/76, fc 70' });
  assert.equal(t4.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(t4.body));
  assert.equal(t4.body.preview.patient.id, patients.bianchiLuca);
  const t5 = await say(nurse, { workflowId: id, message: 'sì' });
  assert.equal(t5.body.status, 'COMPLETED', JSON.stringify(t5.body));
  assert.equal(await readings(patients.bianchiLuca), before + 1);
  const state = await call(base, nurse, 'GET', `/skills/workflows/${id}`);
  assert.equal(state.status, 200);
  assert.deepEqual(state.body.workflow.slots.values, { pa: '118/76', fc: '70' });
  assert.deepEqual(
    state.body.workflow.history.map((h: { event: string }) => h.event),
    [
      'START',
      'CONTEXT_REQUIRED',
      'NEEDS_CLARIFICATION',
      'NEEDS_CLARIFICATION',
      'NEEDS_CLARIFICATION',
      'READY',
      'PREVIEW',
      'EXECUTING',
      'COMPLETED',
    ],
  );
  // Another identity cannot read or drive this workflow.
  assert.equal((await call(base, oss, 'GET', `/skills/workflows/${id}`)).status, 404);
  const hijack = await say(oss, { workflowId: id, action: 'confirm' });
  assert.equal(hijack.body.error.code, 'workflow_not_found');
});

test('F — capability revoked during the workflow → policy re-evaluated → DENIED, no write', async () => {
  const before = await prisma.patientDiaryEntry.count({ where: { patientId: patients.rossi } });
  const start = await say(nurse, {
    message: `aggiungi questa osservazione per Mario ${rossi}: "rifiuta la cena, riferisce nausea"`,
  });
  assert.equal(start.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(start.body));
  await setGrant('nurse', 'diary.create', 'DENIED', 'revoca diario infermiere');
  try {
    const skills = await call(base, nurse, 'GET', '/skills');
    const skill = skills.body.skills.find((s: { id: string }) => s.id === 'diary.add_observation');
    assert.equal(skill.available, false);
    assert.deepEqual(skill.missingRequired, ['diary.create']);
    const confirm = await say(nurse, { workflowId: start.body.workflowId, action: 'confirm' });
    assert.equal(confirm.body.status, 'DENIED', JSON.stringify(confirm.body));
    assert.equal(confirm.body.error.code, 'capability_revoked');
    assert.equal(
      await prisma.patientDiaryEntry.count({ where: { patientId: patients.rossi } }),
      before,
    );
  } finally {
    await setGrant('nurse', 'diary.create', 'ALLOWED', 'ripristino diario infermiere');
  }
  // After the restore a NEW workflow works (the old one stays DENIED).
  const again = await say(nurse, {
    message: `aggiungi questa osservazione per Mario ${rossi}: "cena consumata"`,
  });
  const ok = await say(nurse, { workflowId: again.body.workflowId, action: 'confirm' });
  assert.equal(ok.body.status, 'COMPLETED', JSON.stringify(ok.body));
  assert.equal(
    await prisma.patientDiaryEntry.count({ where: { patientId: patients.rossi } }),
    before + 1,
  );
  const entry = await prisma.patientDiaryEntry.findUnique({
    where: { id: ok.body.result.entryId },
  });
  assert.equal(entry?.content, 'cena consumata', 'text stored verbatim');
});

test('G — cancellation before confirmation → no write', async () => {
  const note = `nota ${runTag}`;
  const start = await say(nurse, { message: `crea una consegna per Mario ${rossi}: "${note}"` });
  assert.equal(start.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(start.body));
  const cancelled = await say(nurse, { workflowId: start.body.workflowId, message: 'annulla' });
  assert.equal(cancelled.body.status, 'CANCELLED');
  assert.match(cancelled.body.reply, /Nessuna modifica/);
  const late = await say(nurse, { workflowId: start.body.workflowId, action: 'confirm' });
  assert.equal(late.body.status, 'CANCELLED', 'a cancelled workflow cannot be confirmed');
  assert.equal(await prisma.consegna.count({ where: { note } }), 0);
  assert.ok(
    await waitForAudit({
      requestId: `skill-${start.body.workflowId}`,
      actionType: 'skill:handover.create:confirmation',
    }),
  );
});

test('H — backend failure: no false success; retry does not duplicate the write', async () => {
  const before = await readings(patients.bianchiAnna);
  // (1) The backend fails before writing.
  setSkillInvokeWrapper(
    (invoke) => async (tool, input, options) =>
      tool === 'parameters.create_reading'
        ? {
            ok: false,
            tool,
            requestId: 'x',
            error: {
              code: 'upstream_error',
              status: 502,
              message: 'Servizio parametri non disponibile',
            },
          }
        : invoke(tool, input, options),
  );
  const first = await say(nurse, { message: `registra temperatura 37.9 per Anna ${bianchi}` });
  assert.equal(first.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(first.body));
  const failed = await say(nurse, { workflowId: first.body.workflowId, action: 'confirm' });
  assert.equal(failed.body.status, 'FAILED');
  assert.match(failed.body.reply, /NON eseguita/);
  assert.doesNotMatch(failed.body.reply, /registrati/);
  assert.equal(await readings(patients.bianchiAnna), before);

  // (2) The write happens but the answer is lost: retry reuses the requestId → no duplicate.
  setSkillInvokeWrapper((invoke) => async (tool, input, options) => {
    const result = await invoke(tool, input, options);
    return tool === 'parameters.create_reading'
      ? {
          ok: false,
          tool,
          requestId: result.requestId,
          error: { code: 'unavailable', status: 503, message: 'Risposta persa' },
        }
      : result;
  });
  const second = await say(nurse, { message: `registra temperatura 38.1 per Anna ${bianchi}` });
  const lost = await say(nurse, { workflowId: second.body.workflowId, action: 'confirm' });
  assert.equal(lost.body.status, 'FAILED');
  assert.equal(await readings(patients.bianchiAnna), before + 1, 'the write did happen');
  setSkillInvokeWrapper(null);
  const retry = await say(nurse, { workflowId: second.body.workflowId, action: 'retry' });
  assert.equal(retry.body.status, 'COMPLETED', JSON.stringify(retry.body));
  assert.equal(retry.body.result.replayed, true, 'the service recognised the same requestId');
  assert.equal(await readings(patients.bianchiAnna), before + 1, 'no duplicate');
  const again = await say(nurse, { workflowId: second.body.workflowId, action: 'retry' });
  assert.equal(again.body.status, 'COMPLETED');
  assert.equal(await readings(patients.bianchiAnna), before + 1);

  // (3) Stale context: the target disappears between preview and confirmation.
  const tempId = await patient('temp', 'Tina', `Temp${Tag}`, 'SIM-NURSE-1');
  const stale = await say(nurse, { message: `registra fc 80 per Tina Temp${Tag}` });
  assert.equal(stale.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(stale.body));
  await prisma.patient.delete({ where: { id: tempId } });
  delete patients.temp;
  const gone = await say(nurse, { workflowId: stale.body.workflowId, action: 'confirm' });
  assert.equal(gone.body.status, 'FAILED', JSON.stringify(gone.body));
  assert.match(gone.body.reply, /NON eseguita/);
});

test('J — regression: Phase 1/2 tool surface unchanged for the GUI/Agno path', async () => {
  const tools = await call(base, nurse, 'GET', '/tools');
  assert.equal(tools.status, 200);
  assert.ok(tools.body.tools.some((t: { name: string }) => t.name === 'parameters.create_reading'));
  const oss403 = await call(base, oss, 'POST', '/tools/therapy.create/invoke', {
    input: { patientId: patients.ossPatient, body: {} },
  });
  assert.equal(oss403.status, 403);
  const unknown = await say(nurse, { message: 'raccontami una barzelletta' });
  assert.equal(unknown.body.status, 'NEEDS_CLARIFICATION');
  assert.ok(unknown.body.suggestions.length > 0);
});

test('per-role coverage: every executable skill completes for an intended role', async () => {
  const supervisor = await login(base, 'SIM-SUPERVISOR-1');
  const cases: [Session, string, string, Record<string, unknown>?][] = [
    [nurse, 'diary.recent', 'mostrami il diario di questo ospite', { currentPatientId: patients.rossi }],
    [nurse, 'clinical.question', 'quali terapie in corso ha questo ospite?', { currentPatientId: patients.rossi }],
    [nurse, 'therapy.due_administrations', 'quali somministrazioni ci sono oggi?'],
    [oss, 'handover.overview', 'come sono le consegne?'],
    [oss, 'vitals.recent', 'mostrami i parametri recenti di questo ospite', { currentPatientId: patients.ossPatient }],
    [doctor, 'appointments.day', 'appuntamenti di oggi'],
    [doctor, 'patient.overview', 'dimmi tutto su questo ospite', { currentPatientId: patients.doctorPatient }],
    [supervisor, 'facility.occupancy', 'quanti posti letto sono occupati?'],
    [admin, 'facility.occupancy', 'quanti posti letto sono occupati?'],
    [admin, 'admin.roster_contexts', 'mostrami gli ordinamenti dei reparti'],
    [admin, 'drug.lookup', 'cerca il farmaco tachipirina'],
    [nurse, 'patient.find', `cerca l'ospite ${rossi}`],
  ];
  for (const [session, skillId, message, context] of cases) {
    const response = await say(session, { message, ...(context ? { context } : {}) });
    assert.equal(response.body.skillId, skillId, `${session.identityId}: ${message}`);
    assert.equal(response.body.status, 'COMPLETED', `${session.identityId} ${skillId}: ${JSON.stringify(response.body)}`);
  }
  // handover.create completed end-to-end (G only cancelled it).
  const note = `consegna completata ${runTag}`;
  const start = await say(oss, { message: `crea una consegna per Olga Verdi${Tag}: "${note}"` });
  assert.equal(start.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(start.body));
  const done = await say(oss, { workflowId: start.body.workflowId, message: 'conferma' });
  assert.equal(done.body.status, 'COMPLETED', JSON.stringify(done.body));
  assert.equal(await prisma.consegna.count({ where: { note } }), 1);
  // doctor records vitals too (intended role), OSS adds an observation.
  const vit = await say(doctor, { message: `registra pressione 140/90 per Dario Neri${Tag}` });
  assert.equal((await say(doctor, { workflowId: vit.body.workflowId, action: 'confirm' })).body.status, 'COMPLETED');
  const obs = await say(oss, { message: `aggiungi questa osservazione per Olga Verdi${Tag}: "passeggiata in giardino"` });
  assert.equal((await say(oss, { workflowId: obs.body.workflowId, action: 'confirm' })).body.status, 'COMPLETED');
});

test('QA H1 — a slow correction racing a confirmation cannot produce a second write', async () => {
  const { converse } = await import('../engine.js');
  const { defaultSkillDeps } = await import('../index.js');
  const { deterministicInterpreter } = await import('../interpreter.js');
  const identity = { operatorId: 'SIM-NURSE-1', role: 'operatore', name: 'Infermiere 1', appRole: 'nurse' };
  let slow = false;
  const deps = {
    ...defaultSkillDeps,
    interpreter: async (input: Parameters<typeof deterministicInterpreter>[0]) => {
      if (slow) await new Promise((resolve) => setTimeout(resolve, 400));
      return deterministicInterpreter(input);
    },
  };
  const before = await readings(patients.rossi);
  const start = await converse(deps, identity, { message: `registra pressione 120/80 per Mario ${rossi}` });
  assert.equal(start.status, 'NEEDS_CONFIRMATION', JSON.stringify(start));
  slow = true;
  const correction = converse(deps, identity, { workflowId: start.workflowId!, message: 'pressione 130/80' });
  await new Promise((resolve) => setTimeout(resolve, 100));
  slow = false;
  const confirmed = await converse(deps, identity, { workflowId: start.workflowId!, action: 'confirm' });
  assert.equal(confirmed.status, 'COMPLETED', JSON.stringify(confirmed));
  const late = await correction;
  assert.equal(late.status, 'COMPLETED', `the stale correction must not reopen the workflow: ${JSON.stringify(late)}`);
  const again = await converse(deps, identity, { workflowId: start.workflowId!, action: 'confirm' });
  assert.equal(again.status, 'COMPLETED');
  assert.equal(await readings(patients.rossi), before + 1, 'exactly one write');
});

test('QA M1 — a near-confirmation never replaces the text; «correggi:» does', async () => {
  const start = await say(nurse, { message: `aggiungi questa osservazione per Mario ${rossi}: "dorme tranquillo"` });
  assert.equal(start.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(start.body));
  const near = await say(nurse, { workflowId: start.body.workflowId, message: 'sì, conferma' });
  assert.equal(near.body.status, 'NEEDS_CONFIRMATION');
  assert.equal(near.body.preview.values.Testo, 'dorme tranquillo');
  assert.match(near.body.reply, /correggi/);
  const fixed = await say(nurse, { workflowId: start.body.workflowId, message: 'correggi: dorme, respiro regolare' });
  assert.equal(fixed.body.preview.values.Testo, 'dorme, respiro regolare');
  const cancel = await say(nurse, { workflowId: start.body.workflowId, action: 'cancel' });
  assert.equal(cancel.body.status, 'CANCELLED');
});

test('QA L1 — page context: exactly the verified id, label from server data', async () => {
  const listCtx = await say(nurse, {
    message: 'registra pressione 120/80 per questo ospite',
    context: { currentPatientId: `${patients.rossi},${patients.bianchiAnna}` },
  });
  assert.equal(listCtx.body.status, 'NEEDS_CLARIFICATION', JSON.stringify(listCtx.body));
  const spoofed = await say(nurse, {
    message: 'registra pressione 120/80 per questo ospite',
    context: { currentPatientId: patients.rossi, currentPatientLabel: `Anna ${bianchi}` },
  });
  assert.equal(spoofed.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(spoofed.body));
  assert.equal(spoofed.body.preview.patient.id, patients.rossi);
  assert.doesNotMatch(spoofed.body.preview.patient.label, /Bianchi/);
  await say(nurse, { workflowId: spoofed.body.workflowId, action: 'cancel' });
  const honest = await say(nurse, {
    message: 'registra pressione 120/80 per questo ospite',
    context: { currentPatientId: patients.rossi, currentPatientLabel: `Mario ${rossi}` },
  });
  assert.equal(honest.body.preview.patient.label, `${rossi} Mario`);
  await say(nurse, { workflowId: honest.body.workflowId, action: 'cancel' });
});
