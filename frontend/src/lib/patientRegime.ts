import { ADMISSION_LABELS } from './patientRosterSort';

export type PatientRegime = 'ricoverato' | 'day_hospital' | 'ambulatoriale' | 'dimesso' | 'non_disponibile';
export type PatientRegimeFilter = PatientRegime | 'tutti';

/** Presentation only: never infer or write an admission regime from optional enrichment. */
export function patientRegime(state: string | null | undefined): PatientRegime {
  return state === 'ricoverato' || state === 'day_hospital' || state === 'ambulatoriale' || state === 'dimesso'
    ? state : 'non_disponibile';
}

export const PATIENT_REGIME_LABEL: Record<PatientRegimeFilter, string> = {
  tutti: 'Tutti i regimi',
  ricoverato: ADMISSION_LABELS.ricoverato,
  day_hospital: ADMISSION_LABELS.day_hospital,
  ambulatoriale: ADMISSION_LABELS.ambulatoriale,
  dimesso: ADMISSION_LABELS.dimesso,
  non_disponibile: 'Non disponibile',
};

export function matchesPatientRegime(state: string | null | undefined, filter: PatientRegimeFilter): boolean {
  return filter === 'tutti' || patientRegime(state) === filter;
}
