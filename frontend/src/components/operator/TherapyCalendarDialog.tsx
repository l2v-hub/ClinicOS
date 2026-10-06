import { useId, useState } from 'react';
import type { GiroTime } from '../../lib/therapyGiro';
import { doseStatus } from '../../lib/therapyDoseStatus';
import { patientIdentityName } from '../../lib/patientIdentity';
import { AccessibleDialogSurface } from '../shared/AccessibleDialogSurface';
import { IcoChevronRight } from '../../icons';
import './TherapyCalendarDialog.css';

export function TherapyCalendarDialog({
  date,
  time,
  patientId,
  onClose,
  onOpenPatient,
  partial,
  onLoadMore,
  loadingMore,
  error,
}: {
  date: string;
  time: GiroTime | undefined;
  onClose: () => void;
  patientId?: string;
  onOpenPatient: (patientId: string, date: string, time: string) => void;
  partial: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
  error: string | null;
}) {
  const titleId = useId();
  const [search, setSearch] = useState('');
  const patients =
    time?.patients.filter((group) =>
      patientId
        ? group.patient.patientId === patientId
        : patientIdentityName({ ...group.patient, id: group.patient.patientId })
            .toLocaleLowerCase('it')
            .includes(search.trim().toLocaleLowerCase('it')),
    ) ?? [];
  const displayDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T12:00:00`).toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : date;
  const doses = patients.reduce((total, group) => total + group.items.length, 0);
  return (
    <AccessibleDialogSurface
      labelledBy={titleId}
      onClose={onClose}
      className="therapy-calendar-dialog therapy-calendar-dialog--ward"
      returnFocus={() => {
        const buttons = Array.from(
          document.querySelectorAll<HTMLElement>('[data-testid="therapy-calendar-count"]'),
        ).filter((button) => button.dataset.date === date && button.dataset.time === time?.ora);
        return buttons[0] ?? null;
      }}
    >
      <header className="therapy-calendar-dialog__head">
        <div>
          <h3 id={titleId}>Terapie delle {time?.ora ?? '—'}</h3>
          <p className="therapy-calendar-dialog__date">{displayDate}</p>
        </div>
        <button
          type="button"
          className="btn-secondary btn-sm"
          data-dialog-initial-focus
          onClick={onClose}
        >
          Chiudi
        </button>
      </header>
      <div className="therapy-calendar-dialog__controls">
        {partial && (
          <p role="status">
            Elenco parziale: i conteggi per ora riguardano le dosi caricate.
            <button className="btn-secondary btn-sm" disabled={loadingMore} onClick={onLoadMore}>
              {loadingMore ? 'Caricamento…' : 'Carica altri dettagli'}
            </button>
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        {!patientId && (time?.patients.length ?? 0) > 3 && (
          <label className="therapy-calendar-dialog__search">
            Cerca paziente
            <input
              className="form-input"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome o cognome"
            />
          </label>
        )}
        <p className="therapy-calendar-dialog__count" role="status">
          {patients.length} {patients.length === 1 ? 'paziente' : 'pazienti'} · {doses}{' '}
          {doses === 1 ? 'dose' : 'dosi'}
          {partial ? ' caricate' : ''}
        </p>
      </div>
      <div
        className="therapy-calendar-dialog__body"
        tabIndex={0}
        role="region"
        aria-label="Farmaci per paziente"
      >
        {!patients.length && (
          <p>
            {partial
              ? 'Paziente non presente nei dettagli caricati: carica gli altri dettagli.'
              : search
                ? 'Nessun paziente trovato.'
                : 'Nessuna dose caricata per questo orario.'}
          </p>
        )}
        {time &&
          patients.map((group) => (
            <section className="therapy-calendar-dialog__patient" key={group.patient.patientId}>
              <header className="therapy-calendar-dialog__patient-head">
                <strong>
                  {patientIdentityName({ ...group.patient, id: group.patient.patientId })}
                </strong>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  aria-label={`Apri terapia di ${patientIdentityName({ ...group.patient, id: group.patient.patientId })}, ore ${time.ora}`}
                  title="Apri terapia del paziente"
                  onClick={() => onOpenPatient(group.patient.patientId, date, time.ora)}
                >
                  <span>Apri terapia</span>
                  <IcoChevronRight />
                </button>
              </header>
              {group.items.map(({ a, fascia }) => {
                const status = doseStatus({ ...a, scheduledTime: time.ora }, date);
                return (
                  <article
                    className={`therapy-calendar-dialog__dose is-${status.tone}`}
                    key={`${a.therapyId}|${fascia}`}
                  >
                    <dl>
                      <div className="therapy-calendar-dialog__drug">
                        <dt>{a.drugName}</dt>
                        <dd>{a.quantityLabel || a.dosage || 'Dose non disponibile'}</dd>
                      </div>
                      <div>
                        <dt>Via</dt>
                        <dd>{a.route || 'Non disponibile'}</dd>
                      </div>
                      <div>
                        <dt>Stato</dt>
                        <dd>
                          <span className={`therapy-calendar-dialog__status is-${status.tone}`}>
                            {status.text}
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </section>
          ))}
      </div>
    </AccessibleDialogSurface>
  );
}
