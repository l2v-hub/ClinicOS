import { lazy, Suspense, useState } from 'react';
import type { SectionProps } from './types';
import type { Paziente } from '../../../types';
import { TherapyFormFields, emptyTherapyForm } from '../cartella/TherapyFormFields';
import type { TherapyFormValue } from '../cartella/TherapyFormFields';
import { ClinicalSectionLoading } from '../ClinicalSectionLoading';
import { validateGlucoseScaleRows } from '../cartella/glucoseScale';

// Lazy import keeps import.meta.env out of module-evaluation scope,
// which allows the patientSections registry test to run in Node without Vite.
const TerapiaFarmacologicaTab = lazy(() =>
  import('../cartella/TerapiaFarmacologicaTab').then((m) => ({
    default: m.TerapiaFarmacologicaTab,
  })),
);

type TherapyEditorProps = SectionProps<TherapyFormValue[]> & { paziente?: Paziente };

export function TherapyEditor({
  mode,
  value,
  onChange,
  paziente,
  operatoreNome,
}: TherapyEditorProps) {
  if (mode === 'patient-chart' && paziente) {
    return (
      <Suspense fallback={<ClinicalSectionLoading />}>
        <TerapiaFarmacologicaTab paziente={paziente} operatoreNome={operatoreNome ?? ''} />
      </Suspense>
    );
  }

  if (mode === 'intake') {
    return <TherapyIntakeEditor value={value} onChange={onChange} operatoreNome={operatoreNome} />;
  }

  return (
    <p className="cr-empty">
      La terapia farmacologica sarà disponibile nell&apos;ingresso (in arrivo).
    </p>
  );
}

function TherapyIntakeEditor({
  value,
  onChange,
  operatoreNome,
}: {
  value: TherapyFormValue[] | undefined;
  onChange: (next: TherapyFormValue[]) => void;
  operatoreNome?: string;
}) {
  const items = value ?? [];
  const [draftItem, setDraftItem] = useState<TherapyFormValue>(emptyTherapyForm);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const invalidScale =
    draftItem.doseMode === 'glucose_scale' &&
    validateGlucoseScaleRows(draftItem.glucoseScale).errors.length > 0;

  function handleAdd() {
    if (!draftItem.farmacoNome.trim() || invalidScale) return;
    if (editingIndex !== null) {
      onChange(items.map((item, i) => (i === editingIndex ? draftItem : item)));
      setEditingIndex(null);
    } else {
      onChange([...items, draftItem]);
    }
    setDraftItem(emptyTherapyForm());
  }

  function handleEdit(idx: number) {
    setDraftItem({ ...items[idx] });
    setEditingIndex(idx);
  }

  function handleRemove(idx: number) {
    if (editingIndex === idx) {
      setEditingIndex(null);
      setDraftItem(emptyTherapyForm());
    } else if (editingIndex !== null && idx < editingIndex) {
      setEditingIndex(editingIndex - 1);
    }
    onChange(items.filter((_, i) => i !== idx));
  }

  function handleCancelEdit() {
    setEditingIndex(null);
    setDraftItem(emptyTherapyForm());
  }

  const doseSummary = (item: TherapyFormValue) => {
    if (item.doseMode === 'glucose_scale') return 'Dose secondo schema glicemico';
    const parts = [
      item.commercialStrengthValue,
      item.commercialStrengthUnit,
      item.pharmaceuticalForm,
    ].filter(Boolean);
    return parts.join(' ');
  };

  return (
    <div className="cr-list">
      <div className="ec-modal-add-form">
        <TherapyFormFields
          value={draftItem}
          onChange={setDraftItem}
          operatoreNome={operatoreNome}
        />
        <div className="ec-modal-add-form__actions">
          {editingIndex !== null && (
            <button className="btn-secondary btn-sm" type="button" onClick={handleCancelEdit}>
              Annulla
            </button>
          )}
          <button
            className="btn-success btn-sm"
            type="button"
            onClick={handleAdd}
            disabled={!draftItem.farmacoNome.trim() || invalidScale}
          >
            {editingIndex !== null ? 'Salva modifiche' : 'Aggiungi terapia'}
          </button>
          {invalidScale && <span className="form-hint">Completa lo schema glicemico.</span>}
        </div>
      </div>

      {items.length > 0 && (
        <div className="ec-modal-list" style={{ marginTop: 16 }}>
          {items.map((item, idx) => {
            const ds = doseSummary(item);
            return (
              <div key={idx} className="ec-modal-item">
                <div className="ec-modal-item__main">
                  <span className="ec-modal-item__title">{item.farmacoNome}</span>
                  {ds && <span className="ec-modal-item__sub">{ds}</span>}
                  <span className="badge badge--gray">{item.stato}</span>
                </div>
                <div className="cr-item-row__actions">
                  <button
                    className="btn-secondary btn-sm"
                    type="button"
                    onClick={() => handleEdit(idx)}
                  >
                    Modifica
                  </button>
                  <button
                    className="icon-btn icon-btn--sm icon-btn--danger"
                    type="button"
                    onClick={() => handleRemove(idx)}
                    title="Rimuovi"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {items.length === 0 && <p className="cr-empty">Nessuna terapia aggiunta.</p>}
    </div>
  );
}
