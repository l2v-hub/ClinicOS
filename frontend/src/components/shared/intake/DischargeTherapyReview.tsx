// #156: "Terapie rilevate dalla lettera di dimissioni" — review of the therapy rows parsed from the
// discharge letter (draft.data.terapiaImport). ONE row per drug; incomplete rows are flagged
// "da verificare" (never dropped). #280: each row is reviewed in the SAME form used for manual
// therapy creation (TherapyFormFields), prefilled via dischargeRowToTherapyForm, with the original
// extracted text alongside for comparison; edits fold back into the raw row so the unchanged
// confirm path (dischargeRowToTherapyInput) reads them.

import { buildIntakeTherapyReview, therapyInputIssues } from './intakeTherapies';
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
}

export function DischargeTherapyReview({ rows, onChange, operatoreNome }: Props) {
  // reviewedTherapy holds the full form; the parent draft remains the only source of truth.
  const forms = rows.map(dischargeRowToTherapyForm);

  function updateForm(i: number, next: TherapyFormValue) {
    onChange(rows.map((r, idx) => (idx === i ? therapyFormToDischargeRow(next, r) : r)));
  }

  // Keep the complete source row in the draft when it is excluded from this confirmation.
  function toggleDeferred(i: number) {
    onChange(
      rows.map((row, index) =>
        index === i ? { ...row, excludedFromConfirm: !row.excludedFromConfirm } : row,
      ),
    );
  }

  if (!Array.isArray(rows) || rows.length === 0) return null;
  const review = buildIntakeTherapyReview({ terapiaImport: rows });
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
        >
          <div className="discharge-therapy-review__item-head">
            <strong>
              {i + 1}. {forms[i]?.farmacoNome || r.farmacoNome || 'Farmaco da indicare'}
            </strong>
            {r.excludedFromConfirm ? (
              <span className="discharge-therapy-review__badge is-verify">
                Resta in bozza · da verificare
              </span>
            ) : review[i].issues.length > 0 ? (
              <span className="discharge-therapy-review__badge is-verify">da verificare</span>
            ) : (
              <span className="discharge-therapy-review__badge is-ok">ok</span>
            )}
            <button
              type="button"
              className="btn-secondary btn-sm"
              data-testid="discharge-therapy-remove"
              onClick={() => toggleDeferred(i)}
              title="Non riportare questo farmaco nella terapia"
              aria-label={`${r.excludedFromConfirm ? 'Reincludi' : 'Lascia in bozza'} ${forms[i]?.farmacoNome || r.farmacoNome || 'farmaco'}`}
            >
              {r.excludedFromConfirm ? 'Reincludi' : 'Lascia in bozza'}
            </button>
          </div>
          {review[i].issues.length > 0 && (
            <p className="discharge-therapy-review__alert">{review[i].issues.join('; ')}.</p>
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
              />
              {review[i].requiresSourceReview && (
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={therapyInputIssues(review[i].input).length > 0}
                  onClick={() =>
                    onChange(
                      rows.map((row, idx) =>
                        idx === i
                          ? therapyFormToDischargeRow(forms[i], { ...row, stato: 'ok' })
                          : row,
                      ),
                    )
                  }
                >
                  Ho verificato questa terapia
                </button>
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
