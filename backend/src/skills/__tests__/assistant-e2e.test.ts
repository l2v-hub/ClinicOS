// Phase 4 end-to-end suite (Prompt 4 §17, A–J) at the API the AI Assistant UI uses:
//   /skills/session, /skills/context, /skills/residents, /skills/converse
// REAL Express app over HTTP, Role Simulator identities, real Postgres, policy changed through the
// real admin API. Deterministic interpreter (no network in CI); the browser run of the same flows
// is scripts/assistant/assistant-browser-e2e.mjs. Only sandbox: setSkillInvokeWrapper (I).

process.env.SKILLS_INTERPRETER = 'deterministic';

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma.js';
import { createTherapyInTx } from '../../therapies/therapy-create.js';
import { facilityToday } from '../../patients/parameter-reading-input.js';
import {
  call,
  login,
  runTag,
  startApp,
  waitForAudit,
  type Session,
} from '../../authz/__tests__/harness-support.js';
import { setSkillInvokeWrapper } from '../index.js';

// #389: the default resident scope is facility-wide. This suite exercises the scope-enforcement
// plumbing (out-of-scope residents denied), so it pins the restricted, still-supported mode.
process.env.RESIDENT_SCOPE_CONFIG ??= JSON.stringify({ fallback: 'registered_by_me' });

let base = '';
let close: () => Promise<void>;
let admin: Session;
let supervisor: Session;
let doctor: Session;
let nurse: Session;
let oss: Session;
const tag = runTag.replace(/[^a-z]/g, '').slice(-4) || 'asst';
const Tag = tag.charAt(0).toUpperCase() + tag.slice(1);
const ids: Record<string, string> = {};
const today = facilityToday();

async function patient(key: string, firstName: string, lastName: string, owner: string) {
  const row = await prisma.patient.create({
    data: {
      medicalRecordNumber: `MRN-${runTag}-${key}`,
      firstName,
      lastName,
      dateOfBirth: new Date('1941-02-03T00:00:00.000Z'),
      sex: 'M',
      registeredById: owner,
    },
  });
  ids[key] = row.id;
  return row.id;
}

const say = (session: Session, body: Record<string, unknown>) =>
  call(base, session, 'POST', '/skills/converse', body);
const ctx = (patientId: string | null) => ({ context: { currentPatientId: patientId } });
const confirm = (session: Session, response: { body: any }, extra: Record<string, unknown> = {}) =>
  say(session, {
    workflowId: response.body.workflowId,
    action: 'confirm',
    previewId: response.body.preview?.previewId,
    ...extra,
  });

/** Save+Apply one grant; other test files may apply policies concurrently → retry on 409. */
async function setGrant(role: string, capability: string, effect: string, note: string) {
  for (let attempt = 0; ; attempt += 1) {
    const current = await call(base, admin, 'GET', '/authz/policy');
    assert.equal(current.status, 200, JSON.stringify(current.body));
    const document = structuredClone(current.body.active.document);
    document.grants[role][capability] = effect;
    const saved = await call(base, admin, 'POST', '/authz/policy/versions', {
      document,
      basedOnVersion: current.body.active.version,
      note: `${runTag}: ${note}`,
      apply: true,
    });
    if (saved.status === 409 && attempt < 10) continue;
    assert.equal(saved.status, 201, JSON.stringify(saved.body));
    return;
  }
}

before(async () => {
  ({ base, close } = await startApp());
  [admin, supervisor, doctor, nurse, oss] = await Promise.all(
    ['SIM-ADMIN', 'SIM-SUPERVISOR-1', 'SIM-DOCTOR-1', 'SIM-NURSE-1', 'SIM-OSS-1'].map((id) =>
      login(base, id),
    ),
  );
  await patient('doc', 'Dario', `Neri${Tag}`, 'SIM-DOCTOR-1');
  await patient('nurse', 'Nora', `Galli${Tag}`, 'SIM-NURSE-1');
  await patient('nurse2', 'Nino', `Conti${Tag}`, 'SIM-NURSE-1');
  await patient('oss', 'Olga', `Verdi${Tag}`, 'SIM-OSS-1');
  // Fixture (sandbox): a therapy due today at 08:00 for the nurse's resident.
  await prisma.$transaction((tx) =>
    createTherapyInTx(tx, ids.nurse, {
      farmacoNome: `Furosemide${Tag}`,
      dataInizio: today,
      commercialStrengthValue: 25,
      commercialStrengthUnit: 'mg',
      pharmaceuticalForm: 'compressa',
      viaSomministrazione: 'orale',
      tipo: 'periodica',
      schedules: [
        {
          time: '08:00',
          quantityNumerator: 1,
          quantityDenominator: 1,
          administrationUnit: 'compressa',
        },
      ],
      operatoreInseritore: 'Fixture',
    }),
  );
});

