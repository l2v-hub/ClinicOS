import { useEffect, useRef, useState } from 'react';
import {
  TherapyFormFields,
  emptyTherapyForm,
  type TherapyFormValue,
} from '../cartella/TherapyFormFields';
import { buildIntakeTherapyReview } from '../../shared/intake/intakeTherapies';
import {
  focusTherapyCorrection,
  type TherapyCorrectionTarget,
} from '../../shared/intake/intakeTherapyNavigation';

/** Rows belong to the intake draft as soon as they are added, including incomplete edits. */
export function TherapyIntakeEditor({
  value,
  onChange,
  operatoreNome,
  therapyCorrection,
}: {
  value: TherapyFormValue[] | undefined;
  onChange: (next: TherapyFormValue[]) => void;
  operatoreNome?: string;
  therapyCorrection?: TherapyCorrectionTarget | null;
}) {
  const items = value ?? [];
  const [editingIndex, setEditingIndex] = useState<number | null>(
    therapyCorrection?.type === 'manual' ? therapyCorrection.index : null,
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [localCorrection, setLocalCorrection] = useState<TherapyCorrectionTarget | null>(null);
  useEffect(() => {
    if (localCorrection && rootRef.current) {
      focusTherapyCorrection(rootRef.current, localCorrection);
      setLocalCorrection(null);
    }
  }, [localCorrection, editingIndex]);
  const review = buildIntakeTherapyReview({ terapia: items });

  function addDrug() {
    onChange([...items, emptyTherapyForm()]);
    setEditingIndex(items.length);
  }

  function removeDrug(index: number) {
    onChange(items.filter((_, i) => i !== index));
    setEditingIndex((current) =>
      current === index ? null : current !== null && current > index ? current - 1 : current,
    );
  }

  return (
    <div className="cr-list" data-testid="manual-therapy-editor" ref={rootRef}>
      <div className="ec-modal-add-form__actions">
        <strong>Farmaci aggiunti: {items.length}</strong>
        <button className="btn-secondary btn-sm" type="button" onClick={addDrug}>
          + Aggiungi farmaco
        </button>
      </div>
      <p className="form-hint">
        Puoi aggiungere più farmaci. Le modifiche restano nella bozza anche passando alla verifica.
      </p>
      {items.map((item, index) => (
        <article
          key={index}
          className="discharge-therapy-review__item"
          data-testid="manual-therapy-row"
          data-therapy-source="manual"
          data-therapy-index={index}
        >
          <div className="discharge-therapy-review__item-head">
            <strong>
              {index + 1}. {review[index].name}
            </strong>
            <span
              className={`discharge-therapy-review__badge ${review[index].issues.length ? 'is-verify' : 'is-ok'}`}
            >
              {review[index].issues.length ? 'da completare' : 'completa'}
            </span>
            <button
              className="btn-secondary btn-sm"
              type="button"
              aria-expanded={editingIndex === index}
              onClick={() => setEditingIndex(editingIndex === index ? null : index)}
            >
              {editingIndex === index ? 'Chiudi scheda' : 'Modifica'}
            </button>
            <button
              className="icon-btn icon-btn--sm icon-btn--danger"
              type="button"
              aria-label={`Rimuovi farmaco ${index + 1}`}
              onClick={() => removeDrug(index)}
            >
              ✕
            </button>
          </div>
          {review[index].issues.length > 0 && (
            <ul className="discharge-therapy-review__alert">
              {review[index].diagnostics.map((issue, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="therapy-correction-link"
                    onClick={() => {
                      setEditingIndex(index);
                      setLocalCorrection(issue);
                    }}
                  >
                    {issue.message}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {editingIndex === index ? (
            <div className="ec-modal-add-form">
              <TherapyFormFields
                value={item}
                onChange={(next) =>
                  onChange(items.map((existing, i) => (i === index ? next : existing)))
                }
                operatoreNome={operatoreNome}
                issues={review[index].diagnostics}
              />
              <div className="ec-modal-add-form__actions">
                <button
                  className="btn-secondary btn-sm"
                  type="button"
                  onClick={() => setEditingIndex(null)}
                >
                  Chiudi scheda
                </button>
                <button className="btn-secondary btn-sm" type="button" onClick={addDrug}>
                  + Aggiungi un altro farmaco
                </button>
              </div>
            </div>
          ) : (
            <p className="form-hint">
              {item.pharmaceuticalForm} · {review[index].times.join(', ') || 'Orari da completare'}
            </p>
          )}
        </article>
      ))}
      {!items.length && <p className="cr-empty">Nessun farmaco aggiunto manualmente.</p>}
    </div>
  );
}
