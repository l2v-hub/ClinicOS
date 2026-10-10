import { useId, useState, type ReactNode } from 'react';
import { IcoArrow } from '../../icons';
import { groupAdessoQueue, type AdessoItem, type AdessoSection } from '../../lib/adessoQueue';
import type { PatientLanding } from '../../lib/patientTargetResolver';
import './AdessoQueue.css';
import { useWidgetOpen } from '../shared/WidgetGroup';
import { WidgetToggle } from '../shared/WidgetToggle';

export const ADESSO_QUEUE_LIMIT = 6;

type SourceState = 'ready' | 'loading' | 'error';

interface Props {
  items: AdessoItem[];
  terapie: SourceState;
  consegne: SourceState;
  anomalie: SourceState;
  onSelectPaziente?: (nome: string, patientId?: string, landing?: PatientLanding) => void;
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
  const { open, setOpen, bodyId } = useWidgetOpen();
  const [showAll, setShowAll] = useState(false);
  const groups = groupAdessoQueue(items);
  // Each category has its own allowance: repeated delays cannot hide new handovers.
  const sections: { key: AdessoSection; title: string }[] = [
    { key: 'scadute', title: 'Scadute' },
    { key: 'prossime', title: 'In scadenza' },
    { key: 'urgenti', title: 'Consegne urgenti' },
    { key: 'verifiche', title: 'Da verificare' },
  ];
  const rest = sections.reduce(
    (count, section) =>
      count +
      Math.max(
        0,
        groups.filter((group) => group.section === section.key).length - ADESSO_QUEUE_LIMIT,
      ),
    0,
  );
  const urgenti = items.filter((it) => it.inRitardo).length;
  const consegneUrgenti = items.filter((it) => it.kind.startsWith('consegna-')).length;
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
              {urgenti} in ritardo
            </span>
          )}
          {consegneUrgenti > 0 && (
            <span className="turno-badge turno-badge--crit">
              {consegneUrgenti} {consegneUrgenti === 1 ? 'consegna urgente' : 'consegne urgenti'}
            </span>
          )}
        </div>
        {headerAction}
        <WidgetToggle title="Adesso" open={open} bodyId={bodyId} onToggle={() => setOpen(!open)} />
      </div>
      <div id={bodyId} hidden={!open}>
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

        {items.length > 0 ? (
          <>
            <p className="adesso-queue__notice">
              Ordine operativo: scadute, in scadenza, consegne urgenti, verifiche. Il ritardo indica
              una scadenza superata, non una priorità clinica.
            </p>
            {sections.map((section) => {
              const allGroups = groups.filter((group) => group.section === section.key);
              if (!allGroups.length) return null;
              const visible = showAll ? allGroups : allGroups.slice(0, ADESSO_QUEUE_LIMIT);
              const count = allGroups.reduce((total, group) => total + group.items.length, 0);
              return (
                <section key={section.key} aria-labelledby={`${titleId}-${section.key}`}>
                  <h3 className="adesso-queue__section-title" id={`${titleId}-${section.key}`}>
                    {section.title} · {count} attività
                  </h3>
                  <ol className="adesso-queue__list">
                    {visible.map((group) => {
                      const first = group.items[0];
                      const rows = group.items.map((it) => (
                        <li
                          key={it.key}
                          className={`adesso-queue__row adesso-queue__row--${it.kind}`}
                        >
                          <span className={`adesso-queue__ora${it.inRitardo ? ' is-late' : ''}`}>
                            {it.ora ?? '—'}
                          </span>
                          <div className="adesso-queue__main">
                            {group.items.length === 1 && (
                              <strong className="adesso-queue__who">{it.nome}</strong>
                            )}
                            {it.luogo && <span className="adesso-queue__location">{it.luogo}</span>}
                            <span className="adesso-queue__what">{it.dettaglio}</span>
                            <span className={`adesso-queue__time${it.inRitardo ? ' is-late' : ''}`}>
                              {it.tempo}
                            </span>
                          </div>
                          {onSelectPaziente && (
                            <button
                              type="button"
                              className={`ds-btn ${it.inRitardo ? 'ds-btn--primary' : 'ds-btn--secondary'}`}
                              data-adesso-kind={it.kind}
                              onClick={() => onSelectPaziente(it.nome, it.patientId, it.landing)}
                              aria-label={`Apri ${it.nome}: ${it.dettaglio}, ${it.tempo}`}
                            >
                              {it.kind.startsWith('consegna-')
                                ? 'Leggi'
                                : it.kind.startsWith('terapia-')
                                  ? 'Apri terapia'
                                  : 'Verifica'}
                            </button>
                          )}
                        </li>
                      ));
                      return group.items.length > 1 ? (
                        <li key={group.key} className="adesso-queue__group">
                          <details>
                            <summary>
                              <strong>{first.nome}</strong> ·{' '}
                              {first.landing.therapy?.fascia || first.ora}
                              {' · '}
                              {first.landing.therapy?.date} · {group.items.length} dosi
                              <span className="adesso-queue__time">{first.tempo}</span>
                            </summary>
                            <ol className="adesso-queue__list">{rows}</ol>
                          </details>
                        </li>
                      ) : (
                        rows[0]
                      );
                    })}
                  </ol>
                </section>
              );
            })}
          </>
        ) : allReady ? (
          <p className="adesso-queue__empty" role="status">
            Niente in sospeso adesso.
          </p>
        ) : null}

        {rest > 0 && (
          <div className="adesso-queue__more">
            <button
              type="button"
              className="ds-btn ds-btn--secondary"
              aria-expanded={showAll}
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Mostra meno gruppi' : `Mostra altri ${rest} gruppi`}
            </button>
            <button type="button" className="ds-link" onClick={onOpenTherapy}>
              Terapia <IcoArrow />
            </button>
            <button type="button" className="ds-link" onClick={onOpenConsegne}>
              Consegne <IcoArrow />
            </button>
          </div>
        )}
        <p className="adesso-queue__foot">
          Aggiornamento automatico ogni minuto · Orari della struttura (Roma)
          {onRefresh && (
            <button type="button" className="ds-link" onClick={onRefresh} disabled={refreshing}>
              {refreshing ? 'Aggiornamento…' : 'Aggiorna'}
            </button>
          )}
        </p>
      </div>
    </section>
  );
}