after(async () => {
  setSkillInvokeWrapper(null);
  const all = Object.values(ids);
  await prisma.consegna.deleteMany({ where: { pazienteId: { in: all } } });
  await prisma.patientDiaryEntry.deleteMany({ where: { patientId: { in: all } } });
  await prisma.patient.deleteMany({ where: { id: { in: all } } });
  await close();
});

test('A — OSS: only allowed skills and starters; forbidden actions not executable', async () => {
  const session = await call(base, oss, 'GET', `/skills/session?residentId=${ids.oss}`);
  assert.equal(session.status, 200, JSON.stringify(session.body));
  assert.equal(session.body.role.id, 'oss');
  assert.equal(session.body.role.label, 'OSS');
  assert.equal(session.body.resident.id, ids.oss);
  const starterSkills = session.body.starters.map((s: { skillId: string }) => s.skillId);
  const available = new Set(
    session.body.skills
      .filter((s: { available: boolean }) => s.available)
      .map((s: { id: string }) => s.id),
  );
  for (const id of starterSkills) assert.ok(available.has(id), `starter ${id} must be available`);
  assert.ok(starterSkills.includes('vitals.record'));
  for (const forbidden of [
    'therapy.prescribe',
    'administration.record',
    'therapy.due_administrations',
  ])
    assert.equal(available.has(forbidden), false, forbidden);
  const attempt = await say(oss, {
    message: 'prepara una prescrizione per questo ospite: Paracetamolo 1 g alle 8',
    ...ctx(ids.oss),
  });
  assert.equal(attempt.body.status, 'DENIED', JSON.stringify(attempt.body));
  assert.equal(attempt.body.error.code, 'capability_denied');
  const direct = await call(base, oss, 'POST', '/tools/diary.create_with_therapy/invoke', {
    input: { patientId: ids.oss, body: {} },
  });
  assert.equal(direct.status, 403, 'backend denies the tool directly too');
});

test('B — Doctor read: real read skill end to end with the resident context', async () => {
  const session = await call(base, doctor, 'GET', `/skills/session?residentId=${ids.doc}`);
  assert.equal(session.body.resident.label, `Neri${Tag} Dario`, 'label from server data');
  const read = await say(doctor, { message: 'Dimmi tutto su questo ospite', ...ctx(ids.doc) });
  assert.equal(read.body.status, 'COMPLETED', JSON.stringify(read.body));
  assert.equal(read.body.skillId, 'patient.overview');
  assert.equal(read.body.resident.id, ids.doc);
  assert.match(read.body.reply, /Stato ricovero/);
  assert.ok(
    await waitForAudit({
      requestId: `skill-${read.body.workflowId}`,
      actionType: 'tool:patients.clinical_summary',
    }),
  );
});

