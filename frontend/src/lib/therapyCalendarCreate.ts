import type { TherapyFormValue } from '../components/operator/cartella/TherapyFormFields';
import { isCalendarDate } from './patientTherapyCalendar';

export function therapyFormAtCalendarSlot(defaults: TherapyFormValue, date: string, time: string): TherapyFormValue | null {
  if (!isCalendarDate(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  return {
    ...defaults,
    dataInizio: date,
    dataSomministrazione: date,
    orarioSomministrazione: time,
    schedules: [{ ...(defaults.schedules[0] ?? { quantityNumerator: 1, quantityDenominator: 1, administrationUnit: '' }), time }],
  };
}
