import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { API_URL } from '../../config';
import { getCurrentOperator, operatorHeaders } from '../../lib/operatorSession';
import { AccessibleDialogSurface } from './AccessibleDialogSurface';
import { IntakeWorkspace } from './intake/IntakeWorkspace';
import { ImportDocumentsWorkspace } from './import/ImportDocumentsWorkspace';
import { ImportReviewWorkspace } from './import/ImportReviewWorkspace';
import { canStartNewImport, ImportApiError, ImportSessionApi } from './import/importSessionApi';
import { importSessionMemory } from './import/importSessionMemory';
import { ImportSourceCache } from './import/importSourceCache';
import {
  activeImport,
  type ImportActor,
  type ImportJob,
  type ImportResult,
} from './import/importSessionTypes';
import { assertNoLegacyImportArrays } from './sections/deriveSections';
import './import/ImportSession.css';

interface Props {
  open: boolean;
  onClose(): void;
  onImported?(): void;
  operatorId?: string;
  operatorRole?: string;
}
/** Unmount on close/actor switch: only opaque session identity outlives this workspace. */
export function DischargeImportModal(props: Props) {
  const current = getCurrentOperator();
  const actor = {
    operatorId: current?.id ?? props.operatorId,
    operatorRole: current?.role ?? props.operatorRole,
  };
  return props.open ? (
    <ImportSession key={`${actor.operatorId}:${actor.operatorRole}`} {...props} actor={actor} />
  ) : null;
}
function ImportSession({ onClose, onImported, actor }: Props & { actor: ImportActor }) {
  const title = useId();
  const [job, setJob] = useState<ImportJob | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<'documents' | 'review' | 'workspace'>('documents');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingUpload, setPendingUpload] = useState(false);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [terminal, setTerminal] = useState(false);
  const [retryMutation, setRetryMutation] = useState<(() => Promise<ImportJob>) | null>(null);
  const active = useRef(true);
  const busyRef = useRef(false);
  const jobRef = useRef<ImportJob | null>(null);
  const api = useMemo(() => {
    const actorRequired = getCurrentOperator() !== null;
    return new ImportSessionApi(async (path, options = {}) => {
      const current = getCurrentOperator();
      if (
        (actorRequired && !current) ||
        (current && (current.id !== actor.operatorId || current.role !== actor.operatorRole))
      )
        throw new Error('Operatore cambiato. Riapri la sessione con il tuo accesso.');
      const headers = operatorHeaders();
      if (actor.operatorId && !headers['X-Operator-Id'])
        headers['X-Operator-Id'] = actor.operatorId;
      if (actor.operatorRole && !headers['X-Operator-Role'])
        headers['X-Operator-Role'] = actor.operatorRole;
      return fetch(path, { ...options, headers: { ...headers, ...options.headers } });
    }, `${API_URL}/ai/extraction/jobs`);
  }, [actor.operatorId, actor.operatorRole]);
  const updateJob = useCallback((value: ImportJob) => {
    jobRef.current = value;
    if (active.current) setJob(value);
  }, []);
  const jobId = job?.id;
  const maxFileBytes = job?.limits.maxFileBytes;
  const [sourceCache, setSourceCache] = useState<{
    jobId: string;
    api: ImportSessionApi;
    value: ImportSourceCache;
  } | null>(null);
  const cache =
    sourceCache && sourceCache.jobId === jobId && sourceCache.api === api
      ? sourceCache.value
      : null;
  useEffect(() => {
    if (!jobId || !maxFileBytes) return;
    const value = new ImportSourceCache(api.request, `${api.base}/${jobId}`, maxFileBytes);
    // Own and dispose this external byte cache for exactly one mounted job lifecycle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSourceCache({ jobId, api, value });
    return () => value.clear();
  }, [api, jobId, maxFileBytes]);
  useEffect(() => {
    if (job) cache?.retain(job.documents);
  }, [cache, job]);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    let alive = true;
    void importSessionMemory
      .open({ operatorId: actor.operatorId, operatorRole: actor.operatorRole }, api)
      .then(async (value) => {
        if (!alive) return;
        updateJob(value);
        if (value.review.draftId && value.review.draftSourceIsCurrent) {
          setDraftId(value.review.draftId);
          setStep('workspace');
        } else if (value.status === 'review_ready') {
          const data = await api.result(value.id);
          if (alive) {
            checkResult(data);
            setResult(data);
            setStep('review');
          }
        }
      })
      .catch((e) => {
        if (alive) {
          setTerminal(canStartNewImport(e));
          setError(e instanceof Error ? e.message : 'Impossibile riaprire la sessione. Riprova.');
        }
      })
      .finally(() => {
        if (alive) setOpening(false);
      });
    return () => {
      alive = false;
    };
  }, [api, actor.operatorId, actor.operatorRole, attempt, updateJob]);
  const processing = job ? activeImport(job) : false;
  useEffect(() => {
    if (!processing || !jobId) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      try {
        const value = await api.get(jobId!);
        if (!alive) return;
        if (value.status === 'review_ready') {
          const data = await api.result(value.id);
          if (alive) {
            checkResult(data);
            setResult(data);
            setStep('review');
            updateJob(value);
            setError('');
          }
        } else {
          updateJob(value);
          setError(!activeImport(value) && value.error ? value.error : '');
        }
      } catch (e) {
        if (alive) {
          setError(
            e instanceof Error
              ? e.message
              : 'Connessione interrotta. La sessione è conservata; nuovo tentativo in corso.',
          );
          if (canStartNewImport(e)) {
            setTerminal(true);
            setJob(null);
            jobRef.current = null;
            setResult(null);
            setStep('documents');
            alive = false;
          }
        }
      } finally {
        if (alive) timer = setTimeout(() => void poll(), 2000);
      }
    }
    void poll();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [processing, jobId, api, updateJob]);
  function checkResult(value: ImportResult) {
    try {
      assertNoLegacyImportArrays(value._narrative as Record<string, unknown> | undefined);
      assertNoLegacyImportArrays(value._sections as unknown as Record<string, unknown> | undefined);
    } catch (error) {
      console.error('[ClinicOS] import contract violation');
      if (import.meta.env.DEV) throw error;
    }
  }
  async function mutate(action: () => Promise<ImportJob>) {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setRetryMutation(null);
    try {
      const value = await action();
      if (active.current) updateJob(value);
      return true;
    } catch (e) {
      if (!active.current) return false;
      if (e instanceof ImportApiError && e.code === 'revision_conflict') {
        const value =
          e.job ?? (jobRef.current ? await api.get(jobRef.current.id).catch(() => null) : null);
        if (value) updateJob(value);
        setError(
          'La sessione è cambiata. Ordine e pagine sono aggiornati: ripeti la modifica desiderata.',
        );
      } else {
        setError(e instanceof Error ? e.message : 'Operazione non riuscita. Riprova.');
        if (!(e instanceof ImportApiError) || e.status >= 500) setRetryMutation(() => action);
      }
      return false;
    } finally {
      busyRef.current = false;
      if (active.current) setBusy(false);
    }
  }
  async function reopen() {
    if (!job) return;
    if (await mutate(() => api.action(job, 'reopen'))) {
      setResult(null);
      setStep('documents');
    }
  }
  async function backFromDraft() {
    if (!job) return;
    try {
      const next = await api.get(job.id);
      updateJob(next);
      const data = await api.result(job.id);
      checkResult(data);
      setResult(data);
      setStep('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossibile aprire i documenti.');
      setStep('documents');
    }
  }
  async function discard() {
    if (
      !job ||
      busyRef.current ||
      !window.confirm(
        'Eliminare questa sessione e le sue pagine? Una bozza già esistente conserva i dati manuali, ma non potrà più essere confermata da questa sessione.',
      )
    )
      return;
    busyRef.current = true;
    setBusy(true);
    try {
      await api.discard(job.id);
      importSessionMemory.clear(actor);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Eliminazione non riuscita. La sessione è conservata.',
      );
    } finally {
      busyRef.current = false;
      if (active.current) setBusy(false);
    }
  }
  function completed() {
    importSessionMemory.clear(actor);
    onImported?.();
    onClose();
  }
  if (step === 'workspace' && draftId)
    return (
      <IntakeWorkspace
        open
        onClose={onClose}
        onCreated={completed}
        operatorId={actor.operatorId}
        operatorRole={actor.operatorRole}
        importDraftId={draftId}
        onBackToDocuments={() => void backFromDraft()}
      />
    );
  return (
    <AccessibleDialogSurface
      labelledBy={title}
      onClose={onClose}
      dismissible={!busy && !pendingUpload}
      closeOnOverlay={false}
      surfaceClassName={`modal-card import-modal import-session${step === 'review' ? ' import-modal--review' : ''}`}
    >
      <header className="import-modal__head">
        {(step === 'review' || processing) && (
          <button
            className="btn-ghost"
            disabled={busy || pendingUpload}
            onClick={() => void reopen()}
          >
            ← Torna ai documenti
          </button>
        )}
        <h2 id={title}>
          {step === 'review' ? 'Revisione delle lettere' : 'Importa lettere di dimissione'}
        </h2>
        <button
          className="icon-btn"
          disabled={busy || pendingUpload}
          onClick={onClose}
          aria-label="Chiudi e conserva sessione"
          data-dialog-initial-focus
        >
          ×
        </button>
      </header>
      {error && (
        <div className="import-modal__error" role="alert">
          <p>{error}</p>
          {retryMutation && (
            <button
              className="btn-secondary"
              disabled={busy}
              onClick={() => void mutate(retryMutation)}
            >
              Riprova operazione
            </button>
          )}
          {!job &&
            !opening &&
            (terminal ? (
              <button
                className="btn-primary"
                onClick={() => {
                  importSessionMemory.clear(actor);
                  setTerminal(false);
                  setOpening(true);
                  setError('');
                  setAttempt((value) => value + 1);
                }}
              >
                Nuova importazione
              </button>
            ) : (
              <button
                className="btn-secondary"
                onClick={() => {
                  setOpening(true);
                  setError('');
                  setAttempt((value) => value + 1);
                }}
              >
                Riprova apertura sessione
              </button>
            ))}
        </div>
      )}
      {opening && <p role="status">Apertura sessione salvata…</p>}
      {job &&
        cache &&
        !opening &&
        (step === 'review' && result ? (
          <ImportReviewWorkspace
            job={job}
            result={result}
            api={api}
            actor={actor}
            cache={cache}
            onJob={updateJob}
            onResult={setResult}
            onBusy={setBusy}
            onBack={() => void reopen()}
            onImported={completed}
            onWorkspace={(id) => {
              setDraftId(id);
              setStep('workspace');
            }}
          />
        ) : (
          <ImportDocumentsWorkspace
            job={job}
            api={api}
            cache={cache}
            busy={busy}
            onJob={updateJob}
            onPending={setPendingUpload}
            onMutation={mutate}
            onProcess={() =>
              void mutate(() =>
                api.action(
                  job,
                  job.canRetry || job.status === 'retryable_error' ? 'retry' : 'process',
                ),
              )
            }
          />
        ))}
      <footer className="import-session-footer">
        <span>Chiudendo conservi le pagine già salvate nella tua sessione.</span>
        {job?.expiresAt && (
          <span>
            Scadenza sessione: {new Date(job.expiresAt).toLocaleString('it-IT')}. Le operazioni
            salvate rinnovano la scadenza.
          </span>
        )}
        {job && (
          <button
            className="btn-danger btn-sm"
            disabled={busy || pendingUpload}
            onClick={() => void discard()}
          >
            Elimina sessione
          </button>
        )}
      </footer>
    </AccessibleDialogSurface>
  );
}
