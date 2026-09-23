import { useId } from 'react';
import type {
  AssessmentDraft,
  AssessmentDraftStore,
} from '../../../lib/assessments/assessmentDraftStore';
import { assessmentInstants } from '../../../lib/assessments/assessmentTime';
import { mnaAssessmentInstants } from '../../../lib/assessments/mnaTime';
export function AssessmentDateFields({
  draft,
  store,
}: {
  draft: AssessmentDraft;
  store: AssessmentDraftStore;
}) {
  const id = useId();
  const locked = draft.busy || !!draft.pending;
  const candidates =
    draft.type === 'mna'
      ? mnaAssessmentInstants(draft.fields.assessedAtLocal)
      : assessmentInstants(draft.fields.assessedAtLocal);
  const update = (fields: Parameters<AssessmentDraftStore['update']>[1]) =>
    store.update(draft.key, fields);
  return (
    <>
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
            Risposte e data della scheda precedente sono riportate per la revisione. L’originale
            rimane nello storico.
          </span>
        </label>
      )}
    </>
  );
}
