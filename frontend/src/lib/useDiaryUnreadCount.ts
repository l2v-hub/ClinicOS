import { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { operatorHeaders } from './operatorSession';
import { DIARY_READING_CHANGED_EVENT, parseDiaryUnreadCount } from './diaryReading';
import { URGENCY_ACKNOWLEDGED_EVENT } from './urgency';

/** Never display another session's count or replace an unavailable aggregate with a guessed zero. */
export function useDiaryUnreadCount(sessionKey: string | null, enabled: boolean): number | null {
  const [snapshot, setSnapshot] = useState<{ sessionKey: string; count: number } | null>(null);
  useEffect(() => {
    setSnapshot(null);
    if (!sessionKey || !enabled) return;
    let active = true;
    let sequence = 0;
    let controller: AbortController | null = null;
    const refresh = async () => {
      const request = ++sequence;
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch(`${API_URL}/patients/diary-unread-count`, {
          headers: operatorHeaders(),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('unavailable');
        const count = parseDiaryUnreadCount(await response.json());
        if (active && sequence === request) setSnapshot({ sessionKey, count });
      } catch (error) {
        if ((error as { name?: string }).name !== 'AbortError' && active && sequence === request)
          setSnapshot(null);
      }
    };
    const onRefresh = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    void refresh();
    window.addEventListener(URGENCY_ACKNOWLEDGED_EVENT, onRefresh);
    window.addEventListener(DIARY_READING_CHANGED_EVENT, onRefresh);
    window.addEventListener('focus', onRefresh);
    document.addEventListener('visibilitychange', onRefresh);
    const timer = window.setInterval(onRefresh, 30_000);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(timer);
      window.removeEventListener(URGENCY_ACKNOWLEDGED_EVENT, onRefresh);
      window.removeEventListener(DIARY_READING_CHANGED_EVENT, onRefresh);
      window.removeEventListener('focus', onRefresh);
      document.removeEventListener('visibilitychange', onRefresh);
    };
  }, [sessionKey, enabled]);
  return enabled && snapshot?.sessionKey === sessionKey ? snapshot.count : null;
}
