import { AssessmentError } from './types.js';
import { TINETTI_ITEMS } from './tinetti-definition.js';
import {
  TINETTI_KEYS,
  TINETTI_MAX_SCORE,
  type TinettiAnswers,
  type TinettiItemId,
  type TinettiResult,
  type TinettiSnapshotItem,
} from './tinetti-types.js';

const validScore = (key: TinettiItemId, value: unknown): value is 0 | 1 | 2 =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) <= TINETTI_MAX_SCORE[key];
export function parseTinettiAnswers(value: unknown): TinettiAnswers {
  const invalid = () => new AssessmentError('Risposte Tinetti non valide');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).some(
      (key) => key !== 'notes' && !TINETTI_KEYS.includes(key as TinettiItemId),
    ) ||
    TINETTI_KEYS.some(
      (key) => !Object.hasOwn(input, key) || (input[key] !== null && !validScore(key, input[key])),
    )
  )
    throw invalid();
  const notes = Object.hasOwn(input, 'notes') ? input.notes : '';
  if (
    typeof notes !== 'string' ||
    [...notes].length > 4000 ||
    [...notes].some((character) => {
      const code = character.codePointAt(0)!;
      return code >= 0xd800 && code <= 0xdfff;
    }) ||
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(notes)
  )
    throw invalid();
  return {
    ...Object.fromEntries(TINETTI_KEYS.map((key) => [key, input[key]])),
    notes,
  } as TinettiAnswers;
}
export function tinettiCompletion(answers: TinettiAnswers) {
  const missingPaths = TINETTI_KEYS.filter((key) => !validScore(key, answers[key]));
  return { complete: missingPaths.length === 0, missingPaths };
}
export function tinettiResult(answers: TinettiAnswers): TinettiResult | null {
  if (!tinettiCompletion(answers).complete) return null;
  const subtotal = (group: 'balance' | 'gait') =>
    TINETTI_ITEMS.filter((item) => item.group === group).reduce(
      (sum, item) => sum + answers[item.id]!,
      0,
    );
  const balance = subtotal('balance'),
    gait = subtotal('gait'),
    total = balance + gait;
  const risk =
    total <= 18
      ? ({ riskBand: 'high', label: 'Alto rischio cadute' } as const)
      : total <= 23
        ? ({ riskBand: 'moderate', label: 'Rischio moderato' } as const)
        : ({ riskBand: 'low', label: 'Basso rischio' } as const);
  return { balance, gait, total, ...risk };
}
export function tinettiSnapshotItems(answers: TinettiAnswers): TinettiSnapshotItem[] {
  if (!tinettiCompletion(answers).complete)
    throw new AssessmentError('Valutazione Tinetti incompleta');
  return TINETTI_ITEMS.map((item) => ({
    id: item.id,
    group: item.group,
    label: item.label,
    score: answers[item.id]!,
    description: item.options[answers[item.id]!],
  }));
}
