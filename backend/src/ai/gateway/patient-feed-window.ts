import { GatewayError } from './types.js';

export const MAX_GATEWAY_PATIENT_FEED_ROWS = 100;
export const GATEWAY_PATIENT_FEED_LOOKAHEAD = MAX_GATEWAY_PATIENT_FEED_ROWS + 1;
export const MAX_GATEWAY_DIARY_CONTENT = 4_000;
export const MAX_GATEWAY_APPOINTMENT_NOTES = 1_000;
export const MAX_GATEWAY_SOURCE_EXCERPT = 240;

export function boundGatewayPatientFeed<
  T extends { contentTruncated?: boolean; notesTruncated?: boolean },
>(rows: readonly T[]): { data: T[]; truncated: boolean } {
  const data = rows.slice(0, MAX_GATEWAY_PATIENT_FEED_ROWS);
  return {
    data,
    truncated:
      rows.length > MAX_GATEWAY_PATIENT_FEED_ROWS ||
      data.some((row) => row.contentTruncated === true || row.notesTruncated === true),
  };
}

function optionalInstant(value: unknown, field: string): Date | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) {
    throw new GatewayError('bad_request', `${field} non valido`);
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new GatewayError('bad_request', `${field} non valido`);
  }
  return parsed;
}

export function parseGatewayAppointmentRange(opts: unknown): { from?: Date; to?: Date } {
  if (!opts || typeof opts !== 'object' || Array.isArray(opts)) {
    throw new GatewayError('bad_request', 'Filtri appuntamenti non validi');
  }
  const input = opts as Record<string, unknown>;
  const from = optionalInstant(input.from, 'from');
  const to = optionalInstant(input.to, 'to');
  if (from && to && from > to) {
    throw new GatewayError('bad_request', 'Intervallo appuntamenti non valido');
  }
  return { from, to };
}
