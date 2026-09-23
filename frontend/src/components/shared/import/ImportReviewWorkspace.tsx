import { useRef, useState } from 'react';
import { ImportSectionsReview } from '../sections/ImportSectionsReview';
import { ImportPageContent, ImportPagePreview } from './ImportPageView';
import { ImportConflictReview } from './ImportConflictReview';
import { effectiveImportSections } from './importReviewModel';
import { ImportReviewHandoff } from './importReviewHandoff';
import { getDraft, refreshImportDraft, DraftApiError } from '../intake/intakeDraftApi';
import type { ConfirmPatient } from '../ImportReviewFull';
import type { ConflictDecision, ImportActor, ImportJob, ImportResult } from './importSessionTypes';
import { opaqueKey } from './importSessionTypes';
import type { ImportSessionApi } from './importSessionApi';
import type { ImportSourceCache } from './importSourceCache';

interface Props {
  job: ImportJob;
  result: ImportResult;
  api: ImportSessionApi;
  actor: ImportActor;
  cache: ImportSourceCache;
  onResult(result: ImportResult): void;
  onJob(job: ImportJob): void;
  onWorkspace(id: string): void;
  onBack(): void;
  onImported(): void;
  onBusy(value: boolean): void;
}
export function ImportReviewWorkspace({
  job,
  result,
  api,
  actor,
  cache,
  onResult,
  onJob,
  onWorkspace,
  onBack,
  onImported,
  onBusy,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [groupId, setGroupId] = useState(result._groups[0]?.groupId ?? '');
  const [pageId, setPageId] = useState(job.manifest.pages[0]?.id ?? '');
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [pane, setPane] = useState<'doc' | 'data'>('data');
  const [layout, setLayout] = useState<'doc' | '5050' | 'data'>('5050');
  const [showOcr, setShowOcr] = useState(false);
  const [decisionsDirty, setDecisionsDirty] = useState(false);
  const [handoffPending, setHandoffPending] = useState(false);
  const refreshRequest = useRef<Parameters<typeof refreshImportDraft>[1] | null>(null);
  const handoff = useRef(new ImportReviewHandoff());
  const guard = useRef(false);
  const group = result._groups.find((item) => item.groupId === groupId) ?? result._groups[0];
  const groupPages = job.manifest.pages
    .filter((page) => page.groupId === group?.groupId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const page = groupPages.find((item) => item.id === pageId) ?? groupPages[0];
  const document = job.documents.find((item) => item.id === page?.documentId);
  const sourcePage = job.manifest.pages.find((item) => item.id === sourceId);
  const sourceDocument = job.documents.find((item) => item.id === sourcePage?.documentId);
  const canProceed =
    !decisionsDirty && job.review.canProceed && result._review.unresolvedConflictIds.length === 0;
  async function run(action: () => Promise<void>) {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    onBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operazione non riuscita. Riprova.');
    } finally {
      guard.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  async function saveDecisions(decisions: ConflictDecision[]) {
    await run(async () => {
      const response = await api.review(job.id, result._source, decisions);
      const next = await api.result(job.id);
      onJob(response.job);
      onResult(next);
      setDecisionsDirty(false);
    });
  }
  async function openDraft(review?: {
    patient: ConfirmPatient;
    cartella: Record<string, unknown>;
  }) {
    try {
      const completed = await handoff.current.complete(job.id, result._source, actor, api, review);
      onJob(completed.job);
      onWorkspace(completed.draftId);
    } finally {
      setHandoffPending(handoff.current.pending);
    }
  }
  async function proceed(
    patient: ConfirmPatient,
    cartella: Record<string, unknown>,
    opts: { confirmAllergyConflict: boolean },
  ) {
    if (!canProceed) return;
    await run(async () => {
      if (result._target?.mode === 'existing') {
        await api.json(`/${job.id}/confirm`, 'POST', {
          mode: 'existing',
          patientId: result._target.patientId,
          patient,
          cartella,
          confirmAllergyConflict: opts.confirmAllergyConflict,
          ...result._source,
        });
        onImported();
        return;
      }
      await openDraft({ patient, cartella });
    });
  }
  function openLegacySource(fileName: string, sourcePageNumber?: number, fileId?: string) {
    const sourceGroups = result._groups.filter((item) =>
      fileId ? item.groupId === fileId : item.label === fileName,
    );
    const documents = job.documents.filter((item) =>
      fileId ? item.id === fileId : item.filename === fileName,
    );
    if (sourceGroups.length + documents.length !== 1) {
      setPane('doc');
      setError('Fonte non univoca: seleziona la lettera e la pagina da consultare.');
      return;
    }
    if (sourceGroups.length === 1) {
      setGroupId(sourceGroups[0].groupId);
      setPane('doc');
      setShowOcr(false);
      return;
    }
    if (documents.length !== 1) {
      setPane('doc');
      setError(
        'Più originali hanno questo nome: seleziona la lettera e la pagina per consultarli.',
      );
      return;
    }
    const matches = job.manifest.pages.filter(
      (item) =>
        item.documentId === documents[0].id &&
        (!sourcePageNumber || item.sourcePageNumber === sourcePageNumber),
    );
    if (matches[0]) setSourceId(matches[0].id);
  }
  return (
    <div className={`import-workspace import-workspace--${layout} pane-${pane}`}>
      <div className="iw-toolbar">
        <div className="iw-panetabs" role="tablist" aria-label="Pannello">
          <button
            role="tab"
            aria-selected={pane === 'doc'}
            className="srev-chip"
            onClick={() => setPane('doc')}
          >
            Documento
          </button>
          <button
            role="tab"
            aria-selected={pane === 'data'}
            className="srev-chip"
            onClick={() => setPane('data')}
          >
            Dati ClinicOS
          </button>
        </div>
        <div className="iw-presets">
          {(['doc', '5050', 'data'] as const).map((value, index) => (
            <button
              key={value}
              className={`srev-chip${layout === value ? ' is-on' : ''}`}
              aria-label={['Documento più grande', 'Divisione 50/50', 'Dati più grandi'][index]}
              onClick={() => setLayout(value)}
            >
              {['◧', '▣', '◨'][index]}
            </button>
          ))}
        </div>
      </div>
      <div className="iw-doc" aria-label="Documento originale">
        <label>
          Consulta lettera{' '}
          <select value={group?.groupId ?? ''} onChange={(event) => setGroupId(event.target.value)}>
            {result._groups.map((item) => (
              <option key={item.groupId} value={item.groupId}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Pagina{' '}
          <select value={page?.id ?? ''} onChange={(event) => setPageId(event.target.value)}>
            {groupPages.map((item, index) => (
              <option key={item.id} value={item.id}>
                {index + 1}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn-secondary btn-sm"
          aria-pressed={showOcr}
          onClick={() => setShowOcr((value) => !value)}
        >
          {showOcr ? 'Mostra originale' : 'Mostra testo OCR della lettera'}
        </button>
        {showOcr ? (
          <pre className="import-group-ocr">{group?.rawText || 'Testo OCR non disponibile.'}</pre>
        ) : page && document ? (
          <ImportPageContent document={document} page={page} cache={cache} />
        ) : (
          <p>Nessuna pagina disponibile.</p>
        )}
      </div>
      <div className="iw-data" aria-label="Dati ClinicOS">
        {error && (
          <p role="alert" className="import-modal__error">
            {error}
          </p>
        )}
        <ImportConflictReview
          key={result._source.resultHash}
          result={result}
          busy={busy}
          onSave={saveDecisions}
          onOpenPage={setSourceId}
          onDirty={() => setDecisionsDirty(true)}
        />
        {!canProceed && <p role="alert">Decidi e salva tutti i conflitti prima di proseguire.</p>}
        {handoffPending && (
          <div className="import-upload-status">
            <p>
              Il passaggio alla bozza è in attesa. Le correzioni restano in questa schermata fino al
              recupero.
            </p>
            <button
              className="btn-primary"
              disabled={busy || !canProceed}
              onClick={() => void run(() => openDraft())}
            >
              Riprova passaggio alla bozza
            </button>
          </div>
        )}
        {job.review.draftId && !handoffPending && (
          <div className="import-upload-status">
            <p>
              {job.review.draftSourceIsCurrent
                ? 'La bozza conserva le modifiche già salvate.'
                : 'Le pagine sono cambiate. La bozza conserva anagrafica e terapie corrette; le fonti cambiate richiedono una nuova verifica.'}
            </p>
            <button
              className="btn-primary"
              disabled={busy || !canProceed}
              onClick={() =>
                void run(async () => {
                  if (job.review.draftSourceIsCurrent) {
                    onWorkspace(job.review.draftId!);
                    return;
                  }
                  if (!refreshRequest.current) {
                    const draft = await getDraft(job.review.draftId!, actor);
                    refreshRequest.current = {
                      ...result._source,
                      requestId: opaqueKey(),
                      expectedDraftVersion: draft.version,
                    };
                  }
                  try {
                    const refreshed = await refreshImportDraft(
                      job.review.draftId!,
                      refreshRequest.current,
                      actor,
                    );
                    onJob(await api.get(job.id));
                    onWorkspace(refreshed.id);
                  } catch (error) {
                    if (error instanceof DraftApiError && error.status < 500)
                      refreshRequest.current = null;
                    throw error;
                  }
                })
              }
            >
              {job.review.draftSourceIsCurrent ? 'Riapri bozza' : 'Rivedi le nuove pagine'}
            </button>
          </div>
        )}
        <ImportSectionsReview
          sections={effectiveImportSections(result)}
          documents={[
            ...job.documents,
            ...result._groups.map((item) => ({ id: item.groupId, filename: item.label })),
          ]}
          busy={busy || !canProceed || !!job.review.draftId || handoffPending}
          onBack={onBack}
          onConfirm={(patient, cartella, opts) => void proceed(patient, cartella, opts)}
          onOpenSource={openLegacySource}
        />
      </div>
      {sourcePage && sourceDocument && (
        <ImportPagePreview
          page={sourcePage}
          document={sourceDocument}
          cache={cache}
          onClose={() => setSourceId(null)}
        />
      )}
    </div>
  );
}
