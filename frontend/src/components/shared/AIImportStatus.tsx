import { lazy, Suspense, useEffect, useState } from 'react';
import { API_URL } from '../../config';
import { DialogLoading } from './DialogLoading';
import { cachedGetJson } from '../../lib/cachedFetch';

const DischargeImportModal = lazy(() =>
  import('./DischargeImportModal').then((module) => ({ default: module.DischargeImportModal })),
);

// REQ-013: surfaces whether the backend AI extraction service is configured and
// usable, without ever knowing the API key (key is backend-only). Doubles as the
// entry point for the "Importa lettera di dimissione" flow (REQ-014).

interface AiStatus {
  available: boolean;
  provider: string;
  model: string;
  errors: string[];
}

interface Props {
  onStart?: () => void;
  onImported?: () => void;
  operatorId?: string;
  operatorRole?: string;
}

export function AIImportStatus({ onStart, onImported, operatorId, operatorRole }: Props) {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    cachedGetJson<AiStatus>(`${API_URL}/ai/extraction/status`)
      .then((s) => {
        if (alive) {
          setStatus(s);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) {
          setStatus(null);
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const available = status?.available === true;
  const title = loading
    ? 'Importa lettera di dimissione · Verifica disponibilità in corso'
    : available
      ? 'Importa lettera di dimissione'
      : `Servizio AI non disponibile${status?.errors?.length ? ': ' + status.errors.join('; ') : ''}`;

  return (
    <>
      <button
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
        <Suspense fallback={<DialogLoading onClose={() => setOpen(false)} />}>
          <DischargeImportModal
            open={open}
            onClose={() => setOpen(false)}
            onImported={onImported}
            operatorId={operatorId}
            operatorRole={operatorRole}
          />
        </Suspense>
      )}
    </>
  );
}
