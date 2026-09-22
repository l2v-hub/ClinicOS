import { isValidCodiceFiscale, normalizeCodiceFiscale } from '../lib/codice-fiscale.js';
import { validatePatientPhone } from '../lib/patient-phone.js';

export class PatientIdentityInputError extends Error {}

const absent = (value: unknown) => value == null || (typeof value === 'string' && !value.trim());

/** Unknown is not a placeholder date. Accept ISO date-only or the Italian OCR format. */
export function optionalBirthDate(value: unknown): Date | null {
  if (absent(value)) return null;
  if (typeof value !== 'string') throw new PatientIdentityInputError('Data di nascita non valida');
  let iso = value.trim();
  const italian = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(iso);
  if (italian) iso = `${italian[3]}-${italian[2].padStart(2, '0')}-${italian[1].padStart(2, '0')}`;
  const date = new Date(`${iso}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(iso) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== iso ||
    date.getTime() > Date.now()
  ) {
    throw new PatientIdentityInputError('Data di nascita non valida o futura');
  }
  return date;
}

export function optionalFiscalCode(value: unknown): string | null {
  if (absent(value)) return null;
  if (typeof value !== 'string') throw new PatientIdentityInputError('Codice fiscale non valido');
  const cf = normalizeCodiceFiscale(value);
  if (!isValidCodiceFiscale(cf))
    throw new PatientIdentityInputError(
      'Codice fiscale non valido (16 caratteri, carattere di controllo)',
    );
  return cf;
}

export function optionalPatientPhone(value: unknown): string | null {
  if (absent(value)) return null;
  const result = validatePatientPhone(value);
  if (!result.ok) throw new PatientIdentityInputError(result.error);
  return result.phone;
}

export function patientName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 150)
    throw new PatientIdentityInputError('Nome e cognome sono obbligatori (massimo 150 caratteri)');
  return value.trim();
}

export function normalizePatientIdentity(input: Record<string, unknown>) {
  return {
    firstName: patientName(input.firstName),
    lastName: patientName(input.lastName),
    dateOfBirth: optionalBirthDate(input.dateOfBirth),
    codiceFiscale: optionalFiscalCode(input.codiceFiscale),
    phone: optionalPatientPhone(input.phone),
  };
}
