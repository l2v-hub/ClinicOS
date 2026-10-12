import { useId, useState } from 'react';
import {
  extraDoseLabel,
  glucoseRuleDoseText,
  glucoseScaleDoseUnit,
  glucoseScaleRows,
  ruleForGlucose,
} from './glucoseScale';
import { GlucoseScaleSummary } from './GlucoseScaleEditor';

/** Preview is informational: the server independently resolves and validates the actual dose. */
export function GlucoseAdministrationControl({
  protocol,
  target,
  sending,
  onConfirm,
}: {
  protocol: unknown;
  target: string;
  sending: boolean;
  /** `doseText`: primary dose in the scale unit plus every extra dose ("15 unità + 5 unità EV (bolo)"). */
  onConfirm: (measuredGlucose: number, units: number, doseText: string) => void;
}) {
  const id = useId();
  const [value, setValue] = useState('');
  const doseUnit = glucoseScaleDoseUnit(protocol);
  const measured = value.trim() ? Number(value) : null;
  const rule = measured === null ? null : ruleForGlucose(protocol, measured);
  const units = rule?.units ?? null;
  return (
    <div
      className="therapy-glucose-confirm"
      role="group"
      aria-label={`Schema glicemico: ${target}`}
    >
      <label htmlFor={id}>Glicemia rilevata (mg/dL)</label>
      <input
        id={id}
        className="form-input"
        type="number"
        min="10"
        max="1000"
        step="1"
        inputMode="numeric"
        value={value}
        disabled={sending}
        aria-invalid={(measured !== null && units === null) || undefined}
        onChange={(event) => setValue(event.target.value)}
      />
      {measured !== null && rule !== null && (
        <span className="therapy-glucose-confirm__dose" role="status">
          Dose prevista:{' '}
          <strong>
            {rule.units} {doseUnit}
          </strong>
          {(rule.extraDoses ?? []).map((extra, index) => (
            <span key={index} className="therapy-glucose-confirm__extra">
              + <strong>{extraDoseLabel(extra)}</strong>
            </span>
          ))}
        </span>
      )}
      {measured !== null && units === null && (
        <span className="therapy-glucose-confirm__warning" role="alert">
          Valore non coperto: verifica la prescrizione.
        </span>
      )}
      <details>
        <summary>Visualizza schema prescritto</summary>
        <GlucoseScaleSummary rows={glucoseScaleRows(protocol)} doseUnit={doseUnit} />
      </details>
      <button
        type="button"
        className="ds-btn ds-btn--primary therapy-action-btn"
        disabled={sending || units === null}
        aria-label={`Conferma somministrazione secondo glicemia: ${target}`}
        onClick={() => {
          if (measured !== null && rule !== null)
            onConfirm(measured, rule.units, glucoseRuleDoseText(rule, doseUnit));
        }}
      >
        {sending ? 'Invio…' : 'Conferma somministrazione'}
      </button>
    </div>
  );
}
