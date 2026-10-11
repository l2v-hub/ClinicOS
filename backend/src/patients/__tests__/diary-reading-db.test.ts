import assert from 'node:assert/strict';
import { before, after, afterEach, test } from 'node:test';
import { prisma } from '../../lib/prisma.js';
import {
  call,
  createPatientOwnedBy,
  login,
  startApp,
  type Session,
} from '../../authz/__tests__/harness-support.js';

let base: string, close: () => Promise<void>, nurse: Session, doctor: Session, oss: Session;
const patients: string[] = [];
afterEach(() => {
  delete process.env.RESIDENT_SCOPE_CONFIG;
});
before(async () => {
  delete process.env.RESIDENT_SCOPE_CONFIG;
  ({ base, close } = await startApp());
  [nurse, doctor, oss] = await Promise.all(
    ['SIM-NURSE-1', 'SIM-DOCTOR-1', 'SIM-OSS-1'].map((id) => login(base, id)),
  );
  for (const [owner, label] of [
    ['SIM-DOCTOR-1', 'reading-doctor'],
    ['SIM-NURSE-1', 'reading-nurse'],
  ])
    patients.push((await createPatientOwnedBy(owner, label)).id);
});
after(async () => {
  await prisma.consegna.deleteMany({ where: { pazienteId: { in: patients } } });
  await prisma.patientDiaryEntry.deleteMany({ where: { patientId: { in: patients } } });
  await prisma.patient.deleteMany({ where: { id: { in: patients } } });
  await close();
});
async function unread(actor = nurse) {
  const result = await call(base, actor, 'GET', '/patients/diary-unread-count');
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return result.body.unreadCount as number;
}
async function entry(patientId: string, priority = 'normale', status = 'completata') {
  return prisma.patientDiaryEntry.create({
    data: {
      patientId,
      authorId: 'SIM-DOCTOR-1',
      authorName: 'Medico 1',
      authorType: 'medico',
      priority,
      status,
      content: 'Nota sintetica',
      entryDateTime: '2026-10-05T10:00',
    },
  });
}
test('counts every priority across patients beyond 50, status is not evidence of reading; GET writes nothing', async () => {
  const baseline = await unread();
  await prisma.patientDiaryEntry.createMany({
    data: Array.from({ length: 53 }, (_, index) => ({
      patientId: patients[index % 2],
      authorId: 'SIM-DOCTOR-1',
      authorName: 'Medico 1',
      authorType: 'medico',
      content: 'Nota sintetica',
      entryDateTime: '2026-10-05T09:00',
      priority: index % 2 ? 'normale' : 'importante',
      status: 'completata',
    })),
  });
  assert.equal(await unread(), baseline + 53);
  const page = await call(base, nurse, 'GET', `/patients/${patients[0]}/diary?limit=1`);
  assert.equal(page.status, 200);
  assert.equal(page.body.entries.length, 1);
  assert.equal(page.body.entries[0].readReceipt.state, 'unread');
  assert.equal(await unread(), baseline + 53);
  assert.equal(
    await prisma.diaryEntryAcknowledgement.count({ where: { patientId: { in: patients } } }),
    0,
  );
});
test('all-priority explicit reads share one authoritative receipt, are idempotent and do not alter the note', async () => {
  for (const priority of ['normale', 'importante', 'urgente']) {
    const original = await entry(patients[0], priority);
    const baseline = await unread();
    const route = `/patients/${patients[0]}/diary/${original.id}/ack`;
    const authorAttempt = await call(base, doctor, 'POST', route, { purpose: 'read' });
    assert.equal(authorAttempt.status, 409);
    assert.equal(await unread(), baseline);
    const results = await Promise.all(
      [nurse, oss].map((actor) =>
        call(base, actor, 'POST', route, {
          purpose: 'read',
          operatorName: 'Forged',
          acknowledgedAt: '1900-01-01',
        }),
      ),
    );
    assert.deepEqual(results.map((result) => result.status).sort(), [200, 201]);
    assert.deepEqual(
      results[0].body.readReceipt.readBy.operatorName,
      results[1].body.readReceipt.readBy.operatorName,
    );
    for (const result of results) {
      assert.equal(result.body.readReceipt.state, 'read');
      assert.ok(Number.isFinite(Date.parse(result.body.readReceipt.readBy.acknowledgedAt)));
      assert.notEqual(result.body.readReceipt.readBy.operatorName, 'Forged');
    }
    assert.equal(await unread(), baseline - 1);
    assert.equal(await unread(doctor), baseline - 1);
    assert.equal(
      await prisma.diaryEntryAcknowledgement.count({ where: { entryId: original.id } }),
      0,
    );
    const reads = await prisma.$queryRaw<
      Array<{ total: bigint }>
    >`SELECT count(*) AS total FROM "DiaryEntryReadReceipt" WHERE "entryId" = ${original.id}`;
    assert.equal(Number(reads[0].total), 1);
    if (priority === 'urgente') {
      assert.equal(
        results[0].body.urgency.state,
        'taken',
        'legacy closed note is not reopened by reading',
      );
      assert.equal(
        results[0].body.urgency.takenBy,
        null,
        'plain reading does not fabricate a clinical taker',
      );
    }
    assert.deepEqual(
      await prisma.patientDiaryEntry.findUnique({ where: { id: original.id } }),
      original,
    );
    assert.equal((await call(base, nurse, 'POST', route, { purpose: 'read' })).status, 200);
    assert.equal(await unread(), baseline - 1);
  }
});
test('handover appears once in diary and counter; both source reads agree', async () => {
  const baseline = await unread();
  const handover = await prisma.consegna.create({
    data: {
      pazienteId: patients[0],
      pazienteNome: 'Sintetico',
      priorita: 'normale',
      stato: 'completata',
      note: 'Nota sintetica',
      scadenza: '2026-10-05',
      operatoreAssegnato: '',
      creatoDaId: 'SIM-DOCTOR-1',
      creatoDA: 'Medico 1',
    },
  });
  assert.equal(await unread(), baseline + 1);
  const read = await call(base, nurse, 'POST', `/consegne/${handover.id}/ack`, { purpose: 'read' });
  assert.equal(read.status, 201, JSON.stringify(read.body));
  assert.equal(await unread(), baseline);
  const page = await call(base, oss, 'GET', `/patients/${patients[0]}/diary?limit=100`);
  const rows = page.body.entries.filter(
    (row: { sourceId: string }) => row.sourceId === handover.id,
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].readReceipt.state, 'read');
  assert.equal(rows[0].readReceipt.readBy.operatorName, read.body.readReceipt.readBy.operatorName);
});
test('scope and capability gates protect both aggregate and explicit receipts', async () => {
  process.env.RESIDENT_SCOPE_CONFIG = JSON.stringify({ fallback: 'registered_by_me' });
  const hidden = await entry(patients[0]);
  assert.equal(
    (
      await call(base, nurse, 'POST', `/patients/${patients[0]}/diary/${hidden.id}/ack`, {
        purpose: 'read',
      })
    ).status,
    404,
  );
  const scopedCount = await unread();
  await entry(patients[0]);
  assert.equal(await unread(), scopedCount);
  const invisible = await prisma.consegna.create({
    data: {
      pazienteId: patients[1],
      pazienteNome: 'Sintetico',
      priorita: 'normale',
      note: 'Nota sintetica',
      scadenza: '2026-10-05',
      operatoreAssegnato: '',
      operatoreAssegnatoId: 'SIM-OSS-1',
      creatoDaId: 'SIM-DOCTOR-1',
      creatoDA: 'Medico 1',
    },
  });
  assert.equal(
    await unread(),
    scopedCount,
    'reachable resident does not widen handover visibility',
  );
  assert.equal(
    (await call(base, nurse, 'POST', `/consegne/${invisible.id}/ack`, { purpose: 'read' })).status,
    404,
  );
  assert.equal((await call(base, null, 'GET', '/patients/diary-unread-count')).status, 401);
  const admin = await login(base, 'SIM-ADMIN');
  assert.equal((await call(base, admin, 'GET', '/patients/diary-unread-count')).status, 403);
  delete process.env.RESIDENT_SCOPE_CONFIG;
});
test('legacy own-name receipt with whitespace does not settle a note; invalid purpose writes nothing', async () => {
  const row = await prisma.patientDiaryEntry.create({
    data: {
      patientId: patients[0],
      authorId: null,
      authorName: '\tMedico 1\n',
      authorType: 'medico',
      priority: 'normale',
      status: 'completata',
      content: 'Nota sintetica',
      entryDateTime: '2026-10-05T10:00',
    },
  });
  const baseline = await unread();
  await prisma.diaryEntryAcknowledgement.create({
    data: {
      entryId: row.id,
      patientId: patients[0],
      operatorId: 'SIM-DOCTOR-1',
      operatorName: 'Medico 1',
      operatorRole: 'medico',
    },
  });
  assert.equal(await unread(), baseline);
  const invalid = await call(base, nurse, 'POST', `/patients/${patients[0]}/diary/${row.id}/ack`, {
    purpose: 'typo',
  });
  assert.equal(invalid.status, 400);
  assert.equal(await unread(), baseline);
  assert.equal(await prisma.diaryEntryAcknowledgement.count({ where: { entryId: row.id } }), 1);
  const read = await call(base, nurse, 'POST', `/patients/${patients[0]}/diary/${row.id}/ack`, {
    purpose: 'read',
  });
  assert.equal(read.status, 201);
  assert.equal(read.body.readReceipt.state, 'read');
  assert.equal(await unread(), baseline - 1);
});
test('urgent and all-priority read actions racing serialize without conflating reader and clinical taker', async () => {
  const row = await entry(patients[0], 'urgente', 'aperta');
  const baseline = await unread();
  const route = `/patients/${patients[0]}/diary/${row.id}/ack`;
  const results = await Promise.all([
    call(base, nurse, 'POST', route),
    call(base, oss, 'POST', route, { purpose: 'read' }),
  ]);
  assert.equal(results[0].status, 201);
  assert.ok([200, 201].includes(results[1].status));
  assert.equal(results[0].body.urgency.state, 'taken');
  assert.equal(results[1].body.readReceipt.state, 'read');
  assert.ok(results[1].body.readReceipt.readBy.operatorName);
  assert.equal(await prisma.diaryEntryAcknowledgement.count({ where: { entryId: row.id } }), 1);
  assert.equal(await unread(), baseline - 1);
});

test('reading an active urgency never takes charge; same reader can explicitly take it later', async () => {
  const row = await entry(patients[0], 'urgente', 'aperta');
  const route = `/patients/${patients[0]}/diary/${row.id}/ack`;
  const read = await call(base, nurse, 'POST', route, { purpose: 'read' });
  assert.equal(read.status, 201);
  assert.equal(read.body.readReceipt.state, 'read');
  assert.equal(read.body.urgency.state, 'active');
  assert.equal(await prisma.diaryEntryAcknowledgement.count({ where: { entryId: row.id } }), 0);
  const taken = await call(base, nurse, 'POST', route, { purpose: 'urgency' });
  assert.equal(taken.status, 201);
  assert.equal(taken.body.urgency.state, 'taken');
  assert.equal(
    taken.body.readReceipt.readBy.operatorName,
    read.body.readReceipt.readBy.operatorName,
  );
  assert.equal(await prisma.diaryEntryAcknowledgement.count({ where: { entryId: row.id } }), 1);
  assert.deepEqual(await prisma.patientDiaryEntry.findUnique({ where: { id: row.id } }), row);
});
