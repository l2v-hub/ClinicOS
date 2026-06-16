// Discharge-letter NARRATIVE draft contract (REQ-028).
//
// The discharge letter is imported as faithful narrative TEXT, not structured arrays.
// This builds the flat `clinicos-discharge-narrative-v1` draft from REQ-026's already-
// faithful `_sections` (one model pass, deterministic transform). By construction it
// contains NO diagnoses[]/medications[]/consultations[] arrays — each clinical section is
// a single text block, with semantic emphasis carried as offset boldTags (never HTML).

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ajv, type ValidateFunction } from 'ajv';
import type { AllergyStatus, SectionKey } from './profile.js';
import type { Annotation, Section, SectionsResult } from './validate.js';

export const NARRATIVE_SCHEMA_VERSION = 'clinicos-discharge-narrative-v1';

export interface NarrativeTag {
  sectionKey: string;       // Italian canonical key (DIAGNOSI, ANAMNESI, ...)
  tagType: string;
  text: string;
  startOffset: number;
  endOffset: number;
}

export interface SourceReference {
  sectionKey: string;
  fileId?: string;
  fileName?: string;
  pageFrom?: number;
  pageTo?: number;
}

export interface DischargeNarrativeDraft {
  schemaVersion: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  sex: string;
  fiscalCode: string;
  address: string;
  phone: string;
  email: string;
  allergyStatus: AllergyStatus;
  allergiesText: string;
  diagnosisText: string;
  anamnesisText: string;
  hospitalCourseText: string;
  consultationsText: string;
  imagingDiagnosticsText: string;
  proceduresAndInterventionsText: string;
  therapyText: string;
  adviceAndFollowUpText: string;
  unmappedText: string;
  boldTags: NarrativeTag[];
  sourceReferences: SourceReference[];
  missingSections: string[];
  warnings: string[];
}

// Narrative text field <- canonical EN section key(s) + Italian key. Therapy intentionally
// merges home + hospital therapy into one faithful block (home first), losing nothing.
interface FieldSpec { field: keyof DischargeNarrativeDraft; italian: string; keys: SectionKey[] }
const TEXT_FIELDS: FieldSpec[] = [
  { field: 'diagnosisText', italian: 'DIAGNOSI', keys: ['DISCHARGE_DIAGNOSIS'] },
  { field: 'anamnesisText', italian: 'ANAMNESI', keys: ['ANAMNESIS'] },
  { field: 'hospitalCourseText', italian: 'DECORSO_OSPEDALIERO', keys: ['HOSPITAL_COURSE'] },
  { field: 'consultationsText', italian: 'CONSULENZE', keys: ['CONSULTATIONS'] },
  { field: 'imagingDiagnosticsText', italian: 'DIAGNOSTICA_PER_IMMAGINI', keys: ['IMAGING_DIAGNOSTICS'] },
  { field: 'proceduresAndInterventionsText', italian: 'PRESTAZIONI_E_INTERVENTI', keys: ['PROCEDURES_AND_INTERVENTIONS'] },
  { field: 'therapyText', italian: 'TERAPIA', keys: ['DISCHARGE_HOME_THERAPY', 'HOSPITAL_THERAPY'] },
  { field: 'adviceAndFollowUpText', italian: 'CONSIGLI_E_CONTROLLI', keys: ['ADVICE_AND_FOLLOW_UP'] },
  { field: 'unmappedText', italian: 'CONTENUTO_NON_CLASSIFICATO', keys: ['UNMAPPED_CONTENT'] },
];

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Concatenate the contributing sections into one faithful block; shift annotations; gather sources. */
function buildField(
  sections: Section[],
  italian: string,
  docName: (id?: string) => string,
): { text: string; tags: NarrativeTag[]; sources: SourceReference[] } {
  let text = '';
  const tags: NarrativeTag[] = [];
  const sources: SourceReference[] = [];
  for (const s of sections) {
    if (!s || typeof s.rawText !== 'string' || s.rawText === '') continue;
    const base = text.length === 0 ? 0 : text.length + 1; // +1 for the '\n' separator
    if (text.length > 0) text += '\n';
    text += s.rawText;
    for (const a of s.annotations ?? []) tags.push(annToTag(a, italian, base));
    for (const sr of s.sourceRanges ?? []) {
      const r = sr as { fileId?: string; pageNumber?: number };
      sources.push({ sectionKey: italian, fileId: r.fileId, fileName: docName(r.fileId), pageFrom: r.pageNumber, pageTo: r.pageNumber });
    }
  }
  return { text, tags, sources };
}