test('C — Doctor sensitive write: preview → no write → explicit confirmation → write → audit', async () => {
  const therapies = () => prisma.patientTherapy.count({ where: { patientId: ids.doc } });
  const before = await therapies();
  const draft = await say(doctor, {
    message: 'prescrivi Paracetamolo 1000 mg 1 compressa per os alle 8 e alle 20 per questo ospite',
    ...ctx(ids.doc),
  });
  assert.equal(draft.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(draft.body));
  const preview = draft.body.preview;
  assert.equal(preview.confirmationClass, 'HIGH_RISK');
  assert.equal(preview.confirmable, true, JSON.stringify(preview));
  assert.equal(preview.patient.id, ids.doc);
  assert.equal(preview.actor.role, 'doctor');
  assert.match(preview.values.Farmaco, /paracetamolo/i);
  assert.equal(preview.values.Orari, '08:00, 20:00');
  assert.equal(await therapies(), before, 'nothing written by the preview');

  // A typed «sì» is never a confirmation.
  const typed = await say(doctor, { workflowId: draft.body.workflowId, message: 'sì' });
  assert.equal(typed.body.status, 'NEEDS_CONFIRMATION');
  assert.equal(await therapies(), before);

  // A therapy different from the preview is refused (no write).
  const row = preview.therapyDraft.preview.row;
  const therapy = {
    farmacoNome: row.farmacoNome,
    dataInizio: row.dataInizio || today,
    tipo: 'periodica',
    stato: 'attiva',
    commercialStrengthValue: '1000',
    commercialStrengthUnit: 'mg',
    schedules: [
      {
        time: '08:00',
        quantityNumerator: 1,
        quantityDenominator: 1,
        administrationUnit: 'compressa',
      },
      {
        time: '20:00',
        quantityNumerator: 1,
        quantityDenominator: 1,
        administrationUnit: 'compressa',
      },
    ],
  };
  // Confirming the draft before the therapy payload is attached writes nothing.
  const unbound = await confirm(doctor, draft);
  assert.equal(unbound.body.error.code, 'payload_not_bound');
  // A payload for another drug does not match the draft.
  const tampered = await say(doctor, {
    workflowId: draft.body.workflowId,
    action: 'edit',
    payload: { therapy: { ...therapy, farmacoNome: 'Morfina' } },
    ...ctx(ids.doc),
  });
  assert.equal(tampered.body.error.code, 'preview_mismatch');
  assert.equal(await therapies(), before);
  // QA M1: an altered dose/route is allowed ONLY as a new preview that shows it.
  const altered = await say(doctor, {
    workflowId: draft.body.workflowId,
    action: 'edit',
    payload: {
      therapy: { ...therapy, commercialStrengthValue: '10000', viaSomministrazione: 'endovenosa' },
    },
    ...ctx(ids.doc),
  });
  assert.equal(altered.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(altered.body));
  assert.equal(altered.body.preview.therapyBound, true);
  assert.equal(altered.body.preview.values.Dosaggio, '10000 mg');
  assert.equal(altered.body.preview.values.Via, 'endovenosa');
  // QA: fields the preview would not show (prescriber, status, package, one-off dates) are refused.
  for (const hidden of [
    { prescrittore: 'Dr. Fantasma' },
    { stato: 'sospesa' },
    { drugPackageRef: 'AIC-000000000' },
    { dataSomministrazione: '2099-01-01' },
    { operatoreInseritore: 'Altro' },
  ]) {
    const refused = await say(doctor, {
      workflowId: draft.body.workflowId,
      action: 'edit',
      payload: { therapy: { ...therapy, ...hidden } },
      ...ctx(ids.doc),
    });
    assert.equal(refused.body.error.code, 'preview_mismatch', JSON.stringify(hidden));
  }
  // The payload the doctor finally wants: attach → new preview with the exact values → confirm.
  const bound = await say(doctor, {
    workflowId: draft.body.workflowId,
    action: 'edit',
    payload: { therapy },
    ...ctx(ids.doc),
  });
  assert.equal(bound.body.preview.therapyBound, true);
  assert.equal(bound.body.preview.values.Dosaggio, '1000 mg');
  assert.match(bound.body.preview.values.Orari, /08:00 \(1 compressa\), 20:00 \(1 compressa\)/);
  assert.equal(
    (await confirm(doctor, altered, ctx(ids.doc))).body.error.code,
    'preview_stale',
    'the altered preview can no longer be confirmed',
  );
  assert.equal(await therapies(), before);
  const done = await confirm(doctor, bound, ctx(ids.doc));
  assert.equal(done.body.status, 'COMPLETED', JSON.stringify(done.body));
  assert.equal(await therapies(), before + 1);
  const created = await prisma.patientTherapy.findUnique({
    where: { id: done.body.result.therapyId },
    include: { schedules: true },
  });
  assert.match(created!.farmacoNome, /paracetamolo/i);
  assert.equal(created!.schedules.length, 2);
  assert.equal(created!.operatoreInseritore, 'Medico 1', 'the professional who confirmed');
  const entry = await prisma.patientDiaryEntry.findUnique({
    where: { id: done.body.result.entryId },
  });
  assert.equal(entry?.therapyId, created!.id);

  const requestId = `skill-${draft.body.workflowId}`;
  const [proposal, confirmation, execution, tool] = await Promise.all([
    waitForAudit({ requestId, actionType: 'skill:therapy.prescribe:proposal' }),
    waitForAudit({ requestId, actionType: 'skill:therapy.prescribe:confirmation', outcome: 'ok' }),
    waitForAudit({ requestId, actionType: 'skill:therapy.prescribe:execute' }),
    waitForAudit({ requestId, actionType: 'tool:diary.create_with_therapy' }),
  ]);
  for (const event of [proposal, confirmation, execution, tool]) {
    assert.equal(event?.channel, 'ai_assistant', 'origin = AI_ASSISTANT');
    assert.equal(event?.operatorId, 'SIM-DOCTOR-1');
    assert.equal(event?.operatorRole, 'doctor');
    assert.equal(event?.patientId, ids.doc);
  }
  // The last proposal/confirmation are bound to the preview built from the exact payload.
  assert.ok(proposal!.fields.includes(`preview:${bound.body.preview.previewId}`));
  assert.ok(confirmation!.fields.includes(`preview:${bound.body.preview.previewId}`));
  assert.ok(confirmation!.fields.includes('ui_event'));
  assert.equal(execution!.outcome, 'ok');
  assert.equal(tool!.outcome, 'ok');
});

