import { TINETTI_ITEMS } from './tinettiItems';
import {
  TINETTI_VERSION,
  TINETTI_SOURCE_SHA256,
  TINETTI_REFERENCE_SHA256,
  TINETTI_MAXIMUM,
  type TinettiAnswers,
  type TinettiItemId,
  type TinettiResult,
  type TinettiScore,
} from './tinettiTypes';
export { TINETTI_ITEMS, TINETTI_PROVENANCE } from './tinettiItems';
export const TINETTI = {
  type: 'tinetti',
  version: TINETTI_VERSION,
  sourceSha256: TINETTI_SOURCE_SHA256,
  referenceSha256: TINETTI_REFERENCE_SHA256,
  title: 'Scala di Tinetti (POMA)',
  description: 'Valutazione di equilibrio e andatura: 20 risposte, massimo 28 punti.',
} as const;
export const TINETTI_GROUPS = [
  { id: 'balance', label: 'Equilibrio', maximum: 16 },
  { id: 'gait', label: 'Andatura', maximum: 12 },
] as const;
export const TINETTI_KEYS = Object.keys(TINETTI_MAXIMUM) as TinettiItemId[];
export function emptyTinettiAnswers(): TinettiAnswers {
  return {
    ...Object.fromEntries(TINETTI_KEYS.map((key) => [key, null])),
    notes: '',
  } as TinettiAnswers;
}
export function validTinettiScore(id: TinettiItemId, value: unknown): value is TinettiScore {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= TINETTI_MAXIMUM[id]
  );
}
export function assertTinettiAnswers(value: unknown): asserts value is TinettiAnswers {
  const a = value as TinettiAnswers;
  if (
    !a ||
    typeof a !== 'object' ||
    Array.isArray(a) ||
    Object.keys(a).length !== 21 ||
    !Object.hasOwn(a, 'notes') ||
    TINETTI_KEYS.some(
      (key) => !Object.hasOwn(a, key) || (a[key] !== null && !validTinettiScore(key, a[key])),
    )
  )
    throw new Error('Risposte Tinetti non valide.');
  if (
    typeof a.notes !== 'string' ||
    [...a.notes].length > 4000 ||
    [...a.notes].some((c) => {
      const point = c.codePointAt(0)!;
      return (
        (point < 32 && ![9, 10, 13].includes(point)) ||
        point === 127 ||
        (point >= 0xd800 && point <= 0xdfff)
      );
    })
  )
    throw new Error('Note Tinetti non valide: massimo 4000 caratteri.');
}
export function tinettiCompletion(a: TinettiAnswers) {
  const missingPaths = TINETTI_KEYS.filter((key) => !validTinettiScore(key, a[key]));
  return { complete: missingPaths.length === 0, missingPaths };
}
export const answeredTinetti = (a: TinettiAnswers) => 20 - tinettiCompletion(a).missingPaths.length;
export function tinettiRisk(total: number): Pick<TinettiResult, 'riskBand' | 'label'> {
  return total <= 18
    ? { riskBand: 'high', label: 'Alto rischio cadute' }
    : total <= 23
      ? { riskBand: 'moderate', label: 'Rischio moderato' }
      : { riskBand: 'low', label: 'Basso rischio' };
}
export function tinettiResult(a: TinettiAnswers): TinettiResult | null {
  if (!tinettiCompletion(a).complete) return null;
  const sum = (group: 'balance' | 'gait') =>
    TINETTI_ITEMS.filter((item) => item.group === group).reduce(
      (total, item) => total + a[item.id]!,
      0,
    );
  const balance = sum('balance'),
    gait = sum('gait'),
    total = balance + gait;
  return { balance, gait, total, ...tinettiRisk(total) };
}
export function validTinettiResult(value: unknown): value is TinettiResult {
  const r = value as TinettiResult;
  if (
    !r ||
    typeof r !== 'object' ||
    Object.keys(r).length !== 5 ||
    !Number.isInteger(r.balance) ||
    r.balance < 0 ||
    r.balance > 16 ||
    !Number.isInteger(r.gait) ||
    r.gait < 0 ||
    r.gait > 12 ||
    r.total !== r.balance + r.gait
  )
    return false;
  const risk = tinettiRisk(r.total);
  return r.riskBand === risk.riskBand && r.label === risk.label;
}
export const tinettiSnapshotItems = (a: TinettiAnswers) =>
  TINETTI_ITEMS.map((item) => ({
    id: item.id,
    label: item.label,
    score: a[item.id],
    description: a[item.id] === null ? 'Non valutato' : item.options[a[item.id]!],
    group: item.group,
  }));
