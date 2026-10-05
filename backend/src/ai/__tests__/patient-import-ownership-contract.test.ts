import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { confirmDraft, confirmJob } from '../upload/confirm-service.js';
import { createTestOperator } from '../../test-support/operator-fixture.js';

const ownerId = `IMPORT-OWNER-${randomUUID()}`;
const managerId = `IMPORT-MANAGER-${randomUUID()}`;
let cleanup: Array<() => Promise<void>>;
before(async () => {
  cleanup = await Promise.all(
    [ownerId, managerId].map((id) => createTestOperator(id, `${id}@clinicos.test`)),
  );
});
after(async () => {
  for (const close of cleanup) await close();
  await prisma.$disconnect();
});

for (const first of ['draft', 'job'] as const) {
  test(`linked import confirmation through ${first} attributes ownership and replays across both entry points`, async () => {
    const job = await prisma.importJob.create({
      data: {
        status: 'review_ready',
        maxFiles: 5,
        maxTotalBytes: 5_000_000,
        expiresAt: new Date(Date.now() + 60_000),
        createdById: ownerId,
      },
    });
    const draft = await prisma.patientIntakeDraft.create({
      data: { source: 'import', importJobId: job.id, createdById: ownerId, data: {} },
    });
    const payload = {
      patient: {
        firstName: 'Synthetic',
        lastName: `Linked-${first}`,
        dateOfBirth: '1970-01-01',
        phone: '+39 333 000 0000',
        codiceFiscale: first === 'draft' ? 'LNKDRF70A01H501V' : 'LNKJOB70A01H501A',
      },
      cartella: { codiceFiscale: 'FORGED-CLINICAL-CF', statoRicovero: 'ricoverato' },
      therapies: [
        {
          farmacoNome: `Synthetic-${job.id}`,
          dataInizio: '2026-06-29',
          viaSomministrazione: 'orale',
          schedules: [
            {
              time: '08:00',
              quantityNumerator: 1,
              quantityDenominator: 1,
              administrationUnit: 'compressa',
            },
          ],
        },
      ],
      confirmDuplicate: true,
    };
    const actor =
      first === 'draft' ? { id: ownerId, role: 'operatore' } : { id: managerId, role: 'manager' };
    let patientId: string | undefined;
    try {
      const result =
        first === 'draft'
          ? await confirmDraft(draft.id, payload, actor)
          : await confirmJob(job.id, payload, actor);
      assert.equal(result.status, 'created');
      patientId = result.patient!.id;
      assert.equal(
        (await prisma.patient.findUniqueOrThrow({ where: { id: patientId } })).registeredById,
        ownerId,
      );
      assert.equal(
        (await prisma.patient.findUniqueOrThrow({ where: { id: patientId } })).codiceFiscale,
        payload.patient.codiceFiscale,
      );
      const clinical = await prisma.cartella.findUniqueOrThrow({ where: { patientId } });
      assert.equal(Object.hasOwn(clinical.data as object, 'codiceFiscale'), false);
      assert.equal(
        (await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: draft.id } }))
          .confirmedPatientId,
        patientId,
      );
      assert.equal(
        (await prisma.importJob.findUniqueOrThrow({ where: { id: job.id } })).createdPatientId,
        patientId,
      );
      await prisma.patient.update({ where: { id: patientId }, data: { registeredById: null } });
      const replay =
        first === 'draft'
          ? await confirmJob(job.id, payload, actor)
          : await confirmDraft(draft.id, payload, actor);
      assert.equal(replay.status, 'idempotent');
      assert.equal(replay.patient!.id, patientId);
      assert.equal(
        (await prisma.patient.findUniqueOrThrow({ where: { id: patientId } })).registeredById,
        ownerId,
      );
      assert.equal(
        await prisma.patient.count({ where: { codiceFiscale: payload.patient.codiceFiscale } }),
        1,
      );
      assert.equal(await prisma.patientTherapy.count({ where: { patientId } }), 1);
    } finally {
      await prisma.patientIntakeDraft.delete({ where: { id: draft.id } });
      await prisma.importJob.delete({ where: { id: job.id } });
      if (patientId) await prisma.patient.delete({ where: { id: patientId } });
    }
  });
}
