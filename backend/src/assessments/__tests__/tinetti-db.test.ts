import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import {
  createAssessment,
  finalizeAssessment,
  getAssessment,
  patchAssessment,
} from '../service.js';
import { currentAssessment } from '../current.js';
import { listAssessments } from '../history.js';
import { attestAssessment } from '../attestations.js';
import { TINETTI_KEYS, TINETTI_MAX_SCORE } from '../tinetti-types.js';
import { actor, other, manager, patient, foreign, seed } from './fixture.js';
import { tinettiAnswers, tinettiInput } from './tinetti-fixture.js';
before(seed);
after(() => prisma.$disconnect());

test('one Tinetti lifecycle retains CAS/replay, immutable snapshot, typed current/history and legacy JSON', async () => {
  const legacyBefore = await prisma.cartella.findUniqueOrThrow({ where: { patientId: patient } });
  const input = tinettiInput({ answers: tinettiAnswers('empty') });
  const created = await createAssessment(patient, input, actor);
  const draft = created.assessment;
  assert.equal(draft.type, 'tinetti');
  assert.equal(draft.answeredCount, 0);
  assert.equal(draft.result, null);
  assert((await createAssessment(patient, input, actor)).replayed);
  await assert.rejects(
    finalizeAssessment(patient, draft.id, { requestId: randomUUID(), expectedVersion: 1 }, actor),
    (error: any) => error.status === 422 && error.details.missingPaths.length === 20,
  );
  const patch = {
    expectedVersion: 1,
    assessedAt: input.assessedAt,
    answers: { ...tinettiAnswers(), notes: 'Prima riga\nSeconda à Ω' },
  };
  await patchAssessment(patient, draft.id, patch, actor);
  await assert.rejects(
    patchAssessment(patient, draft.id, patch, actor),
    (error: any) => error.code === 'assessment_version_conflict',
  );
  const finalRequest = { requestId: randomUUID(), expectedVersion: 2 };
  const final = (await finalizeAssessment(patient, draft.id, finalRequest, actor)).assessment;
  assert.equal(final.type, 'tinetti');
  assert.equal(final.result!.total, 28);
  assert.equal(final.finalSnapshot!.items.length, 20);
  assert.equal(final.finalSnapshot!.items.filter((item) => item.group === 'gait').length, 10);
  assert.equal(final.finalSnapshot!.notes, patch.answers.notes);
  assert.match(final.finalSnapshot!.provenance, /20 voci/);
  assert.equal(
    final.finalSnapshot!.form.sourceSha256,
    '7785059cceedc3ff85f051a60ff1cbdaa48145f03fb7f93ab7d53696ca6c8b09',
  );
  assert.equal(
    final.finalSnapshot!.form.referenceSha256,
    'feca88c71bc7b6c9b53a812979f222e0769d688380673995277e8490db8c3ff6',
  );
  assert((await finalizeAssessment(patient, draft.id, finalRequest, actor)).replayed);
  await assert.rejects(
    prisma.patientAssessment.update({
      where: { id: final.id },
      data: { answers: tinettiAnswers('zero') },
    }),
  );
  await assert.rejects(prisma.patientAssessment.delete({ where: { id: final.id } }));
  assert.equal((await getAssessment(patient, final.id, manager)).id, final.id);
  await assert.rejects(
    getAssessment(patient, final.id, other),
    (error: any) => error.status === 404,
  );
  await assert.rejects(
    createAssessment(foreign, tinettiInput(), actor),
    (error: any) => error.status === 404,
  );
  await assert.rejects(
    createAssessment(
      patient,
      tinettiInput({ predecessorId: 'legacy-id', correctionReason: 'Non convertire' }),
      actor,
    ),
  );
  await assert.rejects(
    attestAssessment(
      patient,
      final.id,
      { kind: 'operator_acknowledgement', snapshotSha256: final.snapshotSha256 },
      actor,
    ),
    (error: any) => error.code === 'assessment_attestation_type',
  );
  const correction = (
    await createAssessment(
      patient,
      tinettiInput({
        predecessorId: final.id,
        correctionReason: 'Rettifica sintetica',
        assessedAt: final.assessedAt,
      }),
      actor,
    )
  ).assessment;
  assert.equal((await currentAssessment(patient, { type: 'tinetti' }, actor))!.id, final.id);
  await finalizeAssessment(
    patient,
    correction.id,
    { requestId: randomUUID(), expectedVersion: 1 },
    actor,
  );
  assert.equal((await currentAssessment(patient, { type: 'tinetti' }, actor))!.id, correction.id);
  const page = await listAssessments(patient, { type: 'tinetti', limit: '1' }, actor);
  assert.equal(page.items.length, 1);
  assert(page.pageInfo.hasMore);
  assert(!('answers' in page.items[0]) && !('finalSnapshot' in page.items[0]));
  assert.equal((await listAssessments(patient, { type: 'painad' }, actor)).items.length, 0);
  await assert.rejects(
    listAssessments(
      patient,
      { type: 'postural_transfers', cursor: page.pageInfo.nextCursor! },
      actor,
    ),
  );
  assert.deepEqual(
    (await prisma.cartella.findUniqueOrThrow({ where: { patientId: patient } })).data,
    legacyBefore.data,
  );
});
test('SQL validates all 48 domains, null completeness and note bounds and blocks direct malformed writes', async () => {
  const valid = async (answers: unknown, complete = false) =>
    (
      await prisma.$queryRaw<Array<{ ok: boolean }>>`
    SELECT tinetti_answers_valid(${JSON.stringify(answers)}::jsonb,${complete}) AS ok`
    )[0].ok;
  for (const key of TINETTI_KEYS) {
    for (let score = 0; score <= TINETTI_MAX_SCORE[key]; score++)
      assert(await valid({ ...tinettiAnswers(), [key]: score }, true));
    for (const score of [-1, '0', 0.5, TINETTI_MAX_SCORE[key] + 1])
      assert.equal(await valid({ ...tinettiAnswers(), [key]: score }), false);
    assert(await valid({ ...tinettiAnswers(), [key]: null }));
    assert.equal(await valid({ ...tinettiAnswers(), [key]: null }, true), false);
  }
  for (const notes of ['a\u000bb', 'a\u007fb', 'x'.repeat(4001)])
    assert.equal(await valid({ ...tinettiAnswers(), notes }), false);
  assert(await valid({ ...tinettiAnswers(), notes: '😀'.repeat(4000) }));
  assert(await valid({ ...tinettiAnswers(), notes: 'a\nb\tΩ\r\n' }));
  const draft = (await createAssessment(patient, tinettiInput(), actor)).assessment;
  await assert.rejects(
    prisma.patientAssessment.update({
      where: { id: draft.id },
      data: { answers: { ...tinettiAnswers(), alzarsi: -1 } },
    }),
  );
  await assert.rejects(
    prisma.patientAssessment.update({
      where: { id: draft.id },
      data: { formVersion: 'painad-it-2026-09-22-v1' },
    }),
  );
});
