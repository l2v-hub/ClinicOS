export interface FarmacoTrovato {
  aic: string;
  denominazione: string;
  descrizione: string | null;
  forma: string | null;
  atc: string | null;
  statoAmministrativo: string;
  fornitura: string | null;
  linkFi: string | null;
  linkRcp: string | null;
  principiAttivi: Array<{ nome: string; quantita: number | null; unita: string | null }>;
  /** 1 = corrispondenza esatta; sotto 1 = approssimata. Decide se proporre o solo suggerire. */
  confidenza: number;
  /** Come si e' arrivati al farmaco: serve a spiegarlo all'operatore in interfaccia. */
  criterio: 'esatto' | 'prefisso' | 'approssimato' | 'principio-attivo';
}

export const SELEZIONE = {
  aic: true,
  denominazione: true,
  descrizione: true,
  forma: true,
  atc: true,
  statoAmministrativo: true,
  fornitura: true,
  linkFi: true,
  linkRcp: true,
  principiAttivi: { select: { principioAttivo: true, quantita: true, unitaMisura: true } },
} as const;

export type RigaDb = {
  aic: string;
  denominazione: string;
  descrizione: string | null;
  forma: string | null;
  atc: string | null;
  statoAmministrativo: string;
  fornitura: string | null;
  linkFi: string | null;
  linkRcp: string | null;
  principiAttivi: Array<{
    principioAttivo: string;
    quantita: number | null;
    unitaMisura: string | null;
  }>;
};

export function componi(
  r: RigaDb,
  confidenza: number,
  criterio: FarmacoTrovato['criterio'],
): FarmacoTrovato {
  return {
    aic: r.aic,
    denominazione: r.denominazione,
    descrizione: r.descrizione,
    forma: r.forma,
    atc: r.atc,
    statoAmministrativo: r.statoAmministrativo,
    fornitura: r.fornitura,
    linkFi: r.linkFi,
    linkRcp: r.linkRcp,
    principiAttivi: r.principiAttivi.map((p) => ({
      nome: p.principioAttivo,
      quantita: p.quantita,
      unita: p.unitaMisura,
    })),
    confidenza,
    criterio,
  };
}

/** Distanza di Levenshtein, limitata: oltre `massimo` si abbandona invece di completare. */
export function distanza(a: string, b: string, massimo = 4): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > massimo) return massimo + 1;
  let prec = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let minRiga = i;
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prec[j] + 1, prec[j - 1] + costo);
      if (cur[j] < minRiga) minRiga = cur[j];
    }
    // Se l'intera riga supera gia' il massimo, nessun percorso potra' scendere sotto.
    if (minRiga > massimo) return massimo + 1;
    prec = cur;
  }
  return prec[b.length];
}
