import { openManualDraft, clearManualDraft } from './intakeDraftSession';
import { intakeDemographicErrors } from '../../../lib/intakeDemographics';
import { useEffect, useRef, useState } from 'react';
import { birthDateValue, type DemographicField } from '../../../lib/patientDemographics';
import { validatePatientPhone } from '../../../lib/patientPhone';
import {
  getDraft,
  VersionedDraftSaveQueue,
  confirmPersistedDraft,
  decideImportProposal,
  DraftApiError,
} from './intakeDraftApi';
import { ImportProposalsReview, type ImportProposal } from './ImportProposalsReview';
import { StepAnagrafica } from './StepAnagrafica';
import { StepIngresso } from './StepIngresso';
import type { IngressoData } from './StepIngresso';
import { StepClinica } from './StepClinica';
import { StepVerifica } from './StepVerifica';
import { buildIntakeTherapyReview, prepareIntakeConfirmData } from './intakeTherapies';
import { focusTherapyCorrection, type TherapyCorrectionTarget } from './intakeTherapyNavigation';
import { buildConfirmCartella } from './confirmCartella';
import { AccessibleDialogSurface } from '../AccessibleDialogSurface';

// "Documenti" (import/scatta foto in questo step) non e' ancora implementato (F5): finche' resta
// un placeholder senza alcun contenuto, tenerlo nel wizard costringe ogni creazione paziente a un
// click "Avanti" in piu' per attraversare uno step vuoto. Va reintrodotto qui quando F5 sara'
// pronto, non prima.
const STEPS = ['Anagrafica', 'Ingresso', 'Clinica', 'Moduli', 'Verifica'] as const;

// #243: moduli operativi del prodotto (compilabili dalla sezione "Moduli" della scheda paziente
// dopo la presa in carico). Lista/griglia con stato esplicito, invece di un blocco "in arrivo".
const CLINICAL_MODULES: ReadonlyArray<{
  id: string;
  label: string;
  desc: string;
  available: boolean;
}> = [
  {
    id: 'medicazioni',
    label: 'Medicazioni / Wound Care',
    desc: 'Registro medicazioni e lesioni',
    available: true,
  },
  {
    id: 'contenzioni',
    label: 'Contenzioni / Protezioni',
    desc: 'Registrazione contenzioni e consenso',
    available: true,
  },
  { id: 'braden', label: 'Scala Braden', desc: 'Rischio lesioni da pressione', available: true },
  { id: 'tinetti', label: 'Scala Tinetti', desc: 'Equilibrio e andatura', available: true },
  { id: 'nrs', label: 'Scala NRS', desc: 'Valutazione del dolore', available: true },
  { id: 'dimissione', label: 'Dimissione', desc: 'Modulo di dimissione', available: true },
];

// #243 AC4: modulo selezionato in step 4 → tab della scheda paziente (gruppo "Moduli") su cui
// atterrare subito dopo la creazione. Oggi è una mappa identità (gli id coincidono con i TabId
// di PatientDetail) ma resta esplicita e colocata con CLINICAL_MODULES per non dipendere da
// un'assunzione implicita se le label/id divergeranno in futuro.
const MODULE_TO_TAB_ID: Record<string, string> = {
  medicazioni: 'medicazioni',
  contenzioni: 'contenzioni',
  braden: 'braden',
  tinetti: 'tinetti',
  nrs: 'nrs',
  dimissione: 'dimissione',
};

interface AnagraficaData {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  sex?: string;
  codiceFiscale?: string;
  comuneNascita?: string;
  provinciaNascita?: string;
  codiceFiscaleOrigine?: 'auto' | 'manual' | 'import';
  phone?: string;
  email?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  [key: string]: unknown;
}

interface AcceptedFlags {
  demographics?: boolean;
  therapy?: boolean;
}

interface DraftData {
  anagrafica?: AnagraficaData;
  ingresso?: IngressoData;
  /** #235: explicit operator acceptance gates. Free-form draft key — survives reload. */
  _accepted?: AcceptedFlags;
  [key: string]: unknown;
}

