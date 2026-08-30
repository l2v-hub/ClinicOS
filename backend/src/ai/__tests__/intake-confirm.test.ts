// backend/src/ai/__tests__/intake-confirm.test.ts
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createDraft, patchDraft } from '../../intake/draft-service.js';
import { confirmDraft } from '../upload/confirm-service.js';
import { prisma } from '../../lib/prisma.js';
import { createTestOperator } from '../../test-support/operator-fixture.js';

const TEST_OPERATOR_ID = 'TEST-OWNER-INTAKE-CONFIRM';
let cleanupOperator: () => Promise<void>;

before(async () => {
  cleanupOperator = await createTestOperator(
    TEST_OPERATOR_ID,
    'test-owner-intake-confirm@clinicos.test',
  );
});

after(async () => cleanupOperator());

test('confirmDraft creates patient transactionally + is idempotent', async () => {
  const d = await createDraft({ createdById: TEST_OPERATOR_ID, source: 'manual' });
  await patchDraft(d.id, {
    anagrafica: { nome: 'IntakeMock', cognome: 'Sintetico', dataNascita: '1970-01-01' },
  });
  const payload = {
    // #294: CF sintetico valido — obbligatorio per ogni creazione paziente.
    patient: {
      firstName: 'IntakeMock',
      lastName: 'Sintetico',
      dateOfBirth: '1970-01-01',
      codiceFiscale: 'NTKSNT70A01H501G',
    },
    cartella: { statoRicovero: 'ricoverato' },
    confirmDuplicate: true,
  };
  const r1 = await confirmDraft(d.id, payload as any, { id: TEST_OPERATOR_ID });
  assert.equal(r1.status, 'created');
  // Simulate a patient created before ownership was introduced; replay must repair it.
  await prisma.patient.update({
    where: { id: r1.patient!.id },
    data: { registeredById: null },
  });
  const r2 = await confirmDraft(d.id, payload as any, { id: TEST_OPERATOR_ID }); // replay
  assert.equal(r2.status, 'idempotent');
  assert.equal(r2.patient!.id, r1.patient!.id);
  const persisted = await prisma.patient.findUniqueOrThrow({ where: { id: r1.patient!.id } });
  assert.equal(persisted.registeredById, TEST_OPERATOR_ID);
  // cleanup
  await prisma.cartella.deleteMany({ where: { patientId: r1.patient!.id } }).catch(() => {});
  await prisma.patient.delete({ where: { id: r1.patient!.id } }).catch(() => {});
  await prisma.patientIntakeDraft.delete({ where: { id: d.id } }).catch(() => {});
});

test('confirmDraft falls back to the authenticated operator when a legacy owner is stale', async () => {
  const d = await createDraft({ createdById: 'DELETED-LEGACY-OPERATOR', source: 'manual' });
  const result = await confirmDraft(
    d.id,
    {
      patient: {
        firstName: 'LegacyOwner',
        lastName: 'Fallback',
        dateOfBirth: '1972-02-02',
        codiceFiscale: 'LGCFLB72B02H501R',
      },
      confirmDuplicate: true,
    },
    { id: TEST_OPERATOR_ID },
  );

  assert.equal(result.status, 'created');
  const patientId = result.patient!.id;
  const persisted = await prisma.patient.findUniqueOrThrow({ where: { id: patientId } });
  assert.equal(persisted.registeredById, TEST_OPERATOR_ID);

  await prisma.cartella.deleteMany({ where: { patientId } }).catch(() => {});
  await prisma.patient.delete({ where: { id: patientId } }).catch(() => {});
  await prisma.patientIntakeDraft.delete({ where: { id: d.id } }).catch(() => {});
});

test('confirmJob assigns a legacy ownerless job to the authenticated operator', async () => {
  const job = await prisma.importJob.create({
    data: {
      status: 'review_ready',
      maxFiles: 5,
      maxTotalBytes: 5_000_000,
      expiresAt: new Date(Date.now() + 60_000),
      createdById: null,
    },
  });
  const { confirmJob } = await import('../upload/confirm-service.js');
  const result = await confirmJob(
    job.id,
    {
      patient: {
        firstName: 'OwnerlessJob',
        lastName: 'Fallback',
        dateOfBirth: '1973-03-03',
        codiceFiscale: 'WNRJFL73C03H501Y',
      },
      confirmDuplicate: true,
    },
    { id: TEST_OPERATOR_ID },
  );

  assert.equal(result.status, 'created');
  const patientId = result.patient!.id;
  const persisted = await prisma.patient.findUniqueOrThrow({ where: { id: patientId } });
  assert.equal(persisted.registeredById, TEST_OPERATOR_ID);

  await prisma.importAudit.deleteMany({ where: { jobId: job.id } }).catch(() => {});
  await prisma.cartella.deleteMany({ where: { patientId } }).catch(() => {});
  await prisma.patient.delete({ where: { id: patientId } }).catch(() => {});
  await prisma.importJob.delete({ where: { id: job.id } }).catch(() => {});
});

// #294: il CF è la chiave univoca — la conferma senza CF valido è bloccata; un CF già
// presente è un duplicato certo, non forzabile con confirmDuplicate.
test('confirmDraft: blocks a missing CF and a duplicate CF (not forcible)', async () => {
  const base = {
    firstName: 'IntakeMock',
    lastName: 'Sintetico',
    dateOfBirth: '1970-01-01',
  };

  // 1) Missing CF → hard block, nothing persisted.
  const d1 = await createDraft({ createdById: TEST_OPERATOR_ID, source: 'manual' });
  await assert.rejects(
    () =>
      confirmDraft(d1.id, { patient: base, confirmDuplicate: true } as any, {
        id: TEST_OPERATOR_ID,
      }),
    (err: Error) => err.message.includes('Codice fiscale mancante o non valido'),
  );
  const afterBlock = await prisma.patientIntakeDraft.findUnique({ where: { id: d1.id } });
  assert.equal(afterBlock?.status, 'draft');

  // 2) Duplicate CF → hard conflict even with confirmDuplicate (different name/dob,
  // so only the CF key can flag it).
  const cf = 'NTKSNT70A01H501G';
  const d2 = await createDraft({ createdById: TEST_OPERATOR_ID, source: 'manual' });
  const first = await confirmDraft(
    d2.id,
    {
      patient: { ...base, codiceFiscale: cf },
    } as any,
    { id: TEST_OPERATOR_ID },
  );
  assert.equal(first.status, 'created');

  const d3 = await createDraft({ createdById: TEST_OPERATOR_ID, source: 'manual' });
  await assert.rejects(
    () =>
      confirmDraft(
        d3.id,
        {
          patient: {
            firstName: 'Altro',
            lastName: 'Omonimo',
            dateOfBirth: '1980-05-05',
            codiceFiscale: ` ${cf.toLowerCase()} `, // normalization must still match
          },
          confirmDuplicate: true,
        } as any,
        { id: TEST_OPERATOR_ID },
      ),
    (err: Error) => err.message.includes('Codice fiscale già presente'),
  );

  // cleanup
  const pid = first.patient!.id;
  await prisma.cartella.deleteMany({ where: { patientId: pid } }).catch(() => {});
  await prisma.patient.delete({ where: { id: pid } }).catch(() => {});
  for (const draftId of [d1.id, d2.id, d3.id])
    await prisma.patientIntakeDraft.delete({ where: { id: draftId } }).catch(() => {});
});
