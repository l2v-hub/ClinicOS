// REQ-093 (BUG-055): shared helpers for exact-fraction therapy dosing.
// Fractions are kept EXACT (numerator/denominator) and never approximated to a decimal in storage.
// Mg equivalents are derived for display only.

import { AppointmentListInputError, parseIsoCalendarDate } from '../appointments/list-query.js';

export interface ScheduleInput {
  time: string; // "HH:MM"
  quantityNumerator: number;
  quantityDenominator: number;
  administrationUnit: string; // compressa | ml | gocce | unità | bustina | ...
  fascia: string; // mattina|pranzo|pomeriggio|sera|notte (derived from time)
}

export const MAX_THERAPY_SCHEDULES = 32;

export class InvalidTherapySchedulesError extends Error {
  constructor(message = 'Pianificazione terapia non valida') {
    super(message);
    this.name = 'InvalidTherapySchedulesError';
  }
}

export class TherapyDateRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TherapyDateRangeError';
  }
}

function canonicalScheduleTime(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function normalizeTherapyDateRange(
  dataInizio: unknown,
  dataFine: unknown,
): { dataInizio: string; dataFine: string | null } {
  if (typeof dataInizio !== 'string' || dataInizio.trim() === '') {
    throw new TherapyDateRangeError('dataInizio non valida');
  }
  let start: string;
  let end: string | null = null;
  try {
    start = parseIsoCalendarDate(dataInizio.trim(), 'dataInizio');
    if (dataFine !== undefined && dataFine !== null && dataFine !== '') {
      if (typeof dataFine !== 'string') throw new TherapyDateRangeError('dataFine non valida');
      end = parseIsoCalendarDate(dataFine.trim(), 'dataFine');
    }
  } catch (error) {
    if (error instanceof TherapyDateRangeError) throw error;
    if (error instanceof AppointmentListInputError) {
      throw new TherapyDateRangeError(error.message);
    }
    throw error;
  }
  if (end !== null && end < start) {
    throw new TherapyDateRangeError('dataFine non può precedere dataInizio');
  }
  return { dataInizio: start, dataFine: end };
}

export function assertValidTherapyDateRange(dataInizio: unknown, dataFine: unknown): void {
  normalizeTherapyDateRange(dataInizio, dataFine);
}

/** Strict boundary validation. `normalizeSchedules` remains a normalizer, never an input gate. */
export function assertValidSchedulesInput(raw: unknown): void {
  if (!Array.isArray(raw)) {
    throw new InvalidTherapySchedulesError('schedules deve essere un array');
  }
  if (raw.length > MAX_THERAPY_SCHEDULES) {
    throw new InvalidTherapySchedulesError(
      `Sono consentiti al massimo ${MAX_THERAPY_SCHEDULES} orari per terapia`,
    );
  }
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new InvalidTherapySchedulesError();
    }
    const value = item as Record<string, unknown>;
    if (canonicalScheduleTime(value.time) === null) {
      throw new InvalidTherapySchedulesError(
        'Ogni orario deve usare il formato HH:MM (00:00–23:59)',
      );
    }
    for (const key of ['quantityNumerator', 'quantityDenominator'] as const) {
      if (value[key] === undefined) continue;
      const quantity = Number(value[key]);
      if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 1000) {
        throw new InvalidTherapySchedulesError('Quantità terapia non valida');
      }
    }
    if (
      value.administrationUnit !== undefined &&
      (typeof value.administrationUnit !== 'string' ||
        value.administrationUnit.trim().length === 0 ||
        value.administrationUnit.trim().length > 64)
    ) {
      throw new InvalidTherapySchedulesError('Unità di somministrazione non valida');
    }
  }
}

const FASCE_RANGES: { fascia: string; startMin: number; endMin: number }[] = [
  { fascia: 'mattina', startMin: 5 * 60, endMin: 11 * 60 - 1 }, // 05:00–10:59
  { fascia: 'pranzo', startMin: 11 * 60, endMin: 14 * 60 - 1 }, // 11:00–13:59
  { fascia: 'pomeriggio', startMin: 14 * 60, endMin: 18 * 60 - 1 }, // 14:00–17:59
  { fascia: 'sera', startMin: 18 * 60, endMin: 22 * 60 - 1 }, // 18:00–21:59
  // notte = everything else (22:00–04:59)
];

