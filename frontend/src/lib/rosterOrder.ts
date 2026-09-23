import { isCalendarDate } from './patientTherapyCalendar';

export interface RosterOrder {
  criterion: 'name' | 'location';
  direction: 'asc' | 'desc';
}
export interface RosterContext {
  id: string;
  label: string;
  version: string;
}
export interface RosterMetadata {
  context: RosterContext | null;
  order: RosterOrder;
  source: 'personal' | 'department' | 'system' | 'temporary';
  revision: string | null;
  temporary: boolean;
  asOf: string;
  epoch: { roster: string; therapy?: string };
}
export interface RosterPreference {
  context: RosterContext | null;
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
export interface RosterPageOptions {
  sort?: 'name' | 'location';
  direction?: 'asc' | 'desc';
  contextId?: string;
  asOf?: string;
}
export interface RosterDefault {
  id: string;
  label: string;
  default: RosterOrder | null;
  version: string;
}
export const DEFAULT_ROSTER_ORDER: RosterOrder = { criterion: 'name', direction: 'asc' };
const record = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Ordine reparto non valido');
  return v as Record<string, unknown>;
};
const version = (v: unknown): v is string => typeof v === 'string' && /^\d+$/.test(v);
function text(v: unknown): string {
  if (typeof v !== 'string' || !v.trim()) throw new Error('Contesto reparto non valido');
  return v;
}
export function parseRosterOrder(v: unknown): RosterOrder {
  const row = record(v);
  if (
    !['name', 'location'].includes(String(row.criterion)) ||
    !['asc', 'desc'].includes(String(row.direction))
  )
    throw new Error('Ordine reparto non valido');
  return {
    criterion: row.criterion as RosterOrder['criterion'],
    direction: row.direction as RosterOrder['direction'],
  };
}
function parseContext(v: unknown): RosterContext | null {
  if (v === null) return null;
  const row = record(v);
  if (!version(row.version)) throw new Error('Versione reparto non valida');
  return { id: text(row.id), label: text(row.label), version: row.version };
}
export function parseRosterMetadata(v: unknown): RosterMetadata | undefined {
  if (v === undefined) return undefined;
  const row = record(v);
  const epoch = record(row.epoch);
  if (
    !version(epoch.roster) ||
    (epoch.therapy !== undefined && !version(epoch.therapy)) ||
    !['personal', 'department', 'system', 'temporary'].includes(String(row.source)) ||
    typeof row.temporary !== 'boolean' ||
    (row.revision !== null && !version(row.revision)) ||
    !isCalendarDate(row.asOf)
  )
    throw new Error('Metadati ordine non validi');
  return {
    context: parseContext(row.context),
    order: parseRosterOrder(row.order),
    source: row.source as RosterMetadata['source'],
    revision: row.revision as string | null,
    temporary: row.temporary,
    asOf: row.asOf,
    epoch: {
      roster: epoch.roster,
      ...(epoch.therapy === undefined ? {} : { therapy: epoch.therapy as string }),
    },
  };
}
export function parseRosterPreference(v: unknown): RosterPreference {
  const row = record(v);
  if (
    !['personal', 'department', 'system'].includes(String(row.source)) ||
    typeof row.canEdit !== 'boolean' ||
    typeof row.canEditDefault !== 'boolean' ||
    typeof row.temporary !== 'boolean' ||
    (row.reason !== null && row.reason !== 'profile_missing') ||
    (row.revision !== null && !version(row.revision))
  )
    throw new Error('Preferenza reparto non valida');
  const context = parseContext(row.context);
  if (row.canEdit && (!context || row.revision === null))
    throw new Error('Preferenza modificabile senza contesto');
  return {
    context,
    default: row.default === null ? null : parseRosterOrder(row.default),
    override: row.override === null ? null : parseRosterOrder(row.override),
    effective: parseRosterOrder(row.effective),
    source: row.source as RosterPreference['source'],
    revision: row.revision as string | null,
    canEdit: row.canEdit,
    canEditDefault: row.canEditDefault,
    temporary: row.temporary,
    reason: row.reason as RosterPreference['reason'],
  };
}
export function parseRosterDefault(v: unknown): RosterDefault {
  const row = record(v);
  if (!version(row.version)) throw new Error('Versione reparto non valida');
  return {
    id: text(row.id),
    label: text(row.label),
    version: row.version,
    default: row.default === null ? null : parseRosterOrder(row.default),
  };
}
export function parseRosterDefaultsPage(v: unknown) {
  const row = record(v);
  if (
    !Array.isArray(row.items) ||
    typeof row.hasMore !== 'boolean' ||
    (row.nextCursor !== null && typeof row.nextCursor !== 'string')
  )
    throw new Error('Elenco reparti non valido');
  if (row.hasMore && !row.nextCursor) throw new Error('Cursore reparti mancante');
  return {
    items: row.items.map(parseRosterDefault),
    hasMore: row.hasMore,
    nextCursor: row.nextCursor as string | null,
  };
}
export function rosterQuery(options: RosterPageOptions): Record<string, string> {
  if (Boolean(options.sort) !== Boolean(options.direction))
    throw new Error('Criterio e direzione richiesti insieme');
  return {
    ...(options.sort ? { sort: options.sort, direction: options.direction! } : {}),
    ...(options.contextId ? { contextId: options.contextId } : {}),
    ...(options.asOf ? { asOf: options.asOf } : {}),
  };
}
export class RosterApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export async function throwRosterResponse(response: Response): Promise<never> {
  const body = (await response.json().catch(() => ({}))) as { code?: string; error?: string };
  throw new RosterApiError(
    response.status,
    body.code ?? '',
    response.status === 409
      ? 'L’ordine o i dati del reparto sono cambiati. Ricarica e riprova.'
      : 'Ordine reparto non disponibile. Riprova.',
  );
}
export const isRosterChanged = (cause: unknown) =>
  cause instanceof RosterApiError && cause.status === 409 && cause.code === 'roster_changed';
export function assertRosterPage(
  metadata: RosterMetadata | undefined,
  options: RosterPageOptions,
  asOf?: string,
) {
  if (!metadata) {
    if (options.sort || options.contextId)
      throw new Error('Ordine reparto non verificabile. Riprova.');
    return;
  }
  if (
    (options.sort &&
      (metadata.order.criterion !== options.sort ||
        metadata.order.direction !== options.direction)) ||
    (options.contextId && metadata.context?.id !== options.contextId) ||
    (asOf && metadata.asOf !== asOf)
  ) {
    throw new RosterApiError(
      409,
      'roster_changed',
      'Contesto o ordine cambiato. Ricarica il reparto.',
    );
  }
}
export interface RosterRequestOptions {
  headers: () => HeadersInit;
  fetcher?: typeof fetch;
}
export async function rosterJson<T>(
  url: string,
  parse: (value: unknown) => T,
  options: RosterRequestOptions,
  signal?: AbortSignal,
  body?: unknown,
): Promise<T> {
  const headers = new Headers(options.headers());
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  const response = await (options.fetcher ?? fetch)(url, {
    method: body === undefined ? 'GET' : 'PATCH',
    headers,
    cache: 'no-store',
    signal,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) await throwRosterResponse(response);
  return parse(await response.json());
}
