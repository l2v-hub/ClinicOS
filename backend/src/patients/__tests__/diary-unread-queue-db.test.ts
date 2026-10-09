import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { prisma } from '../../lib/prisma.js';
import {
  call,
  createPatientOwnedBy,
  login,
  startApp,
  type Session,
} from '../../authz/__tests__/harness-support.js';

let base: string,
  close: () => Promise<void>,
  nurse: Session,
  doctor: Session,
  oss: Session,
  admin: Session;
const patients: string[] = [];
before(async () => {
  delete process.env.RESIDENT_SCOPE_CONFIG;
  ({ base, close } = await startApp());
  [nurse, doctor, oss, admin] = await Promise.all(
    ['SIM-NURSE-1', 'SIM-DOCTOR-1', 'SIM-OSS-1', 'SIM-ADMIN'].map((id) => login(base, id)),
  );
  for (const [owner, label] of [
    ['SIM-DOCTOR-1', 'queue-doctor'],
    ['SIM-NURSE-1', 'queue-nurse'],
    ['SIM-NURSE-1', 'queue-zero'],
  ])
    patients.push((await createPatientOwnedBy(owner, label)).id);
});
after(async () => {
  delete process.env.RESIDENT_SCOPE_CONFIG;
  await prisma.consegna.deleteMany({ where: { pazienteId: { in: patients } } });
  await prisma.patientDiaryEntry.deleteMany({ where: { patientId: { in: patients } } });
  await prisma.patient.deleteMany({ where: { id: { in: patients } } });
  await close();
});
async function diary(patientId: string, priority = 'normale', status = 'completata') {
  return prisma.patientDiaryEntry.create({
    data: {
      patientId,
      authorId: 'SIM-DOCTOR-1',
      authorName: 'Medico 1',
      authorType: 'medico',
      content: 'Solo nota sintetica',
      entryDateTime: '2026-10-06T09:00',
      priority,
      status,
    },
  });
}
async function handover(patientId: string, priority = 'normale', assignee = 'SIM-NURSE-1') {
  return prisma.consegna.create({
    data: {
      pazienteId: patientId,
      pazienteNome: 'Paziente sintetico',
      priorita: priority,
      stato: 'aperta',
      note: 'Solo consegna sintetica',
      scadenza: '2026-10-06',
      operatoreAssegnato: '',
      operatoreAssegnatoId: assignee,
      creatoDaId: 'SIM-DOCTOR-1',
      creatoDA: 'Medico 1',
      createdAt: new Date('2026-10-06T07:00:00Z'),
    },
  });
}
async function queue(actor = nurse, query = '') {
  const result = await call(base, actor, 'GET', `/patients/diary-unread?limit=20${query}`);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return result.body;
}

test('exact badge/list/per-patient counts agree for both sources beyond 50 and tie dates; GET writes no receipt', async () => {
  const ids = new Set<string>();
  for (let i = 0; i < 53; i++) {
    const patient = patients[i % 2];
    if (i % 2) {
      const row = await handover(patient, i % 3 ? 'normale' : 'alta');
      ids.add(`consegna:${row.id}`);
    } else {
      const row = await diary(patient, i % 3 ? 'normale' : 'importante');
      ids.add(row.id);
    }
  }
  const first = await queue();
  assert.equal(first.totalUnread, 53);
  assert.equal(first.filteredUnread, 53);
  assert.equal(first.entries.length, 20);
  assert.equal(first.hasMore, true);
  const cursor = JSON.parse(Buffer.from(first.nextCursor, 'base64url').toString('utf8'));
  assert.deepEqual(Object.keys(cursor).sort(), ['authorType', 'entryDateTime', 'id', 'v']);
  assert.ok(first.nextCursor.length < 1024);
  const seen: string[] = [];
  let page = first;
  for (;;) {
    for (const row of page.entries) {
      seen.push(row.id);
      assert.ok(ids.has(row.id));
      assert.equal(row.readReceipt.state, 'unread');
      assert.equal(row.identity.id, row.patientId);
      assert.ok(row.identity.location);
      assert.equal(
        page.patientCounts.find((item: { patientId: string }) => item.patientId === row.patientId)
          .total,
        row.patientId === patients[0] ? 27 : 26,
      );
    }
    if (!page.hasMore) break;
    page = await queue(nurse, `&cursor=${encodeURIComponent(page.nextCursor)}`);
  }
  assert.equal(seen.length, 53);
  assert.equal(new Set(seen).size, 53);
  assert.deepEqual(new Set(seen), ids);
  assert.equal(
    (await call(base, nurse, 'GET', '/patients/diary-unread-count')).body.unreadCount,
    53,
  );
  const counts = await call(
    base,
    nurse,
    'GET',
    `/patients/diary-unread-patient-counts?patientIds=${patients.join(',')}`,
  );
  assert.equal(counts.status, 200);
  assert.deepEqual(
    counts.body.items
      .map((item: { total: number }) => item.total)
      .sort((a: number, b: number) => a - b),
    [0, 26, 27],
  );
  const filtered = await queue(nurse, `&patientId=${patients[1]}`);
  assert.equal(filtered.totalUnread, 53);
  assert.equal(filtered.filteredUnread, 26);
  assert.ok(filtered.entries.every((row: { patientId: string }) => row.patientId === patients[1]));
  const totals = await prisma.$queryRaw<
    Array<{ total: bigint }>
  >`SELECT (SELECT count(*) FROM "DiaryEntryReadReceipt") + (SELECT count(*) FROM "ConsegnaReadReceipt") AS total`;
  assert.equal(Number(totals[0].total), 0);
  const raw = await fetch(`${base}/patients/diary-unread?limit=20`, {
    headers: { Authorization: `Bearer ${nurse.token}` },
  });
  assert.match(raw.headers.get('cache-control')!, /private.*no-store/);
});

