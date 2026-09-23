import { birthDateValue, formatBirthDate } from './patientDemographics';

export interface PatientLocationData {
  status: 'assigned' | 'unassigned' | 'unavailable';
  source: 'assignment' | 'cartella' | null;
  room: string | null;
  bed: string | null;
  /** Calendar day in Europe/Rome, supplied by the read model. */
  asOf: string;
}

export interface PatientIdentityData {
  id: string;
  firstName: string;
  lastName: string;
  codiceFiscale?: string | null;
  dateOfBirth?: string | null;
  location?: PatientLocationData | null;
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

function calendarDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  if (Number(value.slice(0, 4)) < 1) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Never infer unassigned from a missing/invalid projection or compatibility labels. */
export function parsePatientLocation(value: unknown): PatientLocationData | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (!calendarDay(row.asOf)) return null;
  if (row.source !== null && row.source !== 'assignment' && row.source !== 'cartella') return null;
  if (
    (row.room !== null && typeof row.room !== 'string') ||
    (row.bed !== null && typeof row.bed !== 'string')
  )
    return null;
  if (row.status === 'unassigned' || row.status === 'unavailable') {
    return { status: row.status, source: row.source, room: null, bed: null, asOf: row.asOf };
  }
  if (row.status !== 'assigned' || !['assignment', 'cartella'].includes(String(row.source))) {
    return null;
  }
  const room = text(row.room);
  const bed = text(row.bed);
  if ((!room && !bed) || (row.source === 'assignment' && (!room || !bed))) return null;
  return {
    status: 'assigned',
    source: row.source as 'assignment' | 'cartella',
    room,
    bed,
    asOf: row.asOf,
  };
}

/** Handover visibility alone never grants a patient identity or a chart action. */
export function parsePatientIdentity(value: unknown): PatientIdentityData | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = text(row.id);
  const firstName = text(row.firstName);
  const lastName = text(row.lastName);
  if (!id || !firstName || !lastName) return null;
  if (row.codiceFiscale !== null && typeof row.codiceFiscale !== 'string') return null;
  if (row.dateOfBirth !== null && typeof row.dateOfBirth !== 'string') return null;
  const location = parsePatientLocation(row.location);
  if (!location) return null;
  return {
    id,
    firstName,
    lastName,
    codiceFiscale: text(row.codiceFiscale),
    dateOfBirth: birthDateValue(row.dateOfBirth),
    location,
  };
}

export function patientIdentityName(patient: PatientIdentityData): string {
  return [text(patient.lastName), text(patient.firstName)].filter(Boolean).join(', ');
}

export function patientIdentifier(patient: PatientIdentityData): string {
  const fiscalCode = text(patient.codiceFiscale);
  if (fiscalCode) return `CF ${fiscalCode}`;
  return birthDateValue(patient.dateOfBirth)
    ? `Nato/a il ${formatBirthDate(patient.dateOfBirth)} · CF da completare`
    : 'Codice fiscale e data di nascita non disponibili';
}

/** This read model deliberately omits contact details such as phone. */
export function patientIdentityIncomplete(patient: PatientIdentityData): boolean {
  return !text(patient.codiceFiscale) || !birthDateValue(patient.dateOfBirth);
}

export function patientLocationLabel(value: unknown, loading = false): string {
  if (loading) return 'Caricamento posto letto…';
  const location = parsePatientLocation(value);
  if (!location || location.status === 'unavailable') return 'Posto letto non disponibile';
  if (location.status === 'unassigned') return 'Posto letto non assegnato';
  return [
    location.room ? `Camera ${location.room}` : 'Camera non indicata',
    location.bed ? `Letto ${location.bed}` : 'Letto non indicato',
  ].join(' · ');
}
