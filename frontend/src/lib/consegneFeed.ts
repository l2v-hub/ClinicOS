import type { Consegna, ConsegnaFeedResponse, PrioritaConsegna, StatoConsegna } from '../types';

export interface ConsegnaFeedQuery {
  status?: StatoConsegna | 'attive';
  priority?: PrioritaConsegna;
  patientId?: string;
  q?: string;
}

export function buildConsegnaFeedUrl(
  apiUrl: string,
  query: ConsegnaFeedQuery,
  cursor?: string | null,
): string {
  // 20 × note massima (4 kB) mantiene anche il caso peggiore sotto il budget HTTP di 100 kB.
  const params = new URLSearchParams({ limit: '20' });
  if (query.status) params.set('status', query.status);
  if (query.priority) params.set('priority', query.priority);
  if (query.patientId) params.set('patientId', query.patientId);
  const q = query.q?.trim();
  if (q) params.set('q', q);
  if (cursor) params.set('cursor', cursor);
  return `${apiUrl}/consegne?${params.toString()}`;
}

export function mergeConsegnaPage(
  current: Consegna[],
  incoming: Consegna[],
  append: boolean,
): Consegna[] {
  if (!append) return incoming;
  const byId = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => byId.set(item.id, item));
  return [...byId.values()];
}

export function isConsegnaFeedResponse(value: unknown): value is ConsegnaFeedResponse {
  if (!value || typeof value !== 'object') return false;
  const page = value as Partial<ConsegnaFeedResponse>;
  return (
    Array.isArray(page.items) &&
    typeof page.pageInfo?.hasMore === 'boolean' &&
    (page.pageInfo.nextCursor === null || typeof page.pageInfo.nextCursor === 'string') &&
    typeof page.summary?.open === 'number' &&
    typeof page.summary?.urgentOpen === 'number'
  );
}
