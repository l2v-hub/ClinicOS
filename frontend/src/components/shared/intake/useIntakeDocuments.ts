// Card Documenti della scheda d'ingresso: job d'import a pagine collegato alla bozza aperta.
// Crea il job al primo file e lo collega (import-job), carica le pagine con la coda esistente,
// avvia la lettura, interroga il job e unisce i risultati (per lettera e finale) una sola volta.
// Le decisioni pure (quando unire, testi, errori) sono in intakeDocuments.ts.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ImportApiError } from '../import/importSessionApi';
import { operatorImportApi } from '../import/operatorImportApi';
import { ImportUploadQueue, prepareUploadGroup } from '../import/importUploadQueue';
import { opaqueKey, type ImportActor, type ImportJob } from '../import/importSessionTypes';
import {
  DraftApiError,
  linkImportJob,
  mergeImportIntoDraft,
  unlinkImportJob,
  type DraftResponse,
} from './intakeDraftApi';
import {
  checkFiles,
  documentsErrorMessage,
  documentsProgress,
  isVersionConflict,
  nextMergeStep,
  shouldPoll,
  type MergeStep,
} from './intakeDocuments';

type Data = Record<string, unknown>;
export const DOCUMENTS_POLL_MS = 2500;

/** Collegamento con la scheda: la bozza, la sua versione e il suo salvataggio restano lì. */
export interface IntakeDocumentsBridge {
  draftId: string | null;
  importJobId: string | null;
  /** Bozza mostrata (stato React), per ciò che si disegna. */
  data: Data;
  /** Bozza più recente, anche fra un render e l'altro, per le decisioni asincrone. */
  getData: () => Data;
  /**
   * Mutazione versionata in coda all'autosalvataggio; su 409 di versione ricarica e ripete una
   * volta (`skip` evita la ripetizione se la bozza ricaricata ha già il risultato).
   */
  mutate: (
    run: (version: number | undefined, requestId: string) => Promise<DraftResponse>,
    skip?: (fresh: DraftResponse) => boolean,
  ) => Promise<DraftResponse>;
  reload: () => Promise<DraftResponse>;
}

const TRANSIENT_MERGE = new Set([
  'group_result_outdated',
  'group_not_ready',
  'import_review_outdated',
]);
const LINK_LOST = new Set(['draft_link_changed', 'draft_not_linked', 'session_version']);

