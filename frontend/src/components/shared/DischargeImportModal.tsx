import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../../config';
import { ImportReview } from './ImportReview';
import type { NuovoPaziente } from '../../types';

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
}
interface Job {
  id: string;
  status: string;
  maxFiles: number;
  maxTotalBytes: number;
  totalBytes: number;
  fileCount: number;
  documents: JobDoc[];
}
interface Outcome { filename: string; status: string; message?: string }

interface Props {
  open: boolean;
  onClose: () => void;
  /** REQ-018: called after a patient is created so the list can refresh. */
  onImported?: () => void;
}

const JOBS_URL = `${API_URL}/ai/extraction/jobs`;

function fmtMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DischargeImportModal({ open, onClose, onImported }: Props) {
  const [job, setJob] = useState<Job | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [proposal, setProposal] = useState<unknown>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) { setJob(null); setOutcomes([]); setError(null); setStep('upload'); setProposal(null); }
  }, [open]);

  if (!open) return null;

  async function sendFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true); setError(null);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('files', f));
      const url = job ? `${JOBS_URL}/${job.id}/files` : JOBS_URL;
      const res = await fetch(url, { method: 'POST', body: fd });
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
      const res = await fetch(`${JOBS_URL}/${job.id}/files/${docId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) setJob(data);
    } finally { setBusy(false); }
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
      const res = await fetch(`${JOBS_URL}/${job.id}/reorder`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: ids }),
      });
      const data = await res.json();
      if (res.ok) setJob(data);
    } finally { setBusy(false); }
  }

  async function cancel() {
    if (job) { try { await fetch(`${JOBS_URL}/${job.id}/cancel`, { method: 'POST' }); } catch { /* ignore */ } }
    onClose();
  }

  async function startProcessing() {
    if (!job) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${JOBS_URL}/${job.id}/process`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Avvio elaborazione non riuscito'); return; }
      setJob(data);
      if (data.status === 'review_ready') {
        // Fetch the merged proposal and move to the Revisione step (REQ-017).
        const r = await fetch(`${JOBS_URL}/${job.id}/result`);
        const result = await r.json();
        if (r.ok && result.resultData) { setProposal(result.resultData); setStep('review'); }
        else setError('Estrazione completata ma risultato non disponibile');
      } else if (data.status === 'failed') {
        setError(`Elaborazione fallita: ${data.error ?? ''}. Puoi compilare manualmente senza perdere i file.`);
      }
    } catch {
      setError('Errore di rete in elaborazione');
    } finally { setBusy(false); }
  }

  // REQ-018: transactional, idempotent, duplicate-checked confirm.
  async function handleCreate(np: NuovoPaziente) {
    if (!job) return;
    setBusy(true); setError(null);
    const body = (confirmDuplicate: boolean) => ({
      patient: {
        firstName: np.firstName, lastName: np.lastName, dateOfBirth: np.dateOfBirth,
        sex: np.sex, email: np.email, phone: np.phone, address: np.address,
        emergencyContactName: np.referenteNome, emergencyContactPhone: np.referenteTelefono,
        codiceFiscale: np.codiceFiscale,
      },
      cartella: {
        statoRicovero: np.statoPaziente, dataRicovero: np.dataIngresso,
        patologiaIngresso: np.motivoIngresso, noteGenerali: np.noteIniziali,
        allergieText: np.allergie, farmaciText: np.farmaci, diagnosiText: np.notaClinicaIniziale,
      },
      confirmDuplicate,
    });
    const post = (dup: boolean) => fetch(`${JOBS_URL}/${job.id}/confirm`, {
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

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Importa lettera di dimissione">
      <div className="modal-card import-modal">
        <header className="import-modal__head">
          <h2>{isReview ? 'Revisione — Nuovo paziente' : 'Importa lettera di dimissione'}</h2>
          <button className="icon-btn" onClick={cancel} aria-label="Chiudi">✕</button>
        </header>

        <ol className="import-modal__steps" aria-hidden="true">
          <li className={!isReview ? 'is-active' : 'is-done'}>1. Caricamento</li>
          <li className={isReview ? 'is-active' : ''}>2. Revisione</li>
        </ol>

        {isReview ? (
          <ImportReview
            proposal={proposal as Parameters<typeof ImportReview>[0]['proposal']}
            documents={job?.documents ?? []}
            busy={busy}
            onBack={() => setStep('upload')}
            onCreate={handleCreate}
          />
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
              <span className="import-modal__size">{fmtMB(d.sizeBytes)}</span>
              <span className="import-modal__ctrls">
                <button className="icon-btn" disabled={busy || idx === 0} onClick={() => move(d.id, -1)} aria-label="Su">↑</button>
                <button className="icon-btn" disabled={busy || idx === job.documents.length - 1} onClick={() => move(d.id, 1)} aria-label="Giù">↓</button>
                <button className="icon-btn" disabled={busy} onClick={() => removeDoc(d.id)} aria-label="Rimuovi">🗑</button>
              </span>
            </li>
          ))}
          {count === 0 && <li className="import-modal__empty">Nessun documento. Aggiungi file o scatta una foto.</li>}
        </ol>

        {job && job.status !== 'uploaded' && (
          <p className="import-modal__status">Stato job: <strong>{job.status}</strong></p>
        )}

        <footer className="import-modal__foot">
          <button className="btn-ghost" onClick={cancel}>Annulla</button>
          <button className="btn-primary" disabled={busy || count === 0} onClick={startProcessing}>
            {busy ? 'Elaborazione…' : 'Avvia elaborazione'}
          </button>
        </footer>
        </>
        )}
      </div>
    </div>
  );
}
