import { useEffect, useRef, useState } from 'react';
import { IcoAI, IcoX } from '../../icons';
import { AnswerView, type AssistantNav } from './AIAssistantButton';
import { useAgnosChat, type AgnosTurn } from './agnos/useAgnosChat';

// 015 AGNOS — unified text chatbot: read answers (with sources) + CRU write
// actions with preview/confirm. Replaces AIAssistantButton as THE Agnos entry
// point (same FAB affordance). Delete is never executable: Agnos refuses and
// points the operator to the traditional UI command.

interface Props {
  forceOpen?: boolean;
  onClose?: () => void;
  operatorId?: string;
  operatorRole?: string;
  operatorName?: string;
  currentPatientId?: string;
  currentPatientName?: string;
  onExecuted?: () => void;
  onNavigate?: (nav: AssistantNav) => void;
}

export function AgnosPanel({ forceOpen, onClose, operatorId, operatorRole, operatorName, currentPatientId, currentPatientName, onExecuted, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { turns, pending, busy, sendCommand, confirmPending, cancelPending, dismissPendingForEdit } =
    useAgnosChat({ operatorId, operatorRole, operatorName, currentPatientId, onExecuted });

  useEffect(() => { if (forceOpen) setOpen(true); }, [forceOpen]);
  useEffect(() => { bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight }); }, [turns, busy]);

  function handleClose() { setOpen(false); onClose?.(); }

  function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    void sendCommand(text);
  }

  function handleEdit() {
    const original = dismissPendingForEdit();
    if (original !== null) {
      setInput(original);
      inputRef.current?.focus();
    }
  }

  const scopeLabel = currentPatientId
    ? `Paziente corrente: ${currentPatientName ?? currentPatientId}`
    : 'Tutti i pazienti autorizzati';

  return (
    <>
      <button type="button" className="ai-fab" onClick={() => setOpen(true)} aria-label="Agnos — Assistente ClinicOS" title="Agnos — Assistente ClinicOS">
        <IcoAI />
      </button>

      {open && (
        <>
          <div className="ai-drawer__scrim" onClick={handleClose} />
          <aside className="ai-drawer agnos-panel" role="dialog" aria-label="Agnos — Assistente ClinicOS">
            <header className="ai-drawer__header">
              <div className="ai-drawer__title">
                <span className="ai-drawer__icon"><IcoAI /></span>
                <span>Agnos</span>
              </div>
              <button type="button" className="icon-btn" onClick={handleClose} aria-label="Chiudi"><IcoX /></button>
            </header>

            <div className="ai-asst__scope" aria-label="Perimetro">{scopeLabel}</div>

            <div className="ai-drawer__body ai-asst__body" ref={bodyRef}>
              {turns.length === 0 && (
                <p className="ai-drawer__hint">
                  Chiedi dati esistenti (allergie, terapie, parametri, documenti, appuntamenti) oppure
                  scrivi un comando, es. «Registra pressione 130 su 80 alle 9:00». Ogni modifica viene
                  mostrata in anteprima e salvata solo dopo la tua conferma. Agnos non elimina mai dati
                  e non fornisce diagnosi né terapie.
                </p>
              )}
              {turns.map((t, i) => (
                <TurnView
                  key={i}
                  turn={t}
                  isPending={pending?.turnIndex === i}
                  busy={busy}
                  onConfirm={() => { void confirmPending(); }}
                  onEdit={handleEdit}
                  onCancel={cancelPending}
                  onNavigate={onNavigate}
                />
              ))}
            </div>

            <form className="ai-asst__compose agnos-compose" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <textarea
                ref={inputRef}
                className="agnos-input"
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Scrivi una domanda o un comando…"
                aria-label="Comando per Agnos"
                disabled={busy}
              />
              <button type="submit" className="btn-primary ai-asst__send" disabled={busy || !input.trim()}>Invia</button>
            </form>
          </aside>
        </>
      )}
    </>
  );
}

interface TurnViewProps {
  turn: AgnosTurn;
  isPending: boolean;
  busy: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onNavigate?: (nav: AssistantNav) => void;
}

function TurnView({ turn, isPending, busy, onConfirm, onEdit, onCancel, onNavigate }: TurnViewProps) {
  if (turn.role === 'utente') {
    return <div className="ai-asst__turn agnos-turn agnos-turn--utente"><div className="ai-asst__q">{turn.text}</div></div>;
  }
  return (
    <div className="ai-asst__turn agnos-turn agnos-turn--agnos">
      {turn.status === 'attesa' && <div className="ai-asst__a ai-asst__muted" aria-live="polite">Agnos sta elaborando…</div>}
      {turn.status === 'errore' && <div className="ai-asst__a ai-asst__error" role="alert">{turn.text}</div>}
      {turn.status === 'rifiuto' && (
        <div className="agnos-refusal" role="alert">
          <div>{turn.text}</div>
          <span className="agnos-refusal__hint">Per questa operazione usa il comando nell’interfaccia.</span>
        </div>
      )}
      {turn.status === 'successo' && <div className="voice-done">✓ {turn.text}</div>}
      {turn.read && <AnswerView answer={turn.read} onNavigate={onNavigate} />}
      {turn.preview && (
        <div className={`voice-preview agnos-preview${turn.status === 'annullato' ? ' agnos-preview--annullata' : ''}`} role="group" aria-label="Operazione proposta">
          <div className="voice-preview__title">{turn.preview.title}</div>
          {turn.preview.patientName && (
            <div className="voice-preview__patient">Paziente: <strong>{turn.preview.patientName}</strong></div>
          )}
          {turn.preview.lines.length > 0 && (
            <dl className="voice-preview__lines">
              {turn.preview.lines.map((l, i) => (
                <div key={i} className="voice-preview__row"><dt>{l.label}</dt><dd>{l.value}</dd></div>
              ))}
            </dl>
          )}
          {turn.preview.warnings.map((w, i) => <p key={i} className="voice-warn">⚠ {w}</p>)}
          {turn.preview.ambiguities.map((a, i) => <p key={i} className="voice-amb">⛔ {a}</p>)}

          {turn.status === 'in-conferma' && isPending && (
            <div className="voice-actions">
              <button type="button" className="btn-primary" disabled={!turn.preview.canExecute || busy} onClick={onConfirm}>
                {busy ? 'Salvataggio…' : 'Conferma e salva'}
              </button>
              <button type="button" className="btn-secondary" disabled={busy} onClick={onEdit}>Modifica</button>
              <button type="button" className="btn-secondary" disabled={busy} onClick={onCancel}>Annulla</button>
            </div>
          )}
          {turn.status === 'eseguito' && <div className="agnos-preview__stato agnos-preview__stato--ok">✓ Eseguita</div>}
          {turn.status === 'annullato' && <div className="agnos-preview__stato">Annullata</div>}
        </div>
      )}
      {!turn.status && !turn.read && !turn.preview && turn.text && <div className="ai-asst__a">{turn.text}</div>}
    </div>
  );
}
