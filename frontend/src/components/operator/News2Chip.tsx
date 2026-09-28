// Chip NEWS2 nella testata della cartella e storico con l'andamento nel tempo.
// Il punteggio si mostra solo per rilevazioni COMPLETE (sette parametri misurati insieme):
// un totale parziale sottostimerebbe il rischio.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { API_URL } from '../../config';
import { operatorHeaders } from '../../lib/operatorSession';
import {
  fetchParameterReadings,
  formatParameterValue,
  readingTime,
  type PatientParameterReading,
} from '../../lib/patientParameterReadings';
import { NEWS2_LABELS, NEWS2_PARAMETERS } from '../../lib/news2';
import {
  PARAMETER_READING_SAVED_EVENT,
  latestCompleteNews2,
  news2Points,
  news2Staleness,
  news2Tone,
  type News2Point,
} from '../../lib/news2History';
import { createPortal } from 'react-dom';
import { AccessibleDialogSurface } from '../shared/AccessibleDialogSurface';
import { news2Tile, vitalTiles } from '../../lib/patientVitalsOverview';
import './News2.css';

interface Props {
  patientId: string;
  patientName: string;
  /** 'overview': tessere dei parametri + tessera NEWS2 della Panoramica (HMI 1), stesso storico. */
  /** 'compact': solo "NEWS2 n" (colonne strette); ora e stato restano in title e aria-label. */
  variant?: 'chip' | 'compact' | 'overview';
}

/** Tono NEWS2 → tono del badge canonico (rosso solo per rischio medio/alto). */
const BADGE_TONE: Record<string, string> = {
  ok: 'ok',
  low: 'info',
  single: 'warning',
  medium: 'alarm',
  high: 'alarm-strong',
  stale: 'stale',
};
const badgeClass = (tone: string) => `ds-badge ds-badge--${BADGE_TONE[tone] ?? 'stale'}`;

