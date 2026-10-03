// Unit tests of the paper-form scales: every option of every item, totals, bands, F1/F2, NPI rules,
// and the byte-identity of the shared definition/engine files with the frontend copies.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  BARTHEL_PAPER,
  GDS15_PAPER,
  MNA_SF_PAPER,
  PAINAD_PAPER,
  PAPER_SCALES,
  TINETTI_PAPER,
  UCLA_NPI_SLEEP_PAPER,
  type PaperScale,
} from '../paper/definitions.js';
import {
  PaperInputError,
  bmiPoints,
  calfPoints,
  emptyPaperAnswers,
  paperBand,
  paperCompletion,
  paperItems,
  paperResult,
  paperSnapshotItems,
  parsePaperAnswers,
  type PaperAnswers,
} from '../paper/engine.js';
import { PAPER_VERSIONS } from '../paper/types.js';
import { TINETTI_KEYS, TINETTI_MAX_SCORE } from '../tinetti-types.js';
import { GDS15_ITEMS } from '../gds15-definition.js';
import { PAINAD_ITEMS } from '../painad.js';
import { PAINAD_KEYS, PAINAD_VERSION } from '../types.js';

const fill = (
  scale: PaperScale,
  pick: (item: ReturnType<typeof paperItems>[number]) => unknown,
) => {
  const answers: PaperAnswers = emptyPaperAnswers(scale);
  for (const item of paperItems(scale)) {
    if (item.key === 'f2') continue;
    answers[item.key] = pick(item) as never;
  }
  return answers;
};
const max = (scale: PaperScale) =>
  fill(scale, (item) => item.options.reduce((a, b) => (b.points > a.points ? b : a)).value);
const min = (scale: PaperScale) =>
  fill(scale, (item) => item.options.reduce((a, b) => (b.points < a.points ? b : a)).value);

test('shared definition and engine files are byte-identical to the frontend copies', () => {
  for (const file of ['definitions.ts', 'engine.ts']) {
    const backend = readFileSync(new URL(`../paper/${file}`, import.meta.url), 'utf8');
    const frontend = readFileSync(
      new URL(`../../../../frontend/src/lib/assessments/paper/${file}`, import.meta.url),
      'utf8',
    );
    assert.equal(frontend.replace(/\r\n/g, '\n'), backend.replace(/\r\n/g, '\n'), file);
  }
  assert.deepEqual(
    PAPER_SCALES.filter((scale) => scale.type !== 'painad').map((scale) => [
      scale.type,
      scale.version,
    ]),
    Object.entries(PAPER_VERSIONS).sort(
      (a, b) =>
        PAPER_SCALES.findIndex((s) => s.type === a[0]) -
        PAPER_SCALES.findIndex((s) => s.type === b[0]),
    ),
  );
});

test('every scale: each option scores exactly its printed points; maxima and band coverage match the paper', () => {
  let options = 0;
  for (const scale of PAPER_SCALES) {
    assert.equal(paperResult(scale, max(scale))!.total, scale.maximum, scale.type);
    assert.equal(paperResult(scale, min(scale))!.total, 0, scale.type);
    for (let total = 0; total <= scale.maximum; total++)
      assert.equal(
        scale.bands.filter((band) => total >= band.min && total <= band.max).length,
        1,
        `${scale.type} total ${total} must fall in exactly one band`,
      );
    for (const section of scale.sections)
      assert.equal(
        section.items
          .filter((item) => !item.excludedFromTotal)
          .reduce((sum, item) => sum + Math.max(...item.options.map((o) => o.points)), 0) >=
          section.maximum || scale.scoring === 'npi',
        true,
      );
    if (scale.scoring === 'npi') continue;
    for (const item of paperItems(scale)) {
      for (const option of item.options) {
        const answers = { ...min(scale), [item.key]: option.value };
        if (item.group)
          for (const other of paperItems(scale))
            if (other.group === item.group && other.key !== item.key) answers[other.key] = null;
        const result = paperResult(scale, parsePaperAnswers(scale, answers))!;
        const baseline = item.group
          ? 0
          : item.options.reduce((a, b) => (b.points < a.points ? b : a)).points;
        assert.equal(
          result.total,
          option.points - baseline,
          `${scale.type}.${item.key}=${option.value}`,
        );
        const snapshot = paperSnapshotItems(scale, answers).find((row) => row.key === item.key)!;
        assert.equal(snapshot.description, option.label);
        assert.equal(snapshot.score, option.points);
        options++;
      }
    }
  }
  // Barthel 30 + Tinetti 48 + GDS 30 + MNA-SF 21 + PAINAD 15 (NPI covered in its own test)
  assert.equal(options, 144);
});

