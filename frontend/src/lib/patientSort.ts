// Issue #129 — ordinamento alfabetico stabile dei pazienti.
// Unica sorgente della logica di confronto: cognome, poi nome, con normalizzazione
// di maiuscole/minuscole e accenti (locale it) e tolleranza per dati incompleti.
// Array.prototype.sort è stabile (V8), quindi l'ordine relativo di elementi
// equivalenti resta deterministico tra refresh e aggiornamenti.

const collator = new Intl.Collator('it', { sensitivity: 'base' });

function norm(value: string | null | undefined): string {
  return (value ?? '').trim();
}

/**
 * Confronta due pazienti per cognome poi nome (alfabetico, locale it,
 * insensibile a maiuscole/accenti). Se il cognome manca si usa il nome come
 * chiave primaria, così il paziente resta in posizione alfabetica; i record
 * senza alcun nome finiscono in fondo.
 */
export function comparePazienti(
  a: { lastName?: string | null; firstName?: string | null },
  b: { lastName?: string | null; firstName?: string | null },
): number {
  const aKey = norm(a.lastName) || norm(a.firstName);
  const bKey = norm(b.lastName) || norm(b.firstName);
  if (!aKey && bKey) return 1;
  if (aKey && !bKey) return -1;
  const byCognome = collator.compare(aKey, bKey);
  if (byCognome !== 0) return byCognome;
  return collator.compare(norm(a.firstName), norm(b.firstName));
}

/**
 * Confronta due nomi completi visualizzati (formato "Cognome, Nome" o testo
 * libero) con la stessa normalizzazione. Le stringhe vuote finiscono in fondo.
 */
export function comparePazientiNome(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const aNome = norm(a);
  const bNome = norm(b);
  if (!aNome && bNome) return 1;
  if (aNome && !bNome) return -1;
  return collator.compare(aNome, bNome);
}

/** Ritorna una copia ordinata alfabeticamente (cognome, nome) della lista pazienti. */
export function sortPazienti<T extends { lastName?: string | null; firstName?: string | null }>(
  pazienti: T[],
): T[] {
  return [...pazienti].sort(comparePazienti);
}
