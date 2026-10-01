// Phase 7 — «Per te» attention area of the AI Assistant: Da vedere / Cosa è cambiato / Briefing.
// Everything shown comes from the server (signals are already filtered by policy and resident
// scope). The panel never executes anything: an action opens an EXISTING skill through the normal
// Assistant path (preview → «Conferma»), reopens one of my previews, or opens a classic screen.

import { useCallback, useEffect, useState } from 'react';
import { TopNav } from '../navigation/TopNav';
import {
  acknowledgeSignals,
  loadProactiveInbox,
  loadShiftBriefing,
  markSignalsSeen,
  type ProactiveInbox,
  type ProactiveSignal,
  type ShiftBriefing,
} from './assistantApi';

type Tab = 'da-vedere' | 'cambiato' | 'briefing';

const REFRESH_MS = 60_000;

const STATUS_LABEL: Record<ProactiveSignal['status'], string> = {
  nuovo: 'Nuovo',
  visto: 'Già visto',
  preso_visione: 'Preso visione',
};

function when(iso: string): string {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return sameDay
    ? `oggi ${time}`
    : `${d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} ${time}`;
}

interface Props {
  busy: boolean;
  onOpenSignal: (signal: ProactiveSignal) => void;
  /** Count of signals still to see (for the entry badge). */
  onCount?: (toSee: number) => void;
}

function SignalCard({
  signal,
  busy,
  onOpen,
  onAck,
}: {
  signal: ProactiveSignal;
  busy: boolean;
  onOpen: () => void;
  onAck: () => void;
}) {
  return (
    <li
      className={`am-signal am-signal--${signal.priority}`}
      data-testid="am-signal"
      data-signal-id={signal.signalId}
    >
      <div className="am-signal__head">
        <strong className="am-signal__title">{signal.title}</strong>
        <span className="am-signal__badges">
          {signal.priority !== 'normale' && (
            <span
              className={`ds-badge ${signal.priority === 'urgente' ? 'ds-badge--alarm' : 'ds-badge--warning'}`}
              title={`Priorità dalla fonte: ${signal.priorityRule}`}
            >
              {signal.priority === 'urgente' ? 'Urgente' : 'Priorità alta'}
            </span>
          )}
          <span
            className={`ds-badge ${signal.status === 'nuovo' ? 'ds-badge--info' : 'ds-badge--stale'}`}
            data-testid="am-signal-status"
          >
            {STATUS_LABEL[signal.status]}
          </span>
        </span>
      </div>
      <p className="am-signal__meta">
        {signal.residentLabel && (
          <span className="am-signal__resident">{signal.residentLabel}</span>
        )}
        <span>{when(signal.occurredAt)}</span>
        <span>Origine: {signal.origin}</span>
        {signal.count > 1 && <span>{signal.count} eventi</span>}
      </p>
      {signal.detail && <p className="am-signal__detail">{signal.detail}</p>}
      <p className="am-muted am-signal__reason">Perché lo vedi: {signal.reason}</p>
      <div className="am-signal__actions">
        {signal.action && (
          <button
            type="button"
            className="ds-btn ds-btn--secondary"
            disabled={busy}
            onClick={onOpen}
            data-testid="am-signal-open"
          >
            {signal.action.label}
          </button>
        )}
        {signal.status !== 'preso_visione' && (
          <button
            type="button"
            className="am-link"
            disabled={busy}
            onClick={onAck}
            data-testid="am-signal-ack"
          >
            Preso visione
          </button>
        )}
      </div>
    </li>
  );
}

