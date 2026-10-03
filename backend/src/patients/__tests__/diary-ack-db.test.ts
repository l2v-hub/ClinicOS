// UX2 W8 (owner 2026-10-03): «Ho capito» on URGENT diary entries. The first operator other than
// the author ends the urgency for everyone; the row stays as the trace; the author cannot take
// charge of their own urgency. Real app over HTTP (Role Simulator sessions → requireOperator →
// capability gate → route) and real Postgres. Every check reads the HTTP answer AND the DB.

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
let signalPatient = ''; // registered by the nurse: only one urgent entry (proactive test)
let urgent = ''; // written by the nurse over HTTP (authorId = SIM-NURSE-1)
let normal = '';
let legacyNamed = ''; // legacy row (no authorId) whose authorName is the nurse's
let legacyOther = ''; // legacy row (no authorId) by someone else
let legacyClosed = ''; // legacy urgent row already «completata» under the old model
let foreignUrgent = '';
let ossUrgent = '';
const today = facilityToday();

async function fixture(
  patientId: string,
  priority: string,
  title: string,
  extra: { authorName?: string; status?: string } = {},
) {
  const row = await prisma.patientDiaryEntry.create({
    data: {
      patientId,
      authorType: 'medico',
      authorName: extra.authorName ?? 'Fixture',
      title: `${title} ${runTag}`,
      content: 'Contenuto clinico di prova',
      priority,
      status: extra.status ?? 'aperta',
      entryDateTime: `${today}T09:00`,
    },
  });
  return row.id;
}

