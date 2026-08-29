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
