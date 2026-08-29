import { AppointmentListInputError, parseIsoCalendarDate } from '../appointments/list-query.js';

export const MAX_MEDICATION_ADMINISTRATIONS = 500;

export class MedicationAdministrationQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MedicationAdministrationQueryError';
  }
}

export interface MedicationAdministrationQuery {
  date?: string;
  limit: number;
}

export interface MedicationAdministrationCursor {
  date: string;
  createdAt: Date;
  id: string;
}

export interface MedicationAdministrationPageQuery extends MedicationAdministrationQuery {
  cursor?: MedicationAdministrationCursor;
}

interface CursorPayload {
  v: 1;
  dateFilter: string | null;
  date: string;
  createdAt: string;
  id: string;
}

export function parseMedicationAdministrationQuery(
  query: Record<string, unknown>,
): MedicationAdministrationQuery {
  const rawDate = query.date;
  const rawLimit = query.limit;
  if (rawDate !== undefined && (typeof rawDate !== 'string' || rawDate.trim() === '')) {
    throw new MedicationAdministrationQueryError('date non valida');
  }
  let date: string | undefined;
  if (typeof rawDate === 'string') {
    try {
      date = parseIsoCalendarDate(rawDate.trim(), 'date');
    } catch (error) {
      if (error instanceof AppointmentListInputError) {
        throw new MedicationAdministrationQueryError(error.message);
      }
      throw error;
    }
  }
  if (rawLimit !== undefined && (typeof rawLimit !== 'string' || !/^\d+$/.test(rawLimit.trim()))) {
    throw new MedicationAdministrationQueryError('limit non valido');
  }
  const limit = typeof rawLimit === 'string' ? Number(rawLimit.trim()) : 100;
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new MedicationAdministrationQueryError('limit deve essere positivo');
  }
  return { date, limit: Math.min(limit, MAX_MEDICATION_ADMINISTRATIONS) };
}

export function encodeMedicationAdministrationCursor(
  row: { date: string; createdAt: Date; id: string },
  dateFilter?: string,
): string {
  const payload: CursorPayload = {
    v: 1,
    dateFilter: dateFilter ?? null,
    date: row.date,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function parseMedicationAdministrationPageQuery(
  query: Record<string, unknown>,
): MedicationAdministrationPageQuery {
  const base = parseMedicationAdministrationQuery(query);
  const limit = Math.min(base.limit, 100);
  if (query.cursor === undefined) return { ...base, limit };
  if (typeof query.cursor !== 'string' || query.cursor.length < 8 || query.cursor.length > 2_000) {
    throw new MedicationAdministrationQueryError('cursor non valido');
  }
  try {
    const payload = JSON.parse(
      Buffer.from(query.cursor, 'base64url').toString('utf8'),
    ) as Partial<CursorPayload>;
    if (
      payload.v !== 1 ||
      payload.dateFilter !== (base.date ?? null) ||
      typeof payload.date !== 'string' ||
      typeof payload.createdAt !== 'string' ||
      typeof payload.id !== 'string' ||
      payload.id.length < 1 ||
      payload.id.length > 128
    ) {
      throw new Error('payload');
    }
    const date = parseIsoCalendarDate(payload.date, 'cursor.date');
    const createdAt = new Date(payload.createdAt);
    if (Number.isNaN(createdAt.getTime()) || createdAt.toISOString() !== payload.createdAt) {
      throw new Error('createdAt');
    }
    return { ...base, limit, cursor: { date, createdAt, id: payload.id } };
  } catch (error) {
    if (error instanceof MedicationAdministrationQueryError) throw error;
    throw new MedicationAdministrationQueryError('cursor non valido');
  }
}
