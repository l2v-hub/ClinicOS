import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CameraCapture } from '../CameraCapture';
import { ImportPagePreview } from './ImportPageView';
import { ImportPageGrid } from './ImportPageGrid';
import { ImportUploadQueue, prepareUploadGroup } from './importUploadQueue';
import {
  activeImport,
  manifestEdit,
  opaqueKey,
  orderedPages,
  type ImportJob,
  type ImportOutcome,
} from './importSessionTypes';
import type { ImportSessionApi } from './importSessionApi';
import type { ImportSourceCache } from './importSourceCache';

interface Props {
  job: ImportJob;
  api: ImportSessionApi;
  cache: ImportSourceCache;
  busy: boolean;
  onJob(job: ImportJob): void;
  onPending(pending: boolean): void;
  onMutation(action: () => Promise<ImportJob>): Promise<boolean>;
  onProcess(): void;
}
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
export function ImportDocumentsWorkspace({
  job,
  api,
  cache,
  busy,
  onJob,
  onPending,
  onMutation,
  onProcess,
}: Props) {
  const jobRef = useRef(job);
  useEffect(() => {
    jobRef.current = job;
  }, [job]);
  const [, redraw] = useState(0);
  const [outcomes, setOutcomes] = useState<ImportOutcome[]>([]);
  const [error, setError] = useState('');
  const [groupId, setGroupId] = useState(job.manifest.groups[0]?.id ?? '');
  const [groupLabel, setGroupLabel] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [camera, setCamera] = useState<{ pageId?: string } | null>(null);
  const files = useRef<HTMLInputElement>(null);
  const replacing = useRef<string | undefined>(undefined);
  const downloads = useRef(new AbortController());
  useEffect(() => {
    if (downloads.current.signal.aborted) downloads.current = new AbortController();
    const controller = downloads.current;
    return () => controller.abort();
  }, []);
  const getJob = useCallback(() => jobRef.current, []);
  const uploadChanged = useCallback(
    (next?: ImportJob, result?: ImportOutcome[]) => {
      if (next) {
        jobRef.current = next;
        onJob(next);
      }
      if (result) setOutcomes((old) => [...old, ...result].slice(-30));
      redraw((value) => value + 1);
    },
    [onJob],
  );
  const queue = useMemo(() => new ImportUploadQueue(api), [api]);
  useLayoutEffect(() => {
    queue.connect(getJob, uploadChanged);
  }, [queue, getJob, uploadChanged]);
  const pending = queue.items.length > 0;
  useEffect(() => {
    onPending(pending);
    return () => onPending(false);
  }, [pending, onPending]);
  useEffect(() => {
    if (!pending) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [pending]);
  const groups = [...job.manifest.groups].sort((a, b) => a.sortOrder - b.sortOrder);
  const current = groups.find((group) => group.id === groupId) ?? groups[0];
  const pages = current ? orderedPages(job.manifest, current.id) : [];
  const emptyGroups = groups.filter(
    (group) => !job.manifest.pages.some((page) => page.groupId === group.id),
  );
  const processing = activeImport(job);
  const retryable = !!job.canRetry || job.status === 'retryable_error';
  const disabled = busy || processing || pending;
  const limit = job.manifest.pages.length >= job.limits.maxPages;
  const preview = job.manifest.pages.find((page) => page.id === previewId);
  const previewDocument = job.documents.find((document) => document.id === preview?.documentId);

  async function ensureGroup() {
    const id = await prepareUploadGroup(api, jobRef.current, current?.id, onMutation, (next) => {
      jobRef.current = next;
    });
    setGroupId(id);
    return id;
  }
  async function upload(input: File[], pageId?: string) {
    setError('');
    if (!input.length) return;
    const id = await ensureGroup();
    queue.add(input, id, pageId);
    try {
      await queue.run();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Caricamento non riuscito.');
      throw e;
    }
  }
  async function addGroup() {
    const id = opaqueKey();
    const edit = manifestEdit(job.manifest);
    edit.groups.push({ id, label: `Lettera ${groups.length + 1}`, sortOrder: groups.length });
    if (await onMutation(api.manifestMutation(job, edit))) setGroupId(id);
  }
  function renameGroup() {
    if (!current || !groupLabel.trim()) return;
    const edit = manifestEdit(job.manifest);
    edit.groups = edit.groups.map((group) =>
      group.id === current.id ? { ...group, label: groupLabel.trim() } : group,
    );
    void onMutation(api.manifestMutation(job, edit));
    setGroupLabel('');
  }
  function reorderGroup(direction: number) {
    if (!current) return;
    const ordered = [...groups];
    const index = ordered.findIndex((group) => group.id === current.id);
    if (index + direction < 0 || index + direction >= ordered.length) return;
    [ordered[index], ordered[index + direction]] = [ordered[index + direction], ordered[index]];
    const edit = manifestEdit(job.manifest);
    edit.groups = ordered.map(({ id, label }, sortOrder) => ({ id, label, sortOrder }));
    void onMutation(api.manifestMutation(job, edit));
  }
  async function downloadGroup() {
    if (!current) return;
    const revision = job.manifest.revision;
    try {
      const response = await api.request(`${api.base}/${job.id}/groups/${current.id}/pdf`, {
        cache: 'no-store',
        signal: downloads.current.signal,
      });
      if (!response.ok) throw new Error('PDF della lettera non disponibile.');
      const blob = await response.blob();
      if (downloads.current.signal.aborted) return;
      if (
        Number(response.headers.get('X-Import-Revision')) !== revision ||
        jobRef.current.manifest.revision !== revision
      )
        throw new Error('La lettera è cambiata. Scarica di nuovo il PDF aggiornato.');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${current.label}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download non riuscito.');
    }
  }
  return (
    <div className="import-documents" data-testid="import-documents-workspace">
      <div className="import-session-limits" role="status">
        <strong>
          {job.manifest.pages.length} / {job.limits.maxPages} pagine
        </strong>
        <span>
          {mb(job.totalBytes)} / {mb(job.limits.maxTotalBytes)}
        </span>
        <span>
          {job.documents.length} / {job.limits.maxSourceFiles} file originali · {groups.length} /{' '}
          {job.limits.maxGroups} lettere
        </span>
        <span>
          Massimo {mb(job.limits.maxFileBytes)} per file · invio progressivo, un file alla volta
        </span>
      </div>
      {(processing || retryable || job.progress.failedPages > 0) && (
        <div
          className="import-upload-status import-progress-summary"
          role="status"
          aria-live="polite"
        >
          <p>
            {job.progress.phase === 'extraction' ? 'Analisi delle lettere' : 'Lettura delle pagine'}
            : {job.progress.completedPages} / {job.progress.totalPages} pagine ·{' '}
            {job.progress.completedGroups} / {job.progress.totalGroups} lettere
          </p>
          <progress
            aria-label="Avanzamento elaborazione"
            max={Math.max(1, job.progress.totalPages + job.progress.totalGroups)}
            value={job.progress.completedPages + job.progress.completedGroups}
          />
          {job.progress.failedPages > 0 && (
            <p>
              {job.progress.failedPages}{' '}
              {job.progress.failedPages === 1 ? 'pagina non riuscita' : 'pagine non riuscite'}. Le
              pagine completate sono conservate.
            </p>
          )}
          {!processing && retryable && (
            <button
              className="btn-primary"
              disabled={disabled || emptyGroups.length > 0}
              onClick={onProcess}
            >
              Riprova elaborazione
            </button>
          )}
        </div>
      )}
      <div className="import-letter-tabs" role="tablist" aria-label="Lettere importate">
        {groups.map((group) => (
          <button
            key={group.id}
            role="tab"
            aria-selected={current?.id === group.id}
            className={`btn-secondary${current?.id === group.id ? ' is-active' : ''}`}
            onClick={() => {
              setGroupId(group.id);
              setGroupLabel('');
            }}
          >
            {group.label} · {group.pageCount} pagine
          </button>
        ))}
        <button
          className="btn-secondary"
          disabled={disabled || groups.length >= job.limits.maxGroups}
          onClick={() => void addGroup()}
        >
          + Nuova lettera
        </button>
      </div>
      {current && (
        <div className="import-letter-tools">
          <h3>{current.label}</h3>
          <label>
            Nome lettera{' '}
            <input
              value={groupLabel}
              placeholder={current.label}
              maxLength={80}
              disabled={disabled}
              onChange={(event) => setGroupLabel(event.target.value)}
            />
          </label>
          <button
            className="btn-secondary btn-sm"
            disabled={disabled || !groupLabel.trim()}
            onClick={renameGroup}
          >
            Rinomina
          </button>
          <button
            className="btn-secondary btn-sm"
            disabled={disabled || current.id === groups[0]?.id}
            onClick={() => reorderGroup(-1)}
          >
            Lettera precedente
          </button>
          <button
            className="btn-secondary btn-sm"
            disabled={disabled || current.id === groups.at(-1)?.id}
            onClick={() => reorderGroup(1)}
          >
            Lettera successiva
          </button>
          {pages.length === 0 && (
            <button
              className="btn-danger btn-sm"
              disabled={disabled || job.manifest.groups.length === 1}
              onClick={() => {
                const edit = manifestEdit(job.manifest);
                edit.groups = edit.groups
                  .filter((group) => group.id !== current.id)
                  .map((group, sortOrder) => ({ ...group, sortOrder }));
                void onMutation(api.manifestMutation(job, edit));
              }}
            >
              Elimina lettera vuota
            </button>
          )}
          {pages.length > 0 && (
            <button className="btn-secondary btn-sm" onClick={() => void downloadGroup()}>
              Scarica PDF lettera
            </button>
          )}
        </div>
      )}
      {!processing && (
        <div className="import-modal__actions">
          <button
            className="btn-secondary"
            disabled={disabled || limit}
            onClick={() => {
              replacing.current = undefined;
              files.current?.click();
            }}
          >
            Seleziona file
          </button>
          <button
            className="btn-primary"
            data-testid="scatta-foto"
            disabled={disabled || limit}
            onClick={() => setCamera({})}
          >
            Scansiona pagine
          </button>
          <span>
            Prossima pagina: {pages.length + 1}
            {current ? ` · ${current.label}` : ''}
          </span>
          <input
            ref={files}
            type="file"
            hidden
            multiple
            accept={job.limits.acceptedMimeTypes.join(',')}
            onChange={(event) => {
              const selected = Array.from(event.target.files ?? []);
              event.target.value = '';
              void upload(selected, replacing.current).catch(() => {});
            }}
          />
        </div>
      )}
      {limit && (
        <p role="status">
          Limite pagine raggiunto. Puoi riordinare, rimuovere o sostituire una pagina.
        </p>
      )}
      {current?.status === 'failed' && (
        <p role="alert" className="import-modal__error">
          {current.error || 'Analisi della lettera non riuscita. Riprova elaborazione.'}
        </p>
      )}
      {pending && (
        <div className="import-upload-status" aria-live="polite">
          <p>
            {queue.running ? 'Salvataggio in corso…' : 'Pagine non ancora salvate'} ·{' '}
            {queue.items.length} in attesa
          </p>
          {queue.items.map((item) => (
            <p key={item.clientFileId}>
              {item.file.name}:{' '}
              {item.state === 'saving'
                ? 'invio…'
                : item.state === 'error'
                  ? item.error
                  : 'in attesa'}
            </p>
          ))}
          {!queue.running && (
            <>
              <button
                className="btn-primary"
                onClick={() =>
                  void queue
                    .run()
                    .then(() => setError(''))
                    .catch(() => {})
                }
              >
                Riprova caricamento
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  queue.discard();
                  setError('');
                }}
              >
                Scarta pagine non salvate
              </button>
            </>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="import-modal__error">
          {error}
        </p>
      )}
      {outcomes.some((outcome) => outcome.status === 'duplicate') && (
        <p role="status">File già presenti riconosciuti: nessuna pagina duplicata.</p>
      )}
      <ImportPageGrid
        job={job}
        groupId={current?.id}
        cache={cache}
        disabled={disabled}
        api={api}
        onPreview={setPreviewId}
        onRetake={(pageId) => setCamera({ pageId })}
        onMutation={onMutation}
      />
      {!pages.length && (
        <p className="import-modal__empty">
          Aggiungi le pagine della lettera corrente. Puoi creare altre lettere e spostare le pagine
          in seguito.
        </p>
      )}
      {!processing && (
        <footer className="import-modal__foot">
          {emptyGroups.length > 0 && job.manifest.pages.length > 0 && (
            <p role="status">
              Aggiungi le pagine o elimina le lettere vuote:{' '}
              {emptyGroups.map((group) => group.label).join(', ')}.
            </p>
          )}
          <button
            className="btn-primary"
            disabled={disabled || !job.manifest.pages.length || emptyGroups.length > 0}
            onClick={onProcess}
          >
            {retryable ? 'Riprova elaborazione' : 'Avvia elaborazione'}
          </button>
        </footer>
      )}
      {preview && previewDocument && (
        <ImportPagePreview
          page={preview}
          document={previewDocument}
          cache={cache}
          onClose={() => setPreviewId(null)}
          onRetake={
            disabled
              ? undefined
              : () => {
                  setPreviewId(null);
                  setCamera({ pageId: preview.id });
                }
          }
        />
      )}
      <CameraCapture
        open={camera !== null}
        outputFormat="pdf"
        continueCapture={!camera?.pageId}
        captureDisabled={!camera?.pageId && limit}
        captureContext={
          camera?.pageId
            ? 'Sostituzione della pagina: l’originale resta fino al salvataggio.'
            : `${current?.label ?? 'Lettera 1'} · prossima pagina ${pages.length + 1}`
        }
        onCapture={(file) => upload([file], camera?.pageId)}
        onDiscardCapture={() => queue.discard()}
        onClose={() => setCamera(null)}
        onFallbackImport={() => {
          replacing.current = camera?.pageId;
          setCamera(null);
          files.current?.click();
        }}
      />
    </div>
  );
}
