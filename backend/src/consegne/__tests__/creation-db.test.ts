import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { createConsegna, ConsegnaPatientNotFoundError } from '../../services/consegna-service.js';
import { ConsegnaCreationError } from '../create-receipt.js';
import {
  actor,
  other,
  patient,
  foreign,
  id,
  payload,
  headers,
  seed,
  clean,
  httpServer,
} from './po08-fixture.js';

let http: Awaited<ReturnType<typeof httpServer>>;
before(async () => {
  await seed();
  http = await httpServer();
});
after(async () => {
  await http.close();
  await clean();
});
const receiptWhere = (requestId: string) => ({
  actorId_requestId: { actorId: actor.id, requestId },
});

test('concurrent identical requests create one open row and one durable receipt', async () => {
  const input = payload(id('concurrent'), { operatoreAssegnatoId: other.id });
  const results = await Promise.all(Array.from({ length: 8 }, () => createConsegna(input, actor)));
  assert.equal(new Set(results.map((row) => row.id)).size, 1);
  assert.equal(results.filter((row) => !row.replayed).length, 1);
  assert.equal(results[0].stato, 'aperta');
  assert.equal(results[0].pazienteNome, 'Bianchi, Ada');
  assert.equal(results[0].creatoDA, 'Ada Autrice');
  assert.equal(results[0].operatoreAssegnato, 'Bruno Collega');
  const receipt = await prisma.consegnaCreationReceipt.findUniqueOrThrow({
    where: receiptWhere(input.requestId),
  });
  assert.equal(receipt.consegnaId, results[0].id);
  assert.doesNotMatch(JSON.stringify(receipt), /Controllare|note|Bianchi/);
});

test('same key with different payload conflicts; actor namespaces remain independent', async () => {
  const key = id('conflict');
  const results = await Promise.allSettled([
    createConsegna(payload(key, { note: 'Alpha' }), actor),
    createConsegna(payload(key, { note: 'Beta' }), actor),
  ]);
  assert.equal(results.filter((row) => row.status === 'fulfilled').length, 1);
  const failure = results.find((row) => row.status === 'rejected') as PromiseRejectedResult;
  assert.equal(failure.reason.code, 'consegna_request_conflict');
  assert.equal(failure.reason.status, 409);
  const otherResult = await createConsegna(payload(key, { pazienteId: foreign }), other);
  assert.equal(otherResult.replayed, false);
  assert.equal(await prisma.consegnaCreationReceipt.count({ where: { requestId: key } }), 2);
});

test('receipt survives edits/deletion and immutable hash rejects later rewrites', async () => {
  const input = payload(id('edit-delete'));
  const created = await createConsegna(input, actor);
  const initial = await prisma.consegnaCreationReceipt.findUniqueOrThrow({
    where: receiptWhere(input.requestId),
  });
  await prisma.consegna.update({
    where: { id: created.id },
    data: { note: 'Modified later', stato: 'completata' },
  });
  const replay = await createConsegna(input, actor);
  assert.equal(replay.id, created.id);
  assert.equal(replay.note, 'Modified later');
  assert.equal(replay.stato, 'completata');
  assert.equal(replay.replayed, true);
  await assert.rejects(createConsegna({ ...input, note: 'Modified later' }, actor), {
    code: 'consegna_request_conflict',
  });
  await assert.rejects(
    prisma.consegnaCreationReceipt.update({
      where: receiptWhere(input.requestId),
      data: { payloadHash: 'f'.repeat(64) },
    }),
  );
  await prisma.consegna.delete({ where: { id: created.id } });
  await assert.rejects(
    createConsegna(input, actor),
    (error: unknown) =>
      error instanceof ConsegnaCreationError &&
      error.status === 410 &&
      error.ids?.consegnaId === created.id &&
      error.ids?.pazienteId === patient,
  );
  assert.deepEqual(
    await prisma.consegnaCreationReceipt.findUniqueOrThrow({
      where: receiptWhere(input.requestId),
    }),
    initial,
  );
  assert.equal(await prisma.consegna.count({ where: { id: created.id } }), 0);
});