async function writeUrgent(s: Session, patientId: string, title: string) {
  const r = await call(base, s, 'POST', `/patients/${patientId}/diary`, {
    title: `${title} ${runTag}`,
    content: 'Paziente agitato, chiamare il medico',
    priority: 'urgente',
    entryDateTime: `${today}T10:00`,
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return (r.body.entry ?? r.body).id as string;
}

const diaryOf = async (s: Session, patientId: string) => {
  const r = await call(base, s, 'GET', `/patients/${patientId}/diary?limit=50`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.entries as any[];
};
const entryOf = async (s: Session, patientId: string, id: string) =>
  (await diaryOf(s, patientId)).find((e) => e.id === id);

before(async () => {
  ({ base, close } = await startApp());
  [supervisor, doctor, nurse, oss] = await Promise.all(
    ['SIM-SUPERVISOR-1', 'SIM-DOCTOR-1', 'SIM-NURSE-1', 'SIM-OSS-1'].map((id) => login(base, id)),
  );
  mine = (await createPatientOwnedBy('SIM-NURSE-1', 'ack-mine')).id;
  foreign = (await createPatientOwnedBy('SIM-DOCTOR-1', 'ack-foreign')).id;
  signalPatient = (await createPatientOwnedBy('SIM-NURSE-1', 'ack-signal')).id;
  const ossPatient = (await createPatientOwnedBy('SIM-OSS-1', 'ack-oss')).id;
  patients.push(mine, foreign, signalPatient, ossPatient);
  urgent = await writeUrgent(nurse, mine, 'Urgente');
  normal = await fixture(mine, 'normale', 'Normale');
  legacyNamed = await fixture(mine, 'urgente', 'Legacy mia', { authorName: 'Infermiere 1' });
  legacyOther = await fixture(mine, 'urgente', 'Legacy altrui');
  legacyClosed = await fixture(mine, 'urgente', 'Legacy chiusa', { status: 'completata' });
  foreignUrgent = await fixture(foreign, 'urgente', 'Urgente altrui');
  ossUrgent = await fixture(ossPatient, 'urgente', 'Urgente OSS');
});

after(async () => {
  // Deleting the entries cascades to their acknowledgements (the only DELETE the trigger allows).
  await prisma.patientDiaryEntry.deleteMany({ where: { patientId: { in: patients } } });
  await prisma.patient.deleteMany({ where: { id: { in: patients } } });
  await close();
});

test('a new urgent entry records its author id and is an ACTIVE urgency for everyone', async () => {
  const row = await prisma.patientDiaryEntry.findUniqueOrThrow({ where: { id: urgent } });
  assert.equal(row.authorId, 'SIM-NURSE-1');
  const forAuthor = await entryOf(nurse, mine, urgent);
  assert.deepEqual(forAuthor.urgency, {
    state: 'active',
    takenBy: null,
    isAuthor: true,
    canAcknowledge: false,
  });
  assert.equal('authorId' in forAuthor, false, 'operator ids are not disclosed in the feed');
  const forSupervisor = await entryOf(supervisor, mine, urgent);
  assert.equal(forSupervisor.urgency.state, 'active');
  assert.equal(forSupervisor.urgency.canAcknowledge, true);
  const n = await entryOf(nurse, mine, normal);
  assert.equal(n.urgency.state, 'none');
  assert.equal(n.urgency.canAcknowledge, false);
  // No per-reader «Visto da» list any more.
  assert.equal('acknowledgements' in forSupervisor, false);
});

test('the author cannot take charge of their own urgency: 409, nothing written', async () => {
  const r = await call(base, nurse, 'POST', `/patients/${mine}/diary/${urgent}/ack`);
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.code, 'author_cannot_acknowledge');
  assert.match(r.body.error, /un altro operatore/);
  // Legacy row without authorId: the author is recognised by name.
  const legacy = await call(base, nurse, 'POST', `/patients/${mine}/diary/${legacyNamed}/ack`);
  assert.equal(legacy.status, 409, JSON.stringify(legacy.body));
  assert.equal(legacy.body.code, 'author_cannot_acknowledge');
  assert.equal(
    await prisma.diaryEntryAcknowledgement.count({
      where: { entryId: { in: [urgent, legacyNamed] } },
    }),
    0,
  );
});

test('first non-author «Ho capito» ends the urgency for EVERYONE and keeps the trace', async () => {
  const before = await prisma.patientDiaryEntry.findUniqueOrThrow({ where: { id: urgent } });
  const r = await call(base, supervisor, 'POST', `/patients/${mine}/diary/${urgent}/ack`, {
    operatorName: 'Spoofed', // ignored: identity is server-authoritative
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.created, true);
  assert.equal(r.body.urgency.state, 'taken');
  assert.equal(r.body.urgency.takenBy.operatorName, 'Supervisore 1');
  assert.equal(r.body.urgency.takenBy.byMe, true);
  assert.equal(r.body.urgency.canAcknowledge, false);

  const rows = await prisma.diaryEntryAcknowledgement.findMany({ where: { entryId: urgent } });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].operatorId, 'SIM-SUPERVISOR-1');
  assert.equal(rows[0].operatorName, 'Supervisore 1');
  assert.equal(rows[0].patientId, mine);
  // History unchanged: the entry itself is never modified.
  assert.deepEqual(
    await prisma.patientDiaryEntry.findUniqueOrThrow({ where: { id: urgent } }),
    before,
  );

  // The author (and any other reader) now sees «presa in carico da Supervisore 1», no button.
  const forAuthor = await entryOf(nurse, mine, urgent);
  assert.equal(forAuthor.urgency.state, 'taken');
  assert.equal(forAuthor.urgency.canAcknowledge, false);
  assert.equal(forAuthor.urgency.takenBy.operatorName, 'Supervisore 1');
  assert.equal(forAuthor.urgency.takenBy.byMe, false);
  assert.equal(forAuthor.urgency.takenBy.acknowledgedAt, rows[0].acknowledgedAt.toISOString());
  assert.equal('operatorId' in forAuthor.urgency.takenBy, false);

  const audit = await waitForAudit({
    operatorId: 'SIM-SUPERVISOR-1',
    actionType: 'diary:ack',
    patientId: mine,
    fields: { has: `entry:${urgent}` },
  });
  assert.ok(audit, 'diary:ack audit row');
  assert.equal(audit!.kind, 'create');
  assert.ok(audit!.fields.includes('ack:new'));
  assert.ok(audit!.fields.every((f) => !f.includes('agitato') && !f.includes('Contenuto')));
});

test('after it is taken no further ack is needed: idempotent 200, no row added', async () => {
  const [a, b] = await Promise.all([
    call(base, supervisor, 'POST', `/patients/${mine}/diary/${urgent}/ack`),
    call(base, supervisor, 'POST', `/patients/${mine}/diary/${urgent}/ack`),
  ]);
  for (const r of [a, b]) {
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.created, false);
    assert.equal(r.body.urgency.takenBy.operatorName, 'Supervisore 1');
  }
  // A second reader after the urgency was taken: same taker, nothing written.
  const first = await call(base, supervisor, 'POST', `/patients/${mine}/diary/${legacyOther}/ack`);
  assert.equal(first.status, 201, JSON.stringify(first.body));
  const late = await call(base, nurse, 'POST', `/patients/${mine}/diary/${legacyOther}/ack`);
  assert.equal(late.status, 200, JSON.stringify(late.body));
  assert.equal(late.body.created, false);
  assert.equal(late.body.urgency.takenBy.operatorName, 'Supervisore 1');
  assert.equal(await prisma.diaryEntryAcknowledgement.count({ where: { entryId: urgent } }), 1);
  assert.equal(
    await prisma.diaryEntryAcknowledgement.count({ where: { entryId: legacyOther } }),
    1,
  );
});

