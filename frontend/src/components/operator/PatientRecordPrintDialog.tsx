import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type {
  CartellaPaziente,
  Consegna,
  DiarioPazienteEntry,
  PatientTherapyAPI,
  Paziente,
} from '../../types';
import { loadAllDiaryPages } from '../../lib/diaryPages';
import { loadAllTherapyPages } from '../../lib/therapyPages';
import { AccessibleDialogSurface } from '../shared/AccessibleDialogSurface';
import PatientRecordPrintDocument from './PatientRecordPrintDocument';
import {
  PATIENT_RECORD_PRINT_SECTIONS,
  type PatientRecordPrintSectionId,
} from './patientRecordPrintSections';

interface Props {
  paziente: Paziente;
  cartella: CartellaPaziente;
  consegne: Consegna[];
  onClose: () => void;
}

export default function PatientRecordPrintDialog({ paziente, cartella, consegne, onClose }: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const selectAllRef = useRef<HTMLInputElement>(null);
  const allIds = useMemo(() => PATIENT_RECORD_PRINT_SECTIONS.map((section) => section.id), []);
  const [selected, setSelected] = useState<Set<PatientRecordPrintSectionId>>(() => new Set(allIds));
  const [therapyRows, setTherapyRows] = useState<PatientTherapyAPI[] | null>(null);
  const [diaryRows, setDiaryRows] = useState<DiarioPazienteEntry[] | null>(null);
  const [loadErrors, setLoadErrors] = useState<Partial<Record<'terapie' | 'diario', string>>>({});
  const allSelected = selected.size === allIds.length;
  const partiallySelected = selected.size > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = partiallySelected;
  }, [partiallySelected]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void Promise.allSettled([
      loadAllTherapyPages(paziente.id).then((rows) => {
        if (active) setTherapyRows(rows);
      }),
      loadAllDiaryPages(paziente.id, controller.signal).then((rows) => {
        if (active) setDiaryRows(rows);
      }),
    ]).then(([therapyResult, diaryResult]) => {
      if (!active) return;
      setLoadErrors({
        ...(therapyResult.status === 'rejected'
          ? { terapie: 'Terapie non disponibili: deseleziona la sezione o riprova.' }
          : {}),
        ...(diaryResult.status === 'rejected' && diaryResult.reason?.name !== 'AbortError'
          ? { diario: 'Diario non disponibile: deseleziona la sezione o riprova.' }
          : {}),
      });
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [paziente.id]);

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  function toggleSection(id: PatientRecordPrintSectionId) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedDataLoading =
    (selected.has('terapie') && therapyRows === null && !loadErrors.terapie) ||
    (selected.has('diario') && diaryRows === null && !loadErrors.diario);
  const selectedDataError =
    (selected.has('terapie') && loadErrors.terapie) ||
    (selected.has('diario') && loadErrors.diario);
  const printBlocked = selectedDataLoading || Boolean(selectedDataError);

  function handlePrint() {
    if (selected.size === 0 || printBlocked) return;
    document.body.classList.add('patient-record-printing');
    try {
      window.print();
    } finally {
      document.body.classList.remove('patient-record-printing');
      onClose();
    }
  }

  const fullName = `${paziente.lastName}, ${paziente.firstName}`;

  return (
    <>
      <AccessibleDialogSurface
        labelledBy={titleId}
        describedBy={descriptionId}
        onClose={onClose}
        className="patient-print-dialog no-print"
      >
        <div className="patient-print-dialog__header">
          <div>
            <p className="patient-print-dialog__eyebrow">Stampa cartella paziente</p>
            <h2 id={titleId}>Scegli le sezioni da stampare</h2>
            <p id={descriptionId}>
              {fullName} · seleziona l’intera scheda oppure solo le informazioni necessarie.
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Chiudi stampa">
            ×
          </button>
        </div>

        <div className="patient-print-dialog__body">
          <label className="patient-print-option patient-print-option--all">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              data-dialog-initial-focus
            />
            <span>
              <strong>Tutte le sezioni</strong>
              <small>Documento completo · {PATIENT_RECORD_PRINT_SECTIONS.length} sezioni</small>
            </span>
          </label>

          <fieldset className="patient-print-dialog__sections">
            <legend>Oppure scegli un sottoinsieme</legend>
            {PATIENT_RECORD_PRINT_SECTIONS.map((section) => (
              <label className="patient-print-option" key={section.id}>
                <input
                  type="checkbox"
                  checked={selected.has(section.id)}
                  onChange={() => toggleSection(section.id)}
                />
                <span>
                  <strong>{section.label}</strong>
                  <small>{section.description}</small>
                </span>
              </label>
            ))}
          </fieldset>

          {selectedDataError && (
            <p className="patient-print-dialog__error" role="alert">
              {selectedDataError}
            </p>
          )}
        </div>

        <div className="patient-print-dialog__footer">
          <span role="status" aria-live="polite">
            {selected.size === 0
              ? 'Seleziona almeno una sezione'
              : selectedDataLoading
                ? 'Preparazione dei dati clinici…'
                : `${selected.size} ${selected.size === 1 ? 'sezione selezionata' : 'sezioni selezionate'}`}
          </span>
          <div>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Annulla
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handlePrint}
              disabled={selected.size === 0 || printBlocked}
            >
              {selectedDataLoading ? 'Preparazione…' : 'Stampa selezione'}
            </button>
          </div>
        </div>
      </AccessibleDialogSurface>

      <PatientRecordPrintDocument
        paziente={paziente}
        cartella={cartella}
        consegne={consegne}
        selected={selected}
        therapyRows={therapyRows ?? []}
        diaryRows={diaryRows ?? []}
      />
    </>
  );
}
