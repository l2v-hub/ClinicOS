import { useEffect, useRef, useState } from 'react';
import { createDraft, patchDraft } from './intakeDraftApi';
import { StepAnagrafica } from './StepAnagrafica';
import { StepIngresso } from './StepIngresso';
import type { IngressoData } from './StepIngresso';

const STEPS = [
  'Anagrafica',
  'Ingresso',
  'Clinica',
  'Moduli',
  'Documenti',
  'Verifica',
] as const;

interface AnagraficaData {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  [key: string]: unknown;
}

interface DraftData {
  anagrafica?: AnagraficaData;
  ingresso?: IngressoData;
  [key: string]: unknown;
}

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
  const [data, setData] = useState<DraftData>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Debounce timer ref for patchDraft calls
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create draft on first open
  useEffect(() => {
    if (!open) {
      setStep(1);
      setDraftId(null);
      setError(null);
      setData({});
      setSubmitAttempted(false);
      return;
    }
    if (draftId) return;
    setLoading(true);
    setError(null);
    createDraft('manual', op)
      .then((d) => {
        setDraftId(d.id);
        // Seed local data from the draft if the server returned any
        if (d.data && typeof d.data === 'object') {
          setData(d.data as DraftData);
        }
      })
      .catch(() => setError('Impossibile aprire la bozza. Riprovare.'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draftId]);

  if (!open) return null;

  const isFirst = step === 1;
  const isLast = step === STEPS.length;

  /** Update a top-level section key and debounce-patch the draft */
  function updateSection(key: keyof DraftData, value: unknown) {
    const next = { ...data, [key]: value };
    setData(next);

    if (!draftId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      patchDraft(draftId, { [key]: value }, op).catch(() => {
        // Autosave errors are silently swallowed — the user can still proceed;
        // draft may be out of sync but we avoid disrupting the flow.
      });
    }, 500);
  }

  function anagraficaValid(): boolean {
    const a = data.anagrafica;
    return !!(a?.firstName?.trim() && a?.lastName?.trim() && a?.dateOfBirth);
  }

  function handleNext() {
    if (step === 1) {
      // Gate: require Nome + Cognome + Data di nascita before advancing
      if (!anagraficaValid()) {
        setSubmitAttempted(true);
        return;
      }
    }
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
            <>
              {step === 1 && (
                <div data-testid="intake-step-1" data-draft-id={draftId ?? undefined}>
                  <StepAnagrafica
                    value={data.anagrafica ?? {}}
                    onChange={(v) => updateSection('anagrafica', v)}
                    submitAttempted={submitAttempted}
                  />
                </div>
              )}
              {step === 2 && (
                <div data-testid="intake-step-2" data-draft-id={draftId ?? undefined}>
                  <StepIngresso
                    value={data.ingresso ?? {}}
                    onChange={(v) => updateSection('ingresso', v)}
                  />
                </div>
              )}
              {step >= 3 && (
                <div data-testid={`intake-step-${step}`} data-draft-id={draftId ?? undefined}>
                  {/* Step {step} — {STEPS[step - 1]} — placeholder for Tasks 3-4 */}
                </div>
              )}
            </>
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
            disabled={isLast || loading || !!error || (step === 1 && !anagraficaValid())}
          >
            {isLast ? 'Conferma' : 'Avanti →'}
          </button>
        </footer>
      </div>
    </div>
  );
}
