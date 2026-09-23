import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MNA_ITEMS } from '../mna-definition.js';
import { MNA_KEYS, MNA_K_KEYS, MNA_MEASUREMENT_KEYS } from '../mna-types.js';
import { parseMnaAnswers, mnaBmi, validMnaDate, mnaAssessmentDate } from '../mna-input.js';
import { mnaCompletion, mnaItemScore, mnaResult, mnaSnapshotItems } from '../mna.js';
import { mnaAgeAtDate } from '../mna-snapshot.js';
import { parseCreate, parsePatch, payloadHash } from '../input.js';
import { mnaAnswers, mnaInput } from './mna-fixture.js';

test('MNA strict canonical answers reject unknown/missing values and retain null/false/notes in payload hashes', () => {
  const empty = mnaAnswers('empty', 'screening');
  assert.deepEqual(parseMnaAnswers(empty), empty);
  const noNotes: any = { ...empty };
  delete noNotes.notes;
  assert.equal(parseMnaAnswers(noNotes).notes, '');
  assert.deepEqual(mnaResult(empty), { screening: null, global: null, total: null });
  for (const key of Object.keys(empty).filter((key) => key !== 'notes')) {
    const missing: any = { ...empty };
    delete missing[key];
    assert.throws(() => parseMnaAnswers(missing), undefined, key);
  }
  for (const value of [
    null,
    [],
    { ...empty, extra: 1 },
    { ...empty, extent: 'draft' },
    { ...empty, K: { ...empty.K, extra: true } },
  ])
    assert.throws(() => parseMnaAnswers(value));
  for (const item of MNA_ITEMS.filter((item) => !['F', 'K', 'Q', 'R'].includes(item.id))) {
    for (const option of item.options)
      assert.doesNotThrow(() => parseMnaAnswers({ ...empty, [item.id]: option.value }));
    for (const invalid of [-1, 0, '0', 0.5, 'invalid', {}, []])
      assert.throws(() => parseMnaAnswers({ ...empty, [item.id]: invalid }));
  }
  assert.throws(() => parseMnaAnswers({ ...empty, K: { ...empty.K, dairyDaily: 'false' } }));
  assert.equal(mnaItemScore(mnaAnswers('zero'), 'D'), 0);
  assert.equal(mnaItemScore(empty, 'D'), null);
  const reversed = Object.fromEntries(Object.entries(mnaAnswers()).reverse());
  assert.equal(payloadHash(parseMnaAnswers(reversed)), payloadHash(parseMnaAnswers(mnaAnswers())));
  const baseline = payloadHash(parseMnaAnswers(empty));
  for (const changed of [
    { ...empty, extent: 'full' },
    { ...empty, notes: ' ' },
    { ...empty, K: { ...empty.K, dairyDaily: false } },
    { ...empty, measurementDates: { ...empty.measurementDates, weightKg: '2026-03-28' } },
    { ...empty, measurements: { ...empty.measurements, weightKg: 45 } },
    { ...empty, F: { method: 'measured' } },
  ])
    assert.notEqual(payloadHash(parseMnaAnswers(changed)), baseline);
});

test('MNA K evaluates all eight boolean combinations and every missing subanswer stays incomplete', () => {
  const expected = [0, 0, 0, 0.5, 0, 0.5, 0.5, 1];
  for (let bits = 0; bits < 8; bits++) {
    const answers = mnaAnswers();
    answers.K = {
      dairyDaily: Boolean(bits & 4),
      eggsOrLegumesWeekly: Boolean(bits & 2),
      meatFishOrPoultryDaily: Boolean(bits & 1),
    };
    assert.equal(mnaItemScore(answers, 'K'), expected[bits]);
    assert.equal(mnaCompletion(answers).global.answeredCount, 12);
    for (const key of MNA_K_KEYS) {
      const partial = { ...answers, K: { ...answers.K, [key]: null } };
      assert.equal(mnaItemScore(partial, 'K'), null);
      assert.equal(mnaResult(partial).global, null);
      assert.equal(mnaCompletion(partial).global.answeredCount, 11);
      assert.deepEqual(mnaCompletion(partial).global.missingPaths, ['K.' + key]);
      const item = mnaSnapshotItems(partial).find((item) => item.id === 'K')!;
      assert.equal(item.score, null);
      assert.equal(item.description, null);
      assert.deepEqual(
        item.subitems!.map((row) => row.id),
        MNA_K_KEYS,
      );
      assert.equal(item.subitems!.find((row) => row.id === key)!.answer, null);
    }
  }
  assert(
    mnaSnapshotItems(mnaAnswers())
      .filter((item) => item.id !== 'K')
      .every((item) => !('subitems' in item)),
  );
});

