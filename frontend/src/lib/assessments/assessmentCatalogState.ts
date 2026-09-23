import type { AssessmentCatalogData, AssessmentCatalogReader } from './assessmentCatalog';
export interface AssessmentCatalogState {
  status: 'loading' | 'ready' | 'error';
  data: AssessmentCatalogData | null;
  error: string | null;
}
/** One scoped reader per mounted catalog; aborted or superseded replies never publish. */
export function createAssessmentCatalogState(reader: AssessmentCatalogReader) {
  let snapshot: AssessmentCatalogState = { status: 'loading', data: null, error: null };
  let generation = 0;
  let controller: AbortController | undefined;
  const listeners = new Set<() => void>();
  const publish = (value: AssessmentCatalogState) => { snapshot = value; listeners.forEach(listener => listener()); };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async load() {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      const request = ++generation;
      publish({ status: 'loading', data: null, error: null });
      try {
        const data = await reader(current.signal);
        if (!current.signal.aborted && request === generation) publish({ status: 'ready', data, error: null });
      } catch (cause) {
        if (!current.signal.aborted && request === generation)
          publish({ status: 'error', data: null, error: cause instanceof Error ? cause.message : 'Date e bozze non disponibili.' });
      }
    },
    dispose() { generation++; controller?.abort(); },
  };
}
