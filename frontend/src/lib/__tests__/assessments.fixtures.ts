import type {
  AssessmentDto,
  PainadAnswers,
  AssessmentWriteResult,
} from '../assessments/assessmentTypes';
import { PAINAD_VERSION } from '../assessments/assessmentTypes';
import {
  PAINAD,
  PAINAD_INTERPRETATIONS,
  answeredPainad,
  painadResult,
} from '../assessments/painadDefinition';
export const completeAnswers: PainadAnswers = {
  respiration: 0,
  negativeVocalization: 1,
  facialExpression: 2,
  bodyLanguage: 0,
  consolability: 1,
};
export function assessment(patch: Partial<AssessmentDto> = {}): AssessmentDto {
  const answers = patch.answers ?? { ...completeAnswers };
  return {
    id: 'assessment-a',
    patientId: 'patient-a',
    type: 'painad',
    formVersion: PAINAD_VERSION,
    status: 'draft',
    version: 1,
    assessedAt: '2026-09-22T08:30:25.123Z',
    createdAt: '2026-09-22T09:00:00.000Z',
    updatedAt: '2026-09-22T09:00:00.000Z',
    finalizedAt: null,
    author: { operatorId: 'operator-a', name: 'Autore sintetico' },
    answers,
    answeredCount: answeredPainad(answers),
    result: painadResult(answers),
    predecessorId: null,
    correctionReason: null,
    correctedById: null,
    pdf: null,
    finalSnapshot: null,
    ...patch,
  };
}
export function finalAssessment(patch: Partial<AssessmentDto> = {}): AssessmentDto {
  const row = assessment({
    status: 'final',
    version: 2,
    finalizedAt: '2026-09-22T10:00:00.000Z',
    pdf: { status: 'pending', documentId: null, errorCode: null, retryAvailable: false },
    ...patch,
  });
  row.finalSnapshot = {
    snapshotVersion: 1,
    patient: {
      id: row.patientId,
      firstName: 'Paziente',
      lastName: 'Sintetico',
      codiceFiscale: null,
      dateOfBirth: '1940-01-01',
      location: {
        status: 'assigned',
        source: 'assignment',
        room: 'QA',
        bed: '1',
        asOf: '2026-09-22',
      },
    },
    author: { ...row.author },
    form: { type: 'painad', version: PAINAD_VERSION, sourceSha256: PAINAD.sourceSha256 },
    assessedAt: row.assessedAt,
    createdAt: row.createdAt,
    finalizedAt: row.finalizedAt!,
    items: PAINAD.items.map((item) => ({
      id: item.id,
      label: item.label,
      score: row.answers[item.id]!,
      description: item.options[row.answers[item.id]!],
    })),
    result: { ...row.result! },
    interpretation: PAINAD_INTERPRETATIONS[row.result!.band],
    predecessorId: row.predecessorId,
    correctionReason: row.correctionReason,
    predecessor: row.predecessorId
      ? {
          id: row.predecessorId,
          assessedAt: '2026-09-21T08:00:00.000Z',
          authorName: 'Predecessore sintetico',
        }
      : null,
  };
  return row;
}
export const uncertain: AssessmentWriteResult = {
  kind: 'failed',
  failure: {
    code: 'unverified',
    message: 'Risposta persa',
    uncertain: true,
  },
};
export const conflict: AssessmentWriteResult = {
  kind: 'failed',
  failure: {
    code: 'assessment_version_conflict',
    message: 'Versione in conflitto',
    uncertain: false,
  },
};
export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
