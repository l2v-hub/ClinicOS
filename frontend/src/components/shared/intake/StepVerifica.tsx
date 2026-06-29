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
}

function countFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

export function StepVerifica({ data, busy, error, onConfirm }: StepVerificaProps) {
  const a = (data.anagrafica ?? {}) as AnagraficaData;

  const clinicalSections: Array<{ key: string; label: string }> = [
    { key: 'allergie',  label: 'Allergie' },
    { key: 'anamnesi',  label: 'Anamnesi' },
    { key: 'diagnosi',  label: 'Diagnosi' },
    { key: 'terapia',   label: 'Terapia farmacologica' },
    { key: 'parametri', label: 'Parametri vitali' },
    { key: 'dolore',    label: 'Dolore (NRS)' },
  ];
  const filledSections = clinicalSections.filter((s) => countFilled(data[s.key]));

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
        </dl>
      </section>

      <section className="step-verifica__section">
        <h4 className="step-verifica__section-title">Sezioni cliniche compilate</h4>
        {filledSections.length === 0 ? (
          <p className="cr-empty">Nessuna sezione clinica compilata.</p>
        ) : (
          <ul className="step-verifica__filled-list">
            {filledSections.map((s) => (
              <li key={s.key}>{s.label}</li>
            ))}
          </ul>
        )}
      </section>

      {error && <p className="import-modal__error">{error}</p>}

      <div className="step-verifica__actions">
        <button
          className="btn-primary"
          onClick={onConfirm}
          disabled={busy}
        >
          <IcoCheck /> {busy ? 'Creazione…' : 'Crea paziente'}
        </button>
      </div>
    </div>
  );
}
