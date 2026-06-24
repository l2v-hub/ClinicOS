// REQ-093 (BUG-055): shared helpers for exact-fraction therapy dosing.
// Fractions are kept EXACT (numerator/denominator) and never approximated to a decimal in storage.
// Mg equivalents are derived for display only.

export interface ScheduleInput {
  time: string;                 // "HH:MM"
  quantityNumerator: number;
  quantityDenominator: number;
  administrationUnit: string;   // compressa | ml | gocce | unità | bustina | ...
  fascia: string;               // mattina|pranzo|pomeriggio|sera|notte (derived from time)
}

const FASCE_RANGES: { fascia: string; startMin: number; endMin: number }[] = [
  { fascia: 'mattina',    startMin: 5 * 60,  endMin: 11 * 60 - 1 },   // 05:00–10:59
  { fascia: 'pranzo',     startMin: 11 * 60, endMin: 14 * 60 - 1 },   // 11:00–13:59
  { fascia: 'pomeriggio', startMin: 14 * 60, endMin: 18 * 60 - 1 },   // 14:00–17:59
  { fascia: 'sera',       startMin: 18 * 60, endMin: 22 * 60 - 1 },   // 18:00–21:59
  // notte = everything else (22:00–04:59)
];

/** Map an "HH:MM" time to one of the 5 administration fasce. */
export function fasciaFromTime(time: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec((time || '').trim());
  if (!m) return 'mattina';
  const mins = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const hit = FASCE_RANGES.find(r => mins >= r.startMin && mins <= r.endMin);
  return hit ? hit.fascia : 'notte';
}

function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a || 1;
}

/** Normalize a numerator/denominator pair to lowest terms with a positive denominator. */
export function normalizeFraction(num: number, den: number): { num: number; den: number } {
  let n = Math.round(num);
  let d = Math.round(den) || 1;
  if (d < 0) { n = -n; d = -d; }
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
  fasceMattina: boolean; fascePranzo: boolean; fascePomeriggio: boolean;
  fasceSera: boolean; fasceNotte: boolean; orarioSpecifico: string | null;
} {
  const flags = {
    fasceMattina: false, fascePranzo: false, fascePomeriggio: false,
    fasceSera: false, fasceNotte: false,
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
    const time = typeof r.time === 'string' ? r.time.trim() : '';
    if (!/^\d{1,2}:\d{2}$/.test(time)) continue;
    const num = Math.max(1, Math.round(Number(r.quantityNumerator) || 1));
    const den = Math.max(1, Math.round(Number(r.quantityDenominator) || 1));
    const unit = typeof r.administrationUnit === 'string' && r.administrationUnit.trim()
      ? r.administrationUnit.trim() : 'compressa';
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
