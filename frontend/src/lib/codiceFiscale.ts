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
