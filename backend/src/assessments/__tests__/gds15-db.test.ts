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
import { GDS15_KEYS } from '../gds15-types.js';
import {
  GDS15_INSTRUCTION,
  GDS15_SCREENING_NOTE,
  GDS15_PROVENANCE,
  GDS15_REFERENCE,
} from '../gds15-definition.js';
import { gds15SnapshotHash } from '../gds15-snapshot.js';
import { actor, other, manager, patient, second, foreign, seed } from './fixture.js';
import { gds15Answers, gds15Input } from './gds15-fixture.js';
before(seed);
after(() => prisma.$disconnect());

test('GDS15 final freezes fifteen answers, clinical identity and source; correction/current/history preserve the original', async () => {
  const legacy = (await prisma.cartella.findUniqueOrThrow({ where: { patientId: patient } })).data;
  const answers = { ...gds15Answers(), notes: '  Prima riga\nSeconda à Ω' };
  const input = gds15Input({ answers });
  const draft = (await createAssessment(patient, input, actor)).assessment;
  assert.equal(draft.type, 'gds15');
  assert.equal(draft.answeredCount, 15);
  assert.equal(draft.finalSnapshot, null);
  assert.equal(draft.snapshotSha256, null);
  await assert.rejects(
    getAssessment(patient, draft.id, manager),
    (error: any) => error.status === 404,
  );
  const request = { requestId: randomUUID(), expectedVersion: 1 };
  const final = (await finalizeAssessment(patient, draft.id, request, actor)).assessment;
  assert.equal(final.type, 'gds15');
  assert.deepEqual(final.result, {
    total: 10,
    maximum: 15,
    band: 'severe',
    label: 'Depressione grave',
  });
  const snapshot = final.finalSnapshot!;
  assert.equal(snapshot.items.length, 15);
  assert(snapshot.items.every((item) => item.answer && item.description === 'Sì'));
  assert.deepEqual(
    snapshot.items.map((item) => item.score),
    [0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1],
  );
  assert.equal(snapshot.notes, answers.notes);
  for (const [key, expected] of Object.entries({
    instruction: GDS15_INSTRUCTION,
    screeningNote: GDS15_SCREENING_NOTE,
    provenance: GDS15_PROVENANCE,
    reference: GDS15_REFERENCE,
  }))
    assert.equal((snapshot as any)[key], expected);
  assert.equal(snapshot.patient.location.asOf, '2026-03-29');
  assert.equal(snapshot.patient.dateOfBirth, '1940-01-02');
  assert.equal(snapshot.author.operatorId, actor.id);
  assert.equal(
    snapshot.form.sourceSha256,
    'f2d4494b49d96de08eceed69b1d793c45260f22aca7d62f98080ccee6133d709',
  );
  assert(!JSON.stringify(snapshot).includes('must-not-enter-snapshot'));
  assert.equal(gds15SnapshotHash(snapshot), final.snapshotSha256);
  assert.notEqual(
    gds15SnapshotHash({ ...snapshot, notes: snapshot.notes + 'x' }),
    final.snapshotSha256,
  );
  assert.notEqual(
    gds15SnapshotHash({ ...snapshot, items: [...snapshot.items].reverse() }),
    final.snapshotSha256,
  );
  assert((await finalizeAssessment(patient, draft.id, request, actor)).replayed);
  await prisma.patient.update({
    where: { id: patient },
    data: { lastName: 'Anagrafica aggiornata' },
  });
  assert.deepEqual((await getAssessment(patient, final.id, actor)).finalSnapshot, snapshot);
  await assert.rejects(
    prisma.patientAssessment.update({
      where: { id: final.id },
      data: { answers: gds15Answers(false) },
    }),
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
      gds15Input({
        predecessorId: final.id,
        correctionReason: 'Rettifica sintetica',
        answers: gds15Answers(false),
        assessedAt: final.assessedAt,
      }),
      actor,
    )
  ).assessment;
  assert.equal((await currentAssessment(patient, { type: 'gds15' }, actor))!.id, final.id);
  const corrected = (
    await finalizeAssessment(
      patient,
      correction.id,
      { requestId: randomUUID(), expectedVersion: 1 },
      actor,
    )
  ).assessment;
  assert.equal(corrected.type, 'gds15');
  assert.equal(corrected.result!.total, 5);
  assert.equal(corrected.result!.band, 'none');
  assert.equal(corrected.finalSnapshot!.predecessor!.id, final.id);
  assert.equal(corrected.finalSnapshot!.correctionReason, 'Rettifica sintetica');
  assert.equal((await currentAssessment(patient, { type: 'gds15' }, actor))!.id, corrected.id);
  assert.deepEqual((await getAssessment(patient, final.id, actor)).finalSnapshot, snapshot);
  const history = await listAssessments(patient, { type: 'gds15', limit: '1' }, actor);
  assert.equal(history.items[0].type, 'gds15');
  assert(history.pageInfo.hasMore);
  for (const key of ['answers', 'finalSnapshot', 'snapshotSha256'])
    assert(!(key in history.items[0]));
  assert.equal((await listAssessments(patient, { type: 'mna' }, actor)).items.length, 0);
  await assert.rejects(
    listAssessments(patient, { type: 'painad', cursor: history.pageInfo.nextCursor! }, actor),
  );
  await assert.rejects(
    listAssessments(second, { type: 'gds15', cursor: history.pageInfo.nextCursor! }, actor),
  );
  assert.deepEqual(
    (await prisma.cartella.findUniqueOrThrow({ where: { patientId: patient } })).data,
    legacy,
  );
});

