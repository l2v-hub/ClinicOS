import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  TINETTI_KEYS,
  TINETTI_ITEMS,
  TINETTI_GROUPS,
  emptyTinettiAnswers,
  assertTinettiAnswers,
  tinettiResult,
  tinettiCompletion,
  answeredTinetti,
} from '../assessments/tinettiDefinition';
import { TINETTI_MAXIMUM } from '../assessments/tinettiTypes';
import { completeTinetti, tinettiAssessment } from './tinetti.fixtures';
import { assertAssessment, assertAssessmentHistory } from '../assessments/assessmentValidation';
import { finalAssessment } from './assessments.fixtures';
import { transfersAssessment } from './transfers.fixtures';

test('production Tinetti preserves 20 items, 48 choices and 16/12/28 maxima with zero distinct from null', () => {
  assert.equal(TINETTI_KEYS.length, 20);
  assert.equal(
    TINETTI_ITEMS.reduce((n, item) => n + item.options.length, 0),
    48,
  );
  assert.deepEqual(
    TINETTI_GROUPS.map((group) =>
      TINETTI_ITEMS.filter((item) => item.group === group.id).reduce(
        (n, item) => n + item.options.length - 1,
        0,
      ),
    ),
    [16, 12],
  );
  assert.equal(answeredTinetti(emptyTinettiAnswers()), 0);
  assert.equal(tinettiResult(emptyTinettiAnswers()), null);
  assert.equal(answeredTinetti(completeTinetti(false)), 20);
  assert.deepEqual(tinettiResult(completeTinetti()), {
    balance: 16,
    gait: 12,
    total: 28,
    riskBand: 'low',
    label: 'Basso rischio',
  });
  assert.deepEqual(tinettiResult(completeTinetti(false)), {
    balance: 0,
    gait: 0,
    total: 0,
    riskBand: 'high',
    label: 'Alto rischio cadute',
  });
  for (const item of TINETTI_ITEMS)
    for (let score = 0; score < item.options.length; score++) {
      const answers = { ...completeTinetti(false), [item.id]: score };
      assert.doesNotThrow(() => assertTinettiAnswers(answers));
      assert.equal(tinettiResult(answers)?.total, score);
    }
});
test('production scoring exhausts both independent combination spaces and all risk thresholds', () => {
  for (const [group, expectedCount] of [
    ['balance', 11664],
    ['gait', 2304],
  ] as const) {
    const items = TINETTI_ITEMS.filter((item) => item.group === group);
    let count = 0;
    const visit = (
      index: number,
      answers: ReturnType<typeof completeTinetti>,
      expected: number,
    ) => {
      if (index === items.length) {
        assert.equal(tinettiResult(answers)?.[group], expected);
        count++;
        return;
      }
      const item = items[index];
      for (let score = 0; score < item.options.length; score++)
        visit(index + 1, { ...answers, [item.id]: score }, expected + score);
    };
    visit(0, completeTinetti(false), 0);
    assert.equal(count, expectedCount);
  }
  for (const [total, band] of [
    [18, 'high'],
    [19, 'moderate'],
    [23, 'moderate'],
    [24, 'low'],
  ] as const) {
    const answers = completeTinetti(false);
    let remaining = total;
    for (const key of TINETTI_KEYS) {
      const score = Math.min(TINETTI_MAXIMUM[key], remaining);
      (answers as Record<string, unknown>)[key] = score;
      remaining -= score;
    }
    assert.equal(tinettiResult(answers)?.total, total);
    assert.equal(tinettiResult(answers)?.riskBand, band);
  }
});
test('every missing item prevents risk, invalid domains reject, and notes do not count as answers', () => {
  for (const key of TINETTI_KEYS) {
    const answers = { ...completeTinetti(), [key]: null };
    assert.equal(tinettiResult(answers), null);
    assert.equal(answeredTinetti(answers), 19);
    assert.deepEqual(tinettiCompletion(answers).missingPaths, [key]);
    for (const value of [-1, '0', 0.5, TINETTI_MAXIMUM[key] + 1, undefined, false, NaN])
      assert.throws(() => assertTinettiAnswers({ ...answers, [key]: value }));
  }
  assert.throws(() => assertTinettiAnswers({ ...completeTinetti(), unknown: 0 }));
  const answers = { ...emptyTinettiAnswers(), notes: '😀'.repeat(4000) };
  assert.doesNotThrow(() => assertTinettiAnswers(answers));
  assert.equal(answeredTinetti(answers), 0);
  for (const notes of ['a'.repeat(4001), '\u0000', '\ud800'])
    assert.throws(() => assertTinettiAnswers({ ...answers, notes }));
});
test('Tinetti DTO and frozen snapshot validate explicitly, preserving PAINAD and Transfers discrimination', () => {
  const final = tinettiAssessment({ status: 'final' });
  assert.doesNotThrow(() => assertAssessment(final, 'patient-a', final.id, 'tinetti'));
  assert.doesNotThrow(() => assertAssessment(finalAssessment(), 'patient-a'));
  assert.doesNotThrow(() =>
    assertAssessment(transfersAssessment({ status: 'final' }), 'patient-a'),
  );
  const reorder = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(reorder)
      : value && typeof value === 'object'
        ? Object.fromEntries(
            Object.entries(value)
              .reverse()
              .map(([key, item]) => [key, reorder(item)]),
          )
        : value;
  assert.doesNotThrow(() => assertAssessment(reorder(final), 'patient-a'));
  for (const mutate of [
    (r: typeof final) => {
      r.snapshotSha256 = null;
    },
    (r: typeof final) => {
      r.snapshotSha256 = 'bad-hash';
    },
    (r: typeof final) => {
      r.finalSnapshot!.items[10].group = 'balance';
    },
    (r: typeof final) => {
      r.finalSnapshot!.items[0].description = 'alterata';
    },
    (r: typeof final) => {
      r.finalSnapshot!.notes = 'alterate';
    },
    (r: typeof final) => {
      r.finalSnapshot!.provenance = 'convalida inventata';
    },
    (r: typeof final) => {
      r.finalSnapshot!.form.referenceSha256 = 'a'.repeat(64);
    },
    (r: typeof final) => {
      r.finalSnapshot!.result.balance = 15;
    },
    (r: typeof final) => {
      Object.assign(r.finalSnapshot!, { interpretation: 'PAINAD' });
    },
    (r: typeof final) => {
      Object.assign(r, { result: finalAssessment().result });
    },
    (r: typeof final) => {
      Object.assign(r, { finalSnapshot: finalAssessment().finalSnapshot });
    },
    (r: typeof final) => {
      r.answeredCount = 19;
    },
  ]) {
    const bad = structuredClone(final);
    mutate(bad);
    assert.throws(() => assertAssessment(bad, 'patient-a'));
  }
  const partial = tinettiAssessment({ answers: emptyTinettiAnswers() });
  assert.doesNotThrow(() => assertAssessmentHistory(partial, 'patient-a'));
  assert.throws(() => assertAssessmentHistory({ ...partial, result: final.result }, 'patient-a'));
  assert.throws(() => assertAssessment(final, 'other-patient'));
  assert.throws(() => assertAssessment(final, 'patient-a', final.id, 'painad'));
});