test('bounded validated inputs and cursor are bound to actor, resident scope and patient filter', async () => {
  const first = await queue();
  for (const suffix of [
    'limit=0',
    'limit=21',
    'limit=1.2',
    'limit=1&limit=2',
    'cursor=bad',
    'patientId=../bad',
    'status=aperta',
  ])
    assert.equal(
      (await call(base, nurse, 'GET', `/patients/diary-unread?${suffix}`)).status,
      400,
      suffix,
    );
  const encoded = encodeURIComponent(first.nextCursor);
  assert.equal(
    (await call(base, oss, 'GET', `/patients/diary-unread?cursor=${encoded}`)).status,
    400,
  );
  assert.equal(
    (
      await call(
        base,
        nurse,
        'GET',
        `/patients/diary-unread?cursor=${encoded}&patientId=${patients[0]}`,
      )
    ).status,
    400,
  );
  for (const ids of [
    '',
    `${patients[0]},${patients[0]}`,
    '../bad',
    Array.from({ length: 51 }, (_, i) => `p-${i}`).join(','),
  ])
    assert.equal(
      (
        await call(
          base,
          nurse,
          'GET',
          `/patients/diary-unread-patient-counts?patientIds=${encodeURIComponent(ids)}`,
        )
      ).status,
      400,
    );
  process.env.RESIDENT_SCOPE_CONFIG = JSON.stringify({ fallback: 'registered_by_me' });
  assert.equal(
    (await call(base, nurse, 'GET', `/patients/diary-unread?cursor=${encoded}`)).status,
    400,
  );
  delete process.env.RESIDENT_SCOPE_CONFIG;
});

test('scope and capability are reapplied for queue and counts; no out-of-scope identity/count disclosures', async () => {
  process.env.RESIDENT_SCOPE_CONFIG = JSON.stringify({ fallback: 'registered_by_me' });
  const hidden = await handover(patients[1], 'normale', 'SIM-OSS-1');
  const visible = await queue();
  assert.equal(visible.totalUnread, 26);
  assert.ok(
    visible.entries.every(
      (row: { patientId: string; sourceId: string }) =>
        row.patientId === patients[1] && row.sourceId !== hidden.id,
    ),
  );
  const counts = await call(
    base,
    nurse,
    'GET',
    `/patients/diary-unread-patient-counts?patientIds=${patients.join(',')}`,
  );
  assert.deepEqual(
    new Set(counts.body.items.map((row: { patientId: string }) => row.patientId)),
    new Set([patients[1], patients[2]]),
  );
  assert.equal((await queue(nurse, `&patientId=${patients[0]}`)).filteredUnread, 0);
  for (const route of [
    '/patients/diary-unread',
    `/patients/diary-unread-patient-counts?patientIds=${patients[0]}`,
  ]) {
    assert.equal((await call(base, null, 'GET', route)).status, 401);
    assert.equal((await call(base, admin, 'GET', route)).status, 403);
  }
  delete process.env.RESIDENT_SCOPE_CONFIG;
});

