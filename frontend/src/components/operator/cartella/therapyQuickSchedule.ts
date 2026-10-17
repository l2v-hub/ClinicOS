import type { TherapyFormValue } from './TherapyFormFields';
import { formToPayload } from './therapyFormMapping';
import { formatFraction } from './therapyDose';
import { facilityLocalMinute } from '../../../lib/facilityTime';

export const QUICK_SCHEDULES = [
  { id: 'morning', label: 'Mattina 08', times: ['08:00'] },
  { id: 'twice', label: 'Mattina e sera 08 · 20', times: ['08:00', '20:00'] },
  { id: 'three', label: '3 volte 08 · 14 · 20', times: ['08:00', '14:00', '20:00'] },
] as const;

/** A preset changes times only; an explicit existing dose remains the operator's dose. */
export function quickSchedule(value: TherapyFormValue, times: readonly string[]): TherapyFormValue {
  const first = value.schedules[0];
  const dose = first ?? { quantityNumerator: 0, quantityDenominator: 1, administrationUnit: '' };
  return {
    ...value,
    tipo: 'periodica',
    schedules: times.map((time) => ({
      ...(value.schedules.find((s) => s.time === time) ?? dose),
      time,
    })),
  };
}

/** Inclusive civil duration; no elapsed-hour arithmetic across Rome daylight-saving changes. */
export function durationEnd(start: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !Number.isInteger(days) || days < 1) return '';
  const date = new Date(`${start}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== start) return '';
  date.setUTCDate(date.getUTCDate() + days - 1);
  if (!Number.isFinite(date.getTime())) return '';
  const result = date.toISOString().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : '';
}

/** Shared payload mapping is the source of every sentence value, not a second prescription. */
export function prescriptionSentence(value: TherapyFormValue, now: Date = new Date()): string {
  const p = formToPayload(value, '', '');
  const dates = `dal ${p.dataInizio || 'giorno da indicare'}${p.dataFine ? ` al ${p.dataFine}` : ', senza fine'}`;
  const dose = p.schedules
    .map((s) =>
      p.doseMode === 'glucose_scale'
        ? `Dose secondo glicemia misurata alle ${s.time}`
        : `${s.quantityNumerator > 0 && s.quantityDenominator > 0 ? formatFraction(s.quantityNumerator, s.quantityDenominator) : 'dose da indicare'} ${s.administrationUnit || 'unità da indicare'} alle ${s.time}`,
    )
    .join('; ');
  const next = nextPrescriptionOccurrence(p, now);
  return `${p.farmacoNome || 'Farmaco da selezionare'} · ${p.tipo === 'periodica' ? dose || 'orari da indicare' : p.tipo === 'al_bisogno' ? 'al bisogno secondo le indicazioni' : `una dose il ${p.dataSomministrazione || 'giorno da indicare'} alle ${p.orarioSomministrazione || 'ora da indicare'}`} · ${p.viaSomministrazione || 'via da indicare'} · ${dates}.${next ? ` Prossima dose prevista: ${next.slice(0, 10)} ore ${next.slice(11)}.` : ''}`;
}

/** First future civil occurrence; backend eligibility remains authoritative for recording. */
export function nextPrescriptionOccurrence(
  payload: ReturnType<typeof formToPayload>,
  now: Date,
): string | null {
  if (
    payload.tipo !== 'periodica' ||
    payload.stato !== 'attiva' ||
    durationEnd(payload.dataInizio, 1) !== payload.dataInizio ||
    (payload.dataFine && durationEnd(payload.dataFine, 1) !== payload.dataFine)
  )
    return null;
  const local = facilityLocalMinute(now),
    start = payload.dataInizio > local.slice(0, 10) ? payload.dataInizio : local.slice(0, 10);
  const days = payload.giorniSettimana?.split(',').map(Number) ?? [];
  const times = payload.schedules
    .map((s) => s.time.padStart(5, '0'))
    .filter((t) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t))
    .sort();
  const date = new Date(`${start}T12:00:00Z`);
  for (let i = 0; i < 8; i++) {
    if (!Number.isFinite(date.getTime())) return null;
    const day = date.toISOString().slice(0, 10);
    if (payload.dataFine && day > payload.dataFine) return null;
    if (!days.length || days.includes(date.getUTCDay() || 7)) {
      const time = times.find((t) => `${day}T${t}` >= local);
      if (time) return `${day}T${time}`;
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return null;
}
