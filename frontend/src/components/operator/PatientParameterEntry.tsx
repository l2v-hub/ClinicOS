import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../../config';
import { getCurrentOperator, operatorHeaders } from '../../lib/operatorSession';
import {
  PARAMETER_FIELDS,
  ParameterReadingSaveError,
  createParameterReadingRequest,
  parameterValuesError,
  readingTime,
  saveParameterReading,
  type ParameterReadingRequest,
  type ParameterValues,
  type PatientParameterReading,
} from '../../lib/patientParameterReadings';
import { ParameterEntryClock } from './ParameterEntryClock';

interface Props {
  patientId: string;
  operatorId: string;
  onSaved: (reading: PatientParameterReading) => void;
  onDayChange: (day: string) => void;
  onShowToday: () => void;
}
export function PatientParameterEntry({
  patientId,
  operatorId,
  onSaved,
  onDayChange,
  onShowToday,
}: Props) {
  const [values, setValues] = useState<ParameterValues>({});
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState('');
  const pending = useRef<ParameterReadingRequest | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  function update(key: keyof ParameterValues, value: string) {
    setValues((previous) => ({ ...previous, [key]: value }));
    setError('');
    setSavedAt('');
    pending.current = null;
  }
  async function save() {
    if (inFlight.current) return;
    if (getCurrentOperator()?.id !== operatorId) {
      setError('La sessione operatore è cambiata. Riapri la scheda prima di salvare.');
      return;
    }
    const invalid = parameterValuesError(values);
    if (invalid) {
      setError(invalid);
      return;
    }
    pending.current ??= createParameterReadingRequest(values);
    inFlight.current = true;
    setSaving(true);
    setError('');
    setSavedAt('');
    try {
      const { reading } = await saveParameterReading(API_URL, patientId, pending.current, {
        headers: operatorHeaders(),
      });
      if (!mounted.current || getCurrentOperator()?.id !== operatorId) return;
      pending.current = null;
      setValues({});
      setUncertain(false);
      setSavedAt(reading.measuredAt);
      onSaved(reading);
    } catch (cause) {
      if (!mounted.current || getCurrentOperator()?.id !== operatorId) return;
      const unknownOutcome = !(cause instanceof ParameterReadingSaveError) || cause.uncertain;
      setUncertain(unknownOutcome);
      if (!unknownOutcome) pending.current = null;
      setError(cause instanceof Error ? cause.message : 'Salvataggio non verificato. Riprova.');
    } finally {
      inFlight.current = false;
      if (mounted.current) setSaving(false);
    }
  }
  return (
    <section className="parameter-single-entry" aria-label="Registra parametri del paziente">
      <div className="parameter-single-entry__heading">
        <h3>Nuova rilevazione</h3>
        <ParameterEntryClock onDayChange={onDayChange} />
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={saving || uncertain} className="parameter-single-entry__fields">
          <legend className="sr-only">Valori da registrare</legend>
          {PARAMETER_FIELDS.map((field) => (
            <label key={field.key}>
              <span>
                {field.label} {field.unit && <small>{field.unit}</small>}
              </span>
              <input
                className="form-input"
                aria-label={`Nuova rilevazione ${field.label}`}
                value={values[field.key] ?? ''}
                inputMode={['pa', 'evacuazione'].includes(field.key) ? 'text' : 'decimal'}
                maxLength={field.key === 'evacuazione' ? 200 : 32}
                placeholder={field.key === 'pa' ? '120/80' : '—'}
                onChange={(event) => update(field.key, event.target.value)}
              />
            </label>
          ))}
        </fieldset>
        <details className="parameter-single-entry__notes">
          <summary>Note sulla rilevazione</summary>
          <textarea
            className="form-input"
            aria-label="Note della nuova rilevazione"
            rows={2}
            maxLength={2000}
            disabled={saving || uncertain}
            value={values.note ?? ''}
            onChange={(event) => update('note', event.target.value)}
          />
        </details>
        <div className="parameter-single-entry__actions">
          <span>Data e ora vengono registrate quando premi Salva.</span>
          <button type="submit" className="btn-primary" disabled={saving} aria-busy={saving}>
            {saving ? 'Salvataggio…' : uncertain ? 'Riprova salvataggio' : 'Salva rilevazione'}
          </button>
        </div>
      </form>
      {error && (
        <div role="alert" className="parameter-trends-error">
          <p>{error}</p>
          {uncertain && pending.current && (
            <p>
              Rilevazione del {readingTime(pending.current.measuredAt)}. Riprova per verificare lo
              stesso salvataggio.
            </p>
          )}
        </div>
      )}
      {savedAt && (
        <div className="parameter-single-entry__success" role="status">
          <span>Rilevazione salvata · {readingTime(savedAt)}</span>
          <button type="button" className="link-btn" onClick={onShowToday}>
            Mostra oggi
          </button>
        </div>
      )}
    </section>
  );
}
