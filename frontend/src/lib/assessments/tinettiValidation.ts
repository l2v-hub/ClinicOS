import { parsePatientIdentity } from '../patientIdentity';
import type { TinettiAssessmentDto, TinettiHistoryItem } from './assessmentTypes';
import { TINETTI_VERSION, TINETTI_SOURCE_SHA256, TINETTI_REFERENCE_SHA256 } from './tinettiTypes';
import {
  assertTinettiAnswers,
  answeredTinetti,
  tinettiCompletion,
  tinettiResult,
  validTinettiResult,
  tinettiSnapshotItems,
  TINETTI_KEYS,
  TINETTI_PROVENANCE,
} from './tinettiDefinition';
function invalid(): never {
  throw new Error('Risposta Tinetti non verificata.');
}
export function assertTinettiHistory(row: TinettiHistoryItem) {
  const completion = row.completion;
  if (
    !Number.isInteger(row.answeredCount) ||
    row.answeredCount < 0 ||
    row.answeredCount > 20 ||
    !completion ||
    typeof completion.complete !== 'boolean' ||
    !Array.isArray(completion.missingPaths) ||
    completion.missingPaths.some(
      (path) => !TINETTI_KEYS.includes(path as (typeof TINETTI_KEYS)[number]),
    ) ||
    new Set(completion.missingPaths).size !== completion.missingPaths.length ||
    row.answeredCount !== 20 - completion.missingPaths.length ||
    completion.complete !== (row.answeredCount === 20) ||
    (completion.complete ? !validTinettiResult(row.result) : row.result !== null)
  )
    invalid();
}
export function assertTinettiAssessment(row: TinettiAssessmentDto, patientId: string) {
  assertTinettiAnswers(row.answers);
  const expected = tinettiResult(row.answers);
  const completion = tinettiCompletion(row.answers);
  if (
    answeredTinetti(row.answers) !== row.answeredCount ||
    completion.complete !== row.completion.complete ||
    completion.missingPaths.join('|') !== row.completion.missingPaths.join('|') ||
    (expected
      ? !validTinettiResult(row.result) ||
        expected.balance !== row.result.balance ||
        expected.gait !== row.result.gait
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
    s.form?.type !== 'tinetti' ||
    s.form.version !== TINETTI_VERSION ||
    s.form.sourceSha256 !== TINETTI_SOURCE_SHA256 ||
    s.form.referenceSha256 !== TINETTI_REFERENCE_SHA256 ||
    s.author?.operatorId !== row.author.operatorId ||
    typeof s.author.name !== 'string' ||
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
    !validTinettiResult(s.result) ||
    s.result.balance !== expected?.balance ||
    s.result.gait !== expected?.gait ||
    s.notes !== row.answers.notes ||
    s.provenance !== TINETTI_PROVENANCE ||
    !Array.isArray(s.items) ||
    s.items.length !== 20 ||
    'interpretation' in s ||
    'sections' in s ||
    'signatureLabels' in s
  )
    invalid();
  const items = tinettiSnapshotItems(row.answers);
  if (
    s.items.some(
      (item, i) =>
        !item ||
        item.id !== items[i].id ||
        item.label !== items[i].label ||
        item.score !== items[i].score ||
        item.description !== items[i].description ||
        item.group !== items[i].group,
    )
  )
    invalid();
}
