// Calendario terapie del paziente (UX 2026-10-03, «informazione senza clic»): ogni dose mostra già
// ora, farmaco, dose ed equivalente, via, stato in parole + colore (da somministrare / in ritardo
// N min / somministrata hh:mm da X / non somministrata + motivo), prescrittore, nota, una tantum o
// data di fine. Il tocco resta per le AZIONI (pannello dell'ora con Somministra / Non somm.).
// Vista giorno (24 ore) e vista settimana (7 giorni; a 820 px un blocco per giorno).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PatientTherapyAPI, TherapySlot } from '../../../types';
import { IcoPill } from '../../../icons';
import { DateNav } from '../../shared/DateNav';
import { API_URL } from '../../../config';
import { cachedGetJson } from '../../../lib/cachedFetch';
import { localIsoDate } from '../../../lib/appointmentRange';
import {
  buildPatientTherapyDay,
  calendarDoseStates,
  formatEndDate,
  isCalendarDate,
  shiftCalendarDate,
  type CalendarOccurrence,
} from '../../../lib/patientTherapyCalendar';
import { readPatientCalendarTherapies } from '../../../lib/patientTherapyCalendarRead';
import { doseStatus, type DoseStatus } from '../../../lib/therapyDoseStatus';
import { weekDays } from '../../../lib/therapyWeek';
import { LoadErrorState } from './LoadErrorState';
import { PatientTherapySlotDetail } from './PatientTherapySlotDetail';
import { TherapyDrugDosePanel } from './TherapyDrugDosePanel';
import './PatientTherapyCalendar.css';

type ReadState = {
  patientId: string;
  revision: number;
  status: 'loading' | 'ready' | 'error';
  therapies: PatientTherapyAPI[];
};
type DaySlots = { status: 'ready'; slots: TherapySlot[] } | { status: 'error' };
type SlotsState = Record<string, DaySlots>;
const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));

interface Props {
  patientId: string;
  /** Giorno di arrivo (accesso diretto). */
  initialDate?: string;
  /** Ora da aprire all'arrivo (pannello dell'ora con le azioni). */
  initialOpenTime?: string;
}

/** Stato di una dose dal giro del giorno; null se il giro non è (ancora) disponibile. */
function eventStatus(
  event: CalendarOccurrence,
  date: string,
  slots: DaySlots | undefined,
  patientId: string,
): DoseStatus | null {
  if (!slots || slots.status !== 'ready') return null;
  const state = calendarDoseStates(slots.slots, patientId).get(event.therapyId, event.time);
  if (!state) return null;
  return doseStatus({ ...state.administration, scheduledTime: event.time }, date);
}

function StatusChip({ status, pending }: { status: DoseStatus | null; pending: boolean }) {
  if (!status)
    return (
      <span className="ptc-status ptc-status--unknown">
        {pending ? 'Stato in caricamento' : 'Stato non disponibile'}
      </span>
    );
  return <span className={`ptc-status ptc-status--${status.tone}`}>{status.text}</span>;
}

function doseText(event: CalendarOccurrence): string {
  return event.strength ? `${event.dose} — ${event.strength}` : event.dose;
}

