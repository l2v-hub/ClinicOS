// Abbinare una prescrizione alla confezione giusta: dosaggio e forma farmaceutica.
//
// Serve in due punti che sembrano distanti ma pongono la stessa domanda:
//   1. quale CONFEZIONE dell'anagrafica corrisponde alla riga di terapia (`scegliConfezione`);
//   2. quale RCP, fra i molti contenuti in un unico PDF, descrive quella confezione
//      (`scegliBlocco` in rcpStruttura.ts).
// La logica sta qui una volta sola perche' sbagliarla nei due posti in modo diverso sarebbe il
// peggiore dei casi: un documento che si dichiara coerente con la prescrizione senza esserlo.
//
// REGOLA: nel dubbio non si scegli. `null` significa "decida l'operatore", ed e' un esito
// legittimo. Indicare un dosaggio a caso non lo e'.

/** Minuscolo, senza accenti e senza punteggiatura: base per ogni confronto testuale. */
export function normalizza(testo: string): string {
  return testo
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s.,/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Quantita' presenti in una stringa, come numero+unita' senza spazi: "1000 mg" → "1000mg".
 *
 * La virgola decimale italiana e' normalizzata al punto, altrimenti "0,5 mg" e "0.5 mg"
 * sarebbero due dosaggi diversi.
 */
export function quantita(testo: string): string[] {
  const trovate = normalizza(testo).match(/\d+(?:[.,]\d+)?\s*(?:mg|mcg|microgrammi|g|ml|ui|%)/g);
  return trovate ? trovate.map((q) => q.replace(/\s+/g, '').replace(',', '.')) : [];
}

// Sinonimi fra la forma dell'anagrafica e le parole della denominazione. L'anagrafica dice
// "Compressa", la denominazione "compresse effervescenti": il confronto letterale fallirebbe
// su quasi ogni farmaco.
const FAMIGLIE_FORMA: RegExp[] = [
  /compress|cpr/,
  /capsul/,
  /sciroppo/,
  /sospension/,
  /soluzion/,
  /granulat|bustin|polvere/,
  /supposta|supposte/,
  /gocce|goccia/,
  /crema|unguento|pomata|gel/,
  /cerotto|transdermic/,
  /fiala|fiale|iniett|infusion/,
  /spray|nebul|inalaz|aerosol/,
  /collirio|oftalmic/,
  /ovul|vaginal/,
];

/** Famiglia di forme cui appartiene una forma farmaceutica, o `null` se non riconosciuta. */
export function famigliaDi(forma: string): RegExp | null {
  const n = normalizza(forma);
  return FAMIGLIE_FORMA.find((r) => r.test(n)) ?? null;
}

/** Dati della prescrizione che permettono di riconoscere la confezione. */
export interface PrescrizioneDaAbbinare {
  /** Dosaggio come scritto in terapia: "1000 mg", "120 mg/5 ml". */
  dosaggio?: string | null;
  /** Forma farmaceutica: dall'anagrafica ("Compressa") o dalla via di somministrazione. */
  forma?: string | null;
}

// Il dosaggio pesa il doppio della forma: distinguere 500 da 1000 mg conta piu' che
// distinguere una compressa da una compressa effervescente. E' la confusione clinicamente
// piu' pericolosa fra due confezioni dello stesso farmaco.
const PESO_DOSAGGIO = 2;
const PESO_FORMA = 1;

/**
 * Indice del testo che corrisponde meglio alla prescrizione, oppure `null`.
 *
 * `null` in tre casi, tutti volutamente non risolti:
 *   - la prescrizione non porta nulla su cui decidere (ne' dosaggio ne' forma riconoscibile);
 *   - nessun candidato corrisponde in alcun modo;
 *   - due o piu' candidati corrispondono ugualmente bene.
 */
export function scegliPerDosaggioEForma(
  candidati: string[],
  prescrizione: PrescrizioneDaAbbinare,
): number | null {
  if (candidati.length === 0) return null;
  if (candidati.length === 1) return 0;

  const qPrescritte = quantita(prescrizione.dosaggio ?? '');
  const famiglia = prescrizione.forma ? famigliaDi(prescrizione.forma) : null;
  if (qPrescritte.length === 0 && !famiglia) return null;

  const punteggi = candidati.map((candidato) => {
    const testo = normalizza(candidato);
    const qCandidato = quantita(candidato);
    const dosaggio = qPrescritte.filter((q) => qCandidato.includes(q)).length * PESO_DOSAGGIO;
    return dosaggio + (famiglia?.test(testo) ? PESO_FORMA : 0);
  });

  const massimo = Math.max(...punteggi);
  if (massimo === 0) return null;
  if (punteggi.filter((p) => p === massimo).length > 1) return null;
  return punteggi.indexOf(massimo);
}