test('D — Cancel: cancelling the preview writes nothing', async () => {
  const note = `annullata ${runTag}`;
  const start = await say(doctor, {
    message: `crea una consegna per questo ospite: "${note}"`,
    ...ctx(ids.doc),
  });
  assert.equal(start.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(start.body));
  const cancelled = await say(doctor, {
    workflowId: start.body.workflowId,
    action: 'cancel',
    ...ctx(ids.doc),
  });
  assert.equal(cancelled.body.status, 'CANCELLED');
  const late = await confirm(doctor, start, ctx(ids.doc));
  assert.equal(late.body.status, 'CANCELLED');
  assert.equal(await prisma.consegna.count({ where: { note } }), 0);
});

test('E — Modify before confirm: payload change invalidates the previous confirmation', async () => {
  const readings = () => prisma.patientParameterReading.count({ where: { patientId: ids.nurse } });
  const before = await readings();
  const p1 = await say(nurse, {
    message: 'registra pressione 120/80 per questo ospite',
    ...ctx(ids.nurse),
  });
  assert.equal(p1.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(p1.body));
  const modify = await say(nurse, {
    workflowId: p1.body.workflowId,
    action: 'modify',
    ...ctx(ids.nurse),
  });
  assert.equal(modify.body.status, 'NEEDS_CLARIFICATION');
  assert.equal(modify.body.pending, 'edit');
  assert.deepEqual(modify.body.editable.values, { pa: '120/80' });
  const stale1 = await confirm(nurse, p1, ctx(ids.nurse));
  assert.notEqual(stale1.body.status, 'COMPLETED');
  const p2 = await say(nurse, {
    workflowId: p1.body.workflowId,
    action: 'edit',
    edit: { values: { pa: '130/85' } },
    ...ctx(ids.nurse),
  });
  assert.equal(p2.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(p2.body));
  assert.notEqual(p2.body.preview.previewId, p1.body.preview.previewId);
  assert.equal(p2.body.preview.values.Pressione, '130/85');
  const stale = await confirm(nurse, p1, ctx(ids.nurse));
  assert.equal(stale.body.error.code, 'preview_stale', JSON.stringify(stale.body));
  assert.equal(await readings(), before, 'old confirmation wrote nothing');
  const ok = await confirm(nurse, p2, ctx(ids.nurse));
  assert.equal(ok.body.status, 'COMPLETED', JSON.stringify(ok.body));
  const row = await prisma.patientParameterReading.findUnique({
    where: { id: ok.body.result.readingId },
  });
  assert.deepEqual(row?.values, { pa: '130/85' });
  assert.equal(await readings(), before + 1);

  // Handover: urgency is only suggested; raising the priority is an explicit edit → new preview.
  const note = `caduto dal letto, urgente ${runTag}`;
  const h1 = await say(doctor, {
    message: `crea una consegna per questo ospite: "${note}"`,
    ...ctx(ids.doc),
  });
  assert.equal(h1.body.preview.values['Priorità'], 'normale');
  assert.equal(h1.body.preview.values.Tipo, 'Assistente AI');
  assert.match(h1.body.preview.warnings.join(' '), /sembra urgente/);
  const h2 = await say(doctor, {
    workflowId: h1.body.workflowId,
    action: 'edit',
    edit: { priority: 'alta' },
    ...ctx(ids.doc),
  });
  assert.equal(h2.body.preview.values['Priorità'], 'alta');
  assert.equal((await confirm(doctor, h1, ctx(ids.doc))).body.error.code, 'preview_stale');
  const saved = await confirm(doctor, h2, ctx(ids.doc));
  assert.equal(saved.body.status, 'COMPLETED', JSON.stringify(saved.body));
  const consegna = await prisma.consegna.findFirst({ where: { note } });
  assert.equal(consegna?.priorita, 'alta');
  assert.equal(consegna?.tipo, 'Assistente AI');
});

