// Canonical section key -> ClinicOS target area (REQ-027).
//
// The frontend keys off CANONICAL keys only — it never looks for document titles like
// "Diagnosi di dimissione" or "TD". Recognition is the backend/profile's job (REQ-026).

import type { SectionKey } from './types';

export type TargetArea = 'ANAGRAFICA' | 'CARTELLA' | 'DIARY' | 'THERAPY' | 'UNMAPPED';

export interface SectionMapEntry {
  targetArea: TargetArea;
  /** Human title shown in the review and stored with the section. */
  title: string;
  /** Visually prioritised section (allergies, home therapy). */
  priority?: boolean;
}

export const SECTION_MAP: Record<SectionKey, SectionMapEntry> = {
  PATIENT_DEMOGRAPHICS: { targetArea: 'ANAGRAFICA', title: 'Anagrafica' },
  ALLERGIES: { targetArea: 'CARTELLA', title: 'Allergie', priority: true },
  DISCHARGE_DIAGNOSIS: { targetArea: 'CARTELLA', title: 'Diagnosi' },
  ANAMNESIS: { targetArea: 'CARTELLA', title: 'Anamnesi' },
  HOSPITAL_COURSE: { targetArea: 'DIARY', title: 'Decorso ospedaliero' },
  CONSULTATIONS: { targetArea: 'DIARY', title: 'Consulenze' },
  IMAGING_DIAGNOSTICS: { targetArea: 'DIARY', title: 'Diagnostica per immagini' },
  PROCEDURES_AND_INTERVENTIONS: { targetArea: 'DIARY', title: 'Prestazioni e interventi' },
  HOSPITAL_THERAPY: { targetArea: 'THERAPY', title: 'Terapia durante il ricovero' },
  DISCHARGE_HOME_THERAPY: { targetArea: 'THERAPY', title: 'Terapia domiciliare', priority: true },
  ADVICE_AND_FOLLOW_UP: { targetArea: 'CARTELLA', title: 'Consigli e controlli' },
  UNMAPPED_CONTENT: { targetArea: 'UNMAPPED', title: 'Contenuto non classificato' },
};

/** Order the review presents the sections in (REQ-027 "Revisione"). */
export const REVIEW_ORDER: SectionKey[] = [
  'PATIENT_DEMOGRAPHICS',
  'ALLERGIES',
  'DISCHARGE_DIAGNOSIS',
  'ANAMNESIS',
  'HOSPITAL_COURSE',
  'CONSULTATIONS',
  'IMAGING_DIAGNOSTICS',
  'PROCEDURES_AND_INTERVENTIONS',
  'HOSPITAL_THERAPY',
  'DISCHARGE_HOME_THERAPY',
  'ADVICE_AND_FOLLOW_UP',
  'UNMAPPED_CONTENT',
];

export const TARGET_AREA_LABEL: Record<TargetArea, string> = {
  ANAGRAFICA: 'Anagrafica',
  CARTELLA: 'Cartella clinica',
  DIARY: 'Diario',
  THERAPY: 'Terapie',
  UNMAPPED: 'Non classificato',
};

const ALLERGY_STATUS_LABEL: Record<string, string> = {
  present: 'Allergie rilevate',
  explicitly_absent: 'Assenza esplicitamente dichiarata',
  not_documented: 'Allergie non documentate',
  unclear: 'Informazioni illeggibili',
  conflicting: 'Informazioni in conflitto',
};
export function allergyStatusLabel(status: string): string {
  return ALLERGY_STATUS_LABEL[status] ?? 'Allergie non documentate';
}
