import { useId, useState } from 'react';
import { IcoChevronDown, IcoFilter } from '../../icons';
import './TableFilters.css';

export type TableFilterType = 'text' | 'select' | 'date';

export interface TableFilterField {
  key: string;
  label: string;
  type?: TableFilterType;
  options?: { value: string; label: string }[];
}

interface TableFiltersProps {
  tableLabel: string;
  fields: TableFilterField[];
  values: Record<string, string>;
  resultCount: number;
  totalCount?: number;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
}

export function TableFilters({
  tableLabel,
  fields,
  values,
  resultCount,
  totalCount,
  onChange,
  onClear,
}: TableFiltersProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const activeCount = fields.filter((field) => Boolean(values[field.key])).length;

  return (
    <section
      className={`table-filters${open ? ' is-open' : ''}`}
      aria-label={`Filtri ${tableLabel}`}
    >
      <div className="table-filters__toolbar">
        <button
          type="button"
          className="table-filters__toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="table-filters__icon" aria-hidden="true">
            <IcoFilter />
          </span>
          <span className="table-filters__toggle-copy">
            <span className="table-filters__title">Filtra risultati</span>
            <span className="table-filters__hint">
              {activeCount > 0
                ? `${activeCount} ${activeCount === 1 ? 'filtro attivo' : 'filtri attivi'}`
                : `${fields.length} ${fields.length === 1 ? 'campo disponibile' : 'campi disponibili'}`}
            </span>
          </span>
          {activeCount > 0 && (
            <span
              className="table-filters__active-badge"
              aria-label={`${activeCount} ${activeCount === 1 ? 'filtro attivo' : 'filtri attivi'}`}
            >
              {activeCount}
            </span>
          )}
          <span className="table-filters__chevron" aria-hidden="true">
            <IcoChevronDown />
          </span>
        </button>

        <div className="table-filters__summary">
          <span className="table-filters__results" aria-live="polite">
            {totalCount !== undefined && totalCount !== resultCount
              ? `${resultCount} di ${totalCount} risultati`
              : `${resultCount} ${resultCount === 1 ? 'risultato' : 'risultati'}`}
          </span>
          {activeCount > 0 && (
            <button type="button" className="table-filters__clear" onClick={onClear}>
              Azzera filtri
            </button>
          )}
        </div>
      </div>

      {open && (
        <div id={panelId} className="table-filters__panel">
          <div className={`table-filters__grid table-filters__grid--${Math.min(fields.length, 4)}`}>
            {fields.map((field) => {
              const inputId = `${panelId}-${field.key}`;
              const value = values[field.key] ?? '';

              return (
                <div key={field.key} className="table-filters__field">
                  <label htmlFor={inputId}>{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      id={inputId}
                      value={value}
                      onChange={(event) => onChange(field.key, event.target.value)}
                    >
                      <option value="">Qualsiasi valore</option>
                      {(field.options ?? []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'date' ? (
                    <input
                      id={inputId}
                      type="date"
                      value={value}
                      onChange={(event) => onChange(field.key, event.target.value)}
                    />
                  ) : (
                    <input
                      id={inputId}
                      type="search"
                      value={value}
                      placeholder={`Cerca per ${field.label.toLowerCase()}`}
                      onChange={(event) => onChange(field.key, event.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
