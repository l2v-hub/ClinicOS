import { useId, type ReactNode } from 'react';
import { IcoArrow } from '../../icons';
import type { AdessoItem } from '../../lib/adessoQueue';
import './AdessoQueue.css';

export const ADESSO_QUEUE_LIMIT = 6;

type SourceState = 'ready' | 'loading' | 'error';

interface Props {
  items: AdessoItem[];
  terapie: SourceState;
  consegne: SourceState;
  anomalie: SourceState;
  onSelectPaziente?: (nome: string, patientId?: string) => void;
  onOpenTherapy: () => void;
  onOpenConsegne: () => void;
  onRetryTherapy?: () => void;
  /** Scadenze di domani (servono alle terapie imminenti dopo mezzanotte e alle card). */
  domani?: SourceState;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Azione a destra del titolo (centro segnalazioni). */
  headerAction?: ReactNode;
}

/** Card "Adesso" della schermata Turno (HMI 1): la coda di ciò che va fatto, per urgenza.
 *  Ogni fonte in caricamento o in errore viene detta: la coda non si presenta mai come vuota se
 *  manca un pezzo. */
export function AdessoQueue({
  items,
  terapie,
  consegne,
  anomalie,
  onSelectPaziente,
  onOpenTherapy,
  onOpenConsegne,
  onRetryTherapy,
  domani = 'ready',
  onRefresh,
  refreshing = false,
  headerAction,
}: Props) {
  const titleId = useId();
  const visible = items.slice(0, ADESSO_QUEUE_LIMIT);
  const rest = items.length - visible.length;
  const urgenti = items.filter((it) => it.inRitardo).length;
  const allReady = terapie === 'ready' && consegne === 'ready' && anomalie === 'ready';

  return (
    <section className="adesso-queue turno-card" aria-labelledby={titleId}>
      <div className="turno-card__head">
        <div className="turno-card__title">
          <h2 className="turno-h2" id={titleId}>
            Adesso
          </h2>
          {urgenti > 0 && (
            <span className="turno-badge turno-badge--crit adesso-queue__count">
              {urgenti} urgenti
            </span>
          )}
        </div>
        {headerAction}
      </div>

      {terapie === 'loading' && (
        <p className="adesso-queue__notice" role="status">
          Scadenze terapia in verifica: la coda le aggiunge appena pronte.
        </p>
      )}
      {terapie === 'error' && (
        <p className="adesso-queue__notice adesso-queue__notice--error" role="alert">
          Scadenze terapia non disponibili: la coda non le include.
          {onRetryTherapy && (
            <button type="button" className="link-btn" onClick={onRetryTherapy}>
              Riprova
            </button>
          )}
        </p>
      )}
      {terapie === 'ready' && domani === 'loading' && (
        <p className="adesso-queue__notice" role="status">
          Caricamento delle scadenze di domani. Sono visibili quelle di oggi.
        </p>
      )}
      {terapie === 'ready' && domani === 'error' && (
        <p className="adesso-queue__notice adesso-queue__notice--error" role="alert">
          Scadenze di domani non disponibili: la coda mostra solo oggi.
          {onRefresh && (
            <button type="button" className="link-btn" onClick={onRefresh}>
              Riprova
            </button>
          )}
        </p>
      )}
      {consegne === 'loading' && (
        <p className="adesso-queue__notice" role="status">
          Consegne urgenti in caricamento.
        </p>
      )}
      {consegne === 'error' && (
        <p className="adesso-queue__notice adesso-queue__notice--error" role="alert">
          Consegne urgenti non disponibili: la coda non le include.
        </p>
      )}
      {anomalie === 'loading' && (
        <p className="adesso-queue__notice" role="status">
          Verifica farmaci in corso: eventuali anomalie arrivano appena pronte.
        </p>
      )}
      {anomalie === 'error' && (
        <p className="adesso-queue__notice adesso-queue__notice--error" role="alert">
          Verifica farmaci non riuscita: le anomalie potrebbero mancare.
        </p>
      )}

      {visible.length > 0 ? (
        <ol className="adesso-queue__list">
          {visible.map((it) => (
            <li key={it.key} className={`adesso-queue__row adesso-queue__row--${it.kind}`}>
              <span className={`adesso-queue__ora${it.inRitardo ? ' is-late' : ''}`}>
                {it.ora ?? '—'}
              </span>
              <div className="adesso-queue__main">
                <span className="adesso-queue__who">
                  {it.luogo ? `${it.luogo} · ${it.nome}` : it.nome}
                </span>
                <span className="adesso-queue__what">
                  {it.dettaglio} ·{' '}
                  <span className={`adesso-queue__time${it.inRitardo ? ' is-late' : ''}`}>
                    {it.tempo.charAt(0).toLowerCase() + it.tempo.slice(1)}
                  </span>
                </span>
              </div>
              {onSelectPaziente ? (
                <button
                  type="button"
                  className={`ds-btn ${it.inRitardo ? 'ds-btn--primary' : 'ds-btn--secondary'}`}
                  onClick={() => onSelectPaziente(it.nome, it.patientId)}
                  aria-label={`Apri ${it.nome}: ${it.dettaglio}, ${it.tempo}`}
                >
                  Apri
                </button>
              ) : null}
            </li>
          ))}
        </ol>
      ) : allReady ? (
        <p className="adesso-queue__empty" role="status">
          Niente in sospeso adesso.
        </p>
      ) : null}

      {rest > 0 && (
        <p className="adesso-queue__more">
          Altre {rest} in coda
          <button type="button" className="ds-link" onClick={onOpenTherapy}>
            Terapia <IcoArrow />
          </button>
          <button type="button" className="ds-link" onClick={onOpenConsegne}>
            Consegne <IcoArrow />
          </button>
        </p>
      )}
      <p className="adesso-queue__foot">
        Aggiornamento automatico ogni minuto · Orari della struttura (Roma)
        {onRefresh && (
          <button type="button" className="ds-link" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? 'Aggiornamento…' : 'Aggiorna'}
          </button>
        )}
      </p>
    </section>
  );
}
