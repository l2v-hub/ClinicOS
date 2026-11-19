// Controllo formale del codice fiscale senza dipendenze: forma + carattere di controllo.
//
// Sta in un modulo a sé perché lo usano elenchi, intestazioni e riepiloghi di ogni pagina: la
// libreria `codice-fiscale-js` porta con sé il catalogo dei comuni (≈430 kB), che serve solo a
// CALCOLARE un codice (`codiceFiscale.ts`, scheda d'ingresso) e non deve pesare sull'avvio.
// L'esito è identico a `CodiceFiscale.check` (test di parità in `__tests__/codiceFiscale.test.ts`);
// la validazione autoritativa resta lato backend.

const CF_PATTERN =
  /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;
/** Valore dei caratteri in posizione dispari (1ª, 3ª, …), per cifra 0-9 o lettera A-Z. */
const ODD = [
  1, 0, 5, 7, 9, 13, 15, 17, 19, 21, 2, 4, 18, 20, 11, 3, 6, 8, 12, 14, 16, 10, 22, 25, 24, 23,
];

export function normalizeCF(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidCF(raw: string): boolean {
  const cf = normalizeCF(raw);
  if (!CF_PATTERN.test(cf)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const code = cf.charCodeAt(i);
    const value = code <= 57 ? code - 48 : code - 65;
    sum += i % 2 === 0 ? ODD[value] : value;
  }
  return String.fromCharCode(65 + (sum % 26)) === cf[15];
}

/** Cifre di un tratto numerico, comprese le lettere di omocodia (L=0 … V=9). */
const omocodiaDigits = (part: string) =>
  Number(part.replace(/[LMNPQRSTUV]/g, (letter) => String('LMNPQRSTUV'.indexOf(letter))));

/** Missing sex may be proposed from a validated fiscal code; explicit values always win. */
export function fiscalCodeSex(raw: string): 'M' | 'F' | null {
  if (!isValidCF(raw)) return null;
  const code = normalizeCF(raw);
  const encoded = omocodiaDigits(code.slice(9, 11));
  const sex = encoded >= 41 && encoded <= 71 ? 'F' : 'M';
  const day = sex === 'F' ? encoded - 40 : encoded;
  if (day < 1 || day > 31) return null;
  const month = 'ABCDEHLMPRST'.indexOf(code[8]);
  const year = 2000 + omocodiaDigits(code.slice(6, 8));
  if (new Date(Date.UTC(year, month, day)).getUTCMonth() !== month) return null;
  return sex;
}
