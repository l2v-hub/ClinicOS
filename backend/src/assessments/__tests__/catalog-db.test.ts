import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { prisma } from '../../lib/prisma.js';
import { assessmentCatalog, CATALOG_FORMS } from '../catalog.js';
import { createAssessment, finalizeAssessment } from '../service.js';
import { actor, other, manager, patient, second, foreign, seed, input } from './fixture.js';
import { transfersInput } from './transfers-fixture.js';
import { tinettiInput } from './tinetti-fixture.js';
import { mnaInput } from './mna-fixture.js';
import { gds15Input } from './gds15-fixture.js';
before(seed);
after(() => prisma.$disconnect());
const finish = async (id: string) =>
  (await finalizeAssessment(patient, id, { requestId: randomUUID(), expectedVersion: 1 }, actor))
    .assessment;

test('catalog is exactly five empty metadata rows and rejects query/scope without writes', async () => {
  const before = await prisma.patientAssessment.count();
  assert.deepEqual(await assessmentCatalog(patient, {}, actor), {
    items: CATALOG_FORMS.map((form) => ({
      ...form,
      ownDraftCount: 0,
      latestFinal: null,
      latestOwnDraft: null,
    })),
  });
  assert.throws(
    () => assessmentCatalog(patient, { type: 'painad' }, actor),
    (error: any) => error.status === 400,
  );
  await assert.rejects(assessmentCatalog(patient, {}, other), (error: any) => error.status === 404);
  await assert.rejects(assessmentCatalog(foreign, {}, actor), (error: any) => error.status === 404);
  assert.equal(await prisma.patientAssessment.count(), before);
});

test('all five forms use terminal clinical order and hide colleague drafts', async () => {
  const factories = [input, transfersInput, tinettiInput, mnaInput, gds15Input];
  for (const factory of factories) {
    const original = await finish(
      (await createAssessment(patient, factory({ assessedAt: '2026-03-25T09:00:00.000Z' }), actor))
        .assessment.id,
    );
    const newer = await finish(
      (await createAssessment(patient, factory({ assessedAt: '2026-03-27T09:00:00.000Z' }), actor))
        .assessment.id,
    );
    const correction = (
      await createAssessment(
        patient,
        factory({
          predecessorId: original.id,
          correctionReason: 'Rettifica tardiva sintetica',
          assessedAt: original.assessedAt,
        }),
        actor,
      )
    ).assessment;
    let row = (await assessmentCatalog(patient, {}, actor)).items.find(
      (row) => row.type === original.type,
    )!;
    assert.equal(row.latestFinal?.id, newer.id);
    assert.equal(row.latestOwnDraft?.id, correction.id);
    await finish(correction.id);
    row = (await assessmentCatalog(patient, {}, actor)).items.find(
      (row) => row.type === original.type,
    )!;
    assert.equal(
      row.latestFinal?.id,
      newer.id,
      'late final correction must not beat newer clinical date',
    );
    assert.equal(row.ownDraftCount, 0);
    const own = (await createAssessment(patient, factory(), actor)).assessment;
    const colleague = (await createAssessment(patient, factory(), manager)).assessment;
    row = (await assessmentCatalog(patient, {}, actor)).items.find(
      (row) => row.type === original.type,
    )!;
    assert.equal(row.ownDraftCount, 1);
    assert.equal(row.latestOwnDraft?.id, own.id);
    assert(!JSON.stringify(row).includes(colleague.id));
    assert.deepEqual(Object.keys(row.latestFinal!).sort(), [
      'assessedAt',
      'createdAt',
      'finalizedAt',
      'formVersion',
      'id',
    ]);
    assert.deepEqual(Object.keys(row.latestOwnDraft!).sort(), [
      'assessedAt',
      'createdAt',
      'formVersion',
      'id',
      'updatedAt',
    ]);
    for (const value of [
      row.latestFinal!.assessedAt,
      row.latestFinal!.createdAt,
      row.latestFinal!.finalizedAt,
      row.latestOwnDraft!.updatedAt,
    ])
      assert.equal(new Date(value).toISOString(), value);
  }
});

test('exact counts exceed history page size; one metadata query returns no clinical JSON', async () => {
  const created = (await createAssessment(second, input(), actor)).assessment;
  const template = await prisma.patientAssessment.findUniqueOrThrow({ where: { id: created.id } });
  const { finalSnapshot: _sqlNullSnapshot, ...draftFields } = template;
  const copies = Array.from({ length: 150 }, () => ({
    ...draftFields,
    id: randomUUID(),
    requestId: randomUUID(),
  }));
  await prisma.patientAssessment.createMany({ data: copies });
  const newestId = [template.id, ...copies.map((row) => row.id)].sort().at(-1);
  const transaction = prisma.$transaction.bind(prisma);
  const queries: unknown[][] = [];
  (prisma as any).$transaction = (action: any, options: any) =>
    transaction(
      async (tx: any) =>
        action(
          new Proxy(tx, {
            get(target, key) {
              if (key === 'patientAssessment')
                throw new Error('Catalog must not materialize assessment entities');
              if (key === '$queryRaw')
                return async (...args: unknown[]) => {
                  const result = await target.$queryRaw(...args);
                  queries.push(result);
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
    result = await assessmentCatalog(second, {}, actor);
  } finally {
    (prisma as any).$transaction = transaction;
  }
  assert.equal(queries.length, 2, 'patient lock plus exactly one metadata query');
  assert.equal(queries[1].length, 5);
  assert.equal(result.items[0].ownDraftCount, 151);
  assert.equal(result.items[0].latestOwnDraft?.id, newestId);
  assert.equal(result.items[0].latestFinal, null);
  const raw = JSON.stringify(queries[1], (_key, value) =>
    typeof value === 'bigint' ? value.toString() : value,
  );
  for (const forbidden of [
    'answers',
    'finalSnapshot',
    'snapshotSha256',
    'authorName',
    'pdfStatus',
    'documentId',
  ])
    assert(!raw.includes(forbidden));
  assert(JSON.stringify(result).length < 3000, 'response stays bounded as row count grows');
});
