// UX direct-access (owner 2026-10-03): per-reader «Presa visione» on URGENT diary entries.
// Real app over HTTP (Role Simulator sessions → requireOperator → capability gate → route) and
// real Postgres. Every check reads the HTTP answer AND verifies the DB independently.

process.env.SKILLS_INTERPRETER = 'deterministic';
process.env.PROACTIVE_BRIEFING_COOLDOWN_S = '0';

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
} from '../../authz/__tests__/harness-support.js';
import { facilityToday } from '../parameter-reading-input.js';

// #389: the default resident scope is facility-wide. This suite exercises the scope-enforcement
// plumbing (out-of-scope residents denied), so it pins the restricted, still-supported mode.
process.env.RESIDENT_SCOPE_CONFIG ??= JSON.stringify({ fallback: 'registered_by_me' });

let base = '';
let close: () => Promise<void>;
let supervisor: Session;
let doctor: Session;
let nurse: Session;
let oss: Session;
const patients: string[] = [];
let mine = ''; // registered by the nurse: in scope for nurse + supervisor (facility-wide)
let foreign = ''; // registered by the doctor: out of the nurse's scope
let urgent = '';
let normal = '';
let foreignUrgent = '';
let ossUrgent = '';
const today = facilityToday();

async function entry(patientId: string, priority: string, title: string) {
  const row = await prisma.patientDiaryEntry.create({
    data: {
      patientId,
      authorType: 'medico',
      authorName: 'Fixture',
      title: `${title} ${runTag}`,
      content: 'Contenuto clinico di prova',
      priority,
      entryDateTime: `${today}T09:00`,
    },
  });
  return row.id;
}

const diaryOf = async (s: Session, patientId: string) => {
  const r = await call(base, s, 'GET', `/patients/${patientId}/diary?limit=50`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.entries as any[];
};

before(async () => {
  ({ base, close } = await startApp());
  [supervisor, doctor, nurse, oss] = await Promise.all(
    ['SIM-SUPERVISOR-1', 'SIM-DOCTOR-1', 'SIM-NURSE-1', 'SIM-OSS-1'].map((id) => login(base, id)),
  );
  mine = (await createPatientOwnedBy('SIM-NURSE-1', 'ack-mine')).id;
  foreign = (await createPatientOwnedBy('SIM-DOCTOR-1', 'ack-foreign')).id;
  const ossPatient = (await createPatientOwnedBy('SIM-OSS-1', 'ack-oss')).id;
  patients.push(mine, foreign, ossPatient);
  urgent = await entry(mine, 'urgente', 'Urgente');
  normal = await entry(mine, 'normale', 'Normale');
  foreignUrgent = await entry(foreign, 'urgente', 'Urgente altrui');
  ossUrgent = await entry(ossPatient, 'urgente', 'Urgente OSS');
});

after(async () => {
  // Deleting the entries cascades to their acknowledgements (the only DELETE the trigger allows).
  await prisma.patientDiaryEntry.deleteMany({ where: { patientId: { in: patients } } });
  await prisma.patient.deleteMany({ where: { id: { in: patients } } });
  await close();
});

test('GET diary: an urgent entry is acknowledgeable and not yet seen by anyone', async () => {
  const entries = await diaryOf(nurse, mine);
  const u = entries.find((e) => e.id === urgent);
  const n = entries.find((e) => e.id === normal);
  assert.equal(u.acknowledgeable, true);
  assert.equal(u.acknowledgedByMe, false);
  assert.deepEqual(u.acknowledgements, []);
  assert.equal(n.acknowledgeable, false);
  assert.equal(n.acknowledgedByMe, false);
});

test('nurse acknowledges: 201, persisted with server-side name/role, audited', async () => {
  const before = await prisma.patientDiaryEntry.findUniqueOrThrow({ where: { id: urgent } });
  const r = await call(base, nurse, 'POST', `/patients/${mine}/diary/${urgent}/ack`, {
    operatorName: 'Spoofed', // ignored: author is server-authoritative
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.created, true);
  assert.equal(r.body.acknowledgedByMe, true);
  assert.equal(r.body.acknowledgements.length, 1);
  assert.equal(r.body.acknowledgements[0].operatorName, 'Infermiere 1');
  assert.equal(r.body.acknowledgements[0].byMe, true);

  const rows = await prisma.diaryEntryAcknowledgement.findMany({ where: { entryId: urgent } });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].operatorId, 'SIM-NURSE-1');
  assert.equal(rows[0].operatorName, 'Infermiere 1');
  assert.equal(rows[0].operatorRole, 'infermiere');
  assert.equal(rows[0].patientId, mine);

  // History unchanged: the entry itself is never modified by an acknowledgement.
  const afterRow = await prisma.patientDiaryEntry.findUniqueOrThrow({ where: { id: urgent } });
  assert.deepEqual(afterRow, before);

  const audit = await waitForAudit({
    operatorId: 'SIM-NURSE-1',
    actionType: 'diary:ack',
    patientId: mine,
    fields: { has: `entry:${urgent}` },
  });
  assert.ok(audit, 'diary:ack audit row');
  assert.equal(audit!.kind, 'create');
  assert.equal(audit!.outcome, 'ok');
  assert.ok(audit!.fields.includes('ack:new'));
  // PHI-safe audit: ids only, never the entry text.
  assert.ok(audit!.fields.every((f) => !f.includes('Contenuto')));
});

