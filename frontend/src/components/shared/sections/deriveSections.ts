// Build a SectionsResult from the flat DischargeNarrativeDraft (REQ-033).
//
// The discharge import always carries `_narrative` (REQ-028/033). When the rich `_sections`
// object is absent, this derives an equivalent SectionsResult so the narrative review always
// renders faithful text blocks — the legacy structured table is never used for the import.

import type { SectionsResult, SectionData, SectionKey, SemanticAnnotation, AllergyStatus } from './types';

// Flat narrative draft shape (mirrors backend DischargeNarrativeDraft).
export interface NarrativeDraft {
  firstName?: string; lastName?: string; dateOfBirth?: string; placeOfBirth?: string;
  sex?: string; fiscalCode?: string; address?: string; phone?: string; email?: string;
  allergyStatus?: AllergyStatus; allergiesText?: string;
  diagnosisText?: string; anamnesisText?: string; hospitalCourseText?: string;
  consultationsText?: string; imagingDiagnosticsText?: string;
  proceduresAndInterventionsText?: string; therapyText?: string;
  adviceAndFollowUpText?: string; unmappedText?: string;
  boldTags?: Array<{ sectionKey?: string; tagType: string; text: string; startOffset: number; endOffset: number }>;
  sourceReferences?: Array<{ sectionKey?: string; fileName?: string; pageFrom?: number; pageTo?: number }>;
}

// narrative field + Italian tag/source key -> canonical EN section key.
const FIELDS: Array<{ field: keyof NarrativeDraft; key: SectionKey; italian: string }> = [
  { field: 'diagnosisText', key: 'DISCHARGE_DIAGNOSIS', italian: 'DIAGNOSI' },
  { field: 'anamnesisText', key: 'ANAMNESIS', italian: 'ANAMNESI' },
  { field: 'hospitalCourseText', key: 'HOSPITAL_COURSE', italian: 'DECORSO_OSPEDALIERO' },
  { field: 'consultationsText', key: 'CONSULTATIONS', italian: 'CONSULENZE' },
  { field: 'imagingDiagnosticsText', key: 'IMAGING_DIAGNOSTICS', italian: 'DIAGNOSTICA_PER_IMMAGINI' },
  { field: 'proceduresAndInterventionsText', key: 'PROCEDURES_AND_INTERVENTIONS', italian: 'PRESTAZIONI_E_INTERVENTI' },
  { field: 'therapyText', key: 'DISCHARGE_HOME_THERAPY', italian: 'TERAPIA' },
  { field: 'adviceAndFollowUpText', key: 'ADVICE_AND_FOLLOW_UP', italian: 'CONSIGLI_E_CONTROLLI' },
  { field: 'unmappedText', key: 'UNMAPPED_CONTENT', italian: 'CONTENUTO_NON_CLASSIFICATO' },
];

// REQ-033: the discharge-import draft must be narrative — never legacy structured arrays.
const LEGACY_IMPORT_ARRAYS = ['diagnoses', 'medications', 'consultations', 'examinations', 'procedures', 'allergies'] as const;
export function assertNoLegacyImportArrays(draft: Record<string, unknown> | null | undefined): void {
  if (!draft) return;
  for (const k of LEGACY_IMPORT_ARRAYS) {
    if (Array.isArray(draft[k])) throw new Error(`LEGACY_IMPORT_CONTRACT_DETECTED: ${k}[] is not allowed in the discharge import draft`);
  }
}

export function sectionsFromNarrative(draft: NarrativeDraft): SectionsResult {
  const tags = draft.boldTags ?? [];
  const refs = draft.sourceReferences ?? [];
  const annFor = (italian: string): SemanticAnnotation[] =>
    tags.filter((t) => t.sectionKey === italian)
      .map((t) => ({ tag: t.tagType as SemanticAnnotation['tag'], text: t.text, startOffset: t.startOffset, endOffset: t.endOffset }));
  const srcFor = (italian: string) =>
    refs.filter((r) => r.sectionKey === italian)
      .map((r) => ({ fileId: r.fileName, pageNumber: r.pageFrom }));

  const sections: SectionData[] = [];
  for (const f of FIELDS) {
    const text = (draft[f.field] as string | undefined) ?? '';
    if (!text.trim() && f.key === 'UNMAPPED_CONTENT') continue;
    sections.push({ sectionKey: f.key, rawText: text, annotations: annFor(f.italian), sourceRanges: srcFor(f.italian) });
  }
  // Allergies as a dedicated ALLERGIES section + the block.
  if ((draft.allergiesText ?? '').trim()) {
    sections.unshift({ sectionKey: 'ALLERGIES', rawText: draft.allergiesText ?? '', annotations: annFor('ALLERGIE'), sourceRanges: srcFor('ALLERGIE') });
  }
  return {
    sections,
    allergies: { status: draft.allergyStatus ?? 'not_documented', rawText: draft.allergiesText ?? '' },
    demographics: {
      firstName: draft.firstName ?? '', lastName: draft.lastName ?? '', dateOfBirth: draft.dateOfBirth ?? '',
      placeOfBirth: draft.placeOfBirth ?? '', sex: draft.sex ?? '', codiceFiscale: draft.fiscalCode ?? '',
      address: draft.address ?? '', phone: draft.phone ?? '', email: draft.email ?? '',
    },
  };
}
