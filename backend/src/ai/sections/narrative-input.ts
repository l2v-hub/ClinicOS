export class NarrativeInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NarrativeInputError';
  }
}

const MAX_NARRATIVE_TEXT = 100_000;
const REVIEW_STATUSES = new Set(['absent', 'pending', 'modified', 'reviewed', 'conflict']);

export interface NarrativeSaveInput {
  reviewedText?: string;
  originalText?: string;
  reviewStatus?: string;
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
