import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { prisma } from '../../lib/prisma.js';
import { saveCartella } from '../cartella-update.js';
import {
  actor,
  other,
  patient,
  second,
  foreign,
  seed,
} from '../../assessments/__tests__/fixture.js';
import { tinettiAnswers } from '../../assessments/__tests__/tinetti-fixture.js';
before(seed);
after(() => prisma.$disconnect());
const legacy = [
  {
    id: 'original',
    data: '1999-12-31',
    createdAt: '1999-12-31',
    operatore: 'Nome precedente',
    ...tinettiAnswers(),
  },
  { id: 'incomplete', data: '2001-01-01', alzarsi: -1, note: 'Testo conservato' },
];
const read = () => prisma.cartella.findUniqueOrThrow({ where: { patientId: patient } });
const denied = (error: any) => error.status === 409 && error.code === 'tinetti_legacy_read_only';

test('Cartella PUT preserves absent/equal legacy branches and refuses changes atomically', async () => {
  await prisma.cartella.update({
    where: { patientId: patient },
    data: { data: { valutazioniTinetti: legacy, other: 'prima' } },
  });
  await saveCartella(patient, { other: 'dopo', codiceFiscale: 'never-persist' }, actor);
  assert.deepEqual((await read()).data, { valutazioniTinetti: legacy, other: 'dopo' });
  const reordered = legacy.map((record) => Object.fromEntries(Object.entries(record).reverse()));
  await saveCartella(patient, { other: 'chiavi riordinate', valutazioniTinetti: reordered }, actor);
  const before = (await read()).data;
  for (const changed of [
    [],
    null,
    [...legacy].reverse(),
    [{ ...legacy[0], operatore: 'Inventato' }],
  ]) {
    await assert.rejects(
      saveCartella(patient, { other: 'non salvare', valutazioniTinetti: changed }, actor),
      denied,
    );
    assert.deepEqual((await read()).data, before);
  }
  assert.deepEqual(legacy[1], {
    id: 'incomplete',
    data: '2001-01-01',
    alzarsi: -1,
    note: 'Testo conservato',
  });
});
test('missing/null/empty stay distinct and denied scope cannot write a cartella', async () => {
  await saveCartella(second, { note: 'prima cartella' }, actor);
  await assert.rejects(saveCartella(second, { valutazioniTinetti: [] }, actor), denied);
  assert.deepEqual(
    (await prisma.cartella.findUniqueOrThrow({ where: { patientId: second } })).data,
    { note: 'prima cartella' },
  );
  await prisma.cartella.update({
    where: { patientId: second },
    data: { data: { valutazioniTinetti: null } },
  });
  assert.deepEqual((await saveCartella(second, { note: 'null preservato' }, actor)).data, {
    note: 'null preservato',
    valutazioniTinetti: null,
  });
  await assert.rejects(
    saveCartella(foreign, { note: 'no' }, actor),
    (error: any) => error.status === 404,
  );
  await assert.rejects(saveCartella(second, [], actor), (error: any) => error.status === 400);
});
async function waitForLock(fragment: string) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const rows = await prisma.$queryRaw<Array<{ waiting: boolean }>>`
      SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE ${`%${fragment}%`}) AS waiting`;
    if (rows[0].waiting) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Expected the service to wait for the database lock');
}
test('locked latest legacy and patient ownership defeat stale PUT and scope races', async () => {
  await prisma.cartella.update({
    where: { patientId: patient },
    data: { data: { valutazioniTinetti: legacy } },
  });
  let locked!: () => void, release!: () => void;
  const ready = new Promise<void>((resolve) => (locked = resolve)),
    gate = new Promise<void>((resolve) => (release = resolve));
  const blocker = prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT data FROM "Cartella" WHERE "patientId"=${patient} FOR UPDATE`;
    locked();
    await gate;
    await tx.cartella.update({
      where: { patientId: patient },
      data: { data: { valutazioniTinetti: [...legacy, { id: 'concurrent-existing' }] } },
    });
  });
  await ready;
  const stale = saveCartella(patient, { valutazioniTinetti: legacy, note: 'stale' }, actor);
  const rejection = assert.rejects(stale, denied);
  try {
    await waitForLock('SELECT data FROM "Cartella"');
  } finally {
    release();
  }
  await blocker;
  await rejection;
  assert.deepEqual((await read()).data, {
    valutazioniTinetti: [...legacy, { id: 'concurrent-existing' }],
  });

  let scopeLocked!: () => void, scopeRelease!: () => void;
  const scopeReady = new Promise<void>((resolve) => (scopeLocked = resolve)),
    scopeGate = new Promise<void>((resolve) => (scopeRelease = resolve));
  const scopeBlocker = prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Patient" WHERE id=${patient} FOR UPDATE`;
    scopeLocked();
    await scopeGate;
    await tx.patient.update({ where: { id: patient }, data: { registeredById: other.id } });
  });
  await scopeReady;
  const scopeRejected = assert.rejects(
    saveCartella(patient, { note: 'forbidden stale scope' }, actor),
    (error: any) => error.status === 404,
  );
  try {
    await waitForLock('SELECT p.id FROM "Patient" p');
  } finally {
    scopeRelease();
  }
  await scopeBlocker;
  await scopeRejected;
  assert.deepEqual((await read()).data, {
    valutazioniTinetti: [...legacy, { id: 'concurrent-existing' }],
  });
});
