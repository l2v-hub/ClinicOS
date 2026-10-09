import type { UrgencyView } from '../../../types';
import { formatFacilityLocalMinute } from '../../../lib/facilityTime';
import { isUrgencyView, legacyReadTraces } from '../../../lib/urgency';
import { UrgencyNotice } from '../../shared/UrgencyNotice';
import './DiaryThreadReceipt.css';
import { isDiaryReadReceipt, type DiaryReadReceipt } from '../../../lib/diaryReading';

const ROLE_LABELS: Record<string, string> = {
  medico: 'Medico',
  infermiere: 'Infermiere',
  oss: 'OSS',
  fisioterapista: 'Fisioterapista',
  operatore: 'Operatore',
  altro: 'Operatore',
};

/** Shared, optional explanation outside individual notes. Opening it never records a read. */
export function DiaryReadingGuide() {
  return (
    <details className="diary-reading-guide">
      <summary>Come funziona la conferma di lettura</summary>
      <p>
        Aprire la nota non conferma la lettura. «Conferma lettura» registra chi ha confermato e
        quando; la conferma spetta a un altro operatore, non all’autore della nota.
      </p>
      <p>
        La conferma di lettura non prende in carico l’urgenza e non dichiara completato
        l’intervento. La presa in carico resta un’azione separata, «Ho capito».
      </p>
    </details>
  );
}

/** A response belongs to its original diary message. Only server receipts name a reader. */
export function DiaryThreadReceipt({
  urgency,
  readReceipt,
  acknowledgements,
  priority,
  onAcknowledge,
  busy,
  disabled,
  subject,
}: {
  urgency?: UrgencyView | null;
  readReceipt?: DiaryReadReceipt;
  acknowledgements?: unknown;
  priority: string;
  onAcknowledge: () => void;
  busy: boolean;
  disabled: boolean;
  subject: string;
}) {
  if (isDiaryReadReceipt(readReceipt)) {
    const reader = readReceipt.readBy;
    return (
      <div
        className={`diary-thread diary-thread--reading diary-thread--${reader ? 'taken' : 'unread'}`}
        data-diary-reading-state={readReceipt.state}
      >
        <div className="diary-thread__reply">
          {reader ? (
            <div className="diary-thread__status">
              <div className="diary-thread__head">
                <strong>
                  Lettura confermata da {reader.operatorName} (
                  {ROLE_LABELS[reader.operatorRole] ?? reader.operatorRole})
                </strong>
                <time dateTime={reader.acknowledgedAt}>
                  {formatFacilityLocalMinute(reader.acknowledgedAt)}
                </time>
              </div>
            </div>
          ) : (
            <>
              <div className="diary-thread__status">
                <strong>Lettura non confermata</strong>
                {readReceipt.isAuthor && (
                  <p className="diary-thread__message">Conferma riservata a un altro operatore.</p>
                )}
              </div>
              {readReceipt.canAcknowledge && (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  aria-label={`Conferma lettura: ${subject}`}
                  disabled={disabled || busy}
                  onClick={onAcknowledge}
                >
                  {busy ? 'Registrazione…' : 'Conferma lettura'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
  const verified = isUrgencyView(urgency) ? urgency : null;
  const reader = verified?.state === 'taken' ? verified.takenBy : null;
  const personalReads =
    !verified && Array.isArray(acknowledgements)
      ? acknowledgements.filter((row) => legacyReadTraces([row]).length > 0)
      : [];
  const state = verified?.state ?? 'unavailable';
  return (
    <div className={`diary-thread diary-thread--${state}`} data-diary-response-state={state}>
      {(verified || personalReads.length === 0) && (
        <div className="diary-thread__reply">
          {reader ? (
            <>
              <div className="diary-thread__head">
                <strong>
                  Letta e compresa da {reader.operatorName} (
                  {ROLE_LABELS[reader.operatorRole] ?? reader.operatorRole})
                </strong>
                <time dateTime={reader.acknowledgedAt}>
                  {formatFacilityLocalMinute(reader.acknowledgedAt)}
                </time>
              </div>
              <p className="diary-thread__message">«Ho capito» · conferma registrata</p>
              <small>
                Conferma di lettura e comprensione. L’intervento clinico non è dichiarato concluso.
              </small>
            </>
          ) : verified?.state === 'active' ? (
            <>
              <strong>In attesa di conferma</strong>
              <p className="diary-thread__message">
                Nessuna conferma di lettura registrata. La voce potrebbe essere stata visionata
                senza conferma.
              </p>
              <UrgencyNotice
                urgency={verified}
                onAcknowledge={onAcknowledge}
                busy={busy}
                disabled={disabled}
                subject={subject}
              />
            </>
          ) : (
            <>
              <strong>
                {state === 'none' ? 'Conferma non richiesta' : 'Visione non verificabile'}
              </strong>
              <p className="diary-thread__message">
                {state === 'none'
                  ? `Per la priorità ${priority} la conferma non è richiesta. Non è possibile sapere se la voce è stata visionata, da chi e quando.`
                  : state === 'taken'
                    ? 'Per questa voce storica non sono disponibili nome e data della conferma. Non è possibile verificare chi l’ha visionata e quando.'
                    : 'Non sono disponibili conferme di lettura. Non è possibile sapere se la voce è stata visionata, da chi e quando.'}
              </p>
            </>
          )}
        </div>
      )}
      {personalReads.map((row, index) => (
        <div className="diary-thread__reply diary-thread__reply--personal" key={index}>
          <div className="diary-thread__head">
            <strong>
              Letta da {row.operatorName} ({ROLE_LABELS[row.operatorRole] ?? row.operatorRole})
            </strong>
            <time dateTime={row.acknowledgedAt}>
              {formatFacilityLocalMinute(row.acknowledgedAt)}
            </time>
          </div>
          <small>
            Lettura personale registrata. Non conferma la lettura degli altri operatori né il
            completamento dell’intervento.
          </small>
        </div>
      ))}
    </div>
  );
}