/** Map an "HH:MM" time to one of the 5 administration fasce. */
export function fasciaFromTime(time: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec((time || '').trim());
  if (!m) return 'mattina';
  const mins = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const hit = FASCE_RANGES.find((r) => mins >= r.startMin && mins <= r.endMin);
  return hit ? hit.fascia : 'notte';
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

/** Normalize a numerator/denominator pair to lowest terms with a positive denominator. */
export function normalizeFraction(num: number, den: number): { num: number; den: number } {
  let n = Math.round(num);
  let d = Math.round(den) || 1;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { num: n / g, den: d / g };
}

/** Format a fraction for display: "1", "3/4", "1/2", "5" (for 5/1). */
export function formatFraction(num: number, den: number): string {
  const { num: n, den: d } = normalizeFraction(num, den);
  if (d === 1) return String(n);
  return `${n}/${d}`;
}

/** Exact decimal value of the fraction (for mg computation only). */
export function fractionValue(num: number, den: number): number {
  return num / (den || 1);
}

/**
 * Human label for a single scheduled administration, e.g.
 * "08:00 — 1/2 compressa — equivalente a 50 mg".
 * mg part is omitted when strength is unknown or the unit is not a divisible solid form.
 */
export function scheduleDoseLabel(
  s: ScheduleInput,
  strengthValue?: number | null,
  strengthUnit?: string | null,
): string {
  const frac = formatFraction(s.quantityNumerator, s.quantityDenominator);
  const unit = s.administrationUnit || 'compressa';
  let label = `${frac} ${unit}`;
  if (strengthValue != null && strengthValue > 0 && strengthUnit) {
    const mg = fractionValue(s.quantityNumerator, s.quantityDenominator) * strengthValue;
    const mgRounded = Math.round(mg * 100) / 100;
    const exact = Number.isInteger(mg);
    label += ` — ${exact ? '' : '≈ '}${mgRounded} ${strengthUnit}`;
  }
  return label;
}

/** Short dose string stored on MedicationAdministration.farmacoDose, e.g. "1/2 compressa (50 mg)". */
export function scheduleDoseShort(
  s: ScheduleInput,
  strengthValue?: number | null,
  strengthUnit?: string | null,
): string {
  const frac = formatFraction(s.quantityNumerator, s.quantityDenominator);
  const unit = s.administrationUnit || 'compressa';
  let label = `${frac} ${unit}`;
  if (strengthValue != null && strengthValue > 0 && strengthUnit) {
    const mg = fractionValue(s.quantityNumerator, s.quantityDenominator) * strengthValue;
    const mgRounded = Math.round(mg * 100) / 100;
    label += ` (${Number.isInteger(mg) ? '' : '≈'}${mgRounded} ${strengthUnit})`;
  }
  return label;
}

/**
 * Derive the legacy fascia boolean flags + comma-separated specific times from schedules,
 * so the existing fascia-keyed therapy-slots / administration / print pipeline keeps working.
 */
export function deriveLegacyFromSchedules(schedules: ScheduleInput[]): {
  fasceMattina: boolean;
  fascePranzo: boolean;
  fascePomeriggio: boolean;
  fasceSera: boolean;
  fasceNotte: boolean;
  orarioSpecifico: string | null;
} {
  const flags = {
    fasceMattina: false,
    fascePranzo: false,
    fascePomeriggio: false,
    fasceSera: false,
    fasceNotte: false,
  };
  const times: string[] = [];
  for (const s of schedules) {
    const fascia = s.fascia || fasciaFromTime(s.time);
    if (fascia === 'mattina') flags.fasceMattina = true;
    else if (fascia === 'pranzo') flags.fascePranzo = true;
    else if (fascia === 'pomeriggio') flags.fascePomeriggio = true;
    else if (fascia === 'sera') flags.fasceSera = true;
    else if (fascia === 'notte') flags.fasceNotte = true;
    if (s.time) times.push(s.time);
  }
  const uniqueTimes = Array.from(new Set(times)).sort();
  return {
    ...flags,
    orarioSpecifico: uniqueTimes.length ? uniqueTimes.join(',') : null,
  };
}

/** Sanitize + dedupe schedules so the same drug with multiple times never duplicates the therapy row. */
export function normalizeSchedules(raw: unknown): ScheduleInput[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ScheduleInput[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const time = canonicalScheduleTime(r.time);
    if (time === null) continue;
    const num = Math.min(1000, Math.max(1, Math.round(Number(r.quantityNumerator) || 1)));
    const den = Math.min(1000, Math.max(1, Math.round(Number(r.quantityDenominator) || 1)));
    const unit =
      typeof r.administrationUnit === 'string' && r.administrationUnit.trim()
        ? r.administrationUnit.trim().slice(0, 64)
        : 'compressa';
    const key = `${time}|${unit}`;
    if (seen.has(key)) continue; // one schedule per (time, unit)
    seen.add(key);
    out.push({
      time,
      quantityNumerator: num,
      quantityDenominator: den,
      administrationUnit: unit,
      fascia: fasciaFromTime(time),
    });
  }
  return out;
}
