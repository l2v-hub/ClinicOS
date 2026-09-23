import type { Gds15AssessmentDto } from '../assessments/assessmentTypes';
import {
  GDS15_VERSION,
  GDS15_SOURCE_SHA256,
  GDS15_KEYS,
  type Gds15Snapshot,
} from '../assessments/gds15Types';
import {
  emptyGds15Answers,
  gds15Completion,
  gds15Result,
  gds15SnapshotItems,
  GDS15_INSTRUCTION,
  GDS15_SCREENING_NOTE,
  GDS15_PROVENANCE,
  GDS15_REFERENCE,
} from '../assessments/gds15Definition';
import { finalAssessment } from './assessments.fixtures';
export function completeGds15(answer = true) {
  const answers = emptyGds15Answers();
  for (const key of GDS15_KEYS) answers[key] = answer;
  answers.notes = ' Note sintetiche\nSeconda riga conservata ';
  return answers;
}
export function gds15Assessment(patch: Partial<Gds15AssessmentDto> = {}): Gds15AssessmentDto {
  const answers = patch.answers ?? completeGds15();
  const row: Gds15AssessmentDto = {
    id: 'gds15-a',
    patientId: 'patient-a',
    type: 'gds15',
    formVersion: GDS15_VERSION,
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
    answeredCount: 15 - gds15Completion(answers).missingPaths.length,
    completion: gds15Completion(answers),
    result: gds15Result(answers),
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
    row.finalSnapshot = {
      snapshotVersion: 1,
      patient: finalAssessment().finalSnapshot!.patient,
      author: row.author,
      form: { type: 'gds15', version: GDS15_VERSION, sourceSha256: GDS15_SOURCE_SHA256 },
      assessedAt: row.assessedAt,
      createdAt: row.createdAt,
      finalizedAt: row.finalizedAt,
      instruction: GDS15_INSTRUCTION,
      items: gds15SnapshotItems(answers) as Gds15Snapshot['items'],
      result: row.result!,
      notes: answers.notes,
      screeningNote: GDS15_SCREENING_NOTE,
      provenance: GDS15_PROVENANCE,
      reference: GDS15_REFERENCE,
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
