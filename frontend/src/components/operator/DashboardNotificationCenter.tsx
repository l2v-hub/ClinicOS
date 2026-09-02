import { useId, useState, type ReactNode } from 'react';
import { IcoAlert, IcoArrow, IcoX } from '../../icons';
import { AccessibleDialogSurface } from '../shared/AccessibleDialogSurface';
import {
  preferredDashboardNotificationTone,
  type DashboardNotificationCounts,
  type DashboardNotificationTone,
} from './dashboardNotificationModel';
import './DashboardNotificationCenter.css';

export interface DashboardNotificationSection {
  id: string;
  tone: DashboardNotificationTone;
  count: number;
  title: string;
  summary: string;
  content: ReactNode;
}

interface Props {
  counts: DashboardNotificationCounts;
  sections: DashboardNotificationSection[];
  loading?: boolean;
}

const CATEGORIES: Array<{ tone: DashboardNotificationTone; label: string }> = [
  { tone: 'alarm', label: 'Allarmi' },
  { tone: 'warning', label: 'Warning' },
  { tone: 'notice', label: 'Avvisi' },
];

function countFor(counts: DashboardNotificationCounts, tone: DashboardNotificationTone): number {
  return counts[tone];
}

export function DashboardNotificationCenter({ counts, sections, loading = false }: Props) {
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const descriptionId = `${dialogId}-description`;
  const [open, setOpen] = useState(false);
  const [activeTone, setActiveTone] = useState<DashboardNotificationTone>(() =>
    preferredDashboardNotificationTone(counts),
  );
  const leadingTone = preferredDashboardNotificationTone(counts);
  const hasAlarms = !loading && counts.alarm > 0;
  const alarmLabel = `${counts.alarm} ${counts.alarm === 1 ? 'allarme' : 'allarmi'} da gestire`;
  const activeSections = sections.filter(
    (section) => section.tone === activeTone && section.count > 0,
  );

  function openCategory(tone: DashboardNotificationTone) {
    setActiveTone(tone);
    setOpen(true);
  }

  return (
    <>
      <section
        className={`dashboard-notification-bar dashboard-notification-bar--${
          loading ? 'loading' : counts.total > 0 ? leadingTone : 'clear'
        }`}
        aria-label="Centro notifiche dashboard"
        aria-busy={loading}
      >
        <div
          className="dashboard-notification-bar__intro"
          aria-live={hasAlarms ? 'assertive' : 'polite'}
          aria-atomic="true"
        >
          <span className="dashboard-notification-bar__icon" aria-hidden="true">
            <IcoAlert />
          </span>
          {hasAlarms && (
            <span className="dashboard-notification-bar__total" aria-hidden="true">
              {counts.alarm}
            </span>
          )}
          <span className="dashboard-notification-bar__copy">
            <strong>{hasAlarms ? alarmLabel : 'Segnalazioni operative'}</strong>
            <span>
              {loading
                ? 'Aggiornamento in corso…'
                : hasAlarms
                  ? 'Priorità alta · richiede verifica immediata'
                  : counts.total > 0
                    ? 'Controlla le categorie per priorità'
                    : 'Nessuna segnalazione aperta'}
            </span>
          </span>
        </div>

        <div className="dashboard-notification-bar__categories" role="group" aria-label="Categorie">
          {CATEGORIES.map(({ tone, label }) => {
            const count = countFor(counts, tone);
            return (
              <button
                type="button"
                key={tone}
                className={`dashboard-notification-chip dashboard-notification-chip--${tone}`}
                onClick={() => openCategory(tone)}
                aria-haspopup="dialog"
                aria-label={`${label}, ${loading ? 'conteggio in aggiornamento' : `${count} elementi attivi`}. Apri dettaglio`}
              >
                <span>{label}</span>
                <strong>{loading ? '—' : count}</strong>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="dashboard-notification-bar__open"
          onClick={() => openCategory(leadingTone)}
          aria-haspopup="dialog"
        >
          Dettagli <IcoArrow />
        </button>
      </section>

      {open && (
        <AccessibleDialogSurface
          labelledBy={titleId}
          describedBy={descriptionId}
          onClose={() => setOpen(false)}
          className="dashboard-notifications-modal"
        >
          <div className="modal-header dashboard-notifications-modal__header">
            <div>
              <h2 className="modal-title" id={titleId}>
                Segnalazioni operative
              </h2>
              <p className="modal-subtitle" id={descriptionId}>
                Situazioni attive nel reparto, classificate per priorità.
              </p>
            </div>
            <button
              type="button"
              className="icon-btn"
              data-dialog-initial-focus
              aria-label="Chiudi centro notifiche"
              onClick={() => setOpen(false)}
            >
              <IcoX />
            </button>
          </div>

          <div className="modal-body dashboard-notifications-modal__body">
            <div
              className="dashboard-notification-tabs"
              role="group"
              aria-label="Filtra notifiche per categoria"
            >
              {CATEGORIES.map(({ tone, label }) => (
                <button
                  type="button"
                  key={tone}
                  className={`dashboard-notification-tab dashboard-notification-tab--${tone}`}
                  aria-pressed={activeTone === tone}
                  onClick={() => setActiveTone(tone)}
                >
                  <span>{label}</span>
                  <strong>{loading ? '—' : countFor(counts, tone)}</strong>
                </button>
              ))}
            </div>

            {activeSections.length > 0 ? (
              <div className="dashboard-notification-sections">
                {activeSections.map((section) => (
                  <section
                    className={`dashboard-notification-section dashboard-notification-section--${section.tone}`}
                    key={section.id}
                  >
                    <header className="dashboard-notification-section__header">
                      <div>
                        <h3>{section.title}</h3>
                        <p>{section.summary}</p>
                      </div>
                      <span aria-label={`${section.count} elementi`}>{section.count}</span>
                    </header>
                    <div className="dashboard-notification-section__content">{section.content}</div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="dashboard-notification-empty" role="status">
                <span aria-hidden="true">✓</span>
                <strong>Nessun elemento in questa categoria</strong>
                <p>Il riepilogo si aggiorna automaticamente con i dati del reparto.</p>
              </div>
            )}
          </div>

          <div className="modal-footer dashboard-notifications-modal__footer">
            <span>
              {loading ? 'Aggiornamento dati…' : 'Conteggi distinti per categoria e priorità'}
            </span>
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Chiudi
            </button>
          </div>
        </AccessibleDialogSurface>
      )}
    </>
  );
}
