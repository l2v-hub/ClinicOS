import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { API_URL } from '../../../config';
import { operatorHeaders } from '../../../lib/operatorSession';
import { invalidateCachedGet } from '../../../lib/cachedFetch';
import { invalidateSessionCache } from '../../../lib/sessionCache';
import type { DiarioPazienteEntry } from '../../../types';
import { TherapyFormFields, type TherapyFormValue } from './TherapyFormFields';
import {
  diaryPreviewErrorMessage,
  diaryTherapyBody,
  diaryTherapyErrorMessage,
  diaryTherapyFingerprint,
  diaryTherapyIssues,
  intentMessage,
  isBlockingIntent,
  previewNotices,
  previewToTherapyForm,
  requestIdForVersion,
  type DiaryEntryTherapyRef,
  type DiaryTherapyEntryDraft,
  type DiaryTherapyPreview,
  type RequestVersion,
} from './diaryTherapy';
import './DiaryTherapyPanel.css';

export type DiaryEntryWithTherapy = DiarioPazienteEntry & {
  therapy?: DiaryEntryTherapyRef | null;
};

interface Props {
  pazienteId: string;
  /** Voce come verrebbe salvata (testo gia' ripulito dagli spazi esterni, come il salvataggio). */
  entry: DiaryTherapyEntryDraft;
  onCreated: (entry: DiaryEntryWithTherapy) => void;
  onClose: () => void;
  /** 409: la voce potrebbe esistere gia', il diario va riletto. */
  onConflict?: () => void;
}

/**
 * "Valida terapia": anteprima modificabile della terapia letta dal testo della voce, con i campi
 * del form Terapia. La conferma crea voce e terapia insieme (POST diary/with-therapy).
 * PRIVACY: il testo viaggia solo nel corpo delle POST, mai nell'URL o nei log.
 */
