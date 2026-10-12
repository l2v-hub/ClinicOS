/** Unit of the scale's primary dose: subcutaneous units, or an infusion-pump rate. */
export type GlucoseScaleDoseUnit = 'unità' | 'ml/h';
export const GLUCOSE_SCALE_DOSE_UNITS: readonly GlucoseScaleDoseUnit[] = ['unità', 'ml/h'];

export interface GlucoseExtraDoseForm {
  amount: string;
  unit: GlucoseScaleDoseUnit;
  route: string;
  label: string;
}

export interface GlucoseDoseRuleForm {
  minMgDl: string;
  maxMgDl: string;
  units: string;
  extraDoses?: GlucoseExtraDoseForm[];
}

/** A further dose given in the same band ("+ bolo 5 U e.v."), shown next to the primary dose. */
export interface GlucoseExtraDose {
  amount: number;
  unit: GlucoseScaleDoseUnit;
  route?: string;
  label?: string;
}

export interface GlucoseDoseRule {
  minMgDl: number;
  maxMgDl: number | null;
  /** Primary dose, in the protocol's `doseUnit` (the field name predates ml/h). */
  units: number;
  extraDoses?: GlucoseExtraDose[];
}

export interface GlucoseScaleProtocol {
  kind: 'blood_glucose';
  measurementUnit: 'mg/dL';
  doseUnit: GlucoseScaleDoseUnit;
  rules: GlucoseDoseRule[];
}

const MAX_RULES = 32;
export const MAX_EXTRA_DOSES = 4;
const MIN_GLUCOSE = 10;
const MAX_GLUCOSE = 1000;
const MAX_UNITS = 1000;
const MAX_TEXT = 40;

const isDoseUnit = (value: unknown): value is GlucoseScaleDoseUnit =>
  GLUCOSE_SCALE_DOSE_UNITS.includes(value as GlucoseScaleDoseUnit);

const validAmount = (value: number) =>
  Number.isFinite(value) && value >= 0 && value <= MAX_UNITS && Number.isInteger(value * 2);

const byRange = (
  a: Pick<GlucoseDoseRule, 'minMgDl' | 'maxMgDl'>,
  b: Pick<GlucoseDoseRule, 'minMgDl' | 'maxMgDl'>,
) => a.minMgDl - b.minMgDl || (a.maxMgDl ?? Infinity) - (b.maxMgDl ?? Infinity);

export function validateGlucoseScaleRows(
  rows: GlucoseDoseRuleForm[],
  doseUnit: GlucoseScaleDoseUnit = 'unità',
): {
  errors: string[];
  protocol: GlucoseScaleProtocol | null;
} {
  if (rows.length === 0)
    return { errors: ['Aggiungi almeno una fascia glicemica.'], protocol: null };
  if (rows.length > MAX_RULES)
    return { errors: ['Sono consentite al massimo 32 fasce glicemiche.'], protocol: null };
  if (!isDoseUnit(doseUnit))
    return { errors: ['Unità dello schema glicemico non supportata.'], protocol: null };
  const errors: string[] = [];
  const rules: GlucoseDoseRule[] = [];
  rows.forEach((row, index) => {
    const prefix = `Fascia ${index + 1}:`;
    const before = errors.length;
    const min = Number(row.minMgDl);
    const max = row.maxMgDl.trim() === '' ? null : Number(row.maxMgDl);
    const units = Number(row.units);
    if (!row.minMgDl.trim() || !Number.isInteger(min) || min < MIN_GLUCOSE || min > MAX_GLUCOSE) {
      errors.push(`${prefix} glicemia minima non valida.`);
    }
    if (max !== null && (!Number.isInteger(max) || max < min || max > MAX_GLUCOSE)) {
      errors.push(`${prefix} glicemia massima non valida.`);
    }
    if (!row.units.trim() || !validAmount(units)) {
      errors.push(
        doseUnit === 'ml/h'
          ? `${prefix} velocità in ml/h non valida.`
          : `${prefix} dose in unità non valida.`,
      );
    }
    const extras = row.extraDoses ?? [];
    if (extras.length > MAX_EXTRA_DOSES)
      errors.push(`${prefix} al massimo ${MAX_EXTRA_DOSES} dosi aggiuntive.`);
    const extraDoses: GlucoseExtraDose[] = [];
    extras.forEach((extra, extraIndex) => {
      const amount = Number(extra.amount);
      const route = extra.route.trim();
      const label = extra.label.trim();
      if (
        !extra.amount.trim() ||
        !validAmount(amount) ||
        amount === 0 ||
        !isDoseUnit(extra.unit) ||
        route.length > MAX_TEXT ||
        label.length > MAX_TEXT
      ) {
        errors.push(`${prefix} dose aggiuntiva ${extraIndex + 1} non valida.`);
        return;
      }
      extraDoses.push({
        amount,
        unit: extra.unit,
        ...(route ? { route } : {}),
        ...(label ? { label } : {}),
      });
    });
    if (errors.length === before) {
      rules.push({
        minMgDl: min,
        maxMgDl: max,
        units,
        ...(extraDoses.length ? { extraDoses } : {}),
      });
    }
  });
  const sorted = [...rules].sort(byRange);
  const overlaps = glucoseScaleWarnings(sorted).filter((warning) => warning.kind === 'overlap');
  if (overlaps.length) {
    errors.push('Le fasce glicemiche non possono sovrapporsi.');
    overlaps.forEach((warning) => errors.push(`${glucoseScaleWarningText(warning)}.`));
  }
  if (errors.length) return { errors, protocol: null };
  return {
    errors: [],
    protocol: {
      kind: 'blood_glucose',
      measurementUnit: 'mg/dL',
      doseUnit,
      rules: sorted,
    },
  };
}

