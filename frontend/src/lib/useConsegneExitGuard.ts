import { useEffect, useSyncExternalStore } from 'react';
import type { ConsegnaDraftStore } from './consegnaDrafts';
export function useConsegneExitGuard(store: ConsegnaDraftStore) {
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
      'Ci sono bozze o salvataggi di consegne non verificati. Uscendo dalla sessione perderai questi dati. Vuoi uscire?',
    );
}
