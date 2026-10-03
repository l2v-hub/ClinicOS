// Scoring, completion and answer validation for the paper-form scales.
// Byte-identical in backend/src/assessments/paper/ and frontend/src/lib/assessments/paper/
// (a backend test pins the equality). Pure functions; throws PaperInputError on invalid input.
import { PAPER_SCALES, type PaperBand, type PaperItem, type PaperScale } from './definitions.js';

export class PaperInputError extends Error {}
export type PaperAnswerValue = number | boolean | null;
export type PaperAnswers = Record<string, PaperAnswerValue | string>;
export interface PaperCompletion {
  complete: boolean;
  missingPaths: string[];
}
export interface PaperResultPart {
  id: string;
  label: string;
  total: number;
  maximum: number;
}
export interface PaperResult {
  total: number;
  maximum: number;
  band: string;
  label: string;
  parts?: PaperResultPart[];
}
export interface PaperSnapshotItem {
  key: string;
  number: string;
  label: string;
  subLabel: string | null;
  value: number | boolean;
  score: number;
  description: string;
}
export interface PaperMeasurements {
  weightKg: number | null;
  heightM: number | null;
  calfCm: number | null;
  bmi: number | null;
}

export const MEASURE_LIMITS = {
  weightKg: { min: 1, max: 500, label: 'Peso (kg)' },
  heightM: { min: 0.5, max: 2.5, label: 'Altezza (m)' },
  calfCm: { min: 1, max: 100, label: 'Circonferenza del polpaccio (cm)' },
} as const;

/** The scale definition for a (type, formVersion) pair rendered with the paper layout. */
export function paperScale(type: string, version: string): PaperScale | undefined {
  return PAPER_SCALES.find((scale) => scale.type === type && scale.version === version);
}
export function paperItems(scale: PaperScale): PaperItem[] {
  return scale.sections.flatMap((section) => [...section.items]);
}
export function paperKeys(scale: PaperScale): string[] {
  return [
    ...paperItems(scale).map((item) => item.key),
    ...(scale.notes ? ['notes'] : []),
    ...(scale.measures ?? []),
  ];
}
export function emptyPaperAnswers(scale: PaperScale): PaperAnswers {
  return Object.fromEntries(paperKeys(scale).map((key) => [key, key === 'notes' ? '' : null]));
}
export function mnaBmi(weightKg: number | null, heightM: number | null): number | null {
  if (weightKg === null || heightM === null) return null;
  return weightKg / (heightM * heightM);
}
export function bmiPoints(bmi: number): number {
  return bmi < 19 ? 0 : bmi < 21 ? 1 : bmi < 23 ? 2 : 3;
}
export function calfPoints(calfCm: number): number {
  return calfCm < 31 ? 0 : 3;
}
const validNotes = (value: unknown): value is string =>
  typeof value === 'string' &&
  [...value].length <= 4000 &&
  [...value].every((character) => {
    const point = character.codePointAt(0)!;
    return (
      (point >= 32 || point === 9 || point === 10 || point === 13) &&
      point !== 127 &&
      !(point >= 0xd800 && point <= 0xdfff)
    );
  });

/** Exact key set, option values from the definition, measures in range, F1/F2 coherence. */
export function parsePaperAnswers(scale: PaperScale, value: unknown): PaperAnswers {
  const invalid = (message = `Risposte ${scale.appTitle} non valide.`) =>
    new PaperInputError(message);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  const input = value as Record<string, unknown>;
  const keys = paperKeys(scale);
  if (
    Object.keys(input).some((key) => !keys.includes(key)) ||
    keys.some((key) => key !== 'notes' && !Object.hasOwn(input, key))
  )
    throw invalid();
  const output: PaperAnswers = {};
  for (const item of paperItems(scale)) {
    const answer = input[item.key];
    if (answer !== null && !item.options.some((option) => option.value === answer)) throw invalid();
    output[item.key] = answer as PaperAnswerValue;
  }
  if (scale.notes) {
    const notes = Object.hasOwn(input, 'notes') ? input.notes : '';
    if (!validNotes(notes))
      throw invalid('Le note devono contenere al massimo 4000 caratteri validi.');
    output.notes = notes;
  }
  for (const key of scale.measures ?? []) {
    const measure = input[key];
    const limit = MEASURE_LIMITS[key];
    if (
      measure !== null &&
      (typeof measure !== 'number' ||
        !Number.isFinite(measure) ||
        measure < limit.min ||
        measure > limit.max)
    )
      throw invalid(`${limit.label}: valore fuori dall'intervallo ${limit.min}–${limit.max}.`);
    output[key] = measure as number | null;
  }
  for (const item of paperItems(scale)) {
    if (!item.dependsOn) continue;
    if (output[item.dependsOn] === 0 && output[item.key] !== null)
      throw invalid(`${item.label}: da lasciare vuoto quando la frequenza è 0.`);
  }
  const groups = new Set(paperItems(scale).flatMap((item) => (item.group ? [item.group] : [])));
  for (const group of groups) {
    const answered = paperItems(scale).filter(
      (item) => item.group === group && output[item.key] !== null,
    );
    if (answered.length > 1)
      throw invalid('Compilare F1 (BMI) oppure F2 (circonferenza del polpaccio), non entrambi.');
  }
  if (scale.measures) {
    const bmi = mnaBmi(output.weightKg as number | null, output.heightM as number | null);
    if (bmi !== null) {
      if (output.f2 !== null)
        throw invalid('Con peso e altezza disponibili si usa F1 (BMI), non F2.');
      if (output.f1 !== null && output.f1 !== bmiPoints(bmi))
        throw invalid('F1 non corrisponde al BMI calcolato da peso e altezza.');
    }
    if (
      output.calfCm !== null &&
      output.f2 !== null &&
      output.f2 !== calfPoints(output.calfCm as number)
    )
      throw invalid('F2 non corrisponde alla circonferenza del polpaccio indicata.');
  }
  return output;
}

