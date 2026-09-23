import { useEffect, useId, useRef } from 'react';
import type {
  AssessmentDraft,
  AssessmentDraftStore,
} from '../../../lib/assessments/assessmentDraftStore';
import type { Gds15Answers } from '../../../lib/assessments/gds15Types';
import {
  GDS15_ITEMS,
  GDS15_EDITOR_INSTRUCTION,
  GDS15_SCREENING_NOTE,
  answeredGds15,
  gds15Result,
  validGds15Notes,
} from '../../../lib/assessments/gds15Definition';
import { AssessmentDateFields } from './AssessmentDateFields';
export function GdsForm({
  draft,
  store,
  onSave,
  onPreview,
}: {
  draft: AssessmentDraft;
  store: AssessmentDraftStore;
  onSave: () => void;
  onPreview: () => void;
}) {
  const id = useId();
  const root = useRef<HTMLFormElement>(null);
  const answers = draft.fields.answers as Gds15Answers;
  const locked = draft.busy || !!draft.pending;
  const count = answeredGds15(answers),
    result = gds15Result(answers);
  const noteLength = [...answers.notes].length;
  const notesError = !validGds15Notes(answers.notes);
  const missing = draft.failure?.missingPaths ?? [];
  const update = (next: Gds15Answers) => store.update(draft.key, { answers: next });
  useEffect(() => {
    const path = draft.failure?.missingPaths?.[0];
    if (!path) return;
    const field = [
      ...(root.current?.querySelectorAll<HTMLElement>('[data-field-path]') ?? []),
    ].find((element) => element.dataset.fieldPath === path);
    field?.focus();
    field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [draft.failure]);
  return (
    <form
      ref={root}
      className="assessment-form gds-form"
      aria-busy={draft.busy}
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <AssessmentDateFields draft={draft} store={store} />
      <p className="assessment-hint gds-instruction">{GDS15_EDITOR_INSTRUCTION}</p>
      <p role="status" className="assessment-progress">
        {count} di 15 risposte ·{' '}
        {result
          ? `${result.total}/15 · ${result.label} (anteprima dello screening)`
          : 'Compilazione incompleta: nessun risultato o fascia.'}
      </p>
      {GDS15_ITEMS.map((item, index) => (
        <fieldset key={item.id} className="assessment-item" disabled={locked}>
          <legend>
            {index + 1}. {item.label}
          </legend>
          <div className="assessment-options gds-options">
            {[true, false].map((answer) => (
              <label
                key={String(answer)}
                className={answers[item.id] === answer ? 'is-selected' : ''}
              >
                <input
                  type="radio"
                  name={`${id}-${item.id}`}
                  value={String(answer)}
                  checked={answers[item.id] === answer}
                  data-field-path={item.id}
                  aria-invalid={missing.includes(item.id) || undefined}
                  onChange={() => update({ ...answers, [item.id]: answer })}
                />
                <span>
                  <strong>{answer ? 'Sì' : 'No'}</strong>{' '}
                  {answer === item.pointForYes ? '1 punto' : '0 punti'}
                </span>
              </label>
            ))}
          </div>
          {answers[item.id] !== null && (
            <button
              type="button"
              className="link-btn"
              onClick={() => update({ ...answers, [item.id]: null })}
            >
              Segna come non risposto
            </button>
          )}
        </fieldset>
      ))}
      <label className="gds-notes">
        Note facoltative
        <textarea
          className="form-input"
          rows={3}
          data-field-path="notes"
          aria-invalid={notesError || undefined}
          aria-describedby={notesError ? `${id}-notes-error` : `${id}-notes-count`}
          disabled={locked}
          value={answers.notes}
          onChange={(event) => update({ ...answers, notes: event.target.value })}
        />
        <span id={`${id}-notes-count`}>{noteLength} di 4000 caratteri</span>
        {notesError && (
          <span id={`${id}-notes-error`} role="alert">
            Le note devono contenere al massimo 4000 caratteri validi. Correggi il testo prima di
            salvare.
          </span>
        )}
      </label>
      <p className="assessment-hint">{GDS15_SCREENING_NOTE}</p>
      <div className="assessment-actions">
        <button type="submit" className="btn-secondary" disabled={locked || !draft.dirty}>
          {draft.busy ? 'Salvataggio…' : 'Salva bozza'}
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={locked || count !== 15 || notesError}
          onClick={onPreview}
        >
          Salva e verifica anteprima
        </button>
      </div>
    </form>
  );
}
