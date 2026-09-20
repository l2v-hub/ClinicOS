import { useState } from 'react';
import { PARAMETER_PERIODS, type ParameterPeriodPreset } from '../../lib/patientParameterWorkspace';
import { trendPeriodError, type TrendPeriod } from '../../lib/patientParameterTrends';

interface Props {
  preset: ParameterPeriodPreset | 'custom';
  period: TrendPeriod;
  onPreset: (preset: ParameterPeriodPreset) => void;
  onCustom: (period: TrendPeriod) => void;
}
export function PatientParameterPeriodFilter({ preset, period, onPreset, onCustom }: Props) {
  const [customOpen, setCustomOpen] = useState(false);
  const [draft, setDraft] = useState(period);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="parameter-workspace-period">
      <div className="filter-chips" role="group" aria-label="Periodo delle rilevazioni">
        {PARAMETER_PERIODS.map((item) => (
          <button
            type="button"
            key={item.key}
            className={`filter-chip${preset === item.key ? ' active' : ''}`}
            aria-pressed={preset === item.key}
            onClick={() => {
              setCustomOpen(false);
              setError(null);
              onPreset(item.key);
            }}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          className={`filter-chip${preset === 'custom' ? ' active' : ''}`}
          aria-pressed={preset === 'custom'}
          aria-expanded={customOpen}
          onClick={() => {
            setDraft(period);
            setError(null);
            setCustomOpen((value) => !value);
          }}
        >
          Personalizzato
        </button>
      </div>
      {customOpen && (
        <form
          className="parameter-trends-range"
          onSubmit={(event) => {
            event.preventDefault();
            const message = trendPeriodError(draft);
            setError(message);
            if (!message) onCustom({ ...draft });
          }}
        >
          {(['start', 'end'] as const).map((key) => (
            <label key={key}>
              {key === 'start' ? 'Dal' : 'Al'}
              <input
                type="date"
                className="form-input"
                required
                min="2000-01-01"
                max="2099-12-31"
                value={draft[key]}
                onChange={(event) => {
                  setDraft({ ...draft, [key]: event.target.value });
                  setError(null);
                }}
              />
            </label>
          ))}
          <button type="submit" className="btn-secondary btn-sm">
            Applica periodo
          </button>
          <span>Fino a 366 giorni</span>
          {error && (
            <p role="alert" className="parameter-trends-error">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