test('GDS15 replay binds each answer and notes; incomplete final is atomic and concurrent patches/finalization retain CAS', async () => {
  const input = gds15Input({ answers: gds15Answers(null) });
  const draft = (await createAssessment(second, input, actor)).assessment;
  assert.equal(draft.type, 'gds15');
  assert.equal(draft.result, null);
  assert.equal(draft.answeredCount, 0);
  assert.deepEqual(draft.completion.missingPaths, GDS15_KEYS);
  assert((await createAssessment(second, input, actor)).replayed);
  for (const answers of [
    ...GDS15_KEYS.map((key) => ({ ...input.answers, [key]: false })),
    { ...input.answers, notes: ' ' },
  ])
    await assert.rejects(
      createAssessment(second, { ...input, answers }, actor),
      (error: any) => error.code === 'assessment_request_conflict',
    );
  await assert.rejects(
    finalizeAssessment(second, draft.id, { requestId: randomUUID(), expectedVersion: 1 }, actor),
    (error: any) => error.status === 422 && error.details.missingPaths.length === 15,
  );
  assert.equal((await getAssessment(second, draft.id, actor)).version, 1);
  const results = await Promise.allSettled(
    [true, false].map((answer) =>
      patchAssessment(
        second,
        draft.id,
        { expectedVersion: 1, assessedAt: input.assessedAt, answers: gds15Answers(answer) },
        actor,
      ),
    ),
  );
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(
    results.filter(
      (result) =>
        result.status === 'rejected' && result.reason.code === 'assessment_version_conflict',
    ).length,
    1,
  );
  const request = { requestId: randomUUID(), expectedVersion: 2 };
  const finals = await Promise.all([
    finalizeAssessment(second, draft.id, request, actor),
    finalizeAssessment(second, draft.id, request, actor),
  ]);
  assert.equal(finals.filter((row) => row.replayed).length, 1);
  assert.equal(finals[0].assessment.snapshotSha256, finals[1].assessment.snapshotSha256);
  await assert.rejects(
    finalizeAssessment(second, draft.id, { ...request, expectedVersion: 1 }, actor),
    (error: any) => error.code === 'assessment_request_conflict',
  );
  await assert.rejects(
    createAssessment(foreign, gds15Input(), actor),
    (error: any) => error.status === 404,
  );
  await assert.rejects(
    createAssessment(
      second,
      gds15Input({ predecessorId: finals[0].assessment.id, correctionReason: null }),
      actor,
    ),
  );
});
