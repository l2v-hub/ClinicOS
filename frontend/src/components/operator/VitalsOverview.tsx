import { useId, useState } from 'react';
import { AccessibleDialogSurface } from '../shared/AccessibleDialogSurface';
import { news2Tile, vitalTiles } from '../../lib/patientVitalsOverview';
import type { PatientParameterReading } from '../../lib/patientParameterReadings';
import { useCan } from '../../lib/capabilities';
import { useWidgetOpen } from '../shared/WidgetGroup';

interface Props {
  state: 'loading' | 'ready' | 'error';
  readings: PatientParameterReading[];
  stale: boolean;
  onRetry: () => void;
  onOpenHistory: () => void;
  onRecordNow?: () => void;
}

export function VitalsOverview({
  state,
  readings,
  stale,
  onRetry,
  onOpenHistory,
  onRecordNow,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const { open, setOpen, bodyId } = useWidgetOpen();
  const titleId = useId();
  const canRecord = useCan('parameters.create_reading');
  if (state === 'error')
    return (
      <p className="vitals-note vitals-note--error" role="alert">
        Parametri non disponibili.{' '}
        <button type="button" className="ds-link" onClick={onRetry}>
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
  const tone =
    n.tone === 'high' || n.tone === 'medium' ? 'crit' : n.tone === 'single' ? 'warn' : 'none';
  const detail =
    n.score === null
      ? n.missing.length
        ? `Mancano ${n.missing.join(', ')}`
        : 'Nessuna rilevazione'
      : `${stale ? 'Da aggiornare · ' : ''}${n.response}`;
  function history() {
    setExpanded(false);
    onOpenHistory();
  }
  const grid = (large: boolean) => (
    <div className={`vitals${large ? ' vitals--expanded' : ''}`}>
      {tiles.map((tile) => (
        <div key={tile.key} className={`vt vt--${tile.tone}`}>
          <span className="vt__label">{tile.label}</span>
          <span className="vt__value">
            {tile.value ?? '—'}
            <small>{tile.value === null ? 'non rilevato' : tile.unit}</small>
          </span>
          <span className="vt__trend">{tile.at ? `alle ${tile.at}` : 'nessuna rilevazione'}</span>
          {large && tile.trend && <span className="vt__trend">{tile.trend}</span>}
        </div>
      ))}
      <button
        type="button"
        className={`vt vt--news2 vt--${tone}`}
        onClick={history}
        aria-haspopup="dialog"
        aria-label={`NEWS2 ${n.score ?? 'non calcolabile'}${n.at ? ` alle ${n.at}` : ''}: ${detail}. Apri lo storico NEWS2`}
      >
        <span className="vt__label">NEWS2</span>
        <span className="vt__value">
          {n.score ?? '—'}
          <small>{n.score === null ? 'non calcolabile' : 'punti'}</small>
        </span>
        <span className="vt__trend">{n.at ?? 'nessuna rilevazione'}</span>
      </button>
    </div>
  );
  return (
    <section className="vitals-summary" aria-label="Ultimi parametri e NEWS2">
      <div className="vitals-summary__head">
        <button type="button" className="ds-icon-btn" aria-expanded={open} aria-controls={bodyId} aria-label={`${open ? 'Comprimi' : 'Espandi'} ultimi parametri`} onClick={()=>setOpen(!open)}>{open ? '▾' : '▸'}</button>
        <h2>Ultimi parametri</h2>
        <div className="vitals-summary__actions">
          {onRecordNow && canRecord && (
            <button
              type="button"
              className="ds-link"
              onClick={onRecordNow}
              aria-label="Rileva ora i parametri di questo paziente"
            >
              Rileva ora
            </button>
          )}
          <button
            type="button"
            className="icon-btn"
            aria-label="Espandi ultimi parametri e NEWS2"
            title="Espandi parametri"
            aria-haspopup="dialog"
            onClick={() => setExpanded(true)}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M3 3l6 6M21 3l-6 6M3 21l6-6M21 21l-6-6" />
            </svg>
          </button>
        </div>
      </div>
      <div id={bodyId} hidden={!open}>
      {grid(false)}
      <p className={`vitals-summary__status vitals-summary__status--${tone}`}>
        <strong>NEWS2:</strong> {detail}
      </p>
      </div>
      {expanded && (
        <AccessibleDialogSurface
          labelledBy={titleId}
          onClose={() => setExpanded(false)}
          surfaceClassName="modal-box vitals-dialog"
        >
          <div className="vitals-summary__head">
            <h2 id={titleId}>Ultimi parametri e NEWS2</h2>
            <button
              type="button"
              className="icon-btn"
              data-dialog-initial-focus
              aria-label="Chiudi parametri espansi"
              onClick={() => setExpanded(false)}
            >
              ×
            </button>
          </div>
          {grid(true)}
          <p className="vitals-summary__status">{detail}</p>
          <button type="button" className="ds-btn ds-btn--secondary" onClick={history}>
            Apri storico completo
          </button>
        </AccessibleDialogSurface>
      )}
    </section>
  );
}
