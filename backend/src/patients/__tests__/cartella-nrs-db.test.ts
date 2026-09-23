import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { prisma } from '../../lib/prisma.js';
import { saveCartella } from '../cartella-update.js';
import { actor, patient, second, foreign, seed } from '../../assessments/__tests__/fixture.js';
before(seed);
after(() => prisma.$disconnect());
const legacy = [
  { id: 'zero', dolore: 0, note: '  Originale\nΩ  ' },
  { id: 'invalid', dolore: -1 },
  { id: 'missing' },
];
const tinetti = [{ id: 'old-tinetti', alzarsi: -1 }];
const read = (patientId = patient) => prisma.cartella.findUniqueOrThrow({ where: { patientId } });
const denied = (error: any) => error.status === 409 && error.code === 'nrs_legacy_read_only';

test('NRS omission/equality preserves both histories while vital-sign NRS remains writable', async () => {
  await prisma.cartella.update({
    where: { patientId: patient },
    data: { data: { valutazioniNRS: legacy, valutazioniTinetti: tinetti } },
  });
  const vital = [{ id: 'vital-nrs', etichetta: 'NRS', valore: '7' }];
  await saveCartella(patient, { parametriVitali: vital, ordinary: 'allowed' }, actor);
  assert.deepEqual((await read()).data, {
    valutazioniNRS: legacy,
    valutazioniTinetti: tinetti,
    parametriVitali: vital,
    ordinary: 'allowed',
  });
  await saveCartella(
    patient,
    {
      valutazioniNRS: legacy.map((row) => Object.fromEntries(Object.entries(row).reverse())),
      valutazioniTinetti: tinetti,
      note: 'equal',
    },
    actor,
  );
  const before = (await read()).data;
  for (const changed of [[], null, [...legacy].reverse(), [{ id: 'zero', dolore: 1 }]]) {
    await assert.rejects(
      saveCartella(patient, { valutazioniNRS: changed, note: 'reject atomically' }, actor),
      denied,
    );
    assert.deepEqual((await read()).data, before);
  }
  await assert.rejects(
    saveCartella(patient, { valutazioniTinetti: [] }, actor),
    (error: any) => error.code === 'tinetti_legacy_read_only',
  );
});

test('absent/null/empty remain distinct and out-of-scope writes are rejected', async () => {
  await saveCartella(second, { note: 'no NRS' }, actor);
  for (const value of [null, []])
    await assert.rejects(saveCartella(second, { valutazioniNRS: value }, actor), denied);
  assert(!Object.hasOwn((await read(second)).data as object, 'valutazioniNRS'));
  for (const stored of [null, []]) {
    await prisma.cartella.update({
      where: { patientId: second },
      data: { data: { valutazioniNRS: stored } },
    });
    await saveCartella(second, { note: 'omitted' }, actor);
    assert.deepEqual((await read(second)).data, { note: 'omitted', valutazioniNRS: stored });
    await saveCartella(second, { valutazioniNRS: stored }, actor);
    await assert.rejects(
      saveCartella(second, { valutazioniNRS: stored === null ? [] : null }, actor),
      denied,
    );
  }
  await assert.rejects(
    saveCartella(foreign, { note: 'forbidden' }, actor),
    (error: any) => error.status === 404,
  );
});

test('NRS comparison reads the locked latest history before permitting an update', async () => {
  await prisma.cartella.update({
    where: { patientId: patient },
    data: { data: { valutazioniNRS: legacy } },
  });
  let locked!: () => void, release!: () => void;
  const ready = new Promise<void>((resolve) => {
    locked = resolve;
  });
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  const newer = [...legacy, { id: 'concurrent', dolore: 9 }];
  const writer = prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Patient" WHERE id=${patient} FOR UPDATE`;
    await tx.cartella.update({
      where: { patientId: patient },
      data: { data: { valutazioniNRS: newer } },
    });
    locked();
    await barrier;
  });
  await ready;
  const stale = saveCartella(patient, { valutazioniNRS: legacy, note: 'must not persist' }, actor);
  const rejection = assert.rejects(stale, denied);
  try {
    let waiting = false;
    for (let attempt = 0; attempt < 100 && !waiting; attempt++) {
      const rows = await prisma.$queryRaw<Array<{ waiting: boolean }>>`
        SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%FOR UPDATE OF p%') AS waiting`;
      waiting = rows[0].waiting;
      if (!waiting) await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert(waiting, 'stale PUT must wait for the patient lock');
  } finally {
    release();
  }
  await writer;
  await rejection;
  assert.deepEqual((await read()).data, { valutazioniNRS: newer });
});
