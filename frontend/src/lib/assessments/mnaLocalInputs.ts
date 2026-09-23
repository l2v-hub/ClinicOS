import { mnaBmi, validMnaDate } from './mnaInputValidation';
import {
  MNA_MEASUREMENT_KEYS,
  type MnaAnswers,
  type MnaInputPath,
  type MnaLocalInputs,
  type MnaMeasurementKey,
} from './mnaTypes';

function parseRaw(path: MnaInputPath, raw: string): number | string | null {
  const text = raw.trim();
  if (!text) return null;
  if (path.startsWith('measurementDates.')) {
    if (!validMnaDate(text))
      throw new Error('Indica una data reale nel formato AAAA-MM-GG, oppure lascia vuoto.');
    return text;
  }
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/.test(text))
    throw new Error('Indica un numero positivo; usa la virgola o il punto per i decimali.');
  const value = Number(text.replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0)
    throw new Error('La misura deve essere un numero finito maggiore di zero.');
  return value;
}
export function mnaInputErrors(
  answers: MnaAnswers,
  inputs?: MnaLocalInputs,
): MnaLocalInputs['errors'] {
  const errors: MnaLocalInputs['errors'] = {};
  for (const [path, raw] of Object.entries(inputs?.raw ?? {})) {
    try {
      parseRaw(path as MnaInputPath, raw);
    } catch (error) {
      errors[path as MnaInputPath] = (error as Error).message;
    }
  }
  try {
    mnaBmi(answers.measurements);
  } catch {
    const message = 'IMC non calcolabile con queste misure. Verifica peso e altezza.';
    errors['measurements.weightKg'] ??= message;
    errors['measurements.heightCm'] ??= message;
  }
  return errors;
}
export function mnaHasInputErrors(answers: MnaAnswers, inputs?: MnaLocalInputs) {
  return Object.keys(mnaInputErrors(answers, inputs)).length > 0;
}
export function updateMnaInput(
  answers: MnaAnswers,
  inputs: MnaLocalInputs | undefined,
  path: MnaInputPath,
  raw: string,
) {
  const next = structuredClone(answers);
  const mnaInputs: MnaLocalInputs = { raw: { ...inputs?.raw, [path]: raw }, errors: {} };
  try {
    const parsed = parseRaw(path, raw);
    const key = path.split('.')[1] as MnaMeasurementKey;
    if (path.startsWith('measurementDates.')) next.measurementDates[key] = parsed as string | null;
    else {
      next.measurements[key] = parsed as number | null;
      if (next.measurements.weightKg !== null && next.measurements.heightCm !== null)
        next.F = { method: 'measured' };
      if (next.measurements.armCircumferenceCm !== null) next.Q = { method: 'measured' };
      if (next.measurements.calfCircumferenceCm !== null) next.R = { method: 'measured' };
    }
  } catch {
    /* Retain visible raw input; errors prohibit writing a hidden previous value. */
  }
  mnaInputs.errors = mnaInputErrors(next, mnaInputs);
  return { answers: next, mnaInputs };
}
export function mnaInputValue(
  answers: MnaAnswers,
  inputs: MnaLocalInputs | undefined,
  path: MnaInputPath,
): string {
  if (Object.hasOwn(inputs?.raw ?? {}, path)) return inputs!.raw[path]!;
  const key = path.split('.')[1] as MnaMeasurementKey;
  const value = path.startsWith('measurementDates.')
    ? answers.measurementDates[key]
    : answers.measurements[key];
  return value === null ? '' : String(value);
}
/** Invalid visible numeric edits cannot contribute a stale item/score to the editor. */
export function mnaVisibleAnswers(answers: MnaAnswers, inputs?: MnaLocalInputs): MnaAnswers {
  const visible = structuredClone(answers);
  const errors = mnaInputErrors(answers, inputs);
  for (const key of MNA_MEASUREMENT_KEYS)
    if (errors[`measurements.${key}`]) {
      visible.measurements[key] = null;
      const id =
        key === 'weightKg' || key === 'heightCm' ? 'F' : key === 'armCircumferenceCm' ? 'Q' : 'R';
      visible[id] = { method: 'measured' };
    }
  return visible;
}
export function displayMnaBmi(value: number): string {
  const rounded = Number(value.toFixed(2));
  const band = (n: number) => (n < 19 ? 0 : n < 21 ? 1 : n < 23 ? 2 : 3);
  return rounded === 0 || band(rounded) !== band(value)
    ? String(value).replace('.', ',')
    : value.toLocaleString('it-IT', { maximumFractionDigits: 2 });
}
