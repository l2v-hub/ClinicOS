export class OperatorPageInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OperatorPageInputError';
  }
}

export interface OperatorPageFilters {
  q?: string;
  status?: OperatorPageStatus;
}

export type OperatorPageStatus = 'active' | 'inactive';

export interface OperatorPagePosition {
  createdAt: Date;
  id: string;
}

export interface OperatorPageQuery extends OperatorPageFilters {
  limit: number;
  cursor?: string;
}

interface OperatorPageCursorPayload {
  v: 1;
  createdAt: string;
  id: string;
  q?: string;
  status?: OperatorPageStatus;
}

const STRICT_POSITIVE_INTEGER = /^[1-9]\d*$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const RESOURCE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_CURSOR_LENGTH = 1024;
const MAX_QUERY_LENGTH = 80;
const CURSOR_KEYS = new Set(['v', 'createdAt', 'id', 'q', 'status']);

function scalar(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new OperatorPageInputError(`${name} deve essere un valore`);
  return value;
}

export function parseOperatorPageQuery(query: Record<string, unknown>): OperatorPageQuery {
  const rawLimit = scalar(query.limit, 'limit');
  const rawQ = scalar(query.q, 'q');
  const rawStatus = scalar(query.status, 'status');
  const cursor = scalar(query.cursor, 'cursor');
  let limit = 50;
  if (rawLimit !== undefined) {
    if (!STRICT_POSITIVE_INTEGER.test(rawLimit)) {
      throw new OperatorPageInputError('limit deve essere un intero positivo');
    }
    const parsed = Number(rawLimit);
    if (!Number.isSafeInteger(parsed)) throw new OperatorPageInputError('limit non valido');
    limit = Math.min(parsed, 100);
  }
  const q = rawQ?.trim() || undefined;
  if (q && q.length > MAX_QUERY_LENGTH) {
    throw new OperatorPageInputError(`q non puo superare ${MAX_QUERY_LENGTH} caratteri`);
  }
  if (cursor !== undefined && (cursor.length === 0 || cursor.length > MAX_CURSOR_LENGTH)) {
    throw new OperatorPageInputError('cursor non valido');
  }
  const status = rawStatus?.trim() || undefined;
  if (status !== undefined && status !== 'active' && status !== 'inactive') {
    throw new OperatorPageInputError('status deve essere active o inactive');
  }
  return { limit, q, status, cursor };
}

export function encodeOperatorPageCursor(
  position: OperatorPagePosition,
  filters: OperatorPageFilters,
): string {
  const payload: OperatorPageCursorPayload = {
    v: 1,
    createdAt: position.createdAt.toISOString(),
    id: position.id,
    q: filters.q || undefined,
    status: filters.status,
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeOperatorPageCursor(
  cursor: string,
  filters: OperatorPageFilters,
): OperatorPagePosition {
  if (!cursor || cursor.length > MAX_CURSOR_LENGTH || !BASE64URL.test(cursor)) {
    throw new OperatorPageInputError('cursor non valido');
  }
  let payload: unknown;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    if (Buffer.from(decoded, 'utf8').toString('base64url') !== cursor) throw new Error();
    payload = JSON.parse(decoded);
  } catch {
    throw new OperatorPageInputError('cursor non valido');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new OperatorPageInputError('cursor non valido');
  }
  const value = payload as Partial<OperatorPageCursorPayload>;
  const createdAt = typeof value.createdAt === 'string' ? new Date(value.createdAt) : new Date(NaN);
  if (
    Object.keys(value).some((key) => !CURSOR_KEYS.has(key)) ||
    value.v !== 1 ||
    !Number.isFinite(createdAt.getTime()) ||
    createdAt.toISOString() !== value.createdAt ||
    typeof value.id !== 'string' ||
    !RESOURCE_ID.test(value.id) ||
    value.q !== (filters.q || undefined) ||
    value.status !== filters.status
  ) {
    throw new OperatorPageInputError('cursor non coerente con i filtri');
  }
  return { createdAt, id: value.id };
}
