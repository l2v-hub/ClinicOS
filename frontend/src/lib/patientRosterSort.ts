import type { ClinicalSummaryEntry, Paziente } from '../types';
import { comparePazienti } from './patientSort';

export type PatientSortField = 'patient' | 'fiscalCode' | 'admission' | 'signals';
export interface PatientRosterSort {
  field: PatientSortField;
  direction: 'asc' | 'desc';
}

export const PATIENT_SORT_LABELS: Record<PatientSortField, string> = {
  patient: 'Paziente',
  fiscalCode: 'Codice fiscale',
  admission: 'Ricovero',
  signals: 'Segnalazioni',
};

export const ADMISSION_LABELS: Record<string, string> = {
  ricoverato: 'Ricoverato',
  ambulatoriale: 'Ambulatoriale',
  day_hospital: 'Day Hospital',
  dimesso: 'Dimesso',
};

export function togglePatientSort(
  current: PatientRosterSort,
  field: PatientSortField,
): PatientRosterSort {
  return {
    field,
    direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc',
  };
}

interface RosterSortContext {
  summaryMap: ReadonlyMap<string, ClinicalSummaryEntry>;
  consegneAperteMap: ReadonlyMap<string, number>;
  anomalies: ReadonlyMap<string, { totale: number }>;
}

const collator = new Intl.Collator('it', { sensitivity: 'base', numeric: true });
const text = (value: string | null | undefined) => value?.trim() || null;

/** Sort only the loaded rows; unavailable values stay last in either direction. */
export function sortPatientRoster(
  patients: readonly Paziente[],
  sort: PatientRosterSort,
  context: RosterSortContext,
): Paziente[] {
  const key = (patient: Paziente): string | number | null => {
    if (sort.field === 'patient') return text(patient.lastName) ?? text(patient.firstName);
    if (sort.field === 'fiscalCode') return text(patient.codiceFiscale);
    const summary = context.summaryMap.get(patient.id);
    if (!summary) return null;
    if (sort.field === 'admission') {
      const state = text(summary.statoRicovero);
      return state ? (ADMISSION_LABELS[state] ?? state) : null;
    }
    // Count the visible badges: the two critical flags produce a single badge.
    // Anomalies can be partial; the roster retains its existing verification warning.
    return (
      Number(summary.hasCriticalVitals || summary.hasHighRisk) +
      summary.allergieCount +
      (context.anomalies.get(patient.id)?.totale ?? 0) +
      (context.consegneAperteMap.get(patient.id) ?? 0)
    );
  };
  const keys = new Map(patients.map((patient) => [patient.id, key(patient)]));
  const direction = sort.direction === 'asc' ? 1 : -1;
  return [...patients].sort((a, b) => {
    const aKey = keys.get(a.id) ?? null;
    const bKey = keys.get(b.id) ?? null;
    if (aKey === null && bKey !== null) return 1;
    if (aKey !== null && bKey === null) return -1;
    const compared =
      aKey === null || bKey === null
        ? 0
        : sort.field === 'patient'
          ? comparePazienti(a, b)
          : typeof aKey === 'number' && typeof bKey === 'number'
            ? aKey - bKey
            : collator.compare(String(aKey), String(bKey));
    return direction * compared || comparePazienti(a, b) || a.id.localeCompare(b.id);
  });
}
