import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import {
  patientIntakeReview,
  LEGACY_PAIN_MAX_BYTES,
  LEGACY_PAIN_TOO_LARGE,
} from '../patient-review.js';
import { confirmJob } from '../../ai/upload/confirm-service.js';
import { actor, other, patient, foreign, seed } from '../../assessments/__tests__/fixture.js';
before(seed);
after(() => prisma.$disconnect());
const therapy = {
  excludedFromConfirm: true,
  farmacoNome: 'Farmaco da verificare',
  originalText: 'Terapia originale\nConservata',
};
const newPatient = async () => {
  const id = randomUUID();
  await prisma.patient.create({
    data: {
      id,
      medicalRecordNumber: id,
      firstName: 'Review',
      lastName: 'Sintetico',
      registeredById: actor.id,
    },
  });
  return id;
};
const draft = (
  patientId: string,
  data: Prisma.InputJsonObject,
  extra: Record<string, unknown> = {},
) =>
  prisma.patientIntakeDraft.create({
    data: {
      source: 'manual',
      createdById: actor.id,
      status: 'confirmed',
      confirmedPatientId: patientId,
      confirmedAt: new Date('2026-04-01T10:00:00.000Z'),
      data,
      ...extra,
    },
  });

test('confirmed pain retains original JSON/presence and never exposes other patients or pending drafts', async () => {
  const values = [null, false, 0, [], { nrs: -1, note: 'Originale\nΩ' }, 'dato precedente'];
  const expected = [];
  for (const pain of values)
    expected.push(await draft(patient, { dolore: pain, terapiaImport: [therapy] }));
  const noDate = await draft(patient, { dolore: { legacy: true } }, { confirmedAt: null });
  expected.push(noDate);
  await draft(patient, { terapiaImport: [therapy] });
  await draft(
    patient,
    { dolore: 'pending-hidden' },
    { status: 'draft', confirmedPatientId: null, confirmedAt: null },
  );
  await draft(foreign, { dolore: 'foreign-hidden' });
  const before = await prisma.patientIntakeDraft.findMany({
    where: { confirmedPatientId: patient },
    orderBy: { id: 'asc' },
  });
  const result = await patientIntakeReview(patient, actor);
  assert.equal(result.legacyPainError, null);
  assert.equal(result.legacyPainDrafts!.length, values.length + 1);
  for (const saved of expected) {
    const row = result.legacyPainDrafts!.find((row) => row.draftId === saved.id)!;
    assert.deepEqual(row.pain, (saved.data as any).dolore);
    assert.equal(row.confirmedAt, saved.confirmedAt?.toISOString() ?? null);
  }
  assert.equal(result.legacyPainDrafts!.at(-1)!.draftId, noDate.id);
  assert.equal(result.deferredTherapies.length, values.length + 1);
  assert(!JSON.stringify(result).includes('pending-hidden'));
  assert(!JSON.stringify(result).includes('foreign-hidden'));
  assert.deepEqual(
    await prisma.patientIntakeDraft.findMany({
      where: { confirmedPatientId: patient },
      orderBy: { id: 'asc' },
    }),
    before,
  );
  await assert.rejects(patientIntakeReview(patient, other), (error: any) => error.status === 404);
  await assert.rejects(patientIntakeReview(foreign, actor), (error: any) => error.status === 404);
});

test('count limit admits exactly100 and returns a distinct error at101 while preserving therapies', async () => {
  const patientId = await newPatient();
  assert.deepEqual((await patientIntakeReview(patientId, actor)).legacyPainDrafts, []);
  await prisma.patientIntakeDraft.createMany({
    data: Array.from({ length: 100 }, () => ({
      source: 'manual',
      createdById: actor.id,
      status: 'confirmed',
      confirmedPatientId: patientId,
      confirmedAt: new Date(),
      data: { dolore: null },
    })),
  });
  assert.equal((await patientIntakeReview(patientId, actor)).legacyPainDrafts!.length, 100);
  await draft(patientId, { dolore: false, terapiaImport: [therapy] });
  const result = await patientIntakeReview(patientId, actor);
  assert.equal(result.legacyPainDrafts, null);
  assert.equal(result.legacyPainError, LEGACY_PAIN_TOO_LARGE);
  assert.equal(result.deferredTherapies[0].notes, therapy.originalText);
  assert.equal(
    await prisma.patientIntakeDraft.count({ where: { confirmedPatientId: patientId } }),
    101,
  );
});

