import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import {
  createAssessment,
  patchAssessment,
  finalizeAssessment,
  getAssessment,
} from '../service.js';
import { listAssessments } from '../history.js';
import { currentAssessment } from '../current.js';
import { actor, other, manager, patient, second, foreign, seed, input } from './fixture.js';
import { transfersInput, emptyTransfers, completeTransfers } from './transfers-fixture.js';
before(seed);
after(() => prisma.$disconnect());
const final = async (p = patient, extra: Record<string, unknown> = {}) => {
  const draft = (await createAssessment(p, transfersInput(extra), actor)).assessment;
  return (
    await finalizeAssessment(p, draft.id, { requestId: randomUUID(), expectedVersion: 1 }, actor)
  ).assessment;
};
test('Transfers CAS, replay and immutable final preserve answers, source and Cartella independence', async () => {
  const body = transfersInput({ answers: emptyTransfers() });
  const create = await Promise.all(
    Array.from({ length: 5 }, () => createAssessment(patient, body, actor)),
  );
  assert.equal(create.filter((r) => !r.replayed).length, 1);
  const draft = create[0].assessment;
  assert.equal(draft.type, 'postural_transfers');
  assert.equal(draft.result, null);
  assert(!('answeredCount' in draft));
  await assert.rejects(
    finalizeAssessment(patient, draft.id, { requestId: randomUUID(), expectedVersion: 1 }, actor),
    (e: any) => e.status === 422 && e.details.missingPaths.includes('walking'),
  );
  const answers = completeTransfers();
  answers.notes = 'Prima riga\nSeconda riga';
  const updates = await Promise.allSettled(
    Array.from({ length: 2 }, () =>
      patchAssessment(
        patient,
        draft.id,
        { expectedVersion: 1, assessedAt: body.assessedAt, answers },
        actor,
      ),
    ),
  );
  assert.equal(updates.filter((r) => r.status === 'fulfilled').length, 1);
  assert.deepEqual((await createAssessment(patient, body, actor)).assessment.answers, answers);
  const req = { requestId: randomUUID(), expectedVersion: 2 };
  const finals = await Promise.all(
    Array.from({ length: 4 }, () => finalizeAssessment(patient, draft.id, req, actor)),
  );
  assert.equal(finals.filter((r) => !r.replayed).length, 1);
  const saved = finals[0].assessment;
  assert.equal(saved.type, 'postural_transfers');
  assert.equal(saved.result, null);
  assert.equal(saved.finalSnapshot!.result, null);
  assert.equal(saved.finalSnapshot!.form.version, 'transfers-it-2026-09-22-v1');
  assert.match(saved.snapshotSha256!, /^[a-f0-9]{64}$/);
  assert(JSON.stringify(saved.finalSnapshot).includes('Prima riga\\nSeconda riga'));
  const cartella = await prisma.cartella.findUniqueOrThrow({ where: { patientId: patient } });
  assert((cartella.data as any).privateNarrative);
  await assert.rejects(
    prisma.patientAssessment.update({
      where: { id: saved.id },
      data: { answers: completeTransfers() as any },
    }),
  );
  await assert.rejects(prisma.patientAssessment.delete({ where: { id: saved.id } }));
  assert.equal((await getAssessment(patient, saved.id, manager)).id, saved.id);
});
test('current resolves terminal chains by clinical time and never picks late old corrections or drafts', async () => {
  assert.equal(await currentAssessment(second, { type: 'postural_transfers' }, actor), null);
  const old = await final(second, { assessedAt: '2026-03-01T12:00:00.000Z' });
  const recent = await final(second, { assessedAt: '2026-03-20T12:00:00.000Z' });
  const first = await final(second, {
    assessedAt: old.assessedAt,
    predecessorId: old.id,
    correctionReason: 'Rettifica vecchia',
  });
  await final(second, {
    assessedAt: old.assessedAt,
    predecessorId: first.id,
    correctionReason: 'Rettifica ulteriore',
  });
  assert.equal(
    (await currentAssessment(second, { type: 'postural_transfers' }, actor))!.id,
    recent.id,
  );
  const correction = (
    await createAssessment(
      second,
      transfersInput({
        assessedAt: recent.assessedAt,
        predecessorId: recent.id,
        correctionReason: 'Rettifica corrente',
      }),
      actor,
    )
  ).assessment;
  assert.equal(
    (await currentAssessment(second, { type: 'postural_transfers' }, actor))!.id,
    recent.id,
  );
  await finalizeAssessment(
    second,
    correction.id,
    { requestId: randomUUID(), expectedVersion: 1 },
    actor,
  );
  assert.equal(
    (await currentAssessment(second, { type: 'postural_transfers' }, actor))!.id,
    correction.id,
  );
  const painad = (
    await createAssessment(second, input({ assessedAt: '2026-09-23T12:00:00.000Z' }), actor)
  ).assessment;
  await finalizeAssessment(
    second,
    painad.id,
    { requestId: randomUUID(), expectedVersion: 1 },
    actor,
  );
  assert.equal(
    (await currentAssessment(second, { type: 'postural_transfers' }, actor))!.id,
    correction.id,
  );
  await assert.rejects(
    createAssessment(
      second,
      transfersInput({ predecessorId: painad.id, correctionReason: 'Cross type' }),
      actor,
    ),
  );
  await assert.rejects(
    currentAssessment(foreign, { type: 'postural_transfers' }, actor),
    (e: any) => e.status === 404,
  );
});
test('typed history is bounded and draft-private, with cursor type binding before pagination', async () => {
  for (let n = 0; n < 27; n++)
    await createAssessment(patient, transfersInput({ answers: emptyTransfers() }), actor);
  const page = await listAssessments(
    patient,
    { type: 'postural_transfers', status: 'draft' },
    actor,
  );
  assert.equal(page.items.length, 25);
  assert(page.pageInfo.hasMore);
  assert(
    page.items.every(
      (item) =>
        item.type === 'postural_transfers' && !('answers' in item) && !('finalSnapshot' in item),
    ),
  );
  const next = await listAssessments(
    patient,
    { type: 'postural_transfers', status: 'draft', cursor: page.pageInfo.nextCursor! },
    actor,
  );
  assert.equal(next.items.length, 2);
  assert.equal(
    (await listAssessments(patient, { type: 'postural_transfers', status: 'draft' }, manager)).items
      .length,
    0,
  );
  await assert.rejects(
    listAssessments(
      patient,
      { type: 'painad', status: 'draft', cursor: page.pageInfo.nextCursor! },
      actor,
    ),
  );
  await assert.rejects(
    getAssessment(patient, page.items[0].id, manager),
    (e: any) => e.status === 404,
  );
});
test('DB validation rejects malformed and incomplete Transfers without weakening PAINAD', async () => {
  const empty = emptyTransfers(),
    complete = completeTransfers();
  for (const [answers, valid, ready] of [
    [empty, true, false],
    [complete, true, true],
    [{ ...complete, painOnMovement: 'false' }, false, false],
    [
      { ...complete, transfers: { ...complete.transfers, toilet: 'hoist_one_operator' } },
      false,
      false,
    ],
  ] as const) {
    const [row] = await prisma.$queryRaw<
      Array<{ valid: boolean; ready: boolean }>
    >`SELECT transfers_answers_valid(${JSON.stringify(answers)}::jsonb) AS valid,transfers_answers_valid(${JSON.stringify(answers)}::jsonb,true) AS ready`;
    assert.deepEqual(row, { valid, ready });
  }
  const draft = (await createAssessment(patient, transfersInput(), actor)).assessment;
  for (const [date, valid] of [
    ['1999-12-31', true],
    ['1904-02-29', true],
    ['2000-02-29', true],
    ['1900-02-29', false],
    ['0000-01-01', false],
  ] as const) {
    const a = completeTransfers();
    a.context.admissionDate.value = date;
    const [row] = await prisma.$queryRaw<
      Array<{ valid: boolean }>
    >`SELECT transfers_answers_valid(${JSON.stringify(a)}::jsonb,true) AS valid`;
    assert.equal(row.valid, valid);
  }
  await assert.rejects(
    prisma.patientAssessment.update({
      where: { id: draft.id },
      data: { answers: { ...complete, extra: true } as any, version: { increment: 1 } },
    }),
  );
  const [zone] = await prisma.$queryRaw<
    Array<{ zone: string }>
  >`SELECT current_setting('TimeZone') AS zone`;
  assert.equal(zone.zone, 'Europe/Rome');
  await prisma.patient.update({ where: { id: second }, data: { registeredById: other.id } });
  await assert.rejects(
    currentAssessment(second, { type: 'postural_transfers' }, actor),
    (e: any) => e.status === 404,
  );
});
