export class PatientSummaryInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PatientSummaryInputError';
  }
}

const PATIENT_ID = /^[A-Za-z0-9_-]{1,128}$/;

export function parsePatientSummaryIds(value: unknown): string[] {
  if (value === undefined) {
    throw new PatientSummaryInputError('patientIds deve contenere almeno un identificativo');
  }
  if (typeof value !== 'string' || value.trim() === '') {
    throw new PatientSummaryInputError('patientIds deve contenere almeno un identificativo');
  }

  const ids = [...new Set(value.split(',').map((id) => id.trim()))];
  if (ids.length > 100) {
    throw new PatientSummaryInputError('patientIds non puo contenere piu di 100 identificativi');
  }
  if (ids.some((id) => !PATIENT_ID.test(id))) {
    throw new PatientSummaryInputError('patientIds contiene un identificativo non valido');
  }
  return ids;
}