test('QA H1 — resident named in the text (no page resident): multi-turn and confirm complete', async () => {
  const readings = () => prisma.patientParameterReading.count({ where: { patientId: ids.nurse2 } });
  const before = await readings();
  const t1 = await say(nurse, {
    message: `registra i parametri per Nino Conti${Tag}`,
    ...ctx(null),
  });
  assert.equal(t1.body.status, 'NEEDS_CLARIFICATION', JSON.stringify(t1.body));
  assert.equal(t1.body.resident.id, ids.nurse2);
  const t2 = await say(nurse, { workflowId: t1.body.workflowId, message: 'fc 76', ...ctx(null) });
  assert.equal(t2.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(t2.body));
  const done = await confirm(nurse, t2, ctx(null));
  assert.equal(done.body.status, 'COMPLETED', JSON.stringify(done.body));
  assert.equal(await readings(), before + 1);
  // Opening the SAME resident's page mid-workflow is not a change of resident.
  const s1 = await say(nurse, {
    message: `registra fc 80 per Nino Conti${Tag}`,
    ...ctx(ids.nurse),
  });
  assert.equal(s1.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(s1.body));
  const same = await confirm(nurse, s1, ctx(ids.nurse2));
  assert.equal(same.body.status, 'COMPLETED', JSON.stringify(same.body));
});

test('F — Unauthorized resident: out-of-scope resident → backend denial everywhere', async () => {
  const session = await call(base, nurse, 'GET', `/skills/session?residentId=${ids.oss}`);
  assert.equal(session.body.resident, null);
  assert.equal(session.body.residentDenied, true);
  const select = await call(base, nurse, 'POST', '/skills/context', { residentId: ids.oss });
  assert.equal(select.status, 403);
  assert.equal(select.body.code, 'resident_out_of_scope');
  const read = await say(nurse, {
    message: 'Mostrami i parametri recenti di questo ospite',
    ...ctx(ids.oss),
  });
  assert.equal(read.body.status, 'DENIED', JSON.stringify(read.body));
  assert.equal(read.body.error.code, 'resident_out_of_scope');
  const write = await say(nurse, {
    message: 'registra pressione 120/80 per questo ospite',
    ...ctx(ids.oss),
  });
  assert.equal(write.body.error.code, 'resident_out_of_scope');
  assert.ok(
    await waitForAudit({
      requestId: `skill-${write.body.workflowId}`,
      actionType: 'skill:vitals.record:denied',
    }),
  );
  const tool = await call(base, nurse, 'POST', '/tools/parameters.list_readings/invoke', {
    input: { patientId: ids.oss },
  });
  assert.equal(tool.status, 404, 'Tool Layer scope check (same service)');
  const picker = await call(base, nurse, 'GET', `/skills/residents?q=Verdi${Tag}`);
  assert.deepEqual(picker.body.residents, [], 'the picker never offers out-of-scope residents');
  assert.equal(await prisma.patientParameterReading.count({ where: { patientId: ids.oss } }), 0);
});

test('G — Change resident during a sensitive workflow → invalidated, no write', async () => {
  const readings = () => prisma.patientParameterReading.count({ where: { patientId: ids.nurse } });
  const before = await readings();
  const start = await say(nurse, {
    message: 'registra pressione 118/72 per questo ospite',
    ...ctx(ids.nurse),
  });
  assert.equal(start.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(start.body));
  const switched = await confirm(nurse, start, ctx(ids.nurse2));
  assert.equal(switched.body.status, 'CANCELLED', JSON.stringify(switched.body));
  assert.equal(switched.body.error.code, 'resident_changed');
  assert.equal(await readings(), before);
  const closed = await say(nurse, {
    message: 'registra fc 70 per questo ospite',
    ...ctx(ids.nurse),
  });
  const cleared = await say(nurse, {
    workflowId: closed.body.workflowId,
    action: 'confirm',
    previewId: closed.body.preview.previewId,
    ...ctx(null),
  });
  assert.equal(
    cleared.body.error.code,
    'resident_changed',
    'closing the resident context also invalidates',
  );
});

