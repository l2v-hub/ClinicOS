// StepIngresso — controlled admission step for the intake wizard.
// Fields per gap analysis §2: Data/ora presa in carico, Provenienza,
// Modalità ingresso, Motivo ingresso, Operatore responsabile, Note iniziali.
// No fetches here — the parent IntakeWorkspace owns patchDraft.

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export interface IngressoData {
  dataPresa?: string;
  oraPresa?: string;
  provenienza?: string;
  centroInviante?: string;
  modalitaIngresso?: string;
  motivoIngresso?: string;
  operatoreResponsabile?: string;
  noteIniziali?: string;
}

interface StepIngressoProps {
  value: IngressoData;
  onChange: (v: IngressoData) => void;
}

function field(
  value: IngressoData,
  onChange: (v: IngressoData) => void,
  key: keyof IngressoData,
) {
  return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    onChange({ ...value, [key]: e.target.value });
  };
}

function NpmCard({ title, desc, children }: {
  title: string; desc?: string; children: React.ReactNode;
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

function NpmField({ label, required, hint, span2, children }: {
  label: string; required?: boolean; hint?: string;
  span2?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={`npm-field${span2 ? ' npm-span-2' : ''}`}>
      <label className="npm-label">
        {label}{required && <span className="npm-required"> *</span>}
      </label>
      {children}
      {hint && <span className="npm-hint">{hint}</span>}
    </div>
  );
}

export function StepIngresso({ value, onChange }: StepIngressoProps) {
  const f = (key: keyof IngressoData) => field(value, onChange, key);

  // Default date/time to today/now when the field is first focused and empty
  function handleDateFocus() {
    if (!value.dataPresa) onChange({ ...value, dataPresa: today() });
  }
  function handleTimeFocus() {
    if (!value.oraPresa) onChange({ ...value, oraPresa: nowTime() });
  }

  return (
    <>
      <NpmCard title="Presa in carico" desc="Data, ora e provenienza del paziente">
        <div className="npm-grid">
          <NpmField label="Data presa in carico" required>
            <input
              type="date"
              className="npm-input"
              value={value.dataPresa ?? ''}
              onChange={f('dataPresa')}
              onFocus={handleDateFocus}
            />
          </NpmField>
          <NpmField label="Ora">
            <input
              type="time"
              className="npm-input"
              value={value.oraPresa ?? ''}
              onChange={f('oraPresa')}
              onFocus={handleTimeFocus}
            />
          </NpmField>
          <NpmField label="Provenienza">
            <select
              className="npm-input npm-select"
              value={value.provenienza ?? ''}
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
              value={value.centroInviante ?? ''}
              onChange={f('centroInviante')}
              placeholder="es. Ospedale Niguarda, Dr. Bianchi…"
            />
          </NpmField>
          <NpmField label="Modalità ingresso">
            <select
              className="npm-input npm-select"
              value={value.modalitaIngresso ?? ''}
              onChange={f('modalitaIngresso')}
            >
              <option value="">— Seleziona —</option>
              <option value="urgenza">Urgenza</option>
              <option value="programmato">Programmato</option>
              <option value="trasferimento">Trasferimento</option>
              <option value="day_hospital">Day hospital</option>
            </select>
          </NpmField>
          <NpmField label="Operatore responsabile">
            <input
              className="npm-input"
              value={value.operatoreResponsabile ?? ''}
              onChange={f('operatoreResponsabile')}
              placeholder="Nome operatore / matricola"
            />
          </NpmField>
        </div>
      </NpmCard>

      <NpmCard title="Motivo e note" desc="Motivo di ingresso e osservazioni iniziali">
        <div className="npm-grid">
          <NpmField label="Motivo di ingresso" required span2>
            <textarea
              className="npm-input npm-textarea"
              rows={3}
              value={value.motivoIngresso ?? ''}
              onChange={f('motivoIngresso')}
              placeholder="Diagnosi principale, motivo della presa in carico…"
            />
          </NpmField>
          <NpmField label="Note iniziali" span2>
            <textarea
              className="npm-input npm-textarea"
              rows={3}
              value={value.noteIniziali ?? ''}
              onChange={f('noteIniziali')}
              placeholder="Indicazioni pratiche per operatori e personale di reparto…"
            />
          </NpmField>
        </div>
      </NpmCard>
    </>
  );
}
