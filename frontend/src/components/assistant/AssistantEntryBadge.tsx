// Phase 7 — count of signals still to see, on the Assistant entry button. Counts only (no content);
// the server applies policy and resident scope. Polling: the stack has no realtime channel.

import { useEffect, useState } from 'react';
import { loadProactiveCount } from './assistantApi';

const REFRESH_MS = 120_000;

export function AssistantEntryBadge({ refreshKey }: { refreshKey?: unknown }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () =>
      loadProactiveCount()
        .then((r) => alive && setCount(r.counts.new))
        .catch(() => alive && setCount(0));
    const first = window.setTimeout(load, 0);
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [refreshKey]);
  if (!count) return null;
  return (
    <span className="topbar-assistant__badge" data-testid="assistant-entry-badge" aria-label={`${count} novità da vedere`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