export function useIntakeDocuments(
  enabled: boolean,
  actor: ImportActor,
  bridge: IntakeDocumentsBridge,
) {
  const bridgeRef = useRef(bridge);
  useLayoutEffect(() => {
    bridgeRef.current = bridge;
  });
  const who = useMemo(
    () => ({ operatorId: actor.operatorId, operatorRole: actor.operatorRole }),
    [actor.operatorId, actor.operatorRole],
  );
  const api = useMemo(() => operatorImportApi(who), [who]);
  const [job, setJob] = useState<ImportJob | null>(null);
  const jobRef = useRef<ImportJob | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [pollError, setPollError] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const [processFailed, setProcessFailed] = useState(false);
  const [, redraw] = useState(0);
  const [pollTick, setPollTick] = useState(0);
  const done = useRef(new Set<string>());
  const createKey = useRef<string | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const updateJob = useCallback((next: ImportJob | null) => {
    jobRef.current = next;
    if (alive.current) setJob(next);
  }, []);
  const queue = useMemo(() => new ImportUploadQueue(api), [api]);
  useLayoutEffect(() => {
    queue.connect(
      () => {
        if (!jobRef.current) throw new Error('Documenti non pronti.');
        return jobRef.current;
      },
      (next) => {
        if (next) updateJob(next);
        redraw((n) => n + 1);
      },
    );
  }, [queue, updateJob]);

  const linkedId = enabled ? bridge.importJobId : null;
  // Scheda riaperta con documenti già collegati: si riprende il job (e le unioni mancanti).
  useEffect(() => {
    if (!linkedId || jobRef.current?.id === linkedId) return;
    let active = true;
    api
      .get(linkedId)
      .then((value) => {
        if (!active) return;
        updateJob(value);
        setPollTick((n) => n + 1);
      })
      .catch((e) => {
        if (active) setError(documentsErrorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [api, linkedId, updateJob]);

  // Unione di un risultato nella bozza; true se si può passare al prossimo passo.
  const merge = useCallback(
    async (step: MergeStep) => {
      const b = bridgeRef.current;
      if (!b.draftId) return false;
      const draftId = b.draftId;
      try {
        await b.mutate(
          (version, requestId) =>
            mergeImportIntoDraft(
              draftId,
              step.kind === 'final'
                ? {
                    requestId,
                    expectedDraftVersion: version,
                    manifestRevision: step.manifestRevision,
                    resultHash: step.resultHash,
                  }
                : {
                    requestId,
                    expectedDraftVersion: version,
                    groupId: step.groupId,
                    resultHash: step.resultHash,
                  },
              who,
            ),
          step.kind === 'final'
            ? (fresh) =>
                (fresh.data?._aiMerge as { final?: unknown } | undefined)?.final === step.resultHash
            : undefined,
        );
        done.current.add(step.key);
        return true;
      } catch (e) {
        if (e instanceof DraftApiError && e.status < 500 && !isVersionConflict(e)) {
          // Rifiuto definitivo per questo risultato: non si ripete (un risultato nuovo ha un'altra chiave).
          done.current.add(step.key);
          if (e.code && LINK_LOST.has(e.code)) await bridgeRef.current.reload().catch(() => null);
          if (!e.code || !TRANSIENT_MERGE.has(e.code)) setError(documentsErrorMessage(e));
          return true;
        }
        // Rete, server o seconda contesa di versione: si riprova al prossimo giro.
        setPollError(documentsErrorMessage(e));
        return false;
      }
    },
    [who],
  );

  // Interrogazione del job: solo con un job collegato, in pausa a scheda nascosta, ferma a fine lavoro.
  const jobId = enabled ? job?.id : undefined;
  useEffect(() => {
    if (!jobId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function tick() {
      if (!active) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        timer = setTimeout(() => void tick(), DOCUMENTS_POLL_MS);
        return;
      }
      let current = jobRef.current;
      try {
        current = await api.get(jobId!);
        if (!active) return;
        updateJob(current);
        setPollError('');
        if (!['failed', 'retryable_error'].includes(current.status)) setProcessFailed(false);
      } catch (e) {
        if (!active) return;
        setPollError(documentsErrorMessage(e));
        if (e instanceof ImportApiError && (e.status === 404 || e.code === 'session_terminal'))
          return; // sessione chiusa: niente più interrogazioni
      }
      if (current && bridgeRef.current.importJobId === current.id) {
        let step = nextMergeStep(current, bridgeRef.current.getData(), done.current);
        while (active && step && (await merge(step)))
          step = nextMergeStep(current, bridgeRef.current.getData(), done.current);
      }
      if (!active) return;
      if (shouldPoll(jobRef.current, bridgeRef.current.getData(), done.current))
        timer = setTimeout(() => void tick(), DOCUMENTS_POLL_MS);
    }
    void tick();
    const onVisible = () => {
      if (document.visibilityState === 'visible') setPollTick((n) => n + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [api, jobId, pollTick, merge, updateJob]);

  /** Avvia (o riprova) la lettura delle pagine salvate. */
  const startReading = useCallback(async () => {
    const current = jobRef.current;
    if (!current) return;
    const action = ['failed', 'retryable_error'].includes(current.status)
      ? 'retry'
      : current.status === 'uploaded'
        ? 'process'
        : null;
    if (!action) return;
    try {
      updateJob(await api.action(current, action));
      setProcessFailed(false);
      setError(''); // un errore precedente (es. limite di letture) non resta dopo un nuovo tentativo riuscito
    } catch (e) {
      if (e instanceof ImportApiError && e.code === 'revision_conflict') {
        const fresh = e.job ?? (await api.get(current.id).catch(() => null));
        if (fresh) {
          updateJob(fresh);
          if (fresh.status === 'uploaded') {
            try {
              updateJob(await api.action(fresh, 'process'));
              setProcessFailed(false);
              setError('');
              return;
            } catch (again) {
              setError(documentsErrorMessage(again));
              setProcessFailed(true);
              return;
            }
          }
        }
      }
      setError(documentsErrorMessage(e));
      setProcessFailed(true);
    } finally {
      setPollTick((n) => n + 1);
    }
  }, [api, updateJob]);

  /** Collega il job alla bozza (una sola volta per job, con la versione corrente). */
  async function link(current: ImportJob) {
    const b = bridgeRef.current;
    if (!b.draftId || b.importJobId === current.id) return;
    const draftId = b.draftId;
    try {
      await b.mutate(
        (version, requestId) =>
          linkImportJob(
            draftId,
            { importJobId: current.id, requestId, expectedDraftVersion: version },
            who,
          ),
        (fresh) => fresh.importJobId === current.id,
      );
    } catch (e) {
      // Risposta persa dopo il collegamento: la bozza ricaricata dice se è avvenuto.
      const fresh = await bridgeRef.current.reload().catch(() => null);
      if (fresh?.importJobId === current.id) return;
      if (e instanceof DraftApiError && e.status < 500) {
        // Non collegabile (altra scheda, altro operatore, bozza chiusa): il job resta orfano, si elimina.
        await api.discard(current.id).catch(() => undefined);
        createKey.current = null;
        updateJob(null);
      }
      throw e;
    }
  }

  /** "Scatta pagina" / "Carica file": primo file → crea e collega il job; poi stesso job. */
  const addFiles = useCallback(
    async (files: File[]) => {
      if (!files.length || busyRef.current || !bridgeRef.current.draftId) return;
      busyRef.current = true;
      setBusy(true);
      setError('');
      setProblems([]);
      try {
        let current = jobRef.current;
        if (!current) {
          createKey.current ??= opaqueKey();
          current = await api.create(createKey.current);
          updateJob(current);
        }
        await link(current);
        const { accepted, problems: rejected } = checkFiles(
          files,
          current.limits,
          current.manifest.pages.length,
        );
        setProblems(rejected);
        if (!accepted.length) return;
        let mutationError: unknown = null;
        const groupId = await prepareUploadGroup(
          api,
          current,
          [...current.manifest.groups].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.id,
          async (action) => {
            try {
              await action();
              return true;
            } catch (e) {
              mutationError = e;
              return false;
            }
          },
          updateJob,
        ).catch((e) => {
          throw mutationError ?? e;
        });
        queue.add(accepted, groupId);
        await queue.run();
        await startReading();
      } catch (e) {
        setError(documentsErrorMessage(e));
      } finally {
        busyRef.current = false;
        if (alive.current) setBusy(false);
      }
    },
    // link usa solo ref e props stabili
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api, queue, startReading, updateJob],
  );

  const retryUpload = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      await queue.run();
      await startReading();
    } catch (e) {
      setError(documentsErrorMessage(e));
    } finally {
      busyRef.current = false;
      if (alive.current) setBusy(false);
    }
  }, [queue, startReading]);

  /** Scollega i documenti (solo prima dell'unione finale): i valori della scheda restano. */
  const unlink = useCallback(async () => {
    const b = bridgeRef.current;
    if (!b.draftId || busyRef.current) return false;
    const draftId = b.draftId;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      await b.mutate((version) => unlinkImportJob(draftId, { expectedDraftVersion: version }, who));
      queue.discard();
      done.current = new Set();
      createKey.current = null;
      setProblems([]);
      setProcessFailed(false);
      updateJob(null);
      return true;
    } catch (e) {
      setError(documentsErrorMessage(e));
      return false;
    } finally {
      busyRef.current = false;
      if (alive.current) setBusy(false);
    }
  }, [who, queue, updateJob]);

  const data = bridge.data;
  const progress = documentsProgress(job, data);
  const retryable =
    !!job &&
    !progress.reading &&
    (processFailed || ['failed', 'retryable_error', 'uploaded'].includes(job.status)) &&
    job.manifest.pages.length > 0;
  return {
    job,
    /** Accesso ai file del job con le intestazioni dell'operatore (pannello documento). */
    api,
    progress,
    busy,
    error: error || pollError,
    problems,
    pendingUploads: queue.items.length,
    uploading: !!queue.running,
    retryable,
    canUnlink: !!bridge.importJobId && !data._importSource,
    limits: job?.limits,
    addFiles,
    retryUpload,
    retryReading: startReading,
    unlink,
  };
}