test('UTF-8 JSON byte limit includes quotes and overflow never materializes pain in therapy projection', async () => {
  const patientId = await newPatient();
  const pain = 'é'.repeat((LEGACY_PAIN_MAX_BYTES - 2) / 2);
  const saved = await draft(patientId, { dolore: pain, terapiaImport: [therapy] });
  const allowed = await patientIntakeReview(patientId, actor);
  assert.equal(allowed.legacyPainDrafts![0].pain, pain);
  await prisma.patientIntakeDraft.update({
    where: { id: saved.id },
    data: { data: { dolore: pain + 'a', terapiaImport: [therapy] } },
  });
  const transaction = prisma.$transaction.bind(prisma),
    materialized: any[] = [];
  (prisma as any).$transaction = (action: any, options: any) =>
    transaction(
      async (tx: any) =>
        action(
          new Proxy(tx, {
            get(target, key) {
              if (key === '$queryRaw')
                return async (...args: unknown[]) => {
                  const result = await target.$queryRaw(...args);
                  materialized.push(result);
                  return result;
                };
              const value = target[key];
              return typeof value === 'function' ? value.bind(target) : value;
            },
          }),
        ),
      options,
    );
  let result;
  try {
    result = await patientIntakeReview(patientId, actor);
  } finally {
    (prisma as any).$transaction = transaction;
  }
  assert.equal(result.legacyPainDrafts, null);
  assert.equal(result.legacyPainError, LEGACY_PAIN_TOO_LARGE);
  assert.equal(result.deferredTherapies[0].notes, therapy.originalText);
  assert.equal(
    materialized.length,
    3,
    'scope lock, therapy projection and budget only: no pain SELECT',
  );
  assert(!Object.hasOwn(materialized[1][0].data, 'dolore'));
  assert.equal(
    ((await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: saved.id } })).data as any)
      .dolore,
    pain + 'a',
  );
});

test('repeatable snapshot survives historical reconciliation between budget and pain read', async () => {
  const patientId = await newPatient();
  await prisma.patientIntakeDraft.createMany({
    data: Array.from({ length: 100 }, (_, index) => ({
      source: 'manual',
      createdById: actor.id,
      status: 'confirmed',
      confirmedPatientId: patientId,
      confirmedAt: new Date(),
      data: { dolore: index, ...(index === 0 ? { terapiaImport: [therapy] } : {}) },
    })),
  });
  const job = await prisma.importJob.create({
    data: {
      status: 'confirmed',
      createdById: actor.id,
      createdPatientId: patientId,
      confirmedAt: new Date(),
      maxFiles: 5,
      maxTotalBytes: 5_000_000,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  const historical = await prisma.patientIntakeDraft.create({
    data: {
      source: 'import',
      createdById: actor.id,
      importJobId: job.id,
      data: { dolore: { nrs: 10 } },
    },
  });
  let reached!: () => void, release!: () => void;
  const budgetReached = new Promise<void>((resolve) => {
    reached = resolve;
  });
  const resume = new Promise<void>((resolve) => {
    release = resolve;
  });
  const transaction = prisma.$transaction.bind(prisma);
  (prisma as any).$transaction = (action: any, options: any) => {
    if (options?.isolationLevel !== Prisma.TransactionIsolationLevel.RepeatableRead)
      return transaction(action, options);
    return transaction(
      async (tx: any) =>
        action(
          new Proxy(tx, {
            get(target, key) {
              if (key === '$queryRaw')
                return async (...args: any[]) => {
                  const result = await target.$queryRaw(...args);
                  if (
                    Array.isArray(args[0]) &&
                    args[0].join('').includes('COUNT(*)::bigint AS count')
                  ) {
                    reached();
                    await resume;
                  }
                  return result;
                };
              const value = target[key];
              return typeof value === 'function' ? value.bind(target) : value;
            },
          }),
        ),
      options,
    );
  };
  const reading = patientIntakeReview(patientId, actor);
  try {
    await Promise.race([
      budgetReached,
      reading.then(() => {
        throw new Error('Reader bypassed the snapshot budget barrier');
      }),
    ]);
    const reconciled = await confirmJob(
      job.id,
      { patient: { firstName: 'Review', lastName: 'Sintetico' } },
      actor,
    );
    assert.equal(reconciled.status, 'idempotent');
    assert.equal(
      (await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: historical.id } })).status,
      'confirmed',
    );
  } finally {
    release();
    (prisma as any).$transaction = transaction;
  }
  const result = await reading;
  assert.equal(result.legacyPainError, null);
  assert.equal(result.legacyPainDrafts!.length, 100);
  assert(!result.legacyPainDrafts!.some((row) => row.draftId === historical.id));
  assert.equal(result.deferredTherapies.length, 1);
  const later = await patientIntakeReview(patientId, actor);
  assert.equal(later.legacyPainDrafts, null);
  assert.equal(later.legacyPainError, LEGACY_PAIN_TOO_LARGE);
  assert.equal(later.deferredTherapies.length, 1);
});
