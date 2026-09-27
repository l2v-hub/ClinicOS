import { IcoCalendar, IcoChevronLeft, IcoChevronRight } from '../../icons';

interface Props {
  /** L'intervallo mostrato contiene oggi: "Oggi" è evidenziato e annunciato come data corrente. */
  isToday: boolean;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
  prevLabel?: string;
  nextLabel?: string;
  todayLabel?: string;
  /** Campo data (YYYY-MM-DD) facoltativo, per saltare a un giorno qualsiasi. */
  date?: string;
  onDateChange?: (value: string) => void;
  dateLabel?: string;
  /** Limiti del calendario: il passo oltre il limite non è disponibile. */
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  /** Nome del gruppo per i lettori di schermo (es. "Data del giro"). */
  groupLabel?: string;
}

/** Navigazione per data del design system: stessa forma in Terapia, Agenda e ovunque serva. */
export function DateNav({
  isToday,
  onPrev,
  onToday,
  onNext,
  prevLabel = 'Giorno precedente',
  nextLabel = 'Giorno successivo',
  todayLabel = 'Vai a oggi',
  date,
  onDateChange,
  dateLabel = 'Data',
  prevDisabled = false,
  nextDisabled = false,
  groupLabel = 'Navigazione per data',
}: Props) {
  return (
    <div className="ds-date-nav" role="group" aria-label={groupLabel}>
      <button
        type="button"
        className="ds-icon-btn"
        aria-label={prevLabel}
        disabled={prevDisabled}
        onClick={onPrev}
      >
        <IcoChevronLeft />
      </button>
      <button
        type="button"
        className={`ds-chip${isToday ? ' is-active' : ''}`}
        aria-current={isToday ? 'date' : undefined}
        aria-label={todayLabel}
        onClick={onToday}
      >
        <IcoCalendar /> Oggi
      </button>
      {date !== undefined && onDateChange && (
        <label className="ds-date-nav__field">
          <span className="ds-sr-only">{dateLabel}</span>
          <input
            className="ds-date-nav__input"
            type="date"
            value={date}
            min="1900-01-01"
            max="9999-12-31"
            onChange={(event) => onDateChange(event.target.value)}
          />
        </label>
      )}
      <button
        type="button"
        className="ds-icon-btn"
        aria-label={nextLabel}
        disabled={nextDisabled}
        onClick={onNext}
      >
        <IcoChevronRight />
      </button>
    </div>
  );
}
