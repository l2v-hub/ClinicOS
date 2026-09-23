import { useEffect, useId, useRef } from 'react';
import type {
  AssessmentDraft,
  AssessmentDraftStore,
} from '../../../lib/assessments/assessmentDraftStore';
import {
  AID_KEYS,
  AID_LABELS,
  COGNITION_OPTIONS,
  HYGIENE_OPTIONS,
  LOAD_OPTIONS,
  TRANSFER_OPTIONS,
  WALKING_OPTIONS,
  transfersCompletion,
  validTransfersAdmissionDate,
} from '../../../lib/assessments/transfersDefinition';
import type { TransfersAnswers } from '../../../lib/assessments/transfersTypes';
import { AssessmentDateFields } from './AssessmentDateFields';
import { TransfersChoice } from './TransfersChoice';
const YES_NO = [
  [true, 'Sì'],
  [false, 'No'],
] as const;
export function TransfersForm({
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
  // Keep incomplete input editable; the store validates answers before a write.
  const answers = draft.fields.answers as TransfersAnswers;
  const root = useRef<HTMLFormElement>(null);
  const admissionErrorId = useId();
  const admission = answers.context.admissionDate;
  const admissionError =
    admission.status === 'known' &&
    admission.value !== null &&
    !validTransfersAdmissionDate(admission.value)
      ? 'Inserisci una data di ingresso valida con anno da 0001 a 9999.'
      : null;
  const locked = draft.busy || !!draft.pending;
  const completion = transfersCompletion(answers);
  const missing = draft.failure?.missingPaths ?? [];
  useEffect(() => {
    if (!draft.failure?.missingPaths?.length) return;
    const target = [
      ...(root.current?.querySelectorAll<HTMLElement>('[data-field-path]') ?? []),
    ].find((element) => element.dataset.fieldPath === draft.failure?.missingPaths?.[0]);
    target?.focus();
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [draft.failure]);
  const update = (change: (next: TransfersAnswers) => void) => {
    const next = structuredClone(answers);
    change(next);
    store.update(draft.key, { answers: next });
  };
  const flagged = (path: string) => missing.includes(path);
  const choice = <T extends string | boolean>(
    path: string,
    label: string,
    value: T | null,
    options: readonly (readonly [T, string])[],
    onChange: (value: T | null) => void,
  ) => (
    <TransfersChoice
      path={path}
      label={label}
      value={value}
      options={options}
      onChange={onChange}
      missing={flagged(path)}
    />
  );
  return (
    <form
      ref={root}
      className="assessment-form transfers-form"
      aria-busy={draft.busy}
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <AssessmentDateFields draft={draft} store={store} />
      <p role="status" className="assessment-progress">
        {completion.complete
          ? 'Campi verificati. Salva e verifica l’anteprima prima di finalizzare.'
          : `${completion.missingPaths.length} campi da verificare. Puoi salvare una bozza parziale.`}
      </p>
      <fieldset disabled={locked} className="transfers-fields">
        <section className="transfers-group" aria-labelledby="transfers-context">
          <h3 id="transfers-context">1. Contesto</h3>
          {choice(
            'context.admissionDate.status',
            'Data di ingresso',
            answers.context.admissionDate.status,
            [
              ['known', 'Disponibile'],
              ['unavailable', 'Non disponibile'],
            ],
            (status) =>
              update((a) => {
                a.context.admissionDate = {
                  status,
                  value: status === 'known' ? a.context.admissionDate.value : null,
                };
              }),
          )}
          {answers.context.admissionDate.status === 'known' && (
            <label>
              Data di ingresso nella struttura
              <input
                type="date"
                className="form-input"
                data-field-path="context.admissionDate.value"
                aria-invalid={
                  !!admissionError || flagged('context.admissionDate.value') || undefined
                }
                aria-describedby={admissionError ? admissionErrorId : undefined}
                value={answers.context.admissionDate.value ?? ''}
                onChange={(event) =>
                  update((a) => {
                    a.context.admissionDate.value = event.target.value || null;
                  })
                }
              />
              {admissionError && (
                <span id={admissionErrorId} role="alert">
                  {admissionError}
                </span>
              )}
            </label>
          )}
          {choice(
            'context.diagnosis.status',
            'Diagnosi verificata dal compilatore',
            answers.context.diagnosis.status,
            [
              ['provided', 'Riporta diagnosi'],
              ['unavailable', 'Non disponibile'],
            ],
            (status) =>
              update((a) => {
                a.context.diagnosis = {
                  status,
                  text: status === 'provided' ? a.context.diagnosis.text : '',
                  unavailableReason:
                    status === 'unavailable' ? a.context.diagnosis.unavailableReason : '',
                };
              }),
          )}
          {answers.context.diagnosis.status === 'provided' && (
            <label>
              Diagnosi
              <textarea
                className="form-input"
                rows={3}
                maxLength={1000}
                value={answers.context.diagnosis.text}
                data-field-path="context.diagnosis.text"
                aria-invalid={flagged('context.diagnosis.text') || undefined}
                onChange={(event) =>
                  update((a) => {
                    a.context.diagnosis.text = event.target.value;
                  })
                }
              />
            </label>
          )}
          {answers.context.diagnosis.status === 'unavailable' && (
            <label>
              Motivo dell’indisponibilità della diagnosi
              <textarea
                className="form-input"
                rows={2}
                maxLength={1000}
                value={answers.context.diagnosis.unavailableReason}
                data-field-path="context.diagnosis.unavailableReason"
                aria-invalid={flagged('context.diagnosis.unavailableReason') || undefined}
                onChange={(event) =>
                  update((a) => {
                    a.context.diagnosis.unavailableReason = event.target.value;
                  })
                }
              />
            </label>
          )}
        </section>
        <section className="transfers-group" aria-labelledby="transfers-mobility">
          <h3 id="transfers-mobility">2. Mobilizzazione</h3>
          {choice(
            'operatedLegLoad.applicable',
            'Carico su arto inferiore operato: applicabile?',
            answers.operatedLegLoad.applicable,
            YES_NO,
            (applicable) =>
              update((a) => {
                a.operatedLegLoad = {
                  applicable,
                  side: applicable ? a.operatedLegLoad.side : null,
                  level: applicable ? a.operatedLegLoad.level : null,
                };
              }),
          )}
          {answers.operatedLegLoad.applicable && (
            <>
              {choice(
                'operatedLegLoad.side',
                'Lato operato',
                answers.operatedLegLoad.side,
                [
                  ['right', 'DX · destro'],
                  ['left', 'SX · sinistro'],
                ],
                (side) =>
                  update((a) => {
                    a.operatedLegLoad.side = side;
                  }),
              )}
              {choice(
                'operatedLegLoad.level',
                'Carico concesso',
                answers.operatedLegLoad.level,
                LOAD_OPTIONS,
                (level) =>
                  update((a) => {
                    a.operatedLegLoad.level = level;
                  }),
              )}
            </>
          )}
          {choice('walking', 'Deambulazione', answers.walking, WALKING_OPTIONS, (value) =>
            update((a) => {
              a.walking = value;
            }),
          )}
          {choice(
            'transfers.bedToWheelchair',
            'Letto → carrozzina',
            answers.transfers.bedToWheelchair,
            TRANSFER_OPTIONS,
            (value) =>
              update((a) => {
                a.transfers.bedToWheelchair = value;
              }),
          )}
          {choice(
            'transfers.wheelchairToBed',
            'Carrozzina → letto',
            answers.transfers.wheelchairToBed,
            TRANSFER_OPTIONS,
            (value) =>
              update((a) => {
                a.transfers.wheelchairToBed = value;
              }),
          )}
          {choice(
            'transfers.toilet',
            'In bagno sul WC',
            answers.transfers.toilet,
            TRANSFER_OPTIONS.slice(0, 6) as readonly (readonly [
              NonNullable<TransfersAnswers['transfers']['toilet']>,
              string,
            ])[],
            (value) =>
              update((a) => {
                a.transfers.toilet = value;
              }),
          )}
          <p className="assessment-hint">
            Verifica ciascun trasferimento separatamente. Desk significa deambulatore con tavolo.
          </p>
        </section>
        <section className="transfers-group" aria-labelledby="transfers-assistance">
          <h3 id="transfers-assistance">3. Assistenza</h3>
          {choice('hygiene', 'Igiene personale', answers.hygiene, HYGIENE_OPTIONS, (value) =>
            update((a) => {
              a.hygiene = value;
            }),
          )}
          {choice(
            'painOnMovement',
            'Dolore alla movimentazione',
            answers.painOnMovement,
            YES_NO,
            (value) =>
              update((a) => {
                a.painOnMovement = value;
              }),
          )}
          {choice(
            'cognitiveDeterioration',
            'Deterioramento cognitivo',
            answers.cognitiveDeterioration,
            COGNITION_OPTIONS,
            (value) =>
              update((a) => {
                a.cognitiveDeterioration = value;
              }),
          )}
        </section>
        <section className="transfers-group" aria-labelledby="transfers-aids">
          <h3 id="transfers-aids">4. Ausili</h3>
          <p>
            Verifica ogni ausilio. Indica la proprietà solo per quelli presenti che la prevedono.
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              update((a) => {
                for (const key of AID_KEYS) {
                  a.aids[key].selected = false;
                  if ('ownership' in a.aids[key]) a.aids[key].ownership = null;
                }
              })
            }
          >
            Nessun ausilio · segna tutti assenti
          </button>
          <div className="transfers-aids-grid">
            {AID_KEYS.map((key) => {
              const aid = answers.aids[key];
              return (
                <div className="transfers-aid" key={key}>
                  {choice(
                    `aids.${key}.selected`,
                    AID_LABELS[key],
                    aid.selected,
                    YES_NO,
                    (selected) =>
                      update((a) => {
                        const target = a.aids[key];
                        target.selected = selected;
                        if ('ownership' in target && selected !== true) target.ownership = null;
                      }),
                  )}
                  {'ownership' in aid &&
                    aid.selected &&
                    choice(
                      `aids.${key}.ownership`,
                      `Proprietà · ${AID_LABELS[key]}`,
                      aid.ownership,
                      [
                        ['personal', 'Personale'],
                        ['facility', 'Struttura'],
                      ],
                      (ownership) =>
                        update((a) => {
                          const target = a.aids[key];
                          if ('ownership' in target) target.ownership = ownership;
                        }),
                    )}
                </div>
              );
            })}
          </div>
          <p className="assessment-hint">
            La scheda documenta gli ausili; non modifica prescrizioni o procedure di contenzione.
          </p>
        </section>
        <section className="transfers-group" aria-labelledby="transfers-notes">
          <h3 id="transfers-notes">5. Note</h3>
          <label>
            Note facoltative
            <textarea
              className="form-input"
              rows={5}
              maxLength={4000}
              value={answers.notes}
              onChange={(event) =>
                update((a) => {
                  a.notes = event.target.value;
                })
              }
            />
          </label>
        </section>
      </fieldset>
      <div className="assessment-actions">
        <button type="submit" className="btn-secondary" disabled={locked || !draft.dirty}>
          {draft.busy ? 'Salvataggio…' : 'Salva bozza'}
        </button>
        <button type="button" className="btn-primary" disabled={locked} onClick={onPreview}>
          Salva e verifica anteprima
        </button>
      </div>
    </form>
  );
}
