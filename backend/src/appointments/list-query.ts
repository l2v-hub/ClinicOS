export class AppointmentListInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppointmentListInputError';
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
export const MAX_APPOINTMENT_RANGE_DAYS = 42;
export const MAX_APPOINTMENTS_PER_VIEW = 1000;

function single(query: Record<string, unknown>, key: string): string | undefined {
  const value = query[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppointmentListInputError(`${key} non valido`);
  }
  return value.trim();
}

export function parseIsoCalendarDate(value: string, field: string): string {
  if (!ISO_DATE.test(value)) throw new AppointmentListInputError(`${field} non valida`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new AppointmentListInputError(`${field} non valida`);
  }
  return value;
}

export interface AppointmentListQuery {
  from: string;
  to: string;
  operatorId?: string;
  limit: number;
}

export function parseAppointmentListQuery(query: Record<string, unknown>): AppointmentListQuery {
  const date = single(query, 'date');
  const rawFrom = single(query, 'from');
  const rawTo = single(query, 'to');
  if (date && (rawFrom || rawTo)) {
    throw new AppointmentListInputError('Usa date oppure from/to, non entrambi');
  }
  if (!date && (!rawFrom || !rawTo)) {
    throw new AppointmentListInputError('Intervallo obbligatorio: date oppure from e to');
  }
  const from = parseIsoCalendarDate(date ?? rawFrom!, date ? 'date' : 'from');
  const to = parseIsoCalendarDate(date ?? rawTo!, date ? 'date' : 'to');
  const rangeDays =
    Math.floor(
      (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000,
    ) + 1;
  if (rangeDays < 1 || rangeDays > MAX_APPOINTMENT_RANGE_DAYS) {
    throw new AppointmentListInputError(
      `Intervallo appuntamenti massimo ${MAX_APPOINTMENT_RANGE_DAYS} giorni`,
    );
  }
  const operatorId = single(query, 'operatorId');
  if (operatorId && !SAFE_ID.test(operatorId)) {
    throw new AppointmentListInputError('operatorId non valido');
  }
  const rawLimit = single(query, 'limit');
  if (rawLimit && !/^\d+$/.test(rawLimit)) {
    throw new AppointmentListInputError('limit non valido');
  }
  const limit = rawLimit ? Number(rawLimit) : MAX_APPOINTMENTS_PER_VIEW;
  if (limit < 1 || limit > MAX_APPOINTMENTS_PER_VIEW) {
    throw new AppointmentListInputError(`limit deve essere tra 1 e ${MAX_APPOINTMENTS_PER_VIEW}`);
  }
  return { from, to, operatorId, limit };
}
