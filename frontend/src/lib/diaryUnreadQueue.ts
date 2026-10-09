import type { PatientIdentityData } from './patientIdentity';
import { parsePatientIdentity } from './patientIdentity';
import { isDiaryReadReceipt, type DiaryReadReceipt } from './diaryReading';
import { isUrgencyView } from './urgency';
import type { UrgencyView } from '../types';

export interface UnreadDiaryEntry {
  id: string;
  patientId: string;
  sourceType: 'diary' | 'consegna';
  sourceId: string;
  identity: PatientIdentityData | null;
  entryDateTime: string;
  authorName: string;
  title: string | null;
  content: string;
  priority: 'normale' | 'importante' | 'urgente';
  status: string;
  readReceipt: DiaryReadReceipt;
  urgency: UrgencyView;
}
export interface UnreadDiaryPage {
  entries: UnreadDiaryEntry[];
  totalUnread: number;
  filteredUnread: number;
  hasMore: boolean;
  nextCursor: string | null;
  patientCounts: Array<{ patientId: string; total: number }>;
}
const count = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const safeId = (v: unknown): v is string =>
  typeof v === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(v);
function validMinute(v: unknown): v is string {
  if (
    typeof v !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ||
    v.slice(0, 4) === '0000'
  )
    return false;
  const date = new Date(`${v}:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 16) === v;
}
export function parseUnreadDiaryPage(value: unknown): UnreadDiaryPage {
  if (!value || typeof value !== 'object') throw new Error('Coda non valida');
  const page = value as UnreadDiaryPage;
  if (
    !Array.isArray(page.entries) ||
    page.entries.length > 20 ||
    !count(page.totalUnread) ||
    !count(page.filteredUnread) ||
    page.filteredUnread > page.totalUnread ||
    typeof page.hasMore !== 'boolean' ||
    (page.hasMore
      ? typeof page.nextCursor !== 'string' || !page.nextCursor.trim()
      : page.nextCursor !== null) ||
    !Array.isArray(page.patientCounts)
  )
    throw new Error('Coda non valida');
  const ids = new Set<string>(),
    patients = new Set<string>();
  for (const row of page.entries) {
    if (
      !row ||
      typeof row.id !== 'string' ||
      !row.id ||
      ids.has(row.id) ||
      !safeId(row.patientId) ||
      !safeId(row.sourceId) ||
      !['diary', 'consegna'].includes(row.sourceType) ||
      row.id !== (row.sourceType === 'consegna' ? `consegna:${row.sourceId}` : row.sourceId) ||
      typeof row.content !== 'string' ||
      typeof row.authorName !== 'string' ||
      typeof row.status !== 'string' ||
      (row.title !== null && typeof row.title !== 'string') ||
      !['normale', 'importante', 'urgente'].includes(row.priority) ||
      !validMinute(row.entryDateTime) ||
      !isDiaryReadReceipt(row.readReceipt) ||
      row.readReceipt.state !== 'unread' ||
      !isUrgencyView(row.urgency) ||
      (row.identity !== null && parsePatientIdentity(row.identity)?.id !== row.patientId)
    )
      throw new Error('Voce della coda non valida');
    ids.add(row.id);
    patients.add(row.patientId);
  }
  const seen = new Set<string>();
  for (const item of page.patientCounts) {
    if (
      !item ||
      !patients.has(item.patientId) ||
      seen.has(item.patientId) ||
      !count(item.total) ||
      item.total > page.totalUnread
    )
      throw new Error('Conteggio paziente non valido');
    seen.add(item.patientId);
  }
  if (
    seen.size !== patients.size ||
    page.entries.length > page.filteredUnread ||
    (page.hasMore && !page.entries.length)
  )
    throw new Error('Conteggi della coda incoerenti');
  return page;
}
export function unreadDiaryAckPath(row: UnreadDiaryEntry): string {
  return row.sourceType === 'consegna'
    ? `/consegne/${encodeURIComponent(row.sourceId)}/ack`
    : `/patients/${encodeURIComponent(row.patientId)}/diary/${encodeURIComponent(row.sourceId)}/ack`;
}

export async function fetchUnreadPatientCounts(
  apiUrl: string,
  ids: string[],
  options: { headers: HeadersInit; signal?: AbortSignal; fetcher?: typeof fetch },
): Promise<Array<{ patientId: string; total: number }>> {
  if (!ids.length || ids.length > 50 || new Set(ids).size !== ids.length || !ids.every(safeId))
    throw new Error('Elenco pazienti non valido');
  const params = new URLSearchParams({ patientIds: ids.join(',') });
  const response = await (options.fetcher ?? fetch)(
    `${apiUrl}/patients/diary-unread-patient-counts?${params}`,
    { headers: options.headers, signal: options.signal, cache: 'no-store' },
  );
  if (!response.ok) throw new Error('Conteggi di lettura non disponibili');
  const body = await response.json();
  if (!Array.isArray(body?.items)) throw new Error('Conteggi di lettura non validi');
  const seen = new Set<string>();
  return body.items.map((item: { patientId: string; total: number }) => {
    if (!item || !ids.includes(item.patientId) || seen.has(item.patientId) || !count(item.total))
      throw new Error('Conteggio di lettura non valido');
    seen.add(item.patientId);
    return item;
  });
}
