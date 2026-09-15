export const PATIENT_PHONE_MAX_LENGTH = 40;

export type PatientPhoneResult = { ok: true; phone: string } | { ok: false; error: string };

/** Preserve country prefixes, leading zeroes and familiar display separators. */
export function validatePatientPhone(value: unknown): PatientPhoneResult {
  if (value == null || (typeof value === 'string' && !value.trim())) {
    return { ok: false, error: 'Il telefono è obbligatorio.' };
  }
  if (typeof value === 'string') {
    const phone = value.trim();
    const digits = phone.replace(/\D/g, '').length;
    if (
      phone.length <= PATIENT_PHONE_MAX_LENGTH &&
      /^\+?[\d ()./\-]+$/.test(phone) &&
      digits >= 5 &&
      digits <= 15
    ) {
      return { ok: true, phone };
    }
  }
  return {
    ok: false,
    error: 'Inserisci un telefono valido, con 5–15 cifre e prefisso facoltativo.',
  };
}
