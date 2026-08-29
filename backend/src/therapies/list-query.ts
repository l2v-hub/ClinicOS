export type TherapyListStatus = 'tutte' | 'attiva' | 'non_attiva';

export interface TherapyListCursor {
  createdAt: Date;
  id: string;
}

export interface TherapyListQuery {
  limit: number;
  status: TherapyListStatus;
  cursor?: TherapyListCursor;
}

export class TherapyListInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TherapyListInputError';
  }
}

interface TherapyListCursorPayload {
  v: 1;
  createdAt: string;
  id: string;
  status: TherapyListStatus;
}

const QUERY_KEYS = new Set(['limit', 'status', 'cursor']);
const STATUSES = new Set<TherapyListStatus>(['tutte', 'attiva', 'non_attiva']);
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const MAX_CURSOR_LENGTH = 1024;

function scalar(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new TherapyListInputError(`${field} non valido`);
  return value;
}

function parseLimit(value: unknown): number {
  const raw = scalar(value, 'limit');
  if (raw === undefined) return 50;
  if (!/^[1-9]\d*$/.test(raw)) {
    throw new TherapyListInputError('limit deve essere un intero positivo');
  }
  const limit = Number(raw);
  if (!Number.isSafeInteger(limit) || limit > 100) {
    throw new TherapyListInputError('limit deve essere compreso tra 1 e 100');
  }
  return limit;
}

export function encodeTherapyListCursor(
  cursor: TherapyListCursor,
  status: TherapyListStatus,
): string {
  const payload: TherapyListCursorPayload = {
    v: 1,
    createdAt: cursor.createdAt.toISOString(),
    id: cursor.id,
    status,
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeTherapyListCursor(
  value: unknown,
  status: TherapyListStatus,
): TherapyListCursor | undefined {
  const raw = scalar(value, 'cursor');
  if (raw === undefined) return undefined;
  if (!raw || raw.length > MAX_CURSOR_LENGTH || !BASE64URL.test(raw)) {
    throw new TherapyListInputError('cursor non valido');
  }

  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    if (Buffer.from(decoded, 'utf8').toString('base64url') !== raw) {
      throw new Error('cursor non canonico');
    }
    const payload = JSON.parse(decoded) as Partial<TherapyListCursorPayload>;
    const createdAt = new Date(payload.createdAt ?? '');
    if (
      payload.v !== 1 ||
      typeof payload.createdAt !== 'string' ||
      Number.isNaN(createdAt.getTime()) ||
      createdAt.toISOString() !== payload.createdAt ||
      typeof payload.id !== 'string' ||
      !SAFE_ID.test(payload.id) ||
      payload.status !== status
    ) {
      throw new Error('payload non valido');
    }
    return { createdAt, id: payload.id };
  } catch {
    throw new TherapyListInputError('cursor non valido o non coerente con i filtri');
  }
}

export function parseTherapyListQuery(query: Record<string, unknown>): TherapyListQuery {
  const unknown = Object.keys(query).find((key) => !QUERY_KEYS.has(key));
  if (unknown) throw new TherapyListInputError(`Parametro non consentito: ${unknown}`);

  const rawStatus = scalar(query.status, 'status') ?? 'tutte';
  if (!STATUSES.has(rawStatus as TherapyListStatus)) {
    throw new TherapyListInputError('status non valido');
  }
  const status = rawStatus as TherapyListStatus;
  const cursor = decodeTherapyListCursor(query.cursor, status);
  return { limit: parseLimit(query.limit), status, ...(cursor ? { cursor } : {}) };
}
