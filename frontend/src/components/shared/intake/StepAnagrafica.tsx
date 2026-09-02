// StepAnagrafica — controlled anagrafica form for the intake wizard.
// Mirrors the field set of NewPatientModal's TabAnagrafica + referente section.
// No fetches here — the parent IntakeWorkspace owns patchDraft.

import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import {
  deriveAutoCFUpdate,
  isValidCF,
  normalizeCF,
  type FiscalCodeOrigin,
} from '../../../lib/codiceFiscale';

interface AnagraficaData {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  sex?: string;
  codiceFiscale?: string;
  /** #294: comune di nascita — usato solo per calcolare il CF quando non digitato. */
  comuneNascita?: string;
  provinciaNascita?: string;
  /** Metadato locale del draft: non viene inviato al record Patient. */
  codiceFiscaleOrigine?: FiscalCodeOrigin;
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

function NpmCard({
  title,
  desc,
  status,
  statusTone = 'optional',
  collapsible = false,
  defaultOpen = false,
  children,
}: {
  title: string;
  desc?: string;
  status?: string;
  statusTone?: 'complete' | 'progress' | 'error' | 'optional';
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const titleId = useId();
  const [expanded, setExpanded] = useState(defaultOpen);
  const header = (
    <>
      <span className="npm-card__head-copy">
        <h3 className="npm-card__title" id={titleId}>
          {title}
        </h3>
        {desc && <span className="npm-card__desc">{desc}</span>}
      </span>
      {status && (
        <span className={`npm-card__status npm-card__status--${statusTone}`}>{status}</span>
      )}
    </>
  );

  if (collapsible) {
    return (
      <details
        className="npm-card npm-card--intake-section npm-card--collapsible"
        open={expanded}
        onToggle={(event) => setExpanded(event.currentTarget.open)}
      >
        <summary className="npm-card__head npm-card__summary">
          {header}
          <span className="npm-card__chevron" aria-hidden="true">
            ⌄
          </span>
        </summary>
        <div className="npm-card__body">{children}</div>
      </details>
    );
  }

  return (
    <section className="npm-card npm-card--intake-section" aria-labelledby={titleId}>
      <div className="npm-card__head">{header}</div>
      <div className="npm-card__body">{children}</div>
    </section>
  );
}

function filledCount(value: AnagraficaData, keys: Array<keyof AnagraficaData>): number {
  return keys.filter((key) => String(value[key] ?? '').trim()).length;
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
  children: ReactNode;
}) {
  const inputId = useId();
  const descriptionId = `${inputId}-description`;
  const control = isValidElement(children)
    ? cloneElement(
        children as ReactElement<{
          id?: string;
          'aria-invalid'?: boolean;
          'aria-describedby'?: string;
          'aria-required'?: boolean;
        }>,
        {
          id: inputId,
          'aria-invalid': error ? true : undefined,
          'aria-describedby': error || hint ? descriptionId : undefined,
          'aria-required': required ? true : undefined,
        },
      )
    : children;

  return (
    <div className={`npm-field${span2 ? ' npm-span-2' : ''}${error ? ' npm-field--error' : ''}`}>
      <label className="npm-label" htmlFor={inputId}>
        {label}
        {required && <span className="npm-required"> *</span>}
      </label>
      {control}
      {error && (
        <span id={descriptionId} className="npm-field-error" role="alert">
          {error}
        </span>
      )}
      {!error && hint && (
        <span id={descriptionId} className="npm-hint">
          {hint}
        </span>
      )}
    </div>
  );
}

export function StepAnagrafica({ value, onChange, submitAttempted = false }: StepAnagraficaProps) {
  const sourceKeys = new Set<keyof AnagraficaData>([
    'firstName',
    'lastName',
    'dateOfBirth',
    'sex',
    'comuneNascita',
    'provinciaNascita',
  ]);

  const f =
    (key: keyof AnagraficaData) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const raw = event.target.value;
      if (key === 'codiceFiscale') {
        const codiceFiscale = raw.toUpperCase();
        onChange({
          ...value,
          codiceFiscale,
          codiceFiscaleOrigine: codiceFiscale.trim() ? 'manual' : undefined,
        });
        return;
      }

      const next: AnagraficaData = { ...value, [key]: raw };
      if (sourceKeys.has(key)) {
        const decision = deriveAutoCFUpdate(
          {
            nome: next.firstName ?? '',
            cognome: next.lastName ?? '',
            sesso: next.sex ?? '',
            dataNascita: next.dateOfBirth ?? '',
            comuneNascita: next.comuneNascita ?? '',
            provinciaNascita: next.provinciaNascita,
          },
          next.codiceFiscale ?? '',
          next.codiceFiscaleOrigine,
        );
        if (decision.kind === 'apply') {
          next.codiceFiscale = decision.cf;
          next.codiceFiscaleOrigine = 'auto';
        } else if (decision.kind === 'clear') {
          next.codiceFiscale = '';
          next.codiceFiscaleOrigine = undefined;
        }
      }
      onChange(next);
    };

