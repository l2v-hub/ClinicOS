import type { AssessmentDto, PainadAssessmentDto } from '../../../lib/assessments/assessmentTypes';
import { PAINAD_PAPER, type PaperScale } from '../../../lib/assessments/paper/definitions';
import { emptyPaperAnswers, type PaperAnswers } from '../../../lib/assessments/paper/engine';
import {
  paperScaleFor,
  type PaperAssessmentDto,
} from '../../../lib/assessments/paper/paperTypes';
import type { PaperSummaryRecord } from './PaperSummary';

/** Paper scale used to display a record: the paper versions and PAINAD (same text, paper layout). */
export function displayPaperScale(record: { type: string; formVersion: string }): PaperScale | null {
  if (record.type === 'painad' && record.formVersion === PAINAD_PAPER.version) return PAINAD_PAPER;
  return paperScaleFor(record.type, record.formVersion);
}
export function paperSummaryRecord(
  scale: PaperScale,
  record: PaperAssessmentDto | PainadAssessmentDto,
): PaperSummaryRecord {
  const base = {
    status: record.status,
    formVersion: record.formVersion,
    assessedAt: record.assessedAt,
    createdAt: record.createdAt,
    finalizedAt: record.finalizedAt,
    author: record.author,
    correctionReason: record.correctionReason,
    answers: record.answers as PaperAnswers,
  };
  if (!record.finalSnapshot) return { ...base, snapshot: null };
  if (record.type === 'painad') {
    const snapshot = (record as PainadAssessmentDto).finalSnapshot!;
    return {
      ...base,
      snapshot: {
        patient: snapshot.patient,
        selected: {
          ...emptyPaperAnswers(scale),
          ...Object.fromEntries(snapshot.items.map((item) => [item.id, item.score])),
        },
        result: { ...snapshot.result, maximum: 10 },
        predecessor: snapshot.predecessor,
        notes: '',
        selectedText: Object.fromEntries(snapshot.items.map((item) => [item.id, item.description])),
      },
    };
  }
  const snapshot = (record as PaperAssessmentDto).finalSnapshot!;
  return {
    ...base,
    snapshot: {
      patient: snapshot.patient,
      selected: {
        ...emptyPaperAnswers(scale),
        ...Object.fromEntries(snapshot.items.map((item) => [item.key, item.value])),
        ...(snapshot.measurements
          ? {
              weightKg: snapshot.measurements.weightKg,
              heightM: snapshot.measurements.heightM,
              calfCm: snapshot.measurements.calfCm,
            }
          : {}),
        notes: snapshot.notes,
      },
      result: snapshot.result,
      predecessor: snapshot.predecessor,
      notes: snapshot.notes,
      selectedText: Object.fromEntries(snapshot.items.map((item) => [item.key, item.description])),
    },
  };
}
export const isDisplayPaper = (record: AssessmentDto) => displayPaperScale(record) !== null;
