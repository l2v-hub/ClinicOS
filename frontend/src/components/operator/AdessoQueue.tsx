import { useId } from 'react';
import { IcoAlert, IcoArrow } from '../../icons';
import { ADESSO_KIND_LABEL, type AdessoItem } from '../../lib/adessoQueue';
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
}

/** "Da fare subito": la vista di triage della colonna Adesso. Le card sotto restano il dettaglio.
 *  Una fonte in caricamento o in errore viene detta: la coda non si presenta mai come vuota se
 *  manca un pezzo. */
export function AdessoQueue({
  items,
  terapie,
  consegne,
  anomalie,
  onSelectPaziente,
  onOpenTherapy,
  onOpenConsegne,
}: Props) {
  const titleId = useId();
  const visible = items.slice(0, ADESSO_QUEUE_LIMIT);
  const rest = items.length - visible.length;
  const allReady = terapie === 'ready' && consegne === 'ready' && anomalie === 'ready';

  return (
    <section className="adesso-queue" aria-labelledby={titleId}>
      <div className="section-header adesso-queue__header">
        <h3 className="section-header__title" id={titleId}>
          <span className="section-header__ico">
            <IcoAlert />
          </span>
          Da fare subito
          {items.length > 0 && (
            <span className="adesso-queue__count" aria-label={`${items.length} elementi`}>
              {items.length}
            </span>
          )}
        </h3>
      </div>

      {terapie === 'loading' && (
        <p className="adesso-queue__notice" role="status">
          Scadenze terapia in verifica: la coda le aggiunge appena pronte.
        </p>
      )}
      {terapie === 'error' && (
        <p className="adesso-queue__notice adesso-queue__notice--error" role="alert">
          Scadenze terapia non disponibili: la coda non le include.
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
              <span className="adesso-queue__kind">{ADESSO_KIND_LABEL[it.kind]}</span>
              <div className="adesso-queue__main">
                {onSelectPaziente ? (
                  <button
                    type="button"
                    className="link-btn adesso-queue__patient"
                    onClick={() => onSelectPaziente(it.nome, it.patientId)}
                  >
                    {it.nome}
                  </button>
                ) : (
                  <span className="adesso-queue__patient">{it.nome}</span>
                )}
                <span className="adesso-queue__detail" title={it.dettaglio}>
                  {it.dettaglio}
                </span>
              </div>
              <span className={`adesso-queue__time${it.inRitardo ? ' is-late' : ''}`}>
                {it.tempo}
              </span>
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
          Altre {rest} in coda ·{' '}
          <button type="button" className="link-btn" onClick={onOpenTherapy}>
            Apri terapia <IcoArrow />
          </button>{' '}
          <button type="button" className="link-btn" onClick={onOpenConsegne}>
            Vedi consegne <IcoArrow />
          </button>
        </p>
      )}
    </section>
  );
}