  const errors: Partial<Record<keyof AnagraficaData, string>> = {};
  if (submitAttempted && !value.firstName?.trim()) errors.firstName = 'Nome obbligatorio';
  if (submitAttempted && !value.lastName?.trim()) errors.lastName = 'Cognome obbligatorio';
  if (submitAttempted && !value.dateOfBirth) errors.dateOfBirth = 'Data di nascita obbligatoria';
  // #294: CF obbligatorio — digitato valido oppure calcolato dai dati.
  if (submitAttempted && !isValidCF(value.codiceFiscale ?? ''))
    errors.codiceFiscale = value.codiceFiscale?.trim()
      ? 'Codice fiscale non valido (16 caratteri, carattere di controllo)'
      : 'Codice fiscale obbligatorio: completa i dati di nascita oppure inseriscilo manualmente';

  const requiredCompleted =
    Number(Boolean(value.firstName?.trim())) +
    Number(Boolean(value.lastName?.trim())) +
    Number(Boolean(value.dateOfBirth)) +
    Number(isValidCF(value.codiceFiscale ?? ''));
  const contactsCompleted = filledCount(value, [
    'phone',
    'email',
    'address',
    'comune',
    'provincia',
    'cap',
  ]);
  const referenceCompleted = filledCount(value, [
    'referenteNome',
    'referenteRelazione',
    'referenteTelefono',
    'emergencyContact',
  ]);

  return (
    <>
      <NpmCard
        title="Dati personali"
        desc="Identità e dati necessari alla registrazione"
        status={requiredCompleted === 4 ? 'Completo' : `${requiredCompleted}/4 obbligatori`}
        statusTone={requiredCompleted === 4 ? 'complete' : submitAttempted ? 'error' : 'progress'}
      >
        <div className="npm-grid npm-grid--identity">
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
          <NpmField label="Sesso" hint="Necessario per il calcolo automatico del codice fiscale">
            <select className="npm-input npm-select" value={value.sex ?? ''} onChange={f('sex')}>
              <option value="">— Seleziona —</option>
              <option value="M">Maschio</option>
              <option value="F">Femmina</option>
            </select>
          </NpmField>
          <NpmField label="Comune di nascita" hint="Usato per calcolare il CF">
            <input
              className="npm-input"
              value={value.comuneNascita ?? ''}
              onChange={f('comuneNascita')}
              placeholder="Roma"
            />
          </NpmField>
          <NpmField label="Provincia di nascita" hint="Sigla provincia; EE per l'estero">
            <input
              className="npm-input"
              value={value.provinciaNascita ?? ''}
              onChange={f('provinciaNascita')}
              placeholder="MI"
              maxLength={2}
              style={{ textTransform: 'uppercase' }}
            />
          </NpmField>
          <NpmField
            label="Codice fiscale"
            required
            span2
            error={errors.codiceFiscale}
            hint={
              value.codiceFiscaleOrigine === 'auto'
                ? 'Calcolato automaticamente dai dati anagrafici; puoi correggerlo manualmente'
                : 'Si compila automaticamente con nome, cognome, sesso, data e luogo di nascita'
            }
          >
            <input
              className={`npm-input npm-mono${errors.codiceFiscale ? ' npm-input--error' : ''}`}
              value={value.codiceFiscale ?? ''}
              onChange={f('codiceFiscale')}
              onBlur={(event) => {
                const normalized = normalizeCF(event.target.value);
                if (normalized !== event.target.value) {
                  onChange({ ...value, codiceFiscale: normalized, codiceFiscaleOrigine: 'manual' });
                }
              }}
              placeholder="RSSMRA80A01H501U"
              maxLength={16}
              autoComplete="off"
              spellCheck={false}
              style={{ textTransform: 'uppercase' }}
            />
          </NpmField>
          <span className="sr-only" role="status" aria-live="polite">
            {value.codiceFiscaleOrigine === 'auto'
              ? `Codice fiscale compilato automaticamente: ${value.codiceFiscale}`
              : !value.codiceFiscale
                ? 'Codice fiscale automatico non disponibile'
                : ''}
          </span>
        </div>
      </NpmCard>

      <NpmCard
        title="Recapiti"
        desc="Contatti e indirizzo di residenza"
        status={contactsCompleted > 0 ? `${contactsCompleted}/6 compilati` : 'Facoltativo'}
        statusTone={contactsCompleted > 0 ? 'progress' : 'optional'}
        collapsible
        defaultOpen={contactsCompleted > 0}
      >
        <div className="npm-grid npm-grid--contacts">
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

      <NpmCard
        title="Referente / Familiare"
        desc="Persona di riferimento e contatti d'emergenza"
        status={referenceCompleted > 0 ? `${referenceCompleted}/4 compilati` : 'Facoltativo'}
        statusTone={referenceCompleted > 0 ? 'progress' : 'optional'}
        collapsible
        defaultOpen={referenceCompleted > 0}
      >
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
