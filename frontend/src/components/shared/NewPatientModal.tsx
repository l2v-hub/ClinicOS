import { useState, useRef } from 'react';
import type { NuovoPaziente, Operatore, Camera } from '../../types';
import { IcoX, IcoCheck } from '../../icons';
import { DischargeLetterImport } from './DischargeLetterImport';

// ── Local types ───────────────────────────────────────────────────────────────

interface DocUpload {
  id: string;
  tipo: string;
  nomeFile: string;
  dataCaricamento: string;
  file: File;
}

type TabKey = 'anagrafica' | 'ingresso' | 'assegnazione' | 'note' | 'documenti';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'anagrafica', label: 'Anagrafica' },
  { key: 'ingresso', label: 'Ingresso' },
  { key: 'assegnazione', label: 'Assegnazione' },
  { key: 'note', label: 'Note' },
  { key: 'documenti', label: 'Documenti' },
];

const TIPI_DOCUMENTO = [
  'Documento identità',
  'Tessera sanitaria',
  'Consenso privacy',
  'Consenso trattamento',
  'Referto',
  'Prescrizione',
  'Lettera dimissione',
  'Altro',
];

// ── Default form ──────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const FORM_VUOTO: NuovoPaziente = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  sex: 'M',
  codiceFiscale: '',
  phone: '',
  email: '',
  address: '',
  comune: '',
  provincia: '',
  cap: '',
  referenteNome: '',
  referenteTelefono: '',
  referenteRelazione: '',
  emergencyContact: '',
  provenienza: '',
  centroInviante: '',
  dataIngresso: today(),
  motivoIngresso: '',
  condizioniIniziali: '',
  operatoreId: '',
  camera: '',
  letto: '',
  statoPaziente: '',
  priorita: '',
  alertOperativi: '',
  notaClinicaIniziale: '',
  noteIniziali: '',
  allergie: '',
  farmaci: '',
  alertClinici: '',
  osservazioniLibere: '',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function NpmCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="npm-card">
      <div className="npm-card__head">
        <span className="npm-card__title">{title}</span>
        {desc && <span className="npm-card__desc">{desc}</span>}
      </div>
      {children}
    </div>
  );
}

