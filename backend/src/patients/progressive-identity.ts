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

const NAME_LABEL = { firstName: 'Nome', lastName: 'Cognome' } as const;

/** The error names the exact field: "Nome" and "Cognome" are fixed separately. */
export function patientName(value: unknown, field: keyof typeof NAME_LABEL = 'firstName'): string {
  const label = NAME_LABEL[field];
  if (typeof value !== 'string' || !value.trim())
    throw new PatientIdentityInputError(`${label} obbligatorio: compila il campo «${label}»`);
  if (value.trim().length > 150)
    throw new PatientIdentityInputError(`${label} troppo lungo (massimo 150 caratteri)`);
  return value.trim();
}

const OPTIONAL_FIELDS = {
  sex: { label: 'Sesso', max: 32 },
  email: { label: 'Email', max: 254 },
  address: { label: 'Indirizzo', max: 1000 },
  emergencyContactName: { label: 'Contatto di emergenza', max: 150 },
  emergencyContactPhone: { label: 'Telefono del contatto di emergenza', max: 64 },
} as const;

/** Validate optional fields before passing user input to Prisma. Missing fields stay missing. */
export function patientOptionalFields(input: Record<string, unknown>) {
  const result: Partial<Record<keyof typeof OPTIONAL_FIELDS, string | null>> = {};
  for (const [field, { label, max }] of Object.entries(OPTIONAL_FIELDS)) {
    if (!Object.hasOwn(input, field) || input[field] === undefined) continue;
    const raw = input[field];
    if (raw !== null && typeof raw !== 'string')
      throw new PatientIdentityInputError(`${label}: deve essere un testo`);
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (value.length > max)
      throw new PatientIdentityInputError(`${label}: massimo ${max} caratteri`);
    if (field === 'email' && value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value))
      throw new PatientIdentityInputError('Email non valida');
    result[field as keyof typeof OPTIONAL_FIELDS] = value || null;
  }
  return result;
}

export function normalizePatientIdentity(input: Record<string, unknown>) {
  return {
    firstName: patientName(input.firstName, 'firstName'),
    lastName: patientName(input.lastName, 'lastName'),
    dateOfBirth: optionalBirthDate(input.dateOfBirth),
    codiceFiscale: optionalFiscalCode(input.codiceFiscale),
    phone: optionalPatientPhone(input.phone),
  };
}
