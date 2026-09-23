import { parseIsoCalendarDate } from '../appointments/list-query.js';

export interface RosterOrder {
  criterion: 'name' | 'location';
  direction: 'asc' | 'desc';
}
export interface RosterContextDto {
  id: string;
  label: string;
  version: string;
}
export interface RosterPreferenceDto {
  context: RosterContextDto | null;
  default: RosterOrder | null;
  override: RosterOrder | null;
  effective: RosterOrder;
  source: 'personal' | 'department' | 'system';
  revision: string | null;
  canEdit: boolean;
  canEditDefault: boolean;
  temporary: boolean;
  reason: 'profile_missing' | null;
}
export interface AppliedRosterOrder {
  context: RosterContextDto | null;
  order: RosterOrder;
  source: RosterPreferenceDto['source'] | 'temporary';
  revision: string | null;
  temporary: boolean;
  asOf: string;
  epoch: { roster: string; therapy?: string };
}
export class RosterError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = 'roster_input_invalid',
    public reason?: string,
  ) {
    super(message);
  }
}
export function changed(reason: string): RosterError {
  return new RosterError(
    'Elenco aggiornato. Ricarica dalla prima pagina.',
    409,
    'roster_changed',
    reason,
  );
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new RosterError('Richiesta non valida');
  return value as Record<string, unknown>;
}
export function onlyKeys(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).some((key) => !keys.includes(key)))
    throw new RosterError('Campo non consentito');
}
export function rosterOrder(value: unknown): RosterOrder {
  const input = object(value);
  onlyKeys(input, ['criterion', 'direction']);
  if (
    !['name', 'location'].includes(input.criterion as string) ||
    !['asc', 'desc'].includes(input.direction as string)
  )
    throw new RosterError('Ordinamento non valido');
  return {
    criterion: input.criterion as RosterOrder['criterion'],
    direction: input.direction as RosterOrder['direction'],
  };
}
export function nullableOrder(value: unknown): RosterOrder | null {
  return value === null ? null : rosterOrder(value);
}
export function version(value: unknown): bigint {
  if (
    typeof value !== 'string' ||
    !/^(0|[1-9]\d{0,18})$/.test(value) ||
    BigInt(value) > 9223372036854775807n
  )
    throw new RosterError('Versione non valida');
  return BigInt(value);
}
export function rosterId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value))
    throw new RosterError('Identificativo non valido');
  return value;
}
export function rosterDate(value: unknown): string {
  if (typeof value !== 'string' || value.startsWith('0000-'))
    throw new RosterError('Data non valida');
  try {
    return parseIsoCalendarDate(value, 'Data');
  } catch {
    throw new RosterError('Data non valida');
  }
}
export function requestedRosterOrder(query: Record<string, unknown>) {
  const explicit =
    query.sort === undefined && query.direction === undefined
      ? undefined
      : rosterOrder({ criterion: query.sort, direction: query.direction });
  return {
    explicit,
    contextId: query.contextId === undefined ? undefined : rosterId(query.contextId),
  };
}
