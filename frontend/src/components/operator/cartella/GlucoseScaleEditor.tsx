import { useId } from 'react';
import {
  GLUCOSE_SCALE_DOSE_UNITS,
  MAX_EXTRA_DOSES,
  glucoseRowLabel,
  glucoseScaleFormWarnings,
  validateGlucoseScaleRows,
  type GlucoseDoseRuleForm,
  type GlucoseExtraDoseForm,
  type GlucoseScaleDoseUnit,
} from './glucoseScale';
import { therapyFieldFeedback, type TherapyFieldIssue } from './therapyFieldFeedback';

const UNIT_LABELS: Record<GlucoseScaleDoseUnit, string> = {
  unità: 'Unità (sottocute)',
  'ml/h': 'ml/h (pompa)',
};

/** Non-blocking: what to compare with the document. Amber, never the error/brand red. */
export function GlucoseScaleWarnings({ warnings }: { warnings: readonly string[] }) {
  if (!warnings.length) return null;
  return (
    <ul className="glucose-scale-warnings" role="status" aria-label="Avvisi sullo schema glicemico">
      {warnings.map((warning) => (
        <li key={warning}>{warning}</li>
      ))}
    </ul>
  );
}

export function GlucoseScaleSummary({
  rows,
  doseUnit = 'unità',
  warnings = [],
}: {
  rows: GlucoseDoseRuleForm[];
  doseUnit?: GlucoseScaleDoseUnit;
  warnings?: readonly string[];
}) {
  return (
    <>
      <ul aria-label="Schema glicemico prescritto">
        {rows.map((row, index) => (
          <li key={index}>{glucoseRowLabel(row, doseUnit)}</li>
        ))}
      </ul>
      <GlucoseScaleWarnings warnings={warnings} />
    </>
  );
}

const emptyExtraDose = (): GlucoseExtraDoseForm => ({
  amount: '',
  unit: 'unità',
  route: '',
  label: '',
});

