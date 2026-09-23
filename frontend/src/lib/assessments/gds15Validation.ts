import { parsePatientIdentity } from '../patientIdentity';
import type { Gds15AssessmentDto, Gds15HistoryItem } from './assessmentTypes';
import { GDS15_VERSION, GDS15_SOURCE_SHA256, GDS15_KEYS } from './gds15Types';
import {
  assertGds15Answers,
  gds15Result,
  gds15Completion,
  validGds15Result,
  gds15SnapshotItems,
  GDS15_INSTRUCTION,
  GDS15_SCREENING_NOTE,
  GDS15_PROVENANCE,
  GDS15_REFERENCE,
} from './gds15Definition';
function invalid(): never {
  throw new Error('Risposta GDS-15 non verificata.');
}
export function assertGds15History(row: Gds15HistoryItem) {
  const completion = row.completion;
  if (
    !Number.isInteger(row.answeredCount) ||
    row.answeredCount < 0 ||
    row.answeredCount > 15 ||
    !completion ||
    typeof completion.complete !== 'boolean' ||
    !Array.isArray(completion.missingPaths) ||
    completion.missingPaths.some((path) => !(GDS15_KEYS as readonly string[]).includes(path)) ||
    GDS15_KEYS.filter((key) => completion.missingPaths.includes(key)).join('|') !==
      completion.missingPaths.join('|') ||
    row.answeredCount !== 15 - completion.missingPaths.length ||
    completion.complete !== (row.answeredCount === 15) ||
    (completion.complete ? !validGds15Result(row.result) : row.result !== null)
  )
    invalid();
}
export function assertGds15Assessment(row: Gds15AssessmentDto, patientId: string) {
  assertGds15Answers(row.answers);
  const expected = gds15Result(row.answers),
    completion = gds15Completion(row.answers);
  if (
    typeof row.answers.notes !== 'string' ||
    completion.missingPaths.join('|') !== row.completion.missingPaths.join('|') ||
    (expected
      ? !validGds15Result(row.result) || expected.total !== row.result.total
      : row.result !== null)
  )
    invalid();
  if (row.status === 'draft') {
    if (row.finalSnapshot !== null || row.snapshotSha256 !== null) invalid();
    return;
  }
  const s = row.finalSnapshot;
  if (
    !s ||
    typeof row.snapshotSha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(row.snapshotSha256) ||
    s.snapshotVersion !== 1 ||
    parsePatientIdentity(s.patient)?.id !== patientId ||
    s.form?.type !== 'gds15' ||
    s.form.version !== GDS15_VERSION ||
    s.form.sourceSha256 !== GDS15_SOURCE_SHA256 ||
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
        typeof s.predecessor.assessedAt !== 'string' ||
        !Number.isFinite(Date.parse(s.predecessor.assessedAt)) ||
        typeof s.predecessor.authorName !== 'string') ||
    !validGds15Result(s.result) ||
    s.result.total !== expected?.total ||
    s.notes !== row.answers.notes ||
    s.instruction !== GDS15_INSTRUCTION ||
    s.screeningNote !== GDS15_SCREENING_NOTE ||
    s.provenance !== GDS15_PROVENANCE ||
    s.reference !== GDS15_REFERENCE ||
    !Array.isArray(s.items) ||
    s.items.length !== 15 ||
    'sections' in s ||
    'signatureLabels' in s ||
    'interpretation' in s
  )
    invalid();
  const items = gds15SnapshotItems(row.answers);
  if (
    s.items.some(
      (item, index) =>
        !item ||
        Object.keys(item).length !== 5 ||
        item.id !== items[index].id ||
        item.label !== items[index].label ||
        item.answer !== items[index].answer ||
        item.score !== items[index].score ||
        item.description !== items[index].description,
    )
  )
    invalid();
}