export function DiaryTherapyPanel({ pazienteId, entry, onCreated, onClose, onConflict }: Props) {
  const headingId = useId();
  const [preview, setPreview] = useState<DiaryTherapyPreview | null>(null);
  const [form, setForm] = useState<TherapyFormValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadVersion, setLoadVersion] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const versionRef = useRef<RequestVersion | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  // Il bottone "Valida terapia" si disattiva al clic: il focus passa al pannello che si apre.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  const inFlightRef = useRef(false);
  // Testo e data letti all'apertura: l'anteprima si riferisce a questi.
  const [source] = useState(() => ({ text: entry.content, entryDateTime: entry.entryDateTime }));

  useEffect(() => {
    const controller = new AbortController();
    const { text, entryDateTime } = source;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/patients/${pazienteId}/diary/therapy-preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
          body: JSON.stringify({ text, entryDateTime }),
          signal: controller.signal,
        });
        const body: unknown = await res.json().catch(() => null);
        if (controller.signal.aborted) return;
        if (!res.ok || !body || typeof body !== 'object' || !('row' in body)) {
          setLoadError(diaryPreviewErrorMessage(res.ok ? 0 : res.status, body));
          return;
        }
        const next = body as DiaryTherapyPreview;
        setPreview(next);
        setForm(previewToTherapyForm(next, entryDateTime));
        versionRef.current = null;
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') return;
        setLoadError(diaryPreviewErrorMessage(0, null));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [pazienteId, source, loadVersion]);

  function retryPreview() {
    setLoading(true);
    setLoadError('');
    setLoadVersion((v) => v + 1);
  }

  const issues = form ? diaryTherapyIssues(form) : [];
  const blocked = preview ? isBlockingIntent(preview.intent) : false;
  const notices = preview ? previewNotices(preview, source.entryDateTime) : [];
  const blockerMessages = [...new Set(issues.map((issue) => issue.message))];

  const handleChange = useCallback((next: TherapyFormValue) => {
    setForm(next);
    setConfirmError('');
  }, []);

  async function handleConfirm() {
    if (!form || blocked || inFlightRef.current) return;
    if (diaryTherapyIssues(form).length) return;
    // Stessa versione (doppio clic, nuovo tentativo) → stesso requestId; ogni modifica → nuovo.
    const version = requestIdForVersion(versionRef.current, diaryTherapyFingerprint(entry, form));
    versionRef.current = version;
    inFlightRef.current = true;
    setConfirming(true);
    setConfirmError('');
    try {
      const res = await fetch(`${API_URL}/patients/${pazienteId}/diary/with-therapy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify(diaryTherapyBody(entry, form, version.requestId)),
      });
      const body: unknown = await res.json().catch(() => null);
      const created = body as {
        entry?: DiarioPazienteEntry;
        therapy?: { id: string; farmacoNome: string; stato: string } | null;
      } | null;
      if (!res.ok || !created?.entry) {
        setConfirmError(diaryTherapyErrorMessage(res.ok ? 500 : res.status, body));
        if (res.status === 409) onConflict?.();
        return;
      }
      const therapy = created.therapy
        ? {
            id: created.therapy.id,
            farmacoNome: created.therapy.farmacoNome,
            stato: created.therapy.stato,
          }
        : null;
      // Terapia nuova: gli elenchi Terapia e il giro gia' in cache vanno riletti.
      invalidateCachedGet(`${API_URL}/patients/${pazienteId}/therapies`);
      invalidateCachedGet(`${API_URL}/therapy-slots`);
      invalidateSessionCache(`therapies:${pazienteId}:`);
      onCreated({ ...created.entry, therapy });
    } catch {
      setConfirmError(diaryTherapyErrorMessage(0, null));
    } finally {
      inFlightRef.current = false;
      setConfirming(false);
    }
  }

  return (
    <section
      className="diary-therapy"
      aria-labelledby={headingId}
      data-testid="diary-therapy-panel"
    >
      <header className="diary-therapy__head">
        <h3 id={headingId} ref={headingRef} tabIndex={-1}>
          Anteprima terapia
        </h3>
        <p className="ds-caption">
          Controlla e completa i campi: la terapia viene aggiunta in Terapia solo alla conferma.
        </p>
      </header>

      <figure className="diary-therapy__source">
        <figcaption className="ds-caption">Testo scritto nel diario</figcaption>
        <blockquote>{source.text}</blockquote>
      </figure>

      {loading && (
        <p className="ds-caption" role="status">
          Lettura del testo in corso…
        </p>
      )}

      {loadError && (
        <div className="diary-therapy__alert" role="alert">
          <span>{loadError}</span>
          <button type="button" className="ds-btn ds-btn--secondary" onClick={retryPreview}>
            Riprova
          </button>
        </div>
      )}

      {preview && notices.length > 0 && (
        <ul className="diary-therapy__notices" aria-label="Riepilogo dell’anteprima">
          {notices.map((notice) => (
            <li key={notice.key} data-notice={notice.key}>
              <span
                className={`ds-badge ${notice.tone === 'warning' ? 'ds-badge--warning' : 'ds-badge--info'}`}
              >
                {notice.tone === 'warning' ? 'Da verificare' : 'Nota'}
              </span>
              <span>{notice.text}</span>
            </li>
          ))}
        </ul>
      )}

      {preview && blocked && (
        <div className="diary-therapy__intent" role="status" data-testid="diary-therapy-intent">
          <p>{intentMessage(preview.intent)}</p>
          <p className="ds-caption">
            Puoi comunque salvare il testo come voce normale con «Salva».
          </p>
        </div>
      )}

      {preview && !blocked && form && (
        <TherapyFormFields value={form} onChange={handleChange} issues={issues} nomeDaTesto />
      )}

      {confirmError && (
        <div className="diary-therapy__alert" role="alert">
          <span>{confirmError}</span>
        </div>
      )}

      <div className="diary-therapy__actions">
        {preview && !blocked && blockerMessages.length > 0 && (
          <ul className="diary-therapy__blockers" aria-label="Da completare prima della conferma">
            {blockerMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}
        <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>
          Chiudi anteprima
        </button>
        {preview && !blocked && (
          <button
            type="button"
            className="ds-btn ds-btn--primary ds-btn--wrap"
            disabled={confirming || issues.length > 0}
            onClick={() => void handleConfirm()}
          >
            {confirming ? 'Aggiunta in corso…' : 'Conferma e aggiungi in Terapia'}
          </button>
        )}
      </div>
    </section>
  );
}