test('legacy: an urgent entry already «completata» is closed (no trace, no button, no write)', async () => {
  const e = await entryOf(supervisor, mine, legacyClosed);
  assert.deepEqual(e.urgency, {
    state: 'taken',
    takenBy: null,
    isAuthor: false,
    canAcknowledge: false,
  });
  const r = await call(base, supervisor, 'POST', `/patients/${mine}/diary/${legacyClosed}/ack`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.created, false);
  assert.equal(
    await prisma.diaryEntryAcknowledgement.count({ where: { entryId: legacyClosed } }),
    0,
  );
  const row = await prisma.patientDiaryEntry.findUniqueOrThrow({ where: { id: legacyClosed } });
  assert.equal(row.status, 'completata', 'stored status untouched');
});

test('only urgent entries: a normal entry is refused with 409 and nothing is written', async () => {
  const r = await call(base, supervisor, 'POST', `/patients/${mine}/diary/${normal}/ack`);
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
  const crossed = await call(base, nurse, 'POST', `/patients/${mine}/diary/${foreignUrgent}/ack`);
  assert.equal(crossed.status, 404, JSON.stringify(crossed.body));
  assert.equal(
    await prisma.diaryEntryAcknowledgement.count({ where: { entryId: foreignUrgent } }),
    0,
  );
  const own = await call(base, doctor, 'POST', `/patients/${foreign}/diary/${foreignUrgent}/ack`);
  assert.equal(own.status, 201, JSON.stringify(own.body));
  assert.equal(own.body.urgency.takenBy.operatorName, 'Medico 1');
});

test('OSS (diary.list) can take charge; the route is catalogued (no capability_unmapped)', async () => {
  const r = await call(base, oss, 'POST', `/patients/${patients[3]}/diary/${ossUrgent}/ack`);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.urgency.takenBy.operatorRole, 'oss');
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
  assert.equal(await prisma.diaryEntryAcknowledgement.count({ where: { entryId: urgent } }), 1);
});

test('proactive: urgent until taken, then normal and settled for every reader', async () => {
  const entry = await writeUrgent(nurse, signalPatient, 'Segnale');
  const signalOf = async (s: Session) => {
    const r = await call(base, s, 'GET', '/skills/proactive/inbox');
    assert.equal(r.status, 200, JSON.stringify(r.body));
    return (r.body.signals as any[]).find(
      (x) => x.eventType === 'diary.entry_created' && x.residentId === signalPatient,
    );
  };
  const s1 = await signalOf(supervisor);
  assert.ok(s1, 'diary signal for the supervisor');
  assert.equal(s1.priority, 'urgente');
  assert.notEqual(s1.status, 'preso_visione');

  const ack = await call(base, supervisor, 'POST', `/patients/${signalPatient}/diary/${entry}/ack`);
  assert.equal(ack.status, 201, JSON.stringify(ack.body));

  const s2 = await signalOf(supervisor);
  assert.equal(s2.priority, 'normale', 'no longer flagged as urgent');
  assert.equal(s2.status, 'preso_visione');
  // Same fact for the author: the urgency was received.
  const s3 = await signalOf(nurse);
  assert.equal(s3.priority, 'normale');
  assert.equal(s3.status, 'preso_visione');
});

test('deleting the entry cascades its acknowledgements (trigger allows only the cascade)', async () => {
  const doomed = await fixture(mine, 'urgente', 'Da eliminare');
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
