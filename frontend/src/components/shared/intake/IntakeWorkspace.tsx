import { useEffect, useRef, useState } from 'react';
import { createDraft, getDraft, patchDraft, confirmDraft } from './intakeDraftApi';
import { StepAnagrafica } from './StepAnagrafica';
import { StepIngresso } from './StepIngresso';
import type { IngressoData } from './StepIngresso';
import { StepClinica } from './StepClinica';
import { StepVerifica } from './StepVerifica';

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
  sex?: string;
  codiceFiscale?: string;
  phone?: string;
  email?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
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
  onCreated?: (patientId: string) => void;
  operatoreNome?: string;
  operatorId?: string;
  operatorRole?: string;
  /** When set, skip createDraft and load this existing import draft prefilled at step 3. */
  importDraftId?: string;
  /** When provided, show a "Torna ai documenti" button in the footer. */
  onBackToDocuments?: () => void;
}

export function IntakeWorkspace({ open, onClose, onCreated, operatoreNome, operatorId, operatorRole, importDraftId, onBackToDocuments }: IntakeWorkspaceProps) {
  const op = { operatorId, operatorRole };
  // Import flow starts at step 3 (Clinica) — anagrafica is already prefilled.
  const initialStep = importDraftId ? 3 : 1;
  const [step, setStep] = useState(initialStep);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DraftData>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Confirm / submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duplicateWarn, setDuplicateWarn] = useState(false);
  // Set when confirm is blocked by a contradictory allergy reading (REQ-026).
  // Shows a "Conferma comunque" action that re-confirms with confirmAllergyConflict.
  const [allergyConflictWarn, setAllergyConflictWarn] = useState(false);

  // Debounce timer ref for patchDraft calls
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create draft on first open (or load an existing import draft).
  // Guard conditions ensure we fetch exactly once per (open, draft target):
  //  - manual: fetch only when no draftId yet
  //  - import: fetch only when the loaded draftId differs from the requested importDraftId
  //    (so reopening for a *different* import draft re-loads the correct one).
  useEffect(() => {
    if (!open) {
      setStep(importDraftId ? 3 : 1);
      setDraftId(null);
      setError(null);
      setData({});
      setSubmitAttempted(false);
      setSubmitting(false);
      setSubmitError(null);
      setDuplicateWarn(false);
      setAllergyConflictWarn(false);
      return;
    }
    if (importDraftId) {
      // Import path: load the already-created draft and seed data from it.
      if (draftId === importDraftId) return; // already loaded this draft
      setLoading(true);
      setError(null);
      getDraft(importDraftId, { operatorId, operatorRole })
        .then((d) => {
          setDraftId(d.id);
          if (d.data && typeof d.data === 'object') {
            setData(d.data as DraftData);
          }
          setStep(3);
        })
        .catch(() => setError('Impossibile caricare la bozza di importazione. Riprovare.'))
        .finally(() => setLoading(false));
    } else {
      // Manual path: create a fresh draft (only once).
      if (draftId) return;
      setLoading(true);
      setError(null);
      createDraft('manual', { operatorId, operatorRole })
        .then((d) => {
          setDraftId(d.id);
          // Seed local data from the draft if the server returned any
          if (d.data && typeof d.data === 'object') {
            setData(d.data as DraftData);
          }
        })
        .catch(() => setError('Impossibile aprire la bozza. Riprovare.'))
        .finally(() => setLoading(false));
    }
  }, [open, draftId, importDraftId, operatorId, operatorRole]);

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

  async function handleConfirm(force = false, allergyConflictOverride = false) {
    if (!draftId) return;
    setSubmitting(true);
    setSubmitError(null);
    setDuplicateWarn(false);
    if (!allergyConflictOverride) setAllergyConflictWarn(false);

    const a = data.anagrafica ?? {};
    const patient = {
      firstName: a.firstName ?? '',
      lastName: a.lastName ?? '',
      dateOfBirth: a.dateOfBirth ?? '',
      ...(a.sex !== undefined && { sex: a.sex }),
      ...(a.codiceFiscale !== undefined && { codiceFiscale: a.codiceFiscale }),
      ...(a.phone !== undefined && { phone: a.phone }),
      ...(a.email !== undefined && { email: a.email }),
      ...(a.address !== undefined && { address: a.address }),
      ...(a.emergencyContactName !== undefined && { emergencyContactName: a.emergencyContactName }),
      ...(a.emergencyContactPhone !== undefined && { emergencyContactPhone: a.emergencyContactPhone }),
    };

    const ingressoObj = data.ingresso ?? {};
    const cartella: Record<string, unknown> = {
      statoRicovero: 'ricoverato',
      ...ingressoObj,
    };
    if (data.allergie !== undefined) cartella.allergie = data.allergie;
    if (data.diagnosi !== undefined) cartella.diagnosi = data.diagnosi;
    if (data.anamnesi !== undefined) cartella.anamnesi = data.anamnesi;
    // Carry imported therapy text (TherapyEditor intake mode is still a placeholder)
    // so it is persisted instead of dropped on confirm.
    if (typeof data._terapiaText === 'string' && data._terapiaText.trim()) {
      cartella.terapiaImportText = data._terapiaText;
    }

    const payload = {
      patient,
      cartella,
      confirmDuplicate: force,
      ...(allergyConflictOverride ? { confirmAllergyConflict: true } : {}),
    };

    try {
      const res = await confirmDraft(draftId, payload, op);
      if (res.status === 'created' || res.status === 'idempotent') {
        onCreated?.(res.patient?.id ?? '');
        onClose();
      } else if (res.status === 'duplicate') {
        setDuplicateWarn(true);
      } else {
        setSubmitError('Errore imprevisto dal server. Riprovare.');
      }
    } catch (err: unknown) {
      // confirmDraft throws on !ok (including 409). Inspect the message to detect duplicates.
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('duplicate') || msg.includes('409')) {
        setDuplicateWarn(true);
      } else if (msg.includes('allergie contrastanti')) {
        // REQ-026: confirm blocked by contradictory allergy reading. Offer an explicit override.
        setAllergyConflictWarn(true);
        setSubmitError(msg);
      } else {
        setSubmitError(msg || 'Errore durante la creazione del paziente.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (step === 1) {
      // Gate: require Nome + Cognome + Data di nascita before advancing
      if (!anagraficaValid()) {
        setSubmitAttempted(true);
        return;
      }
    }
    if (isLast) {
      // On the last step the "Avanti" / "Conferma" footer button triggers confirm
      void handleConfirm(false);
      return;
    }
    setStep((s) => s + 1);
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
              {step === 3 && (
                <div data-testid="intake-step-3" data-draft-id={draftId ?? undefined}>
                  <StepClinica
                    data={data}
                    onUpdateSection={updateSection}
                    operatoreNome={operatoreNome}
                    importedFields={(data._importedFields as string[] | undefined) ?? []}
                    narrative={data._narrative as Record<string, unknown> | undefined}
                  />
                </div>
              )}
              {step === 4 && (
                <div data-testid="intake-step-4" data-draft-id={draftId ?? undefined}>
                  <p className="cr-empty">Moduli configurabili — in arrivo.</p>
                </div>
              )}
              {step === 5 && (
                <div data-testid="intake-step-5" data-draft-id={draftId ?? undefined}>
                  <p className="cr-empty">Importa documenti / Scatta foto — in arrivo (F5).</p>
                </div>
              )}
              {step === 6 && (
                <div data-draft-id={draftId ?? undefined}>
                  {duplicateWarn && (
                    <div className="import-modal__warning" role="alert">
                      <strong>Paziente duplicato rilevato.</strong> Un paziente con questi dati potrebbe già esistere.
                      <br />
                      <button
                        className="btn-secondary"
                        onClick={() => void handleConfirm(true)}
                        disabled={submitting}
                        style={{ marginTop: '0.5rem' }}
                      >
                        Crea comunque
                      </button>
                    </div>
                  )}
                  {allergyConflictWarn && (
                    <div className="import-modal__warning" role="alert">
                      <strong>Allergie contrastanti rilevate.</strong> {submitError}
                      <br />
                      <button
                        className="btn-secondary"
                        onClick={() => void handleConfirm(false, true)}
                        disabled={submitting}
                        style={{ marginTop: '0.5rem' }}
                      >
                        Conferma comunque
                      </button>
                    </div>
                  )}
                  <StepVerifica
                    data={data}
                    busy={submitting}
                    error={allergyConflictWarn ? null : submitError}
                    onConfirm={() => void handleConfirm(false)}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <footer className="import-modal__foot">
          {onBackToDocuments ? (
            <button className="btn-ghost" onClick={onBackToDocuments}>← Torna ai documenti</button>
          ) : (
            <button className="btn-ghost" onClick={onClose}>Annulla</button>
          )}
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
            disabled={loading || !!error || (step === 1 && !anagraficaValid()) || (isLast && submitting)}
          >
            {isLast ? 'Conferma' : 'Avanti →'}
          </button>
        </footer>
      </div>
    </div>
  );
}
