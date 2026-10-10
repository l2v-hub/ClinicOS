import { IcoChevronRight, IcoPill } from '../../icons';
import { useEffect, useRef } from 'react';
import { facilityLocalDate } from '../../lib/facilityTime';
import './TherapyCalendarGrid.css';

// Ward aggregate cue, not a uniform per-dose outcome. The visible detail retains mixed states.
const WARD_STATE: Record<string, { symbol: string; label: string }> = {
  late: { symbol: '!', label: 'Ritardo / non registrata' },
  due: { symbol: '○', label: 'Programmata' },
  future: { symbol: '○', label: 'Programmata' },
  done: { symbol: '✓', label: 'Somministrate' },
  missed: { symbol: '×', label: 'Non somministrate presenti' },
  unknown: { symbol: '?', label: 'Stato da verificare' },
};

export interface TherapyCalendarCell {
  date: string;
  time: string;
  title: string;
  detail: string;
  count: number;
  tone?: string;
  partial?: boolean;
  focused?: boolean;
  /** Remaining doses at this exact time, from loaded details; partial is a lower bound. */
  pendingCount?: number;
}

/** Same occupied-slot surface in patient and ward calendars. Details belong in the dialog. */
export function TherapyCalendarGrid({
  days,
  cells,
  onOpen,
  onCreate,
  selected,
  loadingDays = [],
  errorDays = [],
  today = facilityLocalDate(),
}: {
  days: string[];
  cells: TherapyCalendarCell[];
  onOpen: (date: string, time: string, patientId?: string) => void;
  onCreate?: (date: string, time: string) => void;
  selected?: { date: string; time: string; patientId?: string } | null;
  loadingDays?: string[];
  errorDays?: string[];
  today?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const scrolledDay = useRef<string | null>(null);
  const times = [...new Set(cells.map((cell) => cell.time))].sort();
  const firstTime = selected?.time ?? times[0];
  useEffect(() => {
    if (days.length !== 1 || !firstTime || scrolledDay.current === days[0]) return;
    const grid = root.current;
    const row = grid?.querySelector<HTMLElement>(`tr[data-time="${firstTime}"]`);
    if (grid && row) {
      grid.scrollTop = Math.max(0, row.offsetTop - 40);
      scrolledDay.current = days[0];
    }
  }, [days, firstTime]);
  const rows =
    days.length === 1 || onCreate
      ? [
          ...new Set([
            ...Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`),
            ...times,
          ]),
        ].sort()
      : times;
  return (
    <div
      ref={root}
      className={`therapy-calendar-grid${days.length === 1 ? ' is-day' : ' is-week'}`}
    >
      <table aria-label="Calendario terapie per orario">
        <thead>
          <tr>
            <th scope="col">Ora</th>
            {days.map((day) => (
              <th
                scope="col"
                key={day}
                className={day === today ? 'therapy-calendar-grid__today' : undefined}
                aria-current={day === today ? 'date' : undefined}
              >
                <span>
                  {new Date(`${day}T12:00:00`).toLocaleDateString('it-IT', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                {day === today && (
                  <strong className="therapy-calendar-grid__today-marker">Oggi</strong>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((time) => (
            <tr key={time} data-hour={time.slice(0, 2)} data-time={time}>
              <th scope="row">{time}</th>
              {days.map((day) => {
                const cell = cells.find((item) => item.date === day && item.time === time);
                const state =
                  cell?.partial && cell.pendingCount === 0
                    ? { symbol: '?', label: 'Conteggio incompleto' }
                    : (WARD_STATE[cell?.tone ?? 'unknown'] ?? WARD_STATE.unknown);
                return (
                  <td key={day}>
                    {loadingDays.includes(day) ? (
                      <span role="status">Caricamento…</span>
                    ) : errorDays.includes(day) ? (
                      <span>Non disponibile</span>
                    ) : cell?.pendingCount !== undefined ? (
                      <button
                        type="button"
                        className={`therapy-calendar-count is-${cell.partial && cell.pendingCount === 0 ? 'unknown' : (cell.tone ?? 'unknown')}`}
                        aria-haspopup="dialog"
                        aria-expanded={selected?.date === day && selected.time === time}
                        aria-label={`${day} ore ${time}: ${state.label}. ${cell.partial ? (cell.pendingCount > 0 ? `almeno ${cell.pendingCount} dosi da erogare, conteggio parziale` : 'conteggio da erogare incompleto') : `${cell.pendingCount} dosi da erogare`}. ${cell.title}, ${cell.count} dosi caricate, ${cell.detail}. Apri dettagli`}
                        title={`${cell.pendingCount} dosi da erogare${cell.partial ? ' nei dettagli caricati; conteggio parziale' : ''}`}
                        data-testid="therapy-calendar-count"
                        data-date={day}
                        data-time={time}
                        onClick={() => onOpen(day, time)}
                      >
                        <span className="therapy-calendar-count__summary">
                          <span className="therapy-calendar-count__symbol" aria-hidden="true">
                            {state.symbol}
                          </span>
                          <strong>
                            {cell.partial
                              ? cell.pendingCount > 0
                                ? `≥${cell.pendingCount}`
                                : '—'
                              : cell.pendingCount}
                          </strong>
                          <span>da erogare</span>
                        </span>
                        <span className="therapy-calendar-count__state">{state.label}</span>
                        <span className="therapy-calendar-count__detail">{cell.detail}</span>
                        {cell.partial && <small>Elenco parziale</small>}
                      </button>
                    ) : cell ? (
                      <button
                        type="button"
                        className={`therapy-calendar-cell is-${cell.tone ?? 'unknown'}${cell.focused ? ' is-focus' : ''}`}
                        aria-haspopup="dialog"
                        aria-expanded={selected?.date === day && selected.time === time}
                        aria-label={`${day}, ore ${time}: ${cell.title}, ${cell.count} dosi, ${cell.detail}${cell.partial ? ', elenco parziale' : ''}. Apri dettagli`}
                        data-testid="therapy-calendar-cell"
                        data-date={day}
                        data-time={time}
                        onClick={() => onOpen(day, time)}
                      >
                        <IcoPill />
                        <span className="therapy-calendar-cell__text">
                          <strong>{cell.title}</strong>
                          <span>
                            {cell.count} {cell.count === 1 ? 'dose' : 'dosi'} · {cell.detail}
                          </span>
                          {cell.partial && <small>Elenco parziale</small>}
                        </span>
                        <IcoChevronRight />
                      </button>
                    ) : onCreate ? (
                      <button
                        type="button"
                        className="ds-icon-btn therapy-calendar-grid__add"
                        aria-label={`Nuova terapia ${day} ore ${time}`}
                        title="Aggiungi terapia"
                        aria-haspopup="dialog"
                        onClick={() => onCreate(day, time)}
                      >
                        <span aria-hidden="true">＋</span>
                      </button>
                    ) : (
                      <span
                        className="therapy-calendar-grid__empty"
                        aria-label="Nessuna dose caricata"
                      >
                        ·
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