test('H — Dynamic revocation by the Administrator → next action denied without restart', async () => {
  const start = await say(supervisor, {
    message: 'registra pressione 125/80 per questo ospite',
    ...ctx(ids.nurse),
  });
  assert.equal(start.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(start.body));
  await setGrant(
    'supervisor',
    'parameters.create_reading',
    'DENIED',
    'revoca parametri supervisore',
  );
  try {
    const session = await call(base, supervisor, 'GET', `/skills/session?residentId=${ids.nurse}`);
    assert.ok(
      !session.body.starters.some((s: { skillId: string }) => s.skillId === 'vitals.record'),
      'the starter disappears',
    );
    const denied = await confirm(supervisor, start, ctx(ids.nurse));
    assert.equal(denied.body.status, 'DENIED', JSON.stringify(denied.body));
    assert.equal(denied.body.error.code, 'capability_revoked');
  } finally {
    await setGrant(
      'supervisor',
      'parameters.create_reading',
      'ALLOWED',
      'ripristino parametri supervisore',
    );
  }
});

test('I — Backend error: no false success; administration prepared, then confirmed', async () => {
  const records = () =>
    prisma.medicationAdministration.count({ where: { patientId: ids.nurse, stato: 'erogata' } });
  const before = await records();
  const draft = await say(nurse, {
    message: 'Registra una somministrazione per questo ospite',
    ...ctx(ids.nurse),
  });
  assert.equal(draft.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(draft.body));
  assert.equal(draft.body.preview.confirmationClass, 'HIGH_RISK');
  assert.match(draft.body.preview.values.Farmaco, new RegExp(`Furosemide${Tag}`, 'i'));
  setSkillInvokeWrapper(
    (invoke) => async (tool, input, options) =>
      tool === 'administration.confirm'
        ? {
            ok: false,
            tool,
            requestId: 'x',
            error: {
              code: 'upstream_error',
              status: 502,
              message: 'Servizio somministrazioni non disponibile',
            },
          }
        : invoke(tool, input, options),
  );
  try {
    const failed = await confirm(nurse, draft, ctx(ids.nurse));
    assert.equal(failed.body.status, 'FAILED');
    assert.match(failed.body.reply, /NON eseguita/);
    assert.doesNotMatch(failed.body.reply, /registrata/);
    assert.equal(await records(), before);
  } finally {
    setSkillInvokeWrapper(null);
  }
  const retry = await say(nurse, {
    workflowId: draft.body.workflowId,
    action: 'retry',
    ...ctx(ids.nurse),
  });
  assert.equal(retry.body.status, 'COMPLETED', JSON.stringify(retry.body));
  assert.equal(await records(), before + 1);
  const again = await say(nurse, {
    message: 'Registra una somministrazione per questo ospite',
    ...ctx(ids.nurse),
  });
  assert.equal(again.body.status, 'COMPLETED');
  assert.equal(again.body.result.recorded, false, 'nothing pending anymore: no write');
});

test('J — Classic GUI regression: routes and Administrator minimisation', async () => {
  const page = await call(base, nurse, 'GET', '/patients/page?limit=5');
  assert.equal(page.status, 200);
  const reading = await call(base, nurse, 'POST', `/patients/${ids.nurse2}/parameter-readings`, {
    requestId: crypto.randomUUID(),
    measuredAt: new Date().toISOString(),
    values: { fc: '72' },
  });
  assert.equal(reading.status, 201, JSON.stringify(reading.body));
  const overview = await call(base, admin, 'GET', '/patients/clinical-summary/overview');
  assert.equal(overview.status, 200, 'aggregate overview kept for the admin dashboard');
  const perResident = await call(
    base,
    admin,
    'GET',
    `/patients/clinical-summary?patientIds=${ids.doc}`,
  );
  assert.equal(
    perResident.status,
    403,
    'no implicit per-resident clinical content for Administrator',
  );
  const adminSkills = await call(base, admin, 'GET', '/skills/session');
  const adminAvailable = adminSkills.body.skills
    .filter((s: { available: boolean }) => s.available)
    .map((s: { id: string }) => s.id);
  for (const clinical of ['patient.overview', 'vitals.record', 'therapy.due_administrations'])
    assert.ok(!adminAvailable.includes(clinical), clinical);
  const supervisorSkills = await call(base, supervisor, 'GET', '/skills/session');
  assert.equal(supervisorSkills.body.role.label, 'Supervisore');
  assert.ok(supervisorSkills.body.starters.length > 0);
});
