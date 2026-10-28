// Logica pura di posizionamento oraria degli slot terapia — separata da therapy-slots.ts perche'
// quel modulo importa prisma (throws senza DATABASE_URL a import-time); qui niente prisma, niente
// env, niente orologio implicito, cosi' resta testabile senza database.
import { fasciaFromTime } from '../lib/therapy-dose.js';

/** Normalize equivalent clock spellings, never repair an invalid prescription. */
export function normalizeTherapyClock(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clock = value.replace(/^ +| +$/g, ''); // Same space trimming as PostgreSQL btrim.
  if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(clock)) return null;
  return clock.padStart(5, '0');
}

export type TherapyVerificationReason = 'missing_time' | 'invalid_time' | 'conflicting_schedule';

export function oneTimeVerificationReason(
  therapy: Parameters<typeof oneTimeSlot>[0],
): TherapyVerificationReason | null {
  if (therapy.tipo !== 'una_tantum') return null;
  if (!therapy.orarioSomministrazione?.trim()) return 'missing_time';
  const time = normalizeTherapyClock(therapy.orarioSomministrazione);
  if (!time) return 'invalid_time';
  if (
    (therapy.schedules?.length ?? 0) > 1 ||
    therapy.schedules?.some(
      (schedule) =>
        normalizeTherapyClock(schedule.time) !== time ||
        (schedule.fascia !== undefined && schedule.fascia !== fasciaFromTime(time)),
    )
  )
    return 'conflicting_schedule';
  return null;
}

/** A one-off prescription already carries an explicit clock; empty legacy flags are irrelevant. */
export function oneTimeSlot(therapy: {
  tipo?: string;
  orarioSomministrazione?: string | null;
  schedules?: Array<{ time: string; fascia?: string }>;
}): { fascia: string; time: string } | null {
  const time = normalizeTherapyClock(therapy.orarioSomministrazione);
  if (therapy.tipo !== 'una_tantum' || !time || oneTimeVerificationReason(therapy)) return null;
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

/** One civil-day outcome, including legacy cross-band records. Given always wins; ties are stable.
 * Callers load records for the exact date. Patient identity is checked again before exposing data. */
export function recordedOneTimeOutcome<
  T extends {
    id: string;
    therapyId: string | null;
    patientId: string;
    farmacoNome: string;
    stato: string;
  },
>(
  therapy: { id: string; patientId: string; farmacoNome: string },
  records: readonly T[],
): T | null {
  return (
    records
      .filter(
        (record) =>
          record.patientId === therapy.patientId &&
          (record.therapyId === therapy.id ||
            (record.therapyId === null && record.farmacoNome === therapy.farmacoNome)) &&
          (record.stato === 'erogata' || record.stato === 'non_erogata'),
      )
      .sort(
        (a, b) =>
          Number(b.stato === 'erogata') - Number(a.stato === 'erogata') ||
          Number(b.therapyId !== null) - Number(a.therapyId !== null) ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      )[0] ?? null
  );
}