test('Barthel: 10 items, max 100, five bands with the paper thresholds', () => {
  assert.equal(paperItems(BARTHEL_PAPER).length, 10);
  assert.deepEqual(
    paperItems(BARTHEL_PAPER).map((item) => item.options.map((o) => o.points)),
    [
      [0, 5, 10],
      [0, 5],
      [0, 5],
      [0, 5, 10],
      [0, 5, 10],
      [0, 5, 10],
      [0, 5, 10],
      [0, 5, 10, 15],
      [0, 5, 10, 15],
      [0, 5, 10],
    ],
  );
  for (const [total, band, label] of [
    [0, 'total', 'Dipendenza totale'],
    [20, 'total', 'Dipendenza totale'],
    [25, 'severe', 'Dipendenza grave'],
    [60, 'severe', 'Dipendenza grave'],
    [65, 'moderate', 'Dipendenza moderata'],
    [90, 'moderate', 'Dipendenza moderata'],
    [95, 'mild', 'Dipendenza lieve'],
    [100, 'independent', 'Completamente autonomo'],
  ] as const) {
    assert.equal(paperBand(BARTHEL_PAPER, total).id, band);
    assert.equal(paperBand(BARTHEL_PAPER, total).label, label);
  }
  assert.match(BARTHEL_PAPER.sections[0].items[0].options[0].label, /imboccato$/);
  assert(BARTHEL_PAPER.signature);
});

test('Tinetti v2 keeps the 20 v1 answer keys and ranges (16+12=28) under paper numbering 1–16', () => {
  const items = paperItems(TINETTI_PAPER);
  assert.deepEqual(
    items.map((item) => item.key),
    TINETTI_KEYS,
  );
  for (const item of items)
    assert.equal(
      Math.max(...item.options.map((o) => o.points)),
      TINETTI_MAX_SCORE[item.key as keyof typeof TINETTI_MAX_SCORE],
    );
  assert.deepEqual(
    [...new Set(items.map((item) => item.number))],
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'],
  );
  assert.equal(items.filter((item) => item.number === '11').length, 4);
  assert.equal(items.filter((item) => item.number === '8').length, 2);
  const full = paperResult(TINETTI_PAPER, max(TINETTI_PAPER))!;
  assert.deepEqual(
    full.parts?.map((part) => [part.id, part.total, part.maximum]),
    [
      ['balance', 16, 16],
      ['gait', 12, 12],
    ],
  );
  for (const [total, band] of [
    [18, 'high'],
    [19, 'moderate'],
    [23, 'moderate'],
    [24, 'low'],
  ] as const)
    assert.equal(paperBand(TINETTI_PAPER, total).id, band);
  assert.equal(paperBand(TINETTI_PAPER, 18).label, 'Rischio caduta elevato');
  assert(TINETTI_PAPER.notes && TINETTI_PAPER.signature);
});

