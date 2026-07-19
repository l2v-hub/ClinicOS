// StepAnagrafica — controlled anagrafica form for the intake wizard.
// Mirrors the field set of NewPatientModal's TabAnagrafica + referente section.
// No fetches here — the parent IntakeWorkspace owns patchDraft.

interface AnagraficaData {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  sex?: string;
  codiceFiscale?: string;
  phone?: string;
  email?: string;
  address?: string;
  comune?: string;
  provincia?: string;
  cap?: string;
  referenteNome?: string;
  referenteRelazione?: string;
  referenteTelefono?: string;
  emergencyContact?: string;
}

interface StepAnagraficaProps {
  value: AnagraficaData;
  onChange: (v: AnagraficaData) => void;
  /** Set to true after the user has tried to advance past this step */
  submitAttempted?: boolean;
}

function field(
  value: AnagraficaData,
  onChange: (v: AnagraficaData) => void,
  key: keyof AnagraficaData,
) {
  return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    onChange({ ...value, [key]: e.target.value });
  };
}

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

export function StepAnagrafica({ value, onChange, submitAttempted = false }: StepAnagraficaProps) {
  const f = (key: keyof AnagraficaData) => field(value, onChange, key);

  const errors: Partial<Record<keyof AnagraficaData, string>> = {};
  if (submitAttempted && !value.firstName?.trim()) errors.firstName = 'Nome obbligatorio';
  if (submitAttempted && !value.lastName?.trim()) errors.lastName = 'Cognome obbligatorio';
  if (submitAttempted && !value.dateOfBirth) errors.dateOfBirth = 'Data di nascita obbligatoria';

  return (
    <>
      <NpmCard title="Dati personali" desc="Informazioni identificative del paziente">
        <div className="npm-grid">
          <NpmField label="Nome" required error={errors.firstName}>
            <input
              className={`npm-input${errors.firstName ? ' npm-input--error' : ''}`}
              value={value.firstName ?? ''}
              onChange={f('firstName')}
              placeholder="Mario"
              autoComplete="given-name"
            />
          </NpmField>
          <NpmField label="Cognome" required error={errors.lastName}>
            <input
              className={`npm-input${errors.lastName ? ' npm-input--error' : ''}`}
              value={value.lastName ?? ''}
              onChange={f('lastName')}
              placeholder="Rossi"
              autoComplete="family-name"
            />
          </NpmField>
          <NpmField label="Data di nascita" required error={errors.dateOfBirth}>
            <input
              type="date"
              className={`npm-input${errors.dateOfBirth ? ' npm-input--error' : ''}`}
              value={value.dateOfBirth ?? ''}
              onChange={f('dateOfBirth')}
            />
          </NpmField>
          <NpmField label="Sesso">
            <select className="npm-input npm-select" value={value.sex ?? 'M'} onChange={f('sex')}>
              <option value="M">Maschio</option>
              <option value="F">Femmina</option>
              <option value="—">Non specificato</option>
            </select>
          </NpmField>
          <NpmField label="Codice fiscale" span2 hint="Maiuscolo — 16 caratteri">
            <input
              className="npm-input npm-mono"
              value={value.codiceFiscale ?? ''}
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
              value={value.phone ?? ''}
              onChange={f('phone')}
              placeholder="+39 333 000 0000"
              autoComplete="tel"
            />
          </NpmField>
          <NpmField label="Email">
            <input
              type="email"
              className="npm-input"
              value={value.email ?? ''}
              onChange={f('email')}
              placeholder="mario.rossi@email.it"
              autoComplete="email"
            />
          </NpmField>
          <NpmField label="Indirizzo" span2>
            <input
              className="npm-input"
              value={value.address ?? ''}
              onChange={f('address')}
              placeholder="Via Roma 1"
              autoComplete="street-address"
            />
          </NpmField>
          <NpmField label="Comune">
            <input
              className="npm-input"
              value={value.comune ?? ''}
              onChange={f('comune')}
              placeholder="Milano"
            />
          </NpmField>
          <NpmField label="Provincia">
            <input
              className="npm-input"
              value={value.provincia ?? ''}
              onChange={f('provincia')}
              placeholder="MI"
              maxLength={2}
              style={{ textTransform: 'uppercase' }}
            />
          </NpmField>
          <NpmField label="CAP">
            <input
              className="npm-input"
              value={value.cap ?? ''}
              onChange={f('cap')}
              placeholder="20100"
              maxLength={5}
              inputMode="numeric"
            />
          </NpmField>
        </div>
      </NpmCard>

      <NpmCard title="Referente / Familiare" desc="Persona di riferimento e contatti d'emergenza">
        <div className="npm-grid">
          <NpmField label="Nome e cognome referente">
            <input
              className="npm-input"
              value={value.referenteNome ?? ''}
              onChange={f('referenteNome')}
              placeholder="Anna Rossi"
            />
          </NpmField>
          <NpmField label="Relazione con il paziente">
            <select
              className="npm-input npm-select"
              value={value.referenteRelazione ?? ''}
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
              value={value.referenteTelefono ?? ''}
              onChange={f('referenteTelefono')}
              placeholder="+39 333 000 0001"
            />
          </NpmField>
          <NpmField label="Contatto emergenza" hint="Specificare se diverso dal referente">
            <input
              className="npm-input"
              value={value.emergencyContact ?? ''}
              onChange={f('emergencyContact')}
              placeholder="es. Luigi Rossi (fratello) — +39 333 000 0002"
            />
          </NpmField>
        </div>
      </NpmCard>
    </>
  );
}