function extraDosesFromRaw(raw: unknown): GlucoseExtraDoseForm[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const doses = raw.flatMap((item): GlucoseExtraDoseForm[] => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const dose = item as Record<string, unknown>;
    return [
      {
        amount: dose.amount == null ? '' : String(dose.amount),
        unit: isDoseUnit(dose.unit) ? dose.unit : 'unità',
        route: typeof dose.route === 'string' ? dose.route : '',
        label: typeof dose.label === 'string' ? dose.label : '',
      },
    ];
  });
  return doses.length ? doses : undefined;
}

/** Form rows from a bare rule list (import draft rows, protocol.rules). */
export function glucoseScaleFormRows(rules: unknown): GlucoseDoseRuleForm[] {
  if (!Array.isArray(rules)) return [];
  return rules.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const extraDoses = extraDosesFromRaw(row.extraDoses);
    return [
      {
        minMgDl: String(row.minMgDl ?? ''),
        maxMgDl: row.maxMgDl == null ? '' : String(row.maxMgDl),
        units: String(row.units ?? ''),
        ...(extraDoses ? { extraDoses } : {}),
      },
    ];
  });
}

export function glucoseScaleRows(raw: unknown): GlucoseDoseRuleForm[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  return glucoseScaleFormRows((raw as { rules?: unknown }).rules);
}

/** Protocols saved before ml/h existed carry no unit: they are subcutaneous units. */
export function glucoseScaleDoseUnit(raw: unknown): GlucoseScaleDoseUnit {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'unità';
  const unit = (raw as { doseUnit?: unknown }).doseUnit;
  return isDoseUnit(unit) ? unit : 'unità';
}

function validProtocol(raw: unknown): GlucoseScaleProtocol | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const metadata = raw as Record<string, unknown>;
  if (
    metadata.kind !== 'blood_glucose' ||
    metadata.measurementUnit !== 'mg/dL' ||
    (metadata.doseUnit !== undefined && !isDoseUnit(metadata.doseUnit))
  )
    return null;
  return validateGlucoseScaleRows(glucoseScaleRows(raw), glucoseScaleDoseUnit(raw)).protocol;
}

/** The whole band (primary dose and extra doses) prescribed for a measured glucose. */
export function ruleForGlucose(raw: unknown, glucoseMgDl: number): GlucoseDoseRule | null {
  const protocol = validProtocol(raw);
  if (
    !protocol ||
    !Number.isInteger(glucoseMgDl) ||
    glucoseMgDl < MIN_GLUCOSE ||
    glucoseMgDl > MAX_GLUCOSE
  )
    return null;
  return (
    protocol.rules.find(
      (candidate) =>
        glucoseMgDl >= candidate.minMgDl &&
        (candidate.maxMgDl === null || glucoseMgDl <= candidate.maxMgDl),
    ) ?? null
  );
}

export function doseForGlucose(raw: unknown, glucoseMgDl: number): number | null {
  return ruleForGlucose(raw, glucoseMgDl)?.units ?? null;
}

/** "5 unità EV (bolo)" — the wording the administration record and the UI show. */
export function extraDoseLabel(dose: GlucoseExtraDose): string {
  return [`${dose.amount} ${dose.unit}`, dose.route ?? '', dose.label ? `(${dose.label})` : '']
    .filter(Boolean)
    .join(' ');
}

/** "15 unità + 5 unità EV (bolo)": primary dose in the scale unit, then every extra dose. */
export function glucoseRuleDoseText(rule: GlucoseDoseRule, doseUnit: GlucoseScaleDoseUnit) {
  return [`${rule.units} ${doseUnit}`, ...(rule.extraDoses ?? []).map(extraDoseLabel)].join(' + ');
}

