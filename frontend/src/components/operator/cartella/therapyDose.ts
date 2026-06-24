// REQ-093 (BUG-055): exact-fraction dosing helpers (frontend mirror of backend lib/therapy-dose).
// Fractions are kept EXACT; mg equivalents are derived for display only.

export interface ScheduleRow {
  time: string;                 // "HH:MM"
  quantityNumerator: number;
  quantityDenominator: number;
  administrationUnit: string;
}

// Quick fraction presets the operator can offer (value = num/den, label for the chip).
export const FRACTION_PRESETS: { key: string; label: string; num: number; den: number }[] = [
  { key: '1',   label: '1',   num: 1, den: 1 },
  { key: '3/4', label: '¾',   num: 3, den: 4 },
  { key: '1/2', label: '½',   num: 1, den: 2 },
  { key: '1/3', label: '⅓',   num: 1, den: 3 },
  { key: '1/4', label: '¼',   num: 1, den: 4 },
];

// Administration units. Solid divisible forms support fractions; liquids/counts are whole amounts.
export const ADMIN_UNITS = ['compressa', 'capsula', 'ml', 'gocce', 'unità', 'bustina', 'fiala', 'puff'];
export const DIVISIBLE_UNITS = new Set(['compressa']); // tablet is the only inherently splittable form

export const PHARMA_FORMS = ['compressa', 'capsula', 'sciroppo', 'fiala', 'flacone', 'bustina', 'gocce', 'cerotto', 'crema'];
export const STRENGTH_UNITS = ['mg', 'g', 'mcg', 'ml', 'UI', '%'];

function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a || 1;
}

export function normalizeFraction(num: number, den: number): { num: number; den: number } {
  let n = Math.round(num);
  let d = Math.round(den) || 1;
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d);
  return { num: n / g, den: d / g };
}

/** "1", "3/4", "1/2", "5" (for 5/1). */
export function formatFraction(num: number, den: number): string {
  const { num: n, den: d } = normalizeFraction(num, den);
  if (d === 1) return String(n);
  return `${n}/${d}`;
}

/** Parse free text like "1/3", "0.5", "2" into an exact fraction (no decimal storage). */
export function parseQuantity(text: string): { num: number; den: number } | null {
  const t = (text || '').trim().replace(',', '.');
  if (!t) return null;
  const frac = /^(\d+)\s*\/\s*(\d+)$/.exec(t);
  if (frac) {
    const n = parseInt(frac[1], 10);
    const d = parseInt(frac[2], 10);
    if (d === 0) return null;
    return normalizeFraction(n, d);
  }
  const num = Number(t);
  if (!Number.isFinite(num) || num <= 0) return null;
  // Convert a decimal to an exact fraction over a power of ten, then reduce.
  if (Number.isInteger(num)) return { num, den: 1 };
  const decimals = (t.split('.')[1] || '').length;
  const den = Math.pow(10, decimals);
  return normalizeFraction(Math.round(num * den), den);
}

/** mg (or strength-unit) equivalent for a fraction of the commercial strength. */
export function computeEquivalent(
  num: number, den: number,
  strengthValue?: number | null, strengthUnit?: string | null,
): string | null {
  if (strengthValue == null || !(strengthValue > 0) || !strengthUnit) return null;
  const mg = (num / (den || 1)) * strengthValue;
  const rounded = Math.round(mg * 100) / 100;
  return `${Number.isInteger(mg) ? '' : '≈ '}${rounded} ${strengthUnit}`;
}

/** "08:00 — 1/2 compressa — equivalente a 50 mg" */
export function scheduleLabel(
  s: ScheduleRow,
  strengthValue?: number | null, strengthUnit?: string | null,
): string {
  const frac = formatFraction(s.quantityNumerator, s.quantityDenominator);
  let label = `${s.time} — ${frac} ${s.administrationUnit}`;
  const eq = computeEquivalent(s.quantityNumerator, s.quantityDenominator, strengthValue, strengthUnit);
  if (eq) label += ` — equivalente a ${eq}`;
  return label;
}

/** Parse the configurable allowedFractions string ("1,1/2,1/4") into preset keys. Default: whole only. */
export function parseAllowedFractions(raw?: string | null): Set<string> {
  if (!raw || !raw.trim()) return new Set(['1']);
  return new Set(raw.split(',').map(s => s.trim()).filter(Boolean));
}
