import type { UrgencyView } from '../../../types';
import { formatFacilityLocalMinute } from '../../../lib/facilityTime';
import { isUrgencyView, legacyReadTraces } from '../../../lib/urgency';
import { UrgencyNotice } from '../../shared/UrgencyNotice';
import './DiaryThreadReceipt.css';

const ROLE_LABELS: Record<string, string> = {
  medico: 'Medico',
  infermiere: 'Infermiere',
  oss: 'OSS',
  fisioterapista: 'Fisioterapista',
  operatore: 'Operatore',
  altro: 'Operatore',
};

/** A response belongs to its original diary message. Only server receipts name a reader. */
export function DiaryThreadReceipt({
  urgency,
  acknowledgements,
  priority,
  onAcknowledge,
  busy,
  disabled,
  subject,
}: {
  urgency?: UrgencyView | null;
  acknowledgements?: unknown;
  priority: string;
  onAcknowledge: () => void;
  busy: boolean;
  disabled: boolean;
  subject: string;
}) {
  const verified = isUrgencyView(urgency) ? urgency : null;
  const reader = verified?.state === 'taken' ? verified.takenBy : null;
  const personalReads =
    !verified && Array.isArray(acknowledgements)
      ? acknowledgements.filter((row) => legacyReadTraces([row]).length > 0)
      : [];
  const state = verified?.state ?? 'unavailable';
  return (
    <div className={`diary-thread diary-thread--${state}`} data-diary-response-state={state}>
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
              {state === 'none'
                ? 'Conferma non richiesta'
                : state === 'taken'
                  ? 'Conferma storica non disponibile'
                  : 'Conferma condivisa non disponibile'}
            </strong>
            <p className="diary-thread__message">
              {state === 'none'
                ? `La priorità ${priority} non prevede «Ho capito» nel flusso attuale.`
                : state === 'taken'
                  ? 'La voce proviene dal flusso precedente: chi ha letto e compreso non è registrato.'
                  : 'Il server non restituisce lo stato di lettura condiviso di questa voce.'}
            </p>
          </>
        )}
      </div>
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
            Lettura personale registrata · registrazione personale, non una conferma condivisa.
          </small>
        </div>
      ))}
    </div>
  );
}
