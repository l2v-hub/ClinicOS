import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { prisma } from '../../lib/prisma.js';
import { MNA_ITEMS } from '../mna-definition.js';
import { MNA_KEYS, MNA_K_KEYS, MNA_MEASUREMENT_KEYS } from '../mna-types.js';
import { parseMnaAnswers } from '../mna-input.js';
import { createAssessment } from '../service.js';
import { actor, patient, seed } from './fixture.js';
import { mnaAnswers, mnaInput } from './mna-fixture.js';
before(seed);
after(() => prisma.$disconnect());
const valid = async (answers: unknown, complete = false) =>
  (
    await prisma.$queryRawUnsafe<Array<{ ok: boolean }>>(
      'SELECT mna_answers_valid($1::jsonb,$2) AS ok',
      JSON.stringify(answers),
      complete,
    )
  )[0].ok;

test('MNA PostgreSQL validates every option, three K booleans, selected-extent completeness and canonical object shape', async () => {
  assert(await valid(mnaAnswers(), true));
  assert(await valid(mnaAnswers('zero'), true));
  assert(await valid(mnaAnswers('empty')));
  assert.equal(await valid(mnaAnswers('empty'), true), false);
  for (const item of MNA_ITEMS.filter((item) => item.id !== 'K')) {
    for (const option of item.options) {
      const answer = ['F', 'Q', 'R'].includes(item.id)
        ? { method: 'category', category: option.value }
        : option.value;
      assert(
        await valid({ ...mnaAnswers(), [item.id]: answer }, true),
        item.id + ':' + String(option.value),
      );
    }
    const answer = ['F', 'Q', 'R'].includes(item.id)
      ? { method: 'category', category: null }
      : null;
    assert(await valid({ ...mnaAnswers(), [item.id]: answer }));
    assert.equal(await valid({ ...mnaAnswers(), [item.id]: answer }, true), false, item.id);
    for (const invalid of [0, -1, 'bad', [], {}])
      assert.equal(await valid({ ...mnaAnswers(), [item.id]: invalid }), false);
  }
  for (let bits = 0; bits < 8; bits++) {
    const answers = mnaAnswers();
    answers.K = {
      dairyDaily: Boolean(bits & 4),
      eggsOrLegumesWeekly: Boolean(bits & 2),
      meatFishOrPoultryDaily: Boolean(bits & 1),
    };
    assert(await valid(answers, true));
    for (const key of MNA_K_KEYS) {
      const partial = { ...answers, K: { ...answers.K, [key]: null } };
      assert(await valid(partial));
      assert.equal(await valid(partial, true), false);
      assert(await valid({ ...partial, extent: 'screening' }, true));
    }
  }
  const screen = mnaAnswers('empty', 'screening');
  for (const id of MNA_KEYS.slice(0, 6)) (screen as any)[id] = mnaAnswers()[id];
  assert(await valid(screen, true));
  for (const key of Object.keys(mnaAnswers())) {
    const missing: any = { ...mnaAnswers() };
    delete missing[key];
    assert.equal(await valid(missing), false, key);
  }
  for (const answers of [
    { ...mnaAnswers(), other: null },
    { ...mnaAnswers(), extent: null },
    { ...mnaAnswers(), K: { ...mnaAnswers().K, extra: true } },
    { ...mnaAnswers(), measurements: { ...mnaAnswers().measurements, extra: 1 } },
    { ...mnaAnswers(), measurementDates: {} },
  ])
    assert.equal(await valid(answers), false);
});

test('MNA PostgreSQL matches finite numeric/date/note boundaries and rejects direct malformed clinical writes', async () => {
  for (const key of MNA_MEASUREMENT_KEYS) {
    for (const value of [0, -1, '2', '', 1e308, Number.MIN_VALUE, 1e-320]) {
      const answers = mnaAnswers();
      (answers.measurements as any)[key] = value;
      if (key === 'armCircumferenceCm') answers.Q = { method: 'measured' };
      if (key === 'calfCircumferenceCm') answers.R = { method: 'measured' };
      let accepted = true;
      try {
        parseMnaAnswers(answers);
      } catch {
        accepted = false;
      }
      assert.equal(await valid(answers), accepted, key + ':' + String(value));
    }
    for (const date of [
      '0001-01-01',
      '2000-02-29',
      '9999-12-31',
      '0000-01-01',
      '2026-02-29',
      '1900-02-29',
      '2026-04-31',
      '2026-1-01',
    ]) {
      const answers = mnaAnswers();
      answers.measurementDates[key] = date;
      let accepted = true;
      try {
        parseMnaAnswers(answers);
      } catch {
        accepted = false;
      }
      assert.equal(await valid(answers), accepted, date);
    }
  }
  for (const [weight, height] of [
    [Number.MIN_VALUE, 100],
    [1e-320, 100],
    [1, 1e-300],
    [1, 1e300],
    [1e308, 1],
    [1e-300, 1e150],
    [84, 200],
  ]) {
    const answers = mnaAnswers();
    answers.F = { method: 'measured' };
    answers.measurements.weightKg = weight;
    answers.measurements.heightCm = height;
    let accepted = true;
    try {
      parseMnaAnswers(answers);
    } catch {
      accepted = false;
    }
    assert.equal(await valid(answers), accepted, 'pair ' + weight + '/' + height);
  }
  for (const item of ['F', 'Q', 'R'] as const) {
    const answers = mnaAnswers();
    if (item === 'F') {
      answers.measurements.weightKg = 60;
      answers.measurements.heightCm = 160;
    } else answers.measurements[item === 'Q' ? 'armCircumferenceCm' : 'calfCircumferenceCm'] = 22;
    assert.equal(await valid(answers), false);
    (answers as any)[item] = { method: 'category', category: null };
    assert.equal(await valid(answers), false);
    (answers as any)[item] = { method: 'measured', category: null };
    assert.equal(await valid(answers), false);
    (answers as any)[item] = { method: 'measured' };
    assert(await valid(answers, true));
  }
  for (const notes of [
    '😀'.repeat(4000),
    'a\nb\tΩ\r\n',
    'x'.repeat(4001),
    'a\u000bb',
    'a\u007fb',
  ]) {
    const answers = { ...mnaAnswers(), notes };
    let accepted = true;
    try {
      parseMnaAnswers(answers);
    } catch {
      accepted = false;
    }
    assert.equal(await valid(answers), accepted);
  }
  const draft = (await createAssessment(patient, mnaInput(), actor)).assessment;
  await assert.rejects(
    prisma.patientAssessment.update({
      where: { id: draft.id },
      data: { answers: { ...mnaAnswers(), A: 0 } as any },
    }),
  );
  await assert.rejects(
    prisma.patientAssessment.update({
      where: { id: draft.id },
      data: { formVersion: 'tinetti-it-2026-09-22-v1' },
    }),
  );
  await assert.rejects(
    prisma.$executeRawUnsafe(
      'UPDATE "PatientAssessment" SET "assessedAt"=$1::timestamptz WHERE id=$2',
      '0001-01-01 BC',
      draft.id,
    ),
  );
  await assert.rejects(
    prisma.$executeRawUnsafe(
      'UPDATE "PatientAssessment" SET "assessedAt"=$1::timestamptz WHERE id=$2',
      '9999-12-31T23:30:00+00',
      draft.id,
    ),
  );
});
