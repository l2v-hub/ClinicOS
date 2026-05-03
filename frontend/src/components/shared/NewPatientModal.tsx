import { useState } from 'react';
import type { NuovoPaziente, Operatore, Camera } from '../../types';
import { IcoX, IcoCheck } from '../../icons';

interface NewPatientModalProps {
  operatori: Operatore[];
  camere?: Camera[];
  onSave: (p: NuovoPaziente) => void;
  onCancel: () => void;
}

const FORM_VUOTO: NuovoPaziente = {
  firstName: '', lastName: '', dateOfBirth: '', sex: 'M',
  codiceFiscale: '',
  phone: '', email: '', address: '',
  referenteNome: '', referenteTelefono: '',
  emergencyContact: '',
  provenienza: '',
  centroInviante: '', motivoIngresso: '', condizioniIniziali: '',
  operatoreId: '',
  camera: '', letto: '',
  notaClinicaIniziale: '', noteIniziali: '',
  allergie: '', farmaci: '',
};

export function NewPatientModal({ operatori, camere = [], onSave, onCancel }: NewPatientModalProps) {
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
      <div className="modal-box modal-box--lg" onClick={e => e.stopPropagation()} style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3 className="modal-title">Nuovo Paziente</h3>
          <button className="icon-btn" onClick={onCancel}><IcoX /></button>
        </div>

        <div className="modal-body">

          {/* ── Anagrafica ── */}
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
              <label className="form-label">Codice fiscale</label>
              <input className="form-input" value={form.codiceFiscale} onChange={f('codiceFiscale')} placeholder="RSSMRA…" />
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
          </div>

          {/* ── Referente ── */}
          <p className="modal-section-title" style={{ marginTop: 18 }}>Referente / Familiare</p>
          <div className="op-form-grid">
            <div className="form-field">
              <label className="form-label">Nome referente</label>
              <input className="form-input" value={form.referenteNome} onChange={f('referenteNome')} placeholder="Nome e cognome" />
            </div>
            <div className="form-field">
              <label className="form-label">Telefono referente</label>
              <input className="form-input" value={form.referenteTelefono} onChange={f('referenteTelefono')} placeholder="+39 …" />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Contatto emergenza</label>
              <input className="form-input" value={form.emergencyContact} onChange={f('emergencyContact')} placeholder="Nome e telefono" />
            </div>
          </div>

          {/* ── Provenienza ── */}
          <p className="modal-section-title" style={{ marginTop: 18 }}>Provenienza e ingresso</p>
          <div className="op-form-grid">
            <div className="form-field">
              <label className="form-label">Provenienza</label>
              <select className="form-select" value={form.provenienza} onChange={f('provenienza')}>
                <option value="">— Seleziona —</option>
                <option value="accesso_diretto">Accesso diretto</option>
                <option value="centro_medico">Centro medico</option>
                <option value="altra_struttura">Altra struttura</option>
                <option value="dimissione_ospedaliera">Dimissione ospedaliera</option>
                <option value="familiare_caregiver">Familiare / Caregiver</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Centro inviante</label>
              <input className="form-input" value={form.centroInviante} onChange={f('centroInviante')} placeholder="Ospedale, clinica…" />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Motivo ingresso</label>
              <textarea className="form-input" rows={2} value={form.motivoIngresso} onChange={f('motivoIngresso')}
                placeholder="Diagnosi di accesso, motivo della presa in carico…" />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Condizioni iniziali</label>
              <textarea className="form-input" rows={2} value={form.condizioniIniziali} onChange={f('condizioniIniziali')}
                placeholder="Descrizione delle condizioni al momento dell'ingresso…" />
            </div>
          </div>

          {/* ── Assegnazione ── */}
          <p className="modal-section-title" style={{ marginTop: 18 }}>Assegnazione</p>
          <div className="op-form-grid">
            <div className="form-field">
              <label className="form-label">Operatore assegnato</label>
              <select className="form-select" value={form.operatoreId} onChange={f('operatoreId')}>
                <option value="">— Seleziona —</option>
                {operatori.filter(o => o.stato === 'attivo').map(o => (
                  <option key={o.id} value={o.id}>{o.cognome} {o.nome}</option>
                ))}
              </select>
            </div>
            {camere.length > 0 ? (
              <div className="form-field">
                <label className="form-label">Camera</label>
                <select className="form-select" value={form.camera} onChange={f('camera')}>
                  <option value="">— Seleziona —</option>
                  {camere.map(c => (
                    <option key={c.id} value={c.numero}>Camera {c.numero} ({c.tipo})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="form-field">
                <label className="form-label">Camera</label>
                <input className="form-input" value={form.camera} onChange={f('camera')} placeholder="N° camera" />
              </div>
            )}
            <div className="form-field">
              <label className="form-label">Letto / Posto letto</label>
              <input className="form-input" value={form.letto} onChange={f('letto')} placeholder="es. 1, 2, A…" />
            </div>
          </div>

          {/* ── Clinica iniziale ── */}
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
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Note iniziali</label>
              <textarea className="form-input" rows={2} value={form.noteIniziali} onChange={f('noteIniziali')}
                placeholder="Ulteriori note per l'operatore…" />
            </div>
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>Annulla</button>
          <button className="btn-primary" onClick={salva}
            disabled={!form.firstName.trim() || !form.lastName.trim() || !form.dateOfBirth}>
            <IcoCheck /> Crea paziente
          </button>
        </div>
      </div>
    </div>
  );
}
