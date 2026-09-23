import { parsePatientIdentity } from '../patientIdentity';
import {
  PAINAD_KEYS,
  PAINAD_VERSION,
  type AssessmentDto,
  type AssessmentHistoryItem,
  type AssessmentPage,
  type PainadAnswers,
  type AssessmentResult,
} from './assessmentTypes';
import { PAINAD, PAINAD_INTERPRETATIONS, answeredPainad, painadResult } from './painadDefinition';
export const validAssessmentId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const instant = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
  Number.isFinite(Date.parse(value));
const optionalId = (value: unknown) => value === null || validAssessmentId(value);
function invalid(): never {
  throw new Error('Risposta della valutazione non verificata.');
}
export function assertPainadAnswers(value: unknown): asserts value is PainadAnswers {
  if (
    !value ||
    typeof value !== 'object' ||
    Object.keys(value).length !== 5 ||
    PAINAD_KEYS.some((key) => ![null, 0, 1, 2].includes((value as PainadAnswers)[key]))
  )
    invalid();
}
function result(value: unknown): value is AssessmentResult | null {
  if (value === null) return true;
  const row = value as AssessmentResult;
  const expected = !row
    ? null
    : row.total === 0
      ? ['none', 'Nessun dolore rilevato']
      : row.total <= 3
        ? ['mild', 'Dolore lieve']
        : row.total <= 6
          ? ['moderate', 'Dolore moderato']
          : ['severe', 'Dolore severo'];
  return (
    !!row &&
    Number.isInteger(row.total) &&
    row.total >= 0 &&
    row.total <= 10 &&
    row.band === expected?.[0] &&
    row.label === expected[1]
  );
}
export function assertAssessmentHistory(
  value: unknown,
  patientId: string,
): asserts value is AssessmentHistoryItem {
  const row = value as AssessmentHistoryItem;
  if (
    !row ||
    !validAssessmentId(row.id) ||
    row.patientId !== patientId ||
    row.type !== 'painad' ||
    row.formVersion !== PAINAD_VERSION ||
    !['draft', 'final'].includes(row.status) ||
    !Number.isSafeInteger(row.version) ||
    row.version < 1 ||
    !instant(row.assessedAt) ||
    !instant(row.createdAt) ||
    !instant(row.updatedAt) ||
    !(row.finalizedAt === null || instant(row.finalizedAt)) ||
    !validAssessmentId(row.author?.operatorId) ||
    typeof row.author?.name !== 'string' ||
    !Number.isInteger(row.answeredCount) ||
    row.answeredCount < 0 ||
    row.answeredCount > 5 ||
    !result(row.result) ||
    (row.answeredCount < 5 && row.result !== null) ||
    (row.answeredCount === 5 && row.result === null) ||
    !optionalId(row.predecessorId) ||
    !optionalId(row.correctedById) ||
    !(row.correctionReason === null || typeof row.correctionReason === 'string')
  )
    invalid();
  if (row.status === 'draft' && (row.pdf !== null || row.finalizedAt !== null)) invalid();
  if (row.status === 'final' && (!row.finalizedAt || row.answeredCount !== 5 || !row.pdf))
    invalid();
  if (
    row.pdf &&
    (!['pending', 'ready', 'failed'].includes(row.pdf.status) ||
      !optionalId(row.pdf.documentId) ||
      typeof row.pdf.retryAvailable !== 'boolean' ||
      !(row.pdf.errorCode === null || typeof row.pdf.errorCode === 'string') ||
      (row.pdf.status === 'ready' && !row.pdf.documentId))
  )
    invalid();
}
export function assertAssessment(
  value: unknown,
  patientId: string,
  id?: string,
): asserts value is AssessmentDto {
  assertAssessmentHistory(value, patientId);
  const row = value as AssessmentDto;
  if (id && row.id !== id) invalid();
  assertPainadAnswers(row.answers);
  const score = painadResult(row.answers);
  if (
    answeredPainad(row.answers) !== row.answeredCount ||
    score?.total !== row.result?.total ||
    score?.band !== row.result?.band
  )
    invalid();
  if (row.status === 'draft' && row.finalSnapshot !== null) invalid();
  if (row.status === 'final') {
    const snapshot = row.finalSnapshot;
    const identity = parsePatientIdentity(snapshot?.patient);
    if (
      !snapshot ||
      snapshot.snapshotVersion !== 1 ||
      identity?.id !== patientId ||
      snapshot.form?.type !== 'painad' ||
      snapshot.form.version !== row.formVersion ||
      snapshot.form.sourceSha256 !== PAINAD.sourceSha256 ||
      snapshot.author?.operatorId !== row.author.operatorId ||
      typeof snapshot.author.name !== 'string' ||
      snapshot.assessedAt !== row.assessedAt ||
      snapshot.createdAt !== row.createdAt ||
      snapshot.finalizedAt !== row.finalizedAt ||
      !Array.isArray(snapshot.items) ||
      snapshot.items.length !== 5 ||
      !result(snapshot.result) ||
      !snapshot.result ||
      snapshot.result.total !== row.result?.total ||
      snapshot.interpretation !== PAINAD_INTERPRETATIONS[snapshot.result.band] ||
      snapshot.predecessorId !== row.predecessorId ||
      snapshot.correctionReason !== row.correctionReason ||
      (row.predecessorId === null
        ? snapshot.predecessor !== null
        : snapshot.predecessor?.id !== row.predecessorId ||
          !instant(snapshot.predecessor.assessedAt) ||
          typeof snapshot.predecessor.authorName !== 'string')
    )
      invalid();
    const keys = new Set(snapshot.items.map((item) => item.id));
    if (
      keys.size !== 5 ||
      PAINAD_KEYS.some((key) => !keys.has(key)) ||
      snapshot.items.some((item) => {
        const definition = PAINAD.items.find((candidate) => candidate.id === item.id);
        return (
          item.score !== row.answers[item.id] ||
          item.label !== definition?.label ||
          item.description !== definition?.options[item.score]
        );
      })
    )
      invalid();
  }
}
export function assessmentPage(value: unknown, patientId: string): AssessmentPage {
  const page = value as AssessmentPage;
  if (
    !page ||
    !Array.isArray(page.items) ||
    page.items.length > 100 ||
    !page.pageInfo ||
    page.pageInfo.loadedCount !== page.items.length ||
    typeof page.pageInfo.hasMore !== 'boolean' ||
    (page.pageInfo.hasMore
      ? typeof page.pageInfo.nextCursor !== 'string' ||
        !page.pageInfo.nextCursor ||
        !page.items.length
      : page.pageInfo.nextCursor !== null)
  )
    invalid();
  page.items.forEach((item) => assertAssessmentHistory(item, patientId));
  if (new Set(page.items.map((item) => item.id)).size !== page.items.length) invalid();
  return page;
}