function NpmField({
  label,
  required,
  hint,
  span2,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  span2?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`npm-field${span2 ? ' npm-span-2' : ''}${error ? ' npm-field--error' : ''}`}>
      <label className="npm-label">
        {label}
        {required && <span className="npm-required"> *</span>}
      </label>
      {children}
      {error && <span className="npm-field-error">{error}</span>}
      {!error && hint && <span className="npm-hint">{hint}</span>}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface NewPatientModalProps {
  operatori: Operatore[];
  camere?: Camera[];
  onSave: (p: NuovoPaziente) => Promise<void>;
  onCancel: () => void;
}

// ── Main component ────────────────────────────────────────────────────────────

export function NewPatientModal({
  operatori,
  camere = [],
  onSave,
  onCancel,
}: NewPatientModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('anagrafica');
  const [form, setForm] = useState<NuovoPaziente>(FORM_VUOTO);
  const [docs, setDocs] = useState<DocUpload[]>([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [touched, setTouched] = useState<Set<keyof NuovoPaziente>>(new Set());
  const [nuovoDocTipo, setNuovoDocTipo] = useState(TIPI_DOCUMENTO[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function f<K extends keyof NuovoPaziente>(k: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((p) => ({ ...p, [k]: e.target.value }));
    };
  }

  function blur<K extends keyof NuovoPaziente>(k: K) {
    return () => setTouched((prev) => new Set(prev).add(k));
  }

  // Validation
  const errors: Partial<Record<keyof NuovoPaziente, string>> = {};
  if ((submitAttempted || touched.has('firstName')) && !form.firstName.trim())
    errors.firstName = 'Nome obbligatorio';
  if ((submitAttempted || touched.has('lastName')) && !form.lastName.trim())
    errors.lastName = 'Cognome obbligatorio';
  if ((submitAttempted || touched.has('dateOfBirth')) && !form.dateOfBirth)
    errors.dateOfBirth = 'Data di nascita obbligatoria';

  const hasErrors = !form.firstName.trim() || !form.lastName.trim() || !form.dateOfBirth;

  function handleImportApply(data: Partial<NuovoPaziente>) {
    setForm((prev) => {
      const updated = { ...prev };
      for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === 'string' && value.trim()) {
          (updated as Record<string, string>)[key] = value;
        }
      }
      return updated;
    });
    setShowImport(false);
  }

  async function salva() {
    setSubmitAttempted(true);
    if (hasErrors) {
      setActiveTab('anagrafica');
      return;
    }
    setApiError(null);
    setIsSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Errore durante la creazione del paziente');
    } finally {
      setIsSaving(false);
    }
  }

  // Document upload
  function handleFileUpload(file: File) {
    setDocs((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        tipo: nuovoDocTipo,
        nomeFile: file.name,
        dataCaricamento: new Date().toLocaleDateString('it-IT'),
        file,
      },
    ]);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = '';
  }

  function removeDoc(id: string) {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  // ── Tab content ──────────────────────────────────────────────────────────────

  function TabAnagrafica() {
    return (
      <>
        <NpmCard title="Dati personali" desc="Informazioni identificative del paziente">
          <div className="npm-grid">
            <NpmField label="Nome" required error={errors.firstName}>
              <input
                className={`npm-input${errors.firstName ? ' npm-input--error' : ''}`}
                value={form.firstName}
                onChange={f('firstName')}
                onBlur={blur('firstName')}
                placeholder="Mario"
                autoComplete="given-name"
              />
            </NpmField>
            <NpmField label="Cognome" required error={errors.lastName}>
              <input
                className={`npm-input${errors.lastName ? ' npm-input--error' : ''}`}
                value={form.lastName}
                onChange={f('lastName')}
                onBlur={blur('lastName')}
                placeholder="Rossi"
                autoComplete="family-name"
              />
            </NpmField>
            <NpmField label="Data di nascita" required error={errors.dateOfBirth}>
              <input
                type="date"
                className={`npm-input${errors.dateOfBirth ? ' npm-input--error' : ''}`}
                value={form.dateOfBirth}
                onChange={f('dateOfBirth')}
                onBlur={blur('dateOfBirth')}
              />
            </NpmField>
            <NpmField label="Sesso">
              <select className="npm-input npm-select" value={form.sex} onChange={f('sex')}>
                <option value="M">Maschio</option>
                <option value="F">Femmina</option>
                <option value="—">Non specificato</option>
              </select>
            </NpmField>
            <NpmField label="Codice fiscale" span2 hint="Maiuscolo — 16 caratteri">
              <input
                className="npm-input npm-mono"
                value={form.codiceFiscale}
                onChange={f('codiceFiscale')}
                placeholder="RSSMRA80A01H501U"
                maxLength={16}
                style={{ textTransform: 'uppercase' }}
              />
            </NpmField>
          </div>
        </NpmCard>

        <NpmCard title="Recapiti" desc="Contatti e indirizzo di residenza">
          <div className="npm-grid">
            <NpmField label="Telefono">
              <input
                type="tel"
                className="npm-input"
                value={form.phone}
                onChange={f('phone')}
                placeholder="+39 333 000 0000"
                autoComplete="tel"
              />
            </NpmField>
            <NpmField label="Email">
              <input
                type="email"
                className="npm-input"
                value={form.email}
                onChange={f('email')}
                placeholder="mario.rossi@email.it"
                autoComplete="email"
              />
            </NpmField>
            <NpmField label="Indirizzo" span2>
              <input
                className="npm-input"
                value={form.address}
                onChange={f('address')}
                placeholder="Via Roma 1"
                autoComplete="street-address"
              />
            </NpmField>
            <NpmField label="Comune">
              <input
                className="npm-input"
                value={form.comune}
                onChange={f('comune')}
                placeholder="Milano"
              />
            </NpmField>
            <NpmField label="Provincia">
              <input
                className="npm-input"
                value={form.provincia}
                onChange={f('provincia')}
                placeholder="MI"
                maxLength={2}
                style={{ textTransform: 'uppercase' }}
              />
            </NpmField>
            <NpmField label="CAP">
              <input
                className="npm-input"
                value={form.cap}
                onChange={f('cap')}
                placeholder="20100"
                maxLength={5}
                inputMode="numeric"
              />
            </NpmField>
          </div>
        </NpmCard>
      </>
    );
  }

  function TabIngresso() {
    return (
      <>
        <NpmCard title="Provenienza e accesso" desc="Da dove arriva il paziente e quando">
          <div className="npm-grid">
            <NpmField label="Provenienza">
              <select
                className="npm-input npm-select"
                value={form.provenienza}
                onChange={f('provenienza')}
              >
                <option value="">— Seleziona —</option>
                <option value="accesso_diretto">Accesso diretto</option>
                <option value="ospedale">Ospedale</option>
                <option value="centro_medico">Centro medico / MMG</option>
                <option value="altra_struttura">Altra struttura sanitaria</option>
                <option value="familiare_caregiver">Familiare / Caregiver</option>
              </select>
            </NpmField>
            <NpmField label="Centro inviante">
              <input
                className="npm-input"
                value={form.centroInviante}
                onChange={f('centroInviante')}
                placeholder="es. Ospedale Niguarda, Dr. Bianchi…"
              />
            </NpmField>
            <NpmField label="Data ingresso">
              <input
                type="date"
                className="npm-input"
                value={form.dataIngresso}
                onChange={f('dataIngresso')}
              />
            </NpmField>
          </div>
        </NpmCard>

        <NpmCard
          title="Motivo e condizioni"
          desc="Diagnosi di accesso e stato clinico all'ingresso"
        >
          <div className="npm-grid">
            <NpmField label="Motivo di ingresso" span2>
              <textarea
                className="npm-input npm-textarea"
                rows={3}
                value={form.motivoIngresso}
                onChange={f('motivoIngresso')}
                placeholder="Diagnosi principale, motivo della presa in carico…"
              />
            </NpmField>
            <NpmField label="Condizioni iniziali" span2>
              <textarea
                className="npm-input npm-textarea"
                rows={3}
                value={form.condizioniIniziali}
                onChange={f('condizioniIniziali')}
                placeholder="Stato clinico, funzionale e cognitivo all'ingresso…"
              />
            </NpmField>
          </div>
        </NpmCard>

        <NpmCard title="Referente / Familiare" desc="Persona di riferimento e contatti d'emergenza">
          <div className="npm-grid">
            <NpmField label="Nome e cognome referente">
              <input
                className="npm-input"
                value={form.referenteNome}
                onChange={f('referenteNome')}
                placeholder="Anna Rossi"
              />
            </NpmField>
            <NpmField label="Relazione con il paziente">
              <select
                className="npm-input npm-select"
                value={form.referenteRelazione}
                onChange={f('referenteRelazione')}
              >
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
            </NpmField>
            <NpmField label="Telefono referente">
              <input
                type="tel"
                className="npm-input"
                value={form.referenteTelefono}
                onChange={f('referenteTelefono')}
                placeholder="+39 333 000 0001"
              />
            </NpmField>
            <NpmField label="Contatto emergenza" hint="Specificare se diverso dal referente">
              <input
                className="npm-input"
                value={form.emergencyContact}
                onChange={f('emergencyContact')}
                placeholder="es. Luigi Rossi (fratello) — +39 333 000 0002"
              />
            </NpmField>
          </div>
        </NpmCard>
      </>
    );
  }

  function TabAssegnazione() {
    return (
      <>
        <NpmCard title="Operatore e struttura" desc="Chi gestisce il paziente e dove è collocato">
          <div className="npm-grid">
            <NpmField label="Operatore assegnato" span2>
              <select
                className="npm-input npm-select"
                value={form.operatoreId}
                onChange={f('operatoreId')}
              >
                <option value="">— Seleziona operatore —</option>
                {operatori
                  .filter((o) => o.stato === 'attivo')
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.cognome} {o.nome} — {o.ruolo}
                    </option>
                  ))}
              </select>
            </NpmField>
            <NpmField label="Camera">
              {camere.length > 0 ? (
                <select className="npm-input npm-select" value={form.camera} onChange={f('camera')}>
                  <option value="">— Seleziona —</option>
                  {camere.map((c) => (
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
            </NpmField>
            <NpmField label="Letto / Posto letto">
              <input
                className="npm-input"
                value={form.letto}
                onChange={f('letto')}
                placeholder="es. 1, 2, A…"
              />
            </NpmField>
          </div>
        </NpmCard>

        <NpmCard title="Stato e priorità" desc="Classificazione clinica e operativa del paziente">
          <div className="npm-grid">
            <NpmField label="Stato paziente">
              <select
                className="npm-input npm-select"
                value={form.statoPaziente}
                onChange={f('statoPaziente')}
              >
                <option value="">— Seleziona —</option>
                <option value="ricoverato">Ricoverato</option>
                <option value="day_hospital">Day hospital</option>
                <option value="ambulatoriale">Ambulatoriale</option>
              </select>
            </NpmField>
            <NpmField label="Priorità">
              <select
                className="npm-input npm-select"
                value={form.priorita}
                onChange={f('priorita')}
              >
                <option value="">— Seleziona —</option>
                <option value="normale">Normale</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </NpmField>
            <NpmField
              label="Alert operativi"
              span2
              hint="Informazioni urgenti per l'equipe: accessi, mobilità, comunicazione…"
            >
              <textarea
                className="npm-input npm-textarea npm-textarea--alert"
                rows={3}
                value={form.alertOperativi}
                onChange={f('alertOperativi')}
                placeholder="es. Paziente non deambulante — Comunicazione difficile — Accesso venoso difficoltoso…"
              />
            </NpmField>
          </div>
        </NpmCard>
      </>
    );
  }

  function TabNote() {
    return (
      <NpmCard title="Note iniziali" desc="Annotazioni cliniche e operative per l'equipe">
        <div className="npm-grid">
          <NpmField
            label="Alert clinici iniziali"
            span2
            hint="Allergie, intolleranze, farmaci in uso, controindicazioni rilevanti"
          >
            <textarea
              className="npm-input npm-textarea npm-textarea--alert"
              rows={3}
              value={form.alertClinici}
              onChange={f('alertClinici')}
              placeholder="es. Allergia alla penicillina — Warfarin 5mg/die — Pacemaker — No RMN…"
            />
          </NpmField>
          <NpmField
            label="Note operative"
            span2
            hint="Indicazioni pratiche per operatori e personale di reparto"
          >
            <textarea
              className="npm-input npm-textarea"
              rows={3}
              value={form.noteIniziali}
              onChange={f('noteIniziali')}
              placeholder="Preferenze, routine quotidiana, necessità assistenziali…"
            />
          </NpmField>
          <NpmField label="Osservazioni libere" span2>
            <textarea
              className="npm-input npm-textarea"
              rows={4}
              value={form.osservazioniLibere}
              onChange={f('osservazioniLibere')}
              placeholder="Qualsiasi altra informazione utile per l'equipe…"
            />
          </NpmField>
        </div>
      </NpmCard>
    );
  }

  function TabDocumenti() {
    return (
      <NpmCard title="Documenti" desc="Carica documenti del paziente da file o fotocamera">
        {/* Upload controls */}
        <div className="npm-doc-upload">
          <div className="npm-doc-upload__tipo">
            <label className="npm-label">Tipo documento</label>
            <select
              className="npm-input npm-select"
              value={nuovoDocTipo}
              onChange={(e) => setNuovoDocTipo(e.target.value)}
            >
              {TIPI_DOCUMENTO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="npm-doc-upload__btns">
            <button
              type="button"
              className="npm-doc-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Importa documento
            </button>
            <button
              type="button"
              className="npm-doc-btn"
              onClick={() => cameraInputRef.current?.click()}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Acquisisci da fotocamera
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleInputChange}
          />
          <input
            ref={cameraInputRef}
            type="file"
            style={{ display: 'none' }}
            accept="image/*"
            capture="environment"
            onChange={handleInputChange}
          />
        </div>

        {/* Document list */}
        {docs.length === 0 ? (
          <div className="npm-doc-empty">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.3"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p>Nessun documento caricato</p>
            <span>Usa i pulsanti sopra per importare o acquisire documenti</span>
          </div>
        ) : (
          <div className="npm-doc-list">
            {docs.map((d) => (
              <div key={d.id} className="npm-doc-item">
                <div className="npm-doc-item__icon">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className="npm-doc-item__info">
                  <span className="npm-doc-item__nome">{d.nomeFile}</span>
                  <span className="npm-doc-item__meta">
                    {d.tipo} · {d.dataCaricamento}
                  </span>
                </div>
                <button
                  type="button"
                  className="icon-btn icon-btn--sm icon-btn--danger"
                  onClick={() => removeDoc(d.id)}
                  title="Rimuovi"
                >
                  <IcoX />
                </button>
              </div>
            ))}
          </div>
        )}
      </NpmCard>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box modal-box--patient" onClick={(e) => e.stopPropagation()}>
        {/* ── Header ── */}
        <div className="npm-header">
          <div className="npm-header__text">
            <h3 className="npm-header__title">Nuovo paziente</h3>
            <p className="npm-header__subtitle">
              Registra anagrafica, ingresso, assegnazione e documenti del paziente
            </p>
            <button type="button" className="npm-import-btn" onClick={() => setShowImport(true)}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Importa da lettera di dimissioni
            </button>
          </div>
          <button className="icon-btn npm-close-btn" onClick={onCancel} aria-label="Chiudi">
            <IcoX />
          </button>
        </div>

        {/* ── Tab bar ── */}
        <div className="npm-tab-bar" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={activeTab === t.key}
              className={`npm-tab${activeTab === t.key ? ' npm-tab--active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
              {t.key === 'anagrafica' && submitAttempted && hasErrors && (
                <span className="npm-tab__dot" aria-label="Errori in questa sezione" />
              )}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="npm-body" role="tabpanel">
          {submitAttempted && hasErrors && (
            <div className="npm-validation-banner">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Compila i campi obbligatori: Nome, Cognome e Data di nascita (tab Anagrafica)
            </div>
          )}
          {activeTab === 'anagrafica' && TabAnagrafica()}
          {activeTab === 'ingresso' && TabIngresso()}
          {activeTab === 'assegnazione' && TabAssegnazione()}
          {activeTab === 'note' && TabNote()}
          {activeTab === 'documenti' && TabDocumenti()}
        </div>

        {/* ── Footer ── */}
        <div className="npm-footer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            <span className="npm-footer__note">* Campi obbligatori</span>
            {apiError && (
              <div className="npm-validation-banner" role="alert" style={{ marginTop: 0 }}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {apiError}
              </div>
            )}
          </div>
          <div className="npm-footer__actions">
            <button className="btn-secondary" onClick={onCancel} disabled={isSaving}>
              Annulla
            </button>
            <button
              className="btn-success"
              onClick={salva}
              disabled={isSaving}
              title={
                hasErrors && !submitAttempted
                  ? 'Compila Nome, Cognome e Data di nascita'
                  : undefined
              }
            >
              {isSaving ? (
                'Salvataggio…'
              ) : (
                <>
                  <IcoCheck /> Crea paziente
                </>
              )}
            </button>
          </div>
        </div>

        {showImport && (
          <DischargeLetterImport onApply={handleImportApply} onClose={() => setShowImport(false)} />
        )}
      </div>
    </div>
  );
}
