// Phase 7 — count of signals still to see, on the Assistant entry button. Counts only (no content);
// the server applies policy and resident scope. Polling: the stack has no realtime channel.
// Milo fase 5: refresh every 15 s and right after a parameter reading is saved in this browser, so
// a NEWS2 sentinel is visible within seconds without opening the panel; clinical reminders
// (ATTENTION_REQUIRED) get a distinct mark and label.

import { useEffect, useState } from 'react';
import { loadProactiveCount } from './assistantApi';
import { PARAMETER_READING_SAVED_EVENT } from '../../lib/patientParameterReadings';

export const BADGE_REFRESH_MS = 15_000;

export function badgeLabel(count: number, attention: number): string {
  const news = `${count} novità da vedere`;
  if (!attention) return news;
  return `${attention} promemoria clinic${attention === 1 ? 'o' : 'i'} da vedere · ${news}`;
}

export function AssistantEntryBadge({ refreshKey }: { refreshKey?: unknown }) {
  const [counts, setCounts] = useState({ count: 0, attention: 0 });
  useEffect(() => {
    let alive = true;
    const load = () =>
      loadProactiveCount()
        .then(
          (r) => alive && setCounts({ count: r.counts.new, attention: r.counts.attention ?? 0 }),
        )
        .catch(() => alive && setCounts({ count: 0, attention: 0 }));
    const first = window.setTimeout(load, 0);
    const timer = window.setInterval(load, BADGE_REFRESH_MS);
    // Il server ha bisogno di un istante per rendere visibile la nuova riga.
    const onSaved = () => window.setTimeout(load, 500);
    window.addEventListener(PARAMETER_READING_SAVED_EVENT, onSaved);
    return () => {
      alive = false;
      window.clearTimeout(first);
      window.clearInterval(timer);
      window.removeEventListener(PARAMETER_READING_SAVED_EVENT, onSaved);
    };
  }, [refreshKey]);
  const shown = Math.max(counts.count, counts.attention);
  if (!shown) return null;
  return (
    <span
      className={`topbar-assistant__badge${counts.attention ? ' topbar-assistant__badge--attention' : ''}`}
      data-testid="assistant-entry-badge"
      role="status"
      aria-label={badgeLabel(counts.count, counts.attention)}
      title={badgeLabel(counts.count, counts.attention)}
    >
      {shown > 99 ? '99+' : shown}
    </span>
  );
}
