import { AssessmentError } from './types.js';
import { MNA_ITEMS } from './mna-definition.js';
import { MNA_KEYS, MNA_K_KEYS, MNA_MEASUREMENT_KEYS, type MnaAnswers } from './mna-types.js';

const invalid = (path: string) => new AssessmentError('Dato MNA non valido: ' + path);
function object(value: unknown, keys: readonly string[], path: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid(path);
  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).some((key) => !keys.includes(key)) ||
    keys.some((key) => !Object.hasOwn(input, key))
  )
    throw invalid(path);
  return input;
}
export function validMnaDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const leap = year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
  return (
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
  );
}
export function mnaBmi(measurements: MnaAnswers['measurements']): number | null {
  const { weightKg, heightCm } = measurements;
  if (weightKg === null || heightCm === null) return null;
  const meters = heightCm / 100,
    square = meters ** 2,
    bmi = weightKg / square;
  if (![meters, square, bmi].every((value) => Number.isFinite(value) && value > 0))
    throw invalid('measurements.weightKg / measurements.heightCm: IMC non calcolabile');
  return bmi;
}
export function mnaAssessmentDate(value: string): string {
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime()) || value.startsWith('0000-')) throw invalid('assessedAt');
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      era: 'short',
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  const day = parts.year.padStart(4, '0') + '-' + parts.month + '-' + parts.day;
  if (parts.era !== 'AD' || !validMnaDate(day)) throw invalid('assessedAt');
  return day;
}
export function parseMnaAnswers(value: unknown): MnaAnswers {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid('answers');
  const raw = value as Record<string, unknown>;
  const normalized = { ...raw, notes: Object.hasOwn(raw, 'notes') ? raw.notes : '' };
  const input = object(
    normalized,
    ['extent', ...MNA_KEYS, 'measurements', 'measurementDates', 'notes'],
    'answers',
  );
  if (!['screening', 'full'].includes(input.extent as string)) throw invalid('extent');
  const measurements = object(input.measurements, MNA_MEASUREMENT_KEYS, 'measurements');
  const dates = object(input.measurementDates, MNA_MEASUREMENT_KEYS, 'measurementDates');
  for (const key of MNA_MEASUREMENT_KEYS) {
    if (
      measurements[key] !== null &&
      (typeof measurements[key] !== 'number' ||
        !Number.isFinite(measurements[key]) ||
        (measurements[key] as number) <= 0)
    )
      throw invalid('measurements.' + key);
    if (dates[key] !== null && !validMnaDate(dates[key])) throw invalid('measurementDates.' + key);
  }
  const canonicalMeasurements = Object.fromEntries(
    MNA_MEASUREMENT_KEYS.map((key) => [key, measurements[key]]),
  ) as MnaAnswers['measurements'];
  mnaBmi(canonicalMeasurements);
  const answers: Record<string, unknown> = { extent: input.extent };
  for (const item of MNA_ITEMS) {
    if (item.id === 'K') {
      const k = object(input.K, MNA_K_KEYS, 'K');
      for (const key of MNA_K_KEYS)
        if (![null, true, false].includes(k[key] as never)) throw invalid('K.' + key);
      answers.K = Object.fromEntries(MNA_K_KEYS.map((key) => [key, k[key]]));
    } else if (item.id === 'F' || item.id === 'Q' || item.id === 'R') {
      const rawMethod = input[item.id];
      if (!rawMethod || typeof rawMethod !== 'object' || Array.isArray(rawMethod))
        throw invalid(item.id);
      const mode = (rawMethod as Record<string, unknown>).method;
      if (mode !== 'category' && mode !== 'measured') throw invalid(item.id + '.method');
      const measurement = object(
        rawMethod,
        mode === 'category' ? ['method', 'category'] : ['method'],
        item.id,
      );
      if (mode === 'category') {
        const completeMeasures =
          item.id === 'F'
            ? measurements.weightKg !== null && measurements.heightCm !== null
            : measurements[item.id === 'Q' ? 'armCircumferenceCm' : 'calfCircumferenceCm'] !== null;
        if (
          completeMeasures ||
          (measurement.category !== null &&
            !item.options.some((option) => option.value === measurement.category))
        )
          throw invalid(item.id + '.category');
        answers[item.id] = { method: 'category', category: measurement.category };
      } else answers[item.id] = { method: 'measured' };
    } else {
      if (
        input[item.id] !== null &&
        !item.options.some((option) => option.value === input[item.id])
      )
        throw invalid(item.id);
      answers[item.id] = input[item.id];
    }
  }
  const notes = input.notes;
  if (
    typeof notes !== 'string' ||
    [...notes].length > 4000 ||
    [...notes].some((character) => {
      const code = character.codePointAt(0)!;
      return code >= 0xd800 && code <= 0xdfff;
    }) ||
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(notes)
  )
    throw invalid('notes');
  return {
    ...answers,
    measurements: canonicalMeasurements,
    measurementDates: Object.fromEntries(MNA_MEASUREMENT_KEYS.map((key) => [key, dates[key]])),
    notes,
  } as unknown as MnaAnswers;
}
