// Prefetch a browser inattivo dei dati dei tab piu' usati della cartella (sezioni cliniche,
// terapie, diario, catalogo moduli) appena la scheda di un paziente e' aperta.
//
// I tab si montano solo al click e ognuno fa la propria richiesta: il primo click su ciascuno
// costava un giro di rete a schermo vuoto. Qui le stesse letture partono in anticipo, in
// parallelo, e finiscono nella cache di sessione con le stesse chiavi e forme usate dai tab
// (patientTabSnapshots.ts): al click il tab si disegna subito e rivalida in background.
import { API_URL } from '../config';
import { operatorHeaders } from './operatorSession';
import { readSessionCache, trackSessionCache, writeSessionCache } from './sessionCache';
import {
  assessmentsCacheKey,
  diaryCacheKey,
  narrativeCacheKey,
  sortTherapiesByState,
  therapyListCacheKey,
  type DiarySnapshot,
  type TherapyListSnapshot,
} from './patientTabSnapshots';
import { loadTherapyPage } from './therapyPages';
import { createAssessmentCatalogReader } from './assessments/assessmentCatalog';

const inflight = new Set<string>();

type Task = { key: string; read: () => Promise<unknown | undefined> };

function tasksFor(patientId: string): Task[] {
  const id = encodeURIComponent(patientId);
  return [
    {
      key: narrativeCacheKey(patientId),
      read: async () => {
        const r = await fetch(`${API_URL}/patients/${id}/narrative-sections`, {
          headers: operatorHeaders(),
        });
        const data = (await r.json()) as { sections?: unknown };
        if (!r.ok) throw new Error('narrative');
        return Array.isArray(data.sections) ? data.sections : [];
      },
    },
    {
      key: therapyListCacheKey(patientId, {}),
      read: async () => {
        const page = await loadTherapyPage(patientId, 'tutte', null, {});
        const snapshot: TherapyListSnapshot = {
          therapies: sortTherapiesByState(page.items),
          nextCursor: page.pageInfo.nextCursor,
          summary: page.summary,
        };
        return snapshot;
      },
    },
    {
      key: diaryCacheKey(patientId, 'tutti'),
      read: async () => {
        const r = await fetch(`${API_URL}/patients/${id}/diary?limit=50`, {
          headers: operatorHeaders(),
        });
        if (!r.ok) throw new Error('diary');
        const data = (await r.json()) as Partial<DiarySnapshot>;
        const entries = data.entries ?? [];
        // Diario vuoto: il tab applica il fallback legacy dalla cartella, che qui non e' noto.
        if (entries.length === 0) return undefined;
        const snapshot: DiarySnapshot = {
          entries,
          hasMore: Boolean(data.hasMore),
          nextCursor: data.nextCursor ?? null,
        };
        return snapshot;
      },
    },
    {
      key: assessmentsCacheKey(patientId),
      read: () =>
        createAssessmentCatalogReader(
          API_URL,
          patientId,
          operatorHeaders(),
        )(new AbortController().signal),
    },
  ];
}

const idle = (fn: () => void) =>
  typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback(() => fn(), { timeout: 1500 })
    : window.setTimeout(fn, 150);

/** Avvia il prefetch dei tab non ancora in cache per il paziente; idempotente. */
export function prefetchPatientDetailTabs(patientId: string): void {
  idle(() => {
    for (const task of tasksFor(patientId)) {
      if (readSessionCache(task.key) !== undefined || inflight.has(task.key)) continue;
      inflight.add(task.key);
      const read = task.read();
      trackSessionCache(task.key, read);
      read
        .then((value) => {
          if (value !== undefined && readSessionCache(task.key) === undefined)
            writeSessionCache(task.key, value);
        })
        .catch(() => undefined)
        .finally(() => inflight.delete(task.key));
    }
  });
}
