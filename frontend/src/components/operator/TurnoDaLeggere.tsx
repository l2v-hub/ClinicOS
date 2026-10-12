import { useId } from 'react';
import type { PatientLanding } from '../../lib/patientTargetResolver';
import type { UnreadDiaryEntry } from '../../lib/diaryUnreadQueue';
import { TURNO_DA_LEGGERE_LIMIT, unreadLanding, unreadName } from '../../lib/turnoUnread';
import { formatFacilityLocalMinute } from '../../lib/facilityTime';
import { canTakeCharge } from '../../lib/urgency';
import type { useUnreadDiaryQueue } from './useUnreadDiaryQueue';
import { IcoArrow, IcoConsegne } from '../../icons';
import './TurnoHandovers.css';

export type UnreadQueue = ReturnType<typeof useUnreadDiaryQueue>;

/** Un solo gesto per nota (#446/#449): «Ho capito» per un'urgenza altrui, «Letta» per le altre;
 *  la propria urgenza aspetta un collega e non ha pulsante. */
export function UnreadAction({ row, queue }: { row: UnreadDiaryEntry; queue: UnreadQueue }) {
  const busy = queue.busy === row.id;
  const disabled = queue.busy !== null;
  if (row.priority === 'urgente' && row.urgency?.state === 'active') {
    if (!canTakeCharge(row.urgency))
      return <span className="turno-handovers__waiting">In attesa di un collega</span>;
    return (
      <button
        type="button"
        className="ds-btn ds-btn--primary turno-handovers__ack"
        disabled={disabled}
        aria-label={`Ho capito: ${unreadName(row)}`}
        onClick={() => void queue.acknowledge(row, 'urgency')}
      >
        {busy ? 'Registrazione…' : 'Ho capito'}
      </button>
    );
  }
  return (
    <button
      type="button"
      className="ds-btn ds-btn--secondary turno-handovers__ack"
      disabled={disabled}
      aria-label={`Letta: ${unreadName(row)}`}
      onClick={() => void queue.acknowledge(row, 'read')}
    >
      {busy ? 'Registrazione…' : 'Letta'}
    </button>
  );
}

/** «Da leggere» del Turno: la stessa coda del badge Consegne (note di diario e consegne senza
 *  conferma), quindi lo stesso totale; prima le urgenze. */
export function TurnoDaLeggere({
  queue,
  exclude,
  onOpenAll,
  onSelectPaziente,
}: {
  queue: UnreadQueue;
  /** Voci già mostrate altrove nel Turno (urgenze in cima): non si ripetono. */
  exclude?: ReadonlySet<string>;
  onOpenAll: () => void;
  onSelectPaziente?: (nome: string, id?: string, landing?: PatientLanding) => void;
}) {
  const titleId = useId();
  const total = queue.page?.totalUnread ?? null;
  const rows = [...(queue.page?.entries ?? [])]
    .filter((row) => !exclude?.has(row.id))
    .sort((a, b) => Number(b.priority === 'urgente') - Number(a.priority === 'urgente'))
    .slice(0, TURNO_DA_LEGGERE_LIMIT);
  return (
    <section
      className="turno-card turno-handovers"
      aria-labelledby={titleId}
      aria-busy={queue.loading}
    >
      <div className="turno-card__head">
        <div className="turno-card__title">
          <IcoConsegne />
          <h2 className="turno-h2" id={titleId}>
            Da leggere
          </h2>
          {total !== null && total > 0 && (
            <span className="turno-badge turno-badge--blue" data-unread-total={total}>
              {total}
            </span>
          )}
        </div>
        <button type="button" className="ds-link" onClick={onOpenAll}>
          Tutte <IcoArrow />
        </button>
      </div>
      {queue.error ? (
        <p className="turno-empty turno-empty--error" role="alert">
          {queue.error}
          <button type="button" className="ds-link" onClick={queue.retry}>
            Riprova
          </button>
        </p>
      ) : queue.loading && !queue.page ? (
        <p className="turno-empty" role="status">
          Aggiornamento…
        </p>
      ) : total === 0 ? (
        <p className="turno-empty" role="status">
          Niente da leggere.
        </p>
      ) : rows.length === 0 ? (
        <p className="turno-empty" role="status">
          Le note da leggere sono in cima alla pagina.
        </p>
      ) : (
        <ol className="turno-handovers__list">
          {rows.map((row) => {
            const urgent = row.priority === 'urgente';
            return (
              <li
                key={row.id}
                className={`turno-handovers__item${urgent ? ' is-urgent' : ''}`}
                data-unread-id={row.id}
              >
                <div className="turno-handovers__meta">
                  <span
                    className={`turno-badge turno-badge--${urgent ? 'crit' : row.priority === 'importante' ? 'warn' : 'blue'}`}
                  >
                    {urgent ? 'Urgente' : row.priority === 'importante' ? 'Importante' : 'Normale'}
                  </span>
                  <time dateTime={row.entryDateTime}>
                    {formatFacilityLocalMinute(row.entryDateTime)}
                  </time>
                </div>
                <strong className="turno-handovers__patient">{unreadName(row)}</strong>
                {row.title && <span className="turno-handovers__type">{row.title}</span>}
                <p className="turno-handovers__text">{row.content}</p>
                <UnreadAction row={row} queue={queue} />
                <div className="turno-handovers__bottom">
                  <span>{row.authorName}</span>
                  {onSelectPaziente && (
                    <button
                      type="button"
                      className="ds-link"
                      aria-label={`Apri: ${unreadName(row)}`}
                      onClick={() =>
                        onSelectPaziente(unreadName(row), row.patientId, unreadLanding(row))
                      }
                    >
                      Apri <IcoArrow />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