test('omitted defaults remain stable across midnight and inactive assignee does not break replay', async () => {
  const input = payload(id('midnight'), { operatoreAssegnatoId: other.id });
  const created = await createConsegna(input, actor, new Date('2026-09-23T23:59:00Z'));
  await prisma.user.update({
    where: { email: `${other.id}@example.test` },
    data: { isActive: false },
  });
  try {
    const replay = await createConsegna(input, actor, new Date('2026-09-24T00:01:00Z'));
    assert.equal(replay.scadenza, '2026-09-23');
    assert.equal(replay.id, created.id);
    assert.equal(replay.replayed, true);
  } finally {
    await prisma.user.update({
      where: { email: `${other.id}@example.test` },
      data: { isActive: true },
    });
  }
});

test('failed creation rolls back its receipt and absent legacy requestId remains compatible', async () => {
  const key = id('rollback');
  await assert.rejects(
    createConsegna(payload(key, { operatoreAssegnatoId: id('missing') }), actor),
    /non disponibile/,
  );
  assert.equal(await prisma.consegnaCreationReceipt.count({ where: { requestId: key } }), 0);
  const legacy = { pazienteId: patient, note: 'Legacy caller' };
  const first = await createConsegna(legacy, actor);
  const second = await createConsegna(legacy, actor);
  assert.equal(first.requestId, null);
  assert.notEqual(first.id, second.id);
});

test('scope is checked for new creation and replay, including ownership changed while create waits', async () => {
  await assert.rejects(
    createConsegna(payload(id('foreign-new'), { pazienteId: foreign }), actor),
    ConsegnaPatientNotFoundError,
  );
  const input = payload(id('revoked'));
  await createConsegna(input, actor);
  let unlock!: () => void;
  let locked!: () => void;
  const lockedGate = new Promise<void>((resolve) => {
    locked = resolve;
  });
  const releaseGate = new Promise<void>((resolve) => {
    unlock = resolve;
  });
  const ownership = prisma.$transaction(async (tx) => {
    await tx.patient.update({ where: { id: patient }, data: { registeredById: other.id } });
    locked();
    await releaseGate;
  });
  await lockedGate;
  const attempts = [createConsegna(input, actor), createConsegna(payload(id('race')), actor)];
  const rejection = Promise.all(
    attempts.map((attempt) => assert.rejects(attempt, ConsegnaPatientNotFoundError)),
  );
  try {
    let waiting = false;
    for (let attempt = 0; attempt < 50 && !waiting; attempt++) {
      const rows = await prisma.$queryRaw<Array<{ waiting: boolean }>>(Prisma.sql`
        SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE wait_event_type = 'Lock'
          AND query LIKE '%FOR SHARE OF p%') AS waiting
      `);
      waiting = rows[0].waiting;
      if (!waiting) await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.ok(waiting, 'create/replay must wait for the concurrent ownership transaction');
  } finally {
    unlock();
    await ownership;
  }
  await rejection;
  assert.equal(await prisma.consegnaCreationReceipt.count({ where: { requestId: id('race') } }), 0);
  await prisma.patient.update({ where: { id: patient }, data: { registeredById: actor.id } });
});

test('HTTP retains record envelope, validates requestId and returns explicit conflict/deleted outcomes', async () => {
  const post = (body: unknown) =>
    fetch(`${http.base}/consegne`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    });
  assert.equal(
    (
      await fetch(`${http.base}/consegne`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
    ).status,
    401,
  );
  const input = payload(id('http'));
  const response = await post(input);
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const created = await response.json();
  assert.equal(created.requestId, input.requestId);
  assert.equal(created.pazienteId, patient);
  assert.equal((await (await post(input)).json()).replayed, true);
  const conflict = await post({ ...input, note: 'Changed payload' });
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).code, 'consegna_request_conflict');
  assert.equal(
    (await fetch(`${http.base}/consegne/${created.id}`, { method: 'DELETE', headers: headers() }))
      .status,
    204,
  );
  const deleted = await post(input);
  assert.equal(deleted.status, 410);
  const body = await deleted.json();
  assert.deepEqual(Object.keys(body).sort(), [
    'code',
    'consegnaId',
    'error',
    'pazienteId',
    'requestId',
  ]);
  assert.equal(body.consegnaId, created.id);
  for (const requestId of ['', null, [], '../wrong', 'x'.repeat(129)])
    assert.equal((await post({ ...input, requestId })).status, 400);
});