test('idempotent per reader: a second ack is 200, keeps the first time, adds no row', async () => {
  const first = await prisma.diaryEntryAcknowledgement.findFirstOrThrow({
    where: { entryId: urgent, operatorId: 'SIM-NURSE-1' },
  });
  const [a, b] = await Promise.all([
    call(base, nurse, 'POST', `/patients/${mine}/diary/${urgent}/ack`),
    call(base, nurse, 'POST', `/patients/${mine}/diary/${urgent}/ack`),
  ]);
  for (const r of [a, b]) {
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.created, false);
    assert.equal(r.body.acknowledgement.acknowledgedAt, first.acknowledgedAt.toISOString());
  }
  assert.equal(await prisma.diaryEntryAcknowledgement.count({ where: { entryId: urgent } }), 1);
});

test('independent per reader: still «da vedere» for the supervisor, then both listed', async () => {
  let entries = await diaryOf(supervisor, mine);
  let u = entries.find((e) => e.id === urgent);
  assert.equal(u.acknowledgedByMe, false, 'nurse ack must not count for the supervisor');
  assert.equal(u.acknowledgements.length, 1);
  assert.equal(u.acknowledgements[0].operatorName, 'Infermiere 1');
  assert.equal(u.acknowledgements[0].byMe, false);
  assert.equal('operatorId' in u.acknowledgements[0], false, 'other readers ids not disclosed');

  const r = await call(base, supervisor, 'POST', `/patients/${mine}/diary/${urgent}/ack`);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  entries = await diaryOf(supervisor, mine);
  u = entries.find((e) => e.id === urgent);
  assert.equal(u.acknowledgedByMe, true);
  assert.deepEqual(
    u.acknowledgements.map((a: any) => a.operatorName),
    ['Infermiere 1', 'Supervisore 1'],
  );
  // The nurse view: still acknowledged by her, now also sees the supervisor.
  const nurseView = (await diaryOf(nurse, mine)).find((e) => e.id === urgent);
  assert.equal(nurseView.acknowledgedByMe, true);
  assert.equal(nurseView.acknowledgements.length, 2);
  // History unchanged: the entry is still in the feed with its own status.
  assert.equal(nurseView.status, 'aperta');
});

test('only urgent entries: a normal entry is refused with 409 and nothing is written', async () => {
  const r = await call(base, nurse, 'POST', `/patients/${mine}/diary/${normal}/ack`);
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.code, 'not_acknowledgeable');
  assert.equal(await prisma.diaryEntryAcknowledgement.count({ where: { entryId: normal } }), 0);
});

test('resident scope: out-of-scope patient or mismatched entry → 404, nothing written', async () => {
  const outOfScope = await call(
    base,
    nurse,
    'POST',
    `/patients/${foreign}/diary/${foreignUrgent}/ack`,
  );
  assert.equal(outOfScope.status, 404, JSON.stringify(outOfScope.body));
  // Entry of another patient addressed through an in-scope patient id.
  const crossed = await call(base, nurse, 'POST', `/patients/${mine}/diary/${foreignUrgent}/ack`);
  assert.equal(crossed.status, 404, JSON.stringify(crossed.body));
  assert.equal(
    await prisma.diaryEntryAcknowledgement.count({ where: { entryId: foreignUrgent } }),
    0,
  );
  // The doctor (owner) can acknowledge it.
  const own = await call(base, doctor, 'POST', `/patients/${foreign}/diary/${foreignUrgent}/ack`);
  assert.equal(own.status, 201, JSON.stringify(own.body));
});

