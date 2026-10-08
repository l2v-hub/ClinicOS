import { isValidCF } from './codiceFiscale';
import { validatePatientPhone } from './patientPhone';
import {
  birthDateValue,
  missingValue,
  type Demographics,
  type DemographicField,
} from './patientDemographics';
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/** New intake opts into four required fields; legacy edits remain progressive. */
export function intakeDemographicErrors(
  value: Demographics,
  requireIdentity = false,
): Partial<Record<DemographicField, string>> {
  const errors: Partial<Record<DemographicField, string>> = {};
  if (!text(value.firstName)) errors.firstName = 'Nome obbligatorio';
  if (!text(value.lastName)) errors.lastName = 'Cognome obbligatorio';
  if (missingValue(value.dateOfBirth)) {
    if (requireIdentity) errors.dateOfBirth = 'Data di nascita obbligatoria';
  } else if (!birthDateValue(value.dateOfBirth))
    errors.dateOfBirth = 'Inserisci una data di nascita valida e non futura';
  if (missingValue(value.codiceFiscale)) {
    if (requireIdentity) errors.codiceFiscale = 'Codice fiscale obbligatorio';
  } else if (!isValidCF(text(value.codiceFiscale)))
    errors.codiceFiscale = 'Codice fiscale non valido (16 caratteri, carattere di controllo)';
  if (!missingValue(value.phone)) {
    const phone = validatePatientPhone(value.phone);
    if (!phone.ok) errors.phone = phone.error;
  }
  return errors;
}

/** Explicit reviewed blanks remove a wrong OCR value; an unavailable value is never invented. */
export function reviewedIdentityPatch(value: Demographics) {
  const codiceFiscale = text(value.codiceFiscale);
  return {
    dateOfBirth: text(value.dateOfBirth),
    codiceFiscale,
    codiceFiscaleOrigine: codiceFiscale ? 'import' : undefined,
    phone: text(value.phone),
  };
}