test('MNA uses exact half points and independent 14/16/30 section boundaries', () => {
  const maximum = mnaResult(mnaAnswers());
  assert.equal(maximum.screening!.score, 14);
  assert.equal(maximum.global!.score, 16);
  assert.equal(maximum.total!.score, 30);
  assert.equal(mnaResult(mnaAnswers('zero')).total!.score, 0);
  const seven = {
    ...mnaAnswers('zero'),
    A: 'no_reduction',
    B: 'no_loss',
    C: 'goes_out',
  } as ReturnType<typeof mnaAnswers>;
  const eight = { ...seven, E: 'moderate_dementia' } as ReturnType<typeof mnaAnswers>;
  const eleven = { ...eight, F: { method: 'category', category: 'gte23' } } as ReturnType<
    typeof mnaAnswers
  >;
  const twelve = { ...eleven, E: 'no_psychological_problems' } as ReturnType<typeof mnaAnswers>;
  for (const [answers, score, band] of [
    [seven, 7, 'malnourished'],
    [eight, 8, 'at_risk'],
    [eleven, 11, 'at_risk'],
    [twelve, 12, 'normal'],
  ] as const) {
    assert.equal(mnaResult(answers).screening!.score, score);
    assert.equal(mnaResult(answers).screening!.band, band);
  }
  const zeroGlobal = {
    ...mnaAnswers('zero'),
    ...Object.fromEntries(MNA_KEYS.slice(0, 6).map((key) => [key, mnaAnswers()[key]])),
  };
  const sixteenHalf = { ...zeroGlobal, J: 'three_meals', P: 'unknown' } as ReturnType<
    typeof mnaAnswers
  >;
  const seventeen = {
    ...zeroGlobal,
    J: 'three_meals',
    Q: { method: 'category', category: 'gt22' },
  } as ReturnType<typeof mnaAnswers>;
  const twentyThreeHalf = {
    ...mnaAnswers(),
    G: false,
    H: true,
    I: true,
    J: 'one_meal',
    P: 'unknown',
  } as ReturnType<typeof mnaAnswers>;
  const twentyFour = { ...twentyThreeHalf, P: 'same' } as ReturnType<typeof mnaAnswers>;
  for (const [answers, score, band] of [
    [sixteenHalf, 16.5, 'malnourished'],
    [seventeen, 17, 'at_risk'],
    [twentyThreeHalf, 23.5, 'at_risk'],
    [twentyFour, 24, 'normal'],
  ] as const) {
    assert.equal(mnaResult(answers).total!.score, score);
    assert.equal(mnaResult(answers).total!.band, band);
  }
  const screen = { ...mnaAnswers(), extent: 'screening' as const };
  assert.equal(mnaResult(screen).total, null);
  assert.equal(mnaResult(screen).global!.score, 16);
  const partial = {
    ...screen,
    G: null,
    K: { dairyDaily: true, eggsOrLegumesWeekly: null, meatFishOrPoultryDaily: false },
  };
  assert(mnaCompletion(partial).complete);
  assert.equal(mnaResult(partial).screening!.score, 14);
  assert.equal(mnaResult(partial).global, null);
  assert.equal(mnaResult(partial).total, null);
  assert(!mnaCompletion({ ...partial, extent: 'full' }).complete);
  const missingScreen = { ...mnaAnswers(), A: null };
  assert.equal(mnaResult(missingScreen).screening, null);
  assert.equal(mnaResult(missingScreen).global!.score, 16);
});

