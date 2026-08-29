export class DiaryPageInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiaryPageInputError';
  }
}

export interface DiaryPageFilters {
  authorType?: string;
  from?: string;
  to?: string;
}

export interface DiaryPagePosition {
  entryDateTime: string;
  id: string;
}

export interface DiaryPageQuery extends DiaryPageFilters {
  limit: number;
  offset?: number;
  cursor?: string;
}

interface DiaryPageCursorPayload extends DiaryPagePosition, DiaryPageFilters {
  v: 1;
}

const MAX_CURSOR_LENGTH = 1024;
const MAX_AUTHOR_TYPE_LENGTH = 32;
const MAX_POSITION_LENGTH = 200;
const MAX_OFFSET = 100_000;
const STRICT_POSITIVE_INTEGER = /^[1-9]\d*$/;
const STRICT_NON_NEGATIVE_INTEGER = /^(0|[1-9]\d*)$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function scalar(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new DiaryPageInputError(`${name} deve essere un valore`);
  return value;
}

function validIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function normalizedFilters(filters: DiaryPageFilters): DiaryPageFilters {
  return {
    authorType: filters.authorType || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  };
}

export function parseDiaryPageQuery(query: Record<string, unknown>): DiaryPageQuery {
  const rawLimit = scalar(query.limit, 'limit');
  const rawOffset = scalar(query.offset, 'offset');
  const rawCursor = scalar(query.cursor, 'cursor');
  const authorType = scalar(query.authorType, 'authorType')?.trim() || undefined;
  const from = scalar(query.from, 'from');
  const to = scalar(query.to, 'to');

  let limit = 50;
  if (rawLimit !== undefined) {
    if (!STRICT_POSITIVE_INTEGER.test(rawLimit)) {
      throw new DiaryPageInputError('limit deve essere un intero positivo');
    }
    const parsed = Number(rawLimit);
    if (!Number.isSafeInteger(parsed)) throw new DiaryPageInputError('limit non valido');
    limit = Math.min(parsed, 100);
  }

  let offset: number | undefined;
  if (rawOffset !== undefined) {
    if (!STRICT_NON_NEGATIVE_INTEGER.test(rawOffset)) {
      throw new DiaryPageInputError('offset deve essere un intero non negativo');
    }
    offset = Number(rawOffset);
    if (!Number.isSafeInteger(offset) || offset > MAX_OFFSET) {
      throw new DiaryPageInputError('offset non valido');
    }
  }

  if (authorType && authorType.length > MAX_AUTHOR_TYPE_LENGTH) {
    throw new DiaryPageInputError(
      `authorType non puo superare ${MAX_AUTHOR_TYPE_LENGTH} caratteri`,
    );
  }
  if ((from && !validIsoDate(from)) || (to && !validIsoDate(to)) || (from && to && from > to)) {
    throw new DiaryPageInputError('intervallo date non valido');
  }
  if (rawCursor !== undefined && (rawCursor.length === 0 || rawCursor.length > MAX_CURSOR_LENGTH)) {
    throw new DiaryPageInputError('cursor non valido');
  }
  if (rawCursor && offset !== undefined) {
    throw new DiaryPageInputError('cursor e offset non possono essere usati insieme');
  }

  return { limit, offset, cursor: rawCursor, authorType, from, to };
}

export function encodeDiaryPageCursor(
  position: DiaryPagePosition,
  filters: DiaryPageFilters,
): string {
  const payload: DiaryPageCursorPayload = {
    v: 1,
    ...position,
    ...normalizedFilters(filters),
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeDiaryPageCursor(
  cursor: string,
  filters: DiaryPageFilters,
): DiaryPagePosition {
  if (!cursor || cursor.length > MAX_CURSOR_LENGTH || !BASE64URL.test(cursor)) {
    throw new DiaryPageInputError('cursor non valido');
  }

  let payload: unknown;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    if (Buffer.from(decoded, 'utf8').toString('base64url') !== cursor) {
      throw new Error('non-canonical cursor');
    }
    payload = JSON.parse(decoded);
  } catch {
    throw new DiaryPageInputError('cursor non valido');
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new DiaryPageInputError('cursor non valido');
  }
  const value = payload as Partial<DiaryPageCursorPayload>;
  if (
    value.v !== 1 ||
    typeof value.entryDateTime !== 'string' ||
    value.entryDateTime.length === 0 ||
    value.entryDateTime.length > MAX_POSITION_LENGTH ||
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    value.id.length > MAX_POSITION_LENGTH
  ) {
    throw new DiaryPageInputError('cursor non valido');
  }

  const expected = normalizedFilters(filters);
  if (
    value.authorType !== expected.authorType ||
    value.from !== expected.from ||
    value.to !== expected.to
  ) {
    throw new DiaryPageInputError('cursor non coerente con i filtri');
  }
  return { entryDateTime: value.entryDateTime, id: value.id };
}
