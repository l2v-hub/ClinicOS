import { parsePatientIdentity } from '../patientIdentity';
import {
  PAINAD_KEYS,
  PAINAD_VERSION,
  type AssessmentDto,
  type AssessmentHistoryItem,
  type AssessmentPage,
  type PainadAnswers,
  type AssessmentResult,
  type AssessmentType,
} from './assessmentTypes';
import { TRANSFERS_VERSION, TRANSFERS_SOURCE_SHA256 } from './transfersTypes';
import {
  assertTransfersAnswers,
  transfersCompletion,
  transfersSnapshotSections,
} from './transfersDefinition';
import { PAINAD, PAINAD_INTERPRETATIONS, answeredPainad, painadResult } from './painadDefinition';
import { TINETTI_VERSION } from './tinettiTypes';
import { assertTinettiHistory, assertTinettiAssessment } from './tinettiValidation';
import { MNA_VERSION } from './mnaTypes';
import { assertMnaHistory, assertMnaAssessment } from './mnaValidation';
import { GDS15_VERSION } from './gds15Types';
import { assertGds15History, assertGds15Assessment } from './gds15Validation';
export const validAssessmentId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const instant = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
  Number.isFinite(Date.parse(value));
const optionalId = (value: unknown) => value === null || validAssessmentId(value);
export const validAssessmentType = (value: unknown): value is AssessmentType =>
  value === 'painad' || value === 'postural_transfers' || value === 'tinetti' || value === 'mna' || value === 'gds15';
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
    !validAssessmentType(row.type) ||
    row.formVersion !==
      {
        painad: PAINAD_VERSION,
        postural_transfers: TRANSFERS_VERSION,
        tinetti: TINETTI_VERSION,
        mna: MNA_VERSION,
        gds15: GDS15_VERSION,
      }[row.type] ||
    !['draft', 'final'].includes(row.status) ||
    !Number.isSafeInteger(row.version) ||
    row.version < 1 ||
    !instant(row.assessedAt) ||
    !instant(row.createdAt) ||
    !instant(row.updatedAt) ||
    !(row.finalizedAt === null || instant(row.finalizedAt)) ||
    !validAssessmentId(row.author?.operatorId) ||
    typeof row.author?.name !== 'string' ||
    !optionalId(row.predecessorId) ||
    !optionalId(row.correctedById) ||
    !(row.correctionReason === null || typeof row.correctionReason === 'string')
  )
    invalid();
  if (row.type === 'painad') {
    if (
      !Number.isInteger(row.answeredCount) ||
      row.answeredCount < 0 ||
      row.answeredCount > 5 ||
      !result(row.result) ||
      (row.answeredCount < 5 ? row.result !== null : row.result === null)
    )
      invalid();
  } else if (row.type === 'tinetti') {
    assertTinettiHistory(row);
  } else if (row.type === 'gds15') {
    assertGds15History(row);
  } else if (row.type === 'mna') {
    assertMnaHistory(row);
  } else if (
    row.result !== null ||
    !row.completion ||
    typeof row.completion.complete !== 'boolean' ||
    !Array.isArray(row.completion.missingPaths) ||
    row.completion.missingPaths.length > 100 ||
    row.completion.missingPaths.some(
      (path) => typeof path !== 'string' || !/^[a-zA-Z.]+$/.test(path),
    ) ||
    row.completion.complete !== (row.completion.missingPaths.length === 0)
  )
    invalid();
  if (row.status === 'draft' && (row.pdf !== null || row.finalizedAt !== null)) invalid();
  if (
    row.status === 'final' &&
    (!row.finalizedAt ||
      !(row.type === 'painad' ? row.answeredCount === 5 : row.completion.complete) ||
      !row.pdf)
  )
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
  type?: AssessmentType,
): asserts value is AssessmentDto {
  assertAssessmentHistory(value, patientId);
  const row = value as AssessmentDto;
  if (id && row.id !== id) invalid();
  if (type && row.type !== type) invalid();
  if (row.type === 'tinetti') {
    assertTinettiAssessment(row, patientId);
    return;
  }
  if (row.type === 'mna') {
    assertMnaAssessment(row, patientId);
    return;
  }
  if (row.type === 'gds15') {
    assertGds15Assessment(row, patientId);
    return;
  }
  if (row.type === 'postural_transfers') {
    assertTransfersAnswers(row.answers);
    if (transfersCompletion(row.answers).complete !== row.completion.complete) invalid();
    if (row.status === 'draft') {
      if (row.finalSnapshot !== null) invalid();
      return;
    }
    const snapshot = row.finalSnapshot;
    if (
      !snapshot ||
      snapshot.snapshotVersion !== 1 ||
      parsePatientIdentity(snapshot.patient)?.id !== patientId ||
      snapshot.form?.type !== row.type ||
      snapshot.form.version !== row.formVersion ||
      snapshot.form.sourceSha256 !== TRANSFERS_SOURCE_SHA256 ||
      snapshot.author?.operatorId !== row.author.operatorId ||
      typeof snapshot.author.name !== 'string' ||
      snapshot.assessedAt !== row.assessedAt ||
      snapshot.createdAt !== row.createdAt ||
      snapshot.finalizedAt !== row.finalizedAt ||
      snapshot.predecessorId !== row.predecessorId ||
      snapshot.correctionReason !== row.correctionReason ||
      (row.predecessorId === null
        ? snapshot.predecessor !== null
        : snapshot.predecessor?.id !== row.predecessorId ||
          !instant(snapshot.predecessor.assessedAt) ||
          typeof snapshot.predecessor.authorName !== 'string') ||
      snapshot.result !== null ||
      !Array.isArray(snapshot.sections) ||
      snapshot.sections.length !== 5 ||
      !Array.isArray(snapshot.signatureLabels) ||
      snapshot.signatureLabels.length !== 2 ||
      snapshot.signatureLabels.some((label) => typeof label !== 'string') ||
      typeof row.snapshotSha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(row.snapshotSha256)
    )
      invalid();
    const expectedSections = transfersSnapshotSections(row.answers);
    if (
      snapshot.sections.some(
        (section, index) =>
          section.id !== expectedSections[index].id ||
          section.label !== expectedSections[index].label ||
          !Array.isArray(section.rows) ||
          section.rows.length !== expectedSections[index].rows.length ||
          section.rows.some(
            (item, rowIndex) =>
              !item ||
              item.path !== expectedSections[index].rows[rowIndex].path ||
              item.label !== expectedSections[index].rows[rowIndex].label ||
              item.value !== expectedSections[index].rows[rowIndex].value,
          ),
      ) ||
      snapshot.signatureLabels[0] !== 'Firma Fisioterapista' ||
      snapshot.signatureLabels[1] !== 'Firma Operatori'
    )
      invalid();
    const paths = new Set<string>();
    for (const section of snapshot.sections) {
      if (
        !section ||
        typeof section.id !== 'string' ||
        typeof section.label !== 'string' ||
        !Array.isArray(section.rows) ||
        section.rows.length > 30
      )
        invalid();
      for (const item of section.rows) {
        if (
          !item ||
          typeof item.path !== 'string' ||
          paths.has(item.path) ||
          typeof item.label !== 'string' ||
          typeof item.value !== 'string'
        )
          invalid();
        paths.add(item.path);
      }
    }
    return;
  }
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
export function assessmentPage(
  value: unknown,
  patientId: string,
  type?: AssessmentType,
): AssessmentPage {
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
  if (type && page.items.some((item) => item.type !== type)) invalid();
  if (new Set(page.items.map((item) => item.id)).size !== page.items.length) invalid();
  return page;
}
