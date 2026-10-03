import type { Consegna, ConsegnaOverview } from '../types';
import { isConsegnaUrgencyActive } from './consegnaUrgency';

export const HANDOVER_PREVIEW_LIMIT = 5;

/** A bounded selection from the server previews, never the entire feed. */
export function handoverPreview(overview: ConsegnaOverview | null): Consegna[] {
  if (!overview) return [];
  const unique = new Map<string, Consegna>();
  for (const item of [...overview.recentPreview, ...overview.urgentPreview])
    unique.set(item.id, item);
  const rank = (item: Consegna) =>
    isConsegnaUrgencyActive(item) ? 0 : item.priorita === 'alta' ? 1 : 2;
  const timestamp = (item: Consegna) => {
    const value = Date.parse(item.createdAt);
    return Number.isFinite(value) ? value : 0;
  };
  return [...unique.values()]
    .sort((a, b) => rank(a) - rank(b) || timestamp(b) - timestamp(a) || a.id.localeCompare(b.id))
    .slice(0, HANDOVER_PREVIEW_LIMIT);
}

/** Exact aggregate; do not infer unread critical counts from the truncated preview. */
export function criticalHandoverCount(
  overview: ConsegnaOverview | null,
  state: 'loading' | 'ready' | 'error',
): number | null {
  const value = overview?.summary.urgentActive;
  return state === 'ready' && typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : null;
}
