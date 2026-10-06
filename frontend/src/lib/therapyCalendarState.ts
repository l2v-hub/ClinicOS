import { isCalendarDate } from './patientTherapyCalendar';

export interface TherapyCalendarState {
  mode: 'giro' | 'calendario';
  date: string;
  weekOf: string;
  open: { date: string; time: string; patientId?: string } | null;
  scrollTop: number;
}

export function parseTherapyCalendarState(value: unknown): TherapyCalendarState | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const state = value as Partial<TherapyCalendarState>;
  if (
    !['giro', 'calendario'].includes(String(state.mode)) ||
    !isCalendarDate(state.date) ||
    !isCalendarDate(state.weekOf)
  )
    return undefined;
  const open = state.open;
  if (open != null && (!isCalendarDate(open.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(open.time)))
    return undefined;
  if (
    open?.patientId != null &&
    (typeof open.patientId !== 'string' || !open.patientId.trim() || open.patientId.length > 128)
  )
    return undefined;
  return {
    mode: state.mode!,
    date: state.date,
    weekOf: state.weekOf,
    open: open ?? null,
    scrollTop:
      typeof state.scrollTop === 'number' && Number.isFinite(state.scrollTop)
        ? Math.max(0, Math.min(state.scrollTop, 100000))
        : 0,
  };
}

/** This history entry only: leaving via a patient link preserves its exact calendar dialog. */
export function rememberTherapyCalendarState(state: TherapyCalendarState): void {
  if (window.location.hash !== '#/terapie') return;
  window.history.replaceState(
    { ...window.history.state, navKey: 'terapie', therapyCalendar: state },
    '',
    window.location.hash,
  );
}
