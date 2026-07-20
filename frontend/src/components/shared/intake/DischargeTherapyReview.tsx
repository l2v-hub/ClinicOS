// #156: "Terapie rilevate dalla lettera di dimissioni" — review of the therapy rows parsed from the
// discharge letter (draft.data.terapiaImport). ONE row per drug; incomplete rows are flagged
// "da verificare" (never dropped). #280: each row is reviewed in the SAME form used for manual
// therapy creation (TherapyFormFields), prefilled via dischargeRowToTherapyForm, with the original
// extracted text alongside for comparison; edits fold back into the raw row so the unchanged
// confirm path (dischargeRowToTherapyInput) reads them.

import { useEffect, useState } from 'react';
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
  // Full-fidelity local form state (one TherapyFormValue per row): deriving the form from the raw
  // row on every render would be lossy (row ⇄ form is not a perfect round-trip).
  const [forms, setForms] = useState<TherapyFormValue[]>(() => rows.map(dischargeRowToTherapyForm));

  // Re-seed only if the row count changes from outside (rows are never added/removed here).
  useEffect(() => {
    setForms((prev) => (prev.length === rows.length ? prev : rows.map(dischargeRowToTherapyForm)));
  }, [rows]);

  function updateForm(i: number, next: TherapyFormValue) {
    setForms((prev) => prev.map((f, idx) => (idx === i ? next : f)));
    onChange(rows.map((r, idx) => (idx === i ? therapyFormToDischargeRow(next, r) : r)));
  }

  if (!Array.isArray(rows) || rows.length === 0) return null;
  const daVerificare = rows.filter((r) => r.stato === 'da_verificare').length;

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
            <strong>{forms[i]?.farmacoNome || r.farmacoNome || 'Farmaco'}</strong>
            {r.stato === 'da_verificare' ? (
              <span className="discharge-therapy-review__badge is-verify">da verificare</span>
            ) : (
              <span className="discharge-therapy-review__badge is-ok">ok</span>
            )}
          </div>
          {r.originalText && (
            <blockquote
              className="discharge-therapy-review__original"
              data-testid="discharge-original-text"
            >
              <span className="discharge-therapy-review__original-label">Dal documento:</span>{' '}
              {r.originalText}
            </blockquote>
          )}
          {forms[i] && (
            <div className="ec-modal-add-form">
              <TherapyFormFields
                value={forms[i]}
                onChange={(v) => updateForm(i, v)}
                operatoreNome={operatoreNome}
              />
            </div>
          )}
        </article>
      ))}
      <p className="discharge-therapy-review__hint">
        Le righe verranno salvate nella terapia del paziente alla conferma.
      </p>
    </section>
  );
}
