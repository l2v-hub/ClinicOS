import { MNA_ITEMS, MNA_K_LABELS } from './mnaItems';
import { mnaBmiOrNull } from './mnaInputValidation';
import {
  MNA_KEYS,
  MNA_K_KEYS,
  type MnaAnswers,
  type MnaItemId,
  type MnaCompletion,
  type MnaResult,
  type MnaSnapshotItem,
  type MnaSectionCompletion,
} from './mnaTypes';
import { MNA_VERSION, MNA_SOURCE_SHA256, MNA_MEASUREMENT_KEYS } from './mnaTypes';
export { assertMnaAnswers } from './mnaInputValidation';
export const MNA = {
  type: 'mna',
  version: MNA_VERSION,
  sourceSha256: MNA_SOURCE_SHA256,
  title: 'Mini Nutritional Assessment · MNA®',
  description: 'Screening e valutazione completa dello stato nutrizionale.',
} as const;
export const mnaTitle = (extent: MnaAnswers['extent']) =>
  extent === 'screening' ? 'Screening MNA®' : 'Valutazione completa MNA®';
export function emptyMnaAnswers(): MnaAnswers {
  return {
    extent: 'screening',
    ...Object.fromEntries(MNA_KEYS.map((id) => [id, null])),
    F: { method: 'category', category: null },
    Q: { method: 'category', category: null },
    R: { method: 'category', category: null },
    K: { dairyDaily: null, eggsOrLegumesWeekly: null, meatFishOrPoultryDaily: null },
    measurements: Object.fromEntries(MNA_MEASUREMENT_KEYS.map((key) => [key, null])),
    measurementDates: Object.fromEntries(MNA_MEASUREMENT_KEYS.map((key) => [key, null])),
    notes: '',
  } as MnaAnswers;
}

export function mnaMissing(answers: MnaAnswers, id: MnaItemId): string[] {
  if (id === 'K')
    return MNA_K_KEYS.filter((key) => answers.K[key] === null).map((key) => 'K.' + key);
  if (id === 'F' || id === 'Q' || id === 'R') {
    if (answers[id].method === 'category')
      return answers[id].category === null ? [id + '.category'] : [];
    const keys =
      id === 'F'
        ? (['weightKg', 'heightCm'] as const)
        : id === 'Q'
          ? (['armCircumferenceCm'] as const)
          : (['calfCircumferenceCm'] as const);
    if (
      id === 'F' &&
      keys.every((key) => answers.measurements[key] !== null) &&
      mnaBmiOrNull(answers.measurements) === null
    )
      return ['measurements.weightKg', 'measurements.heightCm'];
    return keys
      .filter((key) => answers.measurements[key] === null)
      .map((key) => 'measurements.' + key);
  }
  return answers[id] === null ? [id] : [];
}
export function mnaCompletion(answers: MnaAnswers): MnaCompletion {
  const section = (keys: readonly MnaItemId[], requiredCount: 6 | 12): MnaSectionCompletion => {
    const missingPaths = keys.flatMap((id) => mnaMissing(answers, id));
    return {
      answeredCount: keys.filter((id) => !mnaMissing(answers, id).length).length,
      requiredCount,
      complete: missingPaths.length === 0,
      missingPaths,
    };
  };
  const screening = section(MNA_KEYS.slice(0, 6), 6),
    global = section(MNA_KEYS.slice(6), 12);
  const missingPaths = [
    ...screening.missingPaths,
    ...(answers.extent === 'full' ? global.missingPaths : []),
  ];
  return { complete: missingPaths.length === 0, missingPaths, screening, global };
}
function selectedValue(answers: MnaAnswers, id: MnaItemId): unknown {
  if (id !== 'F' && id !== 'Q' && id !== 'R') return answers[id];
  const answer = answers[id];
  if (answer.method === 'category') return answer.category;
  if (id === 'F') {
    const bmi = mnaBmiOrNull(answers.measurements)!;
    return bmi < 19 ? 'lt19' : bmi < 21 ? 'gte19_lt21' : bmi < 23 ? 'gte21_lt23' : 'gte23';
  }
  if (id === 'Q') {
    const arm = answers.measurements.armCircumferenceCm!;
    return arm < 21 ? 'lt21' : arm <= 22 ? '21_to_22' : 'gt22';
  }
  return answers.measurements.calfCircumferenceCm! < 31 ? 'lt31' : 'gte31';
}
export function mnaItemScore(answers: MnaAnswers, id: MnaItemId): number | null {
  if (mnaMissing(answers, id).length) return null;
  if (id === 'K') {
    const yes = MNA_K_KEYS.filter((key) => answers.K[key]).length;
    return yes <= 1 ? 0 : yes === 2 ? 0.5 : 1;
  }
  return MNA_ITEMS.find((item) => item.id === id)!.options.find(
    (option) => option.value === selectedValue(answers, id),
  )!.score;
}
export function mnaResult(answers: MnaAnswers): MnaResult {
  const complete = mnaCompletion(answers);
  const sum = (keys: readonly MnaItemId[]) =>
    keys.reduce((total, id) => total + mnaItemScore(answers, id)! * 2, 0) / 2;
  const screenScore = complete.screening.complete ? sum(MNA_KEYS.slice(0, 6)) : null;
  const globalScore = complete.global.complete ? sum(MNA_KEYS.slice(6)) : null;
  const total =
    answers.extent === 'full' && screenScore !== null && globalScore !== null
      ? screenScore + globalScore
      : null;
  return {
    screening:
      screenScore === null
        ? null
        : {
            score: screenScore,
            maximum: 14,
            band: screenScore <= 7 ? 'malnourished' : screenScore <= 11 ? 'at_risk' : 'normal',
            label:
              screenScore <= 7
                ? 'Malnutrito'
                : screenScore <= 11
                  ? 'A rischio di malnutrizione'
                  : 'Stato nutrizionale normale',
          },
    global: globalScore === null ? null : { score: globalScore, maximum: 16 },
    total:
      total === null
        ? null
        : {
            score: total,
            maximum: 30,
            band: total < 17 ? 'malnourished' : total < 24 ? 'at_risk' : 'normal',
            label:
              total < 17
                ? 'Cattivo stato nutrizionale'
                : total < 24
                  ? 'Rischio di malnutrizione'
                  : 'Stato nutrizionale normale',
          },
  };
}
export function mnaKDescription(answers: MnaAnswers): string {
  return MNA_K_KEYS.map(
    (key) =>
      MNA_K_LABELS[key] +
      ': ' +
      (answers.K[key] === null ? 'Non compilato' : answers.K[key] ? 'Sì' : 'No'),
  ).join('\n');
}
export function mnaSnapshotItems(answers: MnaAnswers): MnaSnapshotItem[] {
  return MNA_ITEMS.map((item, index) => {
    const score = mnaItemScore(answers, item.id);
    return {
      id: item.id,
      group: index < 6 ? 'screening' : 'global',
      label: item.label,
      answer: structuredClone(answers[item.id]),
      score,
      description:
        score === null
          ? null
          : item.id === 'K'
            ? mnaKDescription(answers)
            : item.options.find((option) => option.value === selectedValue(answers, item.id))!
                .description,
      ...(item.id === 'K'
        ? {
            subitems: MNA_K_KEYS.map((id) => ({
              id,
              label: MNA_K_LABELS[id],
              answer: answers.K[id],
            })),
          }
        : {}),
    };
  });
}
