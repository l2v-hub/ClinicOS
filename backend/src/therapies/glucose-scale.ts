/** Unit of the scale's primary dose: subcutaneous units, or an infusion-pump rate. */
export type GlucoseScaleDoseUnit = 'unità' | 'ml/h';
export const GLUCOSE_SCALE_DOSE_UNITS: readonly GlucoseScaleDoseUnit[] = ['unità', 'ml/h'];

/** A further dose given in the same band ("+ bolo 5 U e.v."), shown next to the primary dose. */
export type GlucoseExtraDose = {
  amount: number;
  unit: GlucoseScaleDoseUnit;
  route?: string;
  label?: string;
};

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

export class InvalidDoseProtocolError extends Error {
  constructor(message = 'Schema glicemico non valido') {
    super(message);
    this.name = 'InvalidDoseProtocolError';
  }
}

const MAX_RULES = 32;
const MAX_EXTRA_DOSES = 4;
const MIN_GLUCOSE = 10;
const MAX_GLUCOSE = 1000;
const MAX_UNITS = 1000;
const MAX_TEXT = 40;

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

const validAmount = (value: number | null): value is number =>
  value !== null && value >= 0 && value <= MAX_UNITS && Number.isInteger(value * 2);

function optionalText(value: unknown, label: string, index: number): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.trim().length > MAX_TEXT) {
    throw new InvalidDoseProtocolError(`${label} non valida nella fascia ${index + 1}`);
  }
  return value.trim() || undefined;
}

function normalizeExtraDoses(raw: unknown, index: number): GlucoseExtraDose[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw) || raw.length > MAX_EXTRA_DOSES) {
    throw new InvalidDoseProtocolError(`Dosi aggiuntive non valide nella fascia ${index + 1}`);
  }
  const doses = raw.map((item): GlucoseExtraDose => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new InvalidDoseProtocolError(`Dose aggiuntiva non valida nella fascia ${index + 1}`);
    }
    const dose = item as Record<string, unknown>;
    const amount = finiteNumber(dose.amount);
    if (!validAmount(amount) || amount === 0) {
      throw new InvalidDoseProtocolError(`Dose aggiuntiva non valida nella fascia ${index + 1}`);
    }
    if (!GLUCOSE_SCALE_DOSE_UNITS.includes(dose.unit as GlucoseScaleDoseUnit)) {
      throw new InvalidDoseProtocolError(
        `Unità della dose aggiuntiva non valida nella fascia ${index + 1}`,
      );
    }
    const route = optionalText(dose.route, 'Via della dose aggiuntiva', index);
    const label = optionalText(dose.label, 'Descrizione della dose aggiuntiva', index);
    return {
      amount,
      unit: dose.unit as GlucoseScaleDoseUnit,
      ...(route ? { route } : {}),
      ...(label ? { label } : {}),
    };
  });
  return doses.length ? doses : undefined;
}

/**
 * Validate and canonicalize a conditional insulin protocol.
 * Gaps are intentionally allowed: an incomplete prescription must stay incomplete and will block
 * administration for an uncovered measurement instead of inventing a clinical dose.
 * Overlaps are refused: one measurement must map to exactly one prescribed dose.
 */
