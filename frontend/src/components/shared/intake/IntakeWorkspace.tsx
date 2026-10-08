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
  decideFieldProposal,
  DraftApiError,
  draftRejectionReason,
  type DraftResponse,
} from './intakeDraftApi';
import {
  aiFieldPaths,
  documentsErrorMessage,
  FIELD_PROPOSALS_PENDING_MESSAGE,
  focusAfterFieldDecision,
  mutateWithVersionRetry,
  pendingFieldProposals,
  rebaseLocalEdits,
  type FieldProposal,
} from './intakeDocuments';
import { IntakeAiProvider } from './intakeAiOrigin';
import { useIntakeDocuments } from './useIntakeDocuments';
import { IntakeDocumentsCard } from './IntakeDocumentsCard';
import { IntakeDocumentPanel, type DocumentPanelRequest } from './IntakeDocumentPanel';
import type { PanelTarget } from './intakeDocumentPages';
import { IntakeFieldProposals } from './IntakeFieldProposals';
import { ImportProposalsReview, type ImportProposal } from './ImportProposalsReview';
import { StepAnagrafica } from './StepAnagrafica';
import { StepIngresso } from './StepIngresso';
import type { IngressoData } from './StepIngresso';
import { StepClinica } from './StepClinica';
import { StepVerifica } from './StepVerifica';
import { buildIntakeTherapyReview, prepareIntakeConfirmData } from './intakeTherapies';
import { focusTherapyCorrection, type TherapyCorrectionTarget } from './intakeTherapyNavigation';
import { buildConfirmCartella } from './confirmCartella';
import { buildIntakeContacts } from '../../../lib/intakeContacts';
import { CLINICAL_MODULES as CATALOG_MODULES } from '../../../lib/assessments/assessmentCatalog';
import { AccessibleDialogSurface } from '../AccessibleDialogSurface';
import { IcoCheck, IcoX } from '../../../icons';
import { IntakeIndex } from './IntakeIndex';
import './IntakePage.css';
import {
  INTAKE_SECTIONS,
  intakeProgress,
  type IntakeMissingStep,
  type IntakeSectionId,
} from './intakeProgress';

// Scheda d'ingresso su una pagina (HMI 1, artifacts/hmi-parity/proto/ingresso-docs.png): indice
// con lo stato delle sezioni a sinistra, sezioni una sotto l'altra, "Crea paziente" nell'indice.
// Le sezioni sono in intakeProgress.ts (INTAKE_SECTIONS), con le stesse regole di conferma.

