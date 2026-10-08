export interface GlucoseDoseRuleForm {
  minMgDl: string;
  maxMgDl: string;
  units: string;
}

export interface GlucoseDoseRule {
  minMgDl: number;
  maxMgDl: number | null;
  units: number;
}

export interface GlucoseScaleProtocol {
  kind: 'blood_glucose';
  measurementUnit: 'mg/dL';
  doseUnit: 'unità';
  rules: GlucoseDoseRule[];
}

export function validateGlucoseScaleRows(rows: GlucoseDoseRuleForm[]): {
  errors: string[];
  protocol: GlucoseScaleProtocol | null;
} {
  if (rows.length === 0)
    return { errors: ['Aggiungi almeno una fascia glicemica.'], protocol: null };
  if (rows.length > 32)
    return { errors: ['Sono consentite al massimo 32 fasce glicemiche.'], protocol: null };
  const errors: string[] = [];
  const rules: GlucoseDoseRule[] = [];
  rows.forEach((row, index) => {
    const min = Number(row.minMgDl);
    const max = row.maxMgDl.trim() === '' ? null : Number(row.maxMgDl);
    const units = Number(row.units);
    if (!row.minMgDl.trim() || !Number.isInteger(min) || min < 10 || min > 1000) {
      errors.push(`Fascia ${index + 1}: glicemia minima non valida.`);
    }
    if (max !== null && (!Number.isInteger(max) || max < min || max > 1000)) {
      errors.push(`Fascia ${index + 1}: glicemia massima non valida.`);
    }
    if (
      !row.units.trim() ||
      !Number.isFinite(units) ||
      units < 0 ||
      units > 1000 ||
      !Number.isInteger(units * 2)
    ) {
      errors.push(`Fascia ${index + 1}: dose in unità non valida.`);
    }
    if (!errors.some((error) => error.startsWith(`Fascia ${index + 1}:`))) {
      rules.push({ minMgDl: min, maxMgDl: max, units });
    }
  });
  const sorted = [...rules].sort((a, b) => a.minMgDl - b.minMgDl);
  for (let index = 1; index < sorted.length; index++) {
    const previous = sorted[index - 1]!;
    const current = sorted[index]!;
    if (previous.maxMgDl === null || current.minMgDl <= previous.maxMgDl) {
      errors.push('Le fasce glicemiche non possono sovrapporsi.');
      break;
    }
  }
  if (errors.length) return { errors, protocol: null };
  return {
    errors: [],
    protocol: {
      kind: 'blood_glucose',
      measurementUnit: 'mg/dL',
      doseUnit: 'unità',
      rules: sorted,
    },
  };
}

export function glucoseScaleRows(raw: unknown): GlucoseDoseRuleForm[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  const rules = (raw as { rules?: unknown }).rules;
  if (!Array.isArray(rules)) return [];
  return rules.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    return [
      {
        minMgDl: String(row.minMgDl ?? ''),
        maxMgDl: row.maxMgDl == null ? '' : String(row.maxMgDl),
        units: String(row.units ?? ''),
      },
    ];
  });
}

export function doseForGlucose(raw: unknown, glucoseMgDl: number): number | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const metadata = raw as Record<string, unknown>;
  if (
    metadata.kind !== 'blood_glucose' ||
    metadata.measurementUnit !== 'mg/dL' ||
    metadata.doseUnit !== 'unità'
  )
    return null;
  const rows = glucoseScaleRows(raw);
  const { protocol } = validateGlucoseScaleRows(rows);
  if (!protocol || !Number.isInteger(glucoseMgDl) || glucoseMgDl < 10 || glucoseMgDl > 1000)
    return null;
  const rule = protocol.rules.find(
    (candidate) =>
      glucoseMgDl >= candidate.minMgDl &&
      (candidate.maxMgDl === null || glucoseMgDl <= candidate.maxMgDl),
  );
  return rule?.units ?? null;
}
