import type { CapabilityType, Sensitivity } from '../../../lib/authzPolicyApi';
import {
  EMPTY_FILTERS,
  SENSITIVITY_LABEL,
  TYPE_LABEL,
  filtersActive,
  type CapabilityFilters,
} from './rolePermissionsModel';

interface FilterBarProps {
  value: CapabilityFilters;
  onChange: (next: CapabilityFilters) => void;
  shown: number;
  total: number;
}

/** Filtri condivisi da Matrice / Per ruolo / Per capability. */
export function FilterBar({ value, onChange, shown, total }: FilterBarProps) {
  const set = (patch: Partial<CapabilityFilters>) => onChange({ ...value, ...patch });
  return (
    <div className="rp-filters" role="search" aria-label="Filtra capability">
      <label className="rp-filters__field rp-filters__field--grow">
        <span className="rp-filters__label">Cerca</span>
        <input
          type="search"
          className="form-input"
          placeholder="Nome, codice o dominio"
          value={value.text}
          onChange={(event) => set({ text: event.target.value })}
        />
      </label>
      <label className="rp-filters__field">
        <span className="rp-filters__label">Tipo</span>
        <select
          className="form-select"
          value={value.type}
          onChange={(event) => set({ type: event.target.value as CapabilityType | 'all' })}
        >
          <option value="all">Tutti</option>
          {(Object.keys(TYPE_LABEL) as CapabilityType[]).map((type) => (
            <option key={type} value={type}>
              {TYPE_LABEL[type]}
            </option>
          ))}
        </select>
      </label>
      <label className="rp-filters__field">
        <span className="rp-filters__label">Sensibilità</span>
        <select
          className="form-select"
          value={value.sensitivity}
          onChange={(event) => set({ sensitivity: event.target.value as Sensitivity | 'all' })}
        >
          <option value="all">Tutte</option>
          {(Object.keys(SENSITIVITY_LABEL) as Sensitivity[]).map((level) => (
            <option key={level} value={level}>
              {SENSITIVITY_LABEL[level]}
            </option>
          ))}
        </select>
      </label>
      <div className="rp-filters__chips">
        <button
          type="button"
          className="ds-chip"
          aria-pressed={value.onlyDoubtful}
          onClick={() => set({ onlyDoubtful: !value.onlyDoubtful })}
        >
          Solo dubbie
        </button>
        <button
          type="button"
          className="ds-chip"
          aria-pressed={value.onlyModified}
          onClick={() => set({ onlyModified: !value.onlyModified })}
        >
          Solo modificate
        </button>
        {filtersActive(value) && (
          <button
            type="button"
            className="ds-btn ds-btn--secondary"
            onClick={() => onChange(EMPTY_FILTERS)}
          >
            Azzera filtri
          </button>
        )}
      </div>
      <span className="rp-filters__count" aria-live="polite">
        {shown} di {total} capability
      </span>
    </div>
  );
}
