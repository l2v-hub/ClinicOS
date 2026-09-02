// #294: helper per il codice fiscale — validazione live e calcolo dai dati anagrafici.
// La libreria codice-fiscale-js (approvata dal PO) porta il catalogo comuni→codice
// catastale necessario al calcolo; la validazione autoritativa resta lato backend.

import CodiceFiscale from 'codice-fiscale-js';

export function normalizeCF(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidCF(raw: string): boolean {
  const cf = normalizeCF(raw);
  if (cf.length !== 16) return false;
  try {
    return CodiceFiscale.check(cf);
  } catch {
    return false;
  }
}

export interface ComputeCFInput {
  nome: string;
  cognome: string;
  /** 'M' | 'F' — altri valori non permettono il calcolo. */
  sesso: string;
  /** YYYY-MM-DD (input type="date"). */
  dataNascita: string;
  comuneNascita: string;
  provinciaNascita?: string;
}

export type ComputeCFResult = { ok: true; cf: string } | { ok: false; error: string };

export type FiscalCodeOrigin = 'auto' | 'manual' | 'import';

export type AutoCFDecision =
  | { kind: 'apply'; cf: string }
  | { kind: 'clear'; reason: 'incomplete' | 'invalid' }
  | { kind: 'preserve'; reason: 'manual' | 'import' | 'unchanged' | 'incomplete' | 'invalid' };

export function computeCF(input: ComputeCFInput): ComputeCFResult {
  const nome = input.nome.trim();
  const cognome = input.cognome.trim();
  const comune = input.comuneNascita.trim();
  const sesso = input.sesso === 'M' || input.sesso === 'F' ? input.sesso : null;

  if (!nome || !cognome) return { ok: false, error: 'Inserire nome e cognome' };
  if (!sesso) return { ok: false, error: 'Indicare il sesso (M o F) per calcolare il CF' };
  if (!input.dataNascita) return { ok: false, error: 'Inserire la data di nascita' };
  if (!comune) return { ok: false, error: 'Inserire il comune di nascita' };

  const [year, month, day] = input.dataNascita.split('-').map((v) => Number(v));
  if (!year || !month || !day) return { ok: false, error: 'Data di nascita non valida' };

  try {
    const cf = CodiceFiscale.compute({
      name: nome,
      surname: cognome,
      gender: sesso,
      day,
      month,
      year,
      birthplace: comune,
      ...(input.provinciaNascita?.trim()
        ? { birthplaceProvincia: input.provinciaNascita.trim().toUpperCase() }
        : {}),
    });
    return { ok: true, cf: normalizeCF(cf) };
  } catch {
    return {
      ok: false,
      error: `Comune di nascita "${comune}" non riconosciuto: verificare il nome o inserire il CF manualmente`,
    };
  }
}

/**
 * Decide se il wizard puo' aggiornare il CF senza distruggere un valore autoritativo.
 * Un CF digitato o importato non viene mai sovrascritto; un valore generato viene invece
 * ricalcolato quando cambiano i dati di origine e rimosso se quei dati diventano incoerenti.
 */
export function deriveAutoCFUpdate(
  input: ComputeCFInput,
  currentCF: string,
  origin?: FiscalCodeOrigin,
): AutoCFDecision {
  const current = normalizeCF(currentCF);
  if (current && origin === 'manual') return { kind: 'preserve', reason: 'manual' };
  if (current && origin === 'import') return { kind: 'preserve', reason: 'import' };
  // Un valore preesistente senza provenienza viene trattato come autoritativo (draft legacy).
  if (current && origin !== 'auto') return { kind: 'preserve', reason: 'manual' };

  const complete =
    Boolean(input.nome.trim()) &&
    Boolean(input.cognome.trim()) &&
    Boolean(input.dataNascita) &&
    (input.sesso === 'M' || input.sesso === 'F') &&
    Boolean(input.comuneNascita.trim());
  if (!complete) {
    return current && origin === 'auto'
      ? { kind: 'clear', reason: 'incomplete' }
      : { kind: 'preserve', reason: 'incomplete' };
  }

  const result = computeCF(input);
  if (!result.ok) {
    return current && origin === 'auto'
      ? { kind: 'clear', reason: 'invalid' }
      : { kind: 'preserve', reason: 'invalid' };
  }
  if (current === result.cf) return { kind: 'preserve', reason: 'unchanged' };
  return { kind: 'apply', cf: result.cf };
}
