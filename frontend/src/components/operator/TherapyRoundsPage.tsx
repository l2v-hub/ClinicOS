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
import { DateNav } from '../shared/DateNav';
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
  const FILTRI: { key: FiltroStato; label: string; count: number }[] = [
    { key: 'tutte', label: 'Tutte', count: 0 },
    { key: 'pending', label: 'Da erogare', count: s?.pending ?? 0 },
    { key: 'administered', label: 'Erogate', count: s?.administered ?? 0 },
    { key: 'not_administered', label: 'Non erogate', count: s?.notAdministered ?? 0 },
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
                className="ds-chip giro-slot"
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
                className="ds-chip"
                aria-pressed={filtro === f.key}
                onClick={() => setFiltro(f.key)}
              >
                {f.label}
                {f.count > 0 && <span className="ds-chip__count">{f.count}</span>}
              </button>
            ))}
          </div>
        )}
        <div className="giro-tools__right">
          <DateNav
            isToday={date === localIsoDate()}
            onPrev={() => changeDate(shiftCalendarDate(date, -1))}
            onToday={() => changeDate(localIsoDate())}
            onNext={() => changeDate(shiftCalendarDate(date, 1))}
            date={date}
            onDateChange={changeDate}
            dateLabel="Data terapia"
            todayLabel="Oggi"
            groupLabel="Data del giro"
          />
          <button
            type="button"
            className="ds-chip"
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
