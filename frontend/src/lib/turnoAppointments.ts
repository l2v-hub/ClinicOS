import type { SlotAgenda } from '../types';
import { facilityLocalMinute } from './facilityTime';

export interface ProssimoAppuntamento {
  slot: SlotAgenda;
  /** Programmato ma con l'orario già passato e non ancora iniziato. */
  daIniziare: boolean;
}

/** Prossimi appuntamenti di oggi non conclusi, sull'ora della struttura: prima quelli in corso,
 *  poi i successivi, poi quelli programmati il cui orario è passato ma non sono iniziati. */
export function prossimiAppuntamenti(
  agenda: SlotAgenda[],
  now: Date,
  limit = 3,
): { items: ProssimoAppuntamento[]; altri: number } {
  const hhmm = facilityLocalMinute(now).slice(11, 16);
  const rank = (s: SlotAgenda) => (s.stato === 'in_corso' ? 0 : s.ora >= hhmm ? 1 : 2);
  const open = agenda
    .filter((s) => s.stato === 'in_corso' || s.stato === 'programmato')
    .sort((a, b) => rank(a) - rank(b) || a.ora.localeCompare(b.ora));
  return {
    items: open
      .slice(0, limit)
      .map((slot) => ({ slot, daIniziare: slot.stato === 'programmato' && slot.ora < hhmm })),
    altri: Math.max(0, open.length - limit),
  };
}
