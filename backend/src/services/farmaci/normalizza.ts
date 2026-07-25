// Normalizzazione dei nomi farmaco, condivisa fra import e ricerca.
//
// DEVE essere la stessa nei due punti: se l'anagrafica venisse indicizzata con una regola e
// interrogata con un'altra, la ricerca fallirebbe in modo silenzioso e apparentemente casuale.
// Per questo vive qui e non duplicata.

/** Maiuscole, senza accenti, senza punteggiatura, spazi singoli. */
export function normalizza(testo: string): string {
  return (testo || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // toglie i diacritici (è → e)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ') // asterischi, virgole, barre: tutto separatore
    .replace(/\s+/g, ' ')
    .trim();
}

// Unita' di misura e forme che l'operatore scrive attaccate al nome. Vanno tolte per far
// combaciare "CARDIOASPIRIN 100 MG CPR" con la denominazione a registro.
const RUMORE = new RegExp(
  String.raw`\b(\d+([.,]\d+)?\s*)?(MG|G|MCG|UG|ML|UI|MEQ)\b|` +
    String.raw`\b(CPR|CP|COMPRESSE|COMPRESSA|CAPSULE|CAPSULA|CAPS|BUSTINE|BUSTINA|BST|` +
    String.raw`FIALE|FIALA|FL|FLACONE|SCIROPPO|GOCCE|GTT|SUPPOSTE|SUPPOSTA|CEROTTI|CEROTTO|` +
    String.raw`CREMA|POMATA|SPRAY|SOL|SOLUZIONE|RIVESTITE|RIVESTITA|GASTRORESISTENTI|` +
    String.raw`GASTRORESISTENTE|RILASCIO|PROLUNGATO|MODIFICATO|OS|USO|ORALE)\b`,
  'g',
);

/**
 * Nome "essenziale" del farmaco: normalizzato e ripulito di dosaggi e forme farmaceutiche.
 * Serve al confronto, non alla visualizzazione — all'operatore va sempre mostrata la
 * denominazione ufficiale, non questa.
 */
export function nucleoNome(testo: string): string {
  let s = normalizza(testo).replace(RUMORE, ' ').replace(/\s+/g, ' ').trim();
  // Numeri nudi in coda: quasi sempre un dosaggio scritto senza unita' ("Cardioaspirin 100").
  // Si tolgono solo in CODA e solo se interamente numerici, per non rovinare i nomi che
  // contengono cifre al loro interno (VITAMINA B12, COVID 19).
  s = s.replace(/(\s+\d+([.,]\d+)?)+$/, '').trim();
  // Se togliendo tutto non resta nulla (l'operatore ha scritto solo "100 mg"),
  // meglio restituire la forma normalizzata piena che una stringa vuota, che matcherebbe tutto.
  return s || normalizza(testo);
}

/**
 * Dosaggi citati nel testo, come coppie valore+unita' (es. "100 mg" → {valore:100, unita:'mg'}).
 * Usato per restringere i candidati quando l'operatore ha indicato la dose.
 */
export function dosaggiCitati(testo: string): Array<{ valore: number; unita: string }> {
  const out: Array<{ valore: number; unita: string }> = [];
  const re = /(\d+(?:[.,]\d+)?)\s*(mg|g|mcg|ug|ml|ui|meq)\b/gi;
  for (const m of (testo || '').matchAll(re)) {
    const valore = Number(m[1].replace(',', '.'));
    if (Number.isFinite(valore)) out.push({ valore, unita: m[2].toLowerCase() });
  }
  return out;
}
