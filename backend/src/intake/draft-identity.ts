// Una sola bozza d'ingresso per paziente: riconoscimento delle bozze doppie.
//
// Ogni sessione d'import crea la propria bozza (unica per `importJobId`), quindi lo stesso
// operatore può ritrovarsi due bozze dello stesso paziente (altro dispositivo, sessione scaduta).
// Qui c'è solo il riconoscimento: mai una fusione automatica di dati clinici fra bozze.
//
// SICUREZZA CLINICA: si raggruppa soltanto con un'identità FORTE — codice fiscale valido, oppure
// cognome + nome + data di nascita tutti presenti. Due omonimi senza data di nascita restano
// bozze distinte.

import { isValidCodiceFiscale, normalizeCodiceFiscale } from '../lib/codice-fiscale.js';

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Minuscole, senza accenti né punteggiatura, spazi singoli: «D'Angelo  Maria» = «dangelo maria». */
function normalizeName(value: unknown): string {
  return text(value)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Chiave d'identità forte della bozza, o null quando i dati non bastano a riconoscere il paziente. */
export function draftIdentityKey(data: unknown): string | null {
  const anagrafica =
    data && typeof data === 'object'
      ? ((data as Record<string, unknown>).anagrafica as Record<string, unknown> | undefined)
      : undefined;
  if (!anagrafica || typeof anagrafica !== 'object') return null;
  const fiscalCode = normalizeCodiceFiscale(text(anagrafica.codiceFiscale));
  if (fiscalCode && isValidCodiceFiscale(fiscalCode)) return `cf:${fiscalCode}`;
  const lastName = normalizeName(anagrafica.lastName);
  const firstName = normalizeName(anagrafica.firstName);
  const birthDate = text(anagrafica.dateOfBirth).trim().slice(0, 10);
  if (!lastName || !firstName || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  return `nd:${lastName}|${firstName}|${birthDate}`;
}

export interface DraftLike {
  id: string;
  data: unknown;
  createdById: string | null;
  updatedAt: Date;
}

/**
 * Per ogni bozza l'id di quella più recente con la stessa identità forte e lo stesso proprietario
 * (`null` se è lei la più recente o se l'identità non è forte). Il proprietario fa parte della
 * chiave: la bozza di un collega non è mai "la stessa" bozza.
 */
export function duplicateOfIds<T extends DraftLike>(drafts: readonly T[]): Map<string, string> {
  const newest = new Map<string, T>();
  const keyed: Array<[T, string]> = [];
  for (const draft of drafts) {
    const identity = draftIdentityKey(draft.data);
    if (!identity) continue;
    const key = `${draft.createdById ?? ''}\u0000${identity}`;
    keyed.push([draft, key]);
    const current = newest.get(key);
    if (!current || draft.updatedAt > current.updatedAt) newest.set(key, draft);
  }
  const result = new Map<string, string>();
  for (const [draft, key] of keyed) {
    const primary = newest.get(key)!;
    if (primary.id !== draft.id) result.set(draft.id, primary.id);
  }
  return result;
}
