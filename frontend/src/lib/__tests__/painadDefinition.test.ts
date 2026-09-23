import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PAINAD_KEYS, PAINAD_VERSION, type PainadAnswers } from '../assessments/assessmentTypes';
import {
  PAINAD,
  emptyPainadAnswers,
  painadResult,
  answeredPainad,
} from '../assessments/painadDefinition';
import {
  assessmentEditable,
  assessmentFields,
  assessmentInstants,
} from '../assessments/assessmentTime';
import {
  assertAssessment,
  assertPainadAnswers,
  assessmentPage,
} from '../assessments/assessmentValidation';
import { assessment, finalAssessment } from './assessments.fixtures';

test('all 243 complete combinations and 781 incomplete combinations preserve null versus zero', () => {
  let complete = 0;
  let incomplete = 0;
  for (let n = 0; n < 4 ** 5; n++) {
    const values = PAINAD_KEYS.map((_, i) => [null, 0, 1, 2][Math.floor(n / 4 ** i) % 4]);
    const answers = Object.fromEntries(
      PAINAD_KEYS.map((key, i) => [key, values[i]]),
    ) as PainadAnswers;
    const result = painadResult(answers);
    assertPainadAnswers(answers);
    assert.equal(answeredPainad(answers), values.filter((value) => value !== null).length);
    if (values.includes(null)) {
      incomplete++;
      assert.equal(result, null);
    } else {
      complete++;
      const total = values.reduce<number>((sum, score) => sum + score!, 0);
      assert.equal(result?.total, total);
      assert.equal(
        result?.band,
        total === 0 ? 'none' : total <= 3 ? 'mild' : total <= 6 ? 'moderate' : 'severe',
      );
    }
  }
  assert.deepEqual([complete, incomplete], [243, 781]);
  assert.equal(painadResult(emptyPainadAnswers()), null);
  for (const value of [
    { ...emptyPainadAnswers(), respiration: undefined },
    { ...emptyPainadAnswers(), extra: 0 },
    { ...emptyPainadAnswers(), respiration: -1 },
  ])
    assert.throws(() => assertPainadAnswers(value));
});

test('version and full clinical descriptions stay bound to the supplied Italian source', () => {
  assert.equal(PAINAD_VERSION, 'painad-it-2026-09-22-v1');
  assert.equal(
    PAINAD.sourceSha256,
    '2a3c3b2724ed7cc46aa09db715680b0d494a63b587898b45d61c8db8ec73abb1',
  );
  assert.match(PAINAD.description, /osservazionale/);
  assert.deepEqual(
    PAINAD.items.map((item) => item.options),
    [
      [
        'Normale',
        'Occasionalmente affannosa. Brevi periodi di iperventilazione.',
        'RUMOROSA. Respiro stertoroso. Iperventilazione prolungata.',
      ],
      [
        'Nessuna',
        'Lamenti o gemiti occasionali. Parlare a bassa voce con tono negativo.',
        'Chiamate ripetute a voce alta. Gemiti o lamenti costanti. Pianto.',
      ],
      [
        'Sorridente o inespressiva',
        'Triste, spaventata, corrucciata, smorfia occasionale.',
        'Smorfia marcata e costante. Serramento della mascella / denti stretti.',
      ],
      [
        'Rilassato',
        'Teso, irrequieto, pacing (camminare avanti e indietro).',
        'Rigido. Pugni chiusi. Ginocchia al petto. Spinge via o colpisce.',
      ],
      [
        'Non necessaria',
        'Rassicurato o distratto dalla voce o dal contatto fisico.',
        'Impossibile da rassicurare, distrarre o consolare.',
      ],
    ],
  );
});

test('Rome clinical time rejects DST gaps, requires repeated-hour choice and preserves existing precision', () => {
  assert.deepEqual(assessmentInstants('2026-03-29T02:30'), []);
  const repeats = assessmentInstants('2026-10-25T02:30');
  assert.deepEqual(repeats, ['2026-10-25T00:30:00.000Z', '2026-10-25T01:30:00.000Z']);
  const fields = {
    ...assessmentFields(assessment()),
    assessedAtLocal: '2026-10-25T02:30',
    instantChoice: '',
  };
  assert.throws(() => assessmentEditable(fields, false), /Scegli/);
  assert.equal(
    assessmentEditable({ ...fields, instantChoice: repeats[1] }, false).assessedAt,
    repeats[1],
  );
  assert.equal(
    assessmentEditable(assessmentFields(assessment()), false).assessedAt,
    assessment().assessedAt,
  );
  for (const local of ['2026-02-30T14:00', '2026-03-29T02:30', 'not-date'])
    assert.throws(() => assessmentEditable({ ...fields, assessedAtLocal: local }, false));
  assert.throws(() => assessmentEditable(assessmentFields(assessment()), true), /motivo/);
});

test('DTO validation rejects cross-patient, inconsistent scoring and unverified clinical snapshots', () => {
  assertAssessment(assessment(), 'patient-a', 'assessment-a');
  assertAssessment(finalAssessment(), 'patient-a');
  assertAssessment(
    finalAssessment({ predecessorId: 'previous-a', correctionReason: 'Rettifica sintetica' }),
    'patient-a',
  );
  for (const row of [
    assessment({ patientId: 'patient-b' }),
    assessment({ id: 'other' }),
    assessment({ result: { total: 4, band: 'mild', label: 'Dolore lieve' } }),
    assessment({ assessedAt: '2026-09-22' }),
  ])
    assert.throws(() => assertAssessment(row, 'patient-a', 'assessment-a'));
  for (const alter of [
    (row: AssessmentDto) => {
      row.finalSnapshot!.patient.id = 'patient-b';
    },
    (row: AssessmentDto) => {
      row.finalSnapshot!.form.sourceSha256 = 'other';
    },
    (row: AssessmentDto) => {
      row.finalSnapshot!.items[0].description = 'Troncato';
    },
    (row: AssessmentDto) => {
      row.finalSnapshot!.items[1].id = 'respiration';
    },
    (row: AssessmentDto) => {
      row.finalSnapshot!.interpretation = 'Diagnosi automatica';
    },
    (row: AssessmentDto) => {
      row.finalSnapshot!.predecessor = {
        id: 'other',
        assessedAt: row.assessedAt,
        authorName: 'Altro',
      };
    },
    (row: AssessmentDto) => {
      row.finalSnapshot!.createdAt = row.assessedAt;
    },
    (row: AssessmentDto) => {
      row.pdf = { status: 'ready', documentId: null, errorCode: null, retryAvailable: false };
    },
  ]) {
    const row = finalAssessment();
    alter(row);
    assert.throws(() => assertAssessment(row, 'patient-a'));
  }
});

import type { AssessmentDto } from '../assessments/assessmentTypes';
test('history bounds, duplicate IDs and cursor completeness are enforced', () => {
  const row = assessment();
  const page = { items: [row], pageInfo: { loadedCount: 1, hasMore: true, nextCursor: 'opaque' } };
  assert.equal(assessmentPage(page, 'patient-a'), page);
  for (const bad of [
    { ...page, items: [row, row], pageInfo: { ...page.pageInfo, loadedCount: 2 } },
    { ...page, items: Array(101).fill(row) },
    { ...page, pageInfo: { ...page.pageInfo, nextCursor: null } },
    { ...page, pageInfo: { loadedCount: 1, hasMore: false, nextCursor: 'unexpected' } },
  ])
    assert.throws(() => assessmentPage(bad, 'patient-a'));
  assert.throws(() => assessmentPage(page, 'patient-b'));
});
