import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Operatore, Paziente, PrioritaConsegna } from '../../types';
import { IcoCheck, IcoX } from '../../icons';
import type { ConsegnaCreate } from '../../lib/consegnaCreation';
import {
  createConsegnaDraftStore,
  submitConsegna,
  type ConsegnaDraftStore,
  type ConsegnaFields,
} from '../../lib/consegnaDrafts';
import { useConsegnaDraft } from '../../lib/useConsegnaDraft';
import { PatientCombobox } from '../shared/PatientCombobox';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import './ConsegnaCreateForm.css';

interface ConsegnaCreateFormProps {
  operatori: Operatore[];
  isAdmin: boolean;
  onAdd: ConsegnaCreate;
  draftStore?: ConsegnaDraftStore;
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

export function ConsegnaCreateForm({
  operatori,
  onAdd,
  onClose,
  draftStore,
}: ConsegnaCreateFormProps) {
  const [patient, setPatient] = useState<Paziente | null>(null);
  const [discard, setDiscard] = useState(false);
  const [store] = useState(() => draftStore ?? createConsegnaDraftStore());
  const draft = useConsegnaDraft(store, patient?.id ?? 'unselected');
  const form = draft.fields;
  const saving = draft.saving;
  const error = draft.outcome?.kind === 'failed' ? draft.outcome.message : null;
  const blocked = Boolean(
    draft.pending && draft.outcome?.kind === 'failed' && !draft.outcome.uncertain,
  );
  const generation = useRef(0);
  useEffect(() => {
    const version = ++generation.current;
    return () => {
      generation.current = version + 1;
    };
  }, [patient?.id]);
  useEffect(
    () => () => {
      if (!draftStore) store.clear();
    },
    [store, draftStore],
  );
  const setForm = (update: (current: ConsegnaFields) => ConsegnaFields) =>
    store.update(patient?.id ?? 'unselected', update(form));
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const canSubmit = Boolean(patient && form.note.trim() && form.scadenza && !saving && !blocked);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patient || !form.note.trim() || saving) {
      if (!patient) document.getElementById('handover-patient')?.focus();
      else noteRef.current?.focus();
      return;
    }

    const token = store.begin(patient.id);
    if (!token) return;
    const version = generation.current;
    if ((await submitConsegna(store, token, onAdd)) && version === generation.current) onClose();
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
        <fieldset className="handover-editor__section" disabled={saving}>
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
                helperText="Sono disponibili i pazienti registrati nel tuo perimetro, con codice fiscale o data di nascita."
              />
            </div>
            {
              <div className="form-field handover-editor__field--assignee">
                <label className="form-label" htmlFor="handover-assignee">
                  Assegna a
                </label>
                <select
                  id="handover-assignee"
                  name="operatoreAssegnatoId"
                  className="form-select"
                  value={form.operatoreAssegnatoId ?? ''}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      operatoreAssegnatoId: event.target.value,
                    }))
                  }
                  disabled={!patient || saving || Boolean(draft.pending)}
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
            }
          </div>
        </fieldset>

        <fieldset
          className="handover-editor__section"
          disabled={!patient || saving || Boolean(draft.pending)}
        >
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
                value={form.oraScadenza ?? ''}
                onChange={(event) =>
                  setForm((current) => ({ ...current, oraScadenza: event.target.value }))
                }
                disabled={saving}
              />
            </div>
          </div>
        </fieldset>

        <fieldset
          className="handover-editor__section handover-editor__section--last"
          disabled={!patient || saving || Boolean(draft.pending)}
        >
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
          Chiudi · conserva bozza
        </button>
        {patient && draft.dirty && (
          <button
            type="button"
            className="link-btn"
            onClick={() => setDiscard(true)}
            disabled={saving}
          >
            Scarta bozza
          </button>
        )}
        <button type="submit" className="btn-success" disabled={!canSubmit}>
          <IcoCheck />{' '}
          {saving ? 'Creazione…' : draft.pending ? 'Riprova salvataggio' : 'Crea consegna'}
        </button>
      </footer>
      <ConfirmDialog
        open={discard}
        title="Scartare la bozza?"
        message={
          draft.pending
            ? 'Il salvataggio potrebbe essere già avvenuto. Scartare la bozza non annulla una consegna salvata: verifica prima il Feed.'
            : 'I campi non salvati di questo paziente saranno eliminati.'
        }
        confirmLabel="Scarta bozza"
        onCancel={() => setDiscard(false)}
        onConfirm={() => {
          if (patient) store.discard(patient.id);
          setDiscard(false);
        }}
      />
    </form>
  );
}
