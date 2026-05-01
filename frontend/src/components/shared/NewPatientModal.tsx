import { useState } from 'react';
import type { NuovoPaziente, Operatore } from '../../types';
import { IcoX, IcoCheck } from '../../icons';

interface NewPatientModalProps {
  operatori: Operatore[];
  onSave: (p: NuovoPaziente) => void;
  onCancel: () => void;
}

const FORM_VUOTO: NuovoPaziente = {
  firstName: '', lastName: '', dateOfBirth: '', sex: 'M',
  phone: '', email: '', address: '', emergencyContact: '',
  notaClinicaIniziale: '', allergie: '', farmaci: '', operatoreId: '',
};

export function NewPatientModal({ operatori, onSave, onCancel }: NewPatientModalProps) {
  const [form, setForm] = useState<NuovoPaziente>(FORM_VUOTO);

  function f<K extends keyof NuovoPaziente>(k: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));
  }

  function salva() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.dateOfBirth) return;
    onSave(form);
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box modal-box--lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Nuovo Paziente</h3>
          <button className="icon-btn" onClick={onCancel}><IcoX /></button>
        </div>

        <div className="modal-body">
          <p className="modal-section-title">Dati anagrafici</p>
          <div className="op-form-grid">
            <div className="form-field">
              <label className="form-label">Nome *</label>
              <input className="form-input" value={form.firstName} onChange={f('firstName')} placeholder="Nome" />
            </div>
            <div className="form-field">
              <label className="form-label">Cognome *</label>
              <input className="form-input" value={form.lastName} onChange={f('lastName')} placeholder="Cognome" />
            </div>
            <div className="form-field">
              <label className="form-label">Data di nascita *</label>
              <input className="form-input" type="date" value={form.dateOfBirth} onChange={f('dateOfBirth')} />
            </div>
            <div className="form-field">
              <label className="form-label">Sesso</label>
              <select className="form-select" value={form.sex} onChange={f('sex')}>
                <option value="M">Maschio</option>
                <option value="F">Femmina</option>
                <option value="—">Non specificato</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Telefono</label>
              <input className="form-input" value={form.phone} onChange={f('phone')} placeholder="+39 …" />
            </div>
            <div className="form-field">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={f('email')} placeholder="email@…" />
            </div>
            <div className="form-field">
              <label className="form-label">Indirizzo</label>
              <input className="form-input" value={form.address} onChange={f('address')} placeholder="Via, Città" />
            </div>
            <div className="form-field">
              <label className="form-label">Contatto emergenza</label>
              <input className="form-input" value={form.emergencyContact} onChange={f('emergencyContact')} placeholder="Nome e telefono" />
            </div>
            <div className="form-field">
              <label className="form-label">Operatore assegnato</label>
              <select className="form-select" value={form.operatoreId} onChange={f('operatoreId')}>
                <option value="">— Seleziona —</option>
                {operatori.filter(o => o.stato === 'attivo').map(o => (
                  <option key={o.id} value={o.id}>{o.cognome} {o.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <p className="modal-section-title" style={{ marginTop: 18 }}>Informazioni cliniche iniziali</p>
          <div className="op-form-grid">
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Nota clinica iniziale</label>
              <textarea className="form-input" rows={3} value={form.notaClinicaIniziale} onChange={f('notaClinicaIniziale')}
                placeholder="Anamnesi, motivo della visita, condizioni generali…" />
            </div>
            <div className="form-field">
              <label className="form-label">Allergie note</label>
              <input className="form-input" value={form.allergie} onChange={f('allergie')} placeholder="es. Penicillina, Lattice…" />
            </div>
            <div className="form-field">
              <label className="form-label">Farmaci in uso</label>
              <input className="form-input" value={form.farmaci} onChange={f('farmaci')} placeholder="es. Losartan 50mg…" />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>Annulla</button>
          <button className="btn-primary" onClick={salva}><IcoCheck /> Crea paziente</button>
        </div>
      </div>
    </div>
  );
}