export function News2Chip({ patientId, patientName, variant = 'chip' }: Props) {
  const [readings, setReadings] = useState<PatientParameterReading[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [open, setOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  // Ogni lettura annulla la precedente: una risposta vecchia non sovrascrive quella nuova.
  const requestRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    // Annulla anche un "carica precedenti" in corso: il suo pulsante non deve restare bloccato.
    setLoadingMore(false);
    try {
      const page = await fetchParameterReadings(
        API_URL,
        patientId,
        {},
        { headers: operatorHeaders(), signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      setReadings(page.readings);
      setCursor(page.hasMore ? page.nextCursor : null);
      setLoadMoreError(false);
      setState('ready');
    } catch {
      if (!controller.signal.aborted) setState('error');
    }
  }, [patientId]);

  useEffect(() => {
    setState('loading');
    void load();
    // Una nuova rilevazione salvata per questo paziente aggiorna subito il chip.
    const onSaved = (event: Event) => {
      if ((event as CustomEvent<{ patientId?: string }>).detail?.patientId === patientId)
        void load();
    };
    window.addEventListener(PARAMETER_READING_SAVED_EVENT, onSaved);
    return () => {
      requestRef.current?.abort();
      window.removeEventListener(PARAMETER_READING_SAVED_EVENT, onSaved);
    };
  }, [patientId, load]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const page = await fetchParameterReadings(
        API_URL,
        patientId,
        { cursor },
        { headers: operatorHeaders(), signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      setReadings((prev) => [
        ...prev,
        ...page.readings.filter((r) => !prev.some((p) => p.id === r.id)),
      ]);
      setCursor(page.hasMore ? page.nextCursor : null);
    } catch {
      if (!controller.signal.aborted) setLoadMoreError(true);
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  }

  const points = news2Points(readings);
  const latest = latestCompleteNews2(points);
  const staleness = news2Staleness(points, latest);
  const baseTone = news2Tone(latest);
  // Un punteggio vecchio o superato da rilevazioni più recenti non deve rassicurare: i toni
  // "tranquilli" diventano neutri; un rischio alto resta visibile anche se da aggiornare.
  const tone = staleness.stale && (baseTone === 'ok' || baseTone === 'low') ? 'stale' : baseTone;
  const label =
    state === 'loading'
      ? 'NEWS2 …'
      : state === 'error'
        ? 'NEWS2 non caricato'
        : latest
          ? `NEWS2 ${latest.result.total} · ${news2When(latest.reading.measuredAt)}${staleness.stale ? ' · da aggiornare' : ''}`
          : 'NEWS2 non calcolabile';
  const compactLabel =
    state === 'loading'
      ? 'NEWS2 …'
      : state === 'error'
        ? 'NEWS2 ?'
        : latest
          ? `NEWS2 ${latest.result.total}`
          : 'NEWS2 —';
  const title =
    state === 'error'
      ? 'Non è stato possibile caricare le rilevazioni. Tocca per riprovare.'
      : latest
        ? `${staleness.stale ? 'Da aggiornare. ' : ''}${latest.result.response}. Rilevazione del ${readingTime(latest.reading.measuredAt)}.${staleness.newerIncomplete ? ` Dopo questa ${incompleteText(staleness.newerIncomplete)}.` : ''} Tocca per lo storico.`
        : state === 'ready'
          ? 'Nessuna rilevazione con tutti i sette parametri (FR, SpO₂, O₂, PA, FC, coscienza, TC). Tocca per lo storico.'
          : undefined;

  function retry() {
    setState('loading');
    void load();
  }

  // Lo storico va a livello di pagina (portal): dentro la chip resterebbe sotto le altre chip
  // della lista o delle card, che potrebbero aprire un secondo storico sopra il primo.
  const history =
    open &&
    createPortal(
      <News2History
        patientName={patientName}
        state={state}
        points={points}
        staleness={staleness}
        canLoadMore={!!cursor}
        loadingMore={loadingMore}
        loadMoreError={loadMoreError}
        onRetry={retry}
        onLoadMore={() => void loadMore()}
        onClose={() => setOpen(false)}
      />,
      document.body,
    );

  if (variant === 'overview')
    return (
      <>
        <VitalsOverview
          state={state}
          readings={readings}
          stale={staleness.stale}
          onRetry={retry}
          onOpenHistory={() => setOpen(true)}
        />
        {history}
      </>
    );

  return (
    <>
      <button
        type="button"
        className={`news2-chip ${badgeClass(state === 'error' ? 'stale' : tone)}${variant === 'compact' && staleness.stale && tone !== 'stale' ? ' ds-badge--dashed' : ''}`}
        onClick={() => {
          if (state === 'error') retry();
          setOpen(true);
        }}
        disabled={state === 'loading' && !open}
        title={title}
        aria-label={`${label}. Apri lo storico NEWS2`}
        aria-haspopup="dialog"
      >
        <span className="ds-badge__text">{variant === 'compact' ? compactLabel : label}</span>
      </button>
      {history}
    </>
  );
}

const TREND_PATH = {
  up: 'M4 16l5-5 4 4 7-7M15 8h5v5',
  down: 'M4 8l5 5 4-4 7 7M15 16h5v-5',
  flat: 'M4 12h16M16 8l4 4-4 4',
} as const;

/** Tessere della Panoramica come il prototipo: FR, SpO2, PA, FC, Temp. e NEWS2. */
function VitalsOverview({
  state,
  readings,
  stale,
  onRetry,
  onOpenHistory,
}: {
  state: 'loading' | 'ready' | 'error';
  readings: PatientParameterReading[];
  stale: boolean;
  onRetry: () => void;
  onOpenHistory: () => void;
}) {
  if (state === 'error')
    return (
      <p className="vitals-note vitals-note--error" role="alert">
        Parametri non disponibili: non è stato possibile caricare le rilevazioni.{' '}
        <button type="button" className="link-btn" onClick={onRetry}>
          Riprova
        </button>
      </p>
    );
  if (state === 'loading')
    return (
      <p className="vitals-note" role="status">
        Caricamento dei parametri…
      </p>
    );
  const tiles = vitalTiles(readings);
  const n = news2Tile(readings);
  const newsTone =
    n.score === null
      ? 'none'
      : n.tone === 'high' || n.tone === 'medium'
        ? 'crit'
        : n.tone === 'single'
          ? 'warn'
          : 'none';
  return (
    <section className="vitals" aria-label="Ultimi parametri e NEWS2">
      {tiles.map((t) => (
        <div key={t.key} className={`vt vt--${t.tone}`}>
          <span className="vt__label">{t.label}</span>
          <span className="vt__value">
            {t.value ?? '—'}
            <small>{t.value === null ? 'non rilevato' : t.unit}</small>
          </span>
          <span className="vt__trend">
            {t.direction && (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={TREND_PATH[t.direction]} />
              </svg>
            )}
            {t.trend ?? (t.at ? `alle ${t.at}` : 'nessuna rilevazione')}
          </span>
        </div>
      ))}
      <button
        type="button"
        className={`vt vt--news2 vt--${newsTone}`}
        onClick={onOpenHistory}
        aria-label={
          n.score === null
            ? `NEWS2 non calcolabile${n.missing.length ? `: mancano ${n.missing.join(', ')}` : ''}. Apri lo storico NEWS2`
            : `NEWS2 ${n.score} alle ${n.at}: ${n.response}${stale ? '. Da aggiornare' : ''}. Apri lo storico NEWS2`
        }
      >
        <span className="vt__label">NEWS2{n.at ? ` · ${n.at}` : ''}</span>
        {n.score === null ? (
          <>
            <span className="vt__value vt__value--muted">Non calcolabile</span>
            <span className="vt__trend">
              {n.missing.length ? `Mancano ${n.missing.join(', ')}` : 'Nessuna rilevazione'}
            </span>
          </>
        ) : (
          <>
            <span className="vt__value">
              {n.score}
              <small>punti</small>
            </span>
            <span className="vt__trend">
              {stale ? 'Da aggiornare · ' : ''}
              {n.response}
            </span>
          </>
        )}
      </button>
    </section>
  );
}

const incompleteText = (n: number) =>
  n === 1 ? "c'è 1 rilevazione incompleta" : `ci sono ${n} rilevazioni incomplete`;

/** "08:05" se di oggi, altrimenti "24/09 08:05": un punteggio vecchio non sembra di oggi. */
function news2When(instant: string): string {
  const full = readingTime(instant); // "dd/mm/yyyy hh:mm"
  const today = readingTime(new Date().toISOString()).slice(0, 10);
  return full.slice(0, 10) === today ? full.slice(-5) : `${full.slice(0, 5)} ${full.slice(-5)}`;
}
function News2History({
  patientName,
  state,
  points,
  staleness,
  canLoadMore,
  loadingMore,
  loadMoreError,
  onRetry,
  onLoadMore,
  onClose,
}: {
  patientName: string;
  state: 'loading' | 'ready' | 'error';
  points: News2Point[];
  staleness: ReturnType<typeof news2Staleness>;
  canLoadMore: boolean;
  loadingMore: boolean;
  loadMoreError: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const latest = latestCompleteNews2(points);
  if (state !== 'ready')
    return (
      <AccessibleDialogSurface
        labelledBy={titleId}
        onClose={onClose}
        surfaceClassName="modal-box news2-dialog"
      >
        <div className="news2-dialog__head">
          <div>
            <h2 id={titleId} className="news2-dialog__title">
              Andamento NEWS2
            </h2>
            <p className="news2-dialog__sub">{patientName}</p>
          </div>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose}>
            Chiudi
          </button>
        </div>
        {state === 'loading' ? (
          <p className="news2-dialog__now news2-dialog__now--none">
            Caricamento delle rilevazioni…
          </p>
        ) : (
          <div className="news2-dialog__error" role="alert">
            <p>
              Non è stato possibile caricare le rilevazioni: il NEWS2 non è verificabile in questo
              momento. Le rilevazioni registrate non sono andate perse.
            </p>
            <button type="button" className="btn-primary btn-sm" onClick={onRetry}>
              Riprova
            </button>
          </div>
        )}
      </AccessibleDialogSurface>
    );

  return (
    <AccessibleDialogSurface
      labelledBy={titleId}
      onClose={onClose}
      surfaceClassName="modal-box news2-dialog"
    >
      <div className="news2-dialog__head">
        <div>
          <h2 id={titleId} className="news2-dialog__title">
            Andamento NEWS2
          </h2>
          <p className="news2-dialog__sub">{patientName}</p>
        </div>
        <button type="button" className="btn-secondary btn-sm" onClick={onClose}>
          Chiudi
        </button>
      </div>
      {latest ? (
        <p className={`news2-dialog__now news2-dialog__now--${news2Tone(latest)}`}>
          <strong>NEWS2 {latest.result.total}</strong> · {latest.result.response} · rilevazione del{' '}
          {readingTime(latest.reading.measuredAt)}
          {staleness.stale && (
            <span className="news2-dialog__stale">
              {staleness.newerIncomplete > 0
                ? `Da aggiornare: dopo questa ${incompleteText(staleness.newerIncomplete)}. Completa i sette parametri per un NEWS2 attuale.`
                : 'Da aggiornare: il punteggio ha più di 12 ore.'}
            </span>
          )}
        </p>
      ) : (
        <p className="news2-dialog__now news2-dialog__now--none">
          Nessuna rilevazione con tutti i sette parametri: il NEWS2 non è calcolabile.
        </p>
      )}
      <News2Chart points={points} />
      <div className="news2-table-wrap">
        <table className="news2-table">
          <thead>
            <tr>
              <th scope="col">Rilevazione</th>
              {NEWS2_PARAMETERS.map((key) => (
                <th scope="col" key={key}>
                  {NEWS2_LABELS[key]}
                </th>
              ))}
              <th scope="col">NEWS2</th>
            </tr>
          </thead>
          <tbody>
            {points.map(({ reading, result }) => (
              <tr
                key={reading.id}
                className={result.complete ? '' : 'news2-table__row--incomplete'}
              >
                <th scope="row">
                  {readingTime(reading.measuredAt)}
                  <small>{reading.authorName}</small>
                </th>
                {NEWS2_PARAMETERS.map((key) => {
                  const raw = reading.values[key];
                  const part = result.parts[key];
                  return (
                    <td key={key}>
                      {raw ? formatParameterValue(key, raw).split(' · ')[0] : '—'}
                      {part !== null && part > 0 && (
                        <span className={`news2-part news2-part--${part >= 3 ? 'high' : 'mid'}`}>
                          +{part}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="news2-table__total">
                  {result.complete ? (
                    <span className={badgeClass(news2Tone({ reading, result }))}>
                      {result.total}
                    </span>
                  ) : (
                    <span className="news2-table__missing">
                      Incompleta · mancano {result.missing.map((k) => NEWS2_LABELS[k]).join(', ')}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {points.length === 0 && (
          <p className="news2-dialog__empty">Nessuna rilevazione registrata.</p>
        )}
      </div>
      {loadMoreError && (
        <p className="news2-dialog__error" role="alert">
          Caricamento delle rilevazioni precedenti non riuscito. Riprova.
        </p>
      )}
      {canLoadMore && (
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={onLoadMore}
          disabled={loadingMore}
        >
          {loadingMore ? 'Caricamento…' : 'Carica rilevazioni precedenti'}
        </button>
      )}
      <p className="news2-dialog__note">
        NEWS2 (Royal College of Physicians, 2017), scala SpO₂ 1: per i pazienti con target 88–92%
        (es. BPCO) la scala 2 è una scelta del medico e non è applicata qui. Il punteggio è un
        supporto alla decisione e non sostituisce la valutazione clinica. Si calcola solo sulle
        rilevazioni con tutti i sette parametri.
      </p>
    </AccessibleDialogSurface>
  );
}

/** Andamento del punteggio nel tempo, con le fasce di risposta clinica sullo sfondo. */
function News2Chart({ points }: { points: News2Point[] }) {
  const complete = points
    .filter((p) => p.result.complete)
    .slice()
    .reverse();
  if (complete.length === 0) return null;
  const W = 640;
  const H = 180;
  const pad = { l: 32, r: 12, t: 12, b: 28 };
  const maxY = Math.max(10, ...complete.map((p) => p.result.total));
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / maxY);
  const times = complete.map((p) => new Date(p.reading.measuredAt).getTime());
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const x = (t: number) =>
    t1 === t0 ? (pad.l + W - pad.r) / 2 : pad.l + ((W - pad.l - pad.r) * (t - t0)) / (t1 - t0);
  const bands = [
    { from: 0, to: 0.5, cls: 'ok' },
    { from: 0.5, to: 4.5, cls: 'low' },
    { from: 4.5, to: 6.5, cls: 'medium' },
    { from: 6.5, to: maxY, cls: 'high' },
  ];
  const line = complete.map((p, i) => `${x(times[i])},${y(p.result.total)}`).join(' ');
  return (
    <figure className="news2-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Andamento del punteggio NEWS2 nel tempo"
      >
        {bands.map((b) => (
          <rect
            key={b.cls}
            className={`news2-chart__band news2-chart__band--${b.cls}`}
            x={pad.l}
            width={W - pad.l - pad.r}
            y={y(b.to)}
            height={y(b.from) - y(b.to)}
          />
        ))}
        {[0, 5, 7].map((v) => (
          <text key={v} className="news2-chart__axis" x={pad.l - 6} y={y(v) + 4} textAnchor="end">
            {v}
          </text>
        ))}
        <polyline className="news2-chart__line" points={line} fill="none" />
        {complete.map((p, i) => (
          <circle
            key={p.reading.id}
            className={`news2-chart__dot news2-chart__dot--${news2Tone(p)}`}
            cx={x(times[i])}
            cy={y(p.result.total)}
            r={5}
          >
            <title>{`NEWS2 ${p.result.total} · ${readingTime(p.reading.measuredAt)}`}</title>
          </circle>
        ))}
        <text className="news2-chart__axis" x={pad.l} y={H - 8}>
          {readingTime(complete[0].reading.measuredAt)}
        </text>
        {complete.length > 1 && (
          <text className="news2-chart__axis" x={W - pad.r} y={H - 8} textAnchor="end">
            {readingTime(complete[complete.length - 1].reading.measuredAt)}
          </text>
        )}
      </svg>
      <figcaption className="news2-chart__legend">
        <span className="news2-chart__key news2-chart__key--low">1–4 monitoraggio</span>
        <span className="news2-chart__key news2-chart__key--medium">5–6 valutazione urgente</span>
        <span className="news2-chart__key news2-chart__key--high">≥ 7 emergenza</span>
      </figcaption>
    </figure>
  );
}
