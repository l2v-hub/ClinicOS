import { useMemo } from 'react';
import {
  inCaricoNelTurno,
  turnoPatientCard,
  type SourceState,
  type TurnoTherapies,
} from '../../lib/turnoPatients';
import { usePatientListPage } from './usePatientListPage';
import { LazyNews2 } from './LazyNews2';
import type { PatientLanding } from '../../lib/patientTargetResolver';

interface Props {
  therapies: TurnoTherapies;
  onSelectPaziente?: (nome: string, patientId?: string, landing?: PatientLanding) => void;
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
              {c.badges.map((b) => {
                const content = (
                  <>
                    {b.alert && (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 3.5 2.5 20h19zM12 10v4.5M12 17.5v.01" />
                      </svg>
                    )}
                    {b.label}
                  </>
                );
                // Direct access: ogni segnalazione apre la cartella dove quel dato vive.
                return b.landing && onSelectPaziente ? (
                  <button
                    key={b.key}
                    type="button"
                    className={`turno-badge turno-badge--${b.tone} turno-badge--link`}
                    data-turno-badge={b.key}
                    aria-label={`${b.label}: apri nella cartella di ${c.nome}`}
                    onClick={() => onSelectPaziente(c.nome, c.id, b.landing)}
                  >
                    {content}
                  </button>
                ) : (
                  <span key={b.key} className={`turno-badge turno-badge--${b.tone}`}>
                    {content}
                  </span>
                );
              })}
            </div>
            {c.prossimaEtichetta && c.prossimaVoci.length > 0 && onSelectPaziente ? (
              <p className={`turno-pcard__next${c.prossimaInRitardo ? ' is-late' : ''}`}>
                <span className="turno-pcard__next-label">{c.prossimaEtichetta}:</span>{' '}
                {c.prossimaVoci.map((v, index) => (
                  <span key={v.key}>
                    {index > 0 && ', '}
                    <button
                      type="button"
                      className="turno-pcard__dose"
                      data-turno-dose={v.landing.therapy?.therapyId ?? ''}
                      aria-label={`${c.prossimaEtichetta}: ${v.text}. Apri la terapia di ${c.nome}`}
                      onClick={() => onSelectPaziente(c.nome, c.id, v.landing)}
                    >
                      {v.text}
                    </button>
                  </span>
                ))}
              </p>
            ) : (
              <span className={`turno-pcard__next${c.prossimaInRitardo ? ' is-late' : ''}`}>
                {c.prossima}
              </span>
            )}
          </article>
        ))}
      </section>
    </>
  );
}