// #243: moduli operativi del prodotto (compilabili dalla sezione "Moduli" della scheda paziente
// dopo la presa in carico). Lista/griglia con stato esplicito, invece di un blocco "in arrivo".
const CLINICAL_MODULES = CATALOG_MODULES.map((module) => ({
  id: module.tab,
  label: module.label,
  desc: module.group,
  available: true,
}));
const MODULE_TO_TAB_ID: Record<string, string> = Object.fromEntries(
  CLINICAL_MODULES.map((module) => [module.id, module.id]),
);

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
  // Sezione visibile nel corpo (evidenziata nell'indice).
  const [active, setActive] = useState<IntakeSectionId>('anagrafica');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const warningRef = useRef<HTMLDivElement | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingAttempt, setOpeningAttempt] = useState(0);
  const initialManualFocusRef = useRef(false);
  const [data, setData] = useState<DraftData>({});
  // Bozza più recente (anche fra due render) e ultima bozza nota al server: dopo un'unione AI o una
  // decisione la scheda si ricarica senza perdere quanto l'operatore sta scrivendo.
  const dataRef = useRef<DraftData>({});
  const baseRef = useRef<DraftData>({});
  // Card Documenti: job d'import a pagine collegato alla bozza.
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [fieldDeciding, setFieldDeciding] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // #234: autosave status for the debounced patchDraft (no longer swallowed silently).
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  // Motivo del rifiuto del server (4xx): il banner dice cosa sistemare invece di «riprova».
  const [saveErrorReason, setSaveErrorReason] = useState<string | null>(null);
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
    if (!therapyCorrection) return;
    // Wait for the opened manual form before focusing the row to correct.
    const frame = window.requestAnimationFrame(() => {
      if (bodyRef.current) focusTherapyCorrection(bodyRef.current, therapyCorrection);
      setTherapyCorrection(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [therapyCorrection]);
  useEffect(() => {
    if (!focusField) return;
    const control = bodyRef.current?.querySelector<HTMLElement>(
      `[data-demographic-field="${focusField}"]`,
    );
    control?.focus();
    control?.scrollIntoView({ block: 'center' });
    setFocusField(null);
  }, [focusField]);
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
      initialManualFocusRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setActive('anagrafica');
      setSavedAt(null);
      setDraftId(null);
      setError(null);
      setData({});
      dataRef.current = {};
      baseRef.current = {};
      setImportJobId(null);
      setFieldDeciding(null);
      setFieldError(null);
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
        const queue = new VersionedDraftSaveQueue(draft.id, draft.version, {
          operatorId,
          operatorRole,
        });
        queue.onSaved = (saved) => {
          baseRef.current = (saved.data ?? {}) as DraftData;
        };
        saveQueueRef.current = queue;
        setImportJobId(draft.importJobId ?? null);
        if (draft.data && typeof draft.data === 'object') {
          baseRef.current = draft.data as DraftData;
          dataRef.current = draft.data as DraftData;
          setData(draft.data as DraftData);
        }
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
        setError('Impossibile aprire la bozza. Riprovare.');
      });
    return () => {
      active = false;
    };
  }, [open, draftId, importDraftId, operatorId, operatorRole, openingAttempt]);

  // The asynchronous draft loads after the dialog's initial focus pass. Focus
  // Name once, without stealing focus on autosave or subsequent field updates.
  useEffect(() => {
    if (!open || importDraftId || !draftId || loading || error || initialManualFocusRef.current)
      return;
    const frame = window.requestAnimationFrame(() => {
      const first = bodyRef.current?.querySelector<HTMLInputElement>(
        '[data-demographic-field="firstName"]',
      );
      if (!first) return;
      initialManualFocusRef.current = true;
      first.focus({ preventScroll: true });
      first.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, importDraftId, draftId, loading, error]);

  // Indice: evidenzia la sezione in vista mentre si scorre il corpo.
  useEffect(() => {
    const root = bodyRef.current;
    if (!root || loading || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const id = visible?.target.getAttribute('data-intake-section') as IntakeSectionId | null;
        if (id) setActive(id);
      },
      { root, rootMargin: '0px 0px -65% 0px' },
    );
    root.querySelectorAll('[data-intake-section]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [loading, draftId, error]);
  // Avvisi di duplicato o di allergie contrastanti: portati in vista quando compaiono.
  useEffect(() => {
    if (duplicateWarn || allergyConflictWarn)
      warningRef.current?.scrollIntoView({ block: 'nearest' });
  }, [duplicateWarn, allergyConflictWarn]);

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

  const docs = useIntakeDocuments(
    open && !importDraftId && !!draftId,
    { operatorId, operatorRole },
    {
      draftId,
      importJobId,
      data,
      getData: () => dataRef.current,
      mutate: mutateDraft,
      reload: reloadDraft,
    },
  );

  // Documento a fianco (ciclo 3a): aperto dal chip di provenienza o da "Vedi documenti"; alla
  // chiusura il focus torna a chi l'ha aperto. Sparisce con i documenti scollegati o la scheda chiusa.
  const [docPanel, setDocPanel] = useState<DocumentPanelRequest | null>(null);
  const docPanelSeq = useRef(0);
  const docPanelOpener = useRef<HTMLElement | null>(null);
  const docsJob = open && !importDraftId && draftId ? docs.job : null;
  if (docPanel && !docsJob) setDocPanel(null);
  // Documenti scollegati a pannello aperto: chip e pannello spariscono, il focus va su un punto
  // stabile della card Documenti ("Carica file", o il suo titolo) invece di restare sul body.
  const docPanelShown = useRef(false);
  const docsCardOpen = open && !importDraftId && !!draftId;
  useEffect(() => {
    if (docsJob || !docPanelShown.current || !docsCardOpen) return;
    const upload = document.querySelector<HTMLButtonElement>(
      '[data-testid="intake-documents-upload"]',
    );
    if (upload && !upload.disabled) return upload.focus();
    const title = document.getElementById('intake-docs-title');
    if (!title) return;
    title.tabIndex = -1;
    title.focus();
  }, [docsJob, docsCardOpen]);
  useEffect(() => {
    docPanelShown.current = !!(docPanel && docsJob);
  });

  if (!open) return null;

  function openDocPanel(target: PanelTarget | null, opener: HTMLElement) {
    docPanelOpener.current = opener;
    docPanelSeq.current += 1;
    setDocPanel({ target, seq: docPanelSeq.current });
  }
  function closeDocPanel() {
    setDocPanel(null);
    const opener = docPanelOpener.current;
    docPanelOpener.current = null;
    if (opener?.isConnected) opener.focus();
  }

  /** Update a top-level section key and debounce-patch the draft */
  function persistDraft(next: DraftData | (() => DraftData)) {
    if (!saveQueueRef.current) return Promise.reject(new Error('Bozza non disponibile.'));
    return saveQueueRef.current.save(next);
  }

  function commitLocal(next: DraftData) {
    dataRef.current = next;
    setData(next);
  }

  /**
   * Bozza nuova dal server (unione AI, decisione, ricarica), versione compresa. Le modifiche locali
   * non ancora salvate restano e si salvano sulla versione nuova.
   */
  function applyServerDraft(saved: DraftResponse, schedule = true) {
    const server = (saved.data ?? {}) as DraftData;
    const { data: next, dirty } = rebaseLocalEdits(baseRef.current, dataRef.current, server);
    baseRef.current = server;
    commitLocal(next as DraftData);
    if (saved.importJobId !== undefined) setImportJobId(saved.importJobId ?? null);
    saveQueueRef.current?.reset(saved.version);
    if (dirty && schedule) scheduleAutosave();
  }

  /** Ricarica la bozza in coda ai salvataggi (mai in parallelo a un'altra scrittura). */
  function reloadDraft(schedule = true): Promise<DraftResponse> {
    const queue = saveQueueRef.current;
    if (!draftId || !queue) return Promise.reject(new Error('Bozza non disponibile.'));
    const id = draftId;
    return queue.exclusive(async () => {
      const fresh = await getDraft(id, op);
      applyServerDraft(fresh, schedule);
      return fresh;
    });
  }

  /** Mutazione versionata (documenti, unioni, proposte): su 409 di versione ricarica e ripete. */
  function mutateDraft(
    run: (version: number | undefined, requestId: string) => Promise<DraftResponse>,
    skip?: (fresh: DraftResponse) => boolean,
  ): Promise<DraftResponse> {
    const queue = saveQueueRef.current;
    if (!draftId || !queue) return Promise.reject(new Error('Bozza non disponibile.'));
    const id = draftId;
    return queue.exclusive(async (version) => {
      const saved = await mutateWithVersionRetry({
        version,
        run,
        reload: async () => {
          const fresh = await getDraft(id, op);
          applyServerDraft(fresh);
          return fresh;
        },
        skip,
        newKey: () => crypto.randomUUID(),
      });
      applyServerDraft(saved);
      return saved;
    });
  }

  function scheduleAutosave() {
    if (!saveQueueRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveState('saving');
    debounceRef.current = setTimeout(() => void autosave(), 500);
  }

  // La bozza si legge al momento dell'invio: un'unione arrivata nel frattempo non viene sovrascritta.
  async function autosave(retried = false): Promise<void> {
    try {
      await persistDraft(() => dataRef.current);
      setSaveState('saved');
      setSaveErrorReason(null);
      setSavedAt(new Date());
    } catch (e) {
      // Versione superata (un'unione AI o un'altra scheda): ricarica e ripeti una sola volta.
      if (
        !retried &&
        e instanceof DraftApiError &&
        e.status === 409 &&
        ['draft_version_conflict', 'draft_version_required', 'draft_link_changed'].includes(
          e.code ?? '',
        )
      ) {
        const reloaded = await reloadDraft(false).then(
          () => true,
          () => false,
        );
        if (reloaded) return autosave(true);
      }
      // #234: no longer swallowed — surface an error state (no PHI in the log).
      setSaveState('error');
      setSaveErrorReason(draftRejectionReason(e));
      console.error('[ClinicOS] autosave bozza intake non riuscito');
    }
  }

  function updateSection(key: keyof DraftData, value: unknown) {
    if (submittingRef.current || proposalRequestRef.current) return;
    const accepted = dataRef.current._accepted ?? {};
    const next = {
      ...dataRef.current,
      [key]: value,
      ...(key === 'terapia' || key === 'terapiaImport'
        ? { _accepted: { ...accepted, therapy: false } }
        : key === 'anagrafica'
          ? { _accepted: { ...accepted, demographics: false } }
          : {}),
    };
    commitLocal(next);

    if (!draftId) return;
    scheduleAutosave();
  }

  /** "Usa questo valore" / "Tieni il mio" su una proposta dei documenti. */
  async function decideField(proposal: FieldProposal, action: 'apply' | 'keep') {
    if (!draftId || fieldDeciding || submittingRef.current) return;
    const id = draftId;
    setFieldDeciding(proposal.id);
    setFieldError(null);
    // Le modifiche in attesa si salvano prima della decisione (stessa coda, in ordine).
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      void autosave();
    }
    try {
      await mutateDraft((version, requestId) =>
        decideFieldProposal(
          id,
          proposal.id,
          { action, requestId, expectedDraftVersion: version },
          op,
        ),
      );
      setSaveState('saved');
      setSavedAt(new Date());
      // Il pannello si chiude quando le proposte finiscono: il focus va alla proposta successiva
      // o, se era l'ultima, al campo appena deciso (mai perso su BODY).
      window.requestAnimationFrame(() => focusAfterFieldDecision(proposal.path));
    } catch (e) {
      if (e instanceof DraftApiError && e.code === 'proposal_decided')
        await reloadDraft().catch(() => null);
      else setFieldError(documentsErrorMessage(e));
    } finally {
      setFieldDeciding(null);
    }
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
      applyServerDraft(saved);
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

  /** Creation confirms identity; actual prescriptions still require explicit review. */
  function acceptanceComplete(): boolean {
    const acc = acceptedFlags();
    const pending =
      Array.isArray(data._importProposals) &&
      data._importProposals.some((value: ImportProposal) => value.status === 'pending');
    const hasTherapies = buildIntakeTherapyReview(data).some((row) => !row.excluded);
    return (!hasTherapies || acc.therapy === true) && !pending && !proposalUncertain;
  }

  function reviewDemographicField(field: DemographicField) {
    setFocusField(field);
  }

  async function handleConfirm(force = false, allergyConflictOverride = false) {
    if (!draftId || submittingRef.current) return;
    const demographicErrors = intakeDemographicErrors(data.anagrafica ?? {}, true);
    const firstInvalid = Object.keys(demographicErrors)[0] as DemographicField | undefined;
    if (firstInvalid) {
      setSubmitAttempted(true);
      setSubmitError(demographicErrors[firstInvalid] ?? null);
      reviewDemographicField(firstInvalid);
      return;
    }
    const phoneValidation = validatePatientPhone(data.anagrafica?.phone);
    // Never require an acceptance for an empty therapy section.
    if (!acceptanceComplete()) {
      setSubmitAttempted(true);
      setSubmitError(
        'Prima di creare il paziente conferma le terapie presenti e decidi le proposte d’import in sospeso.',
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
    // Il wizard e l'import scrivono il referente in referenteNome/Telefono/Relazione e l'indirizzo
    // spezzato in via/CAP/comune/provincia: qui diventano i campi del paziente e della cartella.
    // I vecchi emergencyContactName/Phone restano come ripiego per le bozze che li avessero.
    const contacts = buildIntakeContacts({
      ...(a as Record<string, string | undefined>),
      referenteNome: (a.referenteNome as string | undefined) ?? a.emergencyContactName,
      referenteTelefono: (a.referenteTelefono as string | undefined) ?? a.emergencyContactPhone,
    });
    const patient = {
      firstName: a.firstName ?? '',
      lastName: a.lastName ?? '',
      dateOfBirth: birthDateValue(a.dateOfBirth),
      ...(a.sex !== undefined && { sex: a.sex }),
      codiceFiscale: a.codiceFiscale?.trim().toUpperCase() || null,
      phone: phoneValidation.ok ? phoneValidation.phone : null,
      ...(a.email !== undefined && { email: a.email }),
      ...contacts.patient,
    };

    // #265: extracted pure mapper (unit-tested) — carries allergieStatus into the cartella.
    const cartella = { ...buildConfirmCartella(confirmData), ...contacts.cartella };

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
      commitLocal(confirmData);
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
      } else if (res.code === 'field_proposals_pending') {
        setSubmitError(FIELD_PROPOSALS_PENDING_MESSAGE(Math.max(1, fieldProposals.length)));
        showFieldProposals();
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

  /** Porta una sezione in vista (indice e passaggi mancanti). */
  function jump(id: IntakeSectionId) {
    setActive(id);
    bodyRef.current
      ?.querySelector<HTMLElement>(`[data-intake-section="${id}"]`)
      ?.scrollIntoView({ block: 'start' });
  }

  /** Un passaggio mancante porta al punto da sistemare: campo anagrafico, riga di terapia o
   *  pulsante di conferma della sezione. */
  function showFieldProposals() {
    const panel = bodyRef.current?.querySelector<HTMLElement>(
      '[data-testid="intake-field-proposals"]',
    );
    panel?.scrollIntoView({ block: 'start' });
    window.requestAnimationFrame(() =>
      panel?.querySelector<HTMLElement>('[data-testid="intake-proposal-apply"]')?.focus(),
    );
  }

  function goToMissing(step: IntakeMissingStep) {
    if (step.kind === 'fieldProposals') {
      showFieldProposals();
      return;
    }
    if (step.label === 'Decisione in attesa di risposta') {
      bodyRef.current?.scrollTo({ top: 0 });
      window.requestAnimationFrame(() =>
        bodyRef.current
          ?.querySelector<HTMLElement>('[data-testid="intake-retry-decision"]')
          ?.focus(),
      );
      return;
    }
    if (step.target) {
      setSubmitError(null);
      setTherapyCorrection(step.target);
      jump('terapia');
      return;
    }
    if (step.section === 'anagrafica' && !step.label.startsWith('Conferma')) {
      // Mostra gli errori di campo e porta il fuoco sul primo campo non valido.
      setSubmitAttempted(true);
      jump('anagrafica');
      window.requestAnimationFrame(() => {
        const firstInvalid = bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
        firstInvalid?.focus({ preventScroll: true });
        firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    jump(step.section);
    const accept = step.section === 'anagrafica' ? 'accept-demographics' : 'accept-therapy';
    if (step.label.startsWith('Conferma'))
      window.requestAnimationFrame(() =>
        bodyRef.current?.querySelector<HTMLElement>(`[data-testid="${accept}"]`)?.focus(),
      );
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
    } catch (e) {
      setSaveState('error');
      const reason = draftRejectionReason(e);
      setSaveErrorReason(reason);
      setSubmitError(
        reason ? `Bozza non salvata: ${reason}` : 'Bozza non salvata. Riprova prima di chiudere.',
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  // ── Pagina unica (HMI 1): indice con stato, sezioni una sotto l'altra, azioni nell'indice ──
  const progress = intakeProgress(data, {
    moduleSelected: selectedModuleId !== null,
    proposalUncertain,
  });
  const accepted = acceptedFlags();
  const fieldProposals = pendingFieldProposals(data);
  const aiPaths = aiFieldPaths(data);
  const therapyEmpty =
    !(Array.isArray(data.terapiaImport) && data.terapiaImport.length > 0) &&
    !(Array.isArray(data.terapia) && data.terapia.length > 0);
  const who = [data.anagrafica?.lastName, data.anagrafica?.firstName]
    .filter((v) => typeof v === 'string' && v.trim())
    .join(' ');
  const savedTime = savedAt
    ? savedAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    : null;

  function sectionProps(id: IntakeSectionId) {
    return {
      id: `intake-sec-${id}`,
      'data-intake-section': id,
      'data-testid': `intake-section-${id}`,
      'aria-labelledby': `intake-sec-${id}-title`,
      className: 'ds-card intake-section',
    };
  }
  function sectionTitle(id: IntakeSectionId) {
    const label = INTAKE_SECTIONS.find((s) => s.id === id)?.label ?? id;
    return (
      <h3 id={`intake-sec-${id}-title`} className="intake-section__title">
        {label}
      </h3>
    );
  }

  return (
    <AccessibleDialogSurface
      labelledBy="patient-intake-dialog-title"
      onClose={() => void saveAndClose()}
      dismissible={!submitting}
      closeOnOverlay={false}
      surfaceClassName="modal-card"
      className="import-modal import-modal--intake intake-page"
    >
      <header className="import-modal__head" data-testid="patient-intake-header">
        <div className="intake-dialog__title-group">
          <h2 id="patient-intake-dialog-title">Nuovo ingresso{who ? ` · ${who}` : ''}</h2>
          {/* #234: stato del salvataggio visibile e annunciato a ogni larghezza; dopo un errore
              non si mostra più l'ora dell'ultimo salvataggio riuscito. */}
          <p
            data-testid="patient-intake-step-summary"
            className="intake-page__savestate"
            role="status"
            aria-live="polite"
            data-state={saveState}
          >
            {saveState === 'error'
              ? `Bozza non salvata: ${saveErrorReason ?? 'errore di salvataggio, riprova'}`
              : saveState === 'saving'
                ? 'Salvataggio della bozza…'
                : savedTime
                  ? `Bozza salvata alle ${savedTime}`
                  : 'Bozza in compilazione'}
            {operatoreNome ? ` · ${operatoreNome}` : ''}
          </p>
        </div>
        <button
          type="button"
          className="ds-icon-btn"
          onClick={() => void saveAndClose()}
          aria-label={
            draftId && !loading && !error ? 'Annulla ingresso e salva la bozza' : 'Annulla ingresso'
          }
          data-dialog-initial-focus
          disabled={submitting}
        >
          <IcoX />
        </button>
      </header>

      <div className={`intake-page__grid${docPanel && docsJob ? ' intake-page__grid--doc' : ''}`}>
        <IntakeIndex
          sections={progress.sections}
          active={active}
          missing={progress.missing}
          onJump={jump}
          onMissing={goToMissing}
          busy={submitting || loading || !!error}
          saveDisabled={submitting}
          ready={!loading && !error && !!draftId}
          creating={submitting}
          onCreate={() => void handleConfirm(false)}
          saveLabel={onBackToDocuments ? '← Torna alla revisione' : 'Salva bozza e chiudi'}
          onSave={() => void (onBackToDocuments ? saveAndClose(onBackToDocuments) : saveAndClose())}
          error={allergyConflictWarn || duplicateWarn ? null : submitError}
        />

        {/* Corpo: l'unica area che scorre (BUG-074) */}
        <div
          className="import-modal__body intake-page__body"
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
                type="button"
                className="ds-btn ds-btn--primary"
                data-testid="intake-retry-decision"
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
          {error && (
            <div className="import-modal__error" role="alert">
              <p>{error}</p>
              <button
                type="button"
                className="ds-btn ds-btn--secondary"
                data-testid="intake-retry-opening"
                onClick={() => setOpeningAttempt((attempt) => attempt + 1)}
              >
                Riprova
              </button>
            </div>
          )}
          {!loading && !error && (
            <IntakeAiProvider
              paths={aiPaths}
              source={{ data, job: docsJob, open: docsJob ? openDocPanel : null }}
            >
              <div
                className="intake-page__sections"
                inert={proposalUncertain}
                data-draft-id={draftId ?? undefined}
              >
                {/* Card Documenti (HMI 1): solo sulla scheda compilata qui; il flusso "da documenti"
                  ha già i suoi documenti e resta invariato. */}
                {!importDraftId && draftId && (
                  <IntakeDocumentsCard
                    docs={docs}
                    disabled={submitting}
                    onShowDocuments={(opener) => openDocPanel(null, opener)}
                  />
                )}
                <IntakeFieldProposals
                  proposals={fieldProposals}
                  data={data}
                  deciding={fieldDeciding}
                  disabled={submitting}
                  error={fieldError}
                  onDecide={(p, action) => void decideField(p, action)}
                />
                {duplicateWarn && (
                  <div className="import-modal__warning" role="alert" ref={warningRef}>
                    <p>
                      <strong>Paziente duplicato rilevato.</strong> Un paziente con questi dati
                      potrebbe già esistere.
                    </p>
                    <button
                      type="button"
                      className="ds-btn ds-btn--secondary"
                      onClick={() => void handleConfirm(true)}
                      disabled={submitting}
                    >
                      Crea comunque
                    </button>
                  </div>
                )}
                {allergyConflictWarn && (
                  <div className="import-modal__warning" role="alert" ref={warningRef}>
                    <p>
                      <strong>Allergie contrastanti rilevate.</strong> {submitError}
                    </p>
                    <button
                      type="button"
                      className="ds-btn ds-btn--secondary"
                      onClick={() => void handleConfirm(false, true)}
                      disabled={submitting}
                    >
                      Conferma comunque
                    </button>
                  </div>
                )}

                <section {...sectionProps('anagrafica')}>
                  <header className="intake-section__head">
                    {sectionTitle('anagrafica')}
                    <span className="form-hint">
                      Gli altri dati possono essere completati dopo l’ingresso
                    </span>
                  </header>
                  <StepAnagrafica
                    value={data.anagrafica ?? {}}
                    onChange={(v) => updateSection('anagrafica', v)}
                    submitAttempted={submitAttempted}
                  />
                </section>

                <section {...sectionProps('ingresso')}>
                  <header className="intake-section__head">{sectionTitle('ingresso')}</header>
                  <StepIngresso
                    value={data.ingresso ?? {}}
                    onChange={(v) => updateSection('ingresso', v)}
                  />
                </section>

                <section {...sectionProps('allergie')}>
                  <header className="intake-section__head">{sectionTitle('allergie')}</header>
                  <StepClinica
                    data={data}
                    onUpdateSection={updateSection}
                    operatoreNome={operatoreNome}
                    importedFields={(data._importedFields as string[] | undefined) ?? []}
                    narrative={data._narrative as Record<string, unknown> | undefined}
                    only={['allergie']}
                    therapyBlock={false}
                    showLegacyPain={false}
                    showTitles={false}
                  />
                </section>

                <section {...sectionProps('terapia')}>
                  <header className="intake-section__head">
                    {sectionTitle('terapia')}
                    <button
                      type="button"
                      className="ds-btn ds-btn--secondary ds-btn--wrap"
                      data-testid="accept-therapy"
                      aria-pressed={accepted.therapy === true}
                      disabled={submitting}
                      onClick={() =>
                        updateSection('_accepted', {
                          ...accepted,
                          therapy: accepted.therapy !== true,
                        })
                      }
                    >
                      <IcoCheck />
                      {accepted.therapy === true
                        ? therapyEmpty
                          ? 'Nessuna terapia: confermato'
                          : 'Terapia confermata'
                        : therapyEmpty
                          ? 'Conferma: nessuna terapia da inserire'
                          : 'Conferma la terapia'}
                    </button>
                  </header>
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
                    onBackToDocuments={
                      onBackToDocuments ? () => void saveAndClose(onBackToDocuments) : undefined
                    }
                    only={['terapia']}
                    showTherapyAcceptance={false}
                    showLegacyPain={false}
                    showTitles={false}
                  />
                </section>

                <section {...sectionProps('diagnosi')}>
                  <header className="intake-section__head">{sectionTitle('diagnosi')}</header>
                  <StepClinica
                    data={data}
                    onUpdateSection={updateSection}
                    operatoreNome={operatoreNome}
                    importedFields={(data._importedFields as string[] | undefined) ?? []}
                    narrative={data._narrative as Record<string, unknown> | undefined}
                    only={['anamnesi', 'diagnosi']}
                    therapyBlock={false}
                    showLegacyPain={false}
                  />
                </section>

                <section {...sectionProps('parametri')}>
                  <header className="intake-section__head">{sectionTitle('parametri')}</header>
                  <StepClinica
                    data={data}
                    onUpdateSection={updateSection}
                    operatoreNome={operatoreNome}
                    only={['parametri']}
                    therapyBlock={false}
                    showTitles={false}
                  />
                </section>

                <section {...sectionProps('moduli')}>
                  <header className="intake-section__head">{sectionTitle('moduli')}</header>
                  <p className="intake-section__hint">
                    Facoltativo: il modulo scelto si apre subito dopo la creazione del paziente.
                    Tutti i moduli restano nella sezione <strong>Moduli</strong> della cartella.
                  </p>
                  <div
                    className="intake-modules-grid"
                    role="list"
                    data-testid="intake-modules-grid"
                  >
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
                            onClick={() =>
                              setSelectedModuleId((cur) => (cur === m.id ? null : m.id))
                            }
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
                </section>

                <section {...sectionProps('riepilogo')}>
                  <header className="intake-section__head">{sectionTitle('riepilogo')}</header>
                  <StepVerifica
                    data={data}
                    busy={submitting}
                    error={null}
                    onConfirm={() => void handleConfirm(false)}
                    onUpdateSection={updateSection}
                    onReviewDemographics={reviewDemographicField}
                    onReviewTherapies={(target) => {
                      setSubmitError(null);
                      if (target) setTherapyCorrection(target);
                      else jump('terapia');
                    }}
                    showAcceptance={false}
                    showCreate={false}
                  />
                </section>
              </div>
            </IntakeAiProvider>
          )}
        </div>
        {docPanel && docsJob && (
          <IntakeDocumentPanel
            job={docsJob}
            api={docs.api}
            request={docPanel}
            onClose={closeDocPanel}
          />
        )}
      </div>
    </AccessibleDialogSurface>
  );
}