export function normalizeGlucoseScaleProtocol(raw: unknown): GlucoseScaleProtocol {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new InvalidDoseProtocolError();
  }
  const value = raw as Record<string, unknown>;
  if (value.kind !== 'blood_glucose') {
    throw new InvalidDoseProtocolError('Tipo di schema dose non supportato');
  }
  if (
    (value.measurementUnit !== undefined && value.measurementUnit !== 'mg/dL') ||
    (value.doseUnit !== undefined &&
      !GLUCOSE_SCALE_DOSE_UNITS.includes(value.doseUnit as GlucoseScaleDoseUnit))
  ) {
    throw new InvalidDoseProtocolError('Unità dello schema glicemico non supportate');
  }
  // Protocols saved before ml/h existed carry no unit or 'unità'.
  const doseUnit = (value.doseUnit as GlucoseScaleDoseUnit | undefined) ?? 'unità';
  if (!Array.isArray(value.rules) || value.rules.length === 0) {
    throw new InvalidDoseProtocolError('Aggiungi almeno una fascia glicemica');
  }
  if (value.rules.length > MAX_RULES) {
    throw new InvalidDoseProtocolError(`Sono consentite al massimo ${MAX_RULES} fasce glicemiche`);
  }

  const rules = value.rules.map((item, index): GlucoseDoseRule => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new InvalidDoseProtocolError(`Fascia ${index + 1} non valida`);
    }
    const row = item as Record<string, unknown>;
    const min = finiteNumber(row.minMgDl);
    const max = row.maxMgDl === null || row.maxMgDl === '' ? null : finiteNumber(row.maxMgDl);
    if (max === null && row.maxMgDl !== null && row.maxMgDl !== '') {
      throw new InvalidDoseProtocolError(`Glicemia massima non valida nella fascia ${index + 1}`);
    }
    const units = finiteNumber(row.units);
    if (min === null || !Number.isInteger(min) || min < MIN_GLUCOSE || min > MAX_GLUCOSE) {
      throw new InvalidDoseProtocolError(`Glicemia minima non valida nella fascia ${index + 1}`);
    }
    if (max !== null && (!Number.isInteger(max) || max < min || max > MAX_GLUCOSE)) {
      throw new InvalidDoseProtocolError(`Glicemia massima non valida nella fascia ${index + 1}`);
    }
    if (!validAmount(units)) {
      throw new InvalidDoseProtocolError(`Unità non valide nella fascia ${index + 1}`);
    }
    const extraDoses = normalizeExtraDoses(row.extraDoses, index);
    return { minMgDl: min, maxMgDl: max, units, ...(extraDoses ? { extraDoses } : {}) };
  });

  rules.sort((a, b) => a.minMgDl - b.minMgDl || (a.maxMgDl ?? Infinity) - (b.maxMgDl ?? Infinity));
  for (let i = 1; i < rules.length; i++) {
    const previous = rules[i - 1]!;
    const current = rules[i]!;
    if (previous.maxMgDl === null || current.minMgDl <= previous.maxMgDl) {
      throw new InvalidDoseProtocolError('Le fasce glicemiche non possono sovrapporsi');
    }
  }

  return {
    kind: 'blood_glucose',
    measurementUnit: 'mg/dL',
    doseUnit,
    rules,
  };
}

export function ruleForGlucose(
  protocol: GlucoseScaleProtocol,
  glucoseMgDl: number,
): GlucoseDoseRule | null {
  if (!Number.isInteger(glucoseMgDl) || glucoseMgDl < MIN_GLUCOSE || glucoseMgDl > MAX_GLUCOSE)
    return null;
  return (
    protocol.rules.find(
      (rule) =>
        glucoseMgDl >= rule.minMgDl && (rule.maxMgDl === null || glucoseMgDl <= rule.maxMgDl),
    ) ?? null
  );
}

export function doseForGlucose(protocol: GlucoseScaleProtocol, glucoseMgDl: number): number | null {
  return ruleForGlucose(protocol, glucoseMgDl)?.units ?? null;
}

/** "5 unità EV (bolo)" — the wording the administration record and the UI show. */
export function extraDoseLabel(dose: GlucoseExtraDose): string {
  return [`${dose.amount} ${dose.unit}`, dose.route ?? '', dose.label ? `(${dose.label})` : '']
    .filter(Boolean)
    .join(' ');
}

export type GlucoseScaleWarning =
  | { kind: 'overlap'; fromMgDl: number; toMgDl: number | null }
  | { kind: 'gap'; fromMgDl: number; toMgDl: number }
  | { kind: 'implausible'; valueMgDl: number };

/** Below this a number is unlikely to be a reference glucose (OCR "11-120" for "111-120"). */
export const MIN_PLAUSIBLE_GLUCOSE = 40;

/**
 * What an operator must look at in a scale written as-is from a document. Never corrects it:
 * overlaps block confirmation (normalize refuses them), gaps block administration of an uncovered
 * value, implausible values are flagged for the operator to read against the original.
 */
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
  const sorted = [...rules].sort(
    (a, b) => a.minMgDl - b.minMgDl || (a.maxMgDl ?? Infinity) - (b.maxMgDl ?? Infinity),
  );
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
