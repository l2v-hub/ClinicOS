import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssessmentClient } from '../../../lib/assessments/assessmentClient';
import type { AssessmentHistoryItem } from '../../../lib/assessments/assessmentTypes';
export function useAssessmentHistory(patientId: string, client: AssessmentClient) {
  const [status, setStatus] = useState<'all' | 'draft' | 'final'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [revision, setRevision] = useState(0);
  const [items, setItems] = useState<AssessmentHistoryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const busy = useRef(false);
  const controllers = useRef(new Set<AbortController>());
  const load = useCallback(
    async (after?: string) => {
      if (busy.current) return;
      busy.current = true;
      const version = generation.current;
      const controller = new AbortController();
      controllers.current.add(controller);
      setLoading(true);
      setError('');
      try {
        if (from && to && from > to)
          throw new Error('La data iniziale deve precedere quella finale.');
        const page = await client.page(
          patientId,
          { status, from, to, cursor: after },
          controller.signal,
        );
        if (controller.signal.aborted || generation.current !== version) return;
        if (after && page.pageInfo.nextCursor === after)
          throw new Error('Lo storico non è avanzato. Ricaricalo.');
        setItems((current) =>
          after
            ? [...new Map([...current, ...page.items].map((item) => [item.id, item])).values()]
            : page.items,
        );
        setCursor(page.pageInfo.nextCursor);
      } catch (cause) {
        if (!controller.signal.aborted && generation.current === version)
          setError(cause instanceof Error ? cause.message : 'Storico non disponibile.');
      } finally {
        controllers.current.delete(controller);
        if (version === generation.current) {
          busy.current = false;
          setLoading(false);
        }
      }
    },
    [client, patientId, status, from, to],
  );
  useEffect(() => {
    const version = ++generation.current;
    const pending = controllers.current;
    busy.current = false;
    const timer = window.setTimeout(() => {
      setItems([]);
      setCursor(null);
      void load();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      generation.current = version + 1;
      pending.forEach((controller) => controller.abort());
      pending.clear();
    };
  }, [load, revision]);
  return {
    items,
    loading,
    error,
    status,
    setStatus,
    from,
    setFrom,
    to,
    setTo,
    hasMore: !!cursor,
    loadMore: () => {
      if (cursor) void load(cursor);
    },
    refresh: () => setRevision((value) => value + 1),
  };
}
