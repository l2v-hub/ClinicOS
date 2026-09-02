import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { NewConsegnaInput, Operatore, Paziente, PrioritaConsegna } from '../../types';
import { IcoCheck, IcoX } from '../../icons';
import { localIsoDate } from '../../lib/appointmentRange';
import { PatientCombobox } from '../shared/PatientCombobox';
import './ConsegnaCreateForm.css';

interface ConsegnaCreateFormProps {
  operatori: Operatore[];
  isAdmin: boolean;
  onAdd: (input: NewConsegnaInput) => Promise<boolean>;
  onClose: () => void;
}

const TIPO_OPTIONS = [
  'Monitoraggio',
  'Terapia',
  'Esami',
  'Dimissione',
  'Medicazione',
  'Consultazione',
  'Rivalutazione',
  'Altro',
];

function createEmptyForm() {
  return {
    tipo: 'Monitoraggio',
    priorita: 'normale' as PrioritaConsegna,
    scadenza: localIsoDate(),
    oraScadenza: '',
    operatoreAssegnatoId: '',
    note: '',
  };
}

export function ConsegnaCreateForm({
  operatori,
  isAdmin,
  onAdd,
  onClose,
}: ConsegnaCreateFormProps) {
  const [patient, setPatient] = useState<Paziente | null>(null);
  const [form, setForm] = useState(createEmptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const canSubmit = Boolean(patient && form.note.trim() && form.scadenza && !saving);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patient || !form.note.trim() || saving) {
      if (!patient) document.getElementById('handover-patient')?.focus();
      else noteRef.current?.focus();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const ok = await onAdd({
        pazienteId: patient.id,
        priorita: form.priorita,
        tipo: form.tipo,
        note: form.note.trim(),
        scadenza: form.scadenza,
        oraScadenza: form.oraScadenza || undefined,
        operatoreAssegnatoId: form.operatoreAssegnatoId || null,
      });
      if (!ok) {
        setError('Creazione non riuscita. Verifica i dati e riprova.');
        return;
      }
      onClose();
    } catch {
      setError('Creazione non riuscita. Verifica i dati e riprova.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      id="nuova-consegna-panel"
      className="op-form-panel handover-editor"
      aria-labelledby="new-handover-title"
      aria-busy={saving}
      onSubmit={submit}
    >
      <header className="op-form-panel__header handover-editor__header">
        <div>
          <span className="handover-editor__eyebrow">Passaggio operativo</span>
          <h3 id="new-handover-title" className="op-form-panel__title">
            Nuova consegna
          </h3>
          <p className="handover-editor__intro">
            Associa il paziente e indica con chiarezza cosa deve fare il prossimo operatore.
          </p>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label="Chiudi nuova consegna"
          onClick={onClose}
          disabled={saving}
        >
          <IcoX />
        </button>
      </header>

      <div className="handover-editor__body">
        <fieldset className="handover-editor__section">
          <legend>Destinatario</legend>
          <div className="handover-editor__grid">
            <div className="handover-editor__field--patient">
              <PatientCombobox
                inputId="handover-patient"
                label="Paziente"
                selected={patient}
                onChange={setPatient}
                required
                disabled={saving}
                helperText="Sono disponibili i pazienti registrati nel tuo perimetro. Il codice fiscale resta sempre visibile."
              />
            </div>
            {isAdmin && (
              <div className="form-field handover-editor__field--assignee">
                <label className="form-label" htmlFor="handover-assignee">
                  Assegna a
                </label>
                <select
                  id="handover-assignee"
                  name="operatoreAssegnatoId"
                  className="form-select"
                  value={form.operatoreAssegnatoId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      operatoreAssegnatoId: event.target.value,
                    }))
                  }
                  disabled={saving}
                >
                  <option value="">Non assegnata</option>
                  {operatori
                    .filter((operator) => operator.stato === 'attivo')
                    .map((operator) => (
                      <option key={operator.id} value={operator.id}>
                        {operator.cognome} {operator.nome}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        </fieldset>

        <fieldset className="handover-editor__section">
          <legend>Dettagli operativi</legend>
          <div className="handover-editor__grid">
            <div className="form-field handover-editor__field--third">
              <label className="form-label" htmlFor="handover-type">
                Tipo
              </label>
              <select
                id="handover-type"
                name="tipo"
                className="form-select"
                value={form.tipo}
                onChange={(event) =>
                  setForm((current) => ({ ...current, tipo: event.target.value }))
                }
                disabled={saving}
              >
                {TIPO_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field handover-editor__field--third">
              <label className="form-label" htmlFor="handover-priority">
                Priorità
              </label>
              <select
                id="handover-priority"
                name="priorita"
                className="form-select"
                value={form.priorita}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priorita: event.target.value as PrioritaConsegna,
                  }))
                }
                disabled={saving}
              >
                <option value="normale">Normale</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div className="form-field handover-editor__field--third">
              <label className="form-label" htmlFor="handover-date">
                Data scadenza
              </label>
              <input
                id="handover-date"
                name="scadenza"
                className="form-input"
                type="date"
                value={form.scadenza}
                onChange={(event) =>
                  setForm((current) => ({ ...current, scadenza: event.target.value }))
                }
                disabled={saving}
                required
              />
            </div>
            <div className="form-field handover-editor__field--third">
              <label className="form-label" htmlFor="handover-time">
                Ora scadenza <span className="handover-editor__optional-label">opzionale</span>
              </label>
              <input
                id="handover-time"
                name="oraScadenza"
                className="form-input"
                type="time"
                value={form.oraScadenza}
                onChange={(event) =>
                  setForm((current) => ({ ...current, oraScadenza: event.target.value }))
                }
                disabled={saving}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="handover-editor__section handover-editor__section--last">
          <legend>Istruzioni</legend>
          <div className="form-field">
            <label className="form-label" htmlFor="handover-notes">
              Cosa deve essere fatto? <span aria-hidden="true">*</span>
            </label>
            <textarea
              ref={noteRef}
              id="handover-notes"
              name="note"
              className="form-input handover-editor__notes"
              rows={3}
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              placeholder="Es. Controllare la pressione dopo cena e registrare il valore"
              maxLength={4000}
              disabled={saving}
              required
            />
            <span className="handover-editor__counter">{form.note.length}/4000</span>
          </div>
        </fieldset>
      </div>

      <footer className="op-form-panel__actions handover-editor__actions">
        {error ? (
          <p className="form-error handover-editor__error" role="alert">
            {error}
          </p>
        ) : (
          <p className="handover-editor__required-note">
            <span aria-hidden="true">*</span> Campi obbligatori
          </p>
        )}
        <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
          Annulla
        </button>
        <button type="submit" className="btn-success" disabled={!canSubmit}>
          <IcoCheck /> {saving ? 'Creazione…' : 'Crea consegna'}
        </button>
      </footer>
    </form>
  );
}
