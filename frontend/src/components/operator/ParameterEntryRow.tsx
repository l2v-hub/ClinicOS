import { useRef, useState } from 'react';
import { IcoMessage } from '../../icons';
import type { ParameterPagePatient } from '../../lib/patientParametersPage';
import {
  PARAMETER_FIELDS,
  createParameterReadingRequest,
  parameterValuesError,
  ParameterReadingSaveError,
  readingTime,
  type ParameterValues,
  type PatientParameterReading,
  type ParameterReadingRequest,
} from '../../lib/patientParameterReadings';

function thresholdClass(key: string, value = '') {
  if (!value.trim()) return '';
  const number = Number(value.replace(',', '.'));
  if (key === 'spo2' && number < 92) return ' qe-row__input--critico';
  if (key === 'temperatura' && number >= 37.5) return ' qe-row__input--attenzione';
  return '';
}
interface Props {
  patient: ParameterPagePatient;
  room?: string;
  bed?: string;
  lastReadingAt?: string | null;
  readingCount?: number;
  onOpenHistory: () => void;
  onSave: (request: ParameterReadingRequest) => Promise<PatientParameterReading>;
}
export function ParameterEntryRow({
  patient,
  room,
  bed,
  lastReadingAt,
  readingCount = 0,
  onOpenHistory,
  onSave,
}: Props) {
  const [values, setValues] = useState<ParameterValues>({});
  const [notesOpen, setNotesOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const pending = useRef<ParameterReadingRequest | null>(null);
  const inFlight = useRef(false);
  const name = `${patient.firstName} ${patient.lastName}`;
  const hasValues = PARAMETER_FIELDS.some((field) => values[field.key]?.trim());
  function update(key: keyof ParameterValues, value: string) {
    setValues((previous) => ({ ...previous, [key]: value }));
    setError('');
    setSavedAt(null);
    pending.current = null;
  }
  async function save() {
    if (inFlight.current) return;
    const invalid = parameterValuesError(values);
    if (invalid) {
      setError(invalid);
      return;
    }
    pending.current ??= createParameterReadingRequest(values);
    inFlight.current = true;
    setSaving(true);
    setError('');
    try {
      const saved = await onSave(pending.current);
      pending.current = null;
      setValues({});
      setSavedAt(saved.measuredAt);
      setUncertain(false);
      setNotesOpen(false);
    } catch (cause) {
      const unknownOutcome = !(cause instanceof ParameterReadingSaveError) || cause.uncertain;
      setUncertain(unknownOutcome);
      if (!unknownOutcome) pending.current = null;
      setError(cause instanceof Error ? cause.message : 'Salvataggio non verificato. Riprova.');
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }
  return (
    <div className="qe-row parameter-entry-row" role="group" aria-label={`Parametri ${name}`}>
      <button
        type="button"
        className="qe-row__patient parameter-entry-patient"
        onClick={onOpenHistory}
        aria-label={`Apri storico parametri di ${name}`}
      >
        <span className="qe-row__avatar">
          {`${patient.firstName?.[0] ?? ''}${patient.lastName?.[0] ?? ''}`.toUpperCase()}
        </span>
        <span className="parameter-entry-patient__text">
          <span className="qe-row__name">{name}</span>
          <span className="qe-row__room">
            {room ? `Camera ${room}${bed ? ` · Letto ${bed}` : ''}` : 'Camera non assegnata'}
          </span>
          {lastReadingAt && (
            <span className="parameter-entry-last">
              {readingCount} oggi · ultima {readingTime(lastReadingAt).slice(-5)}
            </span>
          )}
        </span>
      </button>
      {PARAMETER_FIELDS.map((field) => (
        <label
          key={field.key}
          className={`qe-row__field${['pa', 'evacuazione'].includes(field.key) ? ' qe-row__field--wide' : ''}`}
        >
          <span className="qe-row__mobile-label">
            {field.label}
            {field.unit && ` · ${field.unit}`}
          </span>
          <input
            className={`form-input qe-row__input${thresholdClass(field.key, values[field.key])}`}
            value={values[field.key] ?? ''}
            placeholder="—"
            aria-label={`${field.label} per ${name}`}
            disabled={saving || uncertain}
            maxLength={field.key === 'evacuazione' ? 200 : 32}
            inputMode={['pa', 'evacuazione'].includes(field.key) ? 'text' : 'decimal'}
            onChange={(event) => update(field.key, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void save();
              }
            }}
          />
        </label>
      ))}
      <button
        type="button"
        className={`btn-secondary qe-row__note-btn${values.note ? ' qe-row__note-btn--has-note' : ''}`}
        aria-label={`${notesOpen ? 'Chiudi' : 'Apri'} note per ${name}`}
        aria-expanded={notesOpen}
        onClick={() => setNotesOpen((value) => !value)}
      >
        <IcoMessage />
        <span>Note</span>
      </button>
      <button
        type="button"
        className="btn-success qe-row__save"
        disabled={saving || !hasValues}
        aria-busy={saving}
        aria-label={`Salva parametri per ${name}`}
        onClick={() => void save()}
      >
        {saving ? 'Salvo…' : uncertain ? 'Riprova' : 'Salva'}
      </button>
      {notesOpen && (
        <div className="qe-row__note-input">
          <textarea
            className="form-input qe-row__note-textarea"
            aria-label={`Note per ${name}`}
            value={values.note ?? ''}
            disabled={saving || uncertain}
            maxLength={2000}
            rows={2}
            onChange={(event) => update('note', event.target.value)}
          />
        </div>
      )}
      {savedAt && (
        <div className="parameter-entry-result" role="status">
          Rilevazione archiviata · {readingTime(savedAt)}{' '}
          <button className="link-btn" type="button" onClick={onOpenHistory}>
            Apri storico
          </button>
        </div>
      )}
      {error && (
        <div className="qe-row__error" role="alert">
          {error}
          {uncertain && (
            <button className="link-btn" type="button" onClick={onOpenHistory}>
              Controlla lo storico
            </button>
          )}
        </div>
      )}
    </div>
  );
}
