import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getCurrentOperator } from '../../lib/operatorSession';
import { useRecencyClock } from '../../lib/useRecencyClock';
import { ConfirmDialog } from './ConfirmDialog';
import { AccessibleDialogSurface } from './AccessibleDialogSurface';
import {
  getDraft,
  type DraftResponse,
  type ExistingIntakeDraftReference,
} from './intake/intakeDraftApi';
import {
  expiredDraftRecovery,
  draftResumeIntent,
  type ExpiredDraftRecovery,
  type DraftResumeIntent,
} from './import/draftImportRecovery';
import { IntakeWorkspace } from './intake/IntakeWorkspace';
import { ImportDocumentsWorkspace } from './import/ImportDocumentsWorkspace';
import { ImportReviewWorkspace } from './import/ImportReviewWorkspace';
import { ImportApiError, ImportSessionApi } from './import/importSessionApi';
import {
  importFailureMessage,
  importRecoveryPresentation,
  isUnavailableSession,
} from './import/importSessionRecovery';
import { operatorImportApi } from './import/operatorImportApi';
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
  presentation?: 'dialog' | 'page';
  initialDraftId?: string;
  onClose(): void;
  /** Paziente creato o aggiornato dall'import e, se scelto nel wizard, il modulo da aprire. */
  onImported?(patientId?: string, moduleTabId?: string): void;
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
    <ImportSession
      key={`${actor.operatorId}:${actor.operatorRole}:${props.initialDraftId ?? ''}`}
      {...props}
      actor={actor}
    />
  ) : null;
}
function ImportSession({
  onClose,
  onImported,
  actor,
  initialDraftId,
  presentation = 'dialog',
  preserveSessionMemory = false,
}: Props & { actor: ImportActor; preserveSessionMemory?: boolean }) {
  const title = useId();
  const [inspectingDraft, setInspectingDraft] = useState<ExistingIntakeDraftReference | null>(null);
  const [inspectionNotice, setInspectionNotice] = useState('');
  useLayoutEffect(() => {
    if (!inspectingDraft) return;
    // Page workspaces portal into main, so inert must target the rendered surface,
    // not a React wrapper outside that portal. The inspected dialog lives in body.
    const background = document
      .getElementById(title)
      ?.closest<HTMLElement>('.patient-workspace, [role="dialog"]');
    if (!background) return;
    const previous = background.inert;
    background.inert = true;
    return () => {
      background.inert = previous;
    };
  }, [inspectingDraft, title]);
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
  const [creation, setCreation] = useState<'pending' | 'created' | null>(null);
  const [retryMutation, setRetryMutation] = useState<(() => Promise<ImportJob>) | null>(null);
  const [expiredDraft, setExpiredDraft] = useState<ExpiredDraftRecovery | null>(null);
  const resumeIntent = useRef<DraftResumeIntent | null>(null);
  const refreshingRecovery = useRef(false);
  const active = useRef(true);
  const reviewSave = useRef<(() => void) | null>(null);
  const [closeRequested, setCloseRequested] = useState(false);
  const [closeSavePending, setCloseSavePending] = useState(false);
  const pendingNavigation = useRef<((allowed: boolean) => void) | null>(null);
  const [navigationNotice, setNavigationNotice] = useState('');
  function finishClose() {
    const resolve = pendingNavigation.current;
    pendingNavigation.current = null;
    onClose();
    resolve?.(true);
  }
  function cancelClose() {
    setCloseRequested(false);
    setCloseSavePending(false);
    pendingNavigation.current?.(false);
    pendingNavigation.current = null;
  }
  const [reviewCanSave, setReviewCanSave] = useState(false);
  const registerSave = useCallback((save: (() => void) | null) => {
    reviewSave.current = save;
    setReviewCanSave(!!save);
  }, []);
  function requestClose() {
    // A direct header/footer close starts a new intent, never an old route.
    pendingNavigation.current?.(false);
    pendingNavigation.current = null;
    setCloseSavePending(false);
    if (step === 'review' && !job?.review.draftId) {
      setCloseRequested(true);
      return;
    }
    onClose();
  }
  useEffect(() => {
    if (!closeSavePending || busy) return;
    // Successful handoff already settled the route in finishClose. If review
    // remains open, release the surface's navigation guard after save/validation.
    const resolve = pendingNavigation.current;
    pendingNavigation.current = null;
    resolve?.(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- completes the external save/route handshake
    setCloseSavePending(false);
  }, [closeSavePending, busy]);
  useEffect(() => {
    if (busy || pendingUpload || !navigationNotice) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- discard the notice when its blocking operation ends
    setNavigationNotice('');
  }, [busy, pendingUpload, navigationNotice]);
  const busyRef = useRef(false);
  const jobRef = useRef<ImportJob | null>(null);
  const api = useMemo(
    () => operatorImportApi({ operatorId: actor.operatorId, operatorRole: actor.operatorRole }),
    [actor.operatorId, actor.operatorRole],
  );
  const updateJob = useCallback((value: ImportJob) => {
    jobRef.current = value;
    if (active.current) setJob(value);
  }, []);
  const invalidateSession = useCallback(() => {
    resumeIntent.current = null;
    setExpiredDraft(null);
    jobRef.current = null;
    setJob(null);
    setResult(null);
    setDraftId(null);
    setRetryMutation(null);
    setStep('documents');
    setTerminal(true);
    setCreation(null);
  }, []);
  const now = useRecencyClock();
  const recovery = importRecoveryPresentation({
    job,
    opening,
    error: !!error,
    terminal,
    pendingUpload,
    now,
  });
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
      pendingNavigation.current?.(false);
      pendingNavigation.current = null;
    };
  }, []);
  useEffect(() => {
    let alive = true;
    let sessionRead = true;
    let savedDraft: DraftResponse | null = null;
    const opening = initialDraftId
      ? getDraft(initialDraftId, actor).then((draft) => {
          if (draft.id !== initialDraftId)
            throw new Error('La risposta non corrisponde alla pratica richiesta.');
          if (!draft.importJobId) throw new Error('La bozza non ha un documento collegato.');
          if (draft.status !== 'draft') throw new Error('Questa bozza è già stata confermata.');
          savedDraft = draft;
          return api.get(draft.importJobId).then((value) => {
            if (value.id !== draft.importJobId || value.review?.draftId !== draft.id)
              throw new Error('La sessione non corrisponde alla pratica richiesta.');
            return value;
          });
        })
      : importSessionMemory.open(
          { operatorId: actor.operatorId, operatorRole: actor.operatorRole },
          api,
        );
    void opening
      .then(async (value) => {
        if (!alive) return;
        updateJob(value);
        sessionRead = false;
        setCreation((current) => (current === 'pending' ? 'created' : current));
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
          const candidate = expiredDraftRecovery(savedDraft, e);
          if (candidate) {
            setExpiredDraft(candidate);
            setCreation(null);
            setError(
              (refreshingRecovery.current
                ? 'La pratica è cambiata. Lo stato è stato riletto: conferma di nuovo la ripresa. '
                : '') +
                'I vecchi documenti non sono disponibili. I dati della pratica restano salvati; ricarica e rivedi i documenti per proseguire.',
            );
          } else {
            if (isUnavailableSession(e, sessionRead)) invalidateSession();
            setError(importFailureMessage(e));
          }
        }
      })
      .finally(() => {
        refreshingRecovery.current = false;
        if (alive) setOpening(false);
      });
    return () => {
      alive = false;
    };
  }, [
    api,
    actor.operatorId,
    actor.operatorRole,
    initialDraftId,
    attempt,
    updateJob,
    invalidateSession,
  ]);
  const processing = job ? activeImport(job) : false;
  useEffect(() => {
    if (!processing || !jobId) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      let sessionRead = true;
      try {
        const value = await api.get(jobId!);
        if (!alive) return;
        sessionRead = false;
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
          setError(importFailureMessage(e));
          if (isUnavailableSession(e, sessionRead)) {
            invalidateSession();
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
  }, [processing, jobId, api, updateJob, invalidateSession]);
  async function resumeSavedDraft() {
    if (!expiredDraft || busyRef.current || pendingUpload) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const intent = draftResumeIntent(expiredDraft, resumeIntent.current);
      resumeIntent.current = intent;
      const value = await api.resumeDraft(intent.job, intent.draft, intent.requestId);
      if (!active.current) return;
      updateJob(value);
      setDraftId(intent.draft.id);
      setResult(null);
      setStep('documents');
      setTerminal(false);
      setExpiredDraft(null);
      resumeIntent.current = null;
    } catch (error) {
      if (!active.current) return;
      if (error instanceof ImportApiError && error.status === 409) {
        // A known conflict needs a current read and a new explicit operator decision.
        resumeIntent.current = null;
        setExpiredDraft(null);
        refreshingRecovery.current = true;
        setOpening(true);
        setAttempt((value) => value + 1);
      } else {
        if (error instanceof ImportApiError && error.status < 500) {
          resumeIntent.current = null;
          setExpiredDraft(null);
        }
        setError(importFailureMessage(error));
      }
    } finally {
      busyRef.current = false;
      if (active.current) setBusy(false);
    }
  }
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
        try {
          const value = e.job ?? (jobRef.current ? await api.get(jobRef.current.id) : null);
          if (value) updateJob(value);
          setError('La sessione è cambiata. Ripeti la modifica dopo aver verificato le pagine.');
        } catch (readError) {
          if (isUnavailableSession(readError, true)) invalidateSession();
          setError(importFailureMessage(readError));
        }
      } else {
        if (isUnavailableSession(e)) invalidateSession();
        setError(importFailureMessage(e));
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
    let sessionRead = true;
    try {
      const next = await api.get(job.id);
      updateJob(next);
      sessionRead = false;
      const data = await api.result(job.id);
      checkResult(data);
      setResult(data);
      setStep('review');
    } catch (e) {
      if (isUnavailableSession(e, sessionRead)) invalidateSession();
      setError(importFailureMessage(e));
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
      if (!preserveSessionMemory) importSessionMemory.clear(actor);
      onClose();
    } catch (e) {
      if (isUnavailableSession(e)) invalidateSession();
      setError(importFailureMessage(e));
    } finally {
      busyRef.current = false;
      if (active.current) setBusy(false);
    }
  }
  // Inoltra chi è stato creato: senza, a fine import si tornava alla lista e l'operatore doveva
  // cercare il paziente appena inserito.
  function completed(patientId?: string, moduleTabId?: string) {
    if (!preserveSessionMemory) importSessionMemory.clear(actor);
    onImported?.(patientId, moduleTabId);
    onClose();
  }
  if (step === 'workspace' && draftId)
    return (
      <IntakeWorkspace
        open
        presentation={presentation}
        onClose={onClose}
        onCreated={completed}
        operatorId={actor.operatorId}
        operatorRole={actor.operatorRole}
        importDraftId={draftId}
        resumeDraftId={initialDraftId}
        importDocuments={job ? { job, api } : undefined}
        onBackToDocuments={() => void backFromDraft()}
      />
    );
  const surface = (
    <AccessibleDialogSurface
      presentation={presentation}
      beforeNavigate={async () => {
        if (busy || pendingUpload) {
          setNavigationNotice(
            'Caricamento in corso. Attendi il completamento prima di cambiare pagina.',
          );
          return false;
        }
        setNavigationNotice('');
        if (step === 'review' && !job?.review.draftId) {
          setCloseRequested(true);
          return new Promise<boolean>((resolve) => {
            pendingNavigation.current = resolve;
          });
        }
        return true;
      }}
      labelledBy={title}
      onClose={requestClose}
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
          onClick={requestClose}
          aria-label={recovery.closeLabel}
          data-dialog-initial-focus
        >
          ×
        </button>
      </header>
      {navigationNotice && <p role="alert">{navigationNotice}</p>}
      {inspectionNotice && <p role="status">{inspectionNotice}</p>}
      {(error || expiredDraft) && (
        <div className="import-modal__error" role="alert">
          <p>{error || 'Ripresa della pratica in corso…'}</p>
          {expiredDraft && (
            <button className="btn-primary" disabled={busy} onClick={() => void resumeSavedDraft()}>
              Riprendi la pratica e ricarica i documenti
            </button>
          )}
          {!expiredDraft && retryMutation && (
            <button
              className="btn-secondary"
              disabled={busy}
              onClick={() => void mutate(retryMutation)}
            >
              Riprova operazione
            </button>
          )}
          {!expiredDraft &&
            !retryMutation &&
            !opening &&
            (terminal && !initialDraftId ? (
              <button
                className="btn-primary"
                onClick={() => {
                  if (!preserveSessionMemory) importSessionMemory.clear(actor);
                  setTerminal(false);
                  setCreation('pending');
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
                  resumeIntent.current = null;
                  setExpiredDraft(null);
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
      {closeRequested &&
        createPortal(
          <ConfirmDialog
            open={closeRequested}
            title="Chiudere l'importazione?"
            message={
              reviewCanSave
                ? 'Puoi salvare la bozza o chiudere senza salvarla. La sessione documenti resta recuperabile.'
                : 'Decidi e salva tutti i conflitti prima di salvare una bozza. Puoi comunque chiudere: la sessione documenti resta recuperabile.'
            }
            tone="primary"
            confirmLabel="Salva bozza e chiudi"
            confirmDisabled={!reviewCanSave}
            cancelLabel="Continua la revisione"
            busy={busy}
            onCancel={cancelClose}
            alternativeAction={{ label: 'Chiudi senza salvare', onClick: finishClose }}
            onConfirm={() => {
              setCloseRequested(false);
              setCloseSavePending(true);
              reviewSave.current?.();
            }}
          />,
          document.body,
        )}
      {opening && (
        <p role="status">
          {creation === 'pending'
            ? 'Creazione nuova sessione…'
            : 'Verifica o creazione della sessione…'}
        </p>
      )}
      {!opening && !error && creation === 'created' && (
        <p role="status">Nuova sessione creata. Aggiungi i documenti da importare.</p>
      )}
      {job &&
        cache &&
        !opening &&
        (step === 'review' && result ? (
          <ImportReviewWorkspace
            onClose={finishClose}
            onInspectExistingDraft={setInspectingDraft}
            registerSave={registerSave}
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
              if (pendingNavigation.current) {
                finishClose();
                return;
              }
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
        <span>
          {expiredDraft
            ? 'La pratica conserva i dati salvati. Per continuare, riprendi e ricarica i documenti.'
            : recovery.footer}
        </span>
        {recovery.expiresAt && (
          <span>
            Scadenza sessione: {recovery.expiresAt.toLocaleString('it-IT')}. Le operazioni salvate
            rinnovano la scadenza.
          </span>
        )}
        <button
          className="btn-secondary btn-sm"
          disabled={busy || pendingUpload}
          onClick={requestClose}
        >
          Chiudi importazione
        </button>
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
  return (
    <>
      {surface}
      {inspectingDraft &&
        createPortal(
          inspectingDraft.importJobId ? (
            <ImportSession
              key={inspectingDraft.id}
              open
              actor={actor}
              initialDraftId={inspectingDraft.id}
              preserveSessionMemory
              onClose={() => setInspectingDraft(null)}
              onImported={() => {
                setInspectionNotice(
                  'La pratica esistente è stata completata. I nuovi documenti e le correzioni restano in questa revisione.',
                );
                setInspectingDraft(null);
              }}
            />
          ) : (
            <IntakeWorkspace
              key={inspectingDraft.id}
              open
              resumeDraftId={inspectingDraft.id}
              operatorId={actor.operatorId}
              operatorRole={actor.operatorRole}
              onClose={() => setInspectingDraft(null)}
              onCreated={() => {
                setInspectionNotice(
                  'La pratica esistente è stata completata. I nuovi documenti e le correzioni restano in questa revisione.',
                );
                setInspectingDraft(null);
              }}
            />
          ),
          document.body,
        )}
    </>
  );
}