/** Summary line of a (possibly incomplete) form row: "251–300 mg/dL → 12 unità". */
export function glucoseRowLabel(row: GlucoseDoseRuleForm, doseUnit: GlucoseScaleDoseUnit) {
  const range = row.maxMgDl.trim()
    ? `${row.minMgDl || '?'}–${row.maxMgDl} mg/dL`
    : `≥${row.minMgDl || '?'} mg/dL`;
  const extras = (row.extraDoses ?? []).map((extra) =>
    [
      `${extra.amount || '?'} ${extra.unit}`,
      extra.route.trim(),
      extra.label.trim() ? `(${extra.label.trim()})` : '',
    ]
      .filter(Boolean)
      .join(' '),
  );
  return `${range} → ${[`${row.units || '?'} ${doseUnit}`, ...extras].join(' + ')}`;
}

export type GlucoseScaleWarning =
  | { kind: 'overlap'; fromMgDl: number; toMgDl: number | null }
  | { kind: 'gap'; fromMgDl: number; toMgDl: number }
  | { kind: 'implausible'; valueMgDl: number };

/** Below this a number is unlikely to be a reference glucose (OCR "11-120" for "111-120"). */
export const MIN_PLAUSIBLE_GLUCOSE = 40;

/** Mirror of the backend check: never corrects the scale, only says what to look at. */
export function glucoseScaleWarnings(
  rules: ReadonlyArray<Pick<GlucoseDoseRule, 'minMgDl' | 'maxMgDl'>>,
): GlucoseScaleWarning[] {
  const warnings: GlucoseScaleWarning[] = [];
  for (const rule of rules) {
    for (const value of [rule.minMgDl, rule.maxMgDl]) {
      // The open "< N" band starts at the domain floor, which is not a written value.
      if (value !== null && value !== MIN_GLUCOSE && value < MIN_PLAUSIBLE_GLUCOSE)
        warnings.push({ kind: 'implausible', valueMgDl: value });
    }
  }
  const sorted = [...rules].sort(byRange);
  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1]!;
    const current = sorted[i]!;
    if (previous.maxMgDl === null || current.minMgDl <= previous.maxMgDl) {
      const end =
        previous.maxMgDl === null
          ? current.maxMgDl
          : current.maxMgDl === null
            ? previous.maxMgDl
            : Math.min(previous.maxMgDl, current.maxMgDl);
      warnings.push({ kind: 'overlap', fromMgDl: current.minMgDl, toMgDl: end });
    } else if (current.minMgDl > previous.maxMgDl + 1) {
      warnings.push({ kind: 'gap', fromMgDl: previous.maxMgDl + 1, toMgDl: current.minMgDl - 1 });
    }
  }
  return warnings;
}

export function glucoseScaleWarningText(warning: GlucoseScaleWarning): string {
  switch (warning.kind) {
    case 'overlap':
      return warning.toMgDl === null || warning.toMgDl === warning.fromMgDl
        ? `Fasce sovrapposte a ${warning.fromMgDl} mg/dL: due dosi per la stessa glicemia`
        : `Fasce sovrapposte tra ${warning.fromMgDl} e ${warning.toMgDl} mg/dL: due dosi per la stessa glicemia`;
    case 'gap':
      return warning.fromMgDl === warning.toMgDl
        ? `Glicemia ${warning.fromMgDl} mg/dL non coperta dallo schema`
        : `Glicemia ${warning.fromMgDl}–${warning.toMgDl} mg/dL non coperta dallo schema`;
    case 'implausible':
      return `Valore ${warning.valueMgDl} mg/dL sospetto: confrontalo con il documento`;
  }
}

/**
 * Non-blocking warnings (gaps, implausible values) for the rows being edited. Overlaps are left
 * out: they are blocking errors of `validateGlucoseScaleRows`.
 */
export function glucoseScaleFormWarnings(rows: GlucoseDoseRuleForm[]): string[] {
  const ranges = rows.flatMap((row) => {
    const min = Number(row.minMgDl);
    const max = row.maxMgDl.trim() === '' ? null : Number(row.maxMgDl);
    if (!row.minMgDl.trim() || !Number.isInteger(min)) return [];
    if (max !== null && (!Number.isInteger(max) || max < min)) return [];
    return [{ minMgDl: min, maxMgDl: max }];
  });
  return glucoseScaleWarnings(ranges)
    .filter((warning) => warning.kind !== 'overlap')
    .map(glucoseScaleWarningText);
}
