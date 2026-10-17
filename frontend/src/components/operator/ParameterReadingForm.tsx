import { useEffect, useId, useRef, useState } from 'react';
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
  previousPlaceholder,
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
  const [showPad, setShowPad] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)');
    const update = () => setShowPad(media.matches && navigator.maxTouchPoints > 0);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
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
            const scoreKey = field.key === 'pas' || field.key === 'pad' ? 'pa' : field.key;
            const abnormal = ((score.parts as Record<string, number | null>)[scoreKey] ?? 0) > 0;
            const common = {
              id,
              className: 'form-input',
              'aria-label': `Nuova rilevazione ${field.label}`,
              'aria-invalid': affected || undefined,
              'aria-describedby':
                [
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
                {field.key === 'o2' ? (
                  <div
                    role="group"
                    aria-label={`Nuova rilevazione ${field.label}`}
                    className="parameter-oxygen-choices"
                  >
                    {[
                      ['no', 'Aria ambiente'],
                      ['si', 'Con O₂'],
                    ].map(([option, label]) => (
                      <button
                        key={option}
                        type="button"
                        className="ds-btn ds-btn--secondary"
                        aria-pressed={values.o2 === option}
                        onClick={() => update('o2', option)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                ) : field.options ? (
                  <select
                    {...common}
                    onChange={(event) =>
                      update(field.key as keyof ParameterValues, event.target.value)
                    }
                  >
                    <option value="">
                      {historical
                        ? previousPlaceholder(previous, field.key as PreviousKey, now) || '—'
                        : '—'}
                    </option>
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
                    className={`${common.className}${abnormal ? ' parameter-reading-form__input--attention' : ''}`}
                    type="text"
                    placeholder={
                      historical ? previousPlaceholder(previous, field.key as PreviousKey, now) : ''
                    }
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

                {field.key === 'note' && noteSummary && <small>{noteSummary}</small>}
              </label>
            );
          })}
        </fieldset>
        <div className="parameter-reading-form__tools">
          {showPad && (
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
          )}
          {previous.status === 'error' && (
            <small role="status">
              Storico precedente non disponibile.{' '}
              <button type="button" className="ds-link" onClick={onOpenHistory}>
                Apri storico
              </button>
            </small>
          )}
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
            <span>
              NEWS2 {score.complete ? score.total : `parziale ${score.total}`} ·{' '}
              {score.complete
                ? score.response
                : `mancano ${score.missing.map((key) => NEWS2_LABELS[key]).join(', ')}`}
            </span>
          </div>
          <details className="parameter-reading-form__help">
            <summary>Informazioni NEWS2</summary>
            <p id={`${prefix}-news2-help`}>
              NEWS2 usa i sette parametri della stessa rilevazione e la scala SpO₂ 1; O₂ indica
              ossigeno supplementare e coscienza usa ACVPU. Un punteggio parziale non è un NEWS2
              valido.
            </p>
          </details>
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
