import type { AssessmentAnswers, AssessmentDto, AssessmentType } from './assessmentTypes';
import { PAINAD, emptyPainadAnswers, painadResult } from './painadDefinition';
import { TRANSFERS, assertTransfersAnswers, emptyTransfersAnswers } from './transfersDefinition';
import { assertPainadAnswers } from './assessmentValidation';
import { TINETTI, assertTinettiAnswers, emptyTinettiAnswers } from './tinettiDefinition';
export const assessmentDefinition = (type: AssessmentType) =>
  ({ painad: PAINAD, postural_transfers: TRANSFERS, tinetti: TINETTI })[type];
export const emptyAssessmentAnswers = (type: AssessmentType): AssessmentAnswers =>
  type === 'painad'
    ? emptyPainadAnswers()
    : type === 'tinetti'
      ? emptyTinettiAnswers()
      : emptyTransfersAnswers();
export function assertAssessmentAnswers(
  type: AssessmentType,
  value: unknown,
): asserts value is AssessmentAnswers {
  if (type === 'painad') assertPainadAnswers(value);
  else if (type === 'tinetti') assertTinettiAnswers(value);
  else assertTransfersAnswers(value);
}
export function savedAssessmentComplete(record: AssessmentDto) {
  return record.type === 'painad' ? !!painadResult(record.answers) : record.completion.complete;
}
/** JSON domain data only. Separate every nested branch before remembering a request or correction. */
export const copyAssessmentAnswers = (answers: AssessmentAnswers): AssessmentAnswers =>
  structuredClone(answers);
export function freezeAssessmentValue<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeAssessmentValue);
    Object.freeze(value);
  }
  return value;
}
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
    .join(',')}}`;
}
export function assessmentAnswersEqual(
  type: AssessmentType,
  left: AssessmentAnswers,
  right: AssessmentAnswers,
) {
  assertAssessmentAnswers(type, left);
  assertAssessmentAnswers(type, right);
  return canonical(left) === canonical(right);
}
