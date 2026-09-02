import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { NewNotaInput, Operatore, Paziente, PrioritaNota } from '../../types';
import { IcoCheck, IcoX } from '../../icons';
import { PatientCombobox } from './PatientCombobox';
import './NoteCreateForm.css';

interface NoteCreateFormProps {
  utenteId: string;
  operatori: Operatore[];
  onAdd: (note: NewNotaInput) => Promise<boolean>;
  onClose: () => void;
}

interface NoteDraft {
  destinatarioId: string;
  priorita: PrioritaNota;
  messaggio: string;
}

const EMPTY_DRAFT: NoteDraft = {
  destinatarioId: '',
  priorita: 'normale',
  messaggio: '',
};

export function NoteCreateForm({ utenteId, operatori, onAdd, onClose }: NoteCreateFormProps) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [patient, setPatient] = useState<Paziente | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recipientRef = useRef<HTMLSelectElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const recipients = [
    { id: 'tutti', name: 'Tutti gli operatori' },
    { id: 'admin', name: 'Amministrazione' },
    ...operatori
      .filter((operator) => operator.stato === 'attivo' && operator.id !== utenteId)
      .map((operator) => ({ id: operator.id, name: `${operator.cognome} ${operator.nome}` })),
  ];
  const canSubmit = Boolean(draft.destinatarioId && draft.messaggio.trim() && !saving);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.destinatarioId) {
      recipientRef.current?.focus();
      return;
    }
    if (!draft.messaggio.trim() || saving) {
      messageRef.current?.focus();
      return;
    }

    const recipient = recipients.find((item) => item.id === draft.destinatarioId);
    if (!recipient) {
      setError('Il destinatario selezionato non è più disponibile.');
      recipientRef.current?.focus();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const saved = await onAdd({
        destinatarioId: recipient.id,
        pazienteId: patient?.id,
        priorita: draft.priorita,
        messaggio: draft.messaggio.trim(),
      });
      if (!saved) {
        setError('Invio non riuscito. Controlla i dati e riprova.');
        return;
      }
      onClose();
    } catch {
      setError('Invio non riuscito. Controlla la connessione e riprova.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      id="nuova-nota-panel"
      className="op-form-panel note-editor"
      aria-labelledby="new-note-title"
      aria-busy={saving}
      onSubmit={submit}
    >
      <header className="op-form-panel__header note-editor__header">
        <div>
          <span className="note-editor__eyebrow">Comunicazione clinica</span>
          <h3 id="new-note-title" className="op-form-panel__title">
            Nuova nota o messaggio
          </h3>
          <p className="note-editor__intro">
            Indica chiaramente il destinatario e collega il paziente quando il messaggio riguarda la
            sua assistenza.
          </p>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label="Chiudi nuova nota"
          onClick={onClose}
          disabled={saving}
        >
          <IcoX />
        </button>
      </header>

      <div className="note-editor__body">
        <fieldset className="note-editor__section">
          <legend>Destinazione</legend>
          <div className="note-editor__grid">
            <div className="form-field note-editor__field--recipient">
              <label className="form-label" htmlFor="note-recipient">
                Destinatario <span aria-hidden="true">*</span>
              </label>
              <select
                ref={recipientRef}
                id="note-recipient"
                name="destinatarioId"
                className="form-select"
                value={draft.destinatarioId}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, destinatarioId: event.target.value }))
                }
                disabled={saving}
                required
                autoFocus
              >
                <option value="">Seleziona destinatario</option>
                {recipients.map((recipient) => (
                  <option key={recipient.id} value={recipient.id}>
                    {recipient.name}
                  </option>
                ))}
              </select>
              <span className="note-editor__helper">
                La scelta esplicita evita invii involontari a tutta la struttura.
              </span>
            </div>

            <div className="note-editor__field--patient">
              <PatientCombobox
                inputId="note-patient"
                label="Paziente (opzionale)"
                selected={patient}
                onChange={setPatient}
                disabled={saving}
                helperText="Associa il paziente per rendere il messaggio subito riconoscibile; codice fiscale e scheda restano visibili."
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="note-editor__section note-editor__section--last">
          <legend>Messaggio</legend>
          <div className="note-editor__grid">
            <div className="form-field note-editor__field--priority">
              <label className="form-label" htmlFor="note-priority">
                Priorità
              </label>
              <select
                id="note-priority"
                name="priorita"
                className="form-select"
                value={draft.priorita}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    priorita: event.target.value as PrioritaNota,
                  }))
                }
                disabled={saving}
              >
                <option value="normale">Normale</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>

            <div className="form-field note-editor__field--message">
              <label className="form-label" htmlFor="note-message">
                Testo del messaggio <span aria-hidden="true">*</span>
              </label>
              <textarea
                ref={messageRef}
                id="note-message"
                name="messaggio"
                className="form-input note-editor__message"
                rows={3}
                value={draft.messaggio}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, messaggio: event.target.value }))
                }
                placeholder="Es. Verificare l’esito dell’esame e aggiornare il diario clinico"
                maxLength={4000}
                aria-describedby="note-message-counter"
                disabled={saving}
                required
              />
              <span id="note-message-counter" className="note-editor__counter">
                {draft.messaggio.length}/4000
              </span>
            </div>
          </div>
        </fieldset>
      </div>

      <footer className="op-form-panel__actions note-editor__actions">
        {error ? (
          <p className="form-error note-editor__error" role="alert">
            {error}
          </p>
        ) : (
          <p className="note-editor__required-note">
            <span aria-hidden="true">*</span> Campi obbligatori
          </p>
        )}
        <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
          Annulla
        </button>
        <button type="submit" className="btn-success" disabled={!canSubmit}>
          <IcoCheck /> {saving ? 'Invio…' : 'Invia nota'}
        </button>
      </footer>
    </form>
  );
}
