import { useState, useEffect, useRef } from 'react';
import { IcoAI, IcoX } from '../../icons';
import { API_URL } from '../../config';

// REQ-040: global "Assistente ClinicOS" — a SOURCE_ONLY search/correlation assistant.
// It calls the operator-authenticated /ai/assistant/query (NEVER the token-gated internal route);
// every answer is built only from backend tool results and shows its sources. It never gives
// clinical advice and never invents data.

export interface AssistantSource {
  sourceType: string; patientId: string; recordId: string; sectionKey?: string;
  documentId?: string; pageNumber?: number; label: string; exactText?: string; recordedAt?: string;
}
export interface AssistantNav {
  type: string; label: string; patientId?: string; sectionKey?: string; documentId?: string; recordId?: string; pageNumber?: number;
}
export interface AssistantAnswer {
  intent: string; scope: string; results: unknown[]; sources: AssistantSource[];
  navigation: AssistantNav[]; notFound: boolean; refusal?: string;
}
interface Turn { question: string; answer?: AssistantAnswer; error?: string; loading?: boolean }

interface Props {
  forceOpen?: boolean;
  onClose?: () => void;
  operatorId?: string;
  operatorRole?: string;
  /** REQ-040: on the patient page the default scope is the current patient. */
  currentPatientId?: string;
  currentPatientName?: string;
  /** Navigate the app to a record a source/answer points at. */
  onNavigate?: (nav: AssistantNav) => void;
}

export function AIAssistantButton({ forceOpen, onClose, operatorId, operatorRole, currentPatientId, currentPatientName, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (forceOpen) setOpen(true); }, [forceOpen]);
  useEffect(() => { bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight }); }, [turns]);

  function handleClose() { setOpen(false); onClose?.(); }

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    setBusy(true);
    setTurns((t) => [...t, { question, loading: true }]);
    setQuestion('');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (operatorId) headers['X-Operator-Id'] = operatorId;
      if (operatorRole) headers['X-Operator-Role'] = operatorRole;
      const res = await fetch(`${API_URL}/ai/assistant/query`, {
        method: 'POST', headers,
        body: JSON.stringify({ question, currentPatientId }),
      });
      const data = await res.json();
      setTurns((t) => t.map((x, i) => i === t.length - 1
        ? (res.ok ? { question, answer: data } : { question, error: data.error || 'Richiesta non riuscita' })
        : x));
    } catch {
      setTurns((t) => t.map((x, i) => i === t.length - 1 ? { question, error: 'Errore di rete' } : x));
    } finally { setBusy(false); }
  }

  const scopeLabel = currentPatientId
    ? `Paziente corrente: ${currentPatientName ?? currentPatientId}`
    : 'Tutti i pazienti autorizzati';

  return (
    <>
      <button type="button" className="ai-fab" onClick={() => setOpen(true)} aria-label="Assistente ClinicOS" title="Assistente ClinicOS">
        <IcoAI />
      </button>

      {open && (
        <>
          <div className="ai-drawer__scrim" onClick={handleClose} />
          <aside className="ai-drawer" role="dialog" aria-label="Assistente ClinicOS">
            <header className="ai-drawer__header">
              <div className="ai-drawer__title">
                <span className="ai-drawer__icon"><IcoAI /></span>
                <span>Assistente ClinicOS</span>
              </div>
              <button type="button" className="icon-btn" onClick={handleClose} aria-label="Chiudi"><IcoX /></button>
            </header>

            <div className="ai-asst__scope" aria-label="Perimetro">{scopeLabel}</div>

            <div className="ai-drawer__body ai-asst__body" ref={bodyRef}>
              {turns.length === 0 && (
                <p className="ai-drawer__hint">
                  Chiedi dati esistenti: allergie, terapie, parametri, sezioni cliniche, documenti,
                  timeline, appuntamenti. Ogni risposta mostra la fonte. L’assistente non fornisce
                  diagnosi né terapie.
                </p>
              )}
              {turns.map((t, i) => (
                <div key={i} className="ai-asst__turn">
                  <div className="ai-asst__q">{t.question}</div>
                  {t.loading && <div className="ai-asst__a ai-asst__muted">Ricerca…</div>}
                  {t.error && <div className="ai-asst__a ai-asst__error">{t.error}</div>}
                  {t.answer && <AnswerView answer={t.answer} onNavigate={onNavigate} />}
                </div>
              ))}
            </div>

            <form className="ai-asst__compose" onSubmit={(e) => { e.preventDefault(); ask(question); }}>
              <input
                className="ai-asst__input"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Fai una domanda sui dati…"
                aria-label="Domanda"
                disabled={busy}
              />
              <button type="submit" className="btn-primary ai-asst__send" disabled={busy || !question.trim()}>Invia</button>
            </form>
          </aside>
        </>
      )}
    </>
  );
}

function AnswerView({ answer, onNavigate }: { answer: AssistantAnswer; onNavigate?: (n: AssistantNav) => void }) {
  if (answer.refusal) return <div className="ai-asst__a ai-asst__refusal">{answer.refusal}</div>;
  if (answer.notFound) return <div className="ai-asst__a ai-asst__muted">Informazione non trovata.</div>;
  return (
    <div className="ai-asst__a">
      <div className="ai-asst__count">{answer.results.length} risultat{answer.results.length === 1 ? 'o' : 'i'}</div>
      <ul className="ai-asst__sources">
        {answer.sources.slice(0, 25).map((s, i) => (
          <li key={i} className="ai-asst__source">
            <div className="ai-asst__source-label">{s.label}{s.recordedAt ? ` · ${s.recordedAt.slice(0, 10)}` : ''}</div>
            {s.exactText && <div className="ai-asst__source-text">{s.exactText.length > 220 ? s.exactText.slice(0, 220) + '…' : s.exactText}</div>}
            <div className="ai-asst__source-meta">Fonte: {s.sourceType}{s.pageNumber ? ` · pagina ${s.pageNumber}` : ''}</div>
          </li>
        ))}
      </ul>
      {answer.navigation.length > 0 && (
        <div className="ai-asst__actions">
          {answer.navigation.slice(0, 8).map((n, i) => (
            <button key={i} type="button" className="srev-chip" onClick={() => onNavigate?.(n)}>{n.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
