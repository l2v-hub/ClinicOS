import { useState } from 'react';
import type {
  TherapyActionInfo,
  TherapySlot,
  TherapySlotPageInfo,
  MotivoNonErogazione,
} from '../../types';
import { PageHeader } from '../shared/PageHeader';
import { RosterOrderControl } from '../shared/RosterOrderControl';
import { TherapyGiroRows, type FiltroStato } from './TherapyGiroRows';
import { localIsoDate } from '../../lib/appointmentRange';
import { isCalendarDate, shiftCalendarDate } from '../../lib/patientTherapyCalendar';
import { initialSlotId, slotDone, sortedSlots } from '../../lib/therapyGiro';
import { IcoChevronLeft, IcoChevronRight } from '../../icons';
import './TherapyRoundsPage.css';

interface Props {
  slots: TherapySlot[];
  loading: boolean;
  error: string | null;
  pageInfo: TherapySlotPageInfo;
  loadingMore: boolean;
  loadMoreError: string | null;
  onLoad: (date: string) => void;
  onLoadMore: () => void;
  readOnly?: boolean;
  onConfirm: (info: TherapyActionInfo) => void;
  onNotAdministered: (info: TherapyActionInfo, reason: MotivoNonErogazione, note: string) => void;
}

export function TherapyRoundsPage({
  slots,
  loading,
  error,
  pageInfo,
  loadingMore,
  loadMoreError,
  onLoad,
  onLoadMore,
  readOnly = false,
  onConfirm,
  onNotAdministered,
}: Props) {
  const [date, setDate] = useState(localIsoDate);
  const [selected, setSelected] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroStato>('tutte');
  const [showOrder, setShowOrder] = useState(false);
  function changeDate(value: string) {
    if (!isCalendarDate(value)) return;
    setSelected(null);
    setDate(value);
    onLoad(value);
  }
  const ready = !loading && !error;
  const ordered = sortedSlots(slots);
  // La fascia si fissa una volta per data, appena arrivano i dati: ricalcolarla a ogni render la
  // farebbe saltare alla fascia successiva quando l'ultima riga da fare diventa erogata, e un
  // secondo clic finirebbe su un'altra fascia. Si ricalcola solo se la fascia scelta sparisce.
  if (ready && ordered.length > 0 && !ordered.some((slot) => slot.id === selected))
    setSelected(initialSlotId(ordered));
  const activeId = ordered.some((s) => s.id === selected) ? selected : null;
  const active = ordered.find((s) => s.id === activeId);
  const done = active ? slotDone(active) : 0;
  const total = active?.summary.total ?? 0;
  const s = active?.summary;
  const FILTRI: { key: FiltroStato; label: string }[] = [
    { key: 'tutte', label: 'Tutte' },
    { key: 'pending', label: `Da erogare${s && s.pending > 0 ? ` (${s.pending})` : ''}` },
    {
      key: 'administered',
      label: `Erogate${s && s.administered > 0 ? ` (${s.administered})` : ''}`,
    },
    {
      key: 'not_administered',
      label: `Non erogate${s && s.notAdministered > 0 ? ` (${s.notAdministered})` : ''}`,
    },
  ];
  const dayLabel = new Date(`${date}T12:00:00`).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return (
    <div className="giro-view">
      <PageHeader
        title="Giro terapia"
        subtitle={`Somministrazioni per fascia oraria · ${dayLabel}`}
      />
      {ready && active && (
        <div className="giro-bar">
          <div className="giro-slots" role="group" aria-label="Fascia oraria">
            {ordered.map((slot) => (
              <button
                type="button"
                key={slot.id}
                className="giro-chip giro-chip--slot"
                aria-pressed={slot.id === activeId}
                aria-label={`${slot.label}, ore ${slot.ora}: ${slotDone(slot)} fatte su ${slot.summary.total}${slot.summary.pending > 0 ? `, ${slot.summary.pending} da erogare` : ''}`}
                onClick={() => setSelected(slot.id)}
              >
                {slot.ora} · {slotDone(slot)}/{slot.summary.total}
              </button>
            ))}
          </div>
          <div className="giro-progress">
            <div
              className="giro-progress__track"
              role="progressbar"
              aria-label={`Avanzamento fascia delle ${active.ora}`}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
            >
              <i style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }} />
            </div>
            <span className="giro-progress__count">
              {done}/{total}
            </span>
          </div>
        </div>
      )}
      <div className="giro-tools">
        {ready && active && (
          <div className="giro-filters" role="group" aria-label="Stato della somministrazione">
            {FILTRI.map((f) => (
              <button
                type="button"
                key={f.key}
                className="giro-chip giro-chip--small"
                aria-pressed={filtro === f.key}
                onClick={() => setFiltro(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
        <div className="giro-tools__right">
          <div className="giro-date" role="group" aria-label="Data del giro">
            <button
              type="button"
              className="giro-icon-btn"
              aria-label="Giorno precedente"
              onClick={() => changeDate(shiftCalendarDate(date, -1))}
            >
              <IcoChevronLeft />
            </button>
            <button
              type="button"
              className="giro-chip giro-chip--small"
              aria-pressed={date === localIsoDate()}
              onClick={() => changeDate(localIsoDate())}
            >
              Oggi
            </button>
            <label>
              <span className="giro-sr">Data terapia</span>
              <input
                className="form-input giro-date__input"
                type="date"
                value={date}
                min="1900-01-01"
                max="9999-12-31"
                onChange={(event) => changeDate(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="giro-icon-btn"
              aria-label="Giorno successivo"
              onClick={() => changeDate(shiftCalendarDate(date, 1))}
            >
              <IcoChevronRight />
            </button>
          </div>
          <button
            type="button"
            className="giro-chip giro-chip--small"
            aria-expanded={showOrder}
            aria-controls="giro-order"
            onClick={() => setShowOrder((v) => !v)}
          >
            Ordine del giro
          </button>
        </div>
      </div>
      {showOrder && (
        <div id="giro-order">
          <RosterOrderControl />
        </div>
      )}
      {loading && <p role="status">Caricamento terapie…</p>}
      {!loading && error && (
        <div role="alert" className="empty-state-card">
          <p>{error}</p>
          <button type="button" className="btn-secondary" onClick={() => onLoad(date)}>
            Riprova
          </button>
        </div>
      )}
      {ready && ordered.length === 0 && (
        <p className="empty-state-card">Nessuna terapia programmata per questa data.</p>
      )}
      {ready && active && pageInfo.hasMore && (
        <div className="giro-note-box" role="status">
          <span>
            <strong>Visualizzazione parziale.</strong> I totali sono esatti; dettagli caricati per{' '}
            {pageInfo.loadedTherapies} terapie.
          </span>
          {loadMoreError && <span role="alert">{loadMoreError}</span>}
          <button
            type="button"
            className="btn-secondary"
            disabled={loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore ? 'Caricamento…' : 'Carica altre terapie'}
          </button>
        </div>
      )}
      {ready && active && (
        <TherapyGiroRows
          key={`${active.id}|${filtro}`}
          slot={active}
          date={date}
          filtro={filtro}
          readOnly={readOnly}
          detailsPartial={pageInfo.hasMore}
          onConfirm={readOnly ? undefined : onConfirm}
          onNotAdministered={readOnly ? undefined : onNotAdministered}
        />
      )}
    </div>
  );
}
