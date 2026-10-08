import { useId, useState } from 'react';
import { doseForGlucose, glucoseScaleRows } from './glucoseScale';
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
  onConfirm: (measuredGlucose: number, units: number) => void;
}) {
  const id = useId();
  const [value, setValue] = useState('');
  const measured = value.trim() ? Number(value) : null;
  const units = measured === null ? null : doseForGlucose(protocol, measured);
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
      {measured !== null && units !== null && (
        <span className="therapy-glucose-confirm__dose" role="status">
          Dose prevista: <strong>{units} unità</strong>
        </span>
      )}
      {measured !== null && units === null && (
        <span className="therapy-glucose-confirm__warning" role="alert">
          Valore non coperto: verifica la prescrizione.
        </span>
      )}
      <details>
        <summary>Visualizza schema prescritto</summary>
        <GlucoseScaleSummary rows={glucoseScaleRows(protocol)} />
      </details>
      <button
        type="button"
        className="ds-btn ds-btn--primary therapy-action-btn"
        disabled={sending || units === null}
        aria-label={`Conferma somministrazione secondo glicemia: ${target}`}
        onClick={() => {
          if (measured !== null && units !== null) onConfirm(measured, units);
        }}
      >
        {sending ? 'Invio…' : 'Conferma somministrazione'}
      </button>
    </div>
  );
}
