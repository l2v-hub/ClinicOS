import { useEffect, useState } from 'react';
import { createDraft } from './intakeDraftApi';

const STEPS = [
  'Anagrafica',
  'Ingresso',
  'Clinica',
  'Moduli',
  'Documenti',
  'Verifica',
] as const;

interface IntakeWorkspaceProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (patientId: string) => void; // wired in Task 4 (Verifica step)
  operatoreNome?: string;
  operatorId?: string;
  operatorRole?: string;
}

export function IntakeWorkspace({ open, onClose, operatoreNome, operatorId, operatorRole }: IntakeWorkspaceProps) {
  const op = { operatorId, operatorRole };
  const [step, setStep] = useState(1);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create draft on first open
  useEffect(() => {
    if (!open) {
      setStep(1);
      setDraftId(null);
      setError(null);
      return;
    }
    if (draftId) return;
    setLoading(true);
    setError(null);
    createDraft('manual', op)
      .then((d) => setDraftId(d.id))
      .catch(() => setError('Impossibile aprire la bozza. Riprovare.'))
      .finally(() => setLoading(false));
  }, [open, draftId]);

  if (!open) return null;

  const isFirst = step === 1;
  const isLast = step === STEPS.length;

  function handleNext() {
    if (!isLast) setStep((s) => s + 1);
  }

  function handleBack() {
    if (!isFirst) setStep((s) => s - 1);
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Nuovo paziente — intake">
      <div className="modal-card import-modal import-modal--intake">
        <header className="import-modal__head">
          <h2>
            Nuovo paziente
            {operatoreNome ? ` — ${operatoreNome}` : ''}
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label="Chiudi">✕</button>
        </header>

        {/* 6-step stepper */}
        <ol className="import-modal__steps" aria-label="Fasi di registrazione">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const isDone = n < step;
            const isActive = n === step;
            return (
              <li
                key={label}
                className={isDone ? 'is-done' : isActive ? 'is-active' : ''}
                aria-current={isActive ? 'step' : undefined}
              >
                {n}. {label}
              </li>
            );
          })}
        </ol>

        {/* Body */}
        <div className="import-modal__body">
          {loading && (
            <div className="import-modal__progress" role="status" aria-live="polite">
              <span className="import-modal__spinner" aria-hidden="true" />
              <span className="import-modal__progress-txt">Apertura scheda…</span>
            </div>
          )}
          {error && <p className="import-modal__error">{error}</p>}
          {!loading && !error && (
            <div data-testid={`intake-step-${step}`} data-draft-id={draftId ?? undefined}>
              {/* Step {step} — {STEPS[step - 1]} — placeholder for Tasks 2-4 */}
            </div>
          )}
        </div>

        <footer className="import-modal__foot">
          <button className="btn-ghost" onClick={onClose}>Annulla</button>
          <button
            className="btn-secondary"
            onClick={handleBack}
            disabled={isFirst || loading}
          >
            ← Indietro
          </button>
          <button
            className="btn-primary"
            onClick={handleNext}
            disabled={isLast || loading || !!error}
          >
            {isLast ? 'Conferma' : 'Avanti →'}
          </button>
        </footer>
      </div>
    </div>
  );
}
