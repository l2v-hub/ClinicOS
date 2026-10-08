import { useId } from 'react';
import { validateGlucoseScaleRows, type GlucoseDoseRuleForm } from './glucoseScale';
import { therapyFieldFeedback, type TherapyFieldIssue } from './therapyFieldFeedback';

export function GlucoseScaleSummary({ rows }: { rows: GlucoseDoseRuleForm[] }) {
  return (
    <ul aria-label="Schema glicemico prescritto">
      {rows.map((row, index) => (
        <li key={index}>
          {row.minMgDl || '?'}–{row.maxMgDl || 'oltre'} mg/dL → {row.units || '?'} unità
        </li>
      ))}
    </ul>
  );
}

export function GlucoseScaleEditor({
  value,
  onChange,
  issues,
}: {
  value: GlucoseDoseRuleForm[];
  onChange: (rows: GlucoseDoseRuleForm[]) => void;
  issues?: readonly TherapyFieldIssue[];
}) {
  const id = useId();
  const feedback = therapyFieldFeedback(id, issues);
  const { errors } = validateGlucoseScaleRows(value);
  const update = (index: number, patch: Partial<GlucoseDoseRuleForm>) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
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
      <div className="glucose-scale-editor__rows">
        {value.map((row, index) => (
          <div className="glucose-scale-editor__row" key={index}>
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
              Dose (unità)
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
        ))}
      </div>
      {errors.length > 0 && (
        <ul className="glucose-scale-editor__errors" role="alert">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      <p className="form-hint">
        Un valore non coperto blocca la somministrazione: verifica la prescrizione senza inventare
        una dose.
      </p>
    </div>
  );
}