test('both-source reading updates exact queue/count but keeps active urgency until separate same-actor takeover', async () => {
  const d = await diary(patients[0], 'urgente', 'aperta'),
    c = await handover(patients[0], 'urgente');
  for (const [source, row, route] of [
    ['diary', d, `/patients/${patients[0]}/diary/${d.id}/ack`],
    ['consegna', c, `/consegne/${c.id}/ack`],
  ] as const) {
    const before = await queue();
    assert.equal((await call(base, doctor, 'POST', route, { purpose: 'read' })).status, 409);
    const read = await call(base, nurse, 'POST', route, { purpose: 'read' });
    assert.equal(read.status, 201);
    assert.equal(read.body.readReceipt.state, 'read');
    assert.equal(read.body.urgency.state, 'active');
    assert.equal((await queue()).totalUnread, before.totalUnread - 1);
    assert.ok(
      !(await queue()).entries.some((item: { sourceId: string }) => item.sourceId === row.id),
    );
    const history = await call(base, nurse, 'GET', `/patients/${patients[0]}/diary?limit=100`);
    const entry = history.body.entries.find(
      (item: { sourceId: string; id: string }) => item.id === row.id || item.sourceId === row.id,
    );
    assert.equal(entry.readReceipt.state, 'read');
    assert.equal(entry.urgency.state, 'active');
    assert.equal((await call(base, oss, 'POST', route, { purpose: 'read' })).status, 200);
    const taken = await call(base, nurse, 'POST', route, { purpose: 'urgency' });
    assert.equal(taken.status, 201);
    assert.equal(taken.body.urgency.state, 'taken');
    assert.equal(
      taken.body.readReceipt.readBy.operatorName,
      read.body.readReceipt.readBy.operatorName,
    );
    if (source === 'diary')
      assert.deepEqual(await prisma.patientDiaryEntry.findUnique({ where: { id: row.id } }), row);
    else assert.deepEqual(await prisma.consegna.findUnique({ where: { id: row.id } }), row);
  }
});

test('new receipts are append-only, old urgency evidence remains compatible and parent cascade works', async () => {
  for (const source of ['diary', 'consegna'] as const) {
    const row =
      source === 'diary'
        ? await diary(patients[2], 'urgente', 'aperta')
        : await handover(patients[2], 'urgente');
    const route =
      source === 'diary'
        ? `/patients/${patients[2]}/diary/${row.id}/ack`
        : `/consegne/${row.id}/ack`;
    assert.equal((await call(base, nurse, 'POST', route, { purpose: 'read' })).status, 201);
    const statements =
      source === 'diary'
        ? [
            'UPDATE "DiaryEntryReadReceipt" SET "operatorName" = \'forged\'',
            'DELETE FROM "DiaryEntryReadReceipt"',
            'TRUNCATE "DiaryEntryReadReceipt"',
          ]
        : [
            'UPDATE "ConsegnaReadReceipt" SET "operatorName" = \'forged\'',
            'DELETE FROM "ConsegnaReadReceipt"',
            'TRUNCATE "ConsegnaReadReceipt"',
          ];
    // Fixed, test-owned statements only; no user input enters this SQL.
    for (const sql of statements)
      await assert.rejects(() => prisma.$executeRawUnsafe(sql), /append.only|23514/i);
    if (source === 'diary') await prisma.patientDiaryEntry.delete({ where: { id: row.id } });
    else await prisma.consegna.delete({ where: { id: row.id } });
  }
  const row = await diary(patients[2], 'urgente', 'aperta');
  const route = `/patients/${patients[2]}/diary/${row.id}/ack`;
  assert.equal((await call(base, nurse, 'POST', route, { purpose: 'urgency' })).status, 201);
  const count = (await queue()).totalUnread;
  const read = await call(base, oss, 'POST', route, { purpose: 'read' });
  assert.equal(read.status, 200);
  assert.equal(read.body.urgency.state, 'taken');
  assert.equal(read.body.readReceipt.state, 'read');
  assert.equal((await queue()).totalUnread, count);
});
