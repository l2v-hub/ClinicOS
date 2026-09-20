import { useId, type Dispatch, type SetStateAction } from 'react';
import type { TherapyFormValue } from './TherapyFormFields';
import {
  ADMIN_UNITS,
  DIVISIBLE_UNITS,
  FRACTION_PRESETS,
  administrationUnitForForm,
  computeEquivalent,
  formatFraction,
  hasDividedPatch,
  isPatchUnit,
  parseQuantity,
  type ScheduleRow,
} from './therapyDose';

interface Props {
  value: TherapyFormValue;
  onChange: (value: TherapyFormValue) => void;
  customQty: Record<number, string>;
  setCustomQty: Dispatch<SetStateAction<Record<number, string>>>;
}

export function TherapyScheduleEditor({ value, onChange, customQty, setCustomQty }: Props) {
  const id = useId();
  const strengthNum = value.commercialStrengthValue.trim()
    ? Number(value.commercialStrengthValue)
    : null;
  const updateSchedule = (idx: number, patch: Partial<ScheduleRow>) =>
    onChange({
      ...value,
      schedules: value.schedules.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    });
  const addSchedule = () =>
    onChange({
      ...value,
      schedules: [
        ...value.schedules,
        {
          time: '18:00',
          quantityNumerator: 1,
          quantityDenominator: 1,
          administrationUnit:
            value.schedules.at(-1)?.administrationUnit ||
            administrationUnitForForm(value.pharmaceuticalForm),
        },
      ],
    });
  const removeSchedule = (idx: number) => {
    onChange({ ...value, schedules: value.schedules.filter((_, i) => i !== idx) });
    // Keep each draft with its remaining row after removal.
    setCustomQty((current) =>
      Object.fromEntries(
        Object.entries(current)
          .filter(([key]) => Number(key) !== idx)
          .map(([key, draft]) => [Number(key) > idx ? Number(key) - 1 : Number(key), draft]),
      ),
    );
  };

  return (
    <div className="sched-editor therapy-schedules">
      {value.schedules.length === 0 && (
        <p className="form-hint">Aggiungi un orario e indica la dose da somministrare.</p>
      )}
      {value.schedules.map((s, i) => {
        const divisible = DIVISIBLE_UNITS.has(s.administrationUnit);
        const eq = computeEquivalent(
          s.quantityNumerator,
          s.quantityDenominator,
          strengthNum,
          value.commercialStrengthUnit,
        );
        return (
          <div key={i} className="sched-row therapy-schedules__row">
            <div className="form-group therapy-schedules__time">
              <label htmlFor={`${id}-time-${i}`}>Orario {i + 1}</label>
              <input
                id={`${id}-time-${i}`}
                className="form-input"
                type="time"
                value={s.time}
                onChange={(e) => updateSchedule(i, { time: e.target.value })}
              />
            </div>
            <div className="form-group therapy-schedules__quantity">
              <label htmlFor={`${id}-quantity-${i}`}>
                Quantità <span className="therapy-form__sr">orario {i + 1}</span>
              </label>
              <div className="sched-row__qty">
                {divisible ? (
                  <>
                    {FRACTION_PRESETS.filter((p) => value.allowedFractions.includes(p.key)).map(
                      (p) => (
                        <button
                          key={p.key}
                          type="button"
                          aria-label={`${p.key} ${s.administrationUnit}, orario ${i + 1}`}
                          aria-pressed={
                            s.quantityNumerator === p.num && s.quantityDenominator === p.den
                          }
                          className={`qty-chip${s.quantityNumerator === p.num && s.quantityDenominator === p.den ? ' qty-chip--on' : ''}`}
                          onClick={() => {
                            updateSchedule(i, {
                              quantityNumerator: p.num,
                              quantityDenominator: p.den,
                            });
                            setCustomQty((c) => ({ ...c, [i]: '' }));
                          }}
                        >
                          {p.label}
                        </button>
                      ),
                    )}
                    <input
                      id={`${id}-quantity-${i}`}
                      className="form-input qty-chip__other"
                      placeholder="Altro: es. 1/3"
                      value={customQty[i] ?? ''}
                      onChange={(e) => setCustomQty((c) => ({ ...c, [i]: e.target.value }))}
                      onBlur={(e) => {
                        const parsed = parseQuantity(e.target.value);
                        if (parsed)
                          updateSchedule(i, {
                            quantityNumerator: parsed.num,
                            quantityDenominator: parsed.den,
                          });
                      }}
                    />
                  </>
                ) : (
                  <input
                    id={`${id}-quantity-${i}`}
                    className="form-input qty-chip__other"
                    type="number"
                    min={isPatchUnit(s.administrationUnit) ? '1' : '0'}
                    step={isPatchUnit(s.administrationUnit) ? '1' : 'any'}
                    placeholder="Quantità"
                    value={
                      s.quantityDenominator === 1
                        ? String(s.quantityNumerator)
                        : s.quantityNumerator / s.quantityDenominator
                    }
                    onChange={(e) => {
                      const parsed = parseQuantity(e.target.value);
                      if (parsed)
                        updateSchedule(i, {
                          quantityNumerator: parsed.num,
                          quantityDenominator: parsed.den,
                        });
                    }}
                  />
                )}
              </div>
            </div>
            <div className="form-group therapy-schedules__unit">
              <label htmlFor={`${id}-unit-${i}`}>
                Unità <span className="therapy-form__sr">orario {i + 1}</span>
              </label>
              <select
                id={`${id}-unit-${i}`}
                className="form-select"
                value={s.administrationUnit}
                onChange={(e) => updateSchedule(i, { administrationUnit: e.target.value })}
              >
                <option value="">Seleziona unità</option>
                {ADMIN_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn-secondary therapy-schedules__remove"
              title={`Rimuovi orario ${i + 1}`}
              aria-label={`Rimuovi orario ${i + 1}`}
              onClick={() => removeSchedule(i)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                aria-hidden="true"
              >
                <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7" />
              </svg>
            </button>
            <div className="sched-row__resolved">
              {s.time} — {formatFraction(s.quantityNumerator, s.quantityDenominator)}{' '}
              {s.administrationUnit}
              {eq && (
                <>
                  {' '}
                  — <strong>equivalente a {eq}</strong>
                </>
              )}
            </div>
          </div>
        );
      })}
      <button type="button" className="btn-secondary therapy-schedules__add" onClick={addSchedule}>
        + Aggiungi orario
      </button>
      {hasDividedPatch(value.schedules) && (
        <p className="form-hint" role="alert">
          I cerotti non possono essere divisi: indica una quantità intera.
        </p>
      )}
    </div>
  );
}