test('GDS-15 v2: paper wording, same scoring key as v1, bands Normalità / lieve-moderata / grave', () => {
  const items = paperItems(GDS15_PAPER);
  assert.equal(items.length, 15);
  items.forEach((item, index) => {
    assert.equal(item.key, GDS15_ITEMS[index].id);
    assert.equal(
      item.options.find((o) => o.value === true)!.points,
      GDS15_ITEMS[index].pointForYes ? 1 : 0,
    );
    assert.equal(
      item.options.find((o) => o.value === false)!.points,
      GDS15_ITEMS[index].pointForYes ? 0 : 1,
    );
  });
  assert.equal(items[0].label, 'È fondamentalmente soddisfatto/a della Sua vita?');
  assert.equal(items[3].label, 'Si annoia spesso?');
  for (const [total, label] of [
    [5, 'Normalità'],
    [6, 'Depressione lieve-moderata'],
    [9, 'Depressione lieve-moderata'],
    [10, 'Depressione grave'],
  ] as const)
    assert.equal(paperBand(GDS15_PAPER, total).label, label);
  const allYes = fill(GDS15_PAPER, () => true);
  assert.equal(paperResult(GDS15_PAPER, allYes)!.total, 10);
});

test('MNA-SF: A–F max 14, F1 from BMI, F2 only when BMI is unavailable, bands 12–14 / 8–11 / 0–7', () => {
  const base = { ...emptyPaperAnswers(MNA_SF_PAPER), a: 2, b: 3, c: 2, d: 2, e: 2 };
  assert.deepEqual(paperCompletion(MNA_SF_PAPER, base).missingPaths, ['f1', 'f2']);
  assert.equal(paperResult(MNA_SF_PAPER, { ...base, f1: 3 })!.total, 14);
  assert.equal(paperResult(MNA_SF_PAPER, { ...base, f2: 3 })!.total, 14);
  assert.equal(paperResult(MNA_SF_PAPER, { ...base, f2: 0 })!.total, 11);
  assert.equal(paperResult(MNA_SF_PAPER, { ...base, f2: 0 })!.label, 'Rischio di malnutrizione');
  assert.throws(() => parsePaperAnswers(MNA_SF_PAPER, { ...base, f1: 1, f2: 3 }), PaperInputError);
  assert.throws(() => parsePaperAnswers(MNA_SF_PAPER, { ...base, f2: 1 }), PaperInputError);
  // BMI thresholds (height in metres, as on the paper)
  for (const [bmi, points] of [
    [18.99, 0],
    [19, 1],
    [20.99, 1],
    [21, 2],
    [22.99, 2],
    [23, 3],
  ] as const)
    assert.equal(bmiPoints(bmi), points);
  const measured = { ...base, weightKg: 50, heightM: 1.7 }; // BMI 17.3 → 0
  assert.equal(parsePaperAnswers(MNA_SF_PAPER, { ...measured, f1: 0 }).f1, 0);
  assert.throws(() => parsePaperAnswers(MNA_SF_PAPER, { ...measured, f1: 3 }), /BMI/);
  assert.throws(() => parsePaperAnswers(MNA_SF_PAPER, { ...measured, f2: 3 }), /F1/);
  // F2 calf circumference branch: < 31 cm = 0, ≥ 31 cm = 3
  assert.equal(calfPoints(30.9), 0);
  assert.equal(calfPoints(31), 3);
  assert.equal(parsePaperAnswers(MNA_SF_PAPER, { ...base, calfCm: 30, f2: 0 }).f2, 0);
  assert.throws(() => parsePaperAnswers(MNA_SF_PAPER, { ...base, calfCm: 30, f2: 3 }), /F2/);
  for (const [key, value] of [
    ['weightKg', 0],
    ['heightM', 170],
    ['calfCm', -1],
    ['heightM', '1.7'],
  ] as const)
    assert.throws(
      () => parsePaperAnswers(MNA_SF_PAPER, { ...base, [key]: value }),
      PaperInputError,
    );
  for (const [total, band] of [
    [0, 'malnourished'],
    [7, 'malnourished'],
    [8, 'at_risk'],
    [11, 'at_risk'],
    [12, 'normal'],
    [14, 'normal'],
  ] as const)
    assert.equal(paperBand(MNA_SF_PAPER, total).id, band);
  assert.equal(paperSnapshotItems(MNA_SF_PAPER, { ...base, f2: 3 }).length, 6);
});

