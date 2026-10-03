import type { UrgencyView } from '../../types';
import { canTakeCharge, urgencyTraceText } from '../../lib/urgency';
import './UrgencyNotice.css';

/**
 * UX2 W8: stato dell'urgenza di una nota. Attiva → «Urgente» + «Ho capito» (mai per l'autore);
 * presa in carico → «Urgenza presa in carico da X alle hh:mm», nessun pulsante.
 */
export function UrgencyNotice({
  urgency,
  onAcknowledge,
  busy = false,
  disabled = false,
  subject,
}: {
  urgency: UrgencyView | null | undefined;
  onAcknowledge?: () => void;
  busy?: boolean;
  disabled?: boolean;
  /** Per lo screen reader: di quale nota si tratta (es. «la voce del 03/10 10:00»). */
  subject?: string;
}) {
  const text = urgencyTraceText(urgency);
  if (!urgency || !text) return null;
  const showButton = canTakeCharge(urgency) && Boolean(onAcknowledge);
  return (
    <div
      className={`urgency-notice urgency-notice--${urgency.state}`}
      data-urgency-state={urgency.state}
    >
      <span className="urgency-notice__text">{text}</span>
      {showButton && (
        <button
          type="button"
          className="ds-btn ds-btn--primary urgency-notice__btn"
          onClick={onAcknowledge}
          disabled={busy || disabled}
          aria-label={`Ho capito: conferma di aver letto e compreso${subject ? ` ${subject}` : ''}`}
        >
          {busy ? 'Registrazione…' : 'Ho capito'}
        </button>
      )}
      {showButton && (
        <small>La conferma rimuove l’avviso attivo e conserva la priorità originale nello storico.</small>
      )}
    </div>
  );
}