export function PatientTherapyCalendar({ patientId, initialDate, initialOpenTime }: Props) {
  const startDate = initialDate && isCalendarDate(initialDate) ? initialDate : localIsoDate();
  const [date, setDate] = useState(startDate);
  const [view, setView] = useState<'giorno' | 'settimana'>('giorno');
  const [revision, setRevision] = useState(0);
  // Orario aperto nel dettaglio: legato alla data in cui è stato aperto (cambiare giorno lo chiude).
  const [open, setOpen] = useState<{ date: string; time: string } | null>(() =>
    initialOpenTime ? { date: startDate, time: initialOpenTime } : null,
  );
  const openTime = open?.date === date ? open.time : null;
  const [prnOpen, setPrnOpen] = useState<string | null>(null);
  const [state, setState] = useState<ReadState>({
    patientId,
    revision,
    status: 'loading',
    therapies: [],
  });
  const [slotsByDay, setSlotsByDay] = useState<{ key: string; days: SlotsState }>({
    key: '',
    days: {},
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

  // Stato delle dosi: il giro dei giorni visibili, letto una volta per giorno (non al tocco).
  const visibleDays = useMemo(() => (view === 'giorno' ? [date] : weekDays(date)), [view, date]);
  const slotsKey = `${patientId}|${revision}|${visibleDays.join(',')}`;
  useEffect(() => {
    let active = true;
    for (const day of visibleDays) {
      cachedGetJson<TherapySlot[]>(`${API_URL}/therapy-slots?date=${day}`).then(
        (slots) => {
          if (!active) return;
          setSlotsByDay((prev) => ({
            key: slotsKey,
            days: {
              ...(prev.key === slotsKey ? prev.days : {}),
              [day]: { status: 'ready', slots: Array.isArray(slots) ? slots : [] },
            },
          }));
        },
        () => {
          if (!active) return;
          setSlotsByDay((prev) => ({
            key: slotsKey,
            days: { ...(prev.key === slotsKey ? prev.days : {}), [day]: { status: 'error' } },
          }));
        },
      );
    }
    return () => {
      active = false;
    };
  }, [slotsKey, visibleDays]);
  const slots: SlotsState = slotsByDay.key === slotsKey ? slotsByDay.days : {};

  const day = useMemo(
    () =>
      status === 'ready'
        ? buildPatientTherapyDay(state.therapies, patientId, date)
        : { events: [], unscheduled: [] },
    [state.therapies, status, patientId, date],
  );
  const therapyById = useMemo(
    () => new Map(state.therapies.map((therapy) => [therapy.id, therapy])),
    [state.therapies],
  );

  useEffect(() => {
    if (view !== 'giorno' || !timeline.current || !day.events.length) return;
    const target = openTime ?? day.events[0].time;
    const firstHour = Math.max(0, Number(target.slice(0, 2)) - (openTime ? 0 : 1));
    const row = timeline.current.querySelector<HTMLElement>(`[data-hour="${HOURS[firstHour]}"]`);
    if (row) timeline.current.scrollTop = row.offsetTop;
  }, [day, view, openTime]);

  const formattedDate = new Date(`${date}T12:00:00`).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const asNeeded = day.unscheduled.filter((item) => item.kind === 'as_needed');
  const incomplete = day.unscheduled.filter((item) => item.kind === 'incomplete');
  const timeCount = new Set(day.events.map((event) => event.time)).size;
  const step = view === 'giorno' ? 1 : 7;
  const daySlots = slots[date];
  const today = localIsoDate();

  return (
    <section className="patient-therapy-calendar" aria-label="Calendario terapie del paziente">
      <div className="patient-therapy-calendar__toolbar">
        <DateNav
          isToday={view === 'giorno' ? date === today : weekDays(date).includes(today)}
          onPrev={() => setDate(shiftCalendarDate(date, -step))}
          onToday={() => setDate(today)}
          onNext={() => setDate(shiftCalendarDate(date, step))}
          prevDisabled={shiftCalendarDate(date, -step) === date}
          nextDisabled={shiftCalendarDate(date, step) === date}
          todayLabel="Oggi"
          groupLabel="Navigazione calendario terapie"
        />
        <div className="ptc-views" role="group" aria-label="Vista del calendario">
          {(['giorno', 'settimana'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className="ds-chip"
              aria-pressed={view === value}
              onClick={() => setView(value)}
            >
              {value === 'giorno' ? 'Giorno' : 'Settimana'}
            </button>
          ))}
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
        <h3 className={view === 'giorno' ? undefined : 'is-week'}>
          {view === 'giorno' ? formattedDate : weekHeading(date)}
        </h3>
        <p>
          {view === 'giorno'
            ? 'Ogni dose mostra farmaco, dose, via e stato. Tocca un orario per registrare la somministrazione.'
            : 'Settimana delle terapie attive: tocca una dose per aprire il suo giorno.'}
        </p>
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
      {status === 'ready' && view === 'settimana' && (
        <WeekView
          therapies={state.therapies}
          patientId={patientId}
          date={date}
          slots={slots}
          onOpen={(target, time) => {
            setDate(target);
            setView('giorno');
            setOpen({ date: target, time });
          }}
        />
      )}
      {status === 'ready' && view === 'giorno' && (
        <>
          <p className="patient-therapy-calendar__count" role="status">
            {day.events.length > 0
              ? `${day.events.length} ${day.events.length === 1 ? 'dose programmata' : 'dosi programmate'} · ${timeCount} ${timeCount === 1 ? 'orario' : 'orari'}`
              : 'Nessuna dose con orario programmato per questa data.'}
          </p>
          {daySlots?.status === 'error' && (
            <p className="patient-therapy-calendar__message" role="alert">
              Stato delle somministrazioni non disponibile: il calendario mostra solo la
              programmazione.
            </p>
          )}
          {day.events.length > 0 && (
            <div
              ref={timeline}
              className="agt-day-wrap patient-therapy-calendar__timeline"
              role="region"
              aria-label="Orari delle terapie nelle 24 ore"
              tabIndex={0}
            >
              {HOURS.map((hour) => {
                const hourEvents = day.events.filter((event) => event.time.startsWith(`${hour}:`));
                const statuses = hourEvents.map((event) =>
                  eventStatus(event, date, daySlots, patientId),
                );
                const late = statuses.filter((s) => s?.tone === 'late').length;
                return (
                  <div key={hour} className="agt-slot agt-slot--hour" data-hour={hour}>
                    <span className="agt-slot__time">{hour}:00</span>
                    {hourEvents.length > 1 && (
                      <p className="ptc-hour-summary">
                        {hour}:00 · {hourEvents.length} dosi
                        {late > 0 ? ` · ${late} in ritardo` : ''}
                      </p>
                    )}
                    <ol
                      className="patient-therapy-calendar__events"
                      aria-label={`Terapie dalle ${hour}:00`}
                    >
                      {hourEvents.map((event, index) => {
                        const st = statuses[index];
                        const end = formatEndDate(event.endDate);
                        const meta = [
                          event.prescriber ? `Prescr. ${event.prescriber}` : null,
                          event.oneTime ? 'Una tantum' : end,
                          event.note,
                        ].filter(Boolean);
                        return (
                          <li key={event.id}>
                            <button
                              type="button"
                              className={`agt-therapy-slot patient-therapy-calendar__event${st ? ` is-${st.tone}` : ''}`}
                              aria-expanded={openTime === event.time}
                              aria-label={`${event.time} ${event.drugName}, ${doseText(event)}, ${event.route}, ${st?.text ?? 'stato non disponibile'}: apri le azioni delle ${event.time}`}
                              data-testid="ptc-event"
                              onClick={() =>
                                setOpen(openTime === event.time ? null : { date, time: event.time })
                              }
                            >
                              <span className="agt-therapy-slot__icon" aria-hidden="true">
                                <IcoPill />
                              </span>
                              <span className="patient-therapy-calendar__medication">
                                <span className="patient-therapy-calendar__event-title">
                                  <time dateTime={`${date}T${event.time}`}>{event.time}</time>
                                  <strong className="agt-therapy-slot__label">
                                    {event.drugName}
                                  </strong>
                                  <span className="ptc-dose">{doseText(event)}</span>
                                </span>
                                <span className="patient-therapy-calendar__event-dose">
                                  <span>{event.route}</span>
                                  <StatusChip status={st} pending={!daySlots} />
                                </span>
                                {meta.length > 0 && (
                                  <span className="ptc-meta">{meta.join(' · ')}</span>
                                )}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                    {openTime?.startsWith(`${hour}:`) && (
                      <PatientTherapySlotDetail
                        key={`${patientId}|${date}|${openTime}`}
                        patientId={patientId}
                        date={date}
                        time={openTime}
                        events={day.events.filter((event) => event.time === openTime)}
                        onClose={() => setOpen(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {asNeeded.length > 0 && (
            <section className="patient-therapy-calendar__unscheduled" aria-label="Al bisogno">
              <h4>
                Al bisogno <span>({asNeeded.length})</span>
              </h4>
              <ul>
                {asNeeded.map((item) => {
                  const therapy = therapyById.get(item.therapyId);
                  const expanded = prnOpen === item.therapyId;
                  return (
                    <li key={item.id}>
                      <strong>{item.drugName}</strong>
                      <span>
                        {item.dose} · {item.route}
                        {item.prescriber ? ` · Prescr. ${item.prescriber}` : ''}
                      </span>
                      {item.note && <p>{item.note}</p>}
                      {therapy && date === today && (
                        <button
                          type="button"
                          className="ds-btn ds-btn--secondary"
                          aria-expanded={expanded}
                          onClick={() => setPrnOpen(expanded ? null : item.therapyId)}
                        >
                          {expanded ? 'Chiudi' : 'Dosi al bisogno di oggi'}
                        </button>
                      )}
                      {therapy && expanded && (
                        <div className="ptc-prn-panel">
                          <TherapyDrugDosePanel patientId={patientId} therapy={therapy} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {incomplete.length > 0 && (
            <section
              className="patient-therapy-calendar__unscheduled"
              aria-label="Programmazione da completare"
            >
              <h4>
                Programmazione da completare <span>({incomplete.length})</span>
              </h4>
              <ul>
                {incomplete.map((item) => (
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
          )}
        </>
      )}
    </section>
  );
}

const WEEKDAY = new Intl.DateTimeFormat('it-IT', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

function weekHeading(date: string): string {
  const days = weekDays(date);
  const fmt = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
  return `Settimana dal ${fmt(days[0])} al ${fmt(days[6])}`;
}

/** Sette giorni: ogni giorno elenca TUTTE le sue dosi (niente «+N»), con dose e stato in parole. */
function WeekView({
  therapies,
  patientId,
  date,
  slots,
  onOpen,
}: {
  therapies: PatientTherapyAPI[];
  patientId: string;
  date: string;
  slots: SlotsState;
  onOpen: (day: string, time: string) => void;
}) {
  const today = localIsoDate();
  return (
    <ol className="ptc-week" aria-label="Terapie della settimana">
      {weekDays(date).map((day) => {
        const built = buildPatientTherapyDay(therapies, patientId, day);
        const daySlots = slots[day];
        const prn = built.unscheduled.filter((item) => item.kind === 'as_needed');
        return (
          <li
            key={day}
            className={`ptc-week__day${day === today ? ' is-today' : ''}`}
            aria-current={day === today ? 'date' : undefined}
          >
            <h4 className="ptc-week__head">{WEEKDAY.format(new Date(`${day}T12:00:00`))}</h4>
            {built.events.length === 0 ? (
              <p className="ptc-week__none">Nessuna dose</p>
            ) : (
              <ul className="ptc-week__doses">
                {built.events.map((event) => {
                  const st = eventStatus(event, day, daySlots, patientId);
                  return (
                    <li key={event.id}>
                      <button
                        type="button"
                        className={`ptc-week__dose${st ? ` is-${st.tone}` : ''}`}
                        data-testid="ptc-week-dose"
                        onClick={() => onOpen(day, event.time)}
                      >
                        <span className="ptc-week__line">
                          <time>{event.time}</time> <strong>{event.drugName}</strong>
                        </span>
                        <span className="ptc-week__line">{doseText(event)}</span>
                        <StatusChip status={st} pending={!daySlots} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {prn.length > 0 && (
              <p className="ptc-week__none">
                Al bisogno: {prn.map((item) => item.drugName).join(', ')}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
