import { AnswerView, type AssistantNav } from '../AIAssistantButton';
import type { AgnosTurn } from './useAgnosChat';

interface TurnViewProps {
  turn: AgnosTurn;
  isPending: boolean;
  busy: boolean;
  navigationReady: boolean;
  destination?: string;
  onOpenPage: () => void;
  onConfirm: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onNavigate?: (nav: AssistantNav) => void;
  formatNavLabel?: (nav: AssistantNav) => string;
}

export function TurnView({
  turn,
  isPending,
  busy,
  navigationReady,
  destination,
  onOpenPage,
  onConfirm,
  onEdit,
  onCancel,
  onNavigate,
  formatNavLabel,
}: TurnViewProps) {
  if (turn.role === 'utente') {
    return (
      <div className="ai-asst__turn agnos-turn agnos-turn--utente">
        {turn.channel === 'voce' && <span className="agnos-transcript-label">Richiesta vocale verificata</span>}
        <div className="ai-asst__q">{turn.text}</div>
      </div>
    );
  }
  return (
    <div className="ai-asst__turn agnos-turn agnos-turn--agnos">
      {turn.status === 'attesa' && (
        <div className="ai-asst__a ai-asst__muted" aria-live="polite">
          L’assistente sta elaborando…
        </div>
      )}
      {turn.status === 'errore' && (
        <div className="ai-asst__a ai-asst__error" role="alert">
          {turn.text}
        </div>
      )}
      {turn.status === 'rifiuto' && (
        <div className="agnos-refusal" role="alert">
          <div>{turn.text}</div>
          <span className="agnos-refusal__hint">
            Per questa operazione usa il comando nell’interfaccia.
          </span>
        </div>
      )}
      {turn.status === 'successo' && <div className="voice-done">✓ {turn.text}</div>}
      {turn.status === 'annullato' && !turn.preview && <p className="ai-asst__muted">{turn.text}</p>}
      {turn.read && (
        <AnswerView answer={turn.read} onNavigate={onNavigate} formatNavLabel={formatNavLabel} />
      )}
      {turn.preview && (
        <div
          className={`voice-preview agnos-preview${turn.status === 'annullato' ? ' agnos-preview--annullata' : ''}`}
          role="group"
          aria-label="Operazione proposta"
        >
          <div className="voice-preview__title">{turn.preview.title}</div>
          {turn.preview.patientName && (
            <div className="voice-preview__patient">
              Paziente: <strong>{turn.preview.patientName}</strong>
            </div>
          )}
          {turn.preview.lines.length > 0 && (
            <dl className="voice-preview__lines">
              {turn.preview.lines.map((l, i) => (
                <div key={i} className="voice-preview__row">
                  <dt>{l.label}</dt>
                  <dd>{l.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {turn.preview.diff && (
            <div className="agnos-proposed-text">
              <strong>Testo da aggiungere</strong>
              <p>{turn.preview.diff.proposed}</p>
              <details><summary>Confronta con il testo attuale</summary>
                <strong>Attuale</strong><p>{turn.preview.diff.current || 'Nessun testo presente.'}</p>
                <strong>Dopo il salvataggio</strong><p>{turn.preview.diff.resulting}</p>
              </details>
            </div>
          )}
          {turn.preview.warnings.map((w, i) => (
            <p key={i} className="voice-warn">
              ⚠ {w}
            </p>
          ))}
          {turn.preview.ambiguities.map((a, i) => (
            <p key={i} className="voice-amb">
              ⛔ {a}
            </p>
          ))}

          {turn.status === 'in-conferma' && isPending && (
            <>
            <p className="agnos-approval-hint">Controlla paziente e dati. Verranno salvati solo con la tua conferma.</p>
            {destination && <button type="button" className="link-btn" disabled={busy} onClick={onOpenPage}>
              {navigationReady ? `Mostra ${destination}` : `Apri ${destination} per verificare`}
            </button>}
            <div className="voice-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={!turn.preview.canExecute || !navigationReady || busy}
                onClick={onConfirm}
              >
                {busy ? 'Attendi…' : 'Conferma e salva'}
              </button>
              <button type="button" className="btn-secondary" disabled={busy} onClick={onEdit}>
                Modifica
              </button>
              <button type="button" className="btn-secondary" disabled={busy} onClick={onCancel}>
                Annulla
              </button>
            </div>
            </>
          )}
          {turn.status === 'eseguito' && (
            <div className="agnos-preview__stato agnos-preview__stato--ok">✓ Eseguita</div>
          )}
          {turn.status === 'annullato' && <div className="agnos-preview__stato">Annullata</div>}
        </div>
      )}
      {!turn.status && !turn.read && !turn.preview && turn.text && (
        <div className="ai-asst__a">{turn.text}</div>
      )}
    </div>
  );
}
