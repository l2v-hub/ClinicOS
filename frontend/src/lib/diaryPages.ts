import { API_URL } from '../config';
import type { DiarioPazienteEntry } from '../types';
import { operatorHeaders } from './operatorSession';

interface DiaryPage {
  entries: DiarioPazienteEntry[];
  hasMore: boolean;
  nextCursor: string | null;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 1000;

function assertPage(value: unknown): asserts value is DiaryPage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Risposta diario non valida');
  }
  const page = value as Partial<DiaryPage>;
  if (
    !Array.isArray(page.entries) ||
    typeof page.hasMore !== 'boolean' ||
    (page.nextCursor !== null && typeof page.nextCursor !== 'string') ||
    (page.hasMore && !page.nextCursor)
  ) {
    throw new Error('Risposta diario non valida');
  }
}

/** Loads the complete, bounded keyset feed used by clinical print exports. */
export async function loadAllDiaryPages(
  patientId: string,
  signal?: AbortSignal,
): Promise<DiarioPazienteEntry[]> {
  const entries = new Map<string, DiarioPazienteEntry>();
  const seenCursors = new Set<string>();
  let cursor: string | null = null;

  for (let pageNumber = 0; pageNumber < MAX_PAGES; pageNumber += 1) {
    const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (cursor) query.set('cursor', cursor);
    const response = await fetch(
      `${API_URL}/patients/${encodeURIComponent(patientId)}/diary?${query.toString()}`,
      { headers: operatorHeaders(), signal },
    );
    if (!response.ok) throw new Error('Diario non disponibile');
    const value: unknown = await response.json();
    assertPage(value);
    for (const entry of value.entries) entries.set(entry.id, entry);
    if (!value.hasMore) return [...entries.values()];

    const next = value.nextCursor!;
    if (seenCursors.has(next)) throw new Error('Paginazione diario non valida');
    seenCursors.add(next);
    cursor = next;
  }

  throw new Error('Diario oltre il limite operativo');
}
