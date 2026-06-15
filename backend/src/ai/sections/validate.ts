// Validation + faithful post-processing of the sections contract (REQ-026).
//
// The model is fallible, so this layer GUARANTEES the contract deterministically:
// rawText is never mutated, annotations must reference an exact substring (else they
// are relocated or dropped — text wins over offsets), duplicate section keys collapse
// into one block, medication lines keep exactText, and allergy conflicts surface a
// hard confirm-block signal. No clinical text is ever summarised or rewritten here.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ajv, type ValidateFunction } from 'ajv';
import {
  ALLERGY_STATUSES,
  SEMANTIC_TAGS,
  loadProfile,
  type AllergyStatus,
  type DocumentProfile,
  type SectionKey,
  type SemanticTag,
} from './profile.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = resolve(HERE, '..', '..', '..');
const DEFAULT_SCHEMA_PATH = resolve(BACKEND_ROOT, 'ai-assets', 'clinicos-sections.schema.json');

function schemaPath(): string {
  return process.env.AI_SECTIONS_SCHEMA_PATH?.trim() || DEFAULT_SCHEMA_PATH;
}

let validator: ValidateFunction | null = null;
function getValidator(): ValidateFunction {
  if (validator) return validator;
  const ajv = new Ajv({ allErrors: true, strict: false });
  validator = ajv.compile(JSON.parse(readFileSync(schemaPath(), 'utf8')));
  return validator;
}

export function _resetSectionsValidator(): void {
  validator = null;
}

