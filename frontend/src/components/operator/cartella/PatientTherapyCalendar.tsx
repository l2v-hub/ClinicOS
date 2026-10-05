// Il calendario raggruppa le dosi nello slot; dettagli e azioni sono nella popup dell'ora.
// Il proprietario inoltra onCreate solo ai profili autorizzati a prescrivere.
// Vista giorno (24 ore) e vista settimana (7 giorni; a 820 px un blocco per giorno).
// UX ciclo 2 (W5): è la vista predefinita della Terapia. Oggi si apre da sola sull'ora della prima
// dose da somministrare (azioni visibili senza tocchi in più); un farmaco o una dose richiesti da un
// collegamento diretto restano evidenziati.
import { useEffect, useId, useMemo, useState } from 'react';
import type { PatientTherapyAPI, TherapySlot } from '../../../types';
import { AccessibleDialogSurface } from '../../shared/AccessibleDialogSurface';
import { TherapyCalendarGrid, type TherapyCalendarCell } from '../../shared/TherapyCalendarGrid';
import { DateNav } from '../../shared/DateNav';
import { API_URL } from '../../../config';
import { cachedGetJson, invalidateCachedGet } from '../../../lib/cachedFetch';
import { facilityLocalDate } from '../../../lib/facilityTime';
import {
  buildPatientTherapyDay,
  calendarDoseStates,
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

interface Props {
  patientId: string;
  /** Giorno di arrivo (accesso diretto). */
  initialDate?: string;
  /** Ora da aprire all'arrivo (pannello dell'ora con le azioni). */
  initialOpenTime?: string;
  /** Farmaco da evidenziare nelle dosi (accesso diretto). */
  focusTherapyId?: string;
  /** Oggi, senza un'ora richiesta: apri l'ora della prima dose da somministrare. */
  autoOpenDue?: boolean;
  /** Cambia quando la scheda modifica le prescrizioni (rilettura del calendario). */
  refreshKey?: number;
  onCreate?: (date: string, time: string) => void;
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

export function PatientTherapyCalendar({
  patientId,
  initialDate,
  initialOpenTime,
  focusTherapyId,
  refreshKey = 0,
  onCreate,
}: Props) {
  const startDate = initialDate && isCalendarDate(initialDate) ? initialDate : facilityLocalDate();
  const [date, setDate] = useState(startDate);
  const [view, setView] = useState<'giorno' | 'settimana'>('giorno');
  const [localRevision, setRevision] = useState(0);
  const revision = localRevision + refreshKey * 1000;
  // Stato delle dosi riletto dopo ogni registrazione nel dettaglio dell'ora.
  const [slotsRevision, setSlotsRevision] = useState(0);
  // Orario aperto nel dettaglio: legato alla data in cui è stato aperto (cambiare giorno lo chiude).
  // `undefined` = nessuna scelta dell'operatore: oggi si apre l'ora della prima dose da somministrare.
  const [open, setOpen] = useState<{ date: string; time: string } | null | undefined>(() =>
    initialOpenTime ? { date: startDate, time: initialOpenTime } : undefined,
  );
  const [prnOpen, setPrnOpen] = useState<string | null>(null);
  useEffect(() => { setPrnOpen(null); }, [date, patientId]);
  const refreshCalendar = () => {
    invalidateCachedGet(`${API_URL}/therapy-slots`);
    setRevision((value) => value + 1);
  };
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
  const dialogTitle = useId();
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
  const slotsKey = `${patientId}|${revision}|${slotsRevision}|${visibleDays.join(',')}`;
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

  const today = facilityLocalDate();
  const daySlots = slots[date];
  const openTime = open?.date === date ? open.time : null;
  const cells: TherapyCalendarCell[] = visibleDays.flatMap((dayDate) => {
    const events = status === 'ready' ? buildPatientTherapyDay(state.therapies, patientId, dayDate).events : [];
    return [...new Set(events.map((event) => event.time))].map((time) => {
      const group = events.filter((event) => event.time === time);
      const statuses = group.map((event) => eventStatus(event, dayDate, slots[dayDate], patientId));
      const late = statuses.filter((item) => item?.tone === 'late').length;
      const done = statuses.filter((item) => item?.tone === 'done' || item?.tone === 'missed').length;
      const unknown = statuses.some((item) => !item);
      return { date: dayDate, time, count: group.length,
        title: group.length === 1 ? group[0].drugName : group.map((event) => event.drugName).join(' · '),
        detail: unknown ? 'Stato non disponibile' : late ? `${late} in ritardo` : `${done}/${group.length} registrate`,
        tone: late ? 'late' : done === group.length ? 'done' : 'due',
        focused: group.some((event) => event.therapyId === focusTherapyId),
      };
    });
  });

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
          onClick={refreshCalendar}
        >
          Aggiorna
        </button>
      </div>

      <header className="patient-therapy-calendar__heading">
        <h3 className={view === 'giorno' ? undefined : 'is-week'}>
          {view === 'giorno' ? formattedDate : `Settimana ${weekDays(date)[0]} – ${weekDays(date)[6]}`}
        </h3>
        <p>
          {view === 'giorno'
            ? 'Apri uno slot per dettagli e somministrazione.'
            : 'Apri uno slot per le terapie di quel giorno.'}
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
          onRetry={refreshCalendar}
        />
      )}
      {status === 'ready' && <>
        <p className="patient-therapy-calendar__count" role="status">{day.events.length} dosi · {timeCount} orari</p>
        {daySlots?.status === 'error' && <p role="alert">Stato delle somministrazioni non disponibile: è mostrata solo la programmazione.</p>}
        <TherapyCalendarGrid days={visibleDays} cells={cells} selected={open}
          onCreate={onCreate ? (target, time) => { setOpen(null); onCreate(target, time); } : undefined}
          onOpen={(target, time) => { setDate(target); setView('giorno'); setOpen({ date: target, time }); }} />
        {openTime && <AccessibleDialogSurface labelledBy={dialogTitle} onClose={() => setOpen(null)} className="therapy-calendar-dialog therapy-calendar-dialog--patient">
          <header className="therapy-calendar-dialog__head"><h3 id={dialogTitle}>Terapie delle {openTime}</h3>
            <button type="button" className="btn-secondary btn-sm" aria-label="Chiudi" data-dialog-initial-focus onClick={() => setOpen(null)}>×</button></header>
          <PatientTherapySlotDetail embedded key={`${patientId}|${date}|${openTime}`} patientId={patientId} date={date} time={openTime}
            events={day.events.filter((event) => event.time === openTime)} focusTherapyId={focusTherapyId}
            onClose={() => setOpen(null)} onRecorded={() => setSlotsRevision((value) => value + 1)} />
        </AccessibleDialogSurface>}
        {view === 'giorno' && <>
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
                          {expanded ? 'Chiudi' : 'Somministra al bisogno · dosi di oggi'}
                        </button>
                      )}
                      {therapy && expanded && date === today && (
                        <div className="ptc-prn-panel">
                          <TherapyDrugDosePanel
                            patientId={patientId}
                            therapy={therapy}
                            onRecorded={() => setSlotsRevision((value) => value + 1)}
                          />
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
        </>}
      </>}
    </section>
  );
}
