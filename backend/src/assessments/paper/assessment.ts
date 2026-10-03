// Backend glue for the paper-form versions: input parsing, DTO, snapshot and its digest.
import { createHash } from 'node:crypto';
import { AssessmentError } from '../types.js';
import type { PainadSnapshot } from '../types.js';
import {
  PaperInputError,
  answeredPaperCount,
  paperCompletion,
  paperMeasurements,
  paperResult,
  paperScale,
  paperSnapshotItems,
  parsePaperAnswers,
  type PaperAnswers,
} from './engine.js';
import type { PaperScale } from './definitions.js';
import {
  PAPER_TYPES,
  PAPER_VERSIONS,
  type PaperSnapshot,
  type PaperType,
  type PaperVersion,
} from './types.js';

export const isPaperType = (type: unknown): type is PaperType =>
  (PAPER_TYPES as readonly unknown[]).includes(type);
/** Current paper scale for a stored row, or null for a pre-paper (v1) version. */
export function paperScaleOf(type: string, formVersion: string): PaperScale | null {
  if (!isPaperType(type) || PAPER_VERSIONS[type] !== formVersion) return null;
  return paperScale(type, formVersion) ?? null;
}
export function requirePaperScale(type: PaperType): PaperScale {
  const scale = paperScale(type, PAPER_VERSIONS[type]);
  if (!scale) throw new AssessmentError('Tipo o versione del modulo non supportati');
  return scale;
}
export function parsePaperInput(scale: PaperScale, value: unknown): PaperAnswers {
  try {
    return parsePaperAnswers(scale, value);
  } catch (error) {
    if (error instanceof PaperInputError) throw new AssessmentError(error.message);
    throw error;
  }
}
export function paperDtoFields(scale: PaperScale, value: unknown) {
  const answers = parsePaperInput(scale, value);
  return {
    type: scale.type as PaperType,
    formVersion: scale.version as PaperVersion,
    layout: 'paper' as const,
    answers,
    answeredCount: answeredPaperCount(scale, answers),
    completion: paperCompletion(scale, answers),
    result: paperResult(scale, answers),
  };
}
export function paperSnapshot(
  scale: PaperScale,
  common: Omit<PainadSnapshot, 'form' | 'items' | 'result' | 'interpretation'>,
  value: unknown,
): PaperSnapshot {
  const answers = parsePaperInput(scale, value);
  const result = paperResult(scale, answers);
  if (!result)
    throw new AssessmentError(
      'Completa tutte le risposte prima di confermare',
      422,
      'assessment_incomplete',
    );
  return {
    ...common,
    layout: 'paper',
    form: {
      type: scale.type as PaperType,
      version: scale.version as PaperVersion,
      sourceSha256: scale.sourceSha256,
    },
    items: paperSnapshotItems(scale, answers),
    measurements: paperMeasurements(scale, answers),
    result,
    notes: typeof answers.notes === 'string' ? answers.notes : '',
  };
}
/** Key-order independent digest (JSONB does not preserve key order). */
export function paperSnapshotHash(snapshot: PaperSnapshot): string {
  const ordered = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(ordered);
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return Object.fromEntries(
        Object.keys(record)
          .sort()
          .map((key) => [key, ordered(record[key])]),
      );
    }
    return value;
  };
  return createHash('sha256')
    .update(JSON.stringify(ordered(snapshot)))
    .digest('hex');
}
