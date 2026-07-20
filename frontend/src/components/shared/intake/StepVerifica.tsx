// StepVerifica — Step 6 of the intake wizard.
// Shows a readonly summary of collected data and a "Crea paziente" confirm button.

import { IcoCheck } from '../../../icons';

interface AnagraficaData {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  sex?: string;
  [key: string]: unknown;
}

interface StepVerificaProps {
  data: Record<string, unknown>;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  /** #235: toggle acceptance flags in draft.data._accepted (autosaved by the parent). */
  onUpdateSection: (key: string, value: unknown) => void;
}

function countFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

export function StepVerifica({ data, busy, error, onConfirm, onUpdateSection }: StepVerificaProps) {
  const a = (data.anagrafica ?? {}) as AnagraficaData;

  // #281: recap reale di cosa verrà creato (non solo l'elenco dei nomi-sezione)
  const allergie = Array.isArray(data.allergie)
    ? (data.allergie as Array<{ allergene?: string; gravita?: string }>)
    : [];
  const allergieStatus = data.allergieStatus as string | undefined;
  const terapieImport = Array.isArray(data.terapiaImport)
    ? (data.terapiaImport as Array<{ farmacoNome?: string; orari?: string[]; stato?: string }>)
    : [];
  const terapieManuali = Array.isArray(data.terapia)
    ? (data.terapia as Array<{ farmacoNome?: string; schedules?: Array<{ orario?: string }> }>)
    : [];
  const anamnesi = (data.anamnesi ?? {}) as { patologicaProssima?: string };
  const diagnosi = Array.isArray(data.diagnosi)
    ? (data.diagnosi as Array<{ descrizione?: string }>)
    : [];
  const altreSezioni: Array<{ key: string; label: string }> = [
    { key: 'parametri', label: 'Parametri vitali' },
    { key: 'dolore', label: 'Dolore (NRS)' },
  ].filter((s) => countFilled(data[s.key]));
  const excerpt = (t: string, max = 220) => (t.length > max ? `${t.slice(0, max)}…` : t);

  // #235: acceptance gate — build the residual-blocks checklist.
  const accepted = (data._accepted ?? {}) as { demographics?: boolean; therapy?: boolean };
  const demoAccepted = accepted.demographics === true;
  const therapyAccepted = accepted.therapy === true;

  const missingDemo: string[] = [];
  if (!a.firstName?.trim()) missingDemo.push('Nome');
  if (!a.lastName?.trim()) missingDemo.push('Cognome');
  if (!a.dateOfBirth) missingDemo.push('Data di nascita');

  const checklist: Array<{ label: string; ok: boolean }> = [
    {
      label: missingDemo.length
        ? `Dati anagrafici obbligatori mancanti: ${missingDemo.join(', ')}`
        : 'Dati anagrafici obbligatori',
      ok: missingDemo.length === 0,
    },
    { label: 'Accetta anagrafica', ok: demoAccepted },
    { label: 'Accetta terapia', ok: therapyAccepted },
  ];
  const canCreate = checklist.every((c) => c.ok);

  return (
    <div className="step-verifica" data-testid="intake-step-6">
      <h3 className="step-verifica__title">Riepilogo</h3>

      <section className="step-verifica__section">
        <h4 className="step-verifica__section-title">Anagrafica</h4>
        <dl className="step-verifica__dl">
          <div className="step-verifica__row">
            <dt>Nome</dt>
            <dd>{a.firstName || <em className="step-verifica__empty">—</em>}</dd>
          </div>
          <div className="step-verifica__row">
            <dt>Cognome</dt>
            <dd>{a.lastName || <em className="step-verifica__empty">—</em>}</dd>
          </div>
          <div className="step-verifica__row">
            <dt>Data di nascita</dt>
            <dd>{a.dateOfBirth || <em className="step-verifica__empty">—</em>}</dd>
          </div>
          <div className="step-verifica__row">
            <dt>Sesso</dt>
            <dd>{a.sex || <em className="step-verifica__empty">—</em>}</dd>
          </div>
          {/* #281: campi anagrafici aggiuntivi già presenti nel draft */}
          {[
            ['codiceFiscale', 'Codice fiscale'],
            ['phone', 'Telefono'],
            ['email', 'Email'],
            ['address', 'Indirizzo'],
          ].map(([key, label]) => {
            const v = a[key];
            return typeof v === 'string' && v.trim() ? (
              <div className="step-verifica__row" key={key}>
                <dt>{label}</dt>
                <dd>{v}</dd>
              </div>
            ) : null;
          })}
        </dl>
        <label className="step-verifica__accept" data-testid="accept-demographics">
          <input
            type="checkbox"
            checked={demoAccepted}
            disabled={busy}
            onChange={(e) =>
              onUpdateSection('_accepted', { ...accepted, demographics: e.target.checked })
            }
          />
          <span>Accetto i dati anagrafici</span>
        </label>
      </section>

      {/* #281: recap leggibile — allergie, terapie, anamnesi/diagnosi con i VALORI reali */}
      <section className="step-verifica__section">
        <h4 className="step-verifica__section-title">Allergie</h4>
        {allergieStatus === 'assenti' || allergieStatus === 'paziente_nega' ? (
          <p className="cr-empty">
            {allergieStatus === 'assenti' ? 'Nessuna allergia nota.' : 'Il paziente nega allergie.'}
          </p>
        ) : allergie.length === 0 ? (
          <p className="cr-empty">Nessuna allergia documentata.</p>
        ) : (
          <ul className="step-verifica__filled-list">
            {allergie.map((al, i) => (
              <li key={`${al.allergene}-${i}`}>
                {al.allergene || '—'}
                {al.gravita ? ` (${al.gravita})` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="step-verifica__section">
        <h4 className="step-verifica__section-title">
          Terapie che verranno create ({terapieImport.length + terapieManuali.length})
        </h4>
        {terapieImport.length + terapieManuali.length === 0 ? (
          <p className="cr-empty">Nessuna terapia da inserire.</p>
        ) : (
          <ul className="step-verifica__filled-list">
            {terapieImport.map((t, i) => (
              <li key={`imp-${i}`}>
                {t.farmacoNome || '—'}
                {t.orari?.length ? ` — ore ${t.orari.join(', ')}` : ''}
                {t.stato === 'da_verificare' ? ' ⚠ da verificare' : ''}
              </li>
            ))}
            {terapieManuali.map((t, i) => (
              <li key={`man-${i}`}>
                {t.farmacoNome || '—'}
                {t.schedules?.length
                  ? ` — ore ${t.schedules
                      .map((s) => s.orario)
                      .filter(Boolean)
                      .join(', ')}`
                  : ''}
              </li>
            ))}
          </ul>
        )}
        {/* #282: la conferma terapia deve essere sbloccabile QUI — prima viveva solo nello step 3
            (Clinica): chi arrivava al riepilogo senza averla spuntata trovava il bottone "Crea
            paziente" disabilitato senza alcun controllo per rimediare. */}
        <label className="step-verifica__accept" data-testid="accept-therapy-verifica">
          <input
            type="checkbox"
            checked={therapyAccepted}
            disabled={busy}
            onChange={(e) =>
              onUpdateSection('_accepted', { ...accepted, therapy: e.target.checked })
            }
          />
          <span>
            {terapieImport.length + terapieManuali.length > 0
              ? 'Confermo di aver revisionato la terapia'
              : 'Confermo: nessuna terapia da inserire'}
          </span>
        </label>
      </section>

      {(anamnesi.patologicaProssima?.trim() || diagnosi.length > 0) && (
        <section className="step-verifica__section">
          <h4 className="step-verifica__section-title">Anamnesi e diagnosi</h4>
          <dl className="step-verifica__dl">
            {anamnesi.patologicaProssima?.trim() && (
              <div className="step-verifica__row">
                <dt>Anamnesi</dt>
                <dd>{excerpt(anamnesi.patologicaProssima)}</dd>
              </div>
            )}
            {diagnosi.map((d, i) => (
              <div className="step-verifica__row" key={`dx-${i}`}>
                <dt>{i === 0 ? 'Diagnosi' : ''}</dt>
                <dd>{excerpt(d.descrizione ?? '—', 160)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {altreSezioni.length > 0 && (
        <section className="step-verifica__section">
          <h4 className="step-verifica__section-title">Altre sezioni compilate</h4>
          <ul className="step-verifica__filled-list">
            {altreSezioni.map((s) => (
              <li key={s.key}>{s.label}</li>
            ))}
          </ul>
        </section>
      )}

      {!canCreate && (
        <section
          className="step-verifica__section step-verifica__blocks"
          data-testid="intake-blocking-checklist"
        >
          <h4 className="step-verifica__section-title">
            Da completare prima di creare il paziente
          </h4>
          <ul className="step-verifica__checklist">
            {checklist.map((c) => (
              <li key={c.label} className={c.ok ? 'is-ok' : 'is-todo'}>
                {c.ok ? <IcoCheck /> : <span aria-hidden="true">○</span>} {c.label}
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && <p className="import-modal__error">{error}</p>}

      <div className="step-verifica__actions">
        <button className="btn-success" onClick={onConfirm} disabled={busy || !canCreate}>
          <IcoCheck /> {busy ? 'Creazione…' : 'Crea paziente'}
        </button>
      </div>
    </div>
  );
}
