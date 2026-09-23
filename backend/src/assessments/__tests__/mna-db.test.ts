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
import { listAssessments } from '../history.js';
import { currentAssessment } from '../current.js';
import { attestAssessment } from '../attestations.js';
import { mnaSnapshotHash } from '../mna-snapshot.js';
import { MNA_K_KEYS } from '../mna-types.js';
import { actor, other, manager, patient, second, foreign, seed } from './fixture.js';
import { mnaAnswers, mnaInput } from './mna-fixture.js';
before(seed);
after(() => prisma.$disconnect());

test('MNA screening final preserves partial G–R, authoritative demographics and immutable source-bound snapshot', async () => {
  await prisma.patient.update({
    where: { id: patient },
    data: { dateOfBirth: new Date('2000-03-29T00:00:00.000Z'), sex: 'F' },
  });
  const answers = mnaAnswers('empty', 'screening'),
    maximum = mnaAnswers();
  for (const id of ['A', 'B', 'C', 'D', 'E', 'F'] as const) (answers as any)[id] = maximum[id];
  answers.G = false;
  answers.K = { dairyDaily: false, eggsOrLegumesWeekly: true, meatFishOrPoultryDaily: null };
  answers.Q = { method: 'measured' };
  answers.measurements.armCircumferenceCm = 21;
  answers.measurementDates.armCircumferenceCm = '2026-03-27';
  answers.notes = '  Prima riga\nSeconda à Ω';
  const created = await createAssessment(patient, mnaInput({ answers }), actor);
  const draft = created.assessment;
  assert.equal(draft.type, 'mna');
  assert.equal(draft.finalSnapshot, null);
  assert.equal(draft.snapshotSha256, null);
  assert.equal(draft.extent, 'screening');
  assert.equal(draft.completion.screening.answeredCount, 6);
  assert.equal(draft.completion.global.answeredCount, 2);
  assert(draft.completion.complete);
  await assert.rejects(
    getAssessment(patient, draft.id, manager),
    (error: any) => error.status === 404,
  );
  const request = { requestId: randomUUID(), expectedVersion: 1 };
  const final = (await finalizeAssessment(patient, draft.id, request, actor)).assessment;
  assert.equal(final.type, 'mna');
  assert.equal(final.status, 'final');
  assert.match(final.snapshotSha256!, /^[0-9a-f]{64}$/);
  assert.equal(final.result.screening!.score, 14);
  assert.equal(final.result.global, null);
  assert.equal(final.result.total, null);
  const snapshot = final.finalSnapshot!;
  assert.deepEqual(snapshot.answers, answers);
  assert.equal(snapshot.extent, 'screening');
  assert.equal(snapshot.title, 'Screening MNA®');
  assert.equal(snapshot.demographics.sex, 'F');
  assert.equal(snapshot.demographics.ageOnDate, '2026-03-29');
  assert.equal(snapshot.demographics.ageAtAssessment, 26);
  assert.equal(snapshot.items.length, 18);
  assert.equal(snapshot.items[10].score, null);
  assert.equal(snapshot.items[10].description, null);
  assert.deepEqual(
    snapshot.items[10].subitems!.map((row) => row.id),
    MNA_K_KEYS,
  );
  assert.equal(snapshot.items[10].subitems![2].answer, null);
  assert.match(snapshot.items[10].subitems![1].label, /Una o due volte/);
  assert.equal(snapshot.items[16].score, 0.5);
  assert.equal(snapshot.measurements[2].measuredOn, '2026-03-27');
  assert(snapshot.measurements.every((row) => row.source === 'manual_assessment'));
  assert.equal(snapshot.references.length, 3);
  assert.match(snapshot.copyright, /Société des Produits Nestlé/);
  assert.match(snapshot.provenance, /21 ≤ CB ≤ 22/);
  assert(!JSON.stringify(snapshot).includes('must-not-enter-snapshot'));
  assert.equal(mnaSnapshotHash(snapshot), final.snapshotSha256);
  assert.notEqual(
    mnaSnapshotHash({ ...snapshot, notes: snapshot.notes + 'x' }),
    final.snapshotSha256,
  );
  assert((await finalizeAssessment(patient, draft.id, request, actor)).replayed);
  await prisma.patient.update({ where: { id: patient }, data: { dateOfBirth: null, sex: 'M' } });
  assert.deepEqual((await getAssessment(patient, final.id, actor)).finalSnapshot, snapshot);
  await assert.rejects(
    prisma.patientAssessment.update({ where: { id: final.id }, data: { answers: mnaAnswers() } }),
  );
  await assert.rejects(prisma.patientAssessment.delete({ where: { id: final.id } }));
  assert.equal((await getAssessment(patient, final.id, manager)).id, final.id);
  await assert.rejects(
    getAssessment(patient, final.id, other),
    (error: any) => error.status === 404,
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
      mnaInput({
        predecessorId: final.id,
        correctionReason: 'Completa valutazione tracciata',
        assessedAt: final.assessedAt,
      }),
      actor,
    )
  ).assessment;
  assert.equal((await currentAssessment(patient, { type: 'mna' }, actor))!.id, final.id);
  const completed = (
    await finalizeAssessment(
      patient,
      correction.id,
      { requestId: randomUUID(), expectedVersion: 1 },
      actor,
    )
  ).assessment;
  assert.equal(completed.type, 'mna');
  assert.equal(completed.result.total!.score, 30);
  assert.equal(completed.finalSnapshot!.demographics.ageAtAssessment, null);
  assert.equal(completed.finalSnapshot!.demographics.sex, 'M');
  assert.equal((await currentAssessment(patient, { type: 'mna' }, actor))!.id, completed.id);
  assert.deepEqual((await getAssessment(patient, final.id, actor)).finalSnapshot, snapshot);
  const history = await listAssessments(patient, { type: 'mna', limit: '1' }, actor);
  assert.equal(history.items.length, 1);
  assert(history.pageInfo.hasMore);
  assert.equal(history.items[0].type, 'mna');
  for (const key of ['answers', 'finalSnapshot', 'snapshotSha256'])
    assert(!(key in history.items[0]));
  assert.equal((await listAssessments(patient, { type: 'tinetti' }, actor)).items.length, 0);
  await assert.rejects(
    listAssessments(patient, { type: 'painad', cursor: history.pageInfo.nextCursor! }, actor),
  );
});

