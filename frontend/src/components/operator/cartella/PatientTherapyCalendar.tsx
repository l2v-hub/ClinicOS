import { useEffect, useMemo, useRef, useState } from 'react';
import type { PatientTherapyAPI } from '../../../types';
import { IcoChevronLeft, IcoChevronRight, IcoPill } from '../../../icons';
import { localIsoDate } from '../../../lib/appointmentRange';
import {
  buildPatientTherapyDay,
  isCalendarDate,
  shiftCalendarDate,
} from '../../../lib/patientTherapyCalendar';
import { readPatientCalendarTherapies } from '../../../lib/patientTherapyCalendarRead';
import { LoadErrorState } from './LoadErrorState';
import './PatientTherapyCalendar.css';

type ReadState = {
  patientId: string;
  revision: number;
  status: 'loading' | 'ready' | 'error';
  therapies: PatientTherapyAPI[];
};
const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));

export function PatientTherapyCalendar({ patientId }: { patientId: string }) {
  const [date, setDate] = useState(() => localIsoDate());
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<ReadState>({
    patientId,
    revision,
    status: 'loading',
    therapies: [],
  });
  const timeline = useRef<HTMLDivElement>(null);
  const current = state.patientId === patientId && state.revision === revision;
  const status = current ? state.status : 'loading';

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState({ patientId, revision, status: 'loading', therapies: [] });
    void readPatientCalendarTherapies(patientId, controller.signal).then(
      (therapies) => {
        if (active) setState({ patientId, revision, status: 'ready', therapies });
      },
      () => {
        if (active) setState({ patientId, revision, status: 'error', therapies: [] });
      },
    );
    return () => {
      active = false;
      controller.abort();
    };
  }, [patientId, revision]);

  const day = useMemo(
    () =>
      status === 'ready'
        ? buildPatientTherapyDay(state.therapies, patientId, date)
        : { events: [], unscheduled: [] },
    [state.therapies, status, patientId, date],
  );

  useEffect(() => {
    if (!timeline.current || !day.events.length) return;
    const firstHour = Math.max(0, Number(day.events[0].time.slice(0, 2)) - 1);
    const row = timeline.current.querySelector<HTMLElement>(`[data-hour="${HOURS[firstHour]}"]`);
    if (row) timeline.current.scrollTop = row.offsetTop;
  }, [day]);

  const formattedDate = new Date(`${date}T12:00:00`).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const asNeeded = day.unscheduled.filter((item) => item.kind === 'as_needed');
  const incomplete = day.unscheduled.filter((item) => item.kind === 'incomplete');
  const timeCount = new Set(day.events.map((event) => event.time)).size;

  return (
    <section className="patient-therapy-calendar" aria-label="Calendario terapie del paziente">
      <div className="patient-therapy-calendar__toolbar">
        <div className="agt-nav" role="group" aria-label="Navigazione calendario terapie">
          <button
            type="button"
            className="agt-nav-btn"
            aria-label="Giorno precedente"
            disabled={shiftCalendarDate(date, -1) === date}
            onClick={() => setDate(shiftCalendarDate(date, -1))}
          >
            <span aria-hidden="true">
              <IcoChevronLeft />
            </span>
          </button>
          <button type="button" className="agt-today-btn" onClick={() => setDate(localIsoDate())}>
            Oggi
          </button>
          <button
            type="button"
            className="agt-nav-btn"
            aria-label="Giorno successivo"
            disabled={shiftCalendarDate(date, 1) === date}
            onClick={() => setDate(shiftCalendarDate(date, 1))}
          >
            <span aria-hidden="true">
              <IcoChevronRight />
            </span>
          </button>
        </div>
        <label className="patient-therapy-calendar__date">
          <span>Data</span>
          <input
            className="form-input"
            type="date"
            min="1900-01-01"
            max="9999-12-31"
            value={date}
            onChange={(event) => {
              if (isCalendarDate(event.target.value)) setDate(event.target.value);
            }}
          />
        </label>
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={status === 'loading'}
          onClick={() => setRevision((value) => value + 1)}
        >
          Aggiorna
        </button>
      </div>

      <header className="patient-therapy-calendar__heading">
        <h3>{formattedDate}</h3>
        <p>Programmazione delle terapie attive · giornata completa, 00:00–23:59.</p>
        <p>Per le registrazioni consulta Somministrazioni giornaliere.</p>
      </header>

      {status === 'loading' && (
        <p className="patient-therapy-calendar__message" role="status">
          Caricamento calendario…
        </p>
      )}
      {status === 'error' && (
        <LoadErrorState
          message="Impossibile caricare il calendario completo. Riprova per visualizzare tutti gli orari."
          onRetry={() => setRevision((value) => value + 1)}
        />
      )}
      {status === 'ready' && (
        <>
          <p className="patient-therapy-calendar__count" role="status">
            {day.events.length > 0
              ? `${day.events.length} ${day.events.length === 1 ? 'dose programmata' : 'dosi programmate'} · ${timeCount} ${timeCount === 1 ? 'orario' : 'orari'}`
              : 'Nessuna dose con orario programmato per questa data.'}
          </p>
          {day.events.length > 0 && (
            <div
              ref={timeline}
              className="agt-day-wrap patient-therapy-calendar__timeline"
              role="region"
              aria-label="Orari delle terapie nelle 24 ore"
              tabIndex={0}
            >
              {HOURS.map((hour) => (
                <div key={hour} className="agt-slot agt-slot--hour" data-hour={hour}>
                  <span className="agt-slot__time">{hour}:00</span>
                  <ol
                    className="patient-therapy-calendar__events"
                    aria-label={`Terapie dalle ${hour}:00`}
                  >
                    {day.events
                      .filter((event) => event.time.startsWith(`${hour}:`))
                      .map((event) => (
                        <li
                          className="agt-therapy-slot patient-therapy-calendar__event"
                          key={event.id}
                        >
                          <span className="agt-therapy-slot__icon" aria-hidden="true">
                            <IcoPill />
                          </span>
                          <div className="patient-therapy-calendar__medication">
                            <div className="patient-therapy-calendar__event-title">
                              <time dateTime={`${date}T${event.time}`}>{event.time}</time>
                              <strong className="agt-therapy-slot__label">{event.drugName}</strong>
                            </div>
                            <p>
                              {event.dose} · {event.route}
                              {event.oneTime ? ' · Una tantum' : ''}
                            </p>
                          </div>
                        </li>
                      ))}
                  </ol>
                </div>
              ))}
            </div>
          )}
          {[
            { title: 'Al bisogno', items: asNeeded },
            { title: 'Programmazione da completare', items: incomplete },
          ].map(
            ({ title, items }) =>
              items.length > 0 && (
                <section
                  className="patient-therapy-calendar__unscheduled"
                  key={title}
                  aria-label={title}
                >
                  <h4>
                    {title} <span>({items.length})</span>
                  </h4>
                  <ul>
                    {items.map((item) => (
                      <li key={item.id}>
                        <strong>{item.drugName}</strong>
                        <span>
                          {item.dose} · {item.route}
                        </span>
                        <p>{item.reason}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ),
          )}
        </>
      )}
    </section>
  );
}
