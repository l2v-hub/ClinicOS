// Document profile for faithful clinical-section extraction (REQ-026).
//
// The Imola profile maps the document's free-form headings onto the canonical
// ClinicOS section keys. It is plain configuration (a JSON asset) so aliases and
// sections can be edited backend-side and redeployed WITHOUT any frontend change.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// backend/{dist|src}/ai/sections -> backend root -> ai-assets
const BACKEND_ROOT = resolve(HERE, '..', '..', '..');
const DEFAULT_PROFILE_PATH = resolve(BACKEND_ROOT, 'ai-assets', 'imola-profile.json');

export const SECTION_KEYS = [
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
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export const SEMANTIC_TAGS = [
  'SECTION_TITLE',
  'SUBSECTION_TITLE',
  'DATE',
  'TIME',
  'TEMPORAL_MARKER',
  'MEDICATION_NAME',
  'DOSE',
  'SCHEDULE',
  'FREQUENCY',
  'ALLERGY_CRITICAL',
  'WARNING_TEXT',
] as const;

export type SemanticTag = (typeof SEMANTIC_TAGS)[number];

export const ALLERGY_STATUSES = [
  'present',
  'explicitly_absent',
  'conflicting',
  'not_documented',
  'unclear',
] as const;

export type AllergyStatus = (typeof ALLERGY_STATUSES)[number];

export interface ProfileSection {
  key: SectionKey;
  label: string;
  aliases: string[];
}

export interface DocumentProfile {
  profileId: string;
  label: string;
  description?: string;
  version: number;
  sections: ProfileSection[];
  tags: SemanticTag[];
  allergyStatuses: AllergyStatus[];
  /** Section keys whose rawText is parsed into structured medication lines. */
  medicationSections: SectionKey[];
}

let cached: DocumentProfile | null = null;

function profilePath(): string {
  return process.env.AI_SECTIONS_PROFILE_PATH?.trim() || DEFAULT_PROFILE_PATH;
}

/** Load the document profile (cached). Throws only if the asset is unreadable/invalid. */
export function loadProfile(force = false): DocumentProfile {
  if (cached && !force) return cached;
  const raw = JSON.parse(readFileSync(profilePath(), 'utf8')) as DocumentProfile;
  if (!Array.isArray(raw.sections) || raw.sections.length === 0) {
    throw new Error('Profilo documentale non valido: sezioni mancanti');
  }
  cached = raw;
  return cached;
}

/** Reset the cached profile (tests). */
export function _resetProfile(): void {
  cached = null;
}