export function GlucoseScaleEditor({
  value,
  onChange,
  doseUnit = 'unità',
  onDoseUnitChange,
  issues,
}: {
  value: GlucoseDoseRuleForm[];
  onChange: (rows: GlucoseDoseRuleForm[]) => void;
  doseUnit?: GlucoseScaleDoseUnit;
  onDoseUnitChange?: (unit: GlucoseScaleDoseUnit) => void;
  issues?: readonly TherapyFieldIssue[];
}) {
  const id = useId();
  const feedback = therapyFieldFeedback(id, issues);
  const { errors } = validateGlucoseScaleRows(value, doseUnit);
  const warnings = glucoseScaleFormWarnings(value);
  const update = (index: number, patch: Partial<GlucoseDoseRuleForm>) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const updateExtra = (index: number, extraIndex: number, patch: Partial<GlucoseExtraDoseForm>) =>
    update(index, {
      extraDoses: (value[index]?.extraDoses ?? []).map((extra, i) =>
        i === extraIndex ? { ...extra, ...patch } : extra,
      ),
    });
  const removeExtra = (index: number, extraIndex: number) =>
    onChange(
      value.map((row, i) => {
        if (i !== index) return row;
        const extraDoses = (row.extraDoses ?? []).filter((_, j) => j !== extraIndex);
        const next: GlucoseDoseRuleForm = {
          minMgDl: row.minMgDl,
          maxMgDl: row.maxMgDl,
          units: row.units,
        };
        return extraDoses.length ? { ...next, extraDoses } : next;
      }),
    );
  return (
    <div
      className="glucose-scale-editor"
      role="group"
      aria-labelledby={`${id}-heading`}
      tabIndex={-1}
      {...feedback.attributes('glucoseScale')}
      aria-invalid={errors.length > 0 || undefined}
    >
      {feedback.error('glucoseScale')}
      <div className="glucose-scale-editor__heading">
        <div>
          <strong id={`${id}-heading`}>Schema glicemico prescritto</strong>
          <p className="form-hint">
            Trascrivi solo le fasce indicate nella prescrizione. La dose sarà determinata dopo la
            rilevazione, non dall’orario.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={value.length >= 32}
          onClick={() => onChange([...value, { minMgDl: '', maxMgDl: '', units: '' }])}
        >
          + Aggiungi fascia
        </button>
      </div>
      <div className="glucose-scale-editor__unit" role="group" aria-label="Unità della dose">
        {GLUCOSE_SCALE_DOSE_UNITS.map((unit) => (
          <button
            key={unit}
            type="button"
            className="ds-btn ds-btn--secondary"
            aria-pressed={doseUnit === unit}
            onClick={() => onDoseUnitChange?.(unit)}
          >
            {UNIT_LABELS[unit]}
          </button>
        ))}
      </div>
      <div className="glucose-scale-editor__rows">
        {value.map((row, index) => (
          <div className="glucose-scale-editor__band" key={index}>
            <div className="glucose-scale-editor__row">
              <label>
                Da (mg/dL)
                <input
                  className="form-input"
                  type="number"
                  min="10"
                  max="1000"
                  step="1"
                  value={row.minMgDl}
                  onChange={(event) => update(index, { minMgDl: event.target.value })}
                />
              </label>
              <label>
                A (mg/dL)
                <input
                  className="form-input"
                  type="number"
                  min="10"
                  max="1000"
                  step="1"
                  placeholder="Senza limite"
                  value={row.maxMgDl}
                  onChange={(event) => update(index, { maxMgDl: event.target.value })}
                />
              </label>
              <label>
                {doseUnit === 'ml/h' ? 'Velocità (ml/h)' : 'Dose (unità)'}
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  max="1000"
                  step="0.5"
                  value={row.units}
                  onChange={(event) => update(index, { units: event.target.value })}
                />
              </label>
              <button
                type="button"
                className="btn-secondary btn-sm"
                aria-label={`Rimuovi fascia ${index + 1}`}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                Rimuovi
              </button>
            </div>
            {(row.extraDoses ?? []).map((extra, extraIndex) => (
              <div
                className="glucose-scale-editor__extra"
                key={extraIndex}
                role="group"
                aria-label={`Dose aggiuntiva ${extraIndex + 1} della fascia ${index + 1}`}
              >
                <label>
                  Quantità
                  <input
                    className="form-input"
                    type="number"
                    min="0.5"
                    max="1000"
                    step="0.5"
                    value={extra.amount}
                    onChange={(event) =>
                      updateExtra(index, extraIndex, { amount: event.target.value })
                    }
                  />
                </label>
                <label>
                  Unità
                  <select
                    className="form-select"
                    value={extra.unit}
                    onChange={(event) =>
                      updateExtra(index, extraIndex, {
                        unit: event.target.value as GlucoseScaleDoseUnit,
                      })
                    }
                  >
                    {GLUCOSE_SCALE_DOSE_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Via
                  <input
                    className="form-input"
                    type="text"
                    placeholder="es. EV, SC"
                    value={extra.route}
                    onChange={(event) =>
                      updateExtra(index, extraIndex, { route: event.target.value })
                    }
                  />
                </label>
                <label>
                  Descrizione
                  <input
                    className="form-input"
                    type="text"
                    placeholder="es. bolo"
                    value={extra.label}
                    onChange={(event) =>
                      updateExtra(index, extraIndex, { label: event.target.value })
                    }
                  />
                </label>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  aria-label={`Rimuovi dose aggiuntiva ${extraIndex + 1} della fascia ${index + 1}`}
                  onClick={() => removeExtra(index, extraIndex)}
                >
                  Rimuovi
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-secondary btn-sm glucose-scale-editor__add-extra"
              disabled={(row.extraDoses?.length ?? 0) >= MAX_EXTRA_DOSES}
              aria-label={`Aggiungi dose aggiuntiva alla fascia ${index + 1}`}
              onClick={() =>
                update(index, { extraDoses: [...(row.extraDoses ?? []), emptyExtraDose()] })
              }
            >
              + Dose aggiuntiva
            </button>
          </div>
        ))}
      </div>
      {errors.length > 0 && (
        <ul className="glucose-scale-editor__errors" role="alert">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      <GlucoseScaleWarnings warnings={warnings} />
      <p className="form-hint">
        Un valore non coperto blocca la somministrazione: verifica la prescrizione senza inventare
        una dose.
      </p>
    </div>
  );
}