interface IntakeWorkspaceProps {
  open: boolean;
  onClose: () => void;
  /** #243: moduleTabId is the id of the module card selected in step 4 (Moduli), if any —
   * lets the caller navigate the newly created patient straight to that module's flow. */
  onCreated?: (patientId: string, moduleTabId?: string) => void;
  operatoreNome?: string;
  operatorId?: string;
  operatorRole?: string;
  /** When set, skip createDraft and load this existing import draft prefilled at step 3. */
  importDraftId?: string;
  /** When provided, return to the import review from the footer. */
  onBackToDocuments?: () => void;
}

export function IntakeWorkspace({
  open,
  onClose,
  onCreated,
  operatoreNome,
  operatorId,
  operatorRole,
  importDraftId,
  onBackToDocuments,
}: IntakeWorkspaceProps) {
  const op = { operatorId, operatorRole };
  // Import flow starts at step 3 (Clinica) — anagrafica is already prefilled.
  const initialStep = importDraftId ? 3 : 1;
  const [step, setStep] = useState(initialStep);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DraftData>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // #234: autosave status for the debounced patchDraft (no longer swallowed silently).
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  // #243 AC4: modulo scelto nella griglia dello step 4 (opzionale) — usato solo per navigare
  // al flusso reale del modulo dopo la creazione del paziente; non blocca la conferma.
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  // Confirm / submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duplicateWarn, setDuplicateWarn] = useState(false);
  // Set when confirm is blocked by a contradictory allergy reading (REQ-026).
  // Shows a "Conferma comunque" action that re-confirms with confirmAllergyConflict.
  const [allergyConflictWarn, setAllergyConflictWarn] = useState(false);

  // Debounce timer ref for patchDraft calls
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<VersionedDraftSaveQueue | null>(null);
  const proposalRequestRef = useRef<{
    id: string;
    action: 'add' | 'defer';
    requestId: string;
    expectedDraftVersion?: number;
  } | null>(null);
  const [proposalUncertain, setProposalUncertain] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const submittingRef = useRef(false);
  const [focusField, setFocusField] = useState<DemographicField | null>(null);
  const [therapyCorrection, setTherapyCorrection] = useState<TherapyCorrectionTarget | null>(null);
  useEffect(() => {
    if (step !== 3 || !therapyCorrection) return;
    // Wait for the opened manual form and the step's scroll reset before focusing.
    const frame = window.requestAnimationFrame(() => {
      if (bodyRef.current) focusTherapyCorrection(bodyRef.current, therapyCorrection);
      setTherapyCorrection(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [step, therapyCorrection]);
  useEffect(() => {
    if (step !== 1 || !focusField) return;
    const control = bodyRef.current?.querySelector<HTMLElement>(
      `[data-demographic-field="${focusField}"]`,
    );
    control?.focus();
    control?.scrollIntoView({ block: 'center' });
    setFocusField(null);
  }, [step, focusField]);
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  // Create draft on first open (or load an existing import draft).
  // Guard conditions ensure we fetch exactly once per (open, draft target):
  //  - manual: fetch only when no draftId yet
  //  - import: fetch only when the loaded draftId differs from the requested importDraftId
  //    (so reopening for a *different* import draft re-loads the correct one).
  useEffect(() => {
    if (!open) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setStep(importDraftId ? 3 : 1);
      setDraftId(null);
      setError(null);
      setData({});
      setSubmitAttempted(false);
      setSubmitting(false);
      setSubmitError(null);
      setDuplicateWarn(false);
      setAllergyConflictWarn(false);
      setSelectedModuleId(null);
      setTherapyCorrection(null);
      return;
    }
    if (importDraftId ? draftId === importDraftId : Boolean(draftId)) return;
    let active = true;
    setLoading(true);
    setError(null);
    const request = importDraftId
      ? getDraft(importDraftId, { operatorId, operatorRole })
      : openManualDraft({ operatorId, operatorRole });
    request
      .then((draft) => {
        if (!active) return;
        setLoading(false);
        if (draft.status === 'confirmed' && draft.confirmedPatientId) {
          if (!importDraftId) clearManualDraft({ operatorId, operatorRole });
          onCreated?.(draft.confirmedPatientId);
          onClose();
          return;
        }
        setDraftId(draft.id);
        saveQueueRef.current = new VersionedDraftSaveQueue(draft.id, draft.version, {
          operatorId,
          operatorRole,
        });
        if (draft.data && typeof draft.data === 'object') setData(draft.data as DraftData);
        setStep(importDraftId ? 3 : 1);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
        setError('Impossibile aprire la bozza. Riprovare.');
      });
    return () => {
      active = false;
    };
  }, [open, draftId, importDraftId, operatorId, operatorRole]);

  // BUG-074: each phase shares the same scrollable body — reset it to the top when
  // the phase changes so the operator starts at the beginning of the new section.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [step]);

  // BUG-074: lock the underlying page scroll while the workspace is open, so only the
  // inner body scrolls (never the page behind the popup). Restored on close/unmount.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const isFirst = step === 1;
  const isLast = step === STEPS.length;

  /** Update a top-level section key and debounce-patch the draft */
  function persistDraft(next: DraftData) {
    if (!saveQueueRef.current) return Promise.reject(new Error('Bozza non disponibile.'));
    return saveQueueRef.current.save(next);
  }

  function updateSection(key: keyof DraftData, value: unknown) {
    if (submittingRef.current || proposalRequestRef.current) return;
    const next = { ...data, [key]: value };
    setData(next);

    if (!draftId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveState('saving');
    debounceRef.current = setTimeout(() => {
      persistDraft(next)
        .then(() => setSaveState('saved'))
        .catch(() => {
          // #234: no longer swallowed — surface an error state (no PHI in the log).
          setSaveState('error');
          console.error('[ClinicOS] autosave bozza intake non riuscito');
        });
    }, 500);
  }

  async function decideProposal(proposalId: string, action: 'add' | 'defer') {
    if (!draftId || submittingRef.current) return;
    const existing = proposalRequestRef.current;
    if (existing && (existing.id !== proposalId || existing.action !== action)) {
      setSubmitError(
        'Riprova prima la decisione in attesa: il server potrebbe averla già salvata.',
      );
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    try {
      if (!existing) {
        await persistDraft(data);
        proposalRequestRef.current = {
          id: proposalId,
          action,
          requestId: crypto.randomUUID(),
          expectedDraftVersion: saveQueueRef.current!.version,
        };
      }
      const pending = proposalRequestRef.current!;
      const saved = await decideImportProposal(
        draftId,
        proposalId,
        {
          requestId: pending.requestId,
          expectedDraftVersion: pending.expectedDraftVersion,
          action,
        },
        op,
      );
      proposalRequestRef.current = null;
      setProposalUncertain(false);
      saveQueueRef.current!.version = saved.version;
      setData(saved.data as DraftData);
      setSaveState('saved');
    } catch (e) {
      if (e instanceof DraftApiError && e.status < 500) proposalRequestRef.current = null;
      setProposalUncertain(!!proposalRequestRef.current);
      setSubmitError(
        e instanceof Error ? e.message : 'Risposta non ricevuta. Riprova la decisione in attesa.',
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function acceptedFlags(): AcceptedFlags {
    return (data._accepted ?? {}) as AcceptedFlags;
  }

  /** #235: both explicit acceptances required before the patient can be created. */
  function acceptanceComplete(): boolean {
    const acc = acceptedFlags();
    const pending =
      Array.isArray(data._importProposals) &&
      data._importProposals.some((value: ImportProposal) => value.status === 'pending');
    return acc.demographics === true && acc.therapy === true && !pending && !proposalUncertain;
  }

  function anagraficaValid(): boolean {
    return Object.keys(intakeDemographicErrors(data.anagrafica ?? {})).length === 0;
  }

  function reviewDemographicField(field: DemographicField) {
    setFocusField(field);
    setStep(1);
  }

  async function handleConfirm(force = false, allergyConflictOverride = false) {
    if (!draftId || submittingRef.current) return;
    const demographicErrors = intakeDemographicErrors(data.anagrafica ?? {});
    const firstInvalid = Object.keys(demographicErrors)[0] as DemographicField | undefined;
    if (firstInvalid) {
      setSubmitAttempted(true);
      setSubmitError(demographicErrors[firstInvalid] ?? null);
      reviewDemographicField(firstInvalid);
      return;
    }
    const phoneValidation = validatePatientPhone(data.anagrafica?.phone);
    // #235: acceptance gate — demographics + therapy must be explicitly accepted.
    if (!acceptanceComplete()) {
      setSubmitAttempted(true);
      setSubmitError(
        'Prima di creare il paziente accetta l’anagrafica e la terapia (vedi checklist).',
      );
      return;
    }
    const confirmData = prepareIntakeConfirmData(data);
    const therapyReview = buildIntakeTherapyReview(confirmData, operatoreNome);
    const invalid = therapyReview.filter((t) => !t.excluded && t.issues.length > 0);
    if (invalid.length) {
      setSubmitError(invalid.map((t) => `Terapia ${t.index}: ${t.issues.join('; ')}.`).join(' '));
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    setDuplicateWarn(false);
    if (!allergyConflictOverride) setAllergyConflictWarn(false);

    const a = data.anagrafica ?? {};
    const patient = {
      firstName: a.firstName ?? '',
      lastName: a.lastName ?? '',
      dateOfBirth: birthDateValue(a.dateOfBirth),
      ...(a.sex !== undefined && { sex: a.sex }),
      codiceFiscale: a.codiceFiscale?.trim().toUpperCase() || null,
      phone: phoneValidation.ok ? phoneValidation.phone : null,
      ...(a.email !== undefined && { email: a.email }),
      ...(a.address !== undefined && { address: a.address }),
      ...(a.emergencyContactName !== undefined && { emergencyContactName: a.emergencyContactName }),
      ...(a.emergencyContactPhone !== undefined && {
        emergencyContactPhone: a.emergencyContactPhone,
      }),
    };

    // #265: extracted pure mapper (unit-tested) — carries allergieStatus into the cartella.
    const cartella = buildConfirmCartella(confirmData);

    const allTherapies = therapyReview.filter((t) => !t.excluded).map((t) => t.input);

    const payload = {
      patient,
      cartella,
      confirmDuplicate: force,
      ...((data._importSource as { manifestRevision: number; resultHash: string } | undefined) ??
        {}),
      ...(allergyConflictOverride ? { confirmAllergyConflict: true } : {}),
      ...(allTherapies.length > 0 ? { therapies: allTherapies } : {}),
    };

    try {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setData(confirmData);
      const res = await confirmPersistedDraft(
        draftId,
        payload,
        () => persistDraft(confirmData),
        op,
      );
      setSaveState('saved');
      if (res.status === 'created' || res.status === 'idempotent') {
        const moduleTabId = selectedModuleId ? MODULE_TO_TAB_ID[selectedModuleId] : undefined;
        if (!importDraftId) clearManualDraft(op);
        onCreated?.(res.patient?.id ?? '', moduleTabId);
        onClose();
      } else if (res.status === 'duplicate') {
        setDuplicateWarn(true);
      } else if (res.code === 'import_review_outdated') {
        setSubmitError(
          'Le pagine sono cambiate. Torna ai documenti e scegli «Rivedi le nuove pagine». Le correzioni nella bozza sono conservate.',
        );
      } else {
        setSubmitError(res.error || 'Errore imprevisto dal server. Riprovare.');
      }
    } catch (err: unknown) {
      // confirmDraft throws on !ok (including 409). Inspect the message to detect duplicates.
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('duplicate')) {
        setDuplicateWarn(true);
      } else if (msg.includes('allergie contrastanti')) {
        // REQ-026: confirm blocked by contradictory allergy reading. Offer an explicit override.
        setAllergyConflictWarn(true);
        setSubmitError(msg);
      } else {
        setSubmitError(msg || 'Errore durante la creazione del paziente.');
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (step === 1) {
      // Missing optional identity details can be completed on the same patient later.
      if (!anagraficaValid()) {
        setSubmitAttempted(true);
        window.requestAnimationFrame(() => {
          const firstInvalid = bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
          firstInvalid?.focus({ preventScroll: true });
          firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
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

  async function saveAndClose(close = onClose) {
    if (submittingRef.current) return;
    if (!draftId || loading || error) {
      close();
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      await persistDraft(data);
      setSaveState('saved');
      close();
    } catch {
      setSaveState('error');
      setSubmitError('Bozza non salvata. Riprova prima di chiudere.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function handleBack() {
    if (!isFirst) setStep((s) => s - 1);
  }

  return (
    <AccessibleDialogSurface
      labelledBy="patient-intake-dialog-title"
      onClose={() => void saveAndClose()}
      dismissible={!submitting}
      closeOnOverlay={false}
      surfaceClassName="modal-card"
      className="import-modal import-modal--intake"
    >
      <header className="import-modal__head" data-testid="patient-intake-header">
        <div className="intake-dialog__title-group">
          <h2 id="patient-intake-dialog-title">Nuovo paziente</h2>
          <p data-testid="patient-intake-step-summary">
            {STEPS[step - 1]} · Passaggio {step} di {STEPS.length}
            {operatoreNome ? ` · ${operatoreNome}` : ''}
          </p>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={() => void saveAndClose()}
          aria-label="Chiudi"
          data-dialog-initial-focus
          disabled={submitting}
        >
          ✕
        </button>
      </header>

      {/* 6-step stepper */}
      <ol
        className="import-modal__steps"
        aria-label="Fasi di registrazione"
        data-testid="patient-intake-stepper"
      >
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
              <span className="import-step__marker" aria-hidden="true">
                {isDone ? '✓' : n}
              </span>
              <span className="import-step__label">{label}</span>
            </li>
          );
        })}
      </ol>

      {/* Body — the only scrollable region (BUG-074) */}
      <div
        className="import-modal__body"
        data-testid="patient-intake-body"
        ref={bodyRef}
        inert={submitting}
        aria-busy={submitting}
      >
        {proposalUncertain && (
          <div role="alert" className="import-modal__warning">
            <p>
              Risposta non ricevuta. Risolvi la decisione in attesa prima di modificare la bozza.
            </p>
            <button
              className="btn-primary"
              onClick={() => {
                const pending = proposalRequestRef.current;
                if (pending) void decideProposal(pending.id, pending.action);
              }}
            >
              Riprova decisione
            </button>
          </div>
        )}
        {loading && (
          <div className="import-modal__progress" role="status" aria-live="polite">
            <span className="import-modal__spinner" aria-hidden="true" />
            <span className="import-modal__progress-txt">Apertura scheda…</span>
          </div>
        )}
        {error && <p className="import-modal__error">{error}</p>}
        {!loading && !error && (
          <div inert={proposalUncertain}>
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
                <ImportProposalsReview
                  proposals={
                    Array.isArray(data._importProposals)
                      ? (data._importProposals as ImportProposal[])
                      : []
                  }
                  busy={submitting}
                  onDecision={(id, action) => void decideProposal(id, action)}
                />
                <StepClinica
                  data={data}
                  onUpdateSection={updateSection}
                  operatoreNome={operatoreNome}
                  importedFields={(data._importedFields as string[] | undefined) ?? []}
                  narrative={data._narrative as Record<string, unknown> | undefined}
                  therapyCorrection={therapyCorrection}
                />
              </div>
            )}
            {step === 4 && (
              <div data-testid="intake-step-4" data-draft-id={draftId ?? undefined}>
                <p className="cr-empty" style={{ marginBottom: 12 }}>
                  Moduli operativi disponibili nella sezione <strong>Moduli</strong> della scheda
                  paziente dopo la presa in carico. Seleziona (facoltativo) il modulo da aprire
                  subito dopo la creazione del paziente.
                </p>
                <div className="intake-modules-grid" role="list" data-testid="intake-modules-grid">
                  {CLINICAL_MODULES.map((m) => {
                    const selected = selectedModuleId === m.id;
                    return (
                      <div key={m.id} role="listitem">
                        <button
                          type="button"
                          className={`intake-module-card${selected ? ' intake-module-card--selected' : ''}`}
                          data-testid={`intake-module-${m.id}`}
                          aria-pressed={selected}
                          disabled={!m.available}
                          onClick={() => setSelectedModuleId((cur) => (cur === m.id ? null : m.id))}
                        >
                          <div className="intake-module-card__head">
                            <span className="intake-module-card__title">{m.label}</span>
                            <span
                              className={`status-badge status-badge--${m.available ? 'success' : 'neutral'}`}
                            >
                              {m.available ? 'Disponibile' : 'In arrivo'}
                            </span>
                          </div>
                          <p className="intake-module-card__desc">{m.desc}</p>
                          {selected && (
                            <p
                              className="intake-module-card__hint"
                              data-testid={`intake-module-${m.id}-hint`}
                            >
                              Si aprirà dopo la creazione del paziente
                            </p>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {step === 5 && (
              <div data-draft-id={draftId ?? undefined}>
                {duplicateWarn && (
                  <div className="import-modal__warning" role="alert">
                    <strong>Paziente duplicato rilevato.</strong> Un paziente con questi dati
                    potrebbe già esistere.
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
                  onUpdateSection={updateSection}
                  onReviewDemographics={reviewDemographicField}
                  onReviewTherapies={(target) => {
                    setSubmitError(null);
                    setTherapyCorrection(target ?? null);
                    setStep(3);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="import-modal__foot" data-testid="patient-intake-footer">
        {/* #234: unobtrusive autosave status (accessible, muted; red only on error). */}
        <span
          className="import-modal__savestate"
          role="status"
          aria-live="polite"
          data-state={saveState}
          style={{
            marginRight: 'auto',
            alignSelf: 'center',
            fontSize: '0.8125rem',
            color: saveState === 'error' ? 'var(--red)' : 'var(--muted, #667085)',
          }}
        >
          {saveState === 'saving' && 'Salvataggio…'}
          {saveState === 'saved' && 'Salvato'}
          {saveState === 'error' && 'Errore salvataggio — riprova'}
        </span>
        {onBackToDocuments ? (
          <button
            className="btn-ghost"
            onClick={() => void saveAndClose(onBackToDocuments)}
            disabled={submitting}
          >
            ← Torna alla revisione
          </button>
        ) : (
          <button className="btn-ghost" onClick={() => void saveAndClose()} disabled={submitting}>
            Salva bozza e chiudi
          </button>
        )}
        <button
          className="btn-secondary"
          onClick={handleBack}
          disabled={isFirst || loading || submitting}
        >
          ← Indietro
        </button>
        <button
          className="btn-primary"
          onClick={handleNext}
          disabled={
            loading ||
            !!error ||
            // #294 (QA F1/F3): lo step 1 NON disabilita più il bottone — il click passa da
            // handleNext, che con anagrafica invalida imposta submitAttempted e fa comparire
            // gli errori di campo (incluso il CF). Un bottone grigio senza spiegazione era
            // feedback irraggiungibile.
            (isLast && (submitting || !acceptanceComplete()))
          }
        >
          {isLast ? 'Conferma' : 'Avanti →'}
        </button>
      </footer>
    </AccessibleDialogSurface>
  );
}
