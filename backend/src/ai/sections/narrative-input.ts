export class NarrativeInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NarrativeInputError';
  }
}

const MAX_NARRATIVE_TEXT = 100_000;
const REVIEW_STATUSES = new Set(['absent', 'pending', 'modified', 'reviewed', 'conflict']);
const MAX_ANNOTATIONS_PER_SECTION = 256;
const MAX_SOURCE_REFERENCES_PER_SECTION = 64;
const MAX_NARRATIVE_ANNOTATIONS = 1_280;
const MAX_NARRATIVE_SOURCE_REFERENCES = 320;
const MAX_ANNOTATION_TEXT = 2_000;
const MAX_SOURCE_NAME = 255;
const MAX_SOURCE_ID = 128;
const MAX_PAGE_NUMBER = 100_000;
const ANNOTATION_TYPES = new Set([
  'SECTION_TITLE',
  'SUBSECTION_TITLE',
  'DATE',
  'TIME',
  'TEMPORAL_MARKER',
  'ALLERGY_CRITICAL',
  'MEDICATION_NAME',
  'DOSE',
  'FREQUENCY',
  'SCHEDULE',
  'WARNING_TEXT',
]);

export interface NarrativeSaveInput {
  reviewedText?: string;
  originalText?: string;
  reviewStatus?: string;
}

export interface NarrativeAnnotationInput {
  sectionKey: string;
  tagType: string;
  text: string;
  startOffset: number;
  endOffset: number;
}

export interface NarrativeSourceReferenceInput {
  sectionKey: string;
  fileId?: string;
  fileName?: string;
  pageFrom?: number;
  pageTo?: number;
}

/** Reject oversized draft arrays before section routing/filtering can amplify CPU work. */
export function assertNarrativeDraftMetadataBounds(value: {
  boldTags?: unknown;
  sourceReferences?: unknown;
}): void {
  if (!Array.isArray(value.boldTags) || value.boldTags.length > MAX_NARRATIVE_ANNOTATIONS) {
    throw new NarrativeInputError('boldTags non validi o troppo numerosi');
  }
  if (
    !Array.isArray(value.sourceReferences) ||
    value.sourceReferences.length > MAX_NARRATIVE_SOURCE_REFERENCES
  ) {
    throw new NarrativeInputError('sourceReferences non validi o troppo numerosi');
  }
}

function recordOf(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new NarrativeInputError(`${label} non valido`);
  }
  return value as Record<string, unknown>;
}

function boundedOptionalString(
  value: unknown,
  label: string,
  maxLength: number,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new NarrativeInputError(`${label} non valido`);
  }
  return value;
}

function optionalPage(value: unknown, label: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > MAX_PAGE_NUMBER) {
    throw new NarrativeInputError(`${label} non valido`);
  }
  return value as number;
}

/** Validate and project model/import metadata before it reaches JSONB persistence. */
export function parseNarrativeMetadata(
  annotationsValue: unknown,
  sourceReferencesValue: unknown,
  originalText: string,
  expectedSectionKey: string,
): {
  annotations: NarrativeAnnotationInput[];
  sourceReferences: NarrativeSourceReferenceInput[];
} {
  if (!Array.isArray(annotationsValue) || annotationsValue.length > MAX_ANNOTATIONS_PER_SECTION) {
    throw new NarrativeInputError('annotations non valide o troppo numerose');
  }
  if (
    !Array.isArray(sourceReferencesValue) ||
    sourceReferencesValue.length > MAX_SOURCE_REFERENCES_PER_SECTION
  ) {
    throw new NarrativeInputError('sourceReferences non valide o troppo numerose');
  }

  const annotations = annotationsValue.map((value, index): NarrativeAnnotationInput => {
    const item = recordOf(value, `annotations[${index}]`);
    const { sectionKey, tagType, text, startOffset, endOffset } = item;
    if (sectionKey !== expectedSectionKey) {
      throw new NarrativeInputError(`annotations[${index}].sectionKey non valido`);
    }
    if (typeof tagType !== 'string' || !ANNOTATION_TYPES.has(tagType)) {
      throw new NarrativeInputError(`annotations[${index}].tagType non valido`);
    }
    if (typeof text !== 'string' || text.length > MAX_ANNOTATION_TEXT) {
      throw new NarrativeInputError(`annotations[${index}].text non valido`);
    }
    if (
      !Number.isInteger(startOffset) ||
      !Number.isInteger(endOffset) ||
      (startOffset as number) < 0 ||
      (endOffset as number) <= (startOffset as number) ||
      (endOffset as number) > originalText.length ||
      originalText.slice(startOffset as number, endOffset as number) !== text
    ) {
      throw new NarrativeInputError(`annotations[${index}] non corrisponde al testo narrativo`);
    }
    return {
      sectionKey,
      tagType,
      text,
      startOffset: startOffset as number,
      endOffset: endOffset as number,
    };
  });

  const sourceReferences = sourceReferencesValue.map(
    (value, index): NarrativeSourceReferenceInput => {
      const item = recordOf(value, `sourceReferences[${index}]`);
      if (item.sectionKey !== expectedSectionKey) {
        throw new NarrativeInputError(`sourceReferences[${index}].sectionKey non valido`);
      }
      const fileId = boundedOptionalString(
        item.fileId,
        `sourceReferences[${index}].fileId`,
        MAX_SOURCE_ID,
      );
      const fileName = boundedOptionalString(
        item.fileName,
        `sourceReferences[${index}].fileName`,
        MAX_SOURCE_NAME,
      );
      const pageFrom = optionalPage(item.pageFrom, `sourceReferences[${index}].pageFrom`);
      const pageTo = optionalPage(item.pageTo, `sourceReferences[${index}].pageTo`);
      if (pageFrom !== undefined && pageTo !== undefined && pageTo < pageFrom) {
        throw new NarrativeInputError(`sourceReferences[${index}] intervallo pagine non valido`);
      }
      return {
        sectionKey: expectedSectionKey,
        ...(fileId !== undefined ? { fileId } : {}),
        ...(fileName !== undefined ? { fileName } : {}),
        ...(pageFrom !== undefined ? { pageFrom } : {}),
        ...(pageTo !== undefined ? { pageTo } : {}),
      };
    },
  );

  return { annotations, sourceReferences };
}

export function parseNarrativeSaveInput(value: unknown): NarrativeSaveInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new NarrativeInputError('body non valido');
  }
  const body = value as Record<string, unknown>;
  const input: NarrativeSaveInput = {};
  for (const field of ['reviewedText', 'originalText'] as const) {
    const text = body[field];
    if (text === undefined) continue;
    if (typeof text !== 'string') throw new NarrativeInputError(`${field} deve essere testuale`);
    if (text.length > MAX_NARRATIVE_TEXT) {
      throw new NarrativeInputError(`${field} non può superare ${MAX_NARRATIVE_TEXT} caratteri`);
    }
    input[field] = text;
  }
  if (body.reviewStatus !== undefined) {
    if (typeof body.reviewStatus !== 'string' || !REVIEW_STATUSES.has(body.reviewStatus)) {
      throw new NarrativeInputError('reviewStatus non valido');
    }
    input.reviewStatus = body.reviewStatus;
  }
  return input;
}
