// Milo: come i dati letti arrivano al modello e come la sua prosa torna all'utente.
//   - Gli istanti (ISO in UTC) diventano ora della struttura, «22/11/2026 19:33»: il modello non
//     deve convertire fusi orari e non scrive mai «UTC» a un operatore di reparto.
//   - Nel testo del modello gli identificativi grezzi delle fonti diventano riferimenti numerati
//     [n], nello stesso ordine dell'elenco delle fonti mostrato sotto la risposta.
// Solo la copia per il modello cambia: blocchi, grafici e fonti usano i dati originali.

import type { SourceReference } from '../gateway/types.js';

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?Z$/;
const FORMAT = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function facilityTime(iso: string): string {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? FORMAT.format(d).replace(',', '') : iso;
}

/** Copia profonda con gli istanti ISO in ora della struttura (limite di profondità prudente). */
export function localizeInstants<T>(value: T, depth = 0): T {
  if (depth > 12) return value;
  if (typeof value === 'string')
    return (ISO_INSTANT.test(value) ? facilityTime(value) : value) as T;
  if (value instanceof Date) return facilityTime(value.toISOString()) as T;
  if (Array.isArray(value)) return value.map((v) => localizeInstants(v, depth + 1)) as T;
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        localizeInstants(v, depth + 1),
      ]),
    ) as T;
  return value;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Sostituisce nel testo gli identificativi delle fonti con [n] (posizione in `sources`, da 1),
 * togliendo le forme «(fonte: id)», «fonte id», «recordId id». Id sconosciuti restano invariati.
 */
export function numberSourceIds(text: string, sources: SourceReference[]): string {
  let out = text;
  const seen = new Map<string, number>();
  sources.forEach((s, i) => {
    if (s.recordId && s.recordId.length >= 6 && !seen.has(s.recordId)) seen.set(s.recordId, i + 1);
  });
  for (const [id, n] of seen) {
    const re = new RegExp(
      `\\s*\\(?\\s*(?:(?:fonte|fonti|source|recordId|id)\\s*[:=]?\\s*)?\\[?${escape(id)}\\]?\\s*\\)?`,
      'gi',
    );
    out = out.replace(re, ` [${n}]`);
  }
  return out
    .replace(/ +([.,;:])/g, '$1')
    .replace(/ {2,}/g, ' ')
    .trim();
}
