// Client-side verification of paper-version DTOs: the server result and snapshot must match what
// the shared engine computes from the stored answers (same rule as the legacy validators).
import { parsePatientIdentity } from '../../patientIdentity';
import type { PaperScale } from './definitions';
import {
  paperBand,
  paperCompletion,
  paperItems,
  paperResult,
  paperSnapshotItems,
  parsePaperAnswers,
  type PaperResult,
} from './engine';
import type { PaperAssessmentDto, PaperHistoryItem } from './paperTypes';

function invalid(): never {
  throw new Error('Risposta della valutazione non verificata.');
}
const canonical = (value: unknown): string =>
  value === null || typeof value !== 'object'
    ? JSON.stringify(value)
    : Array.isArray(value)
      ? `[${value.map(canonical).join(',')}]`
      : `{${Object.keys(value)
          .sort()
          .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
          .map(
            (key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`,
          )
          .join(',')}}`;
export function validPaperResult(scale: PaperScale, value: unknown): value is PaperResult {
  if (!value || typeof value !== 'object') return false;
  const row = value as PaperResult;
  if (!Number.isInteger(row.total) || row.total < 0 || row.total > scale.maximum) return false;
  const band = paperBand(scale, row.total);
  return row.maximum === scale.maximum && row.band === band.id && row.label === band.label;
}
export function assertPaperHistory(row: PaperHistoryItem, scale: PaperScale) {
  const keys = paperItems(scale).map((item) => item.key);
  const completion = row.completion;
  if (
    row.layout !== 'paper' ||
    !Number.isInteger(row.answeredCount) ||
    row.answeredCount < 0 ||
    row.answeredCount > keys.length ||
    !completion ||
    typeof completion.complete !== 'boolean' ||
    !Array.isArray(completion.missingPaths) ||
    completion.missingPaths.some((path) => !keys.includes(path)) ||
    completion.complete !== (completion.missingPaths.length === 0) ||
    (completion.complete ? !validPaperResult(scale, row.result) : row.result !== null)
  )
    invalid();
}
export function assertPaperAssessment(
  row: PaperAssessmentDto,
  patientId: string,
  scale: PaperScale,
) {
  assertPaperHistory(row, scale);
  let answers;
  try {
    answers = parsePaperAnswers(scale, row.answers);
  } catch {
    invalid();
  }
  const completion = paperCompletion(scale, answers);
  const expected = paperResult(scale, answers);
  if (
    canonical(completion) !== canonical(row.completion) ||
    canonical(expected) !== canonical(row.result)
  )
    invalid();
  if (row.status === 'draft') {
    if (row.finalSnapshot !== null || row.snapshotSha256 !== null) invalid();
    return;
  }
  const s = row.finalSnapshot;
  if (
    !s ||
    s.layout !== 'paper' ||
    typeof row.snapshotSha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(row.snapshotSha256) ||
    s.snapshotVersion !== 1 ||
    parsePatientIdentity(s.patient)?.id !== patientId ||
    s.form?.type !== row.type ||
    s.form.version !== row.formVersion ||
    s.form.sourceSha256 !== scale.sourceSha256 ||
    s.author?.operatorId !== row.author.operatorId ||
    s.author.name !== row.author.name ||
    s.assessedAt !== row.assessedAt ||
    s.createdAt !== row.createdAt ||
    s.finalizedAt !== row.finalizedAt ||
    s.predecessorId !== row.predecessorId ||
    s.correctionReason !== row.correctionReason ||
    (row.predecessorId === null
      ? s.predecessor !== null
      : s.predecessor?.id !== row.predecessorId ||
        typeof s.predecessor.authorName !== 'string' ||
        !Number.isFinite(Date.parse(s.predecessor.assessedAt))) ||
    canonical(s.result) !== canonical(expected) ||
    canonical(s.items) !== canonical(paperSnapshotItems(scale, answers)) ||
    s.notes !== (typeof answers.notes === 'string' ? answers.notes : '')
  )
    invalid();
}
