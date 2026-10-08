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

export class InvalidDoseProtocolError extends Error {
  constructor(message = 'Schema glicemico non valido') {
    super(message);
    this.name = 'InvalidDoseProtocolError';
  }
}

const MAX_RULES = 32;
const MIN_GLUCOSE = 10;
const MAX_GLUCOSE = 1000;
const MAX_UNITS = 1000;

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

/**
 * Validate and canonicalize a conditional insulin protocol.
 * Gaps are intentionally allowed: an incomplete prescription must stay incomplete and will block
 * administration for an uncovered measurement instead of inventing a clinical dose.
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
    (value.doseUnit !== undefined && value.doseUnit !== 'unità')
  ) {
    throw new InvalidDoseProtocolError('Unità dello schema glicemico non supportate');
  }
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
    if (units === null || units < 0 || units > MAX_UNITS || !Number.isInteger(units * 2)) {
      throw new InvalidDoseProtocolError(`Unità non valide nella fascia ${index + 1}`);
    }
    return { minMgDl: min, maxMgDl: max, units };
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
    doseUnit: 'unità',
    rules,
  };
}

export function doseForGlucose(protocol: GlucoseScaleProtocol, glucoseMgDl: number): number | null {
  if (!Number.isInteger(glucoseMgDl) || glucoseMgDl < MIN_GLUCOSE || glucoseMgDl > MAX_GLUCOSE)
    return null;
  const match = protocol.rules.find(
    (rule) => glucoseMgDl >= rule.minMgDl && (rule.maxMgDl === null || glucoseMgDl <= rule.maxMgDl),
  );
  return match?.units ?? null;
}
