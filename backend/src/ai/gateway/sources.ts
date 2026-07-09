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

export function roomOccupancySource(exactText?: string, recordedAt?: string): SourceReference {
  return { sourceType: 'ROOM_OCCUPANCY', patientId: 'rooms', recordId: 'rooms-occupancy', label: 'Occupazione camere', exactText, recordedAt };
}
