import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import pg from 'pg';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { prisma } from '../../lib/prisma.js';
import { facilityToday } from '../parameter-reading-input.js';
import {
  call,
  createPatientOwnedBy,
  login,
  runTag,
  startApp,
  type Session,
} from '../../authz/__tests__/harness-support.js';

process.env.RESIDENT_SCOPE_CONFIG = JSON.stringify({ fallback: 'registered_by_me' });
let base: string,
  close: () => Promise<void>,
  nurse: Session,
  supervisor: Session,
  patientId: string;
const readers: Session[] = [];
const proof: unknown[] = [];
before(async () => {
  ({ base, close } = await startApp());
  [nurse, supervisor] = await Promise.all(
    ['SIM-NURSE-1', 'SIM-SUPERVISOR-1'].map((id) => login(base, id)),
  );
  await login(base, 'SIM-DOCTOR-1');
  readers.push(nurse, supervisor);
  patientId = (await createPatientOwnedBy('SIM-NURSE-1', 'concurrent-ack')).id;
});
after(async () => {
  if (patientId) {
    await prisma.consegna.deleteMany({ where: { pazienteId: patientId } });
    await prisma.patientDiaryEntry.deleteMany({ where: { patientId } });
    await prisma.patient.delete({ where: { id: patientId } });
  }
  await close?.();
});

async function fixture(kind: 'diary' | 'consegna') {
  if (kind === 'diary') {
    const row = await prisma.patientDiaryEntry.create({
      data: {
        patientId,
        authorId: 'SIM-DOCTOR-1',
        authorName: 'Medico 1',
        authorType: 'medico',
        priority: 'urgente',
        status: 'aperta',
        title: `Concorrenza sintetica ${runTag}`,
        content: 'Test sintetico',
        entryDateTime: `${facilityToday()}T10:00`,
      },
    });
    return {
      id: row.id,
      before: row,
      path: `/patients/${patientId}/diary/${row.id}/ack`,
      lock: `diary-ack:${row.id}`,
    };
  }
  const row = await prisma.consegna.create({
    data: {
      pazienteId: patientId,
      pazienteNome: 'Paziente Sintetico',
      creatoDaId: 'SIM-DOCTOR-1',
      creatoDA: 'Medico 1',
      priorita: 'urgente',
      stato: 'aperta',
      note: `Test sintetico ${runTag}`,
      scadenza: '2026-10-04',
      operatoreAssegnato: '',
      operatoreAssegnatoId: 'SIM-NURSE-1',
    },
  });
  return {
    id: row.id,
    before: row,
    path: `/consegne/${row.id}/ack`,
    lock: `consegna-ack:${row.id}`,
  };
}

