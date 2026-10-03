// #156: "Terapie rilevate dalla lettera di dimissioni" — review of the therapy rows parsed from the
// discharge letter (draft.data.terapiaImport). ONE row per drug; incomplete rows are flagged
// "da verificare" (never dropped). #280: each row is reviewed in the SAME form used for manual
// therapy creation (TherapyFormFields), prefilled via dischargeRowToTherapyForm, with the original
// extracted text alongside for comparison; edits fold back into the raw row so the unchanged
// confirm path (dischargeRowToTherapyInput) reads them.

import {
  INTAKE_PRESCRIBER_SUGGESTIONS,
  buildIntakeTherapyReview,
  therapyInputIssues,
} from './intakeTherapies';
import { useContext, useId } from 'react';
import { IntakeAiSourceContext } from './intakeAiOrigin';
import { therapySourceChip } from './intakeDocumentPages';
import { therapyFieldFeedback } from '../../operator/cartella/therapyFieldFeedback';
import {
  TherapyFormFields,
  type TherapyFormValue,
} from '../../operator/cartella/TherapyFormFields';
import {
  dischargeRowToTherapyForm,
  therapyFormToDischargeRow,
  type DischargeTherapyRow,
} from './dischargeTherapy';

interface Props {
  rows: DischargeTherapyRow[];
  onChange: (rows: DischargeTherapyRow[]) => void;
  operatoreNome?: string;
  sourceResultHash?: string;
  /** Flusso «da documenti»: torna alla revisione, dove si sceglie il valore dei conflitti. */
  onBackToDocuments?: () => void;
}

