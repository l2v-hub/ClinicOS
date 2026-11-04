import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { DialogLoading } from './DialogLoading';
import { useAiImportStatus } from './useAiImportStatus';

const DischargeImportModal = lazy(() =>
  import('./DischargeImportModal').then((module) => ({ default: module.DischargeImportModal })),
);

// REQ-013: surfaces whether the backend AI extraction service is configured and
// usable, without ever knowing the API key (key is backend-only). Doubles as the
// entry point for the "Importa lettera di dimissione" flow (REQ-014).

interface Props {
  presentation?: 'dialog' | 'page';
  onStart?: () => void;
  onImported?: (patientId?: string, moduleTabId?: string) => void;
  operatorId?: string;
  operatorRole?: string;
}

export function AIImportStatus({
  onStart, onImported, operatorId, operatorRole, presentation = 'dialog',
}: Props) {
  const { loading, available, reason } = useAiImportStatus();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeImport = useCallback(() => {
    setOpen(false);
    // Lazy loading and draft handoff replace temporary dialogs. Their removed
    // close buttons are not a stable return-focus target; this entry owns one.
    requestAnimationFrame(() => {
      const trigger = triggerRef.current;
      if (
        trigger?.isConnected &&
        (document.activeElement === document.body || document.activeElement === trigger)
      ) trigger.focus();
    });
  }, []);
  const title = loading
    ? 'Importa lettera di dimissione · Verifica disponibilità in corso'
    : available
      ? 'Importa lettera di dimissione'
      : reason;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`btn-secondary ai-import-btn${available ? '' : ' ai-import-btn--disabled'}`}
        disabled={!available}
        aria-busy={loading}
        title={title}
        aria-label={title}
        onClick={
          available
            ? () => {
                onStart?.();
                setOpen(true);
              }
            : undefined
        }
      >
        <span className={`ai-import-dot ${available ? 'is-on' : 'is-off'}`} aria-hidden="true" />
        Importa dimissione
      </button>
      {open && (
        <Suspense fallback={<DialogLoading onClose={closeImport} presentation={presentation} />}>
          <DischargeImportModal
            presentation={presentation}
            open={open}
            onClose={closeImport}
            onImported={onImported}
            operatorId={operatorId}
            operatorRole={operatorRole}
          />
        </Suspense>
      )}
    </>
  );
}
