import { normalizza, nucleoNome } from './normalizza.js';

export class FarmaciQueryError extends Error {}
export interface Strength {
  value: number;
  unit: string | null;
  end?: number;
  perValue?: number;
  perUnit?: string;
}
export interface DrugQuery {
  name: string;
  strength: Strength | null;
  form: string | null;
  modifiers: string[];
  aic?: string;
}
const UNIT =
  'MICROGRAMMI|MICROGRAMMO|MILLIGRAMMI|MILLIGRAMMO|MILLILITRI|MILLILITRO|GRAMMI|GRAMMO|MCG|UG|MG|ML|MEQ|UI|G|%';
const NUMBER = '\\d+(?:[.,]\\d+)?';
const strengthPattern = () =>
  new RegExp(
    `(?<![A-Z0-9.,/])(${NUMBER})(?:\\s*[-–]\\s*(${NUMBER}))?\\s*(${UNIT})(?![A-Z])(?:\\s*/\\s*(${NUMBER})?\\s*(${UNIT})(?![A-Z]))?`,
    'gi',
  );
const unit = (value: string) => {
  const v = value.toUpperCase();
  if (['MICROGRAMMI', 'MICROGRAMMO', 'UG', 'MCG'].includes(v)) return 'MCG';
  if (['MILLIGRAMMI', 'MILLIGRAMMO', 'MG'].includes(v)) return 'MG';
  if (['GRAMMI', 'GRAMMO', 'G'].includes(v)) return 'G';
  if (['MILLILITRI', 'MILLILITRO', 'ML'].includes(v)) return 'ML';
  return v;
};
const number = (v: string) => Number(v.replace(',', '.'));
const FORM_PATTERNS: Array<[string, RegExp]> = [
  ['tablet', /\b(?:COMPRESSE|COMPRESSA|CPR|CP)\b/g],
  ['capsule', /\b(?:CAPSULE|CAPSULA|CPS|CAPS)\b/g],
  ['sachet', /\b(?:BUSTINE|BUSTINA|BST)\b/g],
  ['suppository', /\b(?:SUPPOSTE|SUPPOSTA)\b/g],
  ['patch', /\b(?:CEROTTI|CEROTTO)\b/g],
  ['drops', /\b(?:GOCCE|GOCCIA|GTT)\b/g],
  ['syrup', /\bSCIROPPO\b/g],
  ['cream', /\b(?:CREMA|POMATA)\b/g],
  ['solution', /\b(?:SOLUZIONE|SOLUZIONI)\b/g],
  ['vial', /\b(?:FIALE|FIALA)\b/g],
];
const MODIFIERS: Array<[string, RegExp]> = [
  ['effervescent', /\bEFFERVESCENT[EI]\b/g],
  ['orodispersible', /\bORODISPERSIBIL[EI]\b/g],
  ['gastroresistant', /\bGASTRORESISTENT[EI]\b/g],
  ['modified-release', /\b(?:RILASCIO\s+(?:PROLUNGATO|MODIFICATO)|RETARD)\b/g],
];

/** Strength syntax is kept exact: 20 mg/ml is never treated as 20 mg or 20 mcg. */
export function strengthsIn(text: string): Strength[] {
  return [...text.matchAll(strengthPattern())].map((m) => ({
    value: number(m[1]),
    unit: unit(m[3]),
    ...(m[2] ? { end: number(m[2]) } : {}),
    ...(m[5] ? { perValue: m[4] ? number(m[4]) : 1, perUnit: unit(m[5]) } : {}),
  }));
}
function formParts(text: string) {
  // Keep decimal punctuation until a bare strength has been parsed.
  let rest = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9.,]+/g, ' ')
    .replace(/(\d)(?=COMPRESS|CAPSUL|CPR\b|CPS\b|BUSTIN)/g, '$1 ');
  let form: string | null = null;
  const modifiers: string[] = [];
  for (const [key, pattern] of FORM_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(rest)) {
      form ??= key;
      rest = rest.replace(pattern, ' ');
    }
  }
  for (const [key, pattern] of MODIFIERS) {
    pattern.lastIndex = 0;
    if (pattern.test(rest)) {
      modifiers.push(key);
      rest = rest.replace(pattern, ' ');
    }
  }
  return { form, modifiers, rest: rest.replace(/\s+/g, ' ').trim() };
}

function bareSuffix(text: string) {
  return /^(.*?)\s+(\d+(?:[.,]\d+)?)$/.exec(text) ?? /^(.*?[A-Z])(\d+(?:[.,]\d+)?)$/.exec(text);
}

