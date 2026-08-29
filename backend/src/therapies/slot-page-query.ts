export const DEFAULT_THERAPY_SLOT_PAGE_LIMIT = 100;
export const MAX_THERAPY_SLOT_PAGE_LIMIT = 250;

export class TherapySlotPageInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TherapySlotPageInputError';
  }
}

interface TherapySlotCursorPayload {
  v: 1;
  date: string;
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

export function encodeTherapySlotCursor(date: string, id: string): string {
  return Buffer.from(
    JSON.stringify({ v: 1, date, id } satisfies TherapySlotCursorPayload),
  ).toString('base64url');
}

export function decodeTherapySlotCursor(value: string, date: string): string {
  try {
    const payload = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as Partial<TherapySlotCursorPayload>;
    if (
      payload.v !== 1 ||
      payload.date !== date ||
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
  return { limit, ...(cursor && { cursorId: decodeTherapySlotCursor(cursor, date) }) };
}
