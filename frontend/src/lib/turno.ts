/** Fasce standard del diario (mattina 7–14, pomeriggio 14–21, notte 21–7). */
/** Etichetta come nel prototipo: "Turno mattino". */
export const TURNO_LABEL = {
  mattina: 'mattino',
  pomeriggio: 'pomeriggio',
  notte: 'notte',
} as const;

export function turnoDaOra(date: Date): 'mattina' | 'pomeriggio' | 'notte' {
  const h = date.getHours();
  if (h >= 7 && h < 14) return 'mattina';
  if (h >= 14 && h < 21) return 'pomeriggio';
  return 'notte';
}
