import { useState } from 'react';
import type {
  TherapyActionInfo,
  TherapySlot,
  TherapySlotPageInfo,
  MotivoNonErogazione,
} from '../../types';
import { PageHeader } from '../shared/PageHeader';
import { RosterOrderControl } from '../shared/RosterOrderControl';
import { TherapySlotCard } from '../shared/TherapySlotOverlay';
import { TherapySlotModal } from './TherapySlotModal';
import { localIsoDate } from '../../lib/appointmentRange';
import { isCalendarDate, shiftCalendarDate } from '../../lib/patientTherapyCalendar';
import { IcoChevronLeft, IcoChevronRight } from '../../icons';

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
  function changeDate(value: string) {
    if (!isCalendarDate(value)) return;
    setSelected(null);
    setDate(value);
    onLoad(value);
  }
  const active = !loading && !error ? slots.find((slot) => slot.id === selected) : undefined;
  return (
    <div className="agt-view">
      <PageHeader
        breadcrumb={[{ label: 'ClinicOS' }, { label: 'Terapia' }]}
        title="Terapia giornaliera"
        subtitle={new Date(`${date}T12:00:00`).toLocaleDateString('it-IT', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
        actions={
          <div className="agt-nav">
            <button
              type="button"
              className="agt-nav-btn"
              aria-label="Giorno precedente"
              onClick={() => changeDate(shiftCalendarDate(date, -1))}
            >
              <IcoChevronLeft />
            </button>
            <button
              type="button"
              className="agt-today-btn"
              onClick={() => changeDate(localIsoDate())}
            >
              Oggi
            </button>
            <label>
              Data terapia{' '}
              <input
                className="form-input"
                type="date"
                value={date}
                min="1900-01-01"
                max="9999-12-31"
                onChange={(event) => changeDate(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="agt-nav-btn"
              aria-label="Giorno successivo"
              onClick={() => changeDate(shiftCalendarDate(date, 1))}
            >
              <IcoChevronRight />
            </button>
          </div>
        }
      />
      <RosterOrderControl />
      {loading && <p role="status">Caricamento terapie…</p>}
      {!loading && error && (
        <div role="alert" className="empty-state-card">
          <p>{error}</p>
          <button type="button" className="btn-secondary" onClick={() => onLoad(date)}>
            Riprova
          </button>
        </div>
      )}
      {!loading && !error && (
        <>
          <p>
            Somministrazioni dei pazienti, ordinate per orario. Seleziona una fascia per vedere il
            dettaglio.
          </p>
          {pageInfo.hasMore && (
            <div className="empty-state-card" role="status">
              <strong>Visualizzazione parziale</strong>
              <span>Totali esatti; dettagli caricati per {pageInfo.loadedTherapies} terapie.</span>
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
          {slots.length === 0 ? (
            <p className="empty-state-card">Nessuna terapia programmata per questa data.</p>
          ) : (
            <section className="agt-day-wrap" aria-label="Fasce di somministrazione">
              {[...slots]
                .sort((a, b) => a.ora.localeCompare(b.ora))
                .map((slot) => (
                  <TherapySlotCard key={slot.id} slot={slot} onClick={() => setSelected(slot.id)} />
                ))}
            </section>
          )}
        </>
      )}
      {active && (
        <TherapySlotModal
          slot={active}
          date={date}
          onClose={() => setSelected(null)}
          readOnly={readOnly}
          detailsPartial={pageInfo.hasMore}
          loadingMore={loadingMore}
          loadMoreError={loadMoreError}
          onLoadMore={onLoadMore}
          onConfirm={readOnly ? undefined : onConfirm}
          onNotAdministered={readOnly ? undefined : onNotAdministered}
        />
      )}
    </div>
  );
}