/** Hold the subject's lock until both actual HTTP calls have reached it. No service mocks. */
async function simultaneous(subject: Awaited<ReturnType<typeof fixture>>, actors: Session[]) {
  const blocker = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await blocker.connect();
  let pending: Array<ReturnType<typeof call>> = [];
  let waiters = 0;
  try {
    await blocker.query('BEGIN');
    await blocker.query('SELECT pg_advisory_xact_lock(hashtext($1))', [subject.lock]);
    pending = actors.map((actor) => call(base, actor, 'POST', subject.path));
    const deadline = Date.now() + 2500;
    while (Date.now() < deadline) {
      const state = await blocker.query(
        `SELECT count(*)::int AS n FROM pg_locks
        WHERE locktype = 'advisory' AND NOT granted AND objid::bigint = (hashtext($1)::bigint & 4294967295)`,
        [subject.lock],
      );
      waiters = state.rows[0].n;
      if (waiters === actors.length) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  } finally {
    await blocker.query('ROLLBACK');
    await blocker.end();
  }
  const responses = await Promise.all(pending);
  assert.equal(waiters, actors.length, 'both requests must wait on the same subject lock');
  assert.deepEqual(responses.map((row) => row.status).sort(), [
    ...actors.slice(1).map(() => 200),
    201,
  ]);
  assert.equal(responses.filter((row) => row.body.created === true).length, 1);
  const winner = responses.find((row) => row.body.created === true)!.body.urgency.takenBy;
  for (const row of responses) {
    assert.equal(row.body.urgency.state, 'taken');
    assert.equal(row.body.urgency.takenBy.operatorName, winner.operatorName);
    assert.equal(row.body.urgency.takenBy.operatorRole, winner.operatorRole);
    assert.equal(row.body.urgency.takenBy.acknowledgedAt, winner.acknowledgedAt);
    assert.equal(row.body.urgency.canAcknowledge, false);
  }
  return winner;
}

for (const kind of ['diary', 'consegna'] as const) {
  test(`${kind}: different colleagues and same-reader double tap each create exactly one receipt`, async () => {
    for (const actors of [
      readers,
      [nurse, nurse],
      Array.from({ length: 10 }, (_, index) => readers[index % readers.length]),
    ]) {
      const subject = await fixture(kind);
      const winner = await simultaneous(subject, actors);
      const rows =
        kind === 'diary'
          ? await prisma.diaryEntryAcknowledgement.findMany({ where: { entryId: subject.id } })
          : await prisma.consegnaAcknowledgement.findMany({ where: { consegnaId: subject.id } });
      assert.equal(rows.length, 1);
      assert.equal(rows[0].operatorName, winner.operatorName);
      assert.equal(rows[0].acknowledgedAt.toISOString(), winner.acknowledgedAt);
      const afterRow =
        kind === 'diary'
          ? await prisma.patientDiaryEntry.findUniqueOrThrow({ where: { id: subject.id } })
          : await prisma.consegna.findUniqueOrThrow({ where: { id: subject.id } });
      assert.deepEqual(afterRow, subject.before, 'original clinical record is unchanged');
      const feed = await call(base, supervisor, 'GET', `/patients/${patientId}/diary?limit=50`);
      assert.equal(feed.status, 200);
      const expectedId = kind === 'diary' ? subject.id : `consegna:${subject.id}`;
      const entry = feed.body.entries.find((row: { id: string }) => row.id === expectedId);
      assert.equal(entry.urgency.takenBy.operatorName, winner.operatorName);
      assert.equal(entry.urgency.takenBy.acknowledgedAt, winner.acknowledgedAt);
      proof.push({
        kind,
        readers:
          actors.length === 10
            ? 'pool-sized concurrent group'
            : actors[0] === actors[1]
              ? 'same reader'
              : 'different colleagues',
        blockedRequests: actors.length,
        createdReceipts: 1,
        databaseRows: rows.length,
        operatorName: winner.operatorName,
        operatorRole: winner.operatorRole,
        acknowledgedAt: winner.acknowledgedAt,
        originalUnchanged: true,
        sharedFeed: true,
      });
      if (process.env.UX_EVIDENCE_DIR) {
        const directory = path.join(process.env.UX_EVIDENCE_DIR, 'test-results');
        mkdirSync(directory, { recursive: true });
        writeFileSync(
          path.join(directory, 'concurrency-proof.json'),
          JSON.stringify(proof, null, 2),
        );
      }
    }
  });
}

test('a lock on one diary subject does not block another subject or a handover', async () => {
  const held = await fixture('diary'),
    otherDiary = await fixture('diary'),
    handover = await fixture('consegna');
  const blocker = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await blocker.connect();
  try {
    await blocker.query('BEGIN');
    await blocker.query('SELECT pg_advisory_xact_lock(hashtext($1))', [held.lock]);
    const responses = await Promise.all(
      [otherDiary, handover].map((subject) => call(base, nurse, 'POST', subject.path)),
    );
    assert.deepEqual(
      responses.map((row) => row.status),
      [201, 201],
    );
    assert.equal(await prisma.diaryEntryAcknowledgement.count({ where: { entryId: held.id } }), 0);
  } finally {
    await blocker.query('ROLLBACK');
    await blocker.end();
  }
});
