// #446: il Turno è diverso per ciascun lavoro. La variante la decidono le capability, non il nome
// del ruolo: chi somministra vede le dosi, chi prescrive le decisioni, chi assiste il giro parametri.
export type TurnoVariant = 'infermiere' | 'medico' | 'oss';

export function turnoVariant(can: {
  administer: boolean;
  prescribe: boolean;
  recordVitals: boolean;
}): TurnoVariant {
  if (can.administer) return 'infermiere';
  if (can.prescribe) return 'medico';
  return can.recordVitals ? 'oss' : 'infermiere';
}

export interface GiroPaziente {
  patientId: string;
  nome: string;
  luogo: string | null;
  rilevatoOggi: boolean;
  critico: boolean;
}

/** Prima chi ha parametri critici, poi chi non è ancora stato rilevato; l'ordine del reparto resta. */
export function ordineGiro(pazienti: readonly GiroPaziente[]): GiroPaziente[] {
  const rank = (p: GiroPaziente) => (p.critico ? 0 : p.rilevatoOggi ? 2 : 1);
  return pazienti
    .map((p, index) => ({ p, index }))
    .sort((a, b) => rank(a.p) - rank(b.p) || a.index - b.index)
    .map(({ p }) => p);
}

/** «Niente in sospeso» solo quando è vero per tutte le fonti, e tutte sono arrivate (#446 AC3). */
export function nienteInSospeso(input: {
  daLeggere: number | null;
  critici: number | null;
  giro: { fatti: number; totale: number; completo: boolean } | null;
}): boolean {
  return (
    input.daLeggere === 0 &&
    input.critici === 0 &&
    input.giro !== null &&
    input.giro.completo &&
    input.giro.fatti >= input.giro.totale
  );
}
