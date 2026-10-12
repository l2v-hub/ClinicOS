import { useId } from 'react';
import type { PatientLanding } from '../../lib/patientTargetResolver';
import { ordineGiro } from '../../lib/turnoVariant';
import type { GiroParametri } from '../../lib/useGiroParametri';

const VISIBILI = 5;

/** Giro parametri del giorno nel Turno dell'OSS (#446): quanti già rilevati su quanti, chi viene
 *  prima e perché, «Rileva» che apre i parametri di quel paziente. */
export function TurnoGiroParametri({
  giro,
  onSelectPaziente,
  onStartGiro,
}: {
  giro: GiroParametri;
  onSelectPaziente?: (nome: string, id?: string, landing?: PatientLanding) => void;
  onStartGiro: () => void;
}) {
  const titleId = useId();
  const fatti = giro.pazienti.filter((p) => p.rilevatoOggi).length;
  const totale = giro.pazienti.length;
  const daFare = ordineGiro(giro.pazienti).filter((p) => !p.rilevatoOggi || p.critico);
  const visibili = daFare.slice(0, VISIBILI);
  return (
    <section
      className="turno-card turno-giro"
      aria-labelledby={titleId}
      aria-busy={giro.state === 'loading'}
    >
      <div className="turno-card__head">
        <div className="turno-card__title">
          <h2 className="turno-h2" id={titleId}>
            Giro parametri di oggi
            {giro.state === 'ready' &&
              ` · ${fatti} di ${giro.completo ? totale : `almeno ${totale}`}`}
          </h2>
        </div>
        <button type="button" className="ds-link" onClick={onStartGiro}>
          Inizia il giro
        </button>
      </div>
      {giro.state === 'loading' ? (
        <p className="turno-empty" role="status">
          Aggiornamento del giro…
        </p>
      ) : giro.state === 'error' ? (
        <p className="turno-empty turno-empty--error" role="alert">
          Giro parametri non disponibile.
          <button type="button" className="ds-link" onClick={giro.aggiorna}>
            Riprova
          </button>
        </p>
      ) : daFare.length === 0 && giro.completo ? (
        <p className="turno-empty" role="status">
          Giro completo: tutti i pazienti hanno parametri rilevati oggi.
        </p>
      ) : daFare.length === 0 ? (
        <p className="turno-empty" role="status">
          Nessuno da rilevare fra i primi {totale} pazienti: gli altri sono in Parametri.
        </p>
      ) : (
        <ol className="turno-giro__list">
          {visibili.map((p, index) => (
            <li key={p.patientId} className="turno-giro__row">
              <span className="turno-giro__who">
                <strong>{p.nome}</strong>
                {p.luogo && <span className="turno-giro__where"> · {p.luogo}</span>}
                {p.critico && <span className="turno-giro__why"> · prima: parametro critico</span>}
                {!p.critico && !p.rilevatoOggi && (
                  <span className="turno-giro__where"> · non rilevato oggi</span>
                )}
              </span>
              {onSelectPaziente && (
                <button
                  type="button"
                  className={`ds-btn ${index === 0 ? 'ds-btn--primary' : 'ds-btn--secondary'}`}
                  aria-label={`Rileva i parametri di ${p.nome}`}
                  onClick={() => onSelectPaziente(p.nome, p.patientId, { tab: 'parametri' })}
                >
                  Rileva
                </button>
              )}
            </li>
          ))}
          {daFare.length > VISIBILI && (
            <li className="turno-giro__row turno-giro__more">
              <span>+ {daFare.length - VISIBILI} pazienti</span>
            </li>
          )}
        </ol>
      )}
    </section>
  );
}
