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
