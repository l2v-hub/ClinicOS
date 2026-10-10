import { parseDischargeTherapy } from './parse-discharge-therapy.js';
import { canonical, hash, object, type Json } from '../ai/upload/pages/model.js';

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const norm = (value: unknown) => text(value).toLowerCase().replace(/\s+/g, ' ');
const meaningful = (value: unknown): boolean => {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'string') return !!value.trim();
  if (Array.isArray(value)) return value.some(meaningful);
  if (typeof value === 'object') return Object.values(object(value)).some(meaningful);
  return true;
};

/** Conservative exact-field agreement only. No clinical synonym/frequency inference. */
export function representsStructuredItem(row: Json, item: Json): boolean {
  if (!norm(item.nome) || norm(item.nome) !== norm(row.farmacoNome)) return false;
  const fields: Json = {
    nome: row.farmacoNome,
    dose: row.dosaggio,
    frequenza: Array.isArray(row.orari) ? row.orari.join(', ') : '',
    via: row.viaSomministrazione,
  };
  return Object.entries(item).every(
    ([key, value]) =>
      !meaningful(value) ||
      (typeof value === 'string' &&
        Object.hasOwn(fields, key) &&
        norm(value) === norm(fields[key])),
  );
}

/**
 * Every meaningful extraction occurrence is accounted for. Unmatched model objects are
 * review candidates, NEVER newly inferred prescriptions or manufactured verbatim text.
 */
export function therapySourceInventory(therapyText: string, extracted: unknown): Json[] {
  const occurrences = new Map<string, number>();
  const keyFor = (kind: string, value: unknown) => {
    const signature = hash([kind, value]);
    const ordinal = occurrences.get(signature) ?? 0;
    occurrences.set(signature, ordinal + 1);
    return hash([signature, ordinal]);
  };
  const rows: Json[] = parseDischargeTherapy(therapyText).map((row) => ({
    ...row,
    importRowKey: keyFor('narrative', row.originalText),
  }));
  const covered = new Set<number>();
  for (const value of Array.isArray(extracted) ? extracted : []) {
    if (!meaningful(value)) continue;
    const item = object(value);
    const importRowKey = keyFor('structured', value);
    const matches = rows.flatMap((row, index) =>
      !row.sourceKind && !covered.has(index) && representsStructuredItem(row, item) ? [index] : [],
    );
    if (matches.length === 1) {
      // One extraction occurrence can cover only one narrative occurrence.
      covered.add(matches[0]);
      rows[matches[0]] = {
        ...rows[matches[0]],
        importRowKey: hash([rows[matches[0]].importRowKey, value, importRowKey]),
        structuredSource: structuredClone(value),
        structuredOccurrenceKey: importRowKey,
      };
      continue;
    }
    rows.push({
      farmacoNome: text(item.nome),
      forma: '',
      dosaggio: '',
      viaSomministrazione: '',
      quantita: '',
      orari: [],
      giorni: [],
      dataInizio: '',
      classe: '',
      note: '',
      originalText: '',
      stato: 'da_verificare',
      sourceKind: 'structured',
      structuredSource: structuredClone(value),
      importRowKey,
    });
  }
  return rows;
}

/** Keys are server-owned and independent of editable clinical fields or group order. */
export function sameTherapySource(left: Json, right: Json): boolean {
  if (left.importRowKey && right.importRowKey) return left.importRowKey === right.importRowKey;
  if (left.sourceKind === 'structured' || right.sourceKind === 'structured') return false;
  return (
    typeof left.originalText === 'string' &&
    !!left.originalText &&
    left.originalText === right.originalText
  );
}

export function exactStructuredVariant(row: Json, value: unknown): boolean {
  return row.structuredSource !== undefined && canonical(row.structuredSource) === canonical(value);
}

/** Reopen unconfirmed legacy drafts with all retained source occurrences, preserving reviews.
 * Page sessions have their own versioned reconciliation and must not use this path.
 * Pure/read-only: missing rows remain unverified until the operator explicitly saves a review.
 */
export function reconcileLegacyTherapyInventory(data: Json, result: unknown): Json {
  const source = object(result);
  if (data._importSource || Array.isArray(source._groups)) return data;
  const narrative = object(source._narrative);
  const expected = therapySourceInventory(
    text(narrative.therapyText),
    object(object(source._full ?? source).cartella).farmaci,
  );
  const held = Array.isArray(data.terapiaImport) ? data.terapiaImport.map(object) : [];
  const used = new Set<number>();
  const missing: Json[] = [];
  for (const row of expected) {
    const index = held.findIndex((saved, i) => !used.has(i) && sameTherapySource(saved, row));
    if (index >= 0) used.add(index);
    else missing.push(row);
  }
  return missing.length ? { ...data, terapiaImport: [...held, ...missing] } : data;
}
