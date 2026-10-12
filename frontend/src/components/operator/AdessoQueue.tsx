import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { IcoArrow } from '../../icons';
import {
  groupAdessoQueue,
  type AdessoGroup,
  type AdessoItem,
  type AdessoSection,
  type TurnoDoseChoice,
} from '../../lib/adessoQueue';
import type { PatientLanding } from '../../lib/patientTargetResolver';
import './AdessoQueue.css';
import { useWidgetOpen } from '../shared/WidgetGroup';
import { WidgetToggle } from '../shared/WidgetToggle';
import { TurnoDosePanel } from './TurnoDosePanel';

export const ADESSO_QUEUE_LIMIT = 6;

type SourceState = 'ready' | 'loading' | 'error';

/** Allergie del paziente nel blocco dosi (#445): sempre visibili accanto a «Somministra». */
export interface TurnoAllergy {
  state: SourceState;
  allergeni: string[];
}

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
  /** Allergie per paziente; assenti = blocco senza riga allergie (ruoli che non la leggono). */
  allergie?: Record<string, TurnoAllergy>;
  /** Il ruolo registra somministrazioni: «Somministra N» sul posto (#445). */
  canAdminister?: boolean;
  /** Dopo una registrazione dal Turno: rilettura delle scadenze. */
  onAdministered?: () => void;
  /** Revisione richiesta e revisione dell'ultima lettura riuscita delle scadenze (#445 QA). */
  revisione?: number;
  revisioneLetta?: number;
}

const isDoseGroup = (group: AdessoGroup) =>
  group.items.every(
    (it) => (it.kind === 'terapia-ritardo' || it.kind === 'terapia-imminente') && it.dose,
  );

function allergyLine(info: TurnoAllergy | undefined) {
  if (!info) return null;
  if (info.state === 'loading')
    return <span className="adesso-dose__allergy is-muted">Allergie in verifica…</span>;
  if (info.state === 'error')
    return <span className="adesso-dose__allergy is-warn">Allergie non disponibili</span>;
  return info.allergeni.length ? (
    <span className="adesso-dose__allergy is-crit">Allergie: {info.allergeni.join(', ')}</span>
  ) : (
    <span className="adesso-dose__allergy is-muted">Nessuna allergia registrata</span>
  );
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
  allergie,
  canAdminister = false,
  onAdministered,
  revisione = 0,
  revisioneLetta = -1,
}: Props) {
  const titleId = useId();
  const { open, setOpen, bodyId } = useWidgetOpen();
  const [showAll, setShowAll] = useState(false);
  const [panel, setPanel] = useState<string | null>(null);
  // Dosi tentate dal Turno (riuscite o no): «in verifica» finché non arriva una lettura partita
  // dopo il tentativo. Solo il server dice se sono ancora da fare: un esito forse già scritto
  // (risposta persa) non torna mai spuntato come «Somministrata».
  const [hold, setHold] = useState<Record<string, number>>({});
  const [choices, setChoices] = useState<Record<string, TurnoDoseChoice>>({});
  // Revisione più recente al momento del tentativo (non quella della chiusura del render): un
  // refresh automatico partito durante le scritture non deve valere come lettura successiva.
  const latestRevision = useRef(revisione);
  useEffect(() => {
    latestRevision.current = revisione;
  }, [revisione]);
  const held = (it: AdessoItem) => hold[it.key] !== undefined && revisioneLetta < hold[it.key];
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

  /** Un blocco per paziente e orario (#445): farmaci, allergie e un solo «Somministra N»; l'orario
   *  fa da intestazione per tutti i pazienti di quella fascia. */
  function renderDoseGroup(group: AdessoGroup, withTime: boolean) {
    const first = group.items[0];
    const ready = group.items.filter((it) => !held(it));
    const bulk = ready.filter((it) => it.dose?.doseMode !== 'glucose_scale');
    const open = panel === group.key;
    const openTherapy = () => onSelectPaziente?.(first.nome, first.patientId, first.landing);
    return (
      <li key={group.key} className="adesso-dose">
        {withTime && (
          <p className={`adesso-dose__time${first.inRitardo ? ' is-late' : ''}`}>
            <strong>{first.ora ?? '—'}</strong> {first.tempo.toLowerCase()}
          </p>
        )}
        <div className={`adesso-dose__block${first.inRitardo ? ' is-late' : ''}`}>
          <div className="adesso-dose__main">
            <p className="adesso-dose__who">
              <strong>{first.nome}</strong>
              {first.luogo && <span className="adesso-dose__where"> · {first.luogo}</span>}
            </p>
            {allergyLine(allergie?.[first.patientId])}
            <ul className="adesso-dose__drugs">
              {group.items.map((it) => (
                <li key={it.key}>
                  {it.dettaglio}
                  {held(it) && <span className="adesso-dose__held"> · in verifica</span>}
                </li>
              ))}
            </ul>
          </div>
          <div className="adesso-dose__actions">
            {canAdminister && bulk.length > 0 && !open && (
              <button
                type="button"
                className={`ds-btn ${first.inRitardo ? 'ds-btn--primary' : 'ds-btn--secondary'}`}
                aria-label={
                  bulk.length > 1
                    ? `Somministra ${bulk.length} dosi a ${first.nome}`
                    : `Somministra a ${first.nome}`
                }
                onClick={() => setPanel(group.key)}
              >
                {bulk.length > 1 ? `Somministra ${bulk.length}` : 'Somministra'}
              </button>
            )}
            {onSelectPaziente && (
              <button
                type="button"
                className="ds-link"
                aria-label={`Apri la terapia di ${first.nome}`}
                onClick={openTherapy}
              >
                Apri terapia
              </button>
            )}
          </div>
          {open && (
            <TurnoDosePanel
              nome={first.nome}
              doses={ready.map((it) => ({
                key: it.key,
                patientId: it.patientId,
                dose: it.dose!,
              }))}
              onClose={() => setPanel(null)}
              onOpenTherapy={openTherapy}
              choices={choices}
              onChoice={(key, choice) => setChoices((old) => ({ ...old, [key]: choice }))}
              onAttempted={(keys) => {
                // la rilettura chiesta ora avrà revisione + 1: fino ad allora restano in verifica
                setHold((old) => ({
                  ...old,
                  ...Object.fromEntries(keys.map((key) => [key, latestRevision.current + 1])),
                }));
                onAdministered?.();
              }}
              onDone={() => setPanel(null)}
            />
          )}
        </div>
      </li>
    );
  }

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
                    {visible.map((group, index) => {
                      const first = group.items[0];
                      if (isDoseGroup(group)) {
                        const prev = visible[index - 1]?.items[0];
                        const slot = (it?: AdessoItem) => it && `${it.dose?.date}|${it.ora}`;
                        return renderDoseGroup(group, slot(prev) !== slot(first));
                      }
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