test('MNA anthropometry derives unrounded threshold scores and rejects concurrent categories or unusable numbers', () => {
  for (const [bmi, score] of [
    [18.9999999, 0],
    [19, 1],
    [20.9999999, 1],
    [21, 2],
    [22.9999999, 2],
    [23, 3],
  ]) {
    const answers = mnaAnswers();
    answers.F = { method: 'measured' };
    answers.measurements.weightKg = bmi * 4;
    answers.measurements.heightCm = 200;
    assert.equal(mnaBmi(parseMnaAnswers(answers).measurements), bmi);
    assert.equal(mnaItemScore(answers, 'F'), score);
    assert.throws(() =>
      parseMnaAnswers({ ...answers, F: { method: 'category', category: 'gte23' } }),
    );
    assert.throws(() => parseMnaAnswers({ ...answers, F: { method: 'measured', category: null } }));
  }
  for (const [value, score] of [
    [20.999, 0],
    [21, 0.5],
    [22, 0.5],
    [22.001, 1],
  ]) {
    const answers = mnaAnswers();
    answers.Q = { method: 'measured' };
    answers.measurements.armCircumferenceCm = value;
    assert.equal(mnaItemScore(parseMnaAnswers(answers), 'Q'), score);
    assert.throws(() => parseMnaAnswers({ ...answers, Q: { method: 'category', category: null } }));
  }
  for (const [value, score] of [
    [30.999, 0],
    [31, 1],
  ]) {
    const answers = mnaAnswers();
    answers.R = { method: 'measured' };
    answers.measurements.calfCircumferenceCm = value;
    assert.equal(mnaItemScore(parseMnaAnswers(answers), 'R'), score);
    assert.throws(() =>
      parseMnaAnswers({ ...answers, R: { method: 'category', category: 'gte31' } }),
    );
  }
  for (const key of ['weightKg', 'heightCm'] as const) {
    const answers = mnaAnswers();
    answers.measurements[key] = 50;
    assert.equal(mnaBmi(parseMnaAnswers(answers).measurements), null);
    assert.equal(mnaItemScore(answers, 'F'), 3);
  }
  const missing = mnaAnswers('empty');
  missing.F = { method: 'measured' };
  missing.Q = { method: 'measured' };
  missing.R = { method: 'measured' };
  assert.deepEqual(mnaCompletion(missing).screening.missingPaths.slice(-2), [
    'measurements.weightKg',
    'measurements.heightCm',
  ]);
  assert.equal(mnaItemScore(parseMnaAnswers(missing), 'F'), null);
  for (const key of MNA_MEASUREMENT_KEYS)
    for (const invalid of [0, -1, '2', '', NaN, Infinity, -Infinity]) {
      const answers = mnaAnswers();
      (answers.measurements as any)[key] = invalid;
      assert.throws(() => parseMnaAnswers(answers));
    }
  for (const [weight, height] of [
    [1, 1e-300],
    [1, 1e300],
    [1e308, 1],
    [1e-300, 1e150],
  ]) {
    const answers = mnaAnswers();
    answers.F = { method: 'measured' };
    answers.measurements.weightKg = weight;
    answers.measurements.heightCm = height;
    assert.throws(() => parseMnaAnswers(answers));
  }
});

test('MNA calendar/notes validation preserves Unicode and rejects date rollover or invalid clinical Rome boundaries', () => {
  const valid = ['0001-01-01', '2000-02-29', '2024-02-29', '9999-12-31'];
  const invalid = [
    '0000-01-01',
    '1900-02-29',
    '2026-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-01-00',
    '2026-1-01',
    '2026-01-01T00:00:00Z',
  ];
  for (const value of valid) assert(validMnaDate(value));
  for (const value of invalid) assert(!validMnaDate(value));
  for (const key of MNA_MEASUREMENT_KEYS)
    for (const value of [...valid, ...invalid]) {
      const answers = mnaAnswers();
      answers.measurementDates[key] = value;
      if (valid.includes(value)) assert.doesNotThrow(() => parseMnaAnswers(answers));
      else assert.throws(() => parseMnaAnswers(answers));
    }
  for (const notes of ['  prima\nseconda à Ω\r\n\t', '😀'.repeat(4000)])
    assert.equal(parseMnaAnswers({ ...mnaAnswers(), notes }).notes, notes);
  for (const notes of ['x'.repeat(4001), '\u0000', '\u000b', '\u007f', '\ud800'])
    assert.throws(() => parseMnaAnswers({ ...mnaAnswers(), notes }));
  assert.equal(mnaAssessmentDate('2026-03-28T23:30:00.000Z'), '2026-03-29');
  assert.equal(mnaAssessmentDate('0001-01-01T00:00:00.000Z'), '0001-01-01');
  for (const assessedAt of ['0000-01-01T00:00:00.000Z', '9999-12-31T23:30:00.000Z']) {
    assert.throws(() => parseCreate(mnaInput({ assessedAt })));
    assert.throws(() =>
      parsePatch({ expectedVersion: 1, assessedAt, answers: mnaAnswers() }, 'mna'),
    );
  }
  assert.equal(mnaAgeAtDate('2000-03-29', '2026-03-29'), 26);
  assert.equal(mnaAgeAtDate('2000-03-29', '2026-03-28'), 25);
  assert.equal(mnaAgeAtDate('2000-02-29', '2025-02-28'), 24);
  assert.equal(mnaAgeAtDate('2000-02-29', '2025-03-01'), 25);
  for (const dob of [null, 'not-date', '2027-01-01'])
    assert.equal(mnaAgeAtDate(dob, '2026-03-29'), null);
});
