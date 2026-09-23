import type { TinettiAssessmentDto, TinettiSnapshot } from '../assessments/assessmentTypes';
import {
  TINETTI_VERSION,
  TINETTI_SOURCE_SHA256,
  TINETTI_REFERENCE_SHA256,
  TINETTI_MAXIMUM,
} from '../assessments/tinettiTypes';
import {
  emptyTinettiAnswers,
  TINETTI_KEYS,
  tinettiResult,
  tinettiCompletion,
  answeredTinetti,
  tinettiSnapshotItems,
  TINETTI_PROVENANCE,
} from '../assessments/tinettiDefinition';
import { finalAssessment } from './assessments.fixtures';
export function completeTinetti(maximum = true) {
  const answers = emptyTinettiAnswers();
  for (const key of TINETTI_KEYS)
    (answers as Record<string, unknown>)[key] = maximum ? TINETTI_MAXIMUM[key] : 0;
  answers.notes = ' Note sintetiche\nSeconda riga conservata ';
  return answers;
}
export function tinettiAssessment(patch: Partial<TinettiAssessmentDto> = {}): TinettiAssessmentDto {
  const answers = patch.answers ?? completeTinetti();
  const row: TinettiAssessmentDto = {
    id: 'tinetti-a',
    patientId: 'patient-a',
    type: 'tinetti',
    formVersion: TINETTI_VERSION,
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
    answeredCount: answeredTinetti(answers),
    completion: tinettiCompletion(answers),
    result: tinettiResult(answers),
    ...patch,
  };
  if (row.status === 'final') {
    row.snapshotSha256 = 'b'.repeat(64);
    row.finalizedAt = '2026-10-25T04:00:00.000Z';
    row.pdf = patch.pdf ?? {
      status: 'pending',
      documentId: null,
      errorCode: null,
      retryAvailable: false,
    };
    row.finalSnapshot = {
      snapshotVersion: 1,
      patient: finalAssessment().finalSnapshot!.patient,
      author: row.author,
      form: {
        type: 'tinetti',
        version: TINETTI_VERSION,
        sourceSha256: TINETTI_SOURCE_SHA256,
        referenceSha256: TINETTI_REFERENCE_SHA256,
      },
      assessedAt: row.assessedAt,
      createdAt: row.createdAt,
      finalizedAt: row.finalizedAt,
      items: tinettiSnapshotItems(answers) as TinettiSnapshot['items'],
      result: row.result!,
      notes: answers.notes,
      provenance: TINETTI_PROVENANCE,
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
