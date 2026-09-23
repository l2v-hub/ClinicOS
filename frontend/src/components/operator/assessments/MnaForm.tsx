import { useEffect, useId, useRef } from 'react';
import type {
  AssessmentDraft,
  AssessmentDraftStore,
} from '../../../lib/assessments/assessmentDraftStore';
import { MNA_ITEMS, MNA_K_LABELS } from '../../../lib/assessments/mnaItems';
import { MNA_K_KEYS, type MnaAnswers } from '../../../lib/assessments/mnaTypes';
import { mnaCompletion, mnaResult } from '../../../lib/assessments/mnaDefinition';
import { mnaHasInputErrors, mnaVisibleAnswers } from '../../../lib/assessments/mnaLocalInputs';
import { validMnaNotes } from '../../../lib/assessments/mnaInputValidation';
import { AssessmentDateFields } from './AssessmentDateFields';
import { TransfersChoice } from './TransfersChoice';
import { MnaAnthropometry } from './MnaAnthropometry';
import { MnaOutcomes, MnaSource } from './MnaContent';

export function MnaForm({
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
  const uid = useId();
  const root = useRef<HTMLFormElement>(null);
  const answers = draft.fields.answers as MnaAnswers;
  const visibleAnswers = mnaVisibleAnswers(answers, draft.fields.mnaInputs);
  const completion = mnaCompletion(visibleAnswers);
  const result = mnaResult(visibleAnswers);
  const inputErrors = mnaHasInputErrors(answers, draft.fields.mnaInputs);
  const locked = draft.busy || !!draft.pending;
  const missing = draft.failure?.missingPaths ?? [];
  const noteLength = [...answers.notes].length;
  const notesError =
    noteLength > 4000
      ? 'Le note superano 4000 caratteri. Riduci il testo prima di salvare.'
      : !validMnaNotes(answers.notes)
        ? 'Le note contengono caratteri non validi. Correggi il testo prima di salvare.'
        : null;
  const update = (next: MnaAnswers) => store.update(draft.key, { answers: next });
  const globalData =
    completion.global.answeredCount > 0 ||
    MNA_K_KEYS.some((key) => answers.K[key] !== null) ||
    ['armCircumferenceCm', 'calfCircumferenceCm'].some(
      (key) =>
        answers.measurements[key as 'armCircumferenceCm'] !== null ||
        answers.measurementDates[key as 'armCircumferenceCm'] !== null,
    ) ||
    Object.keys(draft.fields.mnaInputs?.raw ?? {}).some((path) =>
      /armCircumferenceCm|calfCircumferenceCm/.test(path),
    );
  const showGlobal = answers.extent === 'full' || globalData;
  useEffect(() => {
    const path = draft.failure?.missingPaths?.[0];
    const field = [
      ...(root.current?.querySelectorAll<HTMLElement>('[data-field-path]') ?? []),
    ].find((field) => field.dataset.fieldPath === path);
    field?.focus();
    field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [draft.failure]);
  const group = (global: boolean) => (
    <section className="mna-group" aria-labelledby={`${uid}-${global ? 'global' : 'screening'}`}>
      <h3 id={`${uid}-${global ? 'global' : 'screening'}`}>
        {global ? 'Valutazione globale · G–R' : 'Screening · A–F'}
      </h3>
      {global && answers.extent === 'screening' && (
        <p>Dati globali aggiuntivi conservati — non inclusi nel totale.</p>
      )}
      <p className="assessment-progress">
        {global ? completion.global.answeredCount : completion.screening.answeredCount} di{' '}
        {global ? 12 : 6} risposte
      </p>
      {MNA_ITEMS.slice(global ? 6 : 0, global ? 18 : 6).map((item) => {
        if (item.id === 'F' || item.id === 'Q' || item.id === 'R')
          return (
            <MnaAnthropometry
              key={item.id}
              id={item.id}
              answers={answers}
              inputs={draft.fields.mnaInputs}
              missing={missing}
              onChange={(fields) => store.update(draft.key, fields)}
            />
          );
        if (item.id === 'K')
          return (
            <section key="K" className="mna-protein" aria-label="K. Consuma?">
              <h4>K. {item.label}</h4>
              <p>
                {MNA_K_KEYS.filter((key) => answers.K[key] !== null).length} di 3 risposte · tutte
                necessarie
              </p>
              {MNA_K_KEYS.map((key) => (
                <TransfersChoice
                  key={key}
                  path={`K.${key}`}
                  label={MNA_K_LABELS[key]}
                  value={answers.K[key]}
                  options={[
                    [true, 'Sì'],
                    [false, 'No'],
                  ]}
                  missing={missing.includes(`K.${key}`)}
                  onChange={(value) => update({ ...answers, K: { ...answers.K, [key]: value } })}
                />
              ))}
            </section>
          );
        return (
          <TransfersChoice
            key={item.id}
            path={item.id}
            label={`${item.id}. ${item.label}`}
            value={answers[item.id]}
            options={item.options.map(
              (option) =>
                [
                  option.value,
                  `${option.description} · ${option.score.toLocaleString('it-IT')} punti`,
                ] as const,
            )}
            missing={missing.includes(item.id)}
            onChange={(value) => update({ ...answers, [item.id]: value })}
          />
        );
      })}
    </section>
  );
  return (
    <form
      ref={root}
      className="assessment-form mna-form"
      aria-busy={draft.busy}
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <AssessmentDateFields draft={draft} store={store} />
      <fieldset disabled={locked} className="mna-fields">
        <fieldset className="mna-extent">
          <legend>Estensione della valutazione</legend>
          <label>
            <input
              type="radio"
              name={`${uid}-extent`}
              checked={answers.extent === 'screening'}
              onChange={() => update({ ...answers, extent: 'screening' })}
            />
            Screening A–F
          </label>
          <label>
            <input
              type="radio"
              name={`${uid}-extent`}
              checked={answers.extent === 'full'}
              onChange={() => update({ ...answers, extent: 'full' })}
            />
            Valutazione completa A–R
          </label>
        </fieldset>
        {group(false)}
        {!inputErrors && result.screening && (
          <div className="mna-screening-result" role="status">
            <strong>
              Screening: {result.screening.score}/14 · {result.screening.label}
            </strong>
            {answers.extent === 'screening' && (
              <p>
                {result.screening.score <= 11
                  ? 'Completa la valutazione globale dello stato nutrizionale.'
                  : 'Puoi proseguire per una valutazione più approfondita.'}
              </p>
            )}
            {answers.extent === 'screening' && (
              <button
                type="button"
                className={result.screening.score <= 11 ? 'btn-primary' : 'btn-secondary'}
                onClick={() => update({ ...answers, extent: 'full' })}
              >
                Prosegui con la valutazione completa
              </button>
            )}
          </div>
        )}
        {showGlobal && group(true)}
        <label className="mna-notes" data-field-path="notes">
          Note facoltative
          <textarea
            className="form-input"
            rows={3}
            value={answers.notes}
            aria-invalid={!!notesError || undefined}
            aria-describedby={`${uid}-notes-status`}
            onChange={(event) => update({ ...answers, notes: event.target.value })}
          />
          <span id={`${uid}-notes-status`}>{noteLength} di 4000 caratteri</span>
          {notesError && (
            <span role="alert" className="mna-field-error">
              {notesError}
            </span>
          )}
        </label>
      </fieldset>
      {inputErrors ? (
        <p role="alert" className="mna-field-error">
          Correggi le misure o le date indicate. Calcolo e salvataggio non disponibili.
        </p>
      ) : (
        <MnaOutcomes result={result} />
      )}
      <p className="assessment-hint">
        Le fasce sono l’interpretazione dello strumento. Non generano automaticamente diagnosi o
        trattamenti.
      </p>
      <div className="assessment-actions">
        <button type="submit" className="btn-secondary" disabled={locked || !draft.dirty}>
          {draft.busy ? 'Salvataggio…' : 'Salva bozza'}
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={locked || !completion.complete || inputErrors || !!notesError}
          onClick={onPreview}
        >
          Salva e verifica anteprima
        </button>
      </div>
      <MnaSource />
    </form>
  );
}
