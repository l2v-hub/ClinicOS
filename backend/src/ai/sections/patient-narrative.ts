// Patient narrative clinical sections — persistence + DTO (REQ-029).
//
// Every patient can always show the canonical clinical sections as faithful narrative
// TEXT (imported from a discharge letter or filled manually). originalText is immutable;
// operator edits live in reviewedText; displayText = reviewedText ?? originalText.
// This coexists with legacy structured data — it never deletes it.

import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { DischargeNarrativeDraft } from './narrative.js';

export const NARRATIVE_SECTION_KEYS = [
  'ALLERGIES',
  'DIAGNOSIS',
  'ANAMNESIS',
  'HOSPITAL_COURSE',
  'CONSULTATIONS',
  'IMAGING_DIAGNOSTICS',
  'PROCEDURES_AND_INTERVENTIONS',
  'THERAPY',
  'ADVICE_AND_FOLLOW_UP',
  'UNMAPPED_CONTENT',
] as const;
export type NarrativeSectionKey = (typeof NARRATIVE_SECTION_KEYS)[number];

export const NARRATIVE_TITLES: Record<NarrativeSectionKey, string> = {
  ALLERGIES: 'Allergie',
  DIAGNOSIS: 'Diagnosi',
  ANAMNESIS: 'Anamnesi',
  HOSPITAL_COURSE: 'Decorso ospedaliero',
  CONSULTATIONS: 'Consulenze',
  IMAGING_DIAGNOSTICS: 'Diagnostica per immagini',
  PROCEDURES_AND_INTERVENTIONS: 'Prestazioni e interventi',
  THERAPY: 'Terapia',
  ADVICE_AND_FOLLOW_UP: 'Consigli e controlli',
  UNMAPPED_CONTENT: 'Contenuto non classificato',
};

// Narrative draft (REQ-028) text field + its Italian tag/source key -> persistence key.
const FROM_DRAFT: Array<{
  key: NarrativeSectionKey;
  field: keyof DischargeNarrativeDraft;
  italian: string;
}> = [
  { key: 'ALLERGIES', field: 'allergiesText', italian: 'ALLERGIE' },
  { key: 'DIAGNOSIS', field: 'diagnosisText', italian: 'DIAGNOSI' },
  { key: 'ANAMNESIS', field: 'anamnesisText', italian: 'ANAMNESI' },
  { key: 'HOSPITAL_COURSE', field: 'hospitalCourseText', italian: 'DECORSO_OSPEDALIERO' },
  { key: 'CONSULTATIONS', field: 'consultationsText', italian: 'CONSULENZE' },
  {
    key: 'IMAGING_DIAGNOSTICS',
    field: 'imagingDiagnosticsText',
    italian: 'DIAGNOSTICA_PER_IMMAGINI',
  },
  {
    key: 'PROCEDURES_AND_INTERVENTIONS',
    field: 'proceduresAndInterventionsText',
    italian: 'PRESTAZIONI_E_INTERVENTI',
  },
  { key: 'THERAPY', field: 'therapyText', italian: 'TERAPIA' },
  { key: 'ADVICE_AND_FOLLOW_UP', field: 'adviceAndFollowUpText', italian: 'CONSIGLI_E_CONTROLLI' },
  { key: 'UNMAPPED_CONTENT', field: 'unmappedText', italian: 'CONTENUTO_NON_CLASSIFICATO' },
];

export interface NarrativeSectionRow {
  sectionKey: NarrativeSectionKey;
  originalText: string;
  annotations: unknown[];
  sourceReferences: unknown[];
  reviewStatus: string;
}

/** Project a discharge narrative draft into per-section persistence rows (no DB access). */
export function narrativeDraftToSectionRows(draft: DischargeNarrativeDraft): NarrativeSectionRow[] {
  const tags = Array.isArray(draft.boldTags) ? draft.boldTags : [];
  const refs = Array.isArray(draft.sourceReferences) ? draft.sourceReferences : [];
  const conflict = draft.allergyStatus === 'conflicting' || draft.allergyStatus === 'unclear';
  return FROM_DRAFT.map(({ key, field, italian }) => {
    const originalText = typeof draft[field] === 'string' ? (draft[field] as string) : '';
    return {
      sectionKey: key,
      originalText,
      annotations: tags.filter((t) => (t as { sectionKey?: string }).sectionKey === italian),
      sourceReferences: refs.filter((r) => (r as { sectionKey?: string }).sectionKey === italian),
      reviewStatus:
        key === 'ALLERGIES' && conflict ? 'conflict' : originalText.trim() ? 'pending' : 'absent',
    };
  });
}

