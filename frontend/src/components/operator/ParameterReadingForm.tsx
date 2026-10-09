import { useId, useRef, useState } from 'react';
import {
  ENTRY_FIELDS,
  entryFieldForError,
  nextEntryField,
  type EntryFieldKey,
} from '../../lib/parameterEntrySchema';
import {
  applyPadKey,
  padInput,
  padUpdate,
  padValue,
  previousText,
  type PadField,
  type PreviousKey,
} from '../../lib/parameterPad';
import {
  parameterValuesIssue,
  readingTime,
  type ParameterValues,
} from '../../lib/patientParameterReadings';
import { usePreviousParameterValues } from '../../lib/usePreviousParameterValues';
import { useRecencyClock } from '../../lib/useRecencyClock';
import { news2, NEWS2_LABELS } from '../../lib/news2';
import './ParameterReadingForm.css';

interface Props {
  patientId: string;
  values: ParameterValues;
  saving: boolean;
  uncertain: boolean;
  error: string;
  savedAt?: string | null;
  pendingAt?: string;
  noteSummary?: string;
  onChange: (key: keyof ParameterValues, value: string) => void;
  onSave: () => void | Promise<void>;
  onOpenHistory: () => void;
}
/** Shared presentation. Each workspace retains its own session/draft/save ownership. */
export function ParameterReadingForm({
  patientId,
  values,
  saving,
  uncertain,
  error,
  savedAt,
  pendingAt,
  noteSummary,
  onChange,
  onSave,
  onOpenHistory,
}: Props) {
  const prefix = useId();
  const [active, setActive] = useState<EntryFieldKey | null>(null);
  const [invalid, setInvalid] = useState<ReturnType<typeof parameterValuesIssue>>(null);
  const fields = useRef(
    new Map<EntryFieldKey, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(),
  );
  const saveButton = useRef<HTMLButtonElement>(null);
  const previous = usePreviousParameterValues(patientId);
  const now = useRecencyClock();
  const locked = saving || uncertain;
  const score = news2(values);
  const activeNumeric = ENTRY_FIELDS.find((field) => field.key === active && field.numeric);
  const errorId = `${prefix}-error`;
  function update(key: keyof ParameterValues, value: string) {
    if (locked) return;
    setInvalid(null);
    onChange(key, value);
  }
  function focus(key: EntryFieldKey | null) {
    if (key) {
      setActive(key);
      fields.current.get(key)?.focus();
    } else saveButton.current?.focus();
  }
  function submit() {
    if (saving) return;
    const issue = parameterValuesIssue(values);
    setInvalid(issue);
    if (issue) {
      focus(entryFieldForError(issue.field));
      return;
    }
    void onSave();
  }
  function press(key: string) {
    if (locked || !activeNumeric) return;
    const padKey = activeNumeric.key as PadField;
    const [field, value] = padUpdate(
      values,
      padKey,
      applyPadKey(padValue(values, padKey), key, !!activeNumeric.decimals),
    );
    update(field, value);
  }
  return (
    <form
      className="parameter-reading-form"
      aria-label="Nuova rilevazione"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="parameter-reading-form__layout">
        <fieldset disabled={locked} className="parameter-reading-form__fields">
          <legend>Nuovi valori da registrare, separati dalle misure precedenti</legend>
          {ENTRY_FIELDS.map((field) => {
            const id = `${prefix}-${field.key}`;
            const historical = !['evacuazione', 'note'].includes(field.key);
            const affected =
              (!!invalid && invalid.field === null && field.key === 'fr') ||
              invalid?.field === field.key ||
              (invalid?.field === 'pa' && ['pas', 'pad'].includes(field.key));
            const common = {
              id,
              className: 'form-input',
              'aria-label': `Nuova rilevazione ${field.label}`,
              'aria-invalid': affected || undefined,
              'aria-describedby':
                [
                  historical ? `${id}-previous` : '',
                  affected ? errorId : '',
                  field.key === 'o2' || field.key === 'coscienza' ? `${prefix}-news2-help` : '',
                ]
                  .filter(Boolean)
                  .join(' ') || undefined,
              value: field.numeric
                ? padValue(values, field.key as PadField)
                : (values[field.key as keyof ParameterValues] ?? ''),
              onFocus: () => setActive(field.key),
              ref: (element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null) => {
                if (element) fields.current.set(field.key, element);
                else fields.current.delete(field.key);
              },
            };
            return (
              <label
                key={field.key}
                htmlFor={id}
                className={`parameter-reading-form__field${field.key === 'note' ? ' parameter-reading-form__field--note' : ''}`}
              >
                <span>
                  {field.label} {field.unit && <small>{field.unit}</small>}
                </span>
                {field.options ? (
                  <select
                    {...common}
                    onChange={(event) =>
                      update(field.key as keyof ParameterValues, event.target.value)
                    }
                  >
                    <option value="">—</option>
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.key === 'note' ? (
                  <textarea
                    {...common}
                    rows={2}
                    maxLength={2000}
                    onChange={(event) => update('note', event.target.value)}
                  />
                ) : (
                  <input
                    {...common}
                    type="text"
                    placeholder="—"
                    inputMode={field.numeric ? (field.decimals ? 'decimal' : 'numeric') : 'text'}
                    maxLength={field.numeric ? undefined : 200}
                    onChange={(event) => {
                      if (!field.numeric) {
                        update(field.key as keyof ParameterValues, event.target.value);
                        return;
                      }
                      const next = padInput(values, field.key as PadField, event.target.value);
                      if (next) {
                        update(next.field, next.value);
                        if (next.split) focus('pad');
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        focus(nextEntryField(field.key));
                      }
                    }}
                  />
                )}
                {historical && (
                  <small id={`${id}-previous`} className="parameter-reading-form__previous">
                    {previousText(previous, field.key as PreviousKey, now)}
                  </small>
                )}
                {field.key === 'note' && noteSummary && <small>{noteSummary}</small>}
              </label>
            );
          })}
        </fieldset>
        <div className="parameter-reading-form__tools">
          <div
            role="group"
            aria-label="Tastierino numerico"
            className="parameter-reading-form__pad"
          >
            {['7', '8', '9', '4', '5', '6', '1', '2', '3', ',', '0', 'back'].map((key) => (
              <button
                type="button"
                key={key}
                className="ds-btn ds-btn--secondary"
                disabled={locked || !activeNumeric || (key === ',' && !activeNumeric.decimals)}
                aria-label={key === 'back' ? 'Cancella' : key === ',' ? 'Virgola' : key}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => press(key)}
              >
                {key === 'back' ? '⌫' : key}
              </button>
            ))}
          </div>
          <small>
            Seleziona un campo numerico. Il tastierino aggiunge o cancella in fondo al valore.
          </small>
          <button
            type="button"
            className="ds-btn ds-btn--secondary"
            disabled={locked}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => focus(nextEntryField(active))}
          >
            Campo successivo
          </button>
          <div className="parameter-reading-form__news2" role="status" aria-live="polite">
            <strong>NEWS2 in tempo reale · {score.complete ? score.total : '—'}</strong>
            <p>
              {score.complete
                ? score.response
                : `Mancano: ${score.missing.map((key) => NEWS2_LABELS[key]).join(', ')}`}
            </p>
          </div>
          <p id={`${prefix}-news2-help`} className="parameter-reading-form__help">
            NEWS2 usa i sette parametri della stessa rilevazione e la scala SpO₂ 1. O₂ indica
            l’ossigeno supplementare; coscienza usa ACVPU. Un punteggio incompleto non è un NEWS2
            valido.
          </p>
          <small>Data e ora vengono registrate quando premi Salva.</small>
          <button
            ref={saveButton}
            type="submit"
            className="ds-btn ds-btn--primary"
            disabled={saving}
            aria-busy={saving}
            onFocus={() => setActive(null)}
          >
            {saving ? 'Salvataggio…' : uncertain ? 'Riprova salvataggio' : 'Salva rilevazione'}
          </button>
          {(invalid || error) && (
            <div role="alert" id={errorId} className="parameter-trends-error">
              <p>{invalid?.message ?? error}</p>
              {uncertain && (
                <>
                  <p>
                    Rilevazione del {pendingAt ? readingTime(pendingAt) : 'salvataggio in verifica'}
                    . Riprova per verificare lo stesso salvataggio.
                  </p>
                  <button
                    type="button"
                    className="ds-link"
                    onFocus={() => setActive(null)}
                    onClick={onOpenHistory}
                  >
                    Controlla lo storico
                  </button>
                </>
              )}
            </div>
          )}
          {savedAt && (
            <div role="status" className="parameter-single-entry__success">
              <span>Rilevazione salvata · {readingTime(savedAt)}</span>
              <button
                type="button"
                className="ds-link"
                onFocus={() => setActive(null)}
                onClick={onOpenHistory}
              >
                Mostra lo storico
              </button>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