export function ProactivePanel({ busy, onOpenSignal, onCount }: Props) {
  const [tab, setTab] = useState<Tab>('da-vedere');
  const [inbox, setInbox] = useState<ProactiveInbox | null>(null);
  const [briefing, setBriefing] = useState<ShiftBriefing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);

  const refresh = useCallback(async (poll = false) => {
    try {
      const next = await loadProactiveInbox(poll);
      setInbox(next);
      setError(null);
      onCount?.(next.counts.new);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Segnali non disponibili');
    }
  }, [onCount]);

  useEffect(() => {
    // Polling with the server as the source of truth (no realtime channel exists in the stack).
    const first = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(true), REFRESH_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [refresh]);

  async function ack(signal: ProactiveSignal) {
    await acknowledgeSignals([{ signalId: signal.signalId, rev: signal.rev }]).catch(
      () => undefined,
    );
    await refresh();
  }

  async function seenAll() {
    await markSignalsSeen().catch(() => undefined);
    await refresh();
  }

  async function prepareBriefing() {
    setLoadingBriefing(true);
    try {
      setBriefing(await loadShiftBriefing());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Briefing non disponibile');
    } finally {
      setLoadingBriefing(false);
    }
  }

  const toSee = inbox?.signals.filter((s) => s.status !== 'preso_visione') ?? [];
  const changed = inbox?.signals.filter((s) => s.changedSinceLastView) ?? [];
  const list = tab === 'da-vedere' ? toSee : changed;
  const factById = new Map((briefing?.facts ?? []).map((s) => [s.signalId, s]));

  return (
    <section className="am-card am-proactive" aria-label="Per te" data-testid="am-proactive">
      <div className="am-proactive__head">
        <p className="am-card__title">Per te</p>
        <button type="button" className="am-link" onClick={() => void refresh()} disabled={busy}>
          Aggiorna
        </button>
      </div>
      <TopNav
        variant="level3"
        ariaLabel="Segnali per te"
        idPrefix="am-proactive"
        panelId="am-proactive-panel"
        activeKey={tab}
        onChange={(key) => setTab(key as Tab)}
        items={[
          { key: 'da-vedere', label: 'Da vedere', badge: toSee.length || undefined },
          { key: 'cambiato', label: 'Cosa è cambiato', badge: changed.length || undefined },
          { key: 'briefing', label: 'Briefing turno' },
        ]}
      />
      <div id="am-proactive-panel" role="tabpanel">
        {error && (
          <p className="am-muted" role="status">
            {error}
          </p>
        )}
        {inbox?.degraded && inbox.degraded.length > 0 && (
          <p className="am-muted" role="status" data-testid="am-proactive-degraded">
            Alcune fonti non sono disponibili in questo momento: l’elenco potrebbe essere incompleto.
          </p>
        )}

        {tab !== 'briefing' && inbox && (
          <>
            {tab === 'cambiato' && (
              <div className="am-proactive__bar">
                <span className="am-muted">
                  {inbox.watermark
                    ? `Dall’ultima volta che hai segnato «visto» (${when(inbox.watermark)})`
                    : 'Non hai ancora segnato nulla come visto'}
                </span>
                {changed.length > 0 && (
                  <button
                    type="button"
                    className="ds-btn ds-btn--secondary"
                    onClick={() => void seenAll()}
                    data-testid="am-signals-seen"
                  >
                    Segna tutto come visto
                  </button>
                )}
              </div>
            )}
            {list.length === 0 ? (
              <p className="am-muted" data-testid="am-signals-empty">
                {tab === 'da-vedere'
                  ? 'Niente da vedere per ora.'
                  : 'Nessuna novità dall’ultima volta.'}
              </p>
            ) : (
              <ul className="am-signals" data-testid={`am-signals-${tab}`}>
                {list.map((s) => (
                  <SignalCard
                    key={s.signalId}
                    signal={s}
                    busy={busy}
                    onOpen={() => onOpenSignal(s)}
                    onAck={() => void ack(s)}
                  />
                ))}
              </ul>
            )}
          </>
        )}

        {tab === 'briefing' && (
          <div className="am-briefing" data-testid="am-briefing">
            {!briefing && (
              <button
                type="button"
                className="ds-btn ds-btn--primary"
                disabled={loadingBriefing}
                onClick={() => void prepareBriefing()}
                data-testid="am-briefing-load"
              >
                {loadingBriefing ? 'Preparazione…' : 'Cosa devo sapere all’inizio del turno?'}
              </button>
            )}
            {briefing && (
              <>
                <p className="am-muted" data-testid="am-briefing-period">
                  Periodo: dal turno «{briefing.period.previousShift}» ({when(briefing.period.from)}
                  ) a ora
                </p>
                <div className="am-briefing__summary" data-testid="am-briefing-summary">
                  <span
                    className={`ds-badge ${briefing.summary.composed ? 'ds-badge--ai' : 'ds-badge--stale'}`}
                  >
                    {briefing.summary.composed
                      ? 'Sintesi AI — verifica sui fatti qui sotto'
                      : 'Sintesi AI non disponibile: elenco dei fatti'}
                  </span>
                  {briefing.metrics?.aiSkipped === 'cooldown' && (
                    <p className="am-muted">Sintesi AI appena generata: riprova tra un minuto. Intanto ecco i fatti.</p>
                  )}
                  <p className="am-briefing__text">{briefing.summary.text}</p>
                </div>
                <p className="am-card__subtitle">Fatti registrati</p>
                {briefing.byResident.length === 0 && (
                  <p className="am-muted">Nessun fatto nel periodo.</p>
                )}
                {briefing.byResident.map((group) => (
                  <div
                    key={group.residentId ?? 'struttura'}
                    className="am-briefing__group"
                    data-testid="am-briefing-group"
                  >
                    <strong>{group.residentLabel}</strong>
                    <ul className="am-briefing__facts">
                      {group.signalIds.map((id) => {
                        const fact = factById.get(id);
                        if (!fact) return null;
                        return (
                          <li key={id}>
                            {fact.title} <span className="am-muted">· {when(fact.occurredAt)}</span>
                            {fact.action && (
                              <button
                                type="button"
                                className="am-link"
                                disabled={busy}
                                onClick={() => onOpenSignal(fact)}
                              >
                                Apri
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
                <button
                  type="button"
                  className="am-link"
                  onClick={() => void prepareBriefing()}
                  disabled={loadingBriefing}
                >
                  Rigenera
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
