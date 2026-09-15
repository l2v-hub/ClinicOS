import { useId } from 'react';
import { IcoArrow, IcoClock, IcoPill } from '../../icons';
import type { ScadenzaTerapia } from '../../lib/dashboardTherapies';
import type { RiepilogoSomministrazioni } from '../operator/cartella/useRiepilogoSomministrazioni';
import './DashboardTherapyDeadlines.css';

interface Props {
  summary: RiepilogoSomministrazioni;
  onOpenAgenda: () => void;
  onSelectPaziente?: (nome: string, patientId?: string) => void;
}

function timing(row: ScadenzaTerapia, today: string) {
  if (row.minuti === null) return 'Orario da verificare';
  if (row.data !== today) return 'Domani';
  if (row.minuti < 0) return `In ritardo di ${-row.minuti} min`;
  if (row.minuti === 0) return 'Adesso';
  return `Tra ${row.minuti} min`;
}

function DeadlineList({
  rows,
  limit,
  label,
  today,
  onSelectPaziente,
}: {
  rows: ScadenzaTerapia[];
  limit: number;
  label: string;
  today: string;
  onSelectPaziente: Props['onSelectPaziente'];
}) {
  const renderRows = (items: ScadenzaTerapia[]) => (
    <ul className="therapy-deadlines__list" aria-label={label}>
      {items.map((row) => (
        <li className="therapy-deadlines__row" key={row.id}>
          <div className="therapy-deadlines__time">
            <span>{row.data === today ? 'Oggi' : 'Domani'}</span>
            {row.ora ? (
              <time dateTime={`${row.data}T${row.ora}`}>{row.ora}</time>
            ) : (
              <strong>—</strong>
            )}
          </div>
          <div className="therapy-deadlines__patient">
            {onSelectPaziente ? (
              <button
                type="button"
                className="link-btn"
                aria-label={`Apri la cartella di ${row.nome}`}
                onClick={() => onSelectPaziente(row.nome, row.patientId)}
              >
                {row.nome}
              </button>
            ) : (
              <strong>{row.nome}</strong>
            )}
            <span>
              Camera {row.camera} · Letto {row.letto}
            </span>
          </div>
          <div className="therapy-deadlines__prescription">
            <strong>{row.farmaco}</strong>
            <span>
              {row.dose} · {row.via}
            </span>
          </div>
          <span
            className={`therapy-deadlines__timing${row.minuti !== null && row.minuti < 0 ? ' therapy-deadlines__timing--late' : ''}`}
          >
            {timing(row, today)}
          </span>
        </li>
      ))}
    </ul>
  );
  return (
    <>
      {renderRows(rows.slice(0, limit))}
      {rows.length > limit && (
        <details className="therapy-deadlines__more">
          <summary>
            {rows.length - limit === 1
              ? `Mostra un'altra ${label.toLocaleLowerCase('it-IT').replace('somministrazioni', 'somministrazione')}`
              : `Mostra altre ${rows.length - limit} ${label.toLocaleLowerCase('it-IT')}`}
          </summary>
          {renderRows(rows.slice(limit))}
        </details>
      )}
    </>
  );
}

export function DashboardTherapyDeadlines({ summary, onOpenAgenda, onSelectPaziente }: Props) {
  const titleId = useId();
  const { prossime, scadute, senzaOrario } = summary;
  const complete = !summary.domaniInCorso && !summary.domaniFallito;
  return (
    <section className="therapy-deadlines" aria-labelledby={titleId}>
      <header className="therapy-deadlines__header">
        <div>
          <h2 id={titleId}>
            <IcoPill /> Prossime terapie
          </h2>
          <p>Somministrazioni programmate · oggi e domani</p>
        </div>
        <div className="therapy-deadlines__actions">
          <button
            type="button"
            className="link-btn"
            onClick={summary.aggiorna}
            disabled={summary.aggiornamentoInCorso}
          >
            {summary.aggiornamentoInCorso ? 'Aggiornamento…' : 'Aggiorna'}
          </button>
          <button type="button" className="link-btn" onClick={onOpenAgenda}>
            Apri agenda <IcoArrow />
          </button>
        </div>
      </header>

      {summary.inCorso ? (
        <p className="therapy-deadlines__message" role="status">
          Caricamento delle scadenze terapia…
        </p>
      ) : summary.fallito ? (
        <div className="therapy-deadlines__message" role="alert">
          <p>
            Scadenze terapia non disponibili. Riprova per verificare le prossime somministrazioni.
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={summary.aggiorna}
            disabled={summary.aggiornamentoInCorso}
          >
            Riprova
          </button>
        </div>
      ) : (
        <>
          {summary.domaniInCorso && (
            <p className="therapy-deadlines__notice" role="status">
              Caricamento delle scadenze di domani. Sono visibili quelle di oggi.
            </p>
          )}
          {summary.domaniFallito && (
            <p className="therapy-deadlines__notice" role="alert">
              Scadenze di domani non disponibili: il riepilogo mostra solo oggi. Premi Aggiorna per
              riprovare.
            </p>
          )}
          {prossime.length > 0 ? (
            <>
              <h3 className="therapy-deadlines__group-title">
                <IcoClock /> In programma <span>{prossime.length}</span>
              </h3>
              <DeadlineList
                rows={prossime}
                limit={4}
                label="Somministrazioni in programma"
                today={summary.data}
                onSelectPaziente={onSelectPaziente}
              />
            </>
          ) : (
            <p className="therapy-deadlines__message" role="status">
              {senzaOrario.length > 0
                ? 'Nessuna prossima scadenza con orario verificabile.'
                : complete
                  ? 'Nessuna prossima somministrazione programmata oggi o domani.'
                  : 'Nessuna prossima somministrazione programmata per oggi.'}
            </p>
          )}

          {scadute.length > 0 && (
            <div className="therapy-deadlines__overdue">
              <h3 className="therapy-deadlines__group-title">
                Da verificare · in ritardo <span>{scadute.length}</span>
              </h3>
              <DeadlineList
                rows={scadute}
                limit={2}
                label="Somministrazioni in ritardo"
                today={summary.data}
                onSelectPaziente={onSelectPaziente}
              />
            </div>
          )}
          {senzaOrario.length > 0 && (
            <div className="therapy-deadlines__unscheduled">
              <h3 className="therapy-deadlines__group-title">
                Orario da verificare <span>{senzaOrario.length}</span>
              </h3>
              <p className="therapy-deadlines__notice">
                Verifica l'orario nella cartella del paziente.
              </p>
              <DeadlineList
                rows={senzaOrario}
                limit={2}
                label="Somministrazioni senza orario valido"
                today={summary.data}
                onSelectPaziente={onSelectPaziente}
              />
            </div>
          )}
        </>
      )}
      <footer className="therapy-deadlines__footer">
        Aggiornamento automatico ogni minuto · Orari della struttura (Roma)
      </footer>
    </section>
  );
}
