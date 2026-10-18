import { useCallback, useEffect, useRef, useState } from 'react';
import type { TherapySlotPageInfo, TherapyVerificationGroup } from '../../types';
import { TherapyVerificationPanel } from './TherapyVerificationPanel';

export interface AgendaTherapyIdentity {
  date: string;
  scopeKey: string;
}

/** Agenda receives verification only; scheduled groups and clinical write callbacks do not fit. */
export interface AgendaTherapyVerificationFeed {
  groups: TherapyVerificationGroup[];
  accepted: AgendaTherapyIdentity | null;
  requested: AgendaTherapyIdentity | null;
  scopeKey: string;
  allowed: boolean;
  loading: boolean;
  error: string | null;
  pageInfo: TherapySlotPageInfo;
  loadingMore: boolean;
  loadMoreError: string | null;
  onLoad: (date: string) => Promise<void>;
  onLoadMore: (date: string) => void;
}

export function agendaVerificationStatus(
  feed: AgendaTherapyVerificationFeed,
  date: string,
  active: boolean,
  pending = false,
): 'inactive' | 'denied' | 'loading' | 'error' | 'ready' {
  if (!active) return 'inactive';
  if (!feed.allowed) return 'denied';
  const owns = (identity: AgendaTherapyIdentity | null) =>
    identity?.date === date && identity.scopeKey === feed.scopeKey;
  if (!owns(feed.requested) || pending || feed.loading) return 'loading';
  if (feed.error) return 'error';
  if (!owns(feed.accepted)) return 'loading';
  if (feed.groups.some((group) => group.date !== date)) return 'error';
  return 'ready';
}

export function AgendaTherapyVerification({
  date,
  active,
  feed,
}: {
  date: string;
  active: boolean;
  feed: AgendaTherapyVerificationFeed;
}) {
  const { onLoad, allowed, scopeKey } = feed;
  const key = JSON.stringify([date, scopeKey]);
  const generation = useRef(0);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [localError, setLocalError] = useState<{ key: string; message: string } | null>(null);
  const reload = useCallback(async () => {
    const request = ++generation.current;
    setPendingKey(key);
    setLocalError(null);
    try {
      await onLoad(date);
    } catch {
      if (request === generation.current)
        setLocalError({ key, message: 'Verifiche non disponibili: riprova per questa data.' });
    } finally {
      if (request === generation.current) setPendingKey(null);
    }
  }, [date, key, onLoad]);

  useEffect(() => {
    if (!active || !allowed) return;
    void reload();
    return () => {
      generation.current += 1;
    };
  }, [active, allowed, reload]);

  const error = localError?.key === key ? localError.message : feed.error;
  const status = agendaVerificationStatus({ ...feed, error }, date, active, pendingKey === key);
  if (status === 'inactive') return null;
  if (status === 'denied')
    return (
      <p className="empty-state-card" role="status">
        Verifiche delle terapie non consultabili per il tuo ruolo.
      </p>
    );
  if (status === 'loading')
    return (
      <p className="empty-state-card" role="status" aria-busy="true">
        Caricamento verifiche delle terapie…
      </p>
    );
  if (status === 'error')
    return (
      <div className="empty-state-card" role="alert">
        <strong>{error || 'Verifiche non disponibili: ricarica questa data.'}</strong>
        <button type="button" className="btn-secondary" onClick={() => void reload()}>
          Riprova verifiche
        </button>
      </div>
    );
  const total = feed.groups.reduce((sum, group) => sum + group.summary.total, 0);
  const loaded = feed.groups.reduce(
    (sum, group) =>
      sum + group.patients.reduce((count, patient) => count + patient.items.length, 0),
    0,
  );
  return (
    <>
      <TherapyVerificationPanel groups={feed.groups} />
      {total === 0 && (
        <p className="empty-state-card" role="status">
          Nessuna terapia da verificare per questa data.
        </p>
      )}
      {feed.pageInfo.hasMore && loaded < total && (
        <div className="empty-state-card" role="status" aria-live="polite">
          <strong>
            Verifiche mostrate {loaded} di {total}. Totale esatto.
          </strong>
          {feed.loadMoreError && <span role="alert">{feed.loadMoreError}</span>}
          <button
            type="button"
            className="btn-secondary"
            disabled={feed.loadingMore}
            onClick={() => feed.onLoadMore(date)}
          >
            {feed.loadingMore ? 'Caricamento…' : 'Carica altre verifiche'}
          </button>
        </div>
      )}
    </>
  );
}