test('UCLA NPI sleep: absent = 0, frequency × severity 1–12, caregiver distress 0–5 outside the total', () => {
  const empty = emptyPaperAnswers(UCLA_NPI_SLEEP_PAPER);
  assert.deepEqual(paperCompletion(UCLA_NPI_SLEEP_PAPER, empty).missingPaths, ['frequency']);
  const absent = { ...empty, frequency: 0 };
  assert.deepEqual(paperResult(UCLA_NPI_SLEEP_PAPER, absent), {
    total: 0,
    maximum: 12,
    band: 'absent',
    label: 'Disturbo del sonno assente',
    parts: [{ id: 'distress', label: 'Stress del caregiver', total: 0, maximum: 5 }],
  });
  assert.throws(
    () => parsePaperAnswers(UCLA_NPI_SLEEP_PAPER, { ...absent, severity: 2 }),
    PaperInputError,
  );
  assert.deepEqual(paperCompletion(UCLA_NPI_SLEEP_PAPER, { ...empty, frequency: 2 }).missingPaths, [
    'severity',
    'distress',
  ]);
  for (let frequency = 1; frequency <= 4; frequency++)
    for (let severity = 1; severity <= 3; severity++)
      for (let distress = 0; distress <= 5; distress++) {
        const result = paperResult(
          UCLA_NPI_SLEEP_PAPER,
          parsePaperAnswers(UCLA_NPI_SLEEP_PAPER, { frequency, severity, distress }),
        )!;
        assert.equal(result.total, frequency * severity);
        assert.equal(result.band, 'present');
        assert.equal(result.parts![0].total, distress);
      }
  for (const value of [5, -1, 1.5, '1'])
    assert.throws(
      () => parsePaperAnswers(UCLA_NPI_SLEEP_PAPER, { ...empty, frequency: value }),
      PaperInputError,
    );
});

test('PAINAD paper layout prints the same text as the stored v1 definition (consolare corrected)', () => {
  assert.equal(PAINAD_PAPER.version, PAINAD_VERSION);
  assert.deepEqual(
    paperItems(PAINAD_PAPER).map((item) => item.key),
    [...PAINAD_KEYS],
  );
  paperItems(PAINAD_PAPER).forEach((item, index) => {
    assert.equal(item.label, PAINAD_ITEMS[index].label);
    assert.deepEqual(
      item.options.map((o) => o.label),
      [...PAINAD_ITEMS[index].options],
    );
  });
  assert.match(PAINAD_PAPER.sections[0].title, /OSSERVAZIONALE/);
  for (const [total, label] of [
    [0, 'Nessun dolore rilevato'],
    [3, 'Dolore lieve'],
    [4, 'Dolore moderato'],
    [7, 'Dolore severo'],
  ] as const)
    assert.equal(paperBand(PAINAD_PAPER, total).label, label);
});

test('answer parsing rejects unknown keys, missing keys, values outside the printed options', () => {
  for (const scale of PAPER_SCALES) {
    const answers = emptyPaperAnswers(scale);
    assert.throws(() => parsePaperAnswers(scale, { ...answers, extra: 1 }), PaperInputError);
    const first = paperItems(scale)[0];
    const missing: PaperAnswers = { ...answers };
    delete missing[first.key];
    assert.throws(() => parsePaperAnswers(scale, missing), PaperInputError);
    assert.throws(() => parsePaperAnswers(scale, { ...answers, [first.key]: 99 }), PaperInputError);
    assert.throws(() => parsePaperAnswers(scale, null), PaperInputError);
    assert.throws(() => parsePaperAnswers(scale, []), PaperInputError);
    if (scale.notes)
      assert.throws(
        () => parsePaperAnswers(scale, { ...answers, notes: '\u0007' }),
        PaperInputError,
      );
  }
});
