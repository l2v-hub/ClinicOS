export const DEFAULT_THERAPY_SLOT_PAGE_LIMIT = 100;
export const MAX_THERAPY_SLOT_PAGE_LIMIT = 250;

export class TherapySlotPageInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TherapySlotPageInputError';
  }
}

interface TherapySlotCursorPayload {
  v: 2;
  date: string;
  scope: string;
  id: string;
}

export interface TherapySlotPageQuery {
  limit: number;
  cursorId?: string;
}

function one(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    throw new TherapySlotPageInputError(`${field} non valido`);
  }
  return value;
}

export function therapySlotScopeFingerprint(access: TherapyPatientAccess): string {
  const canonical = Array.isArray(access.patientIds)
    ? `patients:${[...access.patientIds].sort().join('\u0000')}`
    : access.registeredById
      ? `owner:${access.registeredById}`
      : 'global';
  return createHash('sha256').update(canonical, 'utf8').digest('base64url').slice(0, 22);
}

export function encodeTherapySlotCursor(date: string, scope: string, id: string): string {
  return Buffer.from(
    JSON.stringify({ v: 2, date, scope, id } satisfies TherapySlotCursorPayload),
  ).toString('base64url');
}

export function decodeTherapySlotCursor(value: string, date: string, scope: string): string {
  try {
    const payload = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as Partial<TherapySlotCursorPayload>;
    if (
      payload.v !== 2 ||
      payload.date !== date ||
      payload.scope !== scope ||
      typeof payload.id !== 'string' ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(payload.id)
    ) {
      throw new Error('cursor mismatch');
    }
    return payload.id;
  } catch {
    throw new TherapySlotPageInputError('cursor non valido per la data richiesta');
  }
}

export function parseTherapySlotPageQuery(
  query: Record<string, unknown>,
  date: string,
  scope: string,
): TherapySlotPageQuery {
  const unknown = Object.keys(query).find((key) => !['date', 'limit', 'cursor'].includes(key));
  if (unknown) throw new TherapySlotPageInputError(`parametro non supportato: ${unknown}`);
  const rawLimit = one(query.limit, 'limit', 3);
  const limit = rawLimit === undefined ? DEFAULT_THERAPY_SLOT_PAGE_LIMIT : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_THERAPY_SLOT_PAGE_LIMIT) {
    throw new TherapySlotPageInputError(
      `limit deve essere un intero tra 1 e ${MAX_THERAPY_SLOT_PAGE_LIMIT}`,
    );
  }
  const cursor = one(query.cursor, 'cursor', 512);
  return { limit, ...(cursor && { cursorId: decodeTherapySlotCursor(cursor, date, scope) }) };
}
import { createHash } from 'node:crypto';
import type { TherapyPatientAccess } from './therapy-query.js';
