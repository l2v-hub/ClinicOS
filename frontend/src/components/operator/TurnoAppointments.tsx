import { useId } from 'react';
import type { SlotAgenda } from '../../types';
import { IcoArrow } from '../../icons';
import { useWidgetOpen } from '../shared/WidgetGroup';
import { WidgetToggle } from '../shared/WidgetToggle';
import { prossimiAppuntamenti } from '../../lib/turnoAppointments';
import { landingOf, type PatientLanding } from '../../lib/patientTargetResolver';

interface Props {
  agenda: SlotAgenda[];
  state?: 'loading' | 'ready' | 'error';
  onRetry?: () => void;
  onOpenAgenda: () => void;
  onSelectPaziente?: (nome: string, patientId?: string, landing?: PatientLanding) => void;
}

/** Card "Prossimi appuntamenti" della schermata Turno (HMI 1). */
export function TurnoAppointments({
  agenda,
  state = 'ready',
  onRetry,
  onOpenAgenda,
  onSelectPaziente,
}: Props) {
  const titleId = useId();
  const { open, setOpen, bodyId } = useWidgetOpen();
  const { items: next, altri } = prossimiAppuntamenti(agenda, new Date());
  return (
    <section className="turno-card" aria-labelledby={titleId}>
      <div className="turno-card__head">
        <h2 className="turno-h2" id={titleId}>
          Prossimi appuntamenti
        </h2>
        <button type="button" className="ds-link" onClick={onOpenAgenda}>
          Agenda <IcoArrow />
        </button>
        <WidgetToggle title="Prossimi appuntamenti" open={open} bodyId={bodyId} onToggle={() => setOpen(!open)} />
      </div>
      <div id={bodyId} hidden={!open}>
      {state === 'error' ? (
        <p className="turno-empty turno-empty--error" role="alert">
          Appuntamenti non disponibili.{' '}
          {onRetry && (
            <button type="button" className="link-btn" onClick={onRetry}>
              Riprova
            </button>
          )}
        </p>
      ) : state === 'loading' ? (
        <p className="turno-empty" role="status">
          Caricamento degli appuntamenti di oggi…
        </p>
      ) : next.length === 0 ? (
        <p className="turno-empty">Nessun altro appuntamento oggi.</p>
      ) : (
        <ul className="turno-appts">
          {next.map(({ slot: s, daIniziare }) => (
            <li key={s.id} className="turno-appt">
              <span className={`turno-appt__ora${daIniziare ? ' is-late' : ''}`}>{s.ora}</span>
              <div className="turno-appt__main">
                <span className="turno-appt__what">
                  {s.motivo}
                  {s.stato === 'in_corso' && <span className="turno-appt__now"> · in corso</span>}
                  {daIniziare && <span className="turno-appt__late"> · da iniziare</span>}
                </span>
                {s.pazienteNome && onSelectPaziente ? (
                  <button
                    type="button"
                    className="turno-appt__who link-btn"
                    // Direct access: la parte della cartella che documenta questo appuntamento.
                    onClick={() =>
                      onSelectPaziente(
                        s.pazienteNome!,
                        s.patientId,
                        s.patientId
                          ? landingOf({
                              kind: 'appointment',
                              patientId: s.patientId,
                              tipoIntervento: s.motivo,
                            })
                          : undefined,
                      )
                    }
                  >
                    {s.pazienteNome}
                  </button>
                ) : (
                  <span className="turno-appt__who">
                    {s.pazienteNome ?? 'Paziente non indicato'}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {state === 'ready' && altri > 0 && (
        <p className="turno-more">
          <button type="button" className="ds-link" onClick={onOpenAgenda}>
            Altri {altri} da vedere in agenda <IcoArrow />
          </button>
        </p>
      )}
      </div>
    </section>
  );
}
