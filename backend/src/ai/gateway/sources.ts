// REQ-039: SourceReference builders. Every gateway result must carry at least one of these so the
// assistant can never assert a value without a verifiable origin.

import type { SourceReference } from './types.js';

export function patientFieldSource(
  patientId: string,
  field: string,
  exactText?: string,
): SourceReference {
  return { sourceType: 'PATIENT_FIELD', patientId, recordId: patientId, label: field, exactText };
}

export function narrativeSource(
  patientId: string,
  sectionKey: string,
  recordId: string,
  exactText?: string,
  recordedAt?: string,
): SourceReference {
  return {
    sourceType: 'NARRATIVE_SECTION',
    patientId,
    recordId,
    sectionKey,
    label: sectionKey,
    exactText,
    recordedAt,
  };
}

export function vitalSource(
  patientId: string,
  recordId: string,
  label: string,
  exactText?: string,
  recordedAt?: string,
): SourceReference {
  return { sourceType: 'VITAL_SIGN', patientId, recordId, label, exactText, recordedAt };
}

export function diarySource(
  patientId: string,
  recordId: string,
  label: string,
  exactText?: string,
  recordedAt?: string,
): SourceReference {
  return { sourceType: 'DIARY_ENTRY', patientId, recordId, label, exactText, recordedAt };
}

export function documentSource(
  patientId: string,
  documentId: string,
  label: string,
  pageNumber?: number,
): SourceReference {
  return { sourceType: 'DOCUMENT', patientId, recordId: documentId, documentId, pageNumber, label };
}

export function appointmentSource(
  patientId: string,
  recordId: string,
  label: string,
  recordedAt?: string,
): SourceReference {
  return { sourceType: 'APPOINTMENT', patientId, recordId, label, recordedAt };
}

export function therapySource(
  patientId: string,
  recordId: string,
  label: string,
  exactText?: string,
  recordedAt?: string,
): SourceReference {
  return { sourceType: 'THERAPY', patientId, recordId, label, exactText, recordedAt };
}

// issue #239: facility-level aggregate (no single patient owns this result — same convention the
// composable query engine already uses for room/bed/roomAssignment rows: sourceType 'OCCUPANCY',
// patientId '' when the record is not patient-owned).
export function roomOccupancySource(exactText?: string, recordedAt?: string): SourceReference {
  return {
    sourceType: 'OCCUPANCY',
    patientId: '',
    recordId: 'rooms-occupancy',
    label: 'Occupazione camere',
    exactText,
    recordedAt,
  };
}

// Consegna (attività di reparto). `pazienteId` è vuoto quando la consegna non è legata a un
// paziente censito: la navigazione ricade allora sull'elenco consegne, non su una scheda paziente.
export function consegnaSource(
  pazienteId: string,
  consegnaId: string,
  label: string,
  exactText?: string,
  recordedAt?: string,
): SourceReference {
  return {
    sourceType: 'CONSEGNA',
    patientId: pazienteId || '',
    recordId: consegnaId,
    label,
    exactText,
    recordedAt,
  };
}

// Fase 1b: staff roster — facility-level organisational data (no patient owns this result).
export function staffSource(exactText?: string, recordedAt?: string): SourceReference {
  return {
    sourceType: 'STAFF',
    patientId: '',
    recordId: 'staff-list',
    label: 'Personale della struttura',
    exactText,
    recordedAt,
  };
}

// Milo fase 1: scale e valutazioni finalizzate, somministrazioni, turni e punteggi calcolati.
export function assessmentSource(
  patientId: string,
  recordId: string,
  label: string,
  exactText?: string,
  recordedAt?: string,
): SourceReference {
  return { sourceType: 'ASSESSMENT', patientId, recordId, label, exactText, recordedAt };
}

export function administrationSource(
  patientId: string,
  recordId: string,
  label: string,
  exactText?: string,
  recordedAt?: string,
): SourceReference {
  return { sourceType: 'ADMINISTRATION', patientId, recordId, label, exactText, recordedAt };
}

/** Turni settimanali del personale: dato organizzativo, nessun paziente lo possiede. */
export function shiftSource(recordId: string, exactText?: string): SourceReference {
  return {
    sourceType: 'SHIFT',
    patientId: '',
    recordId,
    label: 'Turni del personale',
    exactText,
  };
}

/** Punteggio calcolato dal backend su una rilevazione: la fonte è la rilevazione stessa. */
export function clinicalScoreSource(
  patientId: string,
  readingId: string,
  label: string,
  exactText?: string,
  recordedAt?: string,
): SourceReference {
  return {
    sourceType: 'CLINICAL_SCORE',
    patientId,
    recordId: readingId,
    label,
    exactText,
    recordedAt,
  };
}
