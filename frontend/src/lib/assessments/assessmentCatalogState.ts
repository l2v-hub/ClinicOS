import type { AssessmentCatalogData, AssessmentCatalogReader } from './assessmentCatalog';
import {
  pendingSessionCache,
  readSessionCache,
  sessionCacheEpoch,
  writeSessionCache,
} from '../sessionCache';
export interface AssessmentCatalogState {
  status: 'loading' | 'ready' | 'error';
  data: AssessmentCatalogData | null;
  error: string | null;
}
/** One scoped reader per mounted catalog; aborted or superseded replies never publish. */
export function createAssessmentCatalogState(reader: AssessmentCatalogReader, cacheKey?: string) {
  // Catalogo gia' letto in sessione per questo paziente: pubblicato subito come 'ready' e
  // rivalidato da load() senza tornare a 'loading'.
  const cached = cacheKey ? readSessionCache<AssessmentCatalogData>(cacheKey) : undefined;
  let snapshot: AssessmentCatalogState = cached
    ? { status: 'ready', data: cached, error: null }
    : { status: 'loading', data: null, error: null };
  let generation = 0;
  let controller: AbortController | undefined;
  const listeners = new Set<() => void>();
  const publish = (value: AssessmentCatalogState) => {
    snapshot = value;
    listeners.forEach((listener) => listener());
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async load() {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      const request = ++generation;
      const epoch = sessionCacheEpoch();
      if (snapshot.status !== 'ready') publish({ status: 'loading', data: null, error: null });
      try {
        // Lettura anticipata gia' in volo (apertura scheda): si aspetta quella.
        const pendingRead = cacheKey ? pendingSessionCache(cacheKey) : undefined;
        if (pendingRead) {
          await pendingRead;
          const cached = cacheKey ? readSessionCache<AssessmentCatalogData>(cacheKey) : undefined;
          if (
            cached &&
            !current.signal.aborted &&
            epoch === sessionCacheEpoch() &&
            request === generation
          ) {
            publish({ status: 'ready', data: cached, error: null });
            return;
          }
        }
        const data = await reader(current.signal);
        if (!current.signal.aborted && epoch === sessionCacheEpoch() && request === generation) {
          if (cacheKey) writeSessionCache(cacheKey, data, epoch);
          publish({ status: 'ready', data, error: null });
        }
      } catch (cause) {
        if (!current.signal.aborted && epoch === sessionCacheEpoch() && request === generation)
          publish({
            status: 'error',
            data: null,
            error: cause instanceof Error ? cause.message : 'Date e bozze non disponibili.',
          });
      }
    },
    dispose() {
      generation++;
      controller?.abort();
    },
  };
}
