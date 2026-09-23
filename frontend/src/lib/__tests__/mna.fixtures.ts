import type { MnaAssessmentDto } from '../assessments/assessmentTypes';
import { MNA_SOURCE_SHA256, MNA_VERSION, type MnaAnswers } from '../assessments/mnaTypes';
import { mnaCompletion, mnaResult, mnaSnapshotItems, mnaTitle } from '../assessments/mnaDefinition';
import { mnaAge, mnaMeasurements } from '../assessments/mnaValidation';
import { mnaAssessmentDate } from '../assessments/mnaTime';
import { mnaBmi } from '../assessments/mnaInputValidation';
import { MNA_COPYRIGHT, MNA_PROVENANCE, MNA_REFERENCES } from '../assessments/mnaItems';
import { finalAssessment } from './assessments.fixtures';
export function completeMna(maximum = true): MnaAnswers {
  return {
    extent: 'full',
    A: maximum ? 'no_reduction' : 'severe_reduction',
    B: maximum ? 'no_loss' : 'loss_over_3kg',
    C: maximum ? 'goes_out' : 'bed_or_chair',
    D: !maximum,
    E: maximum ? 'no_psychological_problems' : 'severe_dementia_or_depression',
    F: { method: 'category', category: maximum ? 'gte23' : 'lt19' },
    G: maximum,
    H: !maximum,
    I: !maximum,
    J: maximum ? 'three_meals' : 'one_meal',
    K: { dairyDaily: maximum, eggsOrLegumesWeekly: maximum, meatFishOrPoultryDaily: maximum },
    L: maximum,
    M: maximum ? 'gt5_glasses' : 'lt3_glasses',
    N: maximum ? 'independent_without_difficulty' : 'needs_assistance',
    O: maximum ? 'no_nutritional_problems' : 'severe_malnutrition',
    P: maximum ? 'better' : 'worse',
    Q: { method: 'category', category: maximum ? 'gt22' : 'lt21' },
    R: { method: 'category', category: maximum ? 'gte31' : 'lt31' },
    measurements: {
      weightKg: null,
      heightCm: null,
      armCircumferenceCm: null,
      calfCircumferenceCm: null,
    },
    measurementDates: {
      weightKg: null,
      heightCm: null,
      armCircumferenceCm: null,
      calfCircumferenceCm: null,
    },
    notes: ' Note sintetiche\nSeconda riga ',
  };
}
export function mnaAssessment(patch: Partial<MnaAssessmentDto> = {}): MnaAssessmentDto {
  const answers = patch.answers ?? completeMna();
  const completion = mnaCompletion(answers);
  const row: MnaAssessmentDto = {
    id: 'mna-a',
    patientId: 'patient-a',
    type: 'mna',
    formVersion: MNA_VERSION,
    status: 'draft',
    version: 1,
    assessedAt: '2026-10-25T01:30:25.123Z',
    createdAt: '2026-10-25T03:00:00.000Z',
    updatedAt: '2026-10-25T03:00:00.000Z',
    author: { operatorId: 'operator-a', name: 'Autore sintetico' },
    finalizedAt: null,
    predecessorId: null,
    correctedById: null,
    correctionReason: null,
    pdf: null,
    finalSnapshot: null,
    snapshotSha256: null,
    answers,
    extent: answers.extent,
    answeredCount: completion.screening.answeredCount + completion.global.answeredCount,
    completion,
    result: mnaResult(answers),
    ...patch,
  };
  if (row.status === 'final') {
    row.snapshotSha256 = 'c'.repeat(64);
    row.finalizedAt = '2026-10-25T04:00:00.000Z';
    row.pdf = patch.pdf ?? {
      status: 'pending',
      documentId: null,
      errorCode: null,
      retryAvailable: false,
    };
    const patient = finalAssessment().finalSnapshot!.patient;
    row.finalSnapshot = {
      snapshotVersion: 1,
      patient,
      author: row.author,
      assessedAt: row.assessedAt,
      createdAt: row.createdAt,
      finalizedAt: row.finalizedAt,
      form: { type: 'mna', version: MNA_VERSION, sourceSha256: MNA_SOURCE_SHA256 },
      extent: row.extent,
      title: mnaTitle(row.extent),
      demographics: {
        sex: null,
        ageAtAssessment: mnaAge(patient.dateOfBirth, mnaAssessmentDate(row.assessedAt)),
        ageOnDate: mnaAssessmentDate(row.assessedAt),
        timeZone: 'Europe/Rome',
      },
      answers,
      completion,
      items: mnaSnapshotItems(answers),
      measurements: mnaMeasurements(answers),
      bmi: mnaBmi(answers.measurements),
      result: row.result,
      notes: answers.notes,
      provenance: MNA_PROVENANCE,
      references: [...MNA_REFERENCES],
      copyright: MNA_COPYRIGHT,
      predecessorId: row.predecessorId,
      correctionReason: row.correctionReason,
      predecessor: row.predecessorId
        ? {
            id: row.predecessorId,
            assessedAt: '2026-10-24T01:30:00.000Z',
            authorName: 'Precedente',
          }
        : null,
    };
  }
  return row;
}
