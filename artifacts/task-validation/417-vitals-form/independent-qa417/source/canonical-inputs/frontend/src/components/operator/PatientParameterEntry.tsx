import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../../config';
import { getCurrentOperator, operatorHeaders } from '../../lib/operatorSession';
import {
  ParameterReadingSaveError,
  createParameterReadingRequest,
  parameterValuesIssue,
  saveParameterReading,
  type ParameterReadingRequest,
  type ParameterValues,
  type PatientParameterReading,
} from '../../lib/patientParameterReadings';
import { ParameterEntryClock } from './ParameterEntryClock';
import { ParameterReadingForm } from './ParameterReadingForm';

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
    if (saving || uncertain) return;
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
    const invalid = parameterValuesIssue(values);
    if (invalid) {
      setError(invalid.message);
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
      <ParameterReadingForm
        patientId={patientId}
        values={values}
        saving={saving}
        uncertain={uncertain}
        error={error}
        savedAt={savedAt}
        pendingAt={pending.current?.measuredAt}
        onChange={update}
        onSave={save}
        onOpenHistory={onShowToday}
      />
    </section>
  );
}
