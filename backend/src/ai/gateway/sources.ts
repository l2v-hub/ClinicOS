// REQ-039: SourceReference builders. Every gateway result must carry at least one of these so the
// assistant can never assert a value without a verifiable origin.

import type { SourceReference } from './types.js';

export function patientFieldSource(patientId: string, field: string, exactText?: string): SourceReference {
  return { sourceType: 'PATIENT_FIELD', patientId, recordId: patientId, label: field, exactText };
}

export function narrativeSource(patientId: string, sectionKey: string, recordId: string, exactText?: string, recordedAt?: string): SourceReference {
  return { sourceType: 'NARRATIVE_SECTION', patientId, recordId, sectionKey, label: sectionKey, exactText, recordedAt };
}

export function vitalSource(patientId: string, recordId: string, label: string, exactText?: string, recordedAt?: string): SourceReference {
  return { sourceType: 'VITAL_SIGN', patientId, recordId, label, exactText, recordedAt };
}

export function diarySource(patientId: string, recordId: string, label: string, exactText?: string, recordedAt?: string): SourceReference {
  return { sourceType: 'DIARY_ENTRY', patientId, recordId, label, exactText, recordedAt };
}

export function documentSource(patientId: string, documentId: string, label: string, pageNumber?: number): SourceReference {
  return { sourceType: 'DOCUMENT', patientId, recordId: documentId, documentId, pageNumber, label };
}

export function appointmentSource(patientId: string, recordId: string, label: string, recordedAt?: string): SourceReference {
  return { sourceType: 'APPOINTMENT', patientId, recordId, label, recordedAt };
}

export function therapySource(patientId: string, recordId: string, label: string, exactText?: string, recordedAt?: string): SourceReference {
  return { sourceType: 'THERAPY', patientId, recordId, label, exactText, recordedAt };
}

// — Agnos KB (Task 2): consegne, scale cliniche, occupazione camere/letti, turni operatore.

export function consegnaSource(patientId: string, recordId: string, tipo: string, text: string, at?: string): SourceReference {
  return { sourceType: 'CONSEGNE', patientId, recordId, label: tipo, exactText: text, recordedAt: at };
}

export function clinicalScoreSource(patientId: string, recordId: string, scale: string, text: string, at?: string): SourceReference {
  return { sourceType: 'CLINICAL_SCORE', patientId, recordId, label: scale, exactText: text, recordedAt: at };
}

/** Aggregate room occupancy — facility-wide, MAI nomi paziente. patientId '' by convention for
 *  non-patient-scoped facility sources (same convention already used by query/engine.ts sourceFor()). */
export function roomOccupancySource(recordId: string, text: string): SourceReference {
  return { sourceType: 'ROOM_OCCUPANCY', patientId: '', recordId, label: 'Occupazione camere', exactText: text };
}

export function roomOccupantsSource(patientId: string, recordId: string, text: string): SourceReference {
  return { sourceType: 'ROOM_OCCUPANTS', patientId, recordId, label: 'Occupante camera', exactText: text };
}

export function operatorShiftSource(recordId: string, text: string): SourceReference {
  return { sourceType: 'OPERATOR_SHIFT', patientId: '', recordId, label: 'Turni operatori', exactText: text };
}
