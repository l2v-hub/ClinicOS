// Frontend contract for the faithful clinical sections (REQ-027, consuming REQ-026 `_sections`).
// The frontend works ONLY with canonical keys — it never searches document titles.

export type SectionKey =
  | 'PATIENT_DEMOGRAPHICS'
  | 'ALLERGIES'
  | 'DISCHARGE_DIAGNOSIS'
  | 'ANAMNESIS'
  | 'HOSPITAL_COURSE'
  | 'CONSULTATIONS'
  | 'IMAGING_DIAGNOSTICS'
  | 'PROCEDURES_AND_INTERVENTIONS'
  | 'HOSPITAL_THERAPY'
  | 'DISCHARGE_HOME_THERAPY'
  | 'ADVICE_AND_FOLLOW_UP'
  | 'UNMAPPED_CONTENT';

export type SemanticTag =
  | 'SECTION_TITLE'
  | 'SUBSECTION_TITLE'
  | 'DATE'
  | 'TIME'
  | 'TEMPORAL_MARKER'
  | 'MEDICATION_NAME'
  | 'DOSE'
  | 'SCHEDULE'
  | 'FREQUENCY'
  | 'ALLERGY_CRITICAL'
  | 'WARNING_TEXT';

export interface SemanticAnnotation {
  tag: SemanticTag;
  text: string;
  startOffset: number;
  endOffset: number;
}

export interface SourceRange {
  fileId?: string;
  pageNumber?: number;
  startOffset?: number;
  endOffset?: number;
}

export interface MedicationLine {
  medicationName?: string;
  dose?: string;
  schedule?: string;
  frequency?: string;
  route?: string;
  duration?: string;
  exactText: string;
  warnings?: string[];
}

export interface SectionData {
  sectionKey: SectionKey;
  detectedHeading?: string;
  rawText: string;
  /** Manual correction kept SEPARATE — the original rawText is never overwritten. */
  reviewedText?: string | null;
  sourceRanges?: SourceRange[];
  annotations?: SemanticAnnotation[];
  medications?: MedicationLine[];
  warnings?: string[];
}

export type AllergyStatus =
  | 'present'
  | 'explicitly_absent'
  | 'conflicting'
  | 'not_documented'
  | 'unclear';

export interface AllergyBlock {
  status: AllergyStatus;
  rawText?: string;
  sourceFileId?: string;
  sourcePage?: number;
  warnings?: string[];
}

export interface SectionsResult {
  sections: SectionData[];
  allergies: AllergyBlock;
  demographics?: Record<string, unknown>;
}

export type ReviewStatus = 'pending' | 'accepted' | 'modified' | 'excluded';

/** What gets persisted per section (cartella.documentSections) — provenance kept. */
export interface ReviewedSection {
  sectionKey: SectionKey;
  targetArea: string;
  title: string;
  rawText: string;
  reviewedText: string | null;
  annotations: SemanticAnnotation[];
  sources: { fileName: string; pageNumber?: number }[];
  reviewStatus: ReviewStatus;
}
