import type { PatientLanding } from '../../lib/patientTargetResolver';
import type { UnreadDiaryEntry } from '../../lib/diaryUnreadQueue';
import { unreadLanding, unreadName } from '../../lib/turnoUnread';
import { formatFacilityLocalMinute } from '../../lib/facilityTime';
import { UnreadAction, type UnreadQueue } from './TurnoDaLeggere';

/** Urgenze da prendere in carico, in cima al Turno (#446): chi l'ha scritta, quando, cosa, e
 *  «Ho capito» sul posto. Sono le stesse voci della coda del badge. */
export function TurnoUrgenti({
  rows,
  atLeast,
  queue,
  onSelectPaziente,
}: {
  rows: UnreadDiaryEntry[];
  atLeast: boolean;
  queue: UnreadQueue;
  onSelectPaziente?: (nome: string, id?: string, landing?: PatientLanding) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="turno-urgenti" aria-label="Urgenze da prendere in carico">
      {rows.map((row) => (
        <article key={row.id} className="turno-urgente" data-unread-id={row.id}>
          <div className="turno-urgente__main">
            <p className="turno-urgente__meta">
              Urgente per tutti · {formatFacilityLocalMinute(row.entryDateTime)} · {row.authorName}
            </p>
            <p className="turno-urgente__what">
              <strong>{unreadName(row)}</strong>
              {row.title ? ` — ${row.title}` : ''}
            </p>
            <p className="turno-urgente__text">{row.content}</p>
          </div>
          <div className="turno-urgente__actions">
            <UnreadAction row={row} queue={queue} />
            {onSelectPaziente && (
              <button
                type="button"
                className="ds-link"
                onClick={() => onSelectPaziente(unreadName(row), row.patientId, unreadLanding(row))}
              >
                {row.sourceType === 'consegna' ? 'Apri consegna' : 'Apri diario'}
              </button>
            )}
          </div>
        </article>
      ))}
      {atLeast && <p className="turno-urgenti__more">Altre urgenze nella pagina Consegne.</p>}
    </section>
  );
}