export function DischargeTherapyReview({
  rows,
  onChange,
  operatoreNome,
  sourceResultHash,
  onBackToDocuments,
}: Props) {
  const id = useId();
  const source = useContext(IntakeAiSourceContext);
  // reviewedTherapy holds the full form; the parent draft remains the only source of truth.
  const forms = rows.map(dischargeRowToTherapyForm);

  function updateForm(i: number, next: TherapyFormValue) {
    onChange(rows.map((r, idx) => (idx === i ? therapyFormToDischargeRow(next, r) : r)));
  }

  // Keep the complete source row in the draft when it is excluded from this confirmation.
  // A row deferred by the server for a document conflict cannot be re-included here: the
  // backend rejects it (conflict_deferred) and every later autosave of the draft would fail.
  function toggleDeferred(i: number) {
    if (rows[i]?.conflictDeferred) return;
    onChange(
      rows.map((row, index) =>
        index === i ? { ...row, excludedFromConfirm: !row.excludedFromConfirm } : row,
      ),
    );
  }

  if (!Array.isArray(rows) || rows.length === 0) return null;
  const review = buildIntakeTherapyReview({ terapiaImport: rows });
  const chips = rows.map((r) => therapySourceChip(source.job, r));
  const daVerificare = review.filter((r) => !r.excluded && r.issues.length > 0).length;

  return (
    <section
      className="discharge-therapy-review"
      data-testid="discharge-therapy-review"
      aria-label="Terapie rilevate dalla lettera di dimissioni"
    >
      <div className="discharge-therapy-review__title">
        Terapie rilevate dalla lettera di dimissioni
      </div>
      {daVerificare > 0 && (
        <p
          className="discharge-therapy-review__alert"
          role="alert"
          data-testid="discharge-therapy-alert"
        >
          {daVerificare} {daVerificare > 1 ? 'righe' : 'riga'} da verificare: dati incompleti,
          controlla prima di salvare.
        </p>
      )}
      {rows.map((r, i) => (
        <article
          key={i}
          className="discharge-therapy-review__item"
          data-testid="discharge-therapy-row"
          data-stato={r.stato}
          data-farmaco={r.farmacoNome}
          data-therapy-source="import"
          data-therapy-index={i}
        >
          <div className="discharge-therapy-review__item-head">
            <strong>
              {i + 1}. {forms[i]?.farmacoNome || r.farmacoNome || 'Farmaco da indicare'}
            </strong>
            {r.conflictDeferred ? (
              <span className="discharge-therapy-review__badge is-verify">
                Dati diversi tra le lettere · resta in bozza
              </span>
            ) : r.excludedFromConfirm ? (
              <span className="discharge-therapy-review__badge is-verify">
                Resta in bozza · da verificare
              </span>
            ) : review[i].issues.length > 0 ? (
              <span className="discharge-therapy-review__badge is-verify">da verificare</span>
            ) : (
              <span className="discharge-therapy-review__badge is-ok">ok</span>
            )}
            {chips[i] && source.open && (
              <button
                type="button"
                className="ds-btn ds-btn--secondary"
                data-testid="discharge-therapy-source"
                aria-label={chips[i]!.ariaLabel}
                onClick={(e) => source.open?.(chips[i]!.target, e.currentTarget)}
              >
                {chips[i]!.label}
              </button>
            )}
            {!r.conflictDeferred && (
              <button
                type="button"
                className="ds-btn ds-btn--secondary"
                data-testid="discharge-therapy-remove"
                onClick={() => toggleDeferred(i)}
                title="Non riportare questo farmaco nella terapia"
                aria-label={`${r.excludedFromConfirm ? 'Reincludi' : 'Lascia in bozza'} ${forms[i]?.farmacoNome || r.farmacoNome || 'farmaco'}`}
              >
                {r.excludedFromConfirm ? 'Reincludi' : 'Lascia in bozza'}
              </button>
            )}
          </div>
          {r.conflictDeferred && (
            <div
              className="discharge-therapy-review__alert"
              role="note"
              data-testid="discharge-therapy-conflict"
            >
              <p>
                Le lettere riportano dati diversi per questo farmaco: non può essere prescritto
                finché non scegli il valore corretto. La riga resta in bozza e non blocca la
                creazione del paziente.
              </p>
              <p>
                {onBackToDocuments
                  ? 'Scegli il valore nella revisione dei documenti, poi includi la terapia.'
                  : 'Confronta il documento e, se serve, inserisci la terapia come nuova voce.'}
              </p>
              {onBackToDocuments && (
                <button
                  type="button"
                  className="ds-btn ds-btn--secondary"
                  data-testid="discharge-therapy-resolve"
                  onClick={onBackToDocuments}
                >
                  Torna alla revisione dei documenti
                </button>
              )}
            </div>
          )}
          {review[i].issues.length > 0 && (
            <p className="discharge-therapy-review__alert">{review[i].issues.join('; ')}.</p>
          )}
          {r.sourceOutdated && (
            <p className="discharge-therapy-review__alert" role="alert">
              La fonte è cambiata. I valori che hai corretto sono conservati: confronta le nuove
              pagine e mantieni, correggi o lascia in bozza questa terapia.
            </p>
          )}
          {r.originalText && (
            <blockquote
              className="discharge-therapy-review__original"
              data-testid="discharge-original-text"
            >
              <span className="discharge-therapy-review__original-label">Dal documento:</span>{' '}
              {r.originalText}
            </blockquote>
          )}
          {forms[i] && !r.excludedFromConfirm && (
            <div className="ec-modal-add-form">
              <TherapyFormFields
                value={forms[i]}
                onChange={(v) => updateForm(i, v)}
                operatoreNome={operatoreNome}
                issues={review[i].diagnostics}
                prescriberSuggestions={INTAKE_PRESCRIBER_SUGGESTIONS}
              />
              {review[i].requiresSourceReview && (
                <div
                  tabIndex={-1}
                  role="group"
                  aria-label="Verifica della terapia estratta dal documento"
                  {...therapyFieldFeedback(`${id}-${i}`, review[i].diagnostics).attributes(
                    'sourceReview',
                  )}
                >
                  {therapyFieldFeedback(`${id}-${i}`, review[i].diagnostics).error('sourceReview')}
                  <button
                    type="button"
                    className="ds-btn ds-btn--secondary"
                    disabled={
                      therapyInputIssues(review[i].input).length > 0 ||
                      (r.sourceOutdated === true && !sourceResultHash)
                    }
                    onClick={() =>
                      onChange(
                        rows.map((row, idx) =>
                          idx === i
                            ? therapyFormToDischargeRow(forms[i], {
                                ...row,
                                stato: 'ok',
                                ...(row.sourceOutdated
                                  ? { sourceOutdated: false, sourceReviewHash: sourceResultHash }
                                  : {}),
                              })
                            : row,
                        ),
                      )
                    }
                  >
                    Ho verificato questa terapia
                  </button>
                </div>
              )}
            </div>
          )}
        </article>
      ))}
      <p className="discharge-therapy-review__hint">
        Verranno create solo le terapie incluse e verificate. «Lascia in bozza» conserva la riga
        originale senza creare una prescrizione somministrabile.
      </p>
    </section>
  );
}
