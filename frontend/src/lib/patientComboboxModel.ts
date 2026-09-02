import type { Paziente } from '../types';

export function patientDisplayName(patient: Pick<Paziente, 'firstName' | 'lastName'>): string {
  return `${patient.lastName}, ${patient.firstName}`;
}

export function patientFiscalCode(patient: Pick<Paziente, 'codiceFiscale'>): string {
  return patient.codiceFiscale?.trim().toUpperCase() || 'Non disponibile';
}

export function nextPatientOptionIndex(
  current: number,
  count: number,
  key: 'ArrowDown' | 'ArrowUp' | 'Home' | 'End',
): number {
  if (count <= 0) return -1;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  if (key === 'ArrowDown') return current < 0 ? 0 : (current + 1) % count;
  return current < 0 ? count - 1 : (current - 1 + count) % count;
}
