// Calendario del giro terapia: settimana (lunedì–domenica), fasce, stato di ogni cella.
// Solo totali reali del servizio delle fasce: nessun conteggio stimato o ricostruito.
import type { FasciaOrariaTerapia, TherapySlot } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** I sette giorni (YYYY-MM-DD) della settimana che contiene `date`, da lunedì. */
export function weekDays(date: string): string[] {
  const [y, m, d] = date.split('-').map(Number);
  const day = new Date(y, m - 1, d, 12);
  const offset = (day.getDay() + 6) % 7; // lunedì = 0
  day.setDate(day.getDate() - offset);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(day);
    x.setDate(day.getDate() + i);
    return iso(x);
  });
}

/** Fasce presenti nella settimana (in ordine orario), anche se un giorno non ne ha. */
export function weekFasce(
  days: Record<string, TherapySlot[] | undefined>,
): { fascia: FasciaOrariaTerapia; ora: string; label: string }[] {
  const seen = new Map<string, { fascia: FasciaOrariaTerapia; ora: string; label: string }>();
  for (const slots of Object.values(days))
    for (const s of slots ?? [])
      if (!seen.has(s.fascia)) seen.set(s.fascia, { fascia: s.fascia, ora: s.ora, label: s.label });
  return [...seen.values()].sort((a, b) => a.ora.localeCompare(b.ora));
}

export type CellTone = 'vuota' | 'completa' | 'da-fare' | 'mancanti' | 'futura';

/**
 * Stato di una cella. "mancanti": fascia già passata con somministrazioni non registrate (né date né
 * non date) — da verificare, non "saltate": il dato dice solo che manca la registrazione.
 */
export function cellTone(
  slot: TherapySlot | undefined,
  date: string,
  today: string,
  nowHm: string,
): CellTone {
  if (!slot || slot.summary.total === 0) return 'vuota';
  if (slot.summary.pending === 0) return 'completa';
  const passed = date < today || (date === today && slot.ora < nowHm);
  if (passed) return 'mancanti';
  return date === today ? 'da-fare' : 'futura';
}

export function cellLabel(slot: TherapySlot, tone: CellTone): string {
  const { total, administered, notAdministered, pending } = slot.summary;
  const parts = [`${administered + notAdministered} registrate su ${total}`];
  if (notAdministered > 0) parts.push(`${notAdministered} non somministrate`);
  if (pending > 0)
    parts.push(
      tone === 'mancanti' ? `${pending} senza registrazione` : `${pending} da somministrare`,
    );
  return parts.join(', ');
}