/** Narrow registry probes, only needed to distinguish a numeric brand from a bare dose. */
export function queryNameHints(text: string) {
  const rest = formParts(text).rest;
  const suffix = bareSuffix(rest);
  return suffix ? { full: normalizza(rest), base: normalizza(suffix[1]) } : null;
}

/** Query-only parsing. Persisted nucleoNome/import normalization must remain unchanged. */
export function parseDrugQuery(
  text: string,
  knownNames: ReadonlySet<string> = new Set(),
): DrugQuery {
  const raw = text.trim();
  if (/^\d{9}$/.test(raw))
    return { name: raw, aic: raw, strength: null, form: null, modifiers: [] };
  const parts = formParts(raw);
  // Split an attached strength only when followed by a unit, preserving B12/COVID19.
  const separated = raw.replace(
    new RegExp(
      `([A-Za-z])(?=${NUMBER}(?:\\s*[-–]\\s*${NUMBER})?\\s*(?:${UNIT})(?![A-Za-z]))`,
      'gi',
    ),
    '$1 ',
  );
  const explicit = strengthsIn(separated);
  // Registered brand digits win over a bare suffix, but never erase an explicit unit.
  if (!explicit.length && knownNames.has(normalizza(parts.rest)))
    return {
      name: nucleoNome(parts.rest),
      strength: null,
      form: parts.form,
      modifiers: parts.modifiers,
    };
  if (explicit.length > 1)
    throw new FarmaciQueryError(
      'Indica un solo dosaggio o una concentrazione completa per la ricerca.',
    );
  let name: string;
  let strength = explicit[0] ?? null;
  if (strength) {
    name = formParts(separated.replace(strengthPattern(), ' ')).rest;
  } else {
    const suffix = bareSuffix(parts.rest);
    // Only a registered base makes a bare/attached number an intentional strength.
    if (suffix && (/\s+\d/.test(parts.rest) || knownNames.has(normalizza(suffix[1])))) {
      name = suffix[1];
      strength = { value: number(suffix[2]), unit: null };
    } else name = parts.rest;
  }
  return { name: nucleoNome(name), strength, form: parts.form, modifiers: parts.modifiers };
}

export interface PackageEvidence {
  denominazione: string;
  descrizione: string | null;
  forma: string | null;
  principiAttivi: Array<{ quantita: number | null; unitaMisura: string | null }>;
}
function sameStrength(wanted: Strength, found: Strength) {
  return (
    wanted.value === found.value &&
    (wanted.unit === null || wanted.unit === found.unit) &&
    wanted.end === found.end &&
    wanted.perUnit === found.perUnit &&
    wanted.perValue === found.perValue
  );
}
export function packageMatches(query: DrugQuery, row: PackageEvidence): boolean {
  if (query.strength) {
    const named = strengthsIn(row.denominazione);
    const packaged = strengthsIn(row.descrizione ?? '');
    // A package volume (20 ml) cannot hide a strength (5 mg/ml) in the name.
    // For a shared numerator unit, the package description is the more specific source.
    const described = [
      ...packaged,
      ...named.filter((value) => !packaged.some((other) => other.unit === value.unit)),
    ];
    // Explicit packaging evidence wins; PA amounts alone cannot disambiguate concentrations.
    const evidence = described.length
      ? described
      : row.principiAttivi.flatMap((p) =>
          p.quantita !== null && p.unitaMisura
            ? [{ value: p.quantita, unit: unit(p.unitaMisura) }]
            : [],
        );
    if (!evidence.some((found) => sameStrength(query.strength!, found))) return false;
  }
  if (query.form || query.modifiers.length) {
    const parts = formParts(`${row.forma ?? ''} ${row.descrizione ?? ''}`);
    if (query.form && query.form !== parts.form) return false;
    // Ordinary tablets do not silently include effervescent/modified-release formulations.
    if (query.modifiers.join('|') !== parts.modifiers.join('|')) return false;
  }
  return true;
}

export function parseSearchInput(q: unknown, limit: unknown, cursor: unknown) {
  if (typeof q !== 'string' || !q.trim() || q.trim().length > 80)
    throw new FarmaciQueryError('Parametro q obbligatorio, massimo 80 caratteri');
  const size =
    limit === undefined
      ? 8
      : typeof limit === 'number'
        ? limit
        : typeof limit === 'string' && /^\d+$/.test(limit)
          ? Number(limit)
          : NaN;
  if (!Number.isInteger(size) || size < 1 || size > 25)
    throw new FarmaciQueryError('Limite non valido: scegliere da 1 a 25 risultati');
  if (cursor !== undefined && (typeof cursor !== 'string' || !cursor || cursor.length > 2048))
    throw new FarmaciQueryError('Cursore non valido');
  return { q: q.trim(), limit: size, cursor: cursor as string | undefined };
}
