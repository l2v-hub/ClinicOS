import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  emptyMnaAnswers,
  mnaCompletion,
  mnaItemScore,
  mnaResult,
  mnaSnapshotItems,
} from '../assessments/mnaDefinition';
import {
  assertMnaAnswers,
  mnaBmi,
  parseMnaAnswers,
  validMnaDate,
} from '../assessments/mnaInputValidation';
import { MNA_ITEMS } from '../assessments/mnaItems';
import { MNA_KEYS, MNA_K_KEYS, MNA_MEASUREMENT_KEYS } from '../assessments/mnaTypes';
import { completeMna } from './mna.fixtures';
import { displayMnaBmi } from '../assessments/mnaLocalInputs';

test('MNA production preserves 18 items, 48 scored alternatives plus three booleans, maxima14/16/30 and zeros', () => {
  assert.equal(MNA_ITEMS.length, 18);
  assert.equal(
    MNA_ITEMS.reduce((n, item) => n + item.options.length, 0),
    48,
  );
  assert.deepEqual(mnaResult(emptyMnaAnswers()), { screening: null, global: null, total: null });
  const max = mnaResult(completeMna());
  assert.equal(max.screening?.score, 14);
  assert.equal(max.global?.score, 16);
  assert.equal(max.total?.score, 30);
  const zero = mnaResult(completeMna(false));
  assert.equal(zero.screening?.score, 0);
  assert.equal(zero.global?.score, 0);
  assert.equal(zero.total?.score, 0);
  assert.equal(mnaCompletion(completeMna(false)).global.answeredCount, 12);
  for (const item of MNA_ITEMS.filter((item) => item.id !== 'K'))
    for (const option of item.options) {
      const answers = {
        ...completeMna(false),
        [item.id]: ['F', 'Q', 'R'].includes(item.id)
          ? { method: 'category', category: option.value }
          : option.value,
      };
      assertMnaAnswers(answers);
      assert.equal(mnaItemScore(answers, item.id), option.score);
    }
});
test('MNA independently constructed screening and full boundary cases retain distinct bands', () => {
  const a = completeMna(false);
  Object.assign(a, { A: 'no_reduction', B: 'no_loss', C: 'goes_out' });
  assert.deepEqual(
    [mnaResult(a).screening?.score, mnaResult(a).screening?.band],
    [7, 'malnourished'],
  );
  a.E = 'moderate_dementia';
  assert.deepEqual([mnaResult(a).screening?.score, mnaResult(a).screening?.band], [8, 'at_risk']);
  a.F = { method: 'category', category: 'gte23' };
  assert.deepEqual([mnaResult(a).screening?.score, mnaResult(a).screening?.band], [11, 'at_risk']);
  a.E = 'no_psychological_problems';
  assert.deepEqual([mnaResult(a).screening?.score, mnaResult(a).screening?.band], [12, 'normal']);
  a.D = false;
  a.P = 'better';
  a.M = '3_to_5_glasses';
  assert.deepEqual([mnaResult(a).total?.score, mnaResult(a).total?.band], [16.5, 'malnourished']);
  a.Q = { method: 'category', category: '21_to_22' };
  assert.deepEqual([mnaResult(a).total?.score, mnaResult(a).total?.band], [17, 'at_risk']);
  const b = completeMna();
  Object.assign(b, { G: false, H: true, I: true, J: 'one_meal', N: 'independent_with_difficulty' });
  b.K.dairyDaily = false;
  assert.deepEqual([mnaResult(b).total?.score, mnaResult(b).total?.band], [23.5, 'at_risk']);
  b.K.dairyDaily = true;
  assert.deepEqual([mnaResult(b).total?.score, mnaResult(b).total?.band], [24, 'normal']);
});
test('all eight K combinations and every missing subanswer preserve K partial data and prevent full completion', () => {
  const expected = [0, 0, 0, 0.5, 0, 0.5, 0.5, 1];
  for (let bits = 0; bits < 8; bits++) {
    const a = completeMna();
    a.K = {
      dairyDaily: !!(bits & 4),
      eggsOrLegumesWeekly: !!(bits & 2),
      meatFishOrPoultryDaily: !!(bits & 1),
    };
    assert.equal(mnaItemScore(a, 'K'), expected[bits]);
    for (const key of MNA_K_KEYS) {
      const partial = { ...a, K: { ...a.K, [key]: null } };
      assert.equal(mnaItemScore(partial, 'K'), null);
      assert.equal(mnaResult(partial).global, null);
      assert.equal(mnaResult(partial).total, null);
      assert.deepEqual(mnaCompletion(partial).global.missingPaths, [`K.${key}`]);
      const item = mnaSnapshotItems(partial).find((item) => item.id === 'K')!;
      assert.equal(item.description, null);
      assert.equal(item.subitems?.length, 3);
      assert.equal(item.subitems?.find((item) => item.id === key)?.answer, null);
    }
  }
});
test('every missing A–R response suppresses its section; screening extent retains all global answers without total30', () => {
  for (const id of MNA_KEYS) {
    const a = completeMna();
    if (id === 'K') a.K.dairyDaily = null;
    else if (id === 'F' || id === 'Q' || id === 'R') a[id] = { method: 'category', category: null };
    else a[id] = null;
    assert.equal(mnaResult(a).total, null);
    assert.equal(
      mnaCompletion(a).screening.answeredCount + mnaCompletion(a).global.answeredCount,
      17,
    );
  }
  const a = { ...completeMna(), extent: 'screening' as const };
  assert.equal(mnaResult(a).global?.score, 16);
  assert.equal(mnaResult(a).total, null);
  a.K.dairyDaily = null;
  assert.equal(mnaCompletion(a).complete, true);
  assert.equal(mnaResult(a).screening?.score, 14);
});
test('BMI thresholds use unrounded measured values; Q21/22 inclusive and R31 preserve half points', () => {
  for (const [bmi, expected] of [
    [18.999999, 0],
    [19, 1],
    [20.999999, 1],
    [21, 2],
    [22.999999, 2],
    [23, 3],
  ]) {
    const a = completeMna();
    a.F = { method: 'measured' };
    a.measurements.weightKg = bmi;
    a.measurements.heightCm = 100;
    assert.equal(mnaBmi(a.measurements), bmi);
    assert.equal(mnaItemScore(a, 'F'), expected);
    if (!Number.isInteger(bmi)) assert.notEqual(displayMnaBmi(bmi), String(Math.ceil(bmi)));
  }
  for (const [arm, score] of [
    [20.999, 0],
    [21, 0.5],
    [22, 0.5],
    [22.001, 1],
  ]) {
    const a = completeMna();
    a.Q = { method: 'measured' };
    a.measurements.armCircumferenceCm = arm;
    assert.equal(mnaItemScore(a, 'Q'), score);
  }
  for (const calf of [30.999, 31]) {
    const a = completeMna();
    a.R = { method: 'measured' };
    a.measurements.calfCircumferenceCm = calf;
    assert.equal(mnaItemScore(a, 'R'), calf < 31 ? 0 : 1);
  }
});
test('strict payloads reject category/measure contradictions, malformed values and nonfinite BMI without render throws', () => {
  const a = emptyMnaAnswers();
  a.F = { method: 'category', category: 'gte23' };
  a.measurements.weightKg = 60;
  assert.doesNotThrow(() => assertMnaAnswers(a));
  assert.equal(mnaBmi(a.measurements), null);
  a.measurements.heightCm = 170;
  assert.throws(() => assertMnaAnswers(a));
  a.F = { method: 'measured' };
  assert.doesNotThrow(() => assertMnaAnswers(a));
  assert.throws(() => assertMnaAnswers({ ...a, F: { method: 'measured', category: null } }));
  for (const value of [0, -1, Infinity, NaN, '60'])
    assert.throws(() =>
      assertMnaAnswers({ ...a, measurements: { ...a.measurements, weightKg: value } }),
    );
  for (const height of [Number.MIN_VALUE, Number.MAX_VALUE]) {
    const invalid = { ...a, measurements: { ...a.measurements, heightCm: height } };
    assert.throws(() => assertMnaAnswers(invalid));
    assert.doesNotThrow(() => mnaResult(invalid));
    assert.equal(mnaResult(invalid).screening, null);
  }
  for (const key of Object.keys(a)) {
    const missing = { ...a } as Record<string, unknown>;
    delete missing[key];
    assert.throws(() => assertMnaAnswers(missing));
  }
  assert.throws(() => assertMnaAnswers({ ...a, extra: 1 }));
});
test('calendar dates and Unicode notes are strict, independent and preserved without numeric values', () => {
  for (const date of ['0001-01-01', '2000-02-29', '9999-12-31'])
    assert.equal(validMnaDate(date), true);
  for (const date of ['0000-01-01', '1900-02-29', '2026-02-30', '2026-1-01', '10000-01-01'])
    assert.equal(validMnaDate(date), false);
  const a = emptyMnaAnswers();
  for (const key of MNA_MEASUREMENT_KEYS) a.measurementDates[key] = '0001-01-01';
  a.notes = '😀'.repeat(4000);
  assert.deepEqual(parseMnaAnswers(a), a);
  for (const notes of ['😀'.repeat(4001), '\ud800', '\u0000'])
    assert.throws(() => assertMnaAnswers({ ...a, notes }));
});
