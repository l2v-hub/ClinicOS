import { useId } from 'react';
import type { SlotAgenda } from '../../types';
import { IcoArrow } from '../../icons';
import { prossimiAppuntamenti } from '../../lib/turnoAppointments';

interface Props {
  agenda: SlotAgenda[];
  state?: 'loading' | 'ready' | 'error';
  onRetry?: () => void;
  onOpenAgenda: () => void;
  onSelectPaziente?: (nome: string, patientId?: string) => void;
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
  const { items: next, altri } = prossimiAppuntamenti(agenda, new Date());
  return (
    <section className="turno-card" aria-labelledby={titleId}>
      <div className="turno-card__head">
        <h2 className="turno-h2" id={titleId}>
          Prossimi appuntamenti
        </h2>
        <button type="button" className="turno-btn turno-btn--ghost" onClick={onOpenAgenda}>
          Agenda <IcoArrow />
        </button>
      </div>
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
                    onClick={() => onSelectPaziente(s.pazienteNome!, s.patientId)}
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
        <p className="turno-more">Altri {altri} da vedere in agenda</p>
      )}
    </section>
  );
}