export interface NarrativeSectionDTO {
  sectionKey: NarrativeSectionKey;
  title: string;
  originalText: string;
  reviewedText: string;
  displayText: string;
  annotations: unknown[];
  sourceReferences: unknown[];
  reviewStatus: string;
}

/** displayText = reviewedText when the operator edited it, else the immutable originalText. */
export function pickDisplayText(originalText: string, reviewedText: string): string {
  return reviewedText.trim() ? reviewedText : originalText;
}

function toDTO(
  key: NarrativeSectionKey,
  row:
    | {
        originalText?: string | null;
        reviewedText?: string | null;
        annotations?: unknown;
        sourceReferences?: unknown;
        reviewStatus?: string | null;
      }
    | undefined,
): NarrativeSectionDTO {
  const originalText = row?.originalText ?? '';
  const reviewedText = row?.reviewedText ?? '';
  return {
    sectionKey: key,
    title: NARRATIVE_TITLES[key],
    originalText,
    reviewedText,
    displayText: pickDisplayText(originalText, reviewedText),
    annotations: Array.isArray(row?.annotations) ? (row!.annotations as unknown[]) : [],
    sourceReferences: Array.isArray(row?.sourceReferences)
      ? (row!.sourceReferences as unknown[])
      : [],
    reviewStatus: row?.reviewStatus ?? 'absent',
  };
}

/** All canonical sections for a patient — empty (reviewStatus 'absent') when no row exists. */
export async function getNarrativeSections(patientId: string): Promise<NarrativeSectionDTO[]> {
  const rows = await prisma.patientNarrativeSection.findMany({ where: { patientId } });
  const byKey = new Map(rows.map((r) => [r.sectionKey, r]));
  return NARRATIVE_SECTION_KEYS.map((k) => toDTO(k, byKey.get(k) as never));
}

export async function getNarrativeSection(
  patientId: string,
  sectionKey: string,
): Promise<NarrativeSectionDTO | null> {
  if (!NARRATIVE_SECTION_KEYS.includes(sectionKey as NarrativeSectionKey)) return null;
  const row = await prisma.patientNarrativeSection.findUnique({
    where: { patientId_sectionKey: { patientId, sectionKey } },
  });
  return toDTO(sectionKey as NarrativeSectionKey, row as never);
}

/** Upsert a manual/reviewed edit. originalText is set only when the row is first created;
 *  later it is NEVER overwritten — edits go to reviewedText. */
export async function upsertNarrativeSection(
  patientId: string,
  sectionKey: NarrativeSectionKey,
  input: {
    reviewedText?: string;
    originalText?: string;
    reviewStatus?: string;
    updatedBy?: string;
  },
): Promise<NarrativeSectionDTO> {
  const existing = await prisma.patientNarrativeSection.findUnique({
    where: { patientId_sectionKey: { patientId, sectionKey } },
  });
  const reviewStatus =
    input.reviewStatus ??
    (input.reviewedText?.trim() ? 'modified' : (existing?.reviewStatus ?? 'pending'));
  const row = await prisma.patientNarrativeSection.upsert({
    where: { patientId_sectionKey: { patientId, sectionKey } },
    create: {
      patientId,
      sectionKey,
      originalText: input.originalText ?? '',
      reviewedText: input.reviewedText ?? null,
      reviewStatus,
      updatedBy: input.updatedBy,
    },
    update: {
      // originalText intentionally NOT updated — immutable once created.
      reviewedText: input.reviewedText ?? existing?.reviewedText ?? null,
      reviewStatus,
      updatedBy: input.updatedBy,
    },
  });
  return toDTO(sectionKey, row as never);
}

/** Persist narrative sections inside an import-confirm transaction (originalText immutable). */
export async function persistNarrativeFromDraft(
  tx: Prisma.TransactionClient,
  patientId: string,
  draft: DischargeNarrativeDraft,
  importJobId: string | null,
  createdBy?: string,
): Promise<void> {
  for (const row of narrativeDraftToSectionRows(draft)) {
    await tx.patientNarrativeSection.upsert({
      where: { patientId_sectionKey: { patientId, sectionKey: row.sectionKey } },
      create: {
        patientId,
        sectionKey: row.sectionKey,
        originalText: row.originalText,
        annotations: row.annotations as Prisma.InputJsonValue,
        sourceReferences: row.sourceReferences as Prisma.InputJsonValue,
        importJobId: importJobId ?? undefined,
        reviewStatus: row.reviewStatus,
        createdBy,
      },
      update: {
        // Re-import merges into reviewedText path elsewhere; never clobber the original.
        annotations: row.annotations as Prisma.InputJsonValue,
        sourceReferences: row.sourceReferences as Prisma.InputJsonValue,
      },
    });
  }
}
