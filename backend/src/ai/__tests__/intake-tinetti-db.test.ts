import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { prisma } from '../../lib/prisma.js';
import { confirmJob } from '../upload/confirm-service.js';
import { actor, patient, seed } from '../../assessments/__tests__/fixture.js';
before(seed);
after(() => prisma.$disconnect());
const job = () =>
  prisma.importJob.create({
    data: {
      status: 'review_ready',
      createdById: actor.id,
      maxFiles: 5,
      maxTotalBytes: 5_000_000,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
const identity = {
  firstName: 'Import Tinetti',
  lastName: 'Sintetico',
  dateOfBirth: '1970-01-01',
  phone: '+39 333 000 0000',
};
const denied = (error: any) => error.status === 409 && error.code === 'tinetti_legacy_read_only';
test('existing import rejects altered history without confirming, then omission retries safely and idempotently', async () => {
  const legacy = [
    {
      id: 'historical',
      data: '1999-12-31',
      operatore: 'Nome storico',
      alzarsi: -1,
      note: 'A capo\nConservato',
    },
  ];
  await prisma.cartella.update({
    where: { patientId: patient },
    data: { data: { valutazioniTinetti: legacy, ordinary: 'prima' } },
  });
  const importJob = await job();
  const input = { patient: identity, mode: 'existing' as const, patientId: patient };
  await assert.rejects(
    confirmJob(
      importJob.id,
      { ...input, cartella: { ordinary: 'non salvare', valutazioniTinetti: [{ id: 'invented' }] } },
      actor,
    ),
    denied,
  );
  const pending = await prisma.importJob.findUniqueOrThrow({ where: { id: importJob.id } });
  assert.equal(pending.status, 'review_ready');
  assert.equal(pending.createdPatientId, null);
  assert.equal(pending.confirmedAt, null);
  assert.deepEqual(
    (await prisma.cartella.findUniqueOrThrow({ where: { patientId: patient } })).data,
    { valutazioniTinetti: legacy, ordinary: 'prima' },
  );
  const retried = await confirmJob(
    importJob.id,
    { ...input, cartella: { ordinary: 'dopo' } },
    actor,
  );
  assert.equal(retried.status, 'updated');
  assert.equal((await confirmJob(importJob.id, input, actor)).status, 'idempotent');
  const saved = (await prisma.cartella.findUniqueOrThrow({ where: { patientId: patient } }))
    .data as any;
  assert.deepEqual(saved.valutazioniTinetti, legacy);
  assert.equal(saved.ordinary, 'dopo');
  const equalJob = await job();
  const reordered = legacy.map((row) => Object.fromEntries(Object.entries(row).reverse()));
  await confirmJob(equalJob.id, { ...input, cartella: { valutazioniTinetti: reordered } }, actor);
  assert.deepEqual(
    ((await prisma.cartella.findUniqueOrThrow({ where: { patientId: patient } })).data as any)
      .valutazioniTinetti,
    legacy,
  );
});
test('new-patient import cannot inject historical assessments and empty defaults leave the branch absent', async () => {
  const importJob = await job();
  const count = await prisma.patient.count();
  await assert.rejects(
    confirmJob(
      importJob.id,
      { patient: identity, cartella: { valutazioniTinetti: [{ id: 'invented', alzarsi: 2 }] } },
      actor,
    ),
    denied,
  );
  assert.equal(await prisma.patient.count(), count);
  assert.equal(
    (await prisma.importJob.findUniqueOrThrow({ where: { id: importJob.id } })).status,
    'review_ready',
  );
  const result = await confirmJob(
    importJob.id,
    { patient: identity, cartella: { valutazioniTinetti: [], ordinary: 'import normale' } },
    actor,
  );
  assert.equal(result.status, 'created');
  const saved = (
    await prisma.cartella.findUniqueOrThrow({ where: { patientId: result.patient!.id } })
  ).data as any;
  assert.equal(saved.ordinary, 'import normale');
  assert(!Object.hasOwn(saved, 'valutazioniTinetti'));
  assert.equal(
    (await prisma.importJob.findUniqueOrThrow({ where: { id: importJob.id } })).status,
    'confirmed',
  );
});
