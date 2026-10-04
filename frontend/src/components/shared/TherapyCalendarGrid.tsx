import { IcoChevronRight, IcoPill } from '../../icons';
import { useEffect, useRef } from 'react';
import './TherapyCalendarGrid.css';

export interface TherapyCalendarCell {
  date: string;
  time: string;
  title: string;
  detail: string;
  count: number;
  tone?: string;
  partial?: boolean;
  focused?: boolean;
}

/** Same occupied-slot surface in patient and ward calendars. Details belong in the dialog. */
export function TherapyCalendarGrid({ days, cells, onOpen, selected, loadingDays = [], errorDays = [] }: {
  days: string[];
  cells: TherapyCalendarCell[];
  onOpen: (date: string, time: string) => void;
  selected?: { date: string; time: string } | null;
  loadingDays?: string[];
  errorDays?: string[];
}) {
  const root = useRef<HTMLDivElement>(null);
  const scrolledDay = useRef<string | null>(null);
  const times = [...new Set(cells.map((cell) => cell.time))].sort();
  const firstTime = selected?.time ?? times[0];
  useEffect(() => {
    if (days.length !== 1 || !firstTime || scrolledDay.current === days[0]) return;
    const grid = root.current;
    const row = grid?.querySelector<HTMLElement>(`tr[data-time="${firstTime}"]`);
    if (grid && row) { grid.scrollTop = Math.max(0, row.offsetTop - 40); scrolledDay.current = days[0]; }
  }, [days, firstTime]);
  const rows = days.length === 1
    ? [...new Set([...Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`), ...times])].sort()
    : times;
  return (
    <div ref={root} className={`therapy-calendar-grid${days.length === 1 ? ' is-day' : ' is-week'}`}>
      <table aria-label="Calendario terapie per orario">
        <thead><tr><th scope="col">Ora</th>{days.map((day) => (
          <th scope="col" key={day}>{new Date(`${day}T12:00:00`).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}</th>
        ))}</tr></thead>
        <tbody>{rows.map((time) => (
          <tr key={time} data-hour={time.slice(0, 2)} data-time={time}><th scope="row">{time}</th>{days.map((day) => {
            const cell = cells.find((item) => item.date === day && item.time === time);
            return <td key={day}>{loadingDays.includes(day) ? <span role="status">Caricamento…</span>
              : errorDays.includes(day) ? <span>Non disponibile</span> : cell ? (
                <button type="button" className={`therapy-calendar-cell is-${cell.tone ?? 'unknown'}${cell.focused ? ' is-focus' : ''}`}
                  aria-haspopup="dialog" aria-expanded={selected?.date === day && selected.time === time}
                  aria-label={`${day}, ore ${time}: ${cell.title}, ${cell.count} dosi, ${cell.detail}${cell.partial ? ', elenco parziale' : ''}. Apri dettagli`}
                  data-testid="therapy-calendar-cell" data-date={day} data-time={time}
                  onClick={() => onOpen(day, time)}>
                  <IcoPill /><span className="therapy-calendar-cell__text"><strong>{cell.title}</strong>
                    <span>{cell.count} {cell.count === 1 ? 'dose' : 'dosi'} · {cell.detail}</span>
                    {cell.partial && <small>Elenco parziale</small>}</span><IcoChevronRight />
                </button>
              ) : <span className="therapy-calendar-grid__empty" aria-label="Nessuna dose caricata">·</span>}</td>;
          })}</tr>
        ))}</tbody>
      </table>
    </div>
  );
}
