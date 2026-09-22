import { isValidCF } from './codiceFiscale';
import { validatePatientPhone } from './patientPhone';

export const DEMOGRAPHIC_LABELS = {
  firstName: 'Nome',
  lastName: 'Cognome',
  dateOfBirth: 'Data di nascita',
  codiceFiscale: 'Codice fiscale',
  phone: 'Telefono',
} as const;
export type DemographicField = keyof typeof DEMOGRAPHIC_LABELS;
export type Demographics = Partial<Record<DemographicField, unknown>>;
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
export const missingValue = (value: unknown) =>
  value == null || (typeof value === 'string' && !value.trim());

/** Calendar-only validation also accepts the ISO timestamps returned by the patient API. */
export function birthDateValue(value: unknown): string | null {
  const input = text(value);
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)?$/.test(input)) return null;
  const day = input.slice(0, 10);
  const date = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) return null;
  if (Number(day.slice(0, 4)) < 1 || day > new Date().toISOString().slice(0, 10)) return null;
  return day;
}

export function incompleteDemographicFields(value: Demographics): DemographicField[] {
  return (Object.keys(DEMOGRAPHIC_LABELS) as DemographicField[]).filter(
    (field) =>
      missingValue(value[field]) ||
      (field === 'dateOfBirth' && !birthDateValue(value[field])) ||
      (field === 'codiceFiscale' && !isValidCF(text(value[field]))) ||
      (field === 'phone' && !validatePatientPhone(value[field]).ok),
  );
}

export function formatBirthDate(value: unknown): string {
  const day = birthDateValue(value);
  return day ? day.split('-').reverse().join('/') : 'Non disponibile';
}

export function patientAge(value: unknown, today = new Date()): number | null {
  const day = birthDateValue(value);
  if (!day) return null;
  const [year, month, date] = day.split('-').map(Number);
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < date))
    age--;
  return age >= 0 ? age : null;
}

export function birthSummary(value: unknown): string {
  const age = patientAge(value);
  return age === null
    ? 'Data di nascita non disponibile'
    : `${formatBirthDate(value)} · ${age} anni`;
}
