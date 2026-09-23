import { useId } from 'react';
import type {
  AssessmentDraft,
  AssessmentDraftStore,
} from '../../../lib/assessments/assessmentDraftStore';
import { PAINAD, answeredPainad, painadResult } from '../../../lib/assessments/painadDefinition';
import type { PainadScore } from '../../../lib/assessments/assessmentTypes';
import { assessmentInstants } from '../../../lib/assessments/assessmentTime';
export function AssessmentForm({
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
  const locked = draft.busy || !!draft.pending;
  const count = answeredPainad(draft.fields.answers);
  const result = painadResult(draft.fields.answers);
  const candidates = assessmentInstants(draft.fields.assessedAtLocal);
  const update = (fields: Parameters<AssessmentDraftStore['update']>[1]) =>
    store.update(draft.key, fields);
  return (
    <form
      className="assessment-form"
      aria-busy={draft.busy}
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="assessment-date">
        <label htmlFor={`${id}-date`}>
          Data e ora della valutazione · Europe/Rome
          <input
            id={`${id}-date`}
            type="datetime-local"
            className="form-input"
            value={draft.fields.assessedAtLocal}
            disabled={locked}
            onChange={(event) => update({ assessedAtLocal: event.target.value, instantChoice: '' })}
            required
          />
        </label>
        {candidates.length > 1 && (
          <label>
            Ora ripetuta al cambio ora
            <select
              className="form-select"
              value={
                candidates.find(
                  (instant) => instant.slice(0, 16) === draft.fields.instantChoice.slice(0, 16),
                ) ?? ''
              }
              disabled={locked}
              onChange={(event) => update({ instantChoice: event.target.value })}
            >
              <option value="">Scegli l’occorrenza</option>
              {candidates.map((instant, index) => (
                <option key={instant} value={instant}>
                  {index === 0
                    ? 'Prima occorrenza (ora legale)'
                    : 'Seconda occorrenza (ora solare)'}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {draft.predecessorId && (
        <label className="assessment-correction">
          Motivo della rettifica
          <textarea
            className="form-input"
            maxLength={1000}
            rows={3}
            required
            disabled={locked}
            value={draft.fields.correctionReason}
            onChange={(event) => update({ correctionReason: event.target.value })}
          />
          <span>
            Le risposte precedenti sono riportate per la revisione. La valutazione originale rimane
            nello storico.
          </span>
        </label>
      )}
      <p role="status" className="assessment-progress">
        {count} di 5 risposte ·{' '}
        {result
          ? `${result.total}/10 · ${result.label} (anteprima)`
          : 'Compilazione incompleta: nessun risultato definitivo.'}
      </p>
      {PAINAD.items.map((item, index) => (
        <fieldset className="assessment-item" key={item.id} disabled={locked}>
          <legend>
            {index + 1}. {item.label}
          </legend>
          <div className="assessment-options">
            {item.options.map((description, score) => (
              <label
                key={score}
                className={draft.fields.answers[item.id] === score ? 'is-selected' : ''}
              >
                <input
                  type="radio"
                  name={`${id}-${item.id}`}
                  value={score}
                  checked={draft.fields.answers[item.id] === score}
                  onChange={() =>
                    update({
                      answers: { ...draft.fields.answers, [item.id]: score as PainadScore },
                    })
                  }
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
          {draft.fields.answers[item.id] !== null && (
            <button
              type="button"
              className="link-btn"
              onClick={() => update({ answers: { ...draft.fields.answers, [item.id]: null } })}
            >
              Segna come non valutato
            </button>
          )}
        </fieldset>
      ))}
      <div className="assessment-actions">
        <button type="submit" className="btn-secondary" disabled={locked || !draft.dirty}>
          {draft.busy ? 'Salvataggio…' : 'Salva bozza'}
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={locked || count !== 5}
          onClick={onPreview}
        >
          Salva e verifica anteprima
        </button>
      </div>
    </form>
  );
}
