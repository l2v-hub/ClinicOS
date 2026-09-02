import { useState, useEffect } from 'react';
import type { Appuntamento, Operatore, Paziente, TipoIntervento } from '../../types';
import { IcoX, IcoCheck, IcoPlus } from '../../icons';
import { AccessibleDialogSurface } from './AccessibleDialogSurface';
import { PatientCombobox } from './PatientCombobox';

interface AppointmentFormProps {
  data: string;
  ora: string;
  operatoreId: string;
  operatori: Operatore[];
  /** Se presente, il form e' in modifica su questo appuntamento invece che in creazione. */
  appuntamento?: Appuntamento;
  /** SPEC-015 US4: persists via REST — resolves with an error message, or null on success. */
  onSave: (apt: Omit<Appuntamento, 'id'>) => Promise<string | null>;
  onCancel: () => void;
  onNewPatient: () => void;
}

const TIPO_OPTIONS: { value: TipoIntervento; label: string }[] = [
  { value: 'visita', label: 'Visita' },
  { value: 'controllo', label: 'Controllo' },
  { value: 'procedura', label: 'Procedura' },
  { value: 'urgenza', label: 'Urgenza' },
  { value: 'consulto', label: 'Consulto' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'altro', label: 'Altro' },
];

const DURATA_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 ora' },
  { value: 90, label: '1h 30min' },
  { value: 120, label: '2 ore' },
];

