// UX cycle 2 — W5: the patient's Terapia section has three views (owner decision 2026-10-03):
// Calendario (default: compact active-drug list + day/week calendar with the administration
// actions), Storico («how it went») and Nuova terapia (the registration form). Pure helpers: how a
// direct-access target (new or cycle-1 value) lands, which sub-view the URL remembers, and the
// Storico filters. No React, no fetch.
import type { TherapySubView, TherapyView } from './patientTarget';

/** Storico status filter; «sospese» lists suspended/concluded prescriptions instead of doses. */
export type HistoryStatus = 'tutte' | 'erogata' | 'non_erogata' | 'prn' | 'sospese';
/** Storico period: today, last 7 / 30 days, everything loaded. */
export type HistoryPeriod = 'oggi' | '7' | '30' | 'tutto';

/** Periods for which the «al bisogno» doses are read (one bounded read per day). */
export const PRN_MAX_DAYS = 7;

export interface TherapyLanding {
  view: TherapyView;
  /** Storico opened on the suspended/concluded prescriptions. */
  historyStatus?: HistoryStatus;
  /** Open the drug's prescription detail (and highlight it). */
  openDrug: boolean;
  /** Open the dose of that day/time in the calendar (actions visible). */
  openDose: boolean;
}

/**
 * Where a therapy target lands. `drugState` is the targeted prescription's state when known:
 * an inactive drug lives in Storico › Sospese/concluse whatever view the link named.
 */
export function therapyLanding(
  subView: TherapySubView | undefined,
  options: { canCreate?: boolean; drugState?: string; hasDrug?: boolean } = {},
): TherapyLanding {
  const inactive = options.drugState !== undefined && options.drugState !== 'attiva';
  if (inactive)
    return { view: 'storico', historyStatus: 'sospese', openDrug: true, openDose: false };
  switch (subView) {
    case 'storico':
      return { view: 'storico', historyStatus: 'tutte', openDrug: false, openDose: false };
    case 'sospese':
      return { view: 'storico', historyStatus: 'sospese', openDrug: false, openDose: false };
    case 'nuova':
      return options.canCreate === false
        ? { view: 'calendario', openDrug: false, openDose: false }
        : { view: 'nuova', openDrug: false, openDose: false };
    case 'giornaliere':
    case 'calendario':
      return { view: 'calendario', openDrug: false, openDose: true };
    case 'attivi':
    case 'programmazione':
    default:
      // No sub-view (diary «apri», bare drug link) behaves like «attivi»: the drug opened.
      return { view: 'calendario', openDrug: Boolean(options.hasDrug), openDose: false };
  }
}

/** Sub-view the URL remembers for a view (QA F2); Storico on «sospese» keeps its filter. */
export function therapySubViewOf(view: TherapyView, historyStatus?: HistoryStatus): TherapySubView {
  if (view === 'storico' && historyStatus === 'sospese') return 'sospese';
  return view;
}

/** Server band → time of the facility rounds (fallback when the prescription has no schedule). */
export const FASCIA_TIME: Record<string, string> = {
  mattina: '08:00',
  pranzo: '12:00',
  pomeriggio: '16:00',
  sera: '20:00',
  notte: '22:00',
};

/** «08:00» stays as is; a band becomes the prescription's real time for it, else the rounds time. */
export function doseTimeOf(
  fascia: string | undefined,
  schedules?: { fascia?: string | null; time: string }[] | null,
): string | undefined {
  if (!fascia) return undefined;
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(fascia)) return fascia;
  return schedules?.find((s) => s.fascia === fascia)?.time ?? FASCIA_TIME[fascia];
}

// ── Storico ──────────────────────────────────────────────────────────────────────────────

/** One line of the Storico: a scheduled dose (given / not given) or an «al bisogno» dose. */
export interface HistoryRow {
  id: string;
  kind: 'scheduled' | 'prn';
  therapyId: string | null;
  date: string;
  /** "HH:MM": scheduled time, or the real time of an «al bisogno» dose. */
  time: string;
  drugName: string;
  dose: string;
  route: string;
  /** erogata / non_erogata / da_erogare (scheduled) or «al_bisogno». */
  status: string;
  operator: string | null;
  /** Reason (not given) or indication (al bisogno), plus the note. */
  detail: string | null;
}

/** First day of the period (inclusive); null = no lower bound. */
export function periodStart(period: HistoryPeriod, today: string): string | null {
  if (period === 'tutto') return null;
  const days = period === 'oggi' ? 0 : Number(period) - 1;
  const [y, m, d] = today.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d - days, 12));
  return start.toISOString().slice(0, 10);
}

/** Days of the period, most recent first (for the per-day «al bisogno» reads); null = too long. */
export function periodDays(period: HistoryPeriod, today: string): string[] | null {
  const start = periodStart(period, today);
  if (!start) return null;
  const days: string[] = [];
  const [y, m, d] = today.split('-').map(Number);
  for (let i = 0; i < PRN_MAX_DAYS + 1; i += 1) {
    const day = new Date(Date.UTC(y, m - 1, d - i, 12)).toISOString().slice(0, 10);
    if (day < start) break;
    days.push(day);
  }
  return days.length <= PRN_MAX_DAYS ? days : null;
}

export interface HistoryFilters {
  period: HistoryPeriod;
  /** Drug name (exact, case-insensitive); empty = every drug. */
  drug: string;
  status: HistoryStatus;
}

/** Rows matching the filters, most recent first (date, then time). */
export function filterHistory(rows: HistoryRow[], filters: HistoryFilters, today: string) {
  const start = periodStart(filters.period, today);
  const drug = filters.drug.trim().toLocaleLowerCase('it');
  return rows
    .filter((row) => (start ? row.date >= start && row.date <= today : true))
    .filter((row) => !drug || row.drugName.toLocaleLowerCase('it') === drug)
    .filter((row) => {
      switch (filters.status) {
        case 'erogata':
          return row.kind === 'scheduled' && row.status === 'erogata';
        case 'non_erogata':
          return row.kind === 'scheduled' && row.status === 'non_erogata';
        case 'prn':
          return row.kind === 'prn';
        default:
          return true;
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
}

/** Distinct drug names (sorted) for the drug filter. */
export function historyDrugNames(names: Iterable<string>): string[] {
  const seen = new Map<string, string>();
  for (const name of names) {
    const key = name.trim().toLocaleLowerCase('it');
    if (key && !seen.has(key)) seen.set(key, name.trim());
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'it'));
}
