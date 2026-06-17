import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../../config';
import type { ConfirmPatient } from './ImportReviewFull';
import { ImportSectionsReview } from './sections/ImportSectionsReview';
import type { SectionsResult } from './sections/types';
import { sectionsFromNarrative, type NarrativeDraft } from './sections/deriveSections';
import { DocumentPreview, type PreviewDoc } from './DocumentPreview';

// REQ-014: multi-file / multi-photo upload for the discharge-letter import.
// Files are added to a backend job (no patient record is created here).
// Processing starts ONLY on explicit confirmation.
// REQ-017: after processing, a Revisione step prefills the Nuovo Paziente form.

interface JobDoc {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sortOrder: number;
  status: string;
  logicalDoc?: string | null;
}
interface Job {
  id: string;
  status: string;
  stage?: string | null;
  completedFiles?: number;
  totalFiles?: number;
  currentFileName?: string | null;
  elapsedSeconds?: number;
  canRetry?: boolean;
  canCancel?: boolean;
  maxFiles: number;
  maxTotalBytes: number;
  totalBytes: number;
  fileCount: number;
  error?: string | null;
  documents: JobDoc[];
}

const ACTIVE_STATUSES = ['queued', 'uploading_to_google', 'waiting_for_model', 'validating_response', 'repairing_response', 'processing'];
const STAGE_LABEL: Record<string, string> = {
  queued: 'In coda…',
  uploading_files: 'Caricamento documenti…',
  model_processing: 'Analisi AI in corso…',
  validating: 'Validazione risposta…',
  completed: 'Completato',
  error: 'Errore',
};
interface Outcome { filename: string; status: string; message?: string }

interface Props {
  open: boolean;
  onClose: () => void;
  /** REQ-018: called after a patient is created so the list can refresh. */
  onImported?: () => void;
  /** REQ-019: operator identity sent on every import request. */
  operatorId?: string;
  operatorRole?: string;
}

const JOBS_URL = `${API_URL}/ai/extraction/jobs`;

function fmtMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DischargeImportModal({ open, onClose, onImported, operatorId, operatorRole }: Props) {
  // REQ-019: attach operator identity to every import request.
  const opHeaders: Record<string, string> = {};
  if (operatorId) opHeaders['X-Operator-Id'] = operatorId;
  if (operatorRole) opHeaders['X-Operator-Role'] = operatorRole;
  const apiFetch = (url: string, opts: RequestInit = {}) =>
    fetch(url, { ...opts, headers: { ...opHeaders, ...(opts.headers as Record<string, string> ?? {}) } });
  const [job, setJob] = useState<Job | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [proposal, setProposal] = useState<unknown>(null);
  const [processing, setProcessing] = useState(false);
  // REQ-032: wide two-panel review workspace state.
  const [previews, setPreviews] = useState<PreviewDoc[]>([]);
  const [layout, setLayout] = useState<'5050' | 'doc' | 'data'>('5050');
  const [paneTab, setPaneTab] = useState<'doc' | 'data'>('doc'); // tablet/mobile single-pane
  const [sourceTarget, setSourceTarget] = useState<{ fileName?: string; page?: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
      setJob(null); setOutcomes([]); setError(null); setStep('upload'); setProposal(null); setProcessing(false);
      setPreviews([]); setLayout('5050'); setPaneTab('doc'); setSourceTarget(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // REQ-022: poll the job status while it is being processed asynchronously.
  const jobId = job?.id;
  useEffect(() => {
    if (!processing || !jobId) return;
    let alive = true;
    const tick = async () => {
      try {
        const r = await apiFetch(`${JOBS_URL}/${jobId}`);
        const j = await r.json();
        if (!alive) return;
        setJob(j);
        if (j.status === 'review_ready') {
          setProcessing(false);
          const rr = await apiFetch(`${JOBS_URL}/${jobId}/result`);
          const result = await rr.json();
          if (rr.ok && result.resultData) { setProposal(result.resultData); setStep('review'); }
          else setError('Estrazione completata ma risultato non disponibile');
        } else if (['failed', 'retryable_error', 'cancelled'].includes(j.status)) {
          setProcessing(false);
          setError(j.status === 'retryable_error'
            ? 'Errore temporaneo durante l’elaborazione. I documenti sono conservati: puoi riprovare.'
            : 'Elaborazione non riuscita. Puoi compilare manualmente o riprovare senza perdere i file.');
        }
      } catch { /* transient network error — keep polling */ }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => { alive = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processing, jobId]);

  if (!open) return null;

  async function sendFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true); setError(null);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('files', f));
      // REQ-032: keep object URLs so the review can preview the real documents (session-only).
      const added: PreviewDoc[] = Array.from(files).map((f) => ({ name: f.name, type: f.type, url: URL.createObjectURL(f) }));
      setPreviews((prev) => [...prev, ...added]);
      const url = job ? `${JOBS_URL}/${job.id}/files` : JOBS_URL;
      const res = await apiFetch(url, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Upload non riuscito'); return; }
      setJob(data.job ?? data);
      if (data.outcomes) setOutcomes(data.outcomes);
    } catch {
      setError('Errore di rete durante l’upload');
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
      if (cameraInput.current) cameraInput.current.value = '';
    }
  }

  async function removeDoc(docId: string) {
    if (!job) return;
    setBusy(true);
    try {
      const res = await apiFetch(`${JOBS_URL}/${job.id}/files/${docId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) setJob(data);
    } finally { setBusy(false); }
  }

  // REQ-014: rifare una singola foto = rimuovi + riapri fotocamera.
  async function retake(docId: string) {
    await removeDoc(docId);
    cameraInput.current?.click();
  }

  // REQ-014: assegna più foto allo stesso documento logico.
  async function setLogical(docId: string, logicalDoc: string) {
    if (!job) return;
    try {
      const res = await apiFetch(`${JOBS_URL}/${job.id}/files/${docId}/logical`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logicalDoc }),
      });
      const data = await res.json();
      if (res.ok) setJob(data);
    } catch { /* ignore */ }
  }

  async function move(docId: string, dir: -1 | 1) {
    if (!job) return;
    const ids = job.documents.map((d) => d.id);
    const i = ids.indexOf(docId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setBusy(true);
    try {
      const res = await apiFetch(`${JOBS_URL}/${job.id}/reorder`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: ids }),
      });
      const data = await res.json();
      if (res.ok) setJob(data);
    } finally { setBusy(false); }
  }

  async function cancel() {
    if (job) { try { await apiFetch(`${JOBS_URL}/${job.id}/cancel`, { method: 'POST' }); } catch { /* ignore */ } }
    onClose();
  }

  // REQ-036: "← Torna ai documenti" — return to the editable Caricamento phase from Elaborazione
  // or Revisione. The job is NOT cancelled: files stay, only the derived draft is invalidated.
  // Reordering then reprocessing reuses the same job (no re-upload, no duplicate job).
  async function reopenToDocuments() {
    if (!job) return;
    // A draft already exists → warn that the sections will be recomputed (files are kept).
    if (proposal != null) {
      const ok = window.confirm(
        'Modificando l’ordine dei documenti sarà necessario ricalcolare le sezioni estratte.\n\n' +
        'I file originali non verranno eliminati.',
      );
      if (!ok) return;
    }
    setBusy(true); setError(null);
    try {
      const res = await apiFetch(`${JOBS_URL}/${job.id}/reopen`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Ritorno ai documenti non riuscito'); return; }
      setJob(data);
      setProcessing(false);
      setProposal(null);
      setStep('upload');
    } catch {
      setError('Errore di rete');
    } finally { setBusy(false); }
  }

  // REQ-022: enqueue (202) then poll for status; never blocks on the model.
  async function startProcessing() {
    if (!job) return;
    setBusy(true); setError(null);
    try {
      const res = await apiFetch(`${JOBS_URL}/${job.id}/process`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Avvio elaborazione non riuscito'); return; }
      setJob(data);          // status: queued
      setProcessing(true);   // start polling
    } catch {
      setError('Errore di rete in elaborazione');
    } finally { setBusy(false); }
  }

  // REQ-022: retry a failed/retryable job without re-uploading the documents.
  async function retry() {
    if (!job) return;
    setBusy(true); setError(null);
    try {
      const res = await apiFetch(`${JOBS_URL}/${job.id}/retry`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Nuovo tentativo non riuscito'); return; }
      setJob(data);
      setProcessing(true);
    } catch {
      setError('Errore di rete');
    } finally { setBusy(false); }
  }

  // REQ-018/021: transactional confirm — create new OR update existing patient.
  // The full reviewed cartella (every clinical field/list the operator edited) is sent
  // verbatim so all data is persisted (REQ-015), not just a subset.
  async function handleCreate(patient: ConfirmPatient, cartella: Record<string, unknown>, opts?: { confirmAllergyConflict?: boolean }) {
    if (!job) return;
    setBusy(true); setError(null);
    const target = (proposal as { _target?: { mode?: string; patientId?: string } } | null)?._target;
    const body = (confirmDuplicate: boolean) => ({
      mode: target?.mode === 'existing' ? 'existing' : 'new',
      patientId: target?.mode === 'existing' ? target?.patientId : undefined,
      patient,
      cartella,
      confirmDuplicate,
      confirmAllergyConflict: opts?.confirmAllergyConflict ?? false,
    });
    const post = (dup: boolean) => apiFetch(`${JOBS_URL}/${job.id}/confirm`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body(dup)),
    });
    try {
      let res = await post(false);
      if (res.status === 409) {
        const d = await res.json();
        const dp = d.duplicate;
        const proceed = window.confirm(
          `Possibile duplicato: ${dp.firstName} ${dp.lastName} (${dp.medicalRecordNumber}). Creare comunque un nuovo paziente?`,
        );
        if (!proceed) { setBusy(false); return; }
        res = await post(true);
      }
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Creazione paziente non riuscita'); return; }
      onImported?.();
      onClose();
    } catch {
      setError('Errore di rete durante la conferma');
    } finally { setBusy(false); }
  }

  const count = job?.fileCount ?? 0;
  const maxFiles = job?.maxFiles ?? 10;
  const totalBytes = job?.totalBytes ?? 0;
  const maxTotalBytes = job?.maxTotalBytes ?? 25 * 1024 * 1024;
  const rejected = outcomes.filter((o) => o.status !== 'accepted');

  const isReview = step === 'review' && proposal != null;
  // REQ-033: the discharge import ALWAYS reviews as narrative text blocks — never the legacy
  // structured table. Prefer the rich `_sections`; otherwise derive an equivalent from the
  // always-present flat `_narrative`. The legacy ImportReviewFull table is never rendered here.
  const sectionsData = (proposal as { _sections?: SectionsResult | null } | null)?._sections ?? null;
  const narrativeDraft = (proposal as { _narrative?: NarrativeDraft | null } | null)?._narrative ?? null;
  // Runtime assertion: the import contract must be narrative, never legacy arrays.
  if (import.meta.env.DEV && narrativeDraft) {
    for (const k of ['diagnoses', 'medications', 'consultations', 'examinations', 'procedures', 'allergies'] as const) {
      if (k in (narrativeDraft as Record<string, unknown>)) {
        throw new Error(`LEGACY_IMPORT_CONTRACT_DETECTED: ${k}[] is not allowed in the discharge import draft`);
      }
    }
  }
  // REQ-035: use whichever source actually carries section TEXT (the narrative built from the
  // OCR markdown is the reliable one). Never show empty cards when the text exists elsewhere.
  const narrativeSections = narrativeDraft ? sectionsFromNarrative(narrativeDraft) : null;
  const hasText = (s: SectionsResult | null): boolean =>
    !!s && Array.isArray(s.sections) && s.sections.some((x) => (x.rawText ?? '').trim().length > 0);
  const effectiveSections: SectionsResult =
    hasText(narrativeSections) ? narrativeSections!
      : hasText(sectionsData) ? sectionsData!
        : narrativeSections ?? sectionsData ?? { sections: [], allergies: { status: 'not_documented' } };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Importa lettera di dimissione">
      <div className={`modal-card import-modal${isReview ? ' import-modal--review' : ''}`}>
        <header className="import-modal__head">
          {/* REQ-036: back to the editable documents phase — available in Elaborazione and Revisione. */}
          {(isReview || processing) && (
            <button className="btn-ghost import-modal__back" onClick={reopenToDocuments} disabled={busy} aria-label="Torna ai documenti">
              ← Torna ai documenti
            </button>
          )}
          <h2>{isReview ? 'Revisione — Nuovo paziente' : 'Importa lettera di dimissione'}</h2>
          <button className="icon-btn" onClick={cancel} aria-label="Chiudi">✕</button>
        </header>

        <ol className="import-modal__steps" aria-hidden="true">
          <li className={!isReview ? 'is-active' : 'is-done'}>1. Caricamento</li>
          <li className={isReview ? 'is-active' : ''}>2. Revisione</li>
        </ol>

        {isReview ? (
          <div className={`import-workspace import-workspace--${layout} pane-${paneTab}`}>
            {/* REQ-032: layout controls (desktop presets + tablet/mobile pane tabs) */}
            <div className="iw-toolbar">
              <div className="iw-panetabs" role="tablist" aria-label="Pannello">
                <button role="tab" className={`srev-chip${paneTab === 'doc' ? ' is-on' : ''}`} onClick={() => setPaneTab('doc')}>Documento</button>
                <button role="tab" className={`srev-chip${paneTab === 'data' ? ' is-on' : ''}`} onClick={() => setPaneTab('data')}>Dati ClinicOS</button>
              </div>
              <div className="iw-presets">
                <button className={`srev-chip${layout === 'doc' ? ' is-on' : ''}`} onClick={() => setLayout('doc')} title="Documento più grande">◧</button>
                <button className={`srev-chip${layout === '5050' ? ' is-on' : ''}`} onClick={() => setLayout('5050')} title="Divisione 50/50">▣</button>
                <button className={`srev-chip${layout === 'data' ? ' is-on' : ''}`} onClick={() => setLayout('data')} title="Dati più grandi">◨</button>
              </div>
            </div>
            <div className="iw-doc" aria-label="Documento originale">
              <DocumentPreview
                documents={previews}
                ocrText={(proposal as { rawText?: string } | null)?.rawText ?? ''}
                sourceTarget={sourceTarget}
              />
            </div>
            <div className="iw-data" aria-label="Dati ClinicOS">
              <ImportSectionsReview
                sections={effectiveSections}
                documents={job?.documents ?? []}
                busy={busy}
                onBack={reopenToDocuments}
                onConfirm={handleCreate}
                onOpenSource={(fileName, page) => { setSourceTarget({ fileName, page }); setPaneTab('doc'); }}
              />
            </div>
          </div>
        ) : (
        <>
        <div className="import-modal__actions">
          <button className="btn-secondary" disabled={busy} onClick={() => fileInput.current?.click()}>
            Seleziona file
          </button>
          <button className="btn-secondary" disabled={busy} onClick={() => cameraInput.current?.click()}>
            Scatta foto
          </button>
          <input ref={fileInput} type="file" multiple hidden
            accept=".pdf,.doc,.docx,.txt,image/*"
            onChange={(e) => sendFiles(e.target.files)} />
          <input ref={cameraInput} type="file" hidden accept="image/*" capture="environment"
            onChange={(e) => sendFiles(e.target.files)} />
        </div>

        <p className="import-modal__limits">
          {count}/{maxFiles} elementi · {fmtMB(totalBytes)} / {fmtMB(maxTotalBytes)} totali
        </p>

        {error && <p className="import-modal__error">{error}</p>}
        {rejected.length > 0 && (
          <ul className="import-modal__rejected">
            {rejected.map((o, i) => (
              <li key={i}>⚠ {o.filename}: {o.status === 'duplicate' ? 'duplicato' : (o.message || 'rifiutato')}</li>
            ))}
          </ul>
        )}

        <ol className="import-modal__list">
          {job?.documents.map((d, idx) => (
            <li key={d.id} className="import-modal__item">
              <span className="import-modal__idx">{idx + 1}</span>
              <span className="import-modal__name">{d.filename}</span>
              <input
                className="import-modal__logical"
                defaultValue={d.logicalDoc ?? ''}
                placeholder="Doc."
                title="Documento logico (raggruppa più foto)"
                disabled={busy}
                onBlur={(e) => { if ((e.target.value || '') !== (d.logicalDoc ?? '')) setLogical(d.id, e.target.value); }}
              />
              <span className="import-modal__size">{fmtMB(d.sizeBytes)}</span>
              <span className="import-modal__ctrls">
                <button className="icon-btn" disabled={busy || idx === 0} onClick={() => move(d.id, -1)} aria-label="Su">↑</button>
                <button className="icon-btn" disabled={busy || idx === job.documents.length - 1} onClick={() => move(d.id, 1)} aria-label="Giù">↓</button>
                {d.mimeType.startsWith('image/') && (
                  <button className="icon-btn" disabled={busy} onClick={() => retake(d.id)} aria-label="Rifai foto" title="Rifai foto">📷</button>
                )}
                <button className="icon-btn" disabled={busy} onClick={() => removeDoc(d.id)} aria-label="Rimuovi">🗑</button>
              </span>
            </li>
          ))}
          {count === 0 && <li className="import-modal__empty">Nessun documento. Aggiungi file o scatta una foto.</li>}
        </ol>

        {job && (processing || ACTIVE_STATUSES.includes(job.status)) && (
          <div className="import-modal__progress" role="status" aria-live="polite">
            <span className="import-modal__spinner" aria-hidden="true" />
            <span className="import-modal__progress-txt">
              {STAGE_LABEL[job.stage ?? ''] ?? STAGE_LABEL[job.status] ?? 'Elaborazione…'}
              {(job.totalFiles ?? 0) > 0 && job.stage === 'uploading_files' && ` (${job.completedFiles ?? 0}/${job.totalFiles})`}
              {job.currentFileName ? ` · ${job.currentFileName}` : ''}
              {(job.elapsedSeconds ?? 0) > 0 ? ` · ${job.elapsedSeconds}s` : ''}
            </span>
          </div>
        )}

        {job?.canRetry && !processing && (
          <div className="import-modal__retry">
            <button className="btn-secondary" disabled={busy} onClick={retry}>↻ Riprova senza ricaricare</button>
          </div>
        )}

        <footer className="import-modal__foot">
          <button className="btn-ghost" onClick={cancel}>Annulla</button>
          <button className="btn-primary" disabled={busy || count === 0 || processing} onClick={startProcessing}>
            {processing ? 'Elaborazione in corso…' : 'Avvia elaborazione'}
          </button>
        </footer>
        </>
        )}
      </div>
    </div>
  );
}