function annToTag(a: Annotation, italian: string, shift: number): NarrativeTag {
  return { sectionKey: italian, tagType: a.tag, text: a.text, startOffset: a.startOffset + shift, endOffset: a.endOffset + shift };
}

/** Pure transform: faithful sections -> flat narrative draft (no structured arrays). */
export function buildNarrativeDraft(
  sections: SectionsResult,
  documents: Array<{ id: string; filename: string }> = [],
): DischargeNarrativeDraft {
  const nameById = new Map(documents.map((d) => [d.id, d.filename]));
  const docName = (id?: string) => (id && nameById.get(id)) || documents[0]?.filename || '';

  const byKey = new Map<SectionKey, Section>();
  for (const s of sections.sections ?? []) byKey.set(s.sectionKey, s);

  const demo = (sections.demographics ?? {}) as Record<string, unknown>;
  const allergy = sections.allergies ?? { status: 'not_documented' as AllergyStatus };
  const allergySection = byKey.get('ALLERGIES');

  const draft: DischargeNarrativeDraft = {
    schemaVersion: NARRATIVE_SCHEMA_VERSION,
    firstName: str(demo.firstName), lastName: str(demo.lastName), dateOfBirth: str(demo.dateOfBirth),
    placeOfBirth: str(demo.placeOfBirth), sex: str(demo.sex),
    fiscalCode: str(demo.fiscalCode) || str(demo.codiceFiscale),
    address: str(demo.address), phone: str(demo.phone), email: str(demo.email),
    allergyStatus: allergy.status, allergiesText: str(allergy.rawText) || str(allergySection?.rawText),
    diagnosisText: '', anamnesisText: '', hospitalCourseText: '', consultationsText: '',
    imagingDiagnosticsText: '', proceduresAndInterventionsText: '', therapyText: '',
    adviceAndFollowUpText: '', unmappedText: '',
    boldTags: [], sourceReferences: [], missingSections: [], warnings: [...(allergy.warnings ?? [])],
  };

  // Allergy annotations + source (allergies are top priority).
  for (const a of allergySection?.annotations ?? []) draft.boldTags.push(annToTag(a, 'ALLERGIE', 0));
  for (const sr of allergySection?.sourceRanges ?? []) {
    const r = sr as { fileId?: string; pageNumber?: number };
    draft.sourceReferences.push({ sectionKey: 'ALLERGIE', fileId: r.fileId, fileName: docName(r.fileId), pageFrom: r.pageNumber, pageTo: r.pageNumber });
  }

  for (const spec of TEXT_FIELDS) {
    const secs = spec.keys.map((k) => byKey.get(k)).filter((s): s is Section => !!s);
    const { text, tags, sources } = buildField(secs, spec.italian, docName);
    (draft[spec.field] as string) = text;
    draft.boldTags.push(...tags);
    draft.sourceReferences.push(...sources);
    for (const s of secs) draft.warnings.push(...(s.warnings ?? []));
    if (!text.trim() && spec.italian !== 'CONTENUTO_NON_CLASSIFICATO') draft.missingSections.push(spec.italian);
  }
  if (!draft.allergiesText.trim() && allergy.status === 'not_documented') draft.missingSections.push('ALLERGIE');

  draft.warnings = [...new Set(draft.warnings)];
  return draft;
}

// ── AJV validation against the flat contract ────────────────────────────────
const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(HERE, '..', '..', '..', 'ai-assets', 'clinicos-discharge-narrative.schema.json');
let validator: ValidateFunction | null = null;
export function _resetNarrativeValidator(): void { validator = null; }

export function validateNarrativeDraft(data: unknown): { valid: boolean; errors: string[] } {
  if (!validator) {
    const ajv = new Ajv({ allErrors: true, strict: false });
    validator = ajv.compile(JSON.parse(readFileSync(process.env.AI_NARRATIVE_SCHEMA_PATH?.trim() || SCHEMA_PATH, 'utf8')));
  }
  const valid = validator(data) as boolean;
  if (valid) return { valid: true, errors: [] };
  return { valid: false, errors: (validator.errors ?? []).slice(0, 20).map((e) => `${e.instancePath || '(root)'} ${e.message ?? 'invalid'}`.trim()) };
}
