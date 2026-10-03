// Viste della lista pazienti (HMI 1): "Ricoverati" (in carico), "Dimessi e archivio", "Tutti".
// Lo stato di ricovero viene dal riepilogo clinico; se per un paziente non è ancora noto, il
// paziente resta fra quelli in carico: non lo si nasconde per un dato mancante.
import type { ClinicalSummaryEntry } from '../types';

export type ListView = 'in_carico' | 'dimessi' | 'tutti';

export const LIST_VIEW_LABEL: Record<ListView, string> = {
  in_carico: 'Ricoverati',
  dimessi: 'Dimessi e archivio',
  tutti: 'Tutti',
};

export function matchesListView(
  stato: ClinicalSummaryEntry['statoRicovero'] | null | undefined,
  view: ListView,
): boolean {
  if (view === 'tutti') return true;
  if (view === 'dimessi') return stato === 'dimesso';
  return stato !== 'dimesso';
}

/** Conteggi delle viste. Se lo stato di ricovero di anche un solo paziente non è noto (riepilogo
 *  in caricamento o non disponibile), "Ricoverati" e "Dimessi" non sono verificabili: null. */
export function countListViews(
  ids: string[],
  statoOf: (id: string) => ClinicalSummaryEntry['statoRicovero'] | null | undefined,
): Record<ListView, number | null> {
  let inCarico = 0;
  let dimessi = 0;
  let unknown = 0;
  for (const id of ids) {
    const stato = statoOf(id);
    if (stato === undefined || stato === null) unknown++;
    else if (stato === 'dimesso') dimessi++;
    else inCarico++;
  }
  return {
    in_carico: unknown ? null : inCarico,
    dimessi: unknown ? null : dimessi,
    tutti: ids.length,
  };
}

/** Quanti pazienti caricati hanno lo stato di ricovero non noto. */
export function unknownStateCount(
  ids: string[],
  statoOf: (id: string) => ClinicalSummaryEntry['statoRicovero'] | null | undefined,
): number {
  return ids.filter((id) => statoOf(id) === undefined || statoOf(id) === null).length;
}

// ── Direct access: the list opened already filtered on what a KPI tile / notification counts ──

/** Signal a dashboard counter refers to. */
export type PatientListSignal = 'critici' | 'rischi' | 'allergie' | 'anomalie';

export const LIST_SIGNAL_LABEL: Record<PatientListSignal, string> = {
  critici: 'Parametri critici',
  rischi: 'Rischi alti',
  allergie: 'Allergie gravi',
  anomalie: 'Farmaci da sanare',
};

/** How to open the patient list: view and optional signal filter. */
export interface PatientListEntry {
  view?: ListView;
  signal?: PatientListSignal;
}

/** true when the patient has the signal. Unknown summary → not shown under a signal filter
 *  (the filter says what it counts; the chip tells the user how to remove it). */
export function matchesListSignal(
  summary: ClinicalSummaryEntry | undefined,
  hasAnomalies: boolean,
  signal: PatientListSignal | null | undefined,
): boolean {
  if (!signal) return true;
  if (signal === 'anomalie') return hasAnomalies;
  if (!summary) return false;
  if (signal === 'critici') return summary.hasCriticalVitals;
  if (signal === 'rischi') return summary.hasHighRisk;
  return summary.hasSevereAllergy;
}
