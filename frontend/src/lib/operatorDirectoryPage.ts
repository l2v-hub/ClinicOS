export interface OperatorDirectoryPageInfo {
  hasMore: boolean;
  nextCursor: string | null;
}

export interface OperatorDirectorySummary {
  total: number;
  active: number;
  matching: number;
  appointmentsToday: number;
}

export type OperatorDirectoryStatus = 'all' | 'active' | 'inactive';

export interface OperatorDirectoryPage<T> {
  items: T[];
  pageInfo: OperatorDirectoryPageInfo;
  summary: OperatorDirectorySummary | null;
}

function nonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function buildOperatorDirectoryPageUrl(
  apiUrl: string,
  admin: boolean,
  cursor?: string | null,
  q?: string,
  status: OperatorDirectoryStatus = 'all',
): string {
  const params = new URLSearchParams({ limit: '100' });
  if (cursor) params.set('cursor', cursor);
  if (q?.trim()) params.set('q', q.trim());
  if (admin && status !== 'all') params.set('status', status);
  return `${apiUrl}${admin ? '/operators/page' : '/operators/directory/page'}?${params}`;
}

export function parseOperatorDirectoryPage<T>(value: unknown): OperatorDirectoryPage<T> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('invalid operator directory page');
  }
  const page = value as Record<string, unknown>;
  const pageInfo = page.pageInfo as Record<string, unknown> | undefined;
  const summary = page.summary as Record<string, unknown> | null | undefined;
  if (
    !Array.isArray(page.items) ||
    !pageInfo ||
    typeof pageInfo.hasMore !== 'boolean' ||
    (pageInfo.nextCursor !== null && typeof pageInfo.nextCursor !== 'string') ||
    (pageInfo.hasMore && !pageInfo.nextCursor)
  ) {
    throw new Error('invalid operator directory page');
  }
  if (summary != null) {
    if (
      !nonNegativeInteger(summary.total) ||
      !nonNegativeInteger(summary.active) ||
      !nonNegativeInteger(summary.matching) ||
      !nonNegativeInteger(summary.appointmentsToday) ||
      summary.active > summary.total ||
      summary.matching > summary.total
    ) {
      throw new Error('invalid operator directory page');
    }
  }
  return {
    items: page.items as T[],
    summary: summary
      ? {
          total: summary.total as number,
          active: summary.active as number,
          matching: summary.matching as number,
          appointmentsToday: summary.appointmentsToday as number,
        }
      : null,
    pageInfo: {
      hasMore: pageInfo.hasMore,
      nextCursor: pageInfo.nextCursor as string | null,
    },
  };
}

export function mergeOperatorDirectoryPages<T extends { id: string }>(
  previous: T[],
  incoming: T[],
): T[] {
  const byId = new Map(previous.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()];
}
