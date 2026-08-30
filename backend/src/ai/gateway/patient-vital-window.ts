export const MAX_PATIENT_VITAL_SIGNS = 100;
export const PATIENT_VITAL_LOOKAHEAD = MAX_PATIENT_VITAL_SIGNS + 1;
export const MAX_PATIENT_VITAL_ID = 128;
export const MAX_PATIENT_VITAL_LABEL = 32;
export const MAX_PATIENT_VITAL_VALUE = 64;
export const MAX_PATIENT_VITAL_UNIT = 32;
export const MAX_PATIENT_VITAL_STATE = 32;
export const MAX_PATIENT_VITAL_TIMESTAMP = 64;

export interface PatientVitalRow {
  recordId: string;
  id: string | null;
  etichetta: string | null;
  valore: string | null;
  unita: string | null;
  stato: string | null;
  rilevato: string | null;
  contentTruncated: boolean;
}

export function parsePatientVitalBoundary(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : undefined;
}

export function boundPatientVitalRows(rows: PatientVitalRow[]) {
  return {
    rows: rows.slice(0, MAX_PATIENT_VITAL_SIGNS),
    truncated:
      rows.length > MAX_PATIENT_VITAL_SIGNS || rows.some((row) => row.contentTruncated === true),
  };
}
