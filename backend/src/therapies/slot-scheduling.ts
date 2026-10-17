// Logica pura di posizionamento oraria degli slot terapia — separata da therapy-slots.ts perche'
// quel modulo importa prisma (throws senza DATABASE_URL a import-time); qui niente prisma, niente
// env, niente orologio implicito, cosi' resta testabile senza database.
import { fasciaFromTime } from '../lib/therapy-dose.js';

/** A one-off prescription already carries an explicit clock; empty legacy flags are irrelevant. */
export function oneTimeSlot(therapy: {
  tipo?: string;
  orarioSomministrazione?: string | null;
  schedules?: Array<{ time: string }>;
}): { fascia: string; time: string } | null {
  const time = therapy.orarioSomministrazione;
  if (
    therapy.tipo !== 'una_tantum' ||
    !time ||
    !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(time) ||
    therapy.schedules?.some((schedule) => schedule.time !== time)
  )
    return null;
  return { fascia: fasciaFromTime(time), time };
}

export function therapyBandEnabled(
  therapy: Parameters<typeof oneTimeSlot>[0],
  fascia: string,
  legacyEnabled: boolean,
): boolean {
  return therapy.tipo === 'una_tantum' ? oneTimeSlot(therapy)?.fascia === fascia : legacyEnabled;
}

// La fascia e' un raggruppamento (mattina/pranzo/...), ma l'agenda posiziona/etichetta la card
// sulla griglia oraria in base a un singolo `ora`. Usare sempre l'orario di default della fascia
// (es. 16:00 per "pomeriggio") nasconde una dose reale anticipata (es. 14:00): la card resta
// comunque all'orario fisso, un utente che scorre la griglia cercando "14:00" non trova nulla li'.
// Ancoriamo invece all'orario REALE piu' imminente tra le somministrazioni contenute — se la
// fascia e' vuota resta l'orario di default (nessun contenuto da ancorare).
export function earliestOra(scheduledTimes: string[], fallbackOra: string): string {
  if (scheduledTimes.length === 0) return fallbackOra;
  return scheduledTimes.reduce((min, t) => (t < min ? t : min), scheduledTimes[0]);
}