function required(scale: PaperScale, answers: PaperAnswers, item: PaperItem) {
  if (item.group)
    return !paperItems(scale).some(
      (other) =>
        other.group === item.group && other.key !== item.key && answers[other.key] !== null,
    );
  if (item.dependsOn) {
    const parent = answers[item.dependsOn];
    return typeof parent === 'number' && parent > 0;
  }
  return true;
}
export function paperCompletion(scale: PaperScale, answers: PaperAnswers): PaperCompletion {
  const missingPaths = paperItems(scale)
    .filter((item) => answers[item.key] === null && required(scale, answers, item))
    .map((item) => item.key);
  return { complete: missingPaths.length === 0, missingPaths };
}
export function answeredPaperCount(scale: PaperScale, answers: PaperAnswers): number {
  return paperItems(scale).filter((item) => answers[item.key] !== null).length;
}
export function paperBand(scale: PaperScale, total: number): PaperBand {
  const band = scale.bands.find((candidate) => total >= candidate.min && total <= candidate.max);
  if (!band || !Number.isInteger(total) || total < 0 || total > scale.maximum)
    throw new PaperInputError('Punteggio non valido.');
  return band;
}
const points = (item: PaperItem, value: PaperAnswerValue | string) =>
  item.options.find((option) => option.value === value)?.points ?? 0;
export function paperResult(scale: PaperScale, answers: PaperAnswers): PaperResult | null {
  if (!paperCompletion(scale, answers).complete) return null;
  const items = paperItems(scale);
  let total: number;
  let parts: PaperResultPart[] | undefined;
  if (scale.scoring === 'npi') {
    const frequency = answers.frequency as number;
    total = frequency === 0 ? 0 : frequency * (answers.severity as number);
    const distress = items.find((item) => item.key === 'distress');
    parts = distress
      ? [
          {
            id: 'distress',
            label: distress.label,
            total: frequency === 0 ? 0 : (answers.distress as number),
            maximum: 5,
          },
        ]
      : undefined;
  } else {
    total = items
      .filter((item) => !item.excludedFromTotal)
      .reduce((sum, item) => sum + points(item, answers[item.key]), 0);
    if (scale.totalParts)
      parts = scale.totalParts.map((part) => ({
        id: part.id,
        label: part.label,
        maximum: part.maximum,
        total: scale.sections
          .find((section) => section.id === part.id)!
          .items.reduce((sum, item) => sum + points(item, answers[item.key]), 0),
      }));
  }
  const band = paperBand(scale, total);
  return {
    total,
    maximum: scale.maximum,
    band: band.id,
    label: band.label,
    ...(parts ? { parts } : {}),
  };
}
/** Answered items with their printed text, in paper order (snapshot content). */
export function paperSnapshotItems(scale: PaperScale, answers: PaperAnswers): PaperSnapshotItem[] {
  return paperItems(scale).flatMap((item) => {
    const option = item.options.find((candidate) => candidate.value === answers[item.key]);
    return option
      ? [
          {
            key: item.key,
            number: item.number,
            label: item.label,
            subLabel: item.subLabel ?? null,
            value: option.value,
            score: option.points,
            description: option.label,
          },
        ]
      : [];
  });
}
export function paperMeasurements(
  scale: PaperScale,
  answers: PaperAnswers,
): PaperMeasurements | null {
  if (!scale.measures) return null;
  const weightKg = answers.weightKg as number | null;
  const heightM = answers.heightM as number | null;
  const bmi = mnaBmi(weightKg, heightM);
  return {
    weightKg,
    heightM,
    calfCm: answers.calfCm as number | null,
    bmi: bmi === null ? null : Math.round(bmi * 10) / 10,
  };
}
