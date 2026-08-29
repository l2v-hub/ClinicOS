export class PatientPageInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PatientPageInputError';
  }
}

export interface PatientPageFilters {
  q?: string;
  sex?: 'M' | 'F';
}

export interface PatientPagePosition {
  lastName: string;
  firstName: string;
  id: string;
}

export interface PatientPageQuery extends PatientPageFilters {
  limit: number;
  cursor?: string;
}

interface PatientPageCursorPayload extends PatientPagePosition, PatientPageFilters {
  v: 1;
}

const MAX_CURSOR_LENGTH = 1024;
const MAX_QUERY_LENGTH = 80;
const MAX_POSITION_FIELD_LENGTH = 200;
const STRICT_POSITIVE_INTEGER = /^[1-9]\d*$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

function scalar(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new PatientPageInputError(`${name} deve essere un valore`);
  return value;
}

function normalizedFilters(filters: PatientPageFilters): PatientPageFilters {
  return {
    q: filters.q || undefined,
    sex: filters.sex || undefined,
  };
}

export function parsePatientPageQuery(query: Record<string, unknown>): PatientPageQuery {
  const rawLimit = scalar(query.limit, 'limit');
  const rawQ = scalar(query.q, 'q');
  const rawSex = scalar(query.sex, 'sex');
  const rawCursor = scalar(query.cursor, 'cursor');

  let limit = 50;
  if (rawLimit !== undefined) {
    if (!STRICT_POSITIVE_INTEGER.test(rawLimit)) {
      throw new PatientPageInputError('limit deve essere un intero positivo');
    }
    const parsed = Number(rawLimit);
    if (!Number.isSafeInteger(parsed)) throw new PatientPageInputError('limit non valido');
    limit = Math.min(parsed, 100);
  }

  const q = rawQ?.trim() || undefined;
  if (q && q.length > MAX_QUERY_LENGTH) {
    throw new PatientPageInputError(`q non puo superare ${MAX_QUERY_LENGTH} caratteri`);
  }

  if (rawSex !== undefined && rawSex !== 'M' && rawSex !== 'F') {
    throw new PatientPageInputError('sex deve essere M oppure F');
  }

  if (rawCursor !== undefined && (rawCursor.length === 0 || rawCursor.length > MAX_CURSOR_LENGTH)) {
    throw new PatientPageInputError('cursor non valido');
  }

  return {
    limit,
    q,
    sex: rawSex as 'M' | 'F' | undefined,
    cursor: rawCursor,
  };
}

export function encodePatientPageCursor(
  position: PatientPagePosition,
  filters: PatientPageFilters,
): string {
  const payload: PatientPageCursorPayload = {
    v: 1,
    ...position,
    ...normalizedFilters(filters),
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodePatientPageCursor(
  cursor: string,
  filters: PatientPageFilters,
): PatientPagePosition {
  if (!cursor || cursor.length > MAX_CURSOR_LENGTH || !BASE64URL.test(cursor)) {
    throw new PatientPageInputError('cursor non valido');
  }

  let payload: unknown;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    if (Buffer.from(decoded, 'utf8').toString('base64url') !== cursor) {
      throw new Error('non-canonical cursor');
    }
    payload = JSON.parse(decoded);
  } catch {
    throw new PatientPageInputError('cursor non valido');
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new PatientPageInputError('cursor non valido');
  }
  const value = payload as Partial<PatientPageCursorPayload>;
  const positionFields = [value.lastName, value.firstName, value.id];
  if (
    value.v !== 1 ||
    positionFields.some(
      (field) =>
        typeof field !== 'string' || field.length === 0 || field.length > MAX_POSITION_FIELD_LENGTH,
    )
  ) {
    throw new PatientPageInputError('cursor non valido');
  }

  const expected = normalizedFilters(filters);
  if (value.q !== expected.q || value.sex !== expected.sex) {
    throw new PatientPageInputError('cursor non coerente con i filtri');
  }

  return {
    lastName: value.lastName as string,
    firstName: value.firstName as string,
    id: value.id as string,
  };
}
