import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { createAssessment, finalizeAssessment } from '../service.js';
import { GDS15_KEYS } from '../gds15-types.js';
import { actor, patient, seed } from './fixture.js';
import { gds15Answers, gds15Input } from './gds15-fixture.js';
before(seed);
after(() => prisma.$disconnect());
const valid = async (answers: unknown, complete = false) =>
  (
    await prisma.$queryRaw<
      Array<{ ok: boolean }>
    >`SELECT gds15_answers_valid(${JSON.stringify(answers)}::jsonb,${complete}) AS ok`
  )[0].ok;

test('GDS15 PostgreSQL independently enforces all fifteen boolean/null domains, complete finals and note boundaries', async () => {
  for (const key of GDS15_KEYS) {
    for (const value of [true, false])
      assert(await valid({ ...gds15Answers(), [key]: value }, true));
    assert(await valid({ ...gds15Answers(), [key]: null }));
    assert.equal(await valid({ ...gds15Answers(), [key]: null }, true), false);
    for (const value of [0, 1, -1, 'true', 'false', [], {}])
      assert.equal(await valid({ ...gds15Answers(), [key]: value }), false);
    const missing: any = gds15Answers();
    delete missing[key];
    assert.equal(await valid(missing), false);
  }
  for (const notes of ['x'.repeat(4001), '\u000b', '\u007f', false, null])
    assert.equal(await valid({ ...gds15Answers(), notes }), false);
  for (const notes of ['😀'.repeat(4000), '  a\nb\tΩ\r\n', '≤ ≥ →'])
    assert(await valid({ ...gds15Answers(), notes }));
  for (const value of [null, [], true, {}, { ...gds15Answers(), extra: 0 }])
    assert.equal(await valid(value), false);
  const noNotes: any = gds15Answers();
  delete noNotes.notes;
  assert.equal(await valid(noNotes), false);
  const draft = (await createAssessment(patient, gds15Input(), actor)).assessment;
  for (const data of [
    { answers: { ...gds15Answers(), q15: 'false' } },
    { formVersion: 'painad-it-2026-09-22-v1' },
    { type: 'gds' },
    { status: 'final' },
  ])
    await assert.rejects(prisma.patientAssessment.update({ where: { id: draft.id }, data }));
});

test('GDS15 final snapshot SQL rejects missing, reordered, coerced or inconsistent answers/scores/source without altering old types', async () => {
  const answers = gds15Answers(false);
  const draft = (await createAssessment(patient, gds15Input({ answers }), actor)).assessment;
  const final = (
    await finalizeAssessment(
      patient,
      draft.id,
      { requestId: randomUUID(), expectedVersion: 1 },
      actor,
    )
  ).assessment;
  assert.equal(final.type, 'gds15');
  const snapshot = final.finalSnapshot!;
  const snapshotValid = async (value: unknown, a: unknown = answers) =>
    (
      await prisma.$queryRaw<
        Array<{ ok: boolean }>
      >`SELECT gds15_snapshot_valid(${JSON.stringify(value)}::jsonb,${JSON.stringify(a)}::jsonb) AS ok`
    )[0].ok;
  assert(await snapshotValid(snapshot));
  for (const key of [
    'instruction',
    'screeningNote',
    'provenance',
    'reference',
    'notes',
    'items',
    'result',
  ]) {
    const missing: any = { ...snapshot };
    delete missing[key];
    assert.equal(await snapshotValid(missing), false, key);
  }
  for (const changed of [
    null,
    {},
    { ...snapshot, items: snapshot.items.slice(1) },
    { ...snapshot, items: [...snapshot.items].reverse() },
    { ...snapshot, notes: 'changed' },
    { ...snapshot, form: { ...snapshot.form, sourceSha256: 'bad' } },
    { ...snapshot, result: { ...snapshot.result, total: 0 } },
    { ...snapshot, result: { ...snapshot.result, maximum: '15' } },
    { ...snapshot, result: { ...snapshot.result, band: 'severe' } },
    { ...snapshot, result: { ...snapshot.result, label: 'other' } },
    { ...snapshot, result: { ...snapshot.result, extra: true } },
    { ...snapshot, screeningNote: null },
  ])
    assert.equal(await snapshotValid(changed), false);
  for (let index = 0; index < 15; index++)
    for (const change of [
      { answer: true },
      { score: '1' },
      { score: 7 },
      { description: 'Sì' },
      { label: null },
      { extra: true },
    ]) {
      const items = snapshot.items.map((item, i) => (i === index ? { ...item, ...change } : item));
      assert.equal(await snapshotValid({ ...snapshot, items }), false);
    }
  assert.equal(await snapshotValid(snapshot, { ...answers, q1: true }), false);
  assert.equal(await snapshotValid(snapshot, { ...answers, q15: null }), false);
});
