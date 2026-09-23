import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TINETTI_KEYS, TINETTI_MAX_SCORE, type TinettiAnswers } from '../tinetti-types.js';
import { TINETTI_ITEMS } from '../tinetti-definition.js';
import {
  parseTinettiAnswers,
  tinettiCompletion,
  tinettiResult,
  tinettiSnapshotItems,
} from '../tinetti.js';
import { tinettiAnswers } from './tinetti-fixture.js';

test('all 48 approved options produce exact balance/gait totals and preserve the 16/12/28 model', () => {
  assert.deepEqual(
    Object.values(TINETTI_MAX_SCORE),
    [1, 2, 2, 2, 2, 2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1],
  );
  assert.equal(TINETTI_ITEMS.length, 20);
  assert.deepEqual(
    TINETTI_ITEMS.map((item) => item.id),
    TINETTI_KEYS,
  );
  let options = 0;
  for (const [index, key] of TINETTI_KEYS.entries()) {
    assert.equal(TINETTI_ITEMS[index].options.length, TINETTI_MAX_SCORE[key] + 1);
    for (let score = 0; score <= TINETTI_MAX_SCORE[key]; score++) {
      const answers = parseTinettiAnswers({ ...tinettiAnswers('zero'), [key]: score });
      const result = tinettiResult(answers)!;
      assert.equal(result.total, score);
      assert.equal(result.balance, index < 10 ? score : 0);
      assert.equal(result.gait, index < 10 ? 0 : score);
      assert.equal(tinettiSnapshotItems(answers)[index].score, score);
      options++;
    }
  }
  assert.equal(options, 48);
  assert.deepEqual(tinettiResult(tinettiAnswers()), {
    balance: 16,
    gait: 12,
    total: 28,
    riskBand: 'low',
    label: 'Basso rischio',
  });
  assert.deepEqual(tinettiResult(tinettiAnswers('zero')), {
    balance: 0,
    gait: 0,
    total: 0,
    riskBand: 'high',
    label: 'Alto rischio cadute',
  });
  for (const [target, riskBand, label] of [
    [18, 'high', 'Alto rischio cadute'],
    [19, 'moderate', 'Rischio moderato'],
    [23, 'moderate', 'Rischio moderato'],
    [24, 'low', 'Basso rischio'],
  ] as const) {
    let remaining = target;
    const answers = tinettiAnswers('zero');
    for (const key of TINETTI_KEYS) {
      const score = Math.min(remaining, TINETTI_MAX_SCORE[key]);
      (answers as Record<string, unknown>)[key] = score;
      remaining -= score;
    }
    assert.equal(tinettiResult(answers)!.total, target);
    assert.equal(tinettiResult(answers)!.riskBand, riskBand);
    assert.equal(tinettiResult(answers)!.label, label);
  }
});
test('twenty missing answers never gain a risk class; malformed values cannot become scores', () => {
  for (const key of TINETTI_KEYS) {
    const answers = { ...tinettiAnswers(), [key]: null };
    assert.equal(tinettiResult(answers), null);
    assert.deepEqual(tinettiCompletion(answers), { complete: false, missingPaths: [key] });
    const missing = { ...answers } as Record<string, unknown>;
    delete missing[key];
    assert.throws(() => parseTinettiAnswers(missing));
    for (const value of [-1, '0', 0.5, TINETTI_MAX_SCORE[key] + 1, undefined, true]) {
      assert.throws(() => parseTinettiAnswers({ ...answers, [key]: value }));
      assert.equal(tinettiResult({ ...answers, [key]: value } as TinettiAnswers), null);
    }
  }
  assert.throws(() => parseTinettiAnswers({ ...tinettiAnswers(), unknown: 0 }));
  assert.deepEqual(tinettiCompletion(tinettiAnswers('empty')).missingPaths, TINETTI_KEYS);
});
test('optional notes preserve Unicode, whitespace and newlines with a 4000-codepoint boundary', () => {
  const { notes, ...withoutNotes } = tinettiAnswers();
  assert.equal(parseTinettiAnswers(withoutNotes).notes, '');
  const text = '  Prima riga à Ω\nSeconda riga\t  ';
  assert.equal(parseTinettiAnswers({ ...withoutNotes, notes: text }).notes, text);
  assert.equal(
    [...parseTinettiAnswers({ ...withoutNotes, notes: '😀'.repeat(4000) }).notes].length,
    4000,
  );
  for (const notes of ['x'.repeat(4001), 'a\u0000b', '\uD800', '\uDC00', null, 0])
    assert.throws(() => parseTinettiAnswers({ ...withoutNotes, notes }));
});
