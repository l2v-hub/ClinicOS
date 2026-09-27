import { useEffect, useState } from 'react';
import { FACILITY_TIME_ZONE, facilityLocalMinute } from '../../lib/facilityTime';
/** Con `hidden` resta solo il cambio di giorno a mezzanotte: l'ora è già nell'intestazione. */
export function ParameterEntryClock({
  onDayChange,
  hidden = false,
}: {
  onDayChange: (day: string) => void;
  hidden?: boolean;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const local = facilityLocalMinute(now);
  useEffect(() => onDayChange(local.slice(0, 10)), [local, onDayChange]);
  if (hidden) return null;
  return (
    <div className="parameter-entry-clock" aria-label="Data e ora di rilevazione">
      <span>Ora della rilevazione</span>
      <time dateTime={now.toISOString()}>{local.slice(11)}</time>
      <span>
        {now.toLocaleDateString('it-IT', {
          timeZone: FACILITY_TIME_ZONE,
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </span>
    </div>
  );
}
