import { parsePatientIdentity } from '../patientIdentity';
import { mnaAssessmentDate } from './mnaTime';
import type { MnaAssessmentDto, MnaHistoryItem } from './assessmentTypes';
import { assertMnaAnswers, mnaBmi, validMnaDate } from './mnaInputValidation';
import { mnaCompletion, mnaResult, mnaSnapshotItems, mnaTitle } from './mnaDefinition';
import { MNA_COPYRIGHT, MNA_MEASUREMENT_LABELS, MNA_PROVENANCE, MNA_REFERENCES } from './mnaItems';
import {
  MNA_KEYS,
  MNA_K_KEYS,
  MNA_MEASUREMENT_KEYS,
  MNA_SOURCE_SHA256,
  MNA_VERSION,
  type MnaAnswers,
  type MnaSectionCompletion,
  type MnaResult,
} from './mnaTypes';

function invalid(): never {
  throw new Error('Risposta MNA non verificata.');
}
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
    .join(',')}}`;
}
export const mnaSame = (left: unknown, right: unknown) => canonical(left) === canonical(right);
function objectKeys(value: unknown, keys: string[]): boolean {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    mnaSame(Object.keys(value).sort(), [...keys].sort())
  );
}
const pathsFor = (id: string): string[] =>
  id === 'K'
    ? MNA_K_KEYS.map((key) => `K.${key}`)
    : id === 'F'
      ? ['F.category', 'measurements.weightKg', 'measurements.heightCm']
      : id === 'Q'
        ? ['Q.category', 'measurements.armCircumferenceCm']
        : id === 'R'
          ? ['R.category', 'measurements.calfCircumferenceCm']
          : [id];
function assertSection(section: MnaSectionCompletion, global: boolean) {
  const keys = global ? MNA_KEYS.slice(6) : MNA_KEYS.slice(0, 6);
  const allowed = keys.flatMap(pathsFor);
  if (
    !objectKeys(section, ['answeredCount', 'requiredCount', 'complete', 'missingPaths']) ||
    section.requiredCount !== keys.length ||
    !Number.isInteger(section.answeredCount) ||
    !Array.isArray(section.missingPaths) ||
    section.missingPaths.some((path) => !allowed.includes(path)) ||
    new Set(section.missingPaths).size !== section.missingPaths.length ||
    !mnaSame(
      section.missingPaths,
      allowed.filter((path) => section.missingPaths.includes(path)),
    )
  )
    invalid();
  const missingItems = keys.filter((id) =>
    pathsFor(id).some((path) => section.missingPaths.includes(path)),
  );
  for (const id of ['F', 'Q', 'R'])
    if (
      section.missingPaths.includes(`${id}.category`) &&
      pathsFor(id)
        .slice(1)
        .some((path) => section.missingPaths.includes(path))
    )
      invalid();
  if (
    section.answeredCount !== keys.length - missingItems.length ||
    section.complete !== (missingItems.length === 0)
  )
    invalid();
}
function validOutcome(
  value: NonNullable<MnaResult['screening']> | NonNullable<MnaResult['total']>,
  full: boolean,
) {
  if (
    !objectKeys(value, ['score', 'maximum', 'band', 'label']) ||
    value.maximum !== (full ? 30 : 14) ||
    !Number.isInteger(value.score * (full ? 2 : 1)) ||
    value.score < 0 ||
    value.score > value.maximum
  )
    return false;
  const band = full
    ? value.score < 17
      ? 'malnourished'
      : value.score < 24
        ? 'at_risk'
        : 'normal'
    : value.score <= 7
      ? 'malnourished'
      : value.score <= 11
        ? 'at_risk'
        : 'normal';
  const label =
    band === 'normal'
      ? 'Stato nutrizionale normale'
      : full
        ? band === 'malnourished'
          ? 'Cattivo stato nutrizionale'
          : 'Rischio di malnutrizione'
        : band === 'malnourished'
          ? 'Malnutrito'
          : 'A rischio di malnutrizione';
  return value.band === band && value.label === label;
}
export function assertMnaHistory(row: MnaHistoryItem) {
  mnaAssessmentDate(row.assessedAt);
  const completion = row.completion;
  if (
    !['screening', 'full'].includes(row.extent) ||
    !objectKeys(completion, ['complete', 'missingPaths', 'screening', 'global'])
  )
    invalid();
  assertSection(completion.screening, false);
  assertSection(completion.global, true);
  const paths = [
    ...completion.screening.missingPaths,
    ...(row.extent === 'full' ? completion.global.missingPaths : []),
  ];
  if (
    !mnaSame(completion.missingPaths, paths) ||
    completion.complete !== (paths.length === 0) ||
    row.answeredCount !== completion.screening.answeredCount + completion.global.answeredCount
  )
    invalid();
  const result = row.result;
  if (!objectKeys(result, ['screening', 'global', 'total'])) invalid();
  if (
    completion.screening.complete
      ? !result.screening || !validOutcome(result.screening, false)
      : result.screening !== null
  )
    invalid();
  if (
    completion.global.complete
      ? !objectKeys(result.global, ['score', 'maximum']) ||
        !result.global ||
        result.global.maximum !== 16 ||
        !Number.isInteger(result.global.score * 2) ||
        result.global.score < 0 ||
        result.global.score > 16
      : result.global !== null
  )
    invalid();
  if (row.extent === 'full' && completion.complete) {
    if (
      !result.total ||
      !validOutcome(result.total, true) ||
      result.total.score !== result.screening!.score + result.global!.score
    )
      invalid();
  } else if (result.total !== null) invalid();
}
export function mnaAge(dateOfBirth: unknown, onDate: string): number | null {
  if (!validMnaDate(dateOfBirth) || !validMnaDate(onDate) || dateOfBirth > onDate) return null;
  return (
    Number(onDate.slice(0, 4)) -
    Number(dateOfBirth.slice(0, 4)) -
    (onDate.slice(5) < dateOfBirth.slice(5) ? 1 : 0)
  );
}
export function mnaMeasurements(answers: MnaAnswers) {
  return MNA_MEASUREMENT_KEYS.map((id) => ({
    id,
    label: MNA_MEASUREMENT_LABELS[id],
    value: answers.measurements[id],
    unit: id === 'weightKg' ? ('kg' as const) : ('cm' as const),
    measuredOn: answers.measurementDates[id],
    source: 'manual_assessment' as const,
  }));
}
export function assertMnaAssessment(row: MnaAssessmentDto, patientId: string) {
  assertMnaAnswers(row.answers);
  const completion = mnaCompletion(row.answers);
  const result = mnaResult(row.answers);
  if (
    row.extent !== row.answers.extent ||
    !mnaSame(row.completion, completion) ||
    !mnaSame(row.result, result)
  )
    invalid();
  if (row.status === 'draft') {
    if (row.finalSnapshot !== null || row.snapshotSha256 !== null) invalid();
    return;
  }
  const snapshot = row.finalSnapshot;
  if (
    !snapshot ||
    typeof row.snapshotSha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(row.snapshotSha256) ||
    snapshot.snapshotVersion !== 1 ||
    parsePatientIdentity(snapshot.patient)?.id !== patientId ||
    !mnaSame(snapshot.form, {
      type: 'mna',
      version: MNA_VERSION,
      sourceSha256: MNA_SOURCE_SHA256,
    }) ||
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
        typeof snapshot.predecessor.assessedAt !== 'string' ||
        !Number.isFinite(Date.parse(snapshot.predecessor.assessedAt)) ||
        typeof snapshot.predecessor.authorName !== 'string') ||
    snapshot.extent !== row.extent ||
    snapshot.title !== mnaTitle(row.extent) ||
    !mnaSame(snapshot.answers, row.answers) ||
    !mnaSame(snapshot.completion, completion) ||
    !mnaSame(snapshot.items, mnaSnapshotItems(row.answers)) ||
    !mnaSame(snapshot.measurements, mnaMeasurements(row.answers)) ||
    snapshot.bmi !== mnaBmi(row.answers.measurements) ||
    !mnaSame(snapshot.result, result) ||
    snapshot.notes !== row.answers.notes ||
    snapshot.provenance !== MNA_PROVENANCE ||
    !mnaSame(snapshot.references, MNA_REFERENCES) ||
    snapshot.copyright !== MNA_COPYRIGHT ||
    'interpretation' in snapshot ||
    'sections' in snapshot ||
    'signatureLabels' in snapshot
  )
    invalid();
  const day = mnaAssessmentDate(row.assessedAt);
  const demographics = snapshot.demographics;
  if (
    !objectKeys(demographics, ['sex', 'ageAtAssessment', 'ageOnDate', 'timeZone']) ||
    !(
      demographics.sex === null ||
      (typeof demographics.sex === 'string' && demographics.sex.trim().length > 0)
    ) ||
    demographics.ageOnDate !== day ||
    demographics.timeZone !== 'Europe/Rome' ||
    demographics.ageAtAssessment !== mnaAge(snapshot.patient.dateOfBirth, day)
  )
    invalid();
}
