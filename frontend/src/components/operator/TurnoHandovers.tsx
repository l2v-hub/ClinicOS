import { useId } from 'react';
import type { ConsegnaOverview } from '../../types';
import type { PatientLanding } from '../../lib/patientTargetResolver';
import { landingOf } from '../../lib/patientTargetResolver';
import { handoverPreview } from '../../lib/handoverPreview';
import { isConsegnaUrgencyActive } from '../../lib/consegnaUrgency';
import { urgencyTime, urgencyTraceText } from '../../lib/urgency';
import { IcoArrow, IcoConsegne } from '../../icons';
import './TurnoHandovers.css';
import { useWidgetOpen } from '../shared/WidgetGroup';
import { WidgetToggle } from '../shared/WidgetToggle';

interface Props {
  overview: ConsegnaOverview | null;
  state: 'loading' | 'ready' | 'error';
  onOpen: () => void;
  onRetry?: () => void;
  onSelectPaziente?: (nome: string, id?: string, landing?: PatientLanding) => void;
}

export function TurnoHandovers({ overview, state, onOpen, onRetry, onSelectPaziente }: Props) {
  const titleId = useId();
  const { open, setOpen, bodyId } = useWidgetOpen();
  const items = handoverPreview(overview);
  return (
    <section
      className={`turno-card turno-handovers${state === 'ready' && overview && items.length === 0 ? ' turno-card--empty' : ''}`}
      aria-labelledby={titleId}
      aria-busy={state === 'loading'}
    >
      <div className="turno-card__head">
        <div className="turno-card__title">
          <IcoConsegne />
          <h2 className="turno-h2" id={titleId}>
            Ultime consegne
          </h2>
        </div>
        <button type="button" className="ds-link" onClick={onOpen}>
          Tutte <IcoArrow />
        </button>
        <WidgetToggle
          title="Ultime consegne"
          open={open}
          bodyId={bodyId}
          onToggle={() => setOpen(!open)}
        />
      </div>
      <div id={bodyId} hidden={!open}>
        <p className="turno-handovers__hint">
          Selezione delle ultime consegne · prima le urgenze attive
        </p>
        {state === 'loading' ? (
          <p className="turno-empty" role="status">
            Aggiornamento consegne…
          </p>
        ) : state === 'error' || !overview ? (
          <p className="turno-empty turno-empty--error" role="alert">
            Consegne non disponibili.
            {onRetry && (
              <button type="button" className="ds-link" onClick={onRetry}>
                Riprova
              </button>
            )}
          </p>
        ) : items.length === 0 ? (
          <p className="turno-empty" role="status">
            Nessuna consegna da mostrare.
          </p>
        ) : (
          <ol className="turno-handovers__list">
            {items.map((item) => {
              const urgent = isConsegnaUrgencyActive(item);
              const label = urgent
                ? 'Urgente'
                : item.urgency?.state === 'taken'
                  ? item.urgency.takenBy
                    ? 'Letta e compresa'
                    : 'Urgenza storica'
                  : item.priorita === 'alta'
                    ? 'Attenzione'
                    : 'Normale';
              return (
                <li key={item.id} className={`turno-handovers__item${urgent ? ' is-urgent' : ''}`}>
                  <div className="turno-handovers__meta">
                    <span
                      className={`turno-badge turno-badge--${urgent ? 'crit' : item.priorita === 'alta' ? 'warn' : 'blue'}`}
                    >
                      {label}
                    </span>
                    <time dateTime={item.createdAt}>{urgencyTime(item.createdAt)}</time>
                  </div>
                  <strong className="turno-handovers__patient">{item.pazienteNome}</strong>
                  <span className="turno-handovers__type">{item.tipo}</span>
                  {item.note?.trim() && <p className="turno-handovers__text">{item.note}</p>}
                  {item.urgency?.state === 'taken' && (
                    <p className="turno-handovers__trace">{urgencyTraceText(item.urgency)}</p>
                  )}
                  <div className="turno-handovers__bottom">
                    <span>{item.creatoDA}</span>
                    {onSelectPaziente && (
                      <button
                        type="button"
                        className="ds-link"
                        aria-label={`Leggi consegna di ${item.pazienteNome}: ${item.tipo}`}
                        onClick={() =>
                          onSelectPaziente(
                            item.pazienteNome,
                            item.pazienteId,
                            landingOf({
                              kind: 'handover',
                              patientId: item.pazienteId,
                              consegnaId: item.id,
                            }),
                          )
                        }
                      >
                        Leggi consegna <IcoArrow />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