test('OSS (diary.list) can acknowledge; the route is catalogued (no capability_unmapped)', async () => {
  const r = await call(base, oss, 'POST', `/patients/${patients[2]}/diary/${ossUrgent}/ack`);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.acknowledgements[0].operatorRole, 'oss');
  const anonymous = await call(base, null, 'POST', `/patients/${mine}/diary/${urgent}/ack`);
  assert.ok([401, 403].includes(anonymous.status), String(anonymous.status));
});

test('append-only at the DB level: UPDATE and direct DELETE are refused', async () => {
  await assert.rejects(
    prisma.$executeRawUnsafe(
      `UPDATE "DiaryEntryAcknowledgement" SET "operatorName" = 'x' WHERE "entryId" = $1`,
      urgent,
    ),
    /append-only/,
  );
  await assert.rejects(
    prisma.$executeRawUnsafe(
      `DELETE FROM "DiaryEntryAcknowledgement" WHERE "entryId" = $1`,
      urgent,
    ),
    /append-only/,
  );
  assert.equal(await prisma.diaryEntryAcknowledgement.count({ where: { entryId: urgent } }), 2);
});

test('proactive: acknowledging every entry of the day in the diary satisfies the signal', async () => {
  const signalOf = async () => {
    const r = await call(base, nurse, 'GET', '/skills/proactive/inbox');
    assert.equal(r.status, 200, JSON.stringify(r.body));
    return (r.body.signals as any[]).find(
      (s) => s.eventType === 'diary.entry_created' && s.residentId === mine,
    );
  };
  const s1 = await signalOf();
  assert.ok(s1, 'diary signal for the nurse resident');
  // The day group still contains the normal (never acknowledgeable) entry → still to see.
  assert.notEqual(s1.status, 'preso_visione');
  await prisma.patientDiaryEntry.delete({ where: { id: normal } });
  const s2 = await signalOf();
  assert.equal(s2.status, 'preso_visione', 'same fact acknowledged in the diary');
});

test('deleting the entry cascades its acknowledgements (trigger allows only the cascade)', async () => {
  const doomed = await entry(mine, 'urgente', 'Da eliminare');
  const r = await call(base, nurse, 'POST', `/patients/${mine}/diary/${doomed}/ack`);
  assert.equal(r.status, 201);
  await prisma.patientDiaryEntry.delete({ where: { id: doomed } });
  assert.equal(await prisma.diaryEntryAcknowledgement.count({ where: { entryId: doomed } }), 0);
});

test('clinical summary names allergens, critical parameters and high risks', async () => {
  await prisma.cartella.create({
    data: {
      patientId: mine,
      data: {
        allergie: [
          { allergene: 'Penicillina', reazione: 'orticaria', gravita: 'grave' },
          { allergene: 'Lattice', reazione: '', gravita: 'lieve' },
          { gravita: 'moderata' },
        ],
        parametriVitali: [
          { etichetta: 'PA', valore: '85/50', unita: 'mmHg', stato: 'critico' },
          { etichetta: 'FC', valore: '80', unita: 'bpm', stato: 'normale' },
        ],
        indicatoriRischio: [
          { id: 'r1', tipo: 'caduta', livello: 'alto', descrizione: 'Morse 55' },
          { id: 'r2', tipo: 'nutrizione', livello: 'basso', descrizione: '' },
        ],
      },
    },
  });
  try {
    const r = await call(base, nurse, 'GET', `/patients/clinical-summary?patientIds=${mine}`);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const [s] = r.body;
    assert.equal(s.allergieCount, 3);
    assert.deepEqual(s.allergeni, [
      { allergene: 'Penicillina', gravita: 'grave' },
      { allergene: 'Lattice', gravita: 'lieve' },
    ]);
    assert.deepEqual(s.parametriCritici, [{ etichetta: 'PA', valore: '85/50', unita: 'mmHg' }]);
    assert.deepEqual(s.rischiElevati, [
      { tipo: 'caduta', livello: 'alto', descrizione: 'Morse 55' },
    ]);
    // Scope: an out-of-scope id is dropped (no names leak).
    const foreignRead = await call(
      base,
      nurse,
      'GET',
      `/patients/clinical-summary?patientIds=${foreign}`,
    );
    assert.deepEqual(foreignRead.body, []);
  } finally {
    await prisma.cartella.deleteMany({ where: { patientId: mine } });
  }
});
