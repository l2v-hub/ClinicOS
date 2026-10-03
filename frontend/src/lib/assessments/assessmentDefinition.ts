import type { AssessmentAnswers, AssessmentDto, AssessmentType } from './assessmentTypes';
import { PAINAD, emptyPainadAnswers, painadResult } from './painadDefinition';
import { TRANSFERS, assertTransfersAnswers, emptyTransfersAnswers } from './transfersDefinition';
import { assertPainadAnswers } from './assessmentValidation';
import { TINETTI, assertTinettiAnswers, emptyTinettiAnswers } from './tinettiDefinition';
import { MNA, assertMnaAnswers, emptyMnaAnswers } from './mnaDefinition';
import { GDS15, assertGds15Answers, emptyGds15Answers } from './gds15Definition';
import { currentPaperScale, isPaperType, paperScaleFor } from './paper/paperTypes';
import { emptyPaperAnswers, parsePaperAnswers } from './paper/engine';
import { ASSESSMENT_VERSIONS } from './assessmentTypes';
/** Title/description of the module (current version: the paper scale where there is one). */
export function assessmentDefinition(type: AssessmentType): { title: string; description: string } {
  if (isPaperType(type)) {
    const scale = currentPaperScale(type);
    return { title: scale.appTitle, description: scale.appDescription };
  }
  return { painad: PAINAD, postural_transfers: TRANSFERS }[type];
}
void TINETTI;
void MNA;
void GDS15;
export const emptyAssessmentAnswers = (
  type: AssessmentType,
  formVersion: string = ASSESSMENT_VERSIONS[type],
): AssessmentAnswers => {
  const paper = paperScaleFor(type, formVersion);
  if (paper) return emptyPaperAnswers(paper);
  return type === 'painad'
    ? emptyPainadAnswers()
    : type === 'tinetti'
      ? emptyTinettiAnswers()
      : type === 'mna'
        ? emptyMnaAnswers()
        : type === 'gds15'
          ? emptyGds15Answers()
          : emptyTransfersAnswers();
};
export function assertAssessmentAnswers(
  type: AssessmentType,
  value: unknown,
  formVersion: string = ASSESSMENT_VERSIONS[type],
): asserts value is AssessmentAnswers {
  const paper = paperScaleFor(type, formVersion);
  if (paper) parsePaperAnswers(paper, value);
  else if (type === 'painad') assertPainadAnswers(value);
  else if (type === 'tinetti') assertTinettiAnswers(value);
  else if (type === 'mna') assertMnaAnswers(value);
  else if (type === 'gds15') assertGds15Answers(value);
  else assertTransfersAnswers(value);
}
export function savedAssessmentComplete(record: AssessmentDto) {
  return record.type === 'painad' ? !!painadResult(record.answers) : record.completion.complete;
}
export { isPaperType };
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
  formVersion: string = ASSESSMENT_VERSIONS[type],
) {
  assertAssessmentAnswers(type, left, formVersion);
  assertAssessmentAnswers(type, right, formVersion);
  return canonical(left) === canonical(right);
}