test('MNA create replay binds all answers/dates/methods/extent, CAS serializes patches and incomplete finalization is atomic', async () => {
  const input = mnaInput({ answers: mnaAnswers('empty') });
  const created = await createAssessment(second, input, actor);
  assert((await createAssessment(second, input, actor)).replayed);
  for (const answers of [
    { ...input.answers, extent: 'screening' },
    { ...input.answers, notes: ' ' },
    { ...input.answers, K: { ...input.answers.K, dairyDaily: false } },
    {
      ...input.answers,
      measurementDates: { ...input.answers.measurementDates, weightKg: '2026-03-20' },
    },
    { ...input.answers, F: { method: 'measured' } },
  ])
    await assert.rejects(
      createAssessment(second, { ...input, answers }, actor),
      (error: any) => error.code === 'assessment_request_conflict',
    );
  await assert.rejects(
    finalizeAssessment(
      second,
      created.assessment.id,
      { requestId: randomUUID(), expectedVersion: 1 },
      actor,
    ),
    (error: any) =>
      error.status === 422 &&
      error.details.missingPaths.includes('K.dairyDaily') &&
      error.details.missingPaths.includes('F.category'),
  );
  assert.equal((await getAssessment(second, created.assessment.id, actor)).version, 1);
  const patches = await Promise.allSettled(
    [0, 1].map(() =>
      patchAssessment(
        second,
        created.assessment.id,
        { expectedVersion: 1, assessedAt: input.assessedAt, answers: mnaAnswers() },
        actor,
      ),
    ),
  );
  assert.equal(patches.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(
    patches.filter(
      (result) =>
        result.status === 'rejected' && result.reason.code === 'assessment_version_conflict',
    ).length,
    1,
  );
  const finalize = { requestId: randomUUID(), expectedVersion: 2 };
  const results = await Promise.all([
    finalizeAssessment(second, created.assessment.id, finalize, actor),
    finalizeAssessment(second, created.assessment.id, finalize, actor),
  ]);
  assert.equal(results.filter((result) => result.replayed).length, 1);
  assert.equal(results[0].assessment.snapshotSha256, results[1].assessment.snapshotSha256);
  await assert.rejects(
    finalizeAssessment(second, created.assessment.id, { ...finalize, expectedVersion: 1 }, actor),
    (error: any) => error.code === 'assessment_request_conflict',
  );
  await assert.rejects(
    createAssessment(foreign, mnaInput(), actor),
    (error: any) => error.status === 404,
  );
  await assert.rejects(
    createAssessment(second, mnaInput({ assessedAt: '0000-01-01T00:00:00.000Z' }), actor),
  );
  await assert.rejects(
    createAssessment(second, mnaInput({ assessedAt: '9999-12-31T23:30:00.000Z' }), actor),
  );
});
