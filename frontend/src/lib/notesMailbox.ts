import type { Nota } from '../types';

export type NotesBox = 'all' | 'received' | 'sent' | 'unread';

export interface NotesMailboxQuery {
  box: NotesBox;
  q: string;
}

export interface NotesPageInfo {
  hasMore: boolean;
  nextCursor: string | null;
}

export interface NotesPageResponse {
  items: Nota[];
  pageInfo: NotesPageInfo;
  summary: { unread: number };
}

export function buildNotesMailboxUrl(
  apiUrl: string,
  query: NotesMailboxQuery,
  cursor?: string | null,
): string {
  const params = new URLSearchParams({ box: query.box, limit: '50' });
  const q = query.q.trim();
  if (q) params.set('q', q.slice(0, 100));
  if (cursor) params.set('cursor', cursor);
  return `${apiUrl}/notes?${params.toString()}`;
}

export function mergeNotesPage(current: Nota[], next: Nota[]): Nota[] {
  const seen = new Set<string>();
  return [...current, ...next].filter((note) => {
    if (seen.has(note.id)) return false;
    seen.add(note.id);
    return true;
  });
}

export function mapNoteDto(note: Nota): Nota {
  return {
    ...note,
    pazienteId: note.pazienteId ?? undefined,
    pazienteNome: note.pazienteNome ?? undefined,
  };
}
