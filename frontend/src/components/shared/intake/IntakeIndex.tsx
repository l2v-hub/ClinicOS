// Indice della scheda d'ingresso (pagina unica, HMI 1): sezioni con stato, passaggi obbligatori
// mancanti (ciascuno porta alla sua sezione) e azioni finali.
import { IcoCheck } from '../../../icons';
import {
  INTAKE_SECTIONS,
  type IntakeMissingStep,
  type IntakeSectionId,
  type IntakeSectionStatus,
} from './intakeProgress';

interface Props {
  sections: Record<IntakeSectionId, IntakeSectionStatus>;
  active: IntakeSectionId;
  missing: IntakeMissingStep[];
  onJump: (id: IntakeSectionId) => void;
  onMissing: (step: IntakeMissingStep) => void;
  busy: boolean;
  /** "Salva bozza" / "Torna alla revisione" resta attivo anche se la bozza non si è aperta. */
  saveDisabled: boolean;
  /** Bozza aperta: solo allora si contano i passaggi mancanti. */
  ready: boolean;
  /** Creazione in corso (etichetta del pulsante). */
  creating: boolean;
  onCreate: () => void;
  saveLabel: string;
  onSave: () => void;
  error: string | null;
}

function statusText(status: IntakeSectionStatus): string {
  if (status.kind === 'issues') return `${status.count} da risolvere`;
  if (status.kind === 'confirm') return 'da confermare';
  if (status.kind === 'done') return 'completata';
  return 'facoltativa, vuota';
}

function StatusMark({ status }: { status: IntakeSectionStatus }) {
  if (status.kind === 'issues')
    return (
      <span className="intake-index__mark intake-index__mark--issues" aria-hidden="true">
        {status.count}
      </span>
    );
  if (status.kind === 'done')
    return (
      <span className="intake-index__mark intake-index__mark--done" aria-hidden="true">
        <IcoCheck />
      </span>
    );
  if (status.kind === 'confirm')
    return <span className="intake-index__mark intake-index__mark--confirm" aria-hidden="true" />;
  return <span className="intake-index__mark" aria-hidden="true" />;
}

export function IntakeIndex({
  sections,
  active,
  missing,
  onJump,
  onMissing,
  busy,
  saveDisabled,
  ready,
  creating,
  onCreate,
  saveLabel,
  onSave,
  error,
}: Props) {
  const n = missing.length;
  return (
    <aside className="intake-index" aria-label="Sezioni della scheda d'ingresso">
      <nav className="intake-index__nav" aria-label="Sezioni">
        <ul>
          {INTAKE_SECTIONS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="intake-index__item"
                aria-current={active === s.id ? 'location' : undefined}
                onClick={() => onJump(s.id)}
              >
                <StatusMark status={sections[s.id]} />
                <span className="intake-index__label">{s.label}</span>
                <span className="ds-sr-only">: {statusText(sections[s.id])}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="intake-index__actions" data-testid="patient-intake-footer">
        {!ready ? null : n > 0 ? (
          <details className="intake-index__missing" data-testid="intake-missing">
            <summary>
              Mancano {n} {n === 1 ? 'passaggio obbligatorio' : 'passaggi obbligatori'}
            </summary>
            <ul>
              {missing.map((m, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="link-btn"
                    disabled={busy}
                    onClick={() => onMissing(m)}
                  >
                    {m.label}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        ) : (
          <p className="intake-index__ready" data-testid="intake-missing">
            Pronto per la creazione
          </p>
        )}
        {error && (
          <p className="import-modal__error" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          className="ds-btn ds-btn--primary"
          onClick={onCreate}
          disabled={busy || !ready || n > 0}
        >
          <IcoCheck /> {creating ? 'Creazione…' : 'Crea paziente'}
        </button>
        <button
          type="button"
          className="ds-btn ds-btn--secondary"
          onClick={onSave}
          disabled={saveDisabled}
        >
          {saveLabel}
        </button>
      </div>
    </aside>
  );
}
