import type { PatientLanding } from '../../lib/patientTargetResolver';
import type { UnreadDiaryEntry } from '../../lib/diaryUnreadQueue';
import { unreadLanding, unreadName } from '../../lib/turnoUnread';
import { urgencyTime } from '../../lib/urgency';
import { UnreadAction, type UnreadQueue } from './TurnoDaLeggere';

/** Urgenze da prendere in carico, in cima al Turno (#446): chi l'ha scritta, quando, cosa, e
 *  «Ho capito» sul posto. Sono le stesse voci della coda del badge. */
export function TurnoUrgenti({
  rows,
  atLeast,
  state = 'ready',
  queue,
  onSelectPaziente,
}: {
  rows: UnreadDiaryEntry[];
  atLeast: boolean;
  /** Un errore delle urgenze si dice: per OSS e medico non c'è la chip che lo segnalerebbe. */
  state?: 'loading' | 'ready' | 'error';
  queue: UnreadQueue;
  onSelectPaziente?: (nome: string, id?: string, landing?: PatientLanding) => void;
}) {
  // Senza urgenze visibili ma con altre pagine da leggere, l'avviso resta (#446 QA).
  if (state === 'error')
    return (
      <p className="turno-urgenti__more" role="alert">
        Urgenze non disponibili: quelle da prendere in carico potrebbero mancare. Apri Consegne.
      </p>
    );
  if (rows.length === 0 && !atLeast) return null;
  return (
    <section className="turno-urgenti" aria-label="Urgenze da prendere in carico">
      {rows.map((row) => (
        <article key={row.id} className="turno-urgente" data-unread-id={row.id}>
          <div className="turno-urgente__main">
            <p className="turno-urgente__meta">
              Urgente per tutti · {urgencyTime(row.entryDateTime)} · {row.authorName}
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
      {atLeast && (
        <p className="turno-urgenti__more">
          Ci possono essere altre urgenze oltre le note lette qui: apri Consegne.
        </p>
      )}
    </section>
  );
}
