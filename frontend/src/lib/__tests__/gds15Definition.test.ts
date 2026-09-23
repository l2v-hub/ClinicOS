import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GDS15_KEYS, type Gds15Answers } from '../assessments/gds15Types';
import {
  emptyGds15Answers,
  parseGds15Answers,
  gds15Result,
  gds15Completion,
  gds15ResultForTotal,
  gds15SnapshotItems,
  validGds15Result,
  GDS15_ITEMS,
} from '../assessments/gds15Definition';
import { assertAssessment, assertAssessmentHistory } from '../assessments/assessmentValidation';
import { completeGds15, gds15Assessment } from './gds15.fixtures';

test('all 32768 GDS-15 combinations match independent reverse-scoring oracle and source thresholds', () => {
  const reverse = new Set([0, 4, 6, 10, 12]);
  const seen = new Set<number>();
  for (let bits = 0; bits < 32768; bits++) {
    const answers = emptyGds15Answers();
    let expected = 0;
    GDS15_KEYS.forEach((key, index) => {
      answers[key] = Boolean(bits & (1 << index));
      expected += Number(reverse.has(index) ? !answers[key] : answers[key]);
    });
    const result = gds15Result(answers)!;
    assert.equal(result.total, expected);
    assert.equal(result.maximum, 15);
    assert.equal(result.band, expected <= 5 ? 'none' : expected <= 9 ? 'mild_moderate' : 'severe');
    assert.equal(
      result.label,
      expected <= 5
        ? 'Assente / Nella norma'
        : expected <= 9
          ? 'Depressione lieve–moderata'
          : 'Depressione grave',
    );
    assert.equal(gds15Completion(answers).complete, true);
    seen.add(expected);
  }
  assert.deepEqual(
    [...seen].sort((a, b) => a - b),
    Array.from({ length: 16 }, (_, i) => i),
  );
  assert.equal(gds15Result(completeGds15())!.total, 10);
  assert.equal(gds15Result(completeGds15(false))!.total, 5);
  for (const total of [0, 5, 6, 9, 10, 15])
    assert.equal(validGds15Result(gds15ResultForTotal(total)), true);
  assert.deepEqual(
    GDS15_ITEMS.filter((item) => !item.pointForYes).map((item) => item.id),
    ['q1', 'q5', 'q7', 'q11', 'q13'],
  );
});

test('every missing answer suppresses a result; strict parsing rejects invalid domains, keys and notes', () => {
  assert.deepEqual(gds15Completion(emptyGds15Answers()).missingPaths, [...GDS15_KEYS]);
  for (const key of GDS15_KEYS) {
    const partial = { ...completeGds15(), [key]: null };
    assert.equal(gds15Result(partial), null);
    assert.deepEqual(gds15Completion(partial).missingPaths, [key]);
    const item = gds15SnapshotItems(partial).find((item) => item.id === key)!;
    assert.equal(item.answer, null);
    assert.equal(item.score, null);
    assert.equal(item.description, 'Non risposto');
    for (const value of [0, 1, 'true', '', [], {}, undefined]) {
      assert.throws(() => parseGds15Answers({ ...partial, [key]: value }));
    }
    const missing = { ...partial };
    delete (missing as Partial<Gds15Answers>)[key];
    assert.throws(() => parseGds15Answers(missing));
  }
  assert.throws(() => parseGds15Answers({ ...completeGds15(), unknown: true }));
  for (const notes of [
    undefined,
    null,
    1,
    'a'.repeat(4001),
    'bad\u0000text',
    'bad\u007ftext',
    '\ud800',
    '\udfff',
  ]) {
    assert.throws(() => parseGds15Answers({ ...completeGds15(), notes }));
  }
  const notes = '😀'.repeat(3997) + '\n\t ';
  assert.equal(parseGds15Answers({ ...completeGds15(), notes }).notes, notes);
  const omitted: Record<string, unknown> = { ...completeGds15() };
  delete omitted.notes;
  assert.equal(parseGds15Answers(omitted).notes, '');
  for (const row of [
    { total: 16, maximum: 15, band: 'severe', label: 'Depressione grave' },
    { ...gds15ResultForTotal(5), maximum: 10 },
    { ...gds15ResultForTotal(6), band: 'none' },
    { ...gds15ResultForTotal(9), extra: 0 },
  ])
    assert.equal(validGds15Result(row), false);
});

test('history and final snapshot validation bind GDS content, booleans, completion, patient and exact result', () => {
  const final = gds15Assessment({ status: 'final' });
  assert.doesNotThrow(() => assertAssessment(final, 'patient-a', final.id, 'gds15'));
  assert.throws(() => assertAssessment(final, 'patient-b'));
  assert.throws(() => assertAssessment(final, 'patient-a', final.id, 'painad'));
  const corruptions = [
    (row: typeof final) => {
      row.finalSnapshot!.items[0].answer = false;
    },
    (row: typeof final) => {
      row.finalSnapshot!.items[0].score = 1;
    },
    (row: typeof final) => {
      row.finalSnapshot!.items[0].description = 'No';
    },
    (row: typeof final) => {
      row.finalSnapshot!.items.reverse();
    },
    (row: typeof final) => {
      row.finalSnapshot!.items[0].label = 'Changed question';
    },
    (row: typeof final) => {
      row.finalSnapshot!.instruction = 'Changed period';
    },
    (row: typeof final) => {
      row.finalSnapshot!.screeningNote = '';
    },
    (row: typeof final) => {
      row.finalSnapshot!.reference = '';
    },
    (row: typeof final) => {
      row.finalSnapshot!.provenance = '';
    },
    (row: typeof final) => {
      row.finalSnapshot!.notes = '';
    },
    (row: typeof final) => {
      row.finalSnapshot!.result = gds15ResultForTotal(9);
    },
    (row: typeof final) => {
      row.finalSnapshot!.author = { ...row.finalSnapshot!.author, name: 'Another author' };
    },
    (row: typeof final) => {
      row.snapshotSha256 = null;
    },
    (row: typeof final) => {
      row.result = gds15ResultForTotal(9);
    },
    (row: typeof final) => {
      row.completion.missingPaths = ['q1'];
    },
  ];
  for (const change of corruptions) {
    const row = structuredClone(final);
    change(row);
    assert.throws(() => assertAssessment(row, 'patient-a'));
  }
  const draft = gds15Assessment({ answers: emptyGds15Answers() });
  assert.doesNotThrow(() => assertAssessment(draft, 'patient-a'));
  const wrong = structuredClone(draft);
  wrong.completion.missingPaths.reverse();
  assert.throws(() => assertAssessmentHistory(wrong, 'patient-a'));
  const partial = gds15Assessment({ answers: { ...completeGds15(), q1: null } });
  assert.throws(() =>
    assertAssessmentHistory({ ...partial, result: gds15ResultForTotal(0) }, 'patient-a'),
  );
  assert.throws(() =>
    assertAssessment({ ...draft, finalSnapshot: final.finalSnapshot }, 'patient-a'),
  );
});
