// UX2 W8 (owner 2026-10-03): consegne become normal / urgent notes. An urgent handover stays an
// ACTIVE urgency until the first «Ho capito» by an operator other than the author; then it is
// «urgenza presa in carico» for everyone (trace kept) and is no longer counted anywhere: feed and
// overview summaries, patient summary, clinical summary, proactive signal, assistant queue.
// Real app over HTTP (Role Simulator sessions) + real Postgres; every check also reads the DB.

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

// Pin the restricted, still-supported resident scope so the scope check is exercised (#389).
process.env.RESIDENT_SCOPE_CONFIG ??= JSON.stringify({ fallback: 'registered_by_me' });

let base = '';
let close: () => Promise<void>;
let supervisor: Session;
let doctor: Session;
let nurse: Session;
const patients: string[] = [];
let mine = ''; // registered by the nurse (supervisor reaches it: facility-wide)
let urgentId = '';
let normalId = '';
let legacyId = '';

async function createConsegna(s: Session, body: Record<string, unknown>) {
  const r = await call(base, s, 'POST', '/consegne', {
    pazienteId: mine,
    tipo: 'Monitoraggio',
    note: `Nota ${runTag}`,
    ...body,
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body;
}

const feed = async (s: Session, query = '') => {
  const r = await call(base, s, 'GET', `/consegne?patientId=${mine}${query}`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body as { items: any[]; summary: Record<string, number> };
};
const itemOf = async (s: Session, id: string) => (await feed(s)).items.find((c) => c.id === id);

async function counts(s: Session) {
  const [f, overview, patientSummary, clinical] = await Promise.all([
    feed(s),
    call(base, s, 'GET', '/consegne/overview'),
    call(base, s, 'POST', '/consegne/patient-summary', { patientIds: [mine] }),
    call(base, s, 'GET', `/patients/clinical-summary?patientIds=${mine}`),
  ]);
  assert.equal(overview.status, 200, JSON.stringify(overview.body));
  assert.equal(patientSummary.status, 200, JSON.stringify(patientSummary.body));
  assert.equal(clinical.status, 200, JSON.stringify(clinical.body));
  return {
    feed: f.summary,
    overview: overview.body,
    patient: patientSummary.body.items[0],
    clinical: clinical.body[0],
  };
}

async function handoverSignal(s: Session, id: string) {
  const r = await call(base, s, 'GET', '/skills/proactive/inbox');
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return (r.body.signals as any[]).find(
    (x) =>
      x.eventType === 'handover.open' &&
      (x.sourceEventIds as string[]).includes(`handover.open:${id}`),
  );
}

before(async () => {
  ({ base, close } = await startApp());
  [supervisor, doctor, nurse] = await Promise.all(
    ['SIM-SUPERVISOR-1', 'SIM-DOCTOR-1', 'SIM-NURSE-1'].map((id) => login(base, id)),
  );
  mine = (await createPatientOwnedBy('SIM-NURSE-1', 'consegna-ack')).id;
  patients.push(mine);
  const urgent = await createConsegna(nurse, {
    priorita: 'urgente',
    operatoreAssegnatoId: 'SIM-DOCTOR-1',
  });
  urgentId = urgent.id;
  normalId = (await createConsegna(nurse, { priorita: 'normale' })).id;
  // Legacy: urgent and «completata» under the old model.
  legacyId = (
    await prisma.consegna.create({
      data: {
        pazienteId: mine,
        pazienteNome: 'Legacy',
        priorita: 'urgente',
        stato: 'completata',
        note: `Legacy ${runTag}`,
        scadenza: '2026-01-01',
        operatoreAssegnato: '',
        creatoDA: 'Infermiere 1',
        creatoDaId: 'SIM-NURSE-1',
      },
    })
  ).id;
});

after(async () => {
  // Deleting the handovers cascades their acknowledgements (the only DELETE the trigger allows).
  await prisma.consegna.deleteMany({ where: { pazienteId: { in: patients } } });
  await prisma.patient.deleteMany({ where: { id: { in: patients } } });
  await close();
});

test('create: an urgent handover is an ACTIVE urgency; the author cannot take it', async () => {
  const forAuthor = await itemOf(nurse, urgentId);
  assert.deepEqual(forAuthor.urgency, {
    state: 'active',
    takenBy: null,
    isAuthor: true,
    canAcknowledge: false,
  });
  const forSupervisor = await itemOf(supervisor, urgentId);
  assert.equal(forSupervisor.urgency.state, 'active');
  assert.equal(forSupervisor.urgency.canAcknowledge, true);
  assert.equal((await itemOf(nurse, normalId)).urgency.state, 'none');
  // Legacy completed urgency: closed, no trace, never active.
  assert.deepEqual((await itemOf(supervisor, legacyId)).urgency, {
    state: 'taken',
    takenBy: null,
    isAuthor: false,
    canAcknowledge: false,
  });

  const c = await counts(nurse);
  assert.equal(c.feed.urgentActive, 1);
  assert.equal(c.feed.urgentTaken, 1, 'the legacy completed one');
  assert.equal('open' in c.feed, false, 'no aperta / in corso / completata counts any more');
  assert.equal(c.patient.urgentActive, 1);
  assert.equal(c.clinical.consegneAperte, 1, 'clinical summary counts active urgencies only');
  assert.ok(c.overview.urgentPreview.some((x: any) => x.id === urgentId));
  assert.ok(!c.overview.urgentPreview.some((x: any) => x.id === legacyId));

  const self = await call(base, nurse, 'POST', `/consegne/${urgentId}/ack`);
  assert.equal(self.status, 409, JSON.stringify(self.body));
  assert.equal(self.body.code, 'author_cannot_acknowledge');
  assert.equal(await prisma.consegnaAcknowledgement.count({ where: { consegnaId: urgentId } }), 0);
});

test('resident scope: the assignee outside the resident scope cannot acknowledge (404)', async () => {
  const r = await call(base, doctor, 'POST', `/consegne/${urgentId}/ack`);
  assert.equal(r.status, 404, JSON.stringify(r.body));
  assert.equal(await prisma.consegnaAcknowledgement.count({ where: { consegnaId: urgentId } }), 0);
  const unknown = await call(base, supervisor, 'POST', `/consegne/does-not-exist-${runTag}/ack`);
  assert.equal(unknown.status, 404);
  const anonymous = await call(base, null, 'POST', `/consegne/${urgentId}/ack`);
  assert.ok([401, 403].includes(anonymous.status), String(anonymous.status));
});

test('proactive: «urgenza da prendere in carico» for the next operator, not for the author', async () => {
  const s = await handoverSignal(supervisor, urgentId);
  assert.ok(s, 'handover signal for the supervisor');
  assert.match(s.title, /^Urgenza da prendere in carico/);
  assert.doesNotMatch(s.title, /aperta|in corso|completata/);
  assert.equal(s.priority, 'urgente');
  assert.equal(await handoverSignal(nurse, urgentId), undefined, 'the author is not signalled');
  assert.equal(await handoverSignal(supervisor, normalId), undefined, 'a normal note is no signal');
});

test('first non-author «Ho capito» ends the urgency for everyone; trace + audit; stato untouched', async () => {
  const before = await prisma.consegna.findUniqueOrThrow({ where: { id: urgentId } });
  const r = await call(base, supervisor, 'POST', `/consegne/${urgentId}/ack`, {
    operatorName: 'Spoofed',
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.created, true);
  assert.equal(r.body.urgency.state, 'taken');
  assert.equal(r.body.urgency.takenBy.operatorName, 'Supervisore 1');

  const rows = await prisma.consegnaAcknowledgement.findMany({ where: { consegnaId: urgentId } });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].operatorId, 'SIM-SUPERVISOR-1');
  assert.equal(rows[0].patientId, mine);
  const afterRow = await prisma.consegna.findUniqueOrThrow({ where: { id: urgentId } });
  assert.deepEqual(afterRow, before, 'the handover (stored stato included) is never modified');
  assert.equal(afterRow.stato, 'aperta');

  const forAuthor = await itemOf(nurse, urgentId);
  assert.equal(forAuthor.urgency.state, 'taken');
  assert.equal(forAuthor.urgency.takenBy.operatorName, 'Supervisore 1');
  assert.equal(forAuthor.urgency.takenBy.byMe, false);
  assert.equal(forAuthor.urgency.takenBy.acknowledgedAt, rows[0].acknowledgedAt.toISOString());

  const audit = await waitForAudit({
    operatorId: 'SIM-SUPERVISOR-1',
    actionType: 'consegna:ack',
    fields: { has: `consegna:${urgentId}` },
  });
  assert.ok(audit, 'consegna:ack audit row');
  assert.equal(audit!.kind, 'create');
  assert.ok(audit!.fields.every((f) => !f.includes('Nota')));
});

test('after it is taken: not counted, not signalled, idempotent', async () => {
  const c = await counts(nurse);
  assert.equal(c.feed.urgentActive, 0);
  assert.equal(c.feed.urgentTaken, 2);
  assert.equal(c.patient.urgentActive, 0);
  assert.equal(c.clinical.consegneAperte, 0);
  assert.ok(!c.overview.urgentPreview.some((x: any) => x.id === urgentId));
  const sup = await counts(supervisor);
  assert.ok(!sup.overview.urgentPreview.some((x: any) => x.id === urgentId));
  assert.equal(sup.overview.byOperator['SIM-DOCTOR-1'] ?? 0, 0);

  assert.equal(await handoverSignal(supervisor, urgentId), undefined);

  const active = await feed(supervisor, '&urgency=active');
  assert.ok(!active.items.some((x) => x.id === urgentId));
  const taken = await feed(supervisor, '&urgency=taken');
  assert.ok(taken.items.some((x) => x.id === urgentId));

  const again = await call(base, supervisor, 'POST', `/consegne/${urgentId}/ack`);
  assert.equal(again.status, 200, JSON.stringify(again.body));
  assert.equal(again.body.created, false);
  assert.equal(await prisma.consegnaAcknowledgement.count({ where: { consegnaId: urgentId } }), 1);

  // The assistant queue rule (active urgencies only) is covered by consegne-assistant-scope.test.ts.
});

test('the diary feed shows the handover with the same urgency trace', async () => {
  const r = await call(base, nurse, 'GET', `/patients/${mine}/diary?limit=50`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const row = (r.body.entries as any[]).find((e) => e.id === `consegna:${urgentId}`);
  assert.ok(row, 'handover in the diary feed');
  assert.equal(row.urgency.state, 'taken');
  assert.equal(row.urgency.takenBy.operatorName, 'Supervisore 1');
});

test('legacy and normal: no write; append-only; cascade with the handover only', async () => {
  const legacy = await call(base, supervisor, 'POST', `/consegne/${legacyId}/ack`);
  assert.equal(legacy.status, 200, JSON.stringify(legacy.body));
  assert.equal(legacy.body.created, false);
  assert.equal(await prisma.consegnaAcknowledgement.count({ where: { consegnaId: legacyId } }), 0);
  const normal = await call(base, supervisor, 'POST', `/consegne/${normalId}/ack`);
  assert.equal(normal.status, 409, JSON.stringify(normal.body));
  assert.equal(normal.body.code, 'not_acknowledgeable');

  await assert.rejects(
    prisma.$executeRawUnsafe(
      `UPDATE "ConsegnaAcknowledgement" SET "operatorName" = 'x' WHERE "consegnaId" = $1`,
      urgentId,
    ),
    /append-only/,
  );
  await assert.rejects(
    prisma.$executeRawUnsafe(
      `DELETE FROM "ConsegnaAcknowledgement" WHERE "consegnaId" = $1`,
      urgentId,
    ),
    /append-only/,
  );
  const doomed = await createConsegna(nurse, { priorita: 'urgente' });
  const ack = await call(base, supervisor, 'POST', `/consegne/${doomed.id}/ack`);
  assert.equal(ack.status, 201, JSON.stringify(ack.body));
  const del = await call(base, nurse, 'DELETE', `/consegne/${doomed.id}`);
  assert.equal(del.status, 204);
  assert.equal(await prisma.consegnaAcknowledgement.count({ where: { consegnaId: doomed.id } }), 0);
});

test('backward compatibility: stato is still accepted by the API and never rewritten by ack', async () => {
  const c = await createConsegna(nurse, { priorita: 'urgente' });
  const put = await call(base, nurse, 'PUT', `/consegne/${c.id}`, { stato: 'in_corso' });
  assert.equal(put.status, 200, JSON.stringify(put.body));
  assert.equal(put.body.urgency.state, 'active', 'legacy in_corso is still an active urgency');
  const ack = await call(base, supervisor, 'POST', `/consegne/${c.id}/ack`);
  assert.equal(ack.status, 201);
  const row = await prisma.consegna.findUniqueOrThrow({ where: { id: c.id } });
  assert.equal(row.stato, 'in_corso');
});
