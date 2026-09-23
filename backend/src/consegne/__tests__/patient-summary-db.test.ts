import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { prisma } from '../../lib/prisma.js';
import { loadConsegnaPatientSummary } from '../patient-summary.js';
import {
  actor,
  other,
  manager,
  patient,
  foreign,
  zero,
  history,
  id,
  headers,
  seed,
  clean,
  httpServer,
} from './po08-fixture.js';

let http: Awaited<ReturnType<typeof httpServer>>;
before(async () => {
  await seed();
  http = await httpServer();
  const row = (
    key: string,
    pazienteId: string,
    creatoDaId: string,
    operatoreAssegnatoId: string | null,
    stato = 'aperta',
    priorita = 'normale',
  ) => ({
    id: id(key),
    pazienteId,
    pazienteNome: 'Synthetic visible name',
    creatoDaId,
    operatoreAssegnatoId,
    creatoDA: 'Author',
    operatoreAssegnato: 'Assignee',
    stato,
    priorita,
    note: 'private-note',
    scadenza: '2026-09-23',
  });
  await prisma.consegna.createMany({
    data: [
      row('own-open', patient, actor.id, actor.id),
      row('assigned-urgent', patient, other.id, actor.id, 'in_corso', 'urgente'),
      row('own-completed', patient, actor.id, null, 'completata', 'urgente'),
      row('hidden', patient, other.id, other.id, 'aperta', 'urgente'),
      row('foreign-visible', foreign, other.id, actor.id, 'aperta', 'urgente'),
      row('zero-hidden', zero, other.id, other.id),
      row('history-only', history, actor.id, null, 'completata'),
    ],
  });
});
after(async () => {
  await http.close();
  await clean();
});

test('summary intersects patient scope and handover visibility while preserving visible zeros/history', async () => {
  const result = await loadConsegnaPatientSummary(
    { patientIds: [patient, foreign, zero, history, id('missing'), patient] },
    actor,
  );
  const items = new Map(result.items.map((row) => [row.patientId, row]));
  assert.equal(items.size, 3);
  assert.deepEqual(items.get(patient), {
    patientId: patient,
    total: 3,
    open: 2,
    urgentOpen: 1,
    statoRicovero: 'dimesso',
  });
  assert.deepEqual(items.get(zero), {
    patientId: zero,
    total: 0,
    open: 0,
    urgentOpen: 0,
    statoRicovero: null,
  });
  assert.deepEqual(items.get(history), {
    patientId: history,
    total: 1,
    open: 0,
    urgentOpen: 0,
    statoRicovero: null,
  });
  assert.equal(items.has(foreign), false);
  assert.doesNotMatch(
    JSON.stringify(result),
    /private-note|private-clinical|pazienteNome|medicalRecordNumber/,
  );
});

test('global role sees all requested patient counts; other operator sees only their patient', async () => {
  const ids = { patientIds: [patient, foreign, zero] };
  const global = await loadConsegnaPatientSummary(ids, manager);
  assert.equal(global.items.length, 3);
  assert.equal(global.items.find((row) => row.patientId === patient)!.total, 4);
  assert.equal(global.items.find((row) => row.patientId === patient)!.urgentOpen, 2);
  const scoped = await loadConsegnaPatientSummary(ids, other);
  assert.deepEqual(
    scoped.items.map((row) => row.patientId),
    [foreign],
  );
});

test('HTTP summary is private, bounded and rejects malformed IDs without leaking inaccessible patient existence', async () => {
  const post = (body: unknown, who = actor) =>
    fetch(`${http.base}/consegne/patient-summary`, {
      method: 'POST',
      headers: headers(who),
      body: JSON.stringify(body),
    });
  assert.equal(
    (await fetch(`${http.base}/consegne/patient-summary`, { method: 'POST' })).status,
    401,
  );
  const response = await post({ patientIds: [patient, foreign] });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(
    (await response.json()).items.map((row: { patientId: string }) => row.patientId),
    [patient],
  );
  assert.deepEqual(await (await post({ patientIds: [foreign, id('missing')] })).json(), {
    items: [],
  });
  for (const body of [
    null,
    [],
    {},
    { patientIds: [] },
    { patientIds: patient },
    { patientIds: ['../outside'] },
    { patientIds: [null] },
    { patientIds: Array(51).fill(patient) },
    { patientIds: [patient], operatorId: other.id },
  ])
    assert.equal((await post(body)).status, 400);
  assert.equal((await post({ patientIds: Array(50).fill(patient) })).status, 200);
});

test('summary reads one minimal statement and never turns database failures into zero counts', async () => {
  const original = prisma.$queryRaw;
  const calls: Array<{ text: string }> = [];
  prisma.$queryRaw = ((sql: { text: string }) => {
    calls.push(sql);
    return original.call(prisma, sql as any);
  }) as typeof prisma.$queryRaw;
  try {
    await loadConsegnaPatientSummary({ patientIds: [patient, zero, history] }, actor);
    assert.equal(calls.length, 1);
    assert.doesNotMatch(
      calls[0].text,
      /SELECT\s+\*|SELECT\s+chart\.data|parametriMensili|anamnesi/,
    );
    prisma.$queryRaw = (() => {
      throw new Error('Synthetic summary failure');
    }) as typeof prisma.$queryRaw;
    await assert.rejects(
      loadConsegnaPatientSummary({ patientIds: [patient] }, actor),
      /Synthetic summary failure/,
    );
    const failure = await fetch(`${http.base}/consegne/patient-summary`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ patientIds: [patient] }),
    });
    assert.equal(failure.status, 500);
    assert.equal('items' in (await failure.json()), false);
  } finally {
    prisma.$queryRaw = original;
  }
});
