import { useState, useEffect } from 'react';
import type { Appuntamento, Operatore, Paziente, TipoIntervento } from '../../types';
import { IcoX, IcoCheck, IcoPlus } from '../../icons';

interface AppointmentFormProps {
  data: string;
  ora: string;
  operatoreId: string;
  operatori: Operatore[];
  pazienti: Paziente[];
  /** SPEC-015 US4: persists via REST — resolves with an error message, or null on success. */
  onSave: (apt: Omit<Appuntamento, 'id'>) => Promise<string | null>;
  onCancel: () => void;
  onNewPatient: () => void;
}

const TIPO_OPTIONS: { value: TipoIntervento; label: string }[] = [
  { value: 'visita',     label: 'Visita' },
  { value: 'controllo',  label: 'Controllo' },
  { value: 'procedura',  label: 'Procedura' },
  { value: 'urgenza',    label: 'Urgenza' },
  { value: 'consulto',   label: 'Consulto' },
  { value: 'follow-up',  label: 'Follow-up' },
  { value: 'altro',      label: 'Altro' },
];

const DURATA_OPTIONS = [
  { value: 30,  label: '30 min' },
  { value: 60,  label: '1 ora' },
  { value: 90,  label: '1h 30min' },
  { value: 120, label: '2 ore' },
];

export function AppointmentForm({
  data, ora, operatoreId, operatori, pazienti, onSave, onCancel, onNewPatient,
}: AppointmentFormProps) {
  const [form, setForm] = useState({
    data,
    ora,
    durata: 30,
    pazienteId: '' as string,
    pazienteNome: '',
    operatoreId,
    tipoIntervento: 'visita' as TipoIntervento,
    stato: 'programmato' as Appuntamento['stato'],
    priorita: 'normale' as Appuntamento['priorita'],
    note: '',
    cameraId: '',
  });

  const [pazienteSearch, setPazienteSearch] = useState('');
  const [showPazSearch, setShowPazSearch] = useState(false);
  // SPEC-015 US4 (FR-018): visible saving state + explicit error (e.g. slot conflict 409).
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const pazientiFiltrati = pazienteSearch.length > 1
    ? pazienti.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(pazienteSearch.toLowerCase()) ||
        p.medicalRecordNumber.toLowerCase().includes(pazienteSearch.toLowerCase())
      ).slice(0, 6)
    : [];

  const operatoreSelezionato = operatori.find(o => o.id === form.operatoreId);

  async function salva() {
    if (!form.operatoreId || saving) return;
    const op = operatori.find(o => o.id === form.operatoreId);
    setSaving(true);
    setSaveError(null);
    const err = await onSave({
      ...form,
      operatoreNome: op ? `${op.cognome} ${op.nome}` : '',
      pazienteId: form.pazienteId || null,
      pazienteNome: form.pazienteNome || null,
      cameraId: form.cameraId || undefined,
    });
    setSaving(false);
    if (err) setSaveError(err); // il parent chiude il form solo in caso di successo
  }

  function selectPaziente(p: Paziente) {
    setForm(f => ({ ...f, pazienteId: p.id, pazienteNome: `${p.lastName}, ${p.firstName}` }));
    setPazienteSearch(`${p.lastName}, ${p.firstName}`);
    setShowPazSearch(false);
  }

  useEffect(() => {
    setForm(f => ({ ...f, data, ora, operatoreId }));
  }, [data, ora, operatoreId]);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Nuovo Appuntamento</h3>
          <button className="icon-btn" onClick={onCancel}><IcoX /></button>
        </div>

        <div className="modal-body">
          {/* Paziente */}
          <div className="form-field">
            <label className="form-label">Paziente</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                value={pazienteSearch}
                onChange={e => { setPazienteSearch(e.target.value); setShowPazSearch(true); setForm(f => ({ ...f, pazienteId: '', pazienteNome: '' })); }}
                onFocus={() => setShowPazSearch(true)}
                placeholder="Cerca paziente per nome o MRN…"
              />
              {showPazSearch && pazientiFiltrati.length > 0 && (
                <div className="search-dropdown">
                  {pazientiFiltrati.map(p => (
                    <button key={p.id} className="search-dropdown__item" onClick={() => selectPaziente(p)}>
                      <span className="search-dropdown__name">{p.lastName}, {p.firstName}</span>
                      <span className="search-dropdown__mrn">{p.medicalRecordNumber}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="link-btn" style={{ marginTop: 4, fontSize: 12 }} onClick={onNewPatient}>
              <IcoPlus /> Crea nuovo paziente
            </button>
          </div>

          <div className="op-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
            <div className="form-field">
              <label className="form-label">Data</label>
              <input className="form-input" type="date" value={form.data}
                onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Ora</label>
              <input className="form-input" type="time" value={form.ora}
                onChange={e => setForm(f => ({ ...f, ora: e.target.value }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Durata</label>
              <select className="form-select" value={form.durata}
                onChange={e => setForm(f => ({ ...f, durata: Number(e.target.value) }))}>
                {DURATA_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Tipo intervento</label>
              <select className="form-select" value={form.tipoIntervento}
                onChange={e => setForm(f => ({ ...f, tipoIntervento: e.target.value as TipoIntervento }))}>
                {TIPO_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Priorità</label>
              <select className="form-select" value={form.priorita}
                onChange={e => setForm(f => ({ ...f, priorita: e.target.value as Appuntamento['priorita'] }))}>
                <option value="normale">Normale</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Operatore</label>
              <select className="form-select" value={form.operatoreId}
                onChange={e => setForm(f => ({ ...f, operatoreId: e.target.value }))}>
                {operatori.filter(o => o.stato === 'attivo').map(o => (
                  <option key={o.id} value={o.id}>{o.cognome} {o.nome}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Camera (opz.)</label>
              <input className="form-input" value={form.cameraId}
                onChange={e => setForm(f => ({ ...f, cameraId: e.target.value }))}
                placeholder="N° camera" />
            </div>
            <div className="form-field">
              <label className="form-label">Stato</label>
              <select className="form-select" value={form.stato}
                onChange={e => setForm(f => ({ ...f, stato: e.target.value as Appuntamento['stato'] }))}>
                <option value="programmato">Programmato</option>
                <option value="in_corso">In corso</option>
                <option value="completato">Completato</option>
                <option value="annullato">Annullato</option>
              </select>
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Note cliniche</label>
            <textarea className="form-input" rows={3} value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Note, promemoria clinico, consegna…" />
          </div>

          {/* Operatore color preview */}
          {operatoreSelezionato && (
            <div className="apt-operator-preview">
              <span className="apt-op-dot" style={{ background: operatoreSelezionato.colore }} />
              <span>{operatoreSelezionato.cognome} {operatoreSelezionato.nome} · {operatoreSelezionato.reparto}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {saveError && (
            <p className="form-error" role="alert" style={{ color: 'var(--red, #DC2626)', margin: '0 auto 0 0', fontSize: 13 }}>
              {saveError}
            </p>
          )}
          <button className="btn-secondary" onClick={onCancel} disabled={saving}>Annulla</button>
          <button className="btn-primary" onClick={() => { void salva(); }} disabled={saving}>
            <IcoCheck /> {saving ? 'Salvataggio…' : 'Salva appuntamento'}
          </button>
        </div>
      </div>
    </div>
  );
}
