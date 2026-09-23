import { useEffect, useSyncExternalStore } from 'react';
import type { AssessmentDraftStore } from './assessmentDraftStore';
export function useAssessmentExitGuard(store: AssessmentDraftStore) {
  useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);
  const dirty = store.hasUnsaved();
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);
  return () =>
    !store.hasUnsaved() ||
    window.confirm(
      'Ci sono valutazioni non salvate o con esito non verificato. Uscendo dalla sessione perderai questi dati. Vuoi uscire?',
    );
}