export function AppointmentForm({
  data,
  ora,
  operatoreId,
  operatori,
  appuntamento,
  onSave,
  onCancel,
  onNewPatient,
}: AppointmentFormProps) {
  const isEdit = appuntamento !== undefined;
  const [form, setForm] = useState({
    data: appuntamento?.data ?? data,
    ora: appuntamento?.ora ?? ora,
    durata: appuntamento?.durata ?? 30,
    pazienteId: appuntamento?.pazienteId ?? '',
    pazienteNome: appuntamento?.pazienteNome ?? '',
    operatoreId: appuntamento?.operatoreId ?? operatoreId,
    tipoIntervento: appuntamento?.tipoIntervento ?? ('visita' as TipoIntervento),
    stato: appuntamento?.stato ?? ('programmato' as Appuntamento['stato']),
    priorita: appuntamento?.priorita ?? ('normale' as Appuntamento['priorita']),
    note: appuntamento?.note ?? '',
    cameraId: appuntamento?.cameraId ?? '',
  });

  const [selectedPatient, setSelectedPatient] = useState<Paziente | null>(null);
  // SPEC-015 US4 (FR-018): visible saving state + explicit error (e.g. slot conflict 409).
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const operatoreSelezionato = operatori.find((o) => o.id === form.operatoreId);

  async function salva() {
    if (!form.operatoreId || saving) return;
    const op = operatori.find((o) => o.id === form.operatoreId);
    setSaving(true);
    setSaveError(null);
    try {
      const err = await onSave({
        ...form,
        operatoreNome: op ? `${op.cognome} ${op.nome}` : '',
        pazienteId: form.pazienteId || null,
        pazienteNome: form.pazienteNome || null,
        cameraId: form.cameraId || undefined,
      });
      if (err) setSaveError(err); // il parent chiude il form solo in caso di successo
    } catch {
      setSaveError('Impossibile salvare l’appuntamento. Riprova.');
    } finally {
      setSaving(false);
    }
  }

  function selectPaziente(patient: Paziente | null) {
    setSelectedPatient(patient);
    setForm((current) => ({
      ...current,
      pazienteId: patient?.id ?? '',
      pazienteNome: patient ? `${patient.lastName}, ${patient.firstName}` : '',
    }));
  }

  useEffect(() => {
    if (isEdit) return; // in modifica i valori vengono dall'appuntamento, non dalla cella cliccata
    // The open dialog follows the calendar cell if the parent changes its selected slot.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((f) => ({ ...f, data, ora, operatoreId }));
  }, [data, ora, operatoreId, isEdit]);

  return (
    <AccessibleDialogSurface
      labelledBy="appointment-dialog-title"
      onClose={onCancel}
      dismissible={!saving}
    >
      <div className="modal-header">
        <h3 className="modal-title" id="appointment-dialog-title">
          {isEdit ? 'Modifica Appuntamento' : 'Nuovo Appuntamento'}
        </h3>
        <button
          type="button"
          className="icon-btn"
          onClick={onCancel}
          aria-label="Chiudi"
          data-dialog-initial-focus
          disabled={saving}
        >
          <IcoX />
        </button>
      </div>

      <div className="modal-body">
        {/* Il paziente non e' modificabile: PATCH /appointments/:id non accetta patientId,
              mostrarlo editabile prometterebbe un salvataggio che non avviene. */}
        {isEdit ? (
          <div className="form-field">
            <label className="form-label">Paziente</label>
            <p className="apt-form-readonly">{appuntamento.pazienteNome ?? '—'}</p>
          </div>
        ) : (
          <div>
            <PatientCombobox
              inputId="appointment-patient"
              label="Paziente"
              selected={selectedPatient}
              onChange={selectPaziente}
              disabled={saving}
            />
            <button
              type="button"
              className="link-btn"
              style={{ marginTop: 4, fontSize: 12 }}
              onClick={onNewPatient}
            >
              <IcoPlus /> Crea nuovo paziente
            </button>
          </div>
        )}

        <div
          className="op-form-grid"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
        >
          <div className="form-field">
            <label className="form-label">Data</label>
            <input
              className="form-input"
              type="date"
              value={form.data}
              onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Ora</label>
            <input
              className="form-input"
              type="time"
              value={form.ora}
              onChange={(e) => setForm((f) => ({ ...f, ora: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Durata</label>
            <select
              className="form-select"
              value={form.durata}
              onChange={(e) => setForm((f) => ({ ...f, durata: Number(e.target.value) }))}
            >
              {DURATA_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Tipo intervento</label>
            <select
              className="form-select"
              value={form.tipoIntervento}
              onChange={(e) =>
                setForm((f) => ({ ...f, tipoIntervento: e.target.value as TipoIntervento }))
              }
            >
              {TIPO_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Priorità</label>
            <select
              className="form-select"
              value={form.priorita}
              onChange={(e) =>
                setForm((f) => ({ ...f, priorita: e.target.value as Appuntamento['priorita'] }))
              }
            >
              <option value="normale">Normale</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Operatore</label>
            <select
              className="form-select"
              value={form.operatoreId}
              onChange={(e) => setForm((f) => ({ ...f, operatoreId: e.target.value }))}
            >
              {operatori
                .filter((o) => o.stato === 'attivo')
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.cognome} {o.nome}
                  </option>
                ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Camera (opz.)</label>
            <input
              className="form-input"
              value={form.cameraId}
              onChange={(e) => setForm((f) => ({ ...f, cameraId: e.target.value }))}
              placeholder="N° camera"
            />
          </div>
          <div className="form-field">
            <label className="form-label">Stato</label>
            <select
              className="form-select"
              value={form.stato}
              onChange={(e) =>
                setForm((f) => ({ ...f, stato: e.target.value as Appuntamento['stato'] }))
              }
            >
              <option value="programmato">Programmato</option>
              <option value="in_corso">In corso</option>
              <option value="completato">Completato</option>
              <option value="annullato">Annullato</option>
            </select>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Note cliniche</label>
          <textarea
            className="form-input"
            rows={3}
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="Note, promemoria clinico, consegna…"
          />
        </div>

        {/* Operatore color preview */}
        {operatoreSelezionato && (
          <div className="apt-operator-preview">
            <span className="apt-op-dot" style={{ background: operatoreSelezionato.colore }} />
            <span>
              {operatoreSelezionato.cognome} {operatoreSelezionato.nome} ·{' '}
              {operatoreSelezionato.reparto}
            </span>
          </div>
        )}
      </div>

      <div className="modal-footer">
        {saveError && (
          <p
            className="form-error"
            role="alert"
            style={{ color: 'var(--red, #DC2626)', margin: '0 auto 0 0', fontSize: 13 }}
          >
            {saveError}
          </p>
        )}
        <button className="btn-secondary" onClick={onCancel} disabled={saving}>
          Annulla
        </button>
        <button
          className="btn-success"
          onClick={() => {
            void salva();
          }}
          disabled={saving || (!isEdit && !form.pazienteId)}
        >
          <IcoCheck /> {saving ? 'Salvataggio…' : isEdit ? 'Salva modifiche' : 'Salva appuntamento'}
        </button>
      </div>
    </AccessibleDialogSurface>
  );
}
