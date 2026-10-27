import { facilityLocalDate } from './facilityTime';
import { isCalendarDate } from './patientTherapyCalendar';
import type { TherapyFormValue } from '../components/operator/cartella/TherapyFormFields';

export type TherapyDateField = 'dataInizio' | 'dataSomministrazione';
export type AutomaticTherapyDates = Record<TherapyDateField, boolean>;

/** Admission is a calendar day, including when serialized as an ISO UTC date by the API. */
export function therapyAdmissionCalendarDate(value: unknown): string | null {
  if (typeof value === 'string') {
    const input = value.trim();
    if (/^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?Z)?$/.test(input)) {
      const day = input.slice(0, 10);
      if (isCalendarDate(day)) return day;
    }
  }
  return null;
}

export function therapyAdmissionDate(value: unknown): string {
  // Preserve the previous new-form default when admission is missing or invalid.
  return therapyAdmissionCalendarDate(value) ?? facilityLocalDate();
}

/** A new one-off dose must not default to a day before the current round. */
export function therapyAdministrationDate(admission: unknown): string {
  const today = facilityLocalDate();
  const day = therapyAdmissionCalendarDate(admission);
  return day && day > today ? day : today;
}

/** Only a new manual draft without admission owns automatic fallback dates. */
export function pendingTherapyAdmissionDates(value: unknown): AutomaticTherapyDates | null {
  return therapyAdmissionCalendarDate(value)
    ? null
    : { dataInizio: true, dataSomministrazione: true };
}

/** Explicit input has its own lineage, even when its value equals the automatic fallback. */
export function hydrateTherapyAdmissionDates(
  form: TherapyFormValue,
  admission: unknown,
  automatic: AutomaticTherapyDates | null,
): TherapyFormValue {
  const day = therapyAdmissionCalendarDate(admission);
  if (!day || !automatic) return form;
  const dataInizio = automatic.dataInizio ? day : form.dataInizio;
  const dataSomministrazione = automatic.dataSomministrazione ? therapyAdministrationDate(admission) : form.dataSomministrazione;
  return dataInizio === form.dataInizio && dataSomministrazione === form.dataSomministrazione
    ? form
    : { ...form, dataInizio, dataSomministrazione };
}
