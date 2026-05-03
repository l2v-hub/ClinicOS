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
  referenteNome: '', referenteTelefono: '', referenteRelazione: '',
  emergencyContact: '',
  provenienza: '',
  centroInviante: '', motivoIngresso: '', condizioniIniziali: '',
  operatoreId: '',
  camera: '', letto: '', statoPaziente: '',
  notaClinicaIniziale: '', noteIniziali: '',
  allergie: '', farmaci: '',
  alertClinici: '',
};

// ── Section wrapper ──────────────────────────────────────────────────────────

function NpmSection({ title, desc, children }: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="npm-section">
      <div className="npm-section__head">
        <span className="npm-section__title">{title}</span>
        {desc && <span className="npm-section__desc">{desc}</span>}
      </div>
      <div className="npm-section__body">{children}</div>
    </div>
  );
}

// ── Field helpers ────────────────────────────────────────────────────────────

function Field({ label, required, hint, span2, children }: {
  label: string;
  required?: boolean;
  hint?: string;
  span2?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`npm-field${span2 ? ' npm-span-2' : ''}`}>
      <label className="npm-label">
        {label}
        {required && <span className="npm-required" aria-label="obbligatorio"> *</span>}
      </label>
      {children}
      {hint && <span className="npm-hint">{hint}</span>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

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

  const canSave = !!(form.firstName.trim() && form.lastName.trim() && form.dateOfBirth);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box modal-box--patient" onClick={e => e.stopPropagation()}>

        {/* ── Header fisso ── */}
        <div className="modal-header npm-header">
          <div className="npm-header__text">
            <h3 className="npm-header__title">Nuovo paziente</h3>
            <p className="npm-header__subtitle">
              Registra anagrafica, contatti e dati iniziali di presa in carico
            </p>
          </div>
          <button className="icon-btn npm-close-btn" onClick={onCancel} aria-label="Chiudi">
            <IcoX />
          </button>
        </div>

        {/* ── Corpo scrollabile ── */}
        <div className="modal-body npm-body">

          {/* 1. Dati anagrafici */}
          <NpmSection title="1. Dati anagrafici">
            <div className="npm-grid">
              <Field label="Nome" required>
                <input
                  className="npm-input"
                  value={form.firstName}
                  onChange={f('firstName')}
                  placeholder="Mario"
                  autoFocus
                  autoComplete="given-name"
                />
              </Field>
              <Field label="Cognome" required>
                <input
                  className="npm-input"
                  value={form.lastName}
                  onChange={f('lastName')}
                  placeholder="Rossi"
                  autoComplete="family-name"
                />
              </Field>
              <Field label="Data di nascita" required>
                <input
                  className="npm-input"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={f('dateOfBirth')}
                />
              </Field>
              <Field label="Sesso">
                <select className="npm-input npm-select" value={form.sex} onChange={f('sex')}>
                  <option value="M">Maschio</option>
                  <option value="F">Femmina</option>
                  <option value="—">Non specificato</option>
                </select>
              </Field>
              <Field label="Codice fiscale" span2 hint="Inserisci in maiuscolo — es. RSSMRA80A01H501U">
                <input
                  className="npm-input npm-mono"
                  value={form.codiceFiscale}
                  onChange={f('codiceFiscale')}
                  placeholder="RSSMRA80A01H501U"
                  maxLength={16}
                  style={{ textTransform: 'uppercase' }}
                />
              </Field>
            </div>
          </NpmSection>

          {/* 2. Contatti */}
          <NpmSection title="2. Contatti" desc="Recapiti diretti del paziente">
            <div className="npm-grid">
              <Field label="Telefono">
                <input
                  className="npm-input"
                  type="tel"
                  value={form.phone}
                  onChange={f('phone')}
                  placeholder="+39 333 000 0000"
                  autoComplete="tel"
                />
              </Field>
              <Field label="Email">
                <input
                  className="npm-input"
                  type="email"
                  value={form.email}
                  onChange={f('email')}
                  placeholder="mario.rossi@email.it"
                  autoComplete="email"
                />
              </Field>
              <Field label="Indirizzo" span2>
                <input
                  className="npm-input"
                  value={form.address}
                  onChange={f('address')}
                  placeholder="Via Roma 1, 20100 Milano MI"
                  autoComplete="street-address"
                />
              </Field>
            </div>
          </NpmSection>

          {/* 3. Referente / Familiare */}
          <NpmSection title="3. Referente / Familiare" desc="Persona di riferimento e contatto in caso di emergenza">
            <div className="npm-grid">
              <Field label="Nome e cognome referente">
                <input
                  className="npm-input"
                  value={form.referenteNome}
                  onChange={f('referenteNome')}
                  placeholder="Anna Rossi"
                />
              </Field>
              <Field label="Telefono referente">
                <input
                  className="npm-input"
                  type="tel"
                  value={form.referenteTelefono}
                  onChange={f('referenteTelefono')}
                  placeholder="+39 333 000 0001"
                />
              </Field>
              <Field label="Relazione con il paziente">
                <select className="npm-input npm-select" value={form.referenteRelazione} onChange={f('referenteRelazione')}>
                  <option value="">— Seleziona —</option>
                  <option value="coniuge">Coniuge / Partner</option>
                  <option value="figlio">Figlio / Figlia</option>
                  <option value="genitore">Genitore</option>
                  <option value="fratello_sorella">Fratello / Sorella</option>
                  <option value="nipote">Nipote</option>
                  <option value="amico_caregiver">Amico / Caregiver</option>
                  <option value="tutore">Tutore legale</option>
                  <option value="altro">Altro</option>
                </select>
              </Field>
              <Field label="Contatto emergenza" hint="Nome, relazione e numero se diverso dal referente">
                <input
                  className="npm-input"
                  value={form.emergencyContact}
                  onChange={f('emergencyContact')}
                  placeholder="es. Luigi Rossi (fratello) — +39 333 000 0002"
                />
              </Field>
            </div>
          </NpmSection>

          {/* 4. Provenienza e ingresso */}
          <NpmSection title="4. Provenienza e ingresso" desc="Canale di accesso e motivo della presa in carico">
            <div className="npm-grid">
              <Field label="Provenienza">
                <select className="npm-input npm-select" value={form.provenienza} onChange={f('provenienza')}>
                  <option value="">— Seleziona —</option>
                  <option value="accesso_diretto">Accesso diretto</option>
                  <option value="centro_medico">Centro medico / MMG</option>
                  <option value="altra_struttura">Altra struttura sanitaria</option>
                  <option value="dimissione_ospedaliera">Dimissione ospedaliera</option>
                  <option value="familiare_caregiver">Familiare / Caregiver</option>
                </select>
              </Field>
              <Field label="Centro inviante">
                <input
                  className="npm-input"
                  value={form.centroInviante}
                  onChange={f('centroInviante')}
                  placeholder="es. Ospedale Niguarda, Clinica X, Dr. Bianchi"
                />
              </Field>
              <Field label="Motivo di ingresso" span2>
                <textarea
                  className="npm-input npm-textarea"
                  rows={3}
                  value={form.motivoIngresso}
                  onChange={f('motivoIngresso')}
                  placeholder="Diagnosi di accesso o principale motivo della presa in carico…"
                />
              </Field>
              <Field label="Condizioni iniziali" span2>
                <textarea
                  className="npm-input npm-textarea"
                  rows={3}
                  value={form.condizioniIniziali}
                  onChange={f('condizioniIniziali')}
                  placeholder="Stato clinico e funzionale al momento dell'ingresso…"
                />
              </Field>
            </div>
          </NpmSection>

          {/* 5. Assegnazione struttura */}
          <NpmSection title="5. Assegnazione struttura" desc="Operatore responsabile, collocazione e stato clinico">
            <div className="npm-grid">
              <Field label="Operatore assegnato">
                <select className="npm-input npm-select" value={form.operatoreId} onChange={f('operatoreId')}>
                  <option value="">— Seleziona operatore —</option>
                  {operatori.filter(o => o.stato === 'attivo').map(o => (
                    <option key={o.id} value={o.id}>
                      {o.cognome} {o.nome} — {o.ruolo}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Stato paziente">
                <select className="npm-input npm-select" value={form.statoPaziente} onChange={f('statoPaziente')}>
                  <option value="">— Seleziona —</option>
                  <option value="ricoverato">Ricoverato</option>
                  <option value="day_hospital">Day hospital</option>
                  <option value="ambulatoriale">Ambulatoriale</option>
                </select>
              </Field>
              <Field label="Camera">
                {camere.length > 0 ? (
                  <select className="npm-input npm-select" value={form.camera} onChange={f('camera')}>
                    <option value="">— Seleziona camera —</option>
                    {camere.map(c => (
                      <option key={c.id} value={c.numero}>
                        Camera {c.numero} ({c.tipo})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="npm-input"
                    value={form.camera}
                    onChange={f('camera')}
                    placeholder="es. 101, 12B…"
                  />
                )}
              </Field>
              <Field label="Letto / Posto letto">
                <input
                  className="npm-input"
                  value={form.letto}
                  onChange={f('letto')}
                  placeholder="es. 1, 2, A, Sx…"
                />
              </Field>
            </div>
          </NpmSection>

          {/* 6. Note iniziali */}
          <NpmSection title="6. Note iniziali" desc="Informazioni cliniche rilevanti per l'equipe">
            <div className="npm-grid">
              <Field label="Alert clinici iniziali" span2 hint="Allergie, intolleranze, farmaci in uso, controindicazioni">
                <textarea
                  className="npm-input npm-textarea npm-textarea--alert"
                  rows={3}
                  value={form.alertClinici}
                  onChange={f('alertClinici')}
                  placeholder="es. Allergia alla penicillina — Lattosio — Warfarin 5mg/die — Pacemaker…"
                />
              </Field>
              <Field label="Note operative" span2 hint="Indicazioni per operatori e personale di reparto">
                <textarea
                  className="npm-input npm-textarea"
                  rows={3}
                  value={form.noteIniziali}
                  onChange={f('noteIniziali')}
                  placeholder="Informazioni pratiche per l'equipe: preferenze, comunicazione, accessi, mobilità…"
                />
              </Field>
            </div>
          </NpmSection>

        </div>

        {/* ── Footer fisso ── */}
        <div className="modal-footer npm-footer">
          <span className="npm-footer__note">* Campi obbligatori</span>
          <div className="npm-footer__actions">
            <button className="btn-secondary" onClick={onCancel}>Annulla</button>
            <button
              className="btn-primary"
              onClick={salva}
              disabled={!canSave}
              title={!canSave ? 'Compila Nome, Cognome e Data di nascita per procedere' : undefined}
            >
              <IcoCheck /> Crea paziente
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