export interface Annotation {
  tag: SemanticTag;
  text: string;
  startOffset: number;
  endOffset: number;
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

export interface Section {
  sectionKey: SectionKey;
  detectedHeading?: string;
  rawText: string;
  sourceRanges?: unknown[];
  annotations?: Annotation[];
  medications?: MedicationLine[];
  warnings?: string[];
}

export interface AllergyBlock {
  status: AllergyStatus;
  rawText?: string;
  sourceFileId?: string;
  sourcePage?: number;
  warnings?: string[];
}

export interface SectionsResult {
  sections: Section[];
  allergies: AllergyBlock;
  demographics?: Record<string, unknown>;
}

const HTML_TAG = /<\/?(?:b|strong|em|i|u|span|font)\b[^>]*>/i;
const TAG_SET = new Set<string>(SEMANTIC_TAGS);
const MED_KEYS: Array<keyof MedicationLine> = ['medicationName', 'dose', 'schedule', 'frequency'];

export interface SectionsValidation {
  valid: boolean;
  errors: string[];
}

/** Structural validation against the JSON Schema asset. */
export function validateSectionsSchema(data: unknown): SectionsValidation {
  const validate = getValidator();
  const valid = validate(data) as boolean;
  if (valid) return { valid: true, errors: [] };
  const errors = (validate.errors ?? []).slice(0, 20).map((e) => `${e.instancePath || '(root)'} ${e.message ?? 'invalid'}`.trim());
  return { valid: false, errors };
}

function pushWarn(list: string[] | undefined, w: string): string[] {
  const out = Array.isArray(list) ? [...list] : [];
  if (!out.includes(w)) out.push(w);
  return out;
}

/** Keep only annotations that map to an EXACT substring of rawText (relocate when offsets drift). */
function reconcileAnnotations(rawText: string, anns: Annotation[] | undefined): { annotations: Annotation[]; warnings: string[] } {
  const warnings: string[] = [];
  const out: Annotation[] = [];
  for (const a of anns ?? []) {
    if (!a || typeof a.text !== 'string' || !TAG_SET.has(a.tag)) continue;
    if (HTML_TAG.test(a.text)) { warnings.push('ANNOTATION_HTML_REMOVED'); continue; }
    const exact = rawText.slice(a.startOffset, a.endOffset) === a.text;
    if (exact) { out.push(a); continue; }
    const idx = rawText.indexOf(a.text);
    if (idx >= 0 && a.text.length > 0) {
      out.push({ ...a, startOffset: idx, endOffset: idx + a.text.length });
      warnings.push('ANNOTATION_OFFSET_CORRECTED');
    } else {
      warnings.push('ANNOTATION_OFFSET_MISMATCH');
    }
  }
  return { annotations: out, warnings };
}

/** Collapse repeated section keys into a single faithful block (offsets shifted, order preserved). */
function collapseDuplicates(sections: Section[]): Section[] {
  const byKey = new Map<SectionKey, Section>();
  for (const s of sections) {
    const cur = byKey.get(s.sectionKey);
    if (!cur) { byKey.set(s.sectionKey, { ...s }); continue; }
    const sep = cur.rawText.endsWith('\n') || !cur.rawText ? '' : '\n';
    const shift = cur.rawText.length + sep.length;
    const shifted = (s.annotations ?? []).map((a) => ({ ...a, startOffset: a.startOffset + shift, endOffset: a.endOffset + shift }));
    cur.rawText = cur.rawText + sep + s.rawText;
    cur.annotations = [...(cur.annotations ?? []), ...shifted];
    cur.sourceRanges = [...(cur.sourceRanges ?? []), ...(s.sourceRanges ?? [])];
    cur.medications = [...(cur.medications ?? []), ...(s.medications ?? [])];
    cur.warnings = [...(cur.warnings ?? []), ...(s.warnings ?? []), 'SECTION_MERGED_DUPLICATE'];
  }
  return [...byKey.values()];
}

function normalizeMedications(section: Section): Section {
  const meds = (section.medications ?? []).map((m) => {
    let warnings = Array.isArray(m.warnings) ? [...m.warnings] : [];
    const exact = (m.exactText ?? '').trim();
    if (!exact) warnings = pushWarn(warnings, 'MEDICATION_EXACT_TEXT_MISSING');
    else if (!section.rawText.includes(exact)) warnings = pushWarn(warnings, 'MEDICATION_TEXT_MISSING_FROM_RAW');
    const incomplete = MED_KEYS.some((k) => !((m[k] as string | undefined) ?? '').trim());
    if (incomplete && exact) warnings = pushWarn(warnings, 'MEDICATION_COMPONENTS_NOT_FULLY_IDENTIFIED');
    return { ...m, exactText: m.exactText ?? '', warnings };
  });
  return { ...section, medications: meds };
}

/**
 * Validate + post-process the raw model output into a guaranteed-faithful SectionsResult.
 * Never throws on model imperfections — it repairs (relocate/drop annotations, collapse
 * duplicate sections, add warnings) and reports. Throws only on a structurally invalid shape.
 */
export function postProcessSections(data: unknown, profile: DocumentProfile = loadProfile()): SectionsResult {
  const schemaCheck = validateSectionsSchema(data);
  if (!schemaCheck.valid) throw new Error(`Sezioni non conformi allo schema: ${schemaCheck.errors.join('; ')}`);

  const input = data as { sections: Section[]; allergies?: AllergyBlock; demographics?: Record<string, unknown> };
  const medSections = new Set<SectionKey>(profile.medicationSections);

  let sections = collapseDuplicates(input.sections);
  sections = sections.map((s) => {
    let warnings = Array.isArray(s.warnings) ? [...s.warnings] : [];
    if (HTML_TAG.test(s.rawText)) warnings = pushWarn(warnings, 'RAWTEXT_HTML_DETECTED');
    const { annotations, warnings: annWarn } = reconcileAnnotations(s.rawText, s.annotations);
    for (const w of annWarn) warnings = pushWarn(warnings, w);
    let out: Section = { ...s, annotations, warnings };
    if (medSections.has(s.sectionKey)) out = normalizeMedications(out);
    return out;
  });

  // Allergies are top-priority: default to not_documented (absence of text != absence of allergies).
  const a = input.allergies ?? ({} as AllergyBlock);
  const status: AllergyStatus = (ALLERGY_STATUSES as readonly string[]).includes(a.status) ? a.status : 'not_documented';
  const allergies: AllergyBlock = { ...a, status };

  return { sections, allergies, demographics: input.demographics };
}

/** Confirmation must be blocked when allergy information is contradictory (REQ-026). */
export function isConfirmBlocked(sections: SectionsResult | null | undefined): boolean {
  return sections?.allergies?.status === 'conflicting';
}
