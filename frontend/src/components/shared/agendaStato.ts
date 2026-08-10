import type { Appuntamento, StatoAppuntamento } from '../../types';

export const STATO_LABEL: Record<StatoAppuntamento, string> = {
  programmato: 'Programmato',
  in_corso: 'In corso',
  completato: 'Completato',
  annullato: 'Annullato',
};

export const STATI_APPUNTAMENTO: StatoAppuntamento[] = [
  'programmato',
  'in_corso',
  'completato',
  'annullato',
];

export type FiltroStatoAppuntamento = 'tutti' | StatoAppuntamento;

export function matchStato(apt: Appuntamento, filtro: FiltroStatoAppuntamento): boolean {
  return filtro === 'tutti' || apt.stato === filtro;
}
