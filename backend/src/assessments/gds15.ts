import { AssessmentError } from './types.js';
import { GDS15_ITEMS } from './gds15-definition.js';
import {
  GDS15_KEYS,
  type Gds15Answers,
  type Gds15ItemId,
  type Gds15Result,
  type Gds15SnapshotItem,
} from './gds15-types.js';

export function parseGds15Answers(value: unknown): Gds15Answers {
  const invalid = () => new AssessmentError('Risposte GDS-15 non valide');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).some((key) => key !== 'notes' && !GDS15_KEYS.includes(key as Gds15ItemId)) ||
    GDS15_KEYS.some(
      (key) =>
        !Object.hasOwn(input, key) || (input[key] !== null && typeof input[key] !== 'boolean'),
    )
  )
    throw invalid();
  const notes = Object.hasOwn(input, 'notes') ? input.notes : '';
  if (
    typeof notes !== 'string' ||
    [...notes].length > 4000 ||
    [...notes].some((character) => {
      const point = character.codePointAt(0)!;
      return point >= 0xd800 && point <= 0xdfff;
    }) ||
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(notes)
  )
    throw invalid();
  return {
    ...Object.fromEntries(GDS15_KEYS.map((key) => [key, input[key]])),
    notes,
  } as Gds15Answers;
}
export function gds15Completion(answers: Gds15Answers) {
  const missingPaths = GDS15_KEYS.filter((key) => typeof answers[key] !== 'boolean');
  return { complete: missingPaths.length === 0, missingPaths };
}
export function gds15Result(answers: Gds15Answers): Gds15Result | null {
  if (!gds15Completion(answers).complete) return null;
  const total = GDS15_ITEMS.reduce(
    (sum, item) => sum + Number(answers[item.id] === item.pointForYes),
    0,
  );
  const risk =
    total <= 5
      ? ({ band: 'none', label: 'Assente / Nella norma' } as const)
      : total <= 9
        ? ({ band: 'mild_moderate', label: 'Depressione lieve–moderata' } as const)
        : ({ band: 'severe', label: 'Depressione grave' } as const);
  return { total, maximum: 15, ...risk };
}
export function gds15SnapshotItems(answers: Gds15Answers): Gds15SnapshotItem[] {
  if (!gds15Completion(answers).complete)
    throw new AssessmentError('Valutazione GDS-15 incompleta');
  return GDS15_ITEMS.map((item) => ({
    id: item.id,
    label: item.label,
    answer: answers[item.id]!,
    score: answers[item.id] === item.pointForYes ? 1 : 0,
    description: answers[item.id] ? 'Sì' : 'No',
  }));
}
