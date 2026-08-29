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
const MAX_SECTIONS = 24;
const MAX_SECTION_TEXT = 100_000;
const MAX_ANNOTATIONS = 128;
const MAX_SOURCE_RANGES = 32;
const MAX_MEDICATIONS = 256;
const MAX_WARNINGS = 128;
const MAX_METADATA_TEXT = 2_000;
const MAX_TOTAL_SECTION_TEXT = 500_000;
const MAX_TOTAL_ANNOTATIONS = 1_280;
const MAX_TOTAL_SOURCE_RANGES = 320;

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function assertArrayBound(value: unknown, max: number, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} deve essere un array`);
  if (value.length > max) throw new Error(`${label} supera il limite di ${max} elementi`);
  return value;
}

function assertStringBound(value: unknown, max: number, label: string): void {
  if (typeof value === 'string' && value.length > max) {
    throw new Error(`${label} supera il limite di ${max} caratteri`);
  }
}

/** Fast, schema-independent limits run before AJV and any merge/indexOf processing. */
function enforceResourceBounds(data: unknown): void {
  const root = objectRecord(data);
  if (!root) throw new Error('Risultato sezioni non valido');
  const sections = assertArrayBound(root.sections, MAX_SECTIONS, 'sections');
  let totalText = 0;
  let totalAnnotations = 0;
  let totalSourceRanges = 0;
  const textBySectionKey = new Map<string, number>();
  const annotationsBySectionKey = new Map<string, number>();
  const rangesBySectionKey = new Map<string, number>();
  for (const [sectionIndex, value] of sections.entries()) {
    const section = objectRecord(value);
    if (!section) continue;
    const rawText = typeof section.rawText === 'string' ? section.rawText : '';
    assertStringBound(rawText, MAX_SECTION_TEXT, `sections[${sectionIndex}].rawText`);
    totalText += rawText.length;
    if (totalText > MAX_TOTAL_SECTION_TEXT) {
      throw new Error(`sections supera il limite totale di ${MAX_TOTAL_SECTION_TEXT} caratteri`);
    }
    const sectionKey = typeof section.sectionKey === 'string' ? section.sectionKey : '';
    const sectionText = (textBySectionKey.get(sectionKey) ?? 0) + rawText.length;
    if (sectionText > MAX_SECTION_TEXT) {
      throw new Error(`sections.${sectionKey} supera il limite aggregato di ${MAX_SECTION_TEXT}`);
    }
    textBySectionKey.set(sectionKey, sectionText);
    assertStringBound(section.detectedHeading, 255, `sections[${sectionIndex}].detectedHeading`);
    const annotations = assertArrayBound(
      section.annotations ?? [],
      MAX_ANNOTATIONS,
      `sections[${sectionIndex}].annotations`,
    );
    totalAnnotations += annotations.length;
    if (totalAnnotations > MAX_TOTAL_ANNOTATIONS) {
      throw new Error(`annotations supera il limite totale di ${MAX_TOTAL_ANNOTATIONS}`);
    }
    const sectionAnnotations = (annotationsBySectionKey.get(sectionKey) ?? 0) + annotations.length;
    if (sectionAnnotations > MAX_ANNOTATIONS) {
      throw new Error(`annotations.${sectionKey} supera il limite aggregato di ${MAX_ANNOTATIONS}`);
    }
    annotationsBySectionKey.set(sectionKey, sectionAnnotations);
    for (const [annotationIndex, annotationValue] of annotations.entries()) {
      const annotation = objectRecord(annotationValue);
      if (!annotation) continue;
      assertStringBound(
        annotation.text,
        MAX_METADATA_TEXT,
        `sections[${sectionIndex}].annotations[${annotationIndex}].text`,
      );
      if (
        Number.isInteger(annotation.startOffset) &&
        Number.isInteger(annotation.endOffset) &&
        ((annotation.startOffset as number) < 0 ||
          (annotation.endOffset as number) <= (annotation.startOffset as number) ||
          (annotation.endOffset as number) > rawText.length)
      ) {
        throw new Error(
          `sections[${sectionIndex}].annotations[${annotationIndex}] offset non valido`,
        );
      }
    }
    const sourceRanges = assertArrayBound(
      section.sourceRanges ?? [],
      MAX_SOURCE_RANGES,
      `sections[${sectionIndex}].sourceRanges`,
    );
    totalSourceRanges += sourceRanges.length;
    if (totalSourceRanges > MAX_TOTAL_SOURCE_RANGES) {
      throw new Error(`sourceRanges supera il limite totale di ${MAX_TOTAL_SOURCE_RANGES}`);
    }
    const sectionRanges = (rangesBySectionKey.get(sectionKey) ?? 0) + sourceRanges.length;
    if (sectionRanges > MAX_SOURCE_RANGES) {
      throw new Error(
        `sourceRanges.${sectionKey} supera il limite aggregato di ${MAX_SOURCE_RANGES}`,
      );
    }
    rangesBySectionKey.set(sectionKey, sectionRanges);
    for (const [rangeIndex, rangeValue] of sourceRanges.entries()) {
      const range = objectRecord(rangeValue);
      if (!range) continue;
      assertStringBound(
        range.fileId,
        128,
        `sections[${sectionIndex}].sourceRanges[${rangeIndex}].fileId`,
      );
    }
    for (const [medicationIndex, medicationValue] of assertArrayBound(
      section.medications ?? [],
      MAX_MEDICATIONS,
      `sections[${sectionIndex}].medications`,
    ).entries()) {
      const medication = objectRecord(medicationValue);
      if (!medication) continue;
      for (const field of [
        'medicationName',
        'dose',
        'schedule',
        'frequency',
        'route',
        'duration',
        'exactText',
      ]) {
        assertStringBound(
          medication[field],
          field === 'exactText' ? 5_000 : 1_000,
          `sections[${sectionIndex}].medications[${medicationIndex}].${field}`,
        );
      }
      assertArrayBound(
        medication.warnings ?? [],
        MAX_WARNINGS,
        `sections[${sectionIndex}].medications[${medicationIndex}].warnings`,
      );
    }
    assertArrayBound(section.warnings ?? [], MAX_WARNINGS, `sections[${sectionIndex}].warnings`);
  }
  const allergies = objectRecord(root.allergies);
  if (allergies) {
    assertStringBound(allergies.rawText, MAX_SECTION_TEXT, 'allergies.rawText');
    assertStringBound(allergies.sourceFileId, 128, 'allergies.sourceFileId');
    assertArrayBound(allergies.warnings ?? [], MAX_WARNINGS, 'allergies.warnings');
  }
  const demographics = objectRecord(root.demographics);
  if (demographics) {
    for (const [key, value] of Object.entries(demographics)) {
      assertStringBound(value, key === 'address' ? 1_000 : 255, `demographics.${key}`);
    }
  }
}

function projectSection(section: Section): Section {
  return {
    sectionKey: section.sectionKey,
    ...(section.detectedHeading !== undefined ? { detectedHeading: section.detectedHeading } : {}),
    rawText: section.rawText,
    ...(section.sourceRanges !== undefined
      ? {
          sourceRanges: section.sourceRanges.map((value) => {
            const range = value as Record<string, unknown>;
            return {
              ...(range.fileId !== undefined ? { fileId: range.fileId } : {}),
              ...(range.pageNumber !== undefined ? { pageNumber: range.pageNumber } : {}),
              ...(range.startOffset !== undefined ? { startOffset: range.startOffset } : {}),
              ...(range.endOffset !== undefined ? { endOffset: range.endOffset } : {}),
            };
          }),
        }
      : {}),
    ...(section.annotations !== undefined
      ? {
          annotations: section.annotations.map((annotation) => ({
            tag: annotation.tag,
            text: annotation.text,
            startOffset: annotation.startOffset,
            endOffset: annotation.endOffset,
          })),
        }
      : {}),
    ...(section.medications !== undefined
      ? {
          medications: section.medications.map((medication) => ({
            ...(medication.medicationName !== undefined
              ? { medicationName: medication.medicationName }
              : {}),
            ...(medication.dose !== undefined ? { dose: medication.dose } : {}),
            ...(medication.schedule !== undefined ? { schedule: medication.schedule } : {}),
            ...(medication.frequency !== undefined ? { frequency: medication.frequency } : {}),
            ...(medication.route !== undefined ? { route: medication.route } : {}),
            ...(medication.duration !== undefined ? { duration: medication.duration } : {}),
            exactText: medication.exactText,
            ...(medication.warnings !== undefined ? { warnings: [...medication.warnings] } : {}),
          })),
        }
      : {}),
    ...(section.warnings !== undefined ? { warnings: [...section.warnings] } : {}),
  };
}

export interface SectionsValidation {
  valid: boolean;
  errors: string[];
}

/** Structural validation against the JSON Schema asset. */
export function validateSectionsSchema(data: unknown): SectionsValidation {
  const validate = getValidator();
  const valid = validate(data) as boolean;
  if (valid) return { valid: true, errors: [] };
  const errors = (validate.errors ?? [])
    .slice(0, 20)
    .map((e) => `${e.instancePath || '(root)'} ${e.message ?? 'invalid'}`.trim());
  return { valid: false, errors };
}

function pushWarn(list: string[] | undefined, w: string): string[] {
  const out = Array.isArray(list) ? [...list] : [];
  if (!out.includes(w)) out.push(w);
  return out;
}

/** Keep only annotations that map to an EXACT substring of rawText (relocate when offsets drift). */
function reconcileAnnotations(
  rawText: string,
  anns: Annotation[] | undefined,
): { annotations: Annotation[]; warnings: string[] } {
  const warnings: string[] = [];
  const out: Annotation[] = [];
  for (const a of anns ?? []) {
    if (!a || typeof a.text !== 'string' || !TAG_SET.has(a.tag)) continue;
    if (HTML_TAG.test(a.text)) {
      warnings.push('ANNOTATION_HTML_REMOVED');
      continue;
    }
    const exact = rawText.slice(a.startOffset, a.endOffset) === a.text;
    if (exact) {
      out.push(a);
      continue;
    }
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
    if (!cur) {
      byKey.set(s.sectionKey, { ...s });
      continue;
    }
    const sep = cur.rawText.endsWith('\n') || !cur.rawText ? '' : '\n';
    const shift = cur.rawText.length + sep.length;
    const shifted = (s.annotations ?? []).map((a) => ({
      ...a,
      startOffset: a.startOffset + shift,
      endOffset: a.endOffset + shift,
    }));
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
    else if (!section.rawText.includes(exact))
      warnings = pushWarn(warnings, 'MEDICATION_TEXT_MISSING_FROM_RAW');
    const incomplete = MED_KEYS.some((k) => !((m[k] as string | undefined) ?? '').trim());
    if (incomplete && exact)
      warnings = pushWarn(warnings, 'MEDICATION_COMPONENTS_NOT_FULLY_IDENTIFIED');
    return { ...m, exactText: m.exactText ?? '', warnings };
  });
  return { ...section, medications: meds };
}

/**
 * Validate + post-process the raw model output into a guaranteed-faithful SectionsResult.
 * Never throws on model imperfections — it repairs (relocate/drop annotations, collapse
 * duplicate sections, add warnings) and reports. Throws only on a structurally invalid shape.
 */
export function postProcessSections(
  data: unknown,
  profile: DocumentProfile = loadProfile(),
): SectionsResult {
  enforceResourceBounds(data);
  const schemaCheck = validateSectionsSchema(data);
  if (!schemaCheck.valid)
    throw new Error(`Sezioni non conformi allo schema: ${schemaCheck.errors.join('; ')}`);

  const input = data as {
    sections: Section[];
    allergies?: AllergyBlock;
    demographics?: Record<string, unknown>;
  };
  const medSections = new Set<SectionKey>(profile.medicationSections);

  let sections = collapseDuplicates(input.sections.map(projectSection));
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
  const status: AllergyStatus = (ALLERGY_STATUSES as readonly string[]).includes(a.status)
    ? a.status
    : 'not_documented';
  const allergies: AllergyBlock = {
    status,
    ...(a.rawText !== undefined ? { rawText: a.rawText } : {}),
    ...(a.sourceFileId !== undefined ? { sourceFileId: a.sourceFileId } : {}),
    ...(a.sourcePage !== undefined ? { sourcePage: a.sourcePage } : {}),
    ...(a.warnings !== undefined ? { warnings: [...a.warnings] } : {}),
  };
  const demographics = input.demographics
    ? Object.fromEntries(
        [
          'firstName',
          'lastName',
          'dateOfBirth',
          'placeOfBirth',
          'sex',
          'codiceFiscale',
          'address',
          'phone',
          'email',
          'medicalRecordNumber',
        ]
          .filter((key) => input.demographics?.[key] !== undefined)
          .map((key) => [key, input.demographics![key]]),
      )
    : undefined;

  return { sections, allergies, demographics };
}

/** Confirmation must be blocked when allergy information is contradictory (REQ-026). */
export function isConfirmBlocked(sections: SectionsResult | null | undefined): boolean {
  return sections?.allergies?.status === 'conflicting';
}
