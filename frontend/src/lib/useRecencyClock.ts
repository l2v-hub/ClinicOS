import { useEffect, useState } from 'react';

/** One display-only clock per surface, not per field; never fetches or edits a draft. */
export function useRecencyClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => setNow(new Date());
    const visible = () => { if (document.visibilityState === 'visible') update(); };
    const timer = window.setInterval(update, 60_000);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);
  return now;
}
