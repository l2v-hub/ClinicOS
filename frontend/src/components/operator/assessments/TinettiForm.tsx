import { useEffect, useId, useRef } from 'react';
import type {
  AssessmentDraft,
  AssessmentDraftStore,
} from '../../../lib/assessments/assessmentDraftStore';
import type { TinettiAnswers, TinettiScore } from '../../../lib/assessments/tinettiTypes';
import {
  TINETTI_GROUPS,
  TINETTI_ITEMS,
  answeredTinetti,
  tinettiResult,
} from '../../../lib/assessments/tinettiDefinition';
import { AssessmentDateFields } from './AssessmentDateFields';
export function TinettiForm({
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
  const answers = draft.fields.answers as TinettiAnswers;
  const locked = draft.busy || !!draft.pending;
  const count = answeredTinetti(answers);
  const result = tinettiResult(answers);
  const noteLength = [...answers.notes].length;
  const notesError =
    noteLength > 4000 ? 'Le note superano 4000 caratteri. Riduci il testo prima di salvare.' : null;
  const missing = draft.failure?.missingPaths ?? [];
  const update = (next: TinettiAnswers) => store.update(draft.key, { answers: next });
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
      className="assessment-form tinetti-form"
      aria-busy={draft.busy}
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <AssessmentDateFields draft={draft} store={store} />
      <p role="status" className="assessment-progress">
        {count} di 20 risposte ·{' '}
        {result
          ? `${result.total}/28 · ${result.label} (anteprima)`
          : 'Compilazione incompleta: nessun risultato o fascia di rischio.'}
      </p>
      {TINETTI_GROUPS.map((group) => (
        <section key={group.id} aria-labelledby={`${id}-${group.id}`}>
          <h3 id={`${id}-${group.id}`}>
            {group.label} · massimo {group.maximum} punti
          </h3>
          {TINETTI_ITEMS.filter((item) => item.group === group.id).map((item) => (
            <fieldset key={item.id} className="assessment-item" disabled={locked}>
              <legend>
                {TINETTI_ITEMS.indexOf(item) + 1}. {item.label}
              </legend>
              <div className="assessment-options tinetti-options">
                {item.options.map((description, score) => (
                  <label key={score} className={answers[item.id] === score ? 'is-selected' : ''}>
                    <input
                      type="radio"
                      name={`${id}-${item.id}`}
                      value={score}
                      checked={answers[item.id] === score}
                      data-field-path={item.id}
                      aria-invalid={missing.includes(item.id) || undefined}
                      onChange={() => update({ ...answers, [item.id]: score as TinettiScore })}
                    />
                    <span>
                      <strong>
                        {score} {score === 1 ? 'punto' : 'punti'}
                      </strong>
                      {description}
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
                  Segna come non valutato
                </button>
              )}
            </fieldset>
          ))}
        </section>
      ))}
      <label className="tinetti-notes">
        Note facoltative
        <textarea
          className="form-input"
          rows={3}
          aria-invalid={!!notesError || undefined}
          aria-describedby={notesError ? `${id}-notes-error` : `${id}-notes-count`}
          disabled={locked}
          value={answers.notes}
          onChange={(event) => update({ ...answers, notes: event.target.value })}
        />
        <span id={`${id}-notes-count`}>{noteLength} di 4000 caratteri</span>
        {notesError && (
          <span id={`${id}-notes-error`} role="alert">
            {notesError}
          </span>
        )}
      </label>
      <div className="assessment-actions">
        <button type="submit" className="btn-secondary" disabled={locked || !draft.dirty}>
          {draft.busy ? 'Salvataggio…' : 'Salva bozza'}
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={locked || count !== 20}
          onClick={onPreview}
        >
          Salva e verifica anteprima
        </button>
      </div>
    </form>
  );
}
