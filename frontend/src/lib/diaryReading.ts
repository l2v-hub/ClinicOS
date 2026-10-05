import type { UrgencyTakenBy, UrgencyView } from '../types';
import { isUrgencyView } from './urgency';
export const DIARY_READING_CHANGED_EVENT = 'clinicos:diary-reading-changed';

export interface DiaryReadReceipt {
  state: 'unread' | 'read';
  readBy: UrgencyTakenBy | null;
  isAuthor: boolean;
  canAcknowledge: boolean;
}

export function isDiaryReadReceipt(value: unknown): value is DiaryReadReceipt {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as DiaryReadReceipt;
  if (row.state !== 'unread' && row.state !== 'read') return false;
  if (row.canAcknowledge && row.isAuthor) return false;
  return (
    isUrgencyView({
      state: row.state === 'read' ? 'taken' : 'active',
      takenBy: row.readBy,
      isAuthor: row.isAuthor,
      canAcknowledge: row.canAcknowledge,
    }) &&
    (row.state !== 'read' || row.readBy !== null)
  );
}

export function parseDiaryUnreadCount(value: unknown): number {
  const count =
    value && typeof value === 'object'
      ? (value as { unreadCount?: unknown }).unreadCount
      : undefined;
  if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0)
    throw new Error('Conteggio non disponibile');
  return count;
}

export async function postDiaryRead(
  url: string,
  headers: HeadersInit,
  fetcher: typeof fetch = fetch,
): Promise<{ readReceipt: DiaryReadReceipt; urgency: UrgencyView }> {
  const response = await fetcher(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(headers as Record<string, string>) },
    body: JSON.stringify({ purpose: 'read' }),
  });
  if (!response.ok) throw new Error('Conferma di lettura non registrata. Riprova.');
  const body = await response.json();
  if (
    !isDiaryReadReceipt(body?.readReceipt) ||
    body.readReceipt.state !== 'read' ||
    !isUrgencyView(body?.urgency)
  )
    throw new Error('Il server non ha confermato la lettura. Aggiorna la pagina.');
  return body;
}
