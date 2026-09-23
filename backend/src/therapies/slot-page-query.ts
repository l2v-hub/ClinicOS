import type { Operator } from '../ai/auth.js';
import type { TherapyPatientAccess } from './therapy-query.js';
import { MAX_ROSTER_CURSOR, rosterScopeFingerprint } from '../roster/cursor.js';
import { requestedRosterOrder } from '../roster/order-contract.js';

export const DEFAULT_THERAPY_SLOT_PAGE_LIMIT = 100;
export const MAX_THERAPY_SLOT_PAGE_LIMIT = 250;
export class TherapySlotPageInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TherapySlotPageInputError';
  }
}
export interface TherapySlotPageQuery {
  limit: number;
  cursor?: string;
  sort?: string;
  direction?: string;
  contextId?: string;
}
export function therapySlotScopeFingerprint(
  access: TherapyPatientAccess,
  actor: Operator = { id: 'internal-reader', role: 'operatore' },
): string {
  return rosterScopeFingerprint(actor, access);
}
export function parseTherapySlotPageQuery(query: Record<string, unknown>): TherapySlotPageQuery {
  if (
    Object.keys(query).some(
      (key) => !['date', 'limit', 'cursor', 'sort', 'direction', 'contextId'].includes(key),
    )
  )
    throw new TherapySlotPageInputError('Parametro non supportato');
  const raw = query.limit;
  if (raw !== undefined && (typeof raw !== 'string' || !/^[1-9]\d{0,2}$/.test(raw)))
    throw new TherapySlotPageInputError('Limite non valido');
  const limit = raw === undefined ? DEFAULT_THERAPY_SLOT_PAGE_LIMIT : Number(raw);
  if (limit > MAX_THERAPY_SLOT_PAGE_LIMIT) throw new TherapySlotPageInputError('Limite non valido');
  if (
    query.cursor !== undefined &&
    (typeof query.cursor !== 'string' ||
      !query.cursor.length ||
      query.cursor.length > MAX_ROSTER_CURSOR)
  )
    throw new TherapySlotPageInputError('Cursore non valido');
  const order = requestedRosterOrder(query);
  return {
    limit,
    ...(query.cursor !== undefined && { cursor: query.cursor as string }),
    ...(order.explicit && { sort: order.explicit.criterion, direction: order.explicit.direction }),
    ...(order.contextId && { contextId: order.contextId }),
  };
}
