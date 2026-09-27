import { useEffect, useState } from 'react';
import { TURNO_LABEL, turnoDaOra } from '../../lib/turno';

const hhmm = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

/** Turno e ora correnti nell'intestazione (HMI 1): aggiornati allo scoccare del minuto. */
export function ShiftClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer = window.setTimeout(
      function tick() {
        setNow(new Date());
        timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
      },
      60_000 - (Date.now() % 60_000) + 50,
    );
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div className="topbar-clock">
      <span className="topbar-clock__shift">Turno {TURNO_LABEL[turnoDaOra(now)]}</span>
      <time className="topbar-clock__time" dateTime={now.toISOString()}>
        {hhmm(now)}
      </time>
    </div>
  );
}
