import { useMemo } from 'react';
import {
  inCaricoNelTurno,
  turnoPatientCard,
  type SourceState,
  type TurnoTherapies,
} from '../../lib/turnoPatients';
import { usePatientListPage } from './usePatientListPage';
import { LazyNews2 } from './LazyNews2';

interface Props {
  therapies: TurnoTherapies;
  onSelectPaziente?: (nome: string, patientId?: string) => void;
}

/** Griglia delle card paziente della schermata Turno (HMI 1): roster reale del reparto. Se il
 *  riepilogo clinico non arriva lo dice: allergie e stato di ricovero non sono verificati. */
export function TurnoPatients({ therapies, onSelectPaziente }: Props) {
  const { patients, summary, loading, pageError, summaryLoading, summaryError, retrySummary } =
    usePatientListPage('', 'tutti');
  const byId = useMemo(() => new Map(summary.map((s) => [s.patientId, s])), [summary]);
  const summaryState: SourceState = summaryError ? 'error' : summaryLoading ? 'loading' : 'ready';
  const cards = useMemo(
    () =>
      patients
        .filter((p) => !byId.has(p.id) || inCaricoNelTurno(byId.get(p.id)))
        .map((p) => turnoPatientCard(p, byId.get(p.id), summaryState, therapies)),
    [patients, byId, summaryState, therapies],
  );

  if (pageError)
    return (
      <p className="turno-empty" role="alert">
        Pazienti non disponibili: {pageError}
      </p>
    );
  // Prima del riepilogo non si sa chi è dimesso né chi ha allergie: niente card finché non arriva.
  if ((loading && cards.length === 0) || (summaryLoading && summary.length === 0))
    return (
      <p className="turno-empty" role="status">
        Caricamento dei pazienti…
      </p>
    );

  return (
    <>
      {summaryError && (
        <p className="turno-empty turno-empty--error" role="alert">
          Riepilogo clinico non disponibile: allergie, segnalazioni e stato di ricovero non sono
          verificati, quindi sono mostrati tutti i pazienti.{' '}
          <button type="button" className="link-btn" onClick={retrySummary}>
            Riprova
          </button>
        </p>
      )}
      <section className="turno-pgrid" aria-label="Pazienti">
        {cards.map((c) => (
          <article key={c.id} className="turno-pcard">
            <div className="turno-pcard__top">
              <span className="turno-pcard__bed" aria-hidden="true">
                {c.camera}
              </span>
              <div className="turno-pcard__id">
                <button
                  type="button"
                  className="turno-pcard__open"
                  onClick={() => onSelectPaziente?.(c.nome, c.id)}
                  aria-label={`Apri cartella di ${c.nome}${c.camera !== '—' ? `, camera ${c.camera}` : ''}`}
                >
                  {c.nome}
                </button>
                <span className="turno-pcard__sub">{c.sottotitolo}</span>
              </div>
            </div>
            <div className="turno-pcard__badges">
              <LazyNews2 patientId={c.id} patientName={c.nome} />
              {c.badges.map((b) => (
                <span key={b.key} className={`turno-badge turno-badge--${b.tone}`}>
                  {b.alert && (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 3.5 2.5 20h19zM12 10v4.5M12 17.5v.01" />
                    </svg>
                  )}
                  {b.label}
                </span>
              ))}
            </div>
            <span className={`turno-pcard__next${c.prossimaInRitardo ? ' is-late' : ''}`}>
              {c.prossima}
            </span>
          </article>
        ))}
      </section>
    </>
  );
}
