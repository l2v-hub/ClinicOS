import { intakeDemographicErrors } from '../../lib/intakeDemographics';
import { birthDateValue, birthSummary, type DemographicField } from '../../lib/patientDemographics';
import { DemographicsStatus } from '../shared/DemographicsStatus';
import { PatientIntakeReview } from './PatientIntakeReview';
import { ConsegnaTimestamp } from './ConsegnaTimestamp';
import { ConsegnaQuickAdd } from './ConsegnaQuickAdd';
import type { ConsegnaCreate } from '../../lib/consegnaCreation';
import type { ConsegnaDraftStore } from '../../lib/consegnaDrafts';
import type { AssessmentDraftStore } from '../../lib/assessments/assessmentDraftStore';
import type { AssessmentTarget } from '../../lib/assessments/assessmentTypes';
import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import type {
  Paziente,
  Consegna,
  Operatore,
  Camera,
  CartellaPaziente,
  NotaClinica,
  VisitaRecord,
  IndicatoreRischio,
  VitaleItem,
  Anamnesi,
  ConsegnaSummary,
} from '../../types';
import {
  IcoEdit,
  IcoCheck,
  IcoX,
  IcoPlus,
  IcoWarning,
  IcoActivity,
  IcoPill,
  IcoConsegne,
  IcoBed,
  IcoCartelle,
  IcoClock,
} from '../../icons';
import { DIARIO_AUTHOR_FILTERS } from './cartella/diarioFilters';
import { TopNav } from '../navigation/TopNav';
import { AvvisoAnomalieFarmaci } from './cartella/AvvisoAnomalieFarmaci';
import { useAnomalieReparto, anomalieDelPaziente } from './cartella/useAnomalieReparto';
import PatientCompactHeader from './PatientCompactHeader';
import PatientRecordPrintDialog from './PatientRecordPrintDialog';
import { ClinicalTableSection } from './cartella/shared';
import { AllergiesEditor } from './sections/AllergiesEditor';
import { deriveAllergySummary } from '../../lib/allergyStatusModel';
import { PATIENT_PHONE_MAX_LENGTH, validatePatientPhone } from '../../lib/patientPhone';
import {
  assignableBeds,
  assignableRooms,
  assignableWards,
  bedDisplayLabel,
  currentPatientPlacement,
  patientPlacementValues,
  isValidBedSelection,
} from '../../lib/roomAssignmentModel';
import { DiagnosisEditor } from './sections/DiagnosisEditor';
import {
  TAB_GROUPS,
  resolvePatientTab,
  assessmentPatientTab,
  patientTabGroup,
  type TabGroup,
  type TabId,
} from './tabGroups';
import {
  AnamnesisEditor,
  AssessmentWorkspace,
  ContenzioniTab,
  DiarioPazienteTab,
  DimissioneTab,
  DocumentiTab,
  EsamiConsulenzeTab,
  InvioPSModal,
  MedicazioniTab,
  NarrativeSectionsTab,
  PainAssessmentEditor,
  PresaInCaricoTab,
  ScalaBradenTab,
  ScalaTinettiTab,
  TherapyEditor,
} from './PatientDetailLazyTabs';
import { ClinicalSectionLoading } from './ClinicalSectionLoading';
import { AccessibleDialogSurface } from '../shared/AccessibleDialogSurface';
import { PatientVitalSignsView } from './PatientVitalSignsView';
import './PatientRecordData.css';
import './PatientOverview.css';

// ── Types ─────────────────────────────────────────────────────────────────────

// findGroupForTab removed — sidebar nav doesn't need group tracking

interface PatientDetailProps {
  paziente: Paziente;
  cartella: CartellaPaziente;
  consegne: Consegna[];
  consegneSummary: ConsegnaSummary | null;
  consegneLoading: boolean;
  consegneError: string | null;
  consegneHasMore: boolean;
  onLoadMoreConsegne: () => void;
  onRetryConsegne: () => void;
  operatori: Operatore[];
  camere: Camera[];
  camereLoadState: 'idle' | 'loading' | 'ready' | 'error';
  camereLoadError: string | null;
  onRetryCamere: () => void;
  canAssignRooms: boolean;
  onBack: () => void;
  backLabel?: string;
  onAddConsegna: ConsegnaCreate;
  consegnaDraftStore?: ConsegnaDraftStore;
  assessmentDraftStore?: AssessmentDraftStore;
  onUpdateConsegnaStato: (id: string, stato: Consegna['stato']) => void;
  onUpdateCartella: (
    pazienteId: string,
    updates: Partial<CartellaPaziente>,
    options?: { optimistic?: boolean },
  ) => void | Promise<boolean>;
  onUpdatePaziente: (
    id: string,
    updates: Partial<Pick<Paziente, 'email' | 'phone' | 'codiceFiscale' | 'dateOfBirth'>>,
  ) => Promise<boolean>;
  onAssignCamera: (
    pazienteId: string,
    cameraNumero?: string,
    bedId?: string,
  ) => Promise<{ ok: boolean; lettoLabel?: string }>;
  operatoreNome: string;
  operatoreId: string;
  /** #243: land on this tab (e.g. a "Moduli" module) the first time this patient is shown,
   * instead of the default 'riepilogo'. Consumed once per mount/patient — subsequent patient
   * switches while this component stays mounted still reset to the default tab. */
  initialTab?: TabId;
  navigationRequestId?: number;
  assistantSectionRefresh?: { actionType: string; version: number };
  /** #246: operator role, forwarded to the document-upload endpoints' auth gate (X-Operator-Role). */
  operatoreRole?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('it-IT');
}

function fmtDateTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return (
    d.toLocaleDateString('it-IT') +
    ' ' +
    d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  );
}

function uid(): string {
  return crypto.randomUUID();
}
function nowISO(): string {
  return new Date().toISOString();
}
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const RISCHIO_CLASS: Record<string, string> = {
  critico: 'badge--red',
  alto: 'badge--amber',
  medio: 'badge--blue',
  basso: 'badge--gray',
};
const STATO_DIAG_CLASS: Record<string, string> = {
  attiva: 'badge--blue',
  risolta: 'badge--green',
  monitoraggio: 'badge--amber',
  sospetta: 'badge--gray',
};
const STATO_VITALE_CLASS: Record<string, string> = {
  normale: 'vital-card--normale',
  attenzione: 'vital-card--attenzione',
  critico: 'vital-card--critico',
};

// SectionHeader removed — all sections now use ClinicalTableSection

// ── Inline form wrapper ────────────────────────────────────────────────────────

function InlineForm({
  onSave,
  onCancel,
  saving = false,
  children,
}: {
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="cr-inline-form">
      {children}
      <div className="cr-inline-form__actions">
        <button className="btn-secondary btn-sm" onClick={onCancel} disabled={saving}>
          Annulla
        </button>
        <button className="btn-success btn-sm" onClick={onSave} disabled={saving}>
          <IcoCheck /> {saving ? 'Salvataggio…' : 'Salva'}
        </button>
      </div>
    </div>
  );
}

// ── Item row ───────────────────────────────────────────────────────────────────

function ItemRow({
  onEdit,
  onDelete,
  children,
}: {
  onEdit: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="cr-item-row">
      <div className="cr-item-row__content">{children}</div>
      <div className="cr-item-row__actions">
        <button className="icon-btn icon-btn--sm icon-btn--edit" onClick={onEdit} title="Modifica">
          <IcoEdit />
        </button>
        <button
          className="icon-btn icon-btn--sm icon-btn--danger"
          onClick={onDelete}
          title="Elimina"
        >
          <IcoX />
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function PatientDetail({
  operatori,
  paziente,
  cartella,
  consegne,
  consegneSummary,
  consegneLoading,
  consegneError,
  consegneHasMore,
  onLoadMoreConsegne,
  onRetryConsegne,
  camere,
  camereLoadState,
  camereLoadError,
  onRetryCamere,
  canAssignRooms,
  onBack,
  backLabel,
  onAddConsegna,
  consegnaDraftStore,
  assessmentDraftStore,
  onUpdateConsegnaStato,
  onUpdateCartella,
  onUpdatePaziente,
  onAssignCamera,
  operatoreNome,
  operatoreId,
  operatoreRole,
  initialTab,
  navigationRequestId,
  assistantSectionRefresh,
}: PatientDetailProps) {
  const [tab, setTab] = useState<TabId>(resolvePatientTab(initialTab));
  const [activeGroup, setActiveGroup] = useState<TabGroup>(() => patientTabGroup(initialTab));
  const [diarioFilter, setDiarioFilter] = useState<string>('tutti');
  const [assessmentFocus, setAssessmentFocus] = useState<{ patientId: string; assessment: AssessmentTarget } | null>(null);
  const [archiveFocus, setArchiveFocus] = useState<{ patientId: string; documentId: string; assessment: AssessmentTarget } | null>(null);
  useEffect(() => {
    if (!initialTab || navigationRequestId === undefined) return;
    setTab(resolvePatientTab(initialTab));
    setActiveGroup(patientTabGroup(initialTab));
  }, [initialTab, navigationRequestId]);
  // AC5: anomalie di terapia del paziente. Passa dalla stessa richiesta di reparto che alimenta
  // la lista pazienti, quindi aprire una cartella non aggiunge chiamate.
  const anomalieReparto = useAnomalieReparto();

  // #243: this component mounts fresh each time the operator opens the patient chart (the
  // caller conditionally renders it), so a ref seeded from `initialTab` on first render lets us
  // tell "first paint for this patient" (honour initialTab) apart from "patient switched while
  // still mounted" (e.g. search/Agnos navigation while already viewing another patient's chart —
  // always reset to the default tab, initialTab only ever targets the patient it was requested for).
  const initialTabPatientRef = useRef<string | null>(initialTab ? paziente.id : null);
  // Ricorda l'ultimo sotto-tab visitato in ciascun gruppo (es. "Terapia Farmacologica" dentro
  // "Clinica"): senza, tornare a un gruppo dopo averne visitato un altro riportava sempre al
  // primo sotto-tab, perdendo il punto in cui si era — anche nella stessa sessione sullo stesso
  // paziente. Azzerato al cambio paziente, insieme al resto dello stato di navigazione sotto.
  const lastTabByGroup = useRef<Partial<Record<TabGroup, TabId>>>({});

  function switchTab(tabId: TabId) {
    const target = resolvePatientTab(tabId);
    const group = patientTabGroup(target);
    setTab(target);
    setActiveGroup(group);
    lastTabByGroup.current[group] = target;
  }

  function switchGroup(groupId: TabGroup) {
    const group = TAB_GROUPS.find((g) => g.id === groupId);
    if (!group) return;
    setActiveGroup(groupId);
    if (!group.tabs.some((t) => t.id === tab)) {
      const remembered = lastTabByGroup.current[groupId];
      const target =
        remembered && group.tabs.some((t) => t.id === remembered) ? remembered : group.tabs[0].id;
      setTab(target);
      lastTabByGroup.current[groupId] = target;
    }
  }

  // ── Per-section CRUD state ─────────────────────────────────────────────────

  // Profilo edit
  const [editProfilo, setEditProfilo] = useState(false);
  const [profiloPhoneError, setProfiloPhoneError] = useState<string | null>(null);
  const [profiloSaveError, setProfiloSaveError] = useState<string | null>(null);
  const [profiloSaving, setProfiloSaving] = useState(false);
  const profiloPhoneRef = useRef<HTMLInputElement>(null);
  const [profiloFieldErrors, setProfiloFieldErrors] = useState<
    Partial<Record<DemographicField, string>>
  >({});
  const [profileFocus, setProfileFocus] = useState<DemographicField | null>(null);
  useEffect(() => {
    if (!editProfilo || !profileFocus) return;
    document.getElementById(`patient-profile-${profileFocus}`)?.focus();
    setProfileFocus(null);
  }, [editProfilo, profileFocus]);
  const [profiloForm, setProfiloForm] = useState<
    Partial<CartellaPaziente & Pick<Paziente, 'email' | 'phone' | 'codiceFiscale' | 'dateOfBirth'>>
  >({});
  // Feature 010: L3 sub-tabs for Profilo (FR-005)

  // Rischi
  const [showAddRisk, setShowAddRisk] = useState(false);
  const [editRiskId, setEditRiskId] = useState<string | null>(null);
  const [riskForm, setRiskForm] = useState<Partial<IndicatoreRischio>>({});

  // Note cliniche
  const [showAddNota, setShowAddNota] = useState(false);
  const [editNotaId, setEditNotaId] = useState<string | null>(null);
  const [notaForm, setNotaForm] = useState<Partial<NotaClinica>>({});

  // Visite
  const [showAddVisita, setShowAddVisita] = useState(false);
  const [editVisitaId, setEditVisitaId] = useState<string | null>(null);
  const [visitaForm, setVisitaForm] = useState<Partial<VisitaRecord>>({});

  // Consegne
  const [showAddConsegna, setShowAddConsegna] = useState(false);

  // ── Card modals ─────────────────────────────────────────────────────────────
  type CardModalType =
    'diagnosi' | 'farmaci' | 'parametri' | 'consegne' | 'allergie' | 'camera' | null;
  const [cardModal, setCardModal] = useState<CardModalType>(null);

  // Allergie CRUD — managed by AllergiesEditor (controlled)
  // Diagnosi CRUD — managed by DiagnosisEditor (controlled)

  // Parametri modal quick-add
  const [modalVitaleShow, setModalVitaleShow] = useState(false);
  const [vitaleForm, setVitaleForm] = useState<Partial<VitaleItem>>({});

  // Consegne modal quick-add
  const [modalConsegnaShow, setModalConsegnaShow] = useState(false);

  // Camera modal
  const [cameraEditing, setCameraEditing] = useState(false);
  const [cameraModalForm, setCameraModalForm] = useState<Partial<CartellaPaziente>>({});
  const [cameraModalBedId, setCameraModalBedId] = useState('');
  const closeCardModal = useCallback(() => {
    setCardModal(null);
    setCameraEditing(false);
    setCameraModalBedId('');
  }, []);

  // Invio in PS modal
  const [showInvioPS, setShowInvioPS] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  useEffect(() => {
    if (initialTabPatientRef.current === paziente.id) {
      initialTabPatientRef.current = paziente.id;
      return;
    }
    initialTabPatientRef.current = paziente.id;
    setTab('profilo');
    setActiveGroup('panoramica');
    setDiarioFilter('tutti');
    // Nessuno di questi 22 stati e' collegato al paziente.id per progettazione — un form/modale
    // rimasto aperto dopo il cambio paziente resterebbe agganciato al paziente sbagliato. Due in
    // particolare (cardModal, showInvioPS) leggono `paziente`/`cartella` come prop LIVE, non uno
    // snapshot: se non chiusi qui si retargetterebbero silenziosamente sul nuovo paziente invece
    // di mostrare dati stantii — un'azione clinica confermata (es. Invio in PS) potrebbe colpire
    // il paziente sbagliato senza che l'operatore se ne accorga.
    setEditProfilo(false);
    setProfiloForm({});
    setShowAddRisk(false);
    setEditRiskId(null);
    setRiskForm({});
    setShowAddNota(false);
    setEditNotaId(null);
    setNotaForm({});
    setShowAddVisita(false);
    setEditVisitaId(null);
    setVisitaForm({});
    setShowAddConsegna(false);
    setCardModal(null);
    setModalVitaleShow(false);
    setVitaleForm({});
    setModalConsegnaShow(false);
    setCameraEditing(false);
    setCameraModalForm({});
    setCameraModalBedId('');
    setShowInvioPS(false);
    setShowPrintDialog(false);
    lastTabByGroup.current = {};
  }, [paziente.id]);

  // ── Computed ───────────────────────────────────────────────────────────────

  const mieConsegne = consegne.filter((c) => c.pazienteId === paziente.id);
  const allergieGravi = cartella.allergie.filter((a) => a.gravita === 'grave');
  const hasAllergie = allergieGravi.length > 0;
  // #244: non-ambiguous allergy summary — same source of truth for the quick-stat and the
  // riepilogo card, so neither can disagree with the AllergiesEditor modal about the state.
  const allergySummary = deriveAllergySummary(cartella.allergie, cartella.allergieStatus);
  const diagnosiAttive = cartella.diagnosi.filter((d) => d.stato === 'attiva');
  const farmaciAttivi = cartella.farmaci.filter((f) => f.stato === 'attivo');
  const rischioAlto = cartella.indicatoriRischio.filter(
    (r) => r.livello === 'alto' || r.livello === 'critico',
  );
  // Issue #128: proponi solo camere con almeno un letto libero (o già occupate da questo paziente)
  const currentPlacement = currentPatientPlacement(camere, paziente.id);
  const roomDataReady = camereLoadState === 'ready';
  const placementValues = patientPlacementValues(currentPlacement, cartella);
  const placementPending =
    canAssignRooms && !roomDataReady
      ? camereLoadState === 'error'
        ? 'Non disponibile'
        : 'In verifica'
      : undefined;
  const roomLabel = placementValues.room ?? placementPending ?? 'Non assegnata';
  const bedLabel = placementValues.bed ?? placementPending ?? 'Non assegnato';

  function RoomDataNotice() {
    if (!canAssignRooms || roomDataReady) return null;
    const failed = camereLoadState === 'error';
    return (
      <div className="coverage-alert" role={failed ? 'alert' : 'status'}>
        <IcoWarning />
        <span>
          {failed
            ? (camereLoadError ?? 'Disponibilità camere non accessibile.')
            : 'Caricamento disponibilità camere…'}
        </span>
        {failed && (
          <button type="button" className="link-btn" onClick={onRetryCamere}>
            Riprova
          </button>
        )}
      </div>
    );
  }

  // ── Update helpers ─────────────────────────────────────────────────────────

  // T030 (SPEC-015 US5 / FR-018): stato di salvataggio condiviso — disabilita i
  // pulsanti Salva durante la richiesta ed evita il doppio submit. L'esito è
  // visibile tramite il toast di App (successo/errore); in caso di errore i form
  // restano aperti per riprovare.
  const [saving, setSaving] = useState(false);

  function upd(updates: Partial<CartellaPaziente>): void | Promise<boolean> {
    return onUpdateCartella(cartella.pazienteId, updates);
  }

  async function updConEsito(updates: Partial<CartellaPaziente>): Promise<boolean> {
    if (saving) return false;
    setSaving(true);
    try {
      const res = await Promise.resolve(upd(updates));
      return res !== false;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }

  // Rischi
  function saveRischi(list: IndicatoreRischio[]) {
    return updConEsito({ indicatoriRischio: list });
  }
  async function addRischio() {
    if (!riskForm.descrizione) return;
    const ok = await saveRischi([
      {
        id: uid(),
        tipo: 'altro',
        livello: 'basso',
        descrizione: '',
        dataValutazione: todayStr(),
        operatore: operatoreNome,
        ...riskForm,
      } as IndicatoreRischio,
      ...cartella.indicatoriRischio,
    ]);
    if (ok) {
      setShowAddRisk(false);
      setRiskForm({});
    }
  }
  async function updateRischio(id: string) {
    const ok = await saveRischi(
      cartella.indicatoriRischio.map((r) => (r.id === id ? { ...r, ...riskForm } : r)),
    );
    if (ok) {
      setEditRiskId(null);
      setRiskForm({});
    }
  }
  function deleteRischio(id: string) {
    saveRischi(cartella.indicatoriRischio.filter((r) => r.id !== id));
  }

  // Note cliniche
  function saveNoteClinica(list: NotaClinica[]) {
    return updConEsito({ noteClinica: list });
  }
  async function addNota() {
    if (!notaForm.contenuto) return;
    const ok = await saveNoteClinica([
      {
        id: uid(),
        tipo: 'clinica',
        contenuto: '',
        operatore: operatoreNome,
        createdAt: nowISO(),
        ...notaForm,
      } as NotaClinica,
      ...cartella.noteClinica,
    ]);
    if (ok) {
      setShowAddNota(false);
      setNotaForm({});
    }
  }
  async function updateNota(id: string) {
    const ok = await saveNoteClinica(
      cartella.noteClinica.map((n) =>
        n.id === id ? { ...n, ...notaForm, updatedAt: nowISO() } : n,
      ),
    );
    if (ok) {
      setEditNotaId(null);
      setNotaForm({});
    }
  }
  function deleteNota(id: string) {
    saveNoteClinica(cartella.noteClinica.filter((n) => n.id !== id));
  }

  // Visite
  function saveVisite(list: VisitaRecord[]) {
    return updConEsito({ visite: list });
  }
  async function addVisita() {
    if (!visitaForm.descrizione) return;
    const ok = await saveVisite([
      {
        id: uid(),
        tipo: 'Visita',
        data: todayStr(),
        operatore: operatoreNome,
        descrizione: '',
        esito: '',
        createdAt: nowISO(),
        ...visitaForm,
      } as VisitaRecord,
      ...cartella.visite,
    ]);
    if (ok) {
      setShowAddVisita(false);
      setVisitaForm({});
    }
  }
  async function updateVisita(id: string) {
    const ok = await saveVisite(
      cartella.visite.map((v) => (v.id === id ? { ...v, ...visitaForm } : v)),
    );
    if (ok) {
      setEditVisitaId(null);
      setVisitaForm({});
    }
  }
  function deleteVisita(id: string) {
    saveVisite(cartella.visite.filter((v) => v.id !== id));
  }

  // Profilo
  async function saveProfiloHandler() {
    if (profiloSaving || saving) return;
    const { email, phone, codiceFiscale, dateOfBirth, ...cartellaUpdates } = profiloForm;
    const errors = intakeDemographicErrors({ ...paziente, phone, codiceFiscale, dateOfBirth });
    if (paziente.phone?.trim() && !phone?.trim())
      errors.phone = 'Il telefono già registrato non può essere rimosso';
    if (paziente.codiceFiscale?.trim() && !codiceFiscale?.trim())
      errors.codiceFiscale = 'Il codice fiscale già registrato non può essere rimosso';
    setProfiloFieldErrors(errors);
    setProfiloPhoneError(errors.phone ?? null);
    setProfiloSaveError(null);
    const invalidField = Object.keys(errors)[0] as DemographicField | undefined;
    if (invalidField) {
      document.getElementById(`patient-profile-${invalidField}`)?.focus();
      return;
    }
    const validated = validatePatientPhone(phone);
    setProfiloSaving(true);
    try {
      const patientSaved = await onUpdatePaziente(paziente.id, {
        email,
        ...(validated.ok ? { phone: validated.phone } : {}),
        ...(codiceFiscale?.trim() ? { codiceFiscale: codiceFiscale.trim().toUpperCase() } : {}),
        ...(dateOfBirth?.trim() ? { dateOfBirth: birthDateValue(dateOfBirth) } : {}),
      });
      if (!patientSaved) {
        setProfiloSaveError('Salvataggio non riuscito. Verifica i dati e riprova.');
        return;
      }
      const ok = await updConEsito(cartellaUpdates);
      if (ok) setEditProfilo(false);
      else setProfiloSaveError('Salvataggio del profilo incompleto. Riprova.');
    } catch (error) {
      setProfiloSaveError(
        error instanceof Error ? error.message : 'Salvataggio non riuscito. Riprova.',
      );
    } finally {
      setProfiloSaving(false);
    }
  }

  // ── Card modal CRUD helpers ────────────────────────────────────────────────

  // Allergie CRUD — delegated to AllergiesEditor
  // Diagnosi CRUD — delegated to DiagnosisEditor

  // Parametri quick-add from modal
  async function addVitaleFromModal() {
    if (!vitaleForm.etichetta || !vitaleForm.valore) return;
    const newV: VitaleItem = {
      id: uid(),
      etichetta: '',
      valore: '',
      unita: '',
      stato: 'normale',
      rilevato: nowISO(),
      rilevatoDa: operatoreNome,
      ...vitaleForm,
    } as VitaleItem;
    const ok = await updConEsito({ parametriVitali: [newV, ...cartella.parametriVitali] });
    if (ok) {
      setModalVitaleShow(false);
      setVitaleForm({});
    }
  }

  // Camera save from modal
  // Issue #128: prima crea/chiude l'assegnazione letto reale (occupazione), poi salva la cartella
  async function saveCameraFromModal() {
    const cam = cameraModalForm.cameraNumero || undefined;
    const res = await onAssignCamera(paziente.id, cam, cameraModalBedId || undefined);
    if (!res.ok) return;
    const ok = await updConEsito({
      ...cameraModalForm,
      cameraNumero: cam,
      lettoNumero: cam ? (res.lettoLabel ?? cameraModalForm.lettoNumero) : undefined,
    });
    if (ok) {
      setCameraEditing(false);
      setCameraModalForm({});
      setCameraModalBedId('');
    }
  }

  // ── Card modals rendering ──────────────────────────────────────────────────

  const patientLabel = `${paziente.lastName}, ${paziente.firstName}`;

  function renderDiagnosiModal() {
    return (
      <AccessibleDialogSurface
        labelledBy="patient-diagnosi-dialog-title"
        describedBy="patient-diagnosi-dialog-description"
        onClose={closeCardModal}
        className="modal-box--edit-card"
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title" id="patient-diagnosi-dialog-title">
              Diagnosi e Problemi
            </h3>
            <p className="modal-subtitle" id="patient-diagnosi-dialog-description">
              {patientLabel}
            </p>
          </div>
          <button
            type="button"
            className="icon-btn icon-btn--sm"
            onClick={closeCardModal}
            aria-label="Chiudi"
            data-dialog-initial-focus
          >
            <IcoX />
          </button>
        </div>
        <div className="modal-body">
          <DiagnosisEditor
            mode="patient-chart"
            value={cartella.diagnosi ?? []}
            onChange={(list) => upd({ diagnosi: list })}
            operatoreNome={operatoreNome}
          />
        </div>
        <div className="modal-footer">
          <div className="modal-footer__left">
            <button
              className="btn-secondary"
              onClick={() => {
                setCardModal(null);
                switchGroup('clinica');
                switchTab('diagnosi');
              }}
            >
              Apri sezione completa
            </button>
          </div>
          <div className="modal-footer__right">
            <button className="btn-primary" onClick={closeCardModal}>
              Chiudi
            </button>
          </div>
        </div>
      </AccessibleDialogSurface>
    );
  }

  function renderFarmaciModal() {
    return (
      <AccessibleDialogSurface
        labelledBy="patient-farmaci-dialog-title"
        describedBy="patient-farmaci-dialog-description"
        onClose={closeCardModal}
        className="modal-box--edit-card"
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title" id="patient-farmaci-dialog-title">
              Farmaci Attivi
            </h3>
            <p className="modal-subtitle" id="patient-farmaci-dialog-description">
              {patientLabel}
            </p>
          </div>
          <button
            type="button"
            className="icon-btn icon-btn--sm"
            onClick={closeCardModal}
            aria-label="Chiudi"
            data-dialog-initial-focus
          >
            <IcoX />
          </button>
        </div>
        <div className="modal-body">
          <div className="ec-modal-list">
            {farmaciAttivi.length === 0 && <p className="cr-empty">Nessun farmaco attivo.</p>}
            {farmaciAttivi.map((f) => (
              <div key={f.id} className="ec-modal-item">
                <div className="ec-modal-item__main">
                  <span className="ec-modal-item__title">{f.nome}</span>
                  <span className="ec-modal-item__sub">{f.dose}</span>
                  <span className="ec-modal-item__sub">{f.frequenza}</span>
                  {f.via && <span className="badge badge--gray">{f.via}</span>}
                </div>
              </div>
            ))}
          </div>
          <p className="cr-empty" style={{ marginTop: 4 }}>
            Per aggiungere o modificare farmaci usa la sezione completa.
          </p>
        </div>
        <div className="modal-footer">
          <div className="modal-footer__left">
            <button
              className="btn-secondary"
              onClick={() => {
                setCardModal(null);
                switchGroup('clinica');
                switchTab('terapia-farmacologica');
              }}
            >
              Apri Terapia Farmacologica
            </button>
          </div>
          <div className="modal-footer__right">
            <button className="btn-primary" onClick={closeCardModal}>
              Chiudi
            </button>
          </div>
        </div>
      </AccessibleDialogSurface>
    );
  }

  function renderParametriModal() {
    const vitali = cartella.parametriVitali.slice(0, 8);
    return (
      <AccessibleDialogSurface
        labelledBy="patient-parametri-dialog-title"
        describedBy="patient-parametri-dialog-description"
        onClose={closeCardModal}
        className="modal-box--edit-card"
        dismissible={!saving}
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title" id="patient-parametri-dialog-title">
              Parametri Vitali
            </h3>
            <p className="modal-subtitle" id="patient-parametri-dialog-description">
              {patientLabel}
            </p>
          </div>
          <button
            type="button"
            className="icon-btn icon-btn--sm"
            onClick={closeCardModal}
            aria-label="Chiudi"
            data-dialog-initial-focus
            disabled={saving}
          >
            <IcoX />
          </button>
        </div>
        <div className="modal-body">
          <div className="ec-modal-list">
            {vitali.length === 0 && <p className="cr-empty">Nessun parametro rilevato.</p>}
            {vitali.map((v) => (
              <div key={v.id} className={`ec-modal-item`}>
                <div className="ec-modal-item__main">
                  <span className="ec-modal-item__title">{v.etichetta}</span>
                  <span className="ec-modal-item__sub">
                    {v.valore} {v.unita}
                  </span>
                  <span
                    className={`badge ${STATO_VITALE_CLASS[v.stato]?.replace('vital-card--', 'badge--') ?? 'badge--gray'}`}
                  >
                    {v.stato}
                  </span>
                  <span className="ec-modal-item__sub">{fmtDate(v.rilevato)}</span>
                </div>
              </div>
            ))}
          </div>
          {modalVitaleShow ? (
            <div className="ec-modal-add-form">
              <div className="op-form-grid">
                <div className="form-field">
                  <label className="form-label">Parametro *</label>
                  <input
                    className="form-input"
                    placeholder="es. Pressione sistolica"
                    value={vitaleForm.etichetta ?? ''}
                    onChange={(e) => setVitaleForm((p) => ({ ...p, etichetta: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Valore *</label>
                  <input
                    className="form-input"
                    value={vitaleForm.valore ?? ''}
                    onChange={(e) => setVitaleForm((p) => ({ ...p, valore: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Unità</label>
                  <input
                    className="form-input"
                    placeholder="mmHg, bpm…"
                    value={vitaleForm.unita ?? ''}
                    onChange={(e) => setVitaleForm((p) => ({ ...p, unita: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Stato</label>
                  <select
                    className="form-select"
                    value={vitaleForm.stato ?? 'normale'}
                    onChange={(e) =>
                      setVitaleForm((p) => ({
                        ...p,
                        stato: e.target.value as VitaleItem['stato'],
                      }))
                    }
                  >
                    <option value="normale">Normale</option>
                    <option value="attenzione">Attenzione</option>
                    <option value="critico">Critico</option>
                  </select>
                </div>
              </div>
              <div className="ec-modal-add-form__actions">
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => {
                    setModalVitaleShow(false);
                    setVitaleForm({});
                  }}
                  disabled={saving}
                >
                  Annulla
                </button>
                <button
                  className="btn-success btn-sm"
                  onClick={addVitaleFromModal}
                  disabled={saving}
                >
                  <IcoCheck /> {saving ? 'Salvataggio…' : 'Salva'}
                </button>
              </div>
            </div>
          ) : (
            <button className="btn-secondary btn-sm" onClick={() => setModalVitaleShow(true)}>
              <IcoPlus /> Aggiungi rilevazione
            </button>
          )}
        </div>
        <div className="modal-footer">
          <div className="modal-footer__left">
            <button
              className="btn-secondary"
              onClick={() => {
                setCardModal(null);
                switchGroup('clinica');
                switchTab('parametri');
              }}
            >
              Apri sezione completa
            </button>
          </div>
          <div className="modal-footer__right">
            <button className="btn-primary" onClick={closeCardModal} disabled={saving}>
              Chiudi
            </button>
          </div>
        </div>
      </AccessibleDialogSurface>
    );
  }

  function renderConsegneModal() {
    return (
      <AccessibleDialogSurface
        labelledBy="patient-consegne-dialog-title"
        describedBy="patient-consegne-dialog-description"
        onClose={closeCardModal}
        className="modal-box--edit-card"
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title" id="patient-consegne-dialog-title">
              Consegne Paziente
            </h3>
            <p className="modal-subtitle" id="patient-consegne-dialog-description">
              {patientLabel}
            </p>
          </div>
          <button
            type="button"
            className="icon-btn icon-btn--sm"
            onClick={closeCardModal}
            aria-label="Chiudi"
            data-dialog-initial-focus
          >
            <IcoX />
          </button>
        </div>
        <div className="modal-body">
          <div className="ec-modal-list">
            {mieConsegne.length === 0 && <p className="cr-empty">Nessuna consegna.</p>}
            {mieConsegne.slice(0, 8).map((c) => (
              <div key={c.id} className="ec-modal-item">
                <div className="ec-modal-item__main">
                  <span
                    className={`consegna-priorita-badge consegna-priorita-badge--${c.priorita}`}
                  >
                    {c.priorita}
                  </span>
                  <span className="ec-modal-item__title">{c.note}</span>
                  <ConsegnaTimestamp createdAt={c.createdAt} />
                  <span className={`stato-pill stato-pill--consegna-${c.stato}`}>
                    {c.stato.replace('_', ' ')}
                  </span>
                </div>
                {c.stato !== 'completata' && (
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() =>
                      onUpdateConsegnaStato(c.id, c.stato === 'aperta' ? 'in_corso' : 'completata')
                    }
                  >
                    {c.stato === 'aperta' ? 'Prendi' : 'Chiudi'}
                  </button>
                )}
              </div>
            ))}
          </div>
          {modalConsegnaShow ? (
            <ConsegnaQuickAdd patient={paziente} operatori={operatori} onAdd={onAddConsegna} draftStore={consegnaDraftStore} onClose={() => setModalConsegnaShow(false)} />
          ) : (
            <button className="btn-secondary btn-sm" onClick={() => setModalConsegnaShow(true)}>
              <IcoPlus /> Aggiungi consegna
            </button>
          )}
        </div>
        <div className="modal-footer">
          <div className="modal-footer__left">
            <button
              className="btn-secondary"
              onClick={() => {
                setCardModal(null);
                switchGroup('panoramica');
                switchTab('consegne');
              }}
            >
              Apri sezione completa
            </button>
          </div>
          <div className="modal-footer__right">
            <button className="btn-primary" onClick={closeCardModal}>
              Chiudi
            </button>
          </div>
        </div>
      </AccessibleDialogSurface>
    );
  }

  function renderAllergieModal() {
    return (
      <AccessibleDialogSurface
        labelledBy="patient-allergie-dialog-title"
        describedBy="patient-allergie-dialog-description"
        onClose={closeCardModal}
        className="modal-box--edit-card"
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title" id="patient-allergie-dialog-title">
              Allergie e Intolleranze
            </h3>
            <p className="modal-subtitle" id="patient-allergie-dialog-description">
              {patientLabel}
            </p>
          </div>
          <button
            type="button"
            className="icon-btn icon-btn--sm"
            onClick={closeCardModal}
            aria-label="Chiudi"
            data-dialog-initial-focus
          >
            <IcoX />
          </button>
        </div>
        <div className="modal-body">
          <AllergiesEditor
            mode="patient-chart"
            value={cartella.allergie ?? []}
            onChange={(list) => upd({ allergie: list })}
            status={cartella.allergieStatus}
            onStatusChange={(s) => upd({ allergieStatus: s })}
            operatoreNome={operatoreNome}
          />
        </div>
        <div className="modal-footer">
          <div className="modal-footer__right">
            <button className="btn-primary" onClick={closeCardModal}>
              Chiudi
            </button>
          </div>
        </div>
      </AccessibleDialogSurface>
    );
  }

  function renderCameraModal() {
    const form = cameraEditing ? cameraModalForm : cartella;
    const selectedWard = cameraModalForm.repartoRicovero ?? '';
    const roomChoices = assignableRooms(camere, paziente.id, selectedWard);
    const selectedRoom = camere.find(
      (candidate) => candidate.numero === cameraModalForm.cameraNumero,
    );
    const bedChoices = assignableBeds(selectedRoom, paziente.id);
    const validSelection =
      Boolean(cameraModalForm.cameraNumero && cameraModalBedId) &&
      isValidBedSelection(
        camere,
        paziente.id,
        cameraModalForm.cameraNumero,
        cameraModalBedId || undefined,
      );
    const displayedRoom = placementValues.room;
    const displayedBed = placementValues.bed;
    const displayedWard = currentPlacement?.room.reparto ?? cartella.repartoRicovero;
    return (
      <AccessibleDialogSurface
        labelledBy="patient-camera-dialog-title"
        describedBy="patient-camera-dialog-description"
        onClose={closeCardModal}
        className="modal-box--edit-card"
        dismissible={!saving}
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title" id="patient-camera-dialog-title">
              Camera e Assegnazione
            </h3>
            <p className="modal-subtitle" id="patient-camera-dialog-description">
              {patientLabel}
            </p>
          </div>
          <button
            type="button"
            className="icon-btn icon-btn--sm"
            onClick={closeCardModal}
            aria-label="Chiudi"
            data-dialog-initial-focus
            disabled={saving}
          >
            <IcoX />
          </button>
        </div>
        <div className="modal-body">
          {!cameraEditing ? (
            <div className="ec-modal-list">
              <div className="ec-modal-item">
                <div className="ec-modal-item__main">
                  <span className="ec-modal-item__title">Camera</span>
                  <span className="ec-modal-item__sub">{roomLabel}</span>
                </div>
              </div>
              <div className="ec-modal-item">
                <div className="ec-modal-item__main">
                  <span className="ec-modal-item__title">Letto</span>
                  <span className="ec-modal-item__sub">{bedLabel}</span>
                </div>
              </div>
              <div className="ec-modal-item">
                <div className="ec-modal-item__main">
                  <span className="ec-modal-item__title">Reparto</span>
                  <span className="ec-modal-item__sub">{displayedWard ?? '—'}</span>
                </div>
              </div>
              <div className="ec-modal-item">
                <div className="ec-modal-item__main">
                  <span className="ec-modal-item__title">Stato ricovero</span>
                  <span className="ec-modal-item__sub">
                    {cartella.statoRicovero.replace('_', ' ')}
                  </span>
                </div>
              </div>
              {canAssignRooms && (
                <button
                  className="btn-secondary btn-sm"
                  style={{ marginTop: 4 }}
                  onClick={() => {
                    setCameraModalForm({
                      cameraNumero: displayedRoom,
                      lettoNumero: displayedBed,
                      repartoRicovero: displayedWard,
                      statoRicovero: cartella.statoRicovero,
                    });
                    setCameraModalBedId(currentPlacement?.bed.id ?? '');
                    setCameraEditing(true);
                  }}
                >
                  <IcoEdit /> Modifica assegnazione
                </button>
              )}
            </div>
          ) : (
            <div className="op-form-grid">
              <RoomDataNotice />
              <div className="form-field">
                <label className="form-label" htmlFor="patient-room-ward">
                  Reparto
                </label>
                <select
                  id="patient-room-ward"
                  className="form-select"
                  disabled={!roomDataReady}
                  value={selectedWard}
                  onChange={(e) => {
                    setCameraModalForm((p) => ({
                      ...p,
                      repartoRicovero: e.target.value,
                      cameraNumero: undefined,
                      lettoNumero: undefined,
                    }));
                    setCameraModalBedId('');
                  }}
                  autoFocus
                >
                  <option value="">— Seleziona reparto —</option>
                  {assignableWards(camere, paziente.id).map((reparto) => (
                    <option key={reparto} value={reparto}>
                      {reparto}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="patient-room-number">
                  Camera
                </label>
                <select
                  id="patient-room-number"
                  className="form-select"
                  disabled={!roomDataReady || !selectedWard}
                  value={form.cameraNumero ?? ''}
                  aria-describedby="patient-room-number-help"
                  onChange={(e) => {
                    const cam = camere.find((candidate) => candidate.numero === e.target.value);
                    setCameraModalForm((previous) => ({
                      ...previous,
                      cameraNumero: e.target.value || undefined,
                      repartoRicovero: cam?.reparto ?? previous.repartoRicovero,
                      lettoNumero: undefined,
                    }));
                    setCameraModalBedId('');
                  }}
                >
                  <option value="">— Seleziona camera —</option>
                  {roomChoices.map((c) => (
                    <option key={c.id} value={c.numero}>
                      Camera {c.numero}
                    </option>
                  ))}
                </select>
                <small id="patient-room-number-help" className="form-hint">
                  Scegli prima il reparto; vengono mostrate solo camere con letti disponibili.
                </small>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="patient-room-bed">
                  Letto
                </label>
                <select
                  id="patient-room-bed"
                  className="form-select"
                  disabled={!roomDataReady || !selectedRoom}
                  value={cameraModalBedId}
                  aria-describedby="patient-room-bed-help"
                  onChange={(e) => {
                    const bed = bedChoices.find((candidate) => candidate.id === e.target.value);
                    setCameraModalBedId(e.target.value);
                    setCameraModalForm((previous) => ({
                      ...previous,
                      lettoNumero: bed ? bedDisplayLabel(bed) : undefined,
                    }));
                  }}
                >
                  <option value="">— Seleziona letto —</option>
                  {bedChoices.map((bed) => (
                    <option key={bed.id} value={bed.id}>
                      Letto {bedDisplayLabel(bed)}
                      {bed.pazienteId === paziente.id ? ' — assegnazione attuale' : ''}
                    </option>
                  ))}
                </select>
                <small id="patient-room-bed-help" className="form-hint">
                  Sono disponibili solo letti liberi o già assegnati a questo paziente.
                </small>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="patient-room-status">
                  Stato ricovero
                </label>
                <select
                  id="patient-room-status"
                  className="form-select"
                  value={cameraModalForm.statoRicovero ?? 'ambulatoriale'}
                  onChange={(e) =>
                    setCameraModalForm((p) => ({
                      ...p,
                      statoRicovero: e.target.value as CartellaPaziente['statoRicovero'],
                    }))
                  }
                >
                  <option value="ricoverato">Ricoverato</option>
                  <option value="ambulatoriale">Ambulatoriale</option>
                  <option value="day_hospital">Day Hospital</option>
                  <option value="dimesso">Dimesso</option>
                </select>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <div className="modal-footer__left" />
          <div className="modal-footer__right">
            {cameraEditing ? (
              <>
                <button
                  className="btn-secondary"
                  onClick={() => setCameraEditing(false)}
                  disabled={saving}
                >
                  Annulla
                </button>
                <button
                  className="btn-success"
                  onClick={saveCameraFromModal}
                  disabled={saving || !roomDataReady || !validSelection}
                >
                  <IcoCheck /> {saving ? 'Salvataggio…' : 'Salva'}
                </button>
              </>
            ) : (
              <button className="btn-primary" onClick={closeCardModal}>
                Chiudi
              </button>
            )}
          </div>
        </div>
      </AccessibleDialogSurface>
    );
  }

  // ── Tab rendering ──────────────────────────────────────────────────────────

  function renderRiepilogo() {
    // "Ultimi parametri" = i più recenti per data di rilevazione (l'array è in ordine di inserimento)
    const lastVitali = [...cartella.parametriVitali]
      .sort((a, b) => (b.rilevato ?? '').localeCompare(a.rilevato ?? ''))
      .slice(0, 4);
    const diagnosiMostrate = diagnosiAttive.slice(0, 3);
    const farmaciMostrati = farmaciAttivi.slice(0, 4);
    const consegneAperte = mieConsegne.filter((c) => c.stato !== 'completata');

    return (
      <div className="cr-tab-content cr-tab-content--overview">
        {/* Alert allergie/rischi spostati nella banda persistente sotto l'header (sempre visibili) */}

        <header className="cr-overview-header">
          <div>
            <span className="cr-overview-header__eyebrow">Panoramica paziente</span>
            <h2>Quadro operativo</h2>
          </div>
          <p>Informazioni cliniche e assistenziali essenziali, organizzate per area.</p>
        </header>

        <section className="cr-overview-section" aria-labelledby="overview-clinical-title">
          <header className="cr-overview-section__header">
            <div>
              <h3 id="overview-clinical-title">Stato clinico</h3>
              <p>Diagnosi, terapia e rilevazioni più recenti.</p>
            </div>
          </header>
          <div className="cr-riepilogo-grid">
            {/* Diagnosi attive */}
            <article className="cr-riepilogo-card cr-riepilogo-card--diagnosi">
              <h4 className="cr-riepilogo-card__title">
                <IcoCartelle /> Diagnosi attive
                <span className="cr-overview-count">{diagnosiAttive.length}</span>
              </h4>
              {diagnosiMostrate.length === 0 ? (
                <p className="cr-empty">Nessuna diagnosi attiva.</p>
              ) : (
                <ul className="cr-compact-list">
                  {diagnosiMostrate.map((d) => (
                    <li key={d.id} className="cr-compact-item">
                      <span className="cr-compact-item__main">{d.descrizione}</span>
                      {d.codiceICD && <span className="cr-mono cr-mono--sm">{d.codiceICD}</span>}
                      <span className={`badge ${STATO_DIAG_CLASS[d.stato]}`}>{d.tipo}</span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="cr-overview-action"
                onClick={() => setCardModal('diagnosi')}
              >
                Apri diagnosi <span aria-hidden="true">→</span>
              </button>
            </article>

            {/* Farmaci attivi */}
            <article className="cr-riepilogo-card cr-riepilogo-card--farmaci">
              <h4 className="cr-riepilogo-card__title">
                <IcoPill /> Farmaci attivi
                <span className="cr-overview-count">{farmaciAttivi.length}</span>
              </h4>
              {farmaciMostrati.length === 0 ? (
                <p className="cr-empty">Nessun farmaco attivo.</p>
              ) : (
                <ul className="cr-compact-list">
                  {farmaciMostrati.map((f) => (
                    <li key={f.id} className="cr-compact-item cr-compact-item--farmaco">
                      <span className="cr-compact-item__main">{f.nome}</span>
                      <span className="cr-compact-item__dose">{f.dose}</span>
                      <span className="cr-compact-item__sub">{f.frequenza}</span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="cr-overview-action"
                onClick={() => setCardModal('farmaci')}
              >
                Gestisci terapia <span aria-hidden="true">→</span>
              </button>
            </article>

            {/* Ultimi parametri */}
            <article className="cr-riepilogo-card cr-riepilogo-card--parametri">
              <h4 className="cr-riepilogo-card__title">
                <IcoActivity /> Parametri vitali
                <span className="cr-overview-count">
                  {lastVitali.length > 0 ? `${lastVitali.length} recenti` : 'Da rilevare'}
                </span>
              </h4>
              {lastVitali.length === 0 ? (
                <p className="cr-empty">Nessun parametro rilevato.</p>
              ) : (
                <div className="vitals-grid vitals-grid--mini">
                  {lastVitali.map((v) => (
                    <div
                      key={v.id}
                      className={`vital-card vital-card--mini ${STATO_VITALE_CLASS[v.stato]}`}
                    >
                      <span className="vital-label">{v.etichetta}</span>
                      <span className="vital-value vital-value--mini">
                        {v.valore} <span className="vital-unit">{v.unita}</span>
                      </span>
                      <span className="vital-date">{fmtDate(v.rilevato)}</span>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="cr-overview-action"
                onClick={() => setCardModal('parametri')}
              >
                Rileva parametri <span aria-hidden="true">→</span>
              </button>
            </article>
          </div>
        </section>

        <section className="cr-overview-section" aria-labelledby="overview-care-title">
          <header className="cr-overview-section__header">
            <div>
              <h3 id="overview-care-title">Operatività e degenza</h3>
              <p>Attività aperte, sicurezza e collocazione del paziente.</p>
            </div>
          </header>
          <div className="cr-riepilogo-grid">
            {/* Consegne */}
            <article
              className={`cr-riepilogo-card cr-riepilogo-card--consegne${consegneAperte.length > 0 ? ' cr-riepilogo-card--attention' : ''}`}
            >
              <h4 className="cr-riepilogo-card__title">
                <IcoConsegne /> Consegne da gestire
                <span className="cr-overview-count">{consegneAperte.length}</span>
              </h4>
              {consegneAperte.length === 0 ? (
                <p className="cr-empty">Nessuna consegna aperta.</p>
              ) : (
                <ul className="cr-overview-handoffs">
                  {consegneAperte.slice(0, 3).map((c) => (
                    <li key={c.id} className="cr-overview-handoff">
                      <div className="consegna-card__top">
                        <span
                          className={`consegna-priorita-badge consegna-priorita-badge--${c.priorita}`}
                        >
                          {c.priorita}
                        </span>
                        <span className="consegna-tipo">{c.tipo}</span>
                      </div>
                      <ConsegnaTimestamp createdAt={c.createdAt} />
                      <p className="cr-overview-handoff__note">{c.note}</p>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="cr-overview-action"
                onClick={() => setCardModal('consegne')}
              >
                Gestisci consegne <span aria-hidden="true">→</span>
              </button>
            </article>

            {/* Allergie */}
            <article className="cr-riepilogo-card cr-riepilogo-card--allergie">
              <h4 className="cr-riepilogo-card__title">
                <IcoWarning /> Stato allergie
                <span className="cr-overview-count" data-testid="allergy-summary-state">
                  {allergySummary.badge === 'count' ? allergySummary.count : allergySummary.label}
                </span>
              </h4>
              {allergySummary.badge !== 'count' ? (
                <p className="cr-empty">
                  <span className={`status-badge status-badge--${allergySummary.badge}`}>
                    {allergySummary.label}
                  </span>
                </p>
              ) : (
                <ul className="cr-compact-list">
                  {cartella.allergie.slice(0, 3).map((a) => (
                    <li key={a.id} className="cr-compact-item">
                      <span className="cr-compact-item__main">{a.allergene}</span>
                      {a.reazione && <span className="cr-compact-item__sub">{a.reazione}</span>}
                      <span
                        className={`badge ${a.gravita === 'grave' ? 'badge--red' : a.gravita === 'moderata' ? 'badge--amber' : 'badge--gray'}`}
                      >
                        {a.gravita}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="cr-overview-action"
                onClick={() => setCardModal('allergie')}
              >
                Gestisci allergie <span aria-hidden="true">→</span>
              </button>
            </article>

            {/* Camera */}
            <article className="cr-riepilogo-card cr-riepilogo-card--degenza">
              <h4 className="cr-riepilogo-card__title">
                <IcoBed /> Degenza
              </h4>
              <dl className="cr-overview-placement">
                <div>
                  <dt>Camera</dt>
                  <dd>{roomLabel}</dd>
                </div>
                <div>
                  <dt>Letto</dt>
                  <dd>{bedLabel}</dd>
                </div>
                <div>
                  <dt>Stato</dt>
                  <dd>{cartella.statoRicovero.replace('_', ' ')}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="cr-overview-action"
                onClick={() => setCardModal('camera')}
              >
                Modifica assegnazione <span aria-hidden="true">→</span>
              </button>
            </article>
          </div>
        </section>
      </div>
    );
  }

  function openProfileEditor(field?: DemographicField) {
    setProfiloForm({
      indirizzo: cartella.indirizzo?.trim() || paziente.address || '',
      codiceFiscale: paziente.codiceFiscale ?? cartella.codiceFiscale,
      contattoEmergenzaNome: cartella.contattoEmergenzaNome,
      contattoEmergenzaTel: cartella.contattoEmergenzaTel,
      contattoEmergenzaRel: cartella.contattoEmergenzaRel,
      medicoCurante: cartella.medicoCurante,
      operatoreId: cartella.operatoreId,
      cameraNumero: cartella.cameraNumero,
      lettoNumero: cartella.lettoNumero,
      repartoRicovero: cartella.repartoRicovero,
      statoRicovero: cartella.statoRicovero,
      dataRicovero: cartella.dataRicovero,
      noteGenerali: cartella.noteGenerali,
      email: paziente.email ?? '',
      phone: paziente.phone ?? '',
      dateOfBirth: birthDateValue(paziente.dateOfBirth) ?? '',
    });
    setProfiloPhoneError(null);
    setProfiloSaveError(null);
    setEditProfilo(true);
    setProfiloFieldErrors({});
    if (field) {
      setActiveGroup(patientTabGroup(field === 'phone' ? 'contatti' : 'profilo'));
      setTab(field === 'phone' ? 'contatti' : 'profilo');
      setProfileFocus(field);
    }
  }

  function renderProfilo() {
    return (
      <div className="cr-tab-content">
        <ClinicalTableSection
          title={tab === 'contatti' ? 'Contatti' : 'Anagrafica'}
          actions={
            editProfilo ? undefined : (
              // Salva/Annulla in modifica sono gia' resi dal footer di InlineForm sotto — un
              // secondo paio qui sopra duplicherebbe l'azione (Ciclo 16, backlog Ciclo 12).
              <button
                className="btn-sm"
                onClick={() => {
                  openProfileEditor();
                }}
              >
                Modifica
              </button>
            )
          }
        >
          <div className="cts__body--padded">
            {editProfilo ? (
              <InlineForm
                onSave={saveProfiloHandler}
                onCancel={() => setEditProfilo(false)}
                saving={saving || profiloSaving}
              >
                {profiloSaveError && (
                  <p className="form-error" role="alert">
                    {profiloSaveError}
                  </p>
                )}
                <div className="op-form-grid">
                  <div className="form-field">
                    <label className="form-label">Email</label>
                    <input
                      className="form-input"
                      type="email"
                      value={profiloForm.email ?? ''}
                      onChange={(e) => setProfiloForm((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label" htmlFor="patient-profile-phone">
                      Telefono (necessario per completare la scheda)
                    </label>
                    <input
                      ref={profiloPhoneRef}
                      id="patient-profile-phone"
                      className="form-input"
                      type="tel"
                      autoComplete="tel"
                      maxLength={PATIENT_PHONE_MAX_LENGTH}
                      aria-invalid={!!profiloPhoneError}
                      aria-describedby={
                        profiloPhoneError ? 'patient-profile-phone-error' : undefined
                      }
                      value={profiloForm.phone ?? ''}
                      onChange={(e) => {
                        setProfiloForm((p) => ({ ...p, phone: e.target.value }));
                        if (profiloPhoneError) {
                          const validated = validatePatientPhone(e.target.value);
                          setProfiloPhoneError(validated.ok ? null : validated.error);
                        }
                      }}
                    />
                    {profiloPhoneError && (
                      <span id="patient-profile-phone-error" className="form-error" role="alert">
                        {profiloPhoneError}
                      </span>
                    )}
                  </div>
                  <div className="form-field">
                    <label className="form-label">Indirizzo</label>
                    <input
                      className="form-input"
                      value={profiloForm.indirizzo ?? ''}
                      onChange={(e) => setProfiloForm((p) => ({ ...p, indirizzo: e.target.value }))}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label" htmlFor="patient-profile-codiceFiscale">
                      Codice Fiscale
                    </label>
                    <input
                      id="patient-profile-codiceFiscale"
                      aria-invalid={!!profiloFieldErrors.codiceFiscale}
                      aria-describedby={
                        profiloFieldErrors.codiceFiscale ? 'patient-profile-cf-error' : undefined
                      }
                      className="form-input"
                      value={profiloForm.codiceFiscale ?? ''}
                      onChange={(e) =>
                        setProfiloForm((p) => ({ ...p, codiceFiscale: e.target.value }))
                      }
                    />
                    {profiloFieldErrors.codiceFiscale && (
                      <span id="patient-profile-cf-error" className="form-error" role="alert">
                        {profiloFieldErrors.codiceFiscale}
                      </span>
                    )}
                  </div>
                  <div className="form-field">
                    <label className="form-label" htmlFor="patient-profile-dateOfBirth">
                      Data di nascita
                    </label>
                    <input
                      id="patient-profile-dateOfBirth"
                      className="form-input"
                      type="date"
                      value={profiloForm.dateOfBirth ?? ''}
                      aria-invalid={!!profiloFieldErrors.dateOfBirth}
                      aria-describedby={
                        profiloFieldErrors.dateOfBirth ? 'patient-profile-birth-error' : undefined
                      }
                      onChange={(event) =>
                        setProfiloForm((form) => ({ ...form, dateOfBirth: event.target.value }))
                      }
                    />
                    {profiloFieldErrors.dateOfBirth && (
                      <span id="patient-profile-birth-error" className="form-error" role="alert">
                        {profiloFieldErrors.dateOfBirth}
                      </span>
                    )}
                  </div>
                </div>
                <div className="form-field" style={{ marginTop: 8 }}>
                  <label className="form-label">Note generali</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={profiloForm.noteGenerali ?? ''}
                    onChange={(e) =>
                      setProfiloForm((p) => ({ ...p, noteGenerali: e.target.value }))
                    }
                  />
                </div>
              </InlineForm>
            ) : (
              <>
                <div className="cr-profilo-grid" style={{ marginTop: 12 }}>
                  {tab === 'profilo' && (
                    <div className="cr-profilo-group">
                      <div className="cr-profilo-group__title">Anagrafica</div>
                      <div className="cr-profilo-row">
                        <span>Nome</span>
                        <strong>
                          {paziente.firstName} {paziente.lastName}
                        </strong>
                      </div>
                      <div className="cr-profilo-row">
                        <span>Data nascita</span>
                        <strong>{birthSummary(paziente.dateOfBirth)}</strong>
                      </div>
                      <div className="cr-profilo-row">
                        <span>Sesso</span>
                        <strong>{paziente.sex ?? '—'}</strong>
                      </div>
                      <div className="cr-profilo-row">
                        <span>Codice Fiscale</span>
                        <strong className="cr-mono">
                          {paziente.codiceFiscale ?? cartella.codiceFiscale ?? '—'}
                        </strong>
                      </div>
                    </div>
                  )}
                  {tab === 'contatti' && (
                    <div className="cr-profilo-group">
                      <div className="cr-profilo-group__title">Contatti</div>
                      <div className="cr-profilo-row">
                        <span>Email</span>
                        <strong>{paziente.email?.trim() || 'Non indicata'}</strong>
                      </div>
                      <div className="cr-profilo-row">
                        <span>Telefono</span>
                        <strong>{paziente.phone?.trim() || 'Da completare · obbligatorio'}</strong>
                      </div>
                      <div className="cr-profilo-row">
                        <span>Indirizzo</span>
                        <strong>
                          {cartella.indirizzo?.trim() || paziente.address?.trim() || 'Non indicato'}
                        </strong>
                      </div>
                    </div>
                  )}
                  {cartella.noteGenerali && (
                    <div className="cr-profilo-group cr-profilo-group--full">
                      <div className="cr-profilo-group__title">Note generali</div>
                      <p className="cr-note-text">{cartella.noteGenerali}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ClinicalTableSection>
      </div>
    );
  }

  function renderDiagnosi() {
    return (
      <div className="cr-tab-content">
        <DiagnosisEditor
          mode="patient-chart"
          value={cartella.diagnosi ?? []}
          onChange={(list) => upd({ diagnosi: list })}
          operatoreNome={operatoreNome}
        />

        <ClinicalTableSection
          title="Indicatori di Rischio"
          count={cartella.indicatoriRischio.length}
          countLabel="indicatori"
          actions={
            <button
              className="btn-sm"
              onClick={() => {
                setRiskForm({});
                setShowAddRisk(true);
              }}
            >
              + Aggiungi
            </button>
          }
        >
          <div className="cts__body--padded">
            {showAddRisk && (
              <InlineForm
                onSave={addRischio}
                onCancel={() => {
                  setShowAddRisk(false);
                  setRiskForm({});
                }}
                saving={saving}
              >
                <div className="op-form-grid">
                  <div className="form-field">
                    <label className="form-label">Tipo</label>
                    <select
                      className="form-select"
                      value={riskForm.tipo ?? 'altro'}
                      onChange={(e) =>
                        setRiskForm((p) => ({
                          ...p,
                          tipo: e.target.value as IndicatoreRischio['tipo'],
                        }))
                      }
                    >
                      <option value="caduta">Caduta</option>
                      <option value="lesioni_pressione">Lesioni pressione</option>
                      <option value="nutrizione">Nutrizione</option>
                      <option value="sepsi">Sepsi</option>
                      <option value="trombosi">Trombosi</option>
                      <option value="dolore">Dolore</option>
                      <option value="altro">Altro</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Livello</label>
                    <select
                      className="form-select"
                      value={riskForm.livello ?? 'basso'}
                      onChange={(e) =>
                        setRiskForm((p) => ({
                          ...p,
                          livello: e.target.value as IndicatoreRischio['livello'],
                        }))
                      }
                    >
                      <option value="basso">Basso</option>
                      <option value="medio">Medio</option>
                      <option value="alto">Alto</option>
                      <option value="critico">Critico</option>
                    </select>
                  </div>
                </div>
                <div className="form-field" style={{ marginTop: 8 }}>
                  <label className="form-label">Descrizione *</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={riskForm.descrizione ?? ''}
                    onChange={(e) => setRiskForm((p) => ({ ...p, descrizione: e.target.value }))}
                  />
                </div>
              </InlineForm>
            )}
            <div className="cr-list">
              {cartella.indicatoriRischio.length === 0 && (
                <p className="cr-empty">Nessun indicatore di rischio.</p>
              )}
              {cartella.indicatoriRischio.map((r) =>
                editRiskId === r.id ? (
                  <InlineForm
                    key={r.id}
                    onSave={() => updateRischio(r.id)}
                    onCancel={() => {
                      setEditRiskId(null);
                      setRiskForm({});
                    }}
                    saving={saving}
                  >
                    <div className="op-form-grid">
                      <div className="form-field">
                        <label className="form-label">Tipo</label>
                        <select
                          className="form-select"
                          value={riskForm.tipo ?? r.tipo}
                          onChange={(e) =>
                            setRiskForm((p) => ({
                              ...p,
                              tipo: e.target.value as IndicatoreRischio['tipo'],
                            }))
                          }
                        >
                          <option value="caduta">Caduta</option>
                          <option value="lesioni_pressione">Lesioni pressione</option>
                          <option value="nutrizione">Nutrizione</option>
                          <option value="sepsi">Sepsi</option>
                          <option value="trombosi">Trombosi</option>
                          <option value="dolore">Dolore</option>
                          <option value="altro">Altro</option>
                        </select>
                      </div>
                      <div className="form-field">
                        <label className="form-label">Livello</label>
                        <select
                          className="form-select"
                          value={riskForm.livello ?? r.livello}
                          onChange={(e) =>
                            setRiskForm((p) => ({
                              ...p,
                              livello: e.target.value as IndicatoreRischio['livello'],
                            }))
                          }
                        >
                          <option value="basso">Basso</option>
                          <option value="medio">Medio</option>
                          <option value="alto">Alto</option>
                          <option value="critico">Critico</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-field" style={{ marginTop: 8 }}>
                      <label className="form-label">Descrizione</label>
                      <textarea
                        className="form-input"
                        rows={2}
                        value={riskForm.descrizione ?? ''}
                        onChange={(e) =>
                          setRiskForm((p) => ({ ...p, descrizione: e.target.value }))
                        }
                      />
                    </div>
                  </InlineForm>
                ) : (
                  <ItemRow
                    key={r.id}
                    onEdit={() => {
                      setEditRiskId(r.id);
                      setRiskForm({ ...r });
                    }}
                    onDelete={() => deleteRischio(r.id)}
                  >
                    <div className="cr-risk-row">
                      <span className={`badge ${RISCHIO_CLASS[r.livello]}`}>
                        {r.livello.toUpperCase()}
                      </span>
                      <span className="cr-risk-tipo">{r.tipo.replace('_', ' ')}</span>
                      <span className="cr-risk-desc">{r.descrizione}</span>
                      <span className="cr-diag-meta">
                        {fmtDate(r.dataValutazione)} · {r.operatore}
                      </span>
                    </div>
                  </ItemRow>
                ),
              )}
            </div>
          </div>
        </ClinicalTableSection>
      </div>
    );
  }

  // renderTerapie replaced by TerapiaMedicaTab component

  function renderNote() {
    return (
      <div className="cr-tab-content">
        <ClinicalTableSection
          title="Note Cliniche"
          count={cartella.noteClinica.length}
          countLabel="note"
          actions={
            <button
              className="btn-sm"
              onClick={() => {
                setNotaForm({});
                setShowAddNota(true);
              }}
            >
              + Aggiungi
            </button>
          }
        >
          <div className="cts__body--padded">
            {showAddNota && (
              <InlineForm
                onSave={addNota}
                onCancel={() => {
                  setShowAddNota(false);
                  setNotaForm({});
                }}
                saving={saving}
              >
                <div className="op-form-grid">
                  <div className="form-field">
                    <label className="form-label">Tipo</label>
                    <select
                      className="form-select"
                      value={notaForm.tipo ?? 'clinica'}
                      onChange={(e) =>
                        setNotaForm((p) => ({ ...p, tipo: e.target.value as NotaClinica['tipo'] }))
                      }
                    >
                      <option value="clinica">Clinica</option>
                      <option value="nursing">Nursing</option>
                      <option value="dietetica">Dietetica</option>
                      <option value="psicologica">Psicologica</option>
                      <option value="fisioterapia">Fisioterapia</option>
                      <option value="altra">Altra</option>
                    </select>
                  </div>
                </div>
                <div className="form-field" style={{ marginTop: 8 }}>
                  <label className="form-label">Contenuto *</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    value={notaForm.contenuto ?? ''}
                    onChange={(e) => setNotaForm((p) => ({ ...p, contenuto: e.target.value }))}
                  />
                </div>
              </InlineForm>
            )}
            <div className="cr-list">
              {cartella.noteClinica.length === 0 && (
                <p className="cr-empty">Nessuna nota clinica.</p>
              )}
              {cartella.noteClinica.map((n) =>
                editNotaId === n.id ? (
                  <InlineForm
                    key={n.id}
                    onSave={() => updateNota(n.id)}
                    onCancel={() => {
                      setEditNotaId(null);
                      setNotaForm({});
                    }}
                    saving={saving}
                  >
                    <div className="op-form-grid">
                      <div className="form-field">
                        <label className="form-label">Tipo</label>
                        <select
                          className="form-select"
                          value={notaForm.tipo ?? n.tipo}
                          onChange={(e) =>
                            setNotaForm((p) => ({
                              ...p,
                              tipo: e.target.value as NotaClinica['tipo'],
                            }))
                          }
                        >
                          <option value="clinica">Clinica</option>
                          <option value="nursing">Nursing</option>
                          <option value="dietetica">Dietetica</option>
                          <option value="psicologica">Psicologica</option>
                          <option value="fisioterapia">Fisioterapia</option>
                          <option value="altra">Altra</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-field" style={{ marginTop: 8 }}>
                      <label className="form-label">Contenuto</label>
                      <textarea
                        className="form-input"
                        rows={4}
                        value={notaForm.contenuto ?? n.contenuto}
                        onChange={(e) => setNotaForm((p) => ({ ...p, contenuto: e.target.value }))}
                      />
                    </div>
                  </InlineForm>
                ) : (
                  <ItemRow
                    key={n.id}
                    onEdit={() => {
                      setEditNotaId(n.id);
                      setNotaForm({ ...n });
                    }}
                    onDelete={() => deleteNota(n.id)}
                  >
                    <div className="cr-nota-row">
                      <div className="cr-nota-header">
                        <span className="badge badge--gray">{n.tipo}</span>
                        <span className="cr-diag-meta">
                          {fmtDateTime(n.createdAt)} · {n.operatore}
                        </span>
                      </div>
                      <p className="cr-nota-text">{n.contenuto}</p>
                    </div>
                  </ItemRow>
                ),
              )}
            </div>
          </div>
        </ClinicalTableSection>

        <ClinicalTableSection
          title="Storico Visite"
          count={cartella.visite.length}
          countLabel="visite"
          actions={
            <button
              className="btn-sm"
              onClick={() => {
                setVisitaForm({});
                setShowAddVisita(true);
              }}
            >
              + Aggiungi
            </button>
          }
        >
          <div className="cts__body--padded">
            {showAddVisita && (
              <InlineForm
                onSave={addVisita}
                onCancel={() => {
                  setShowAddVisita(false);
                  setVisitaForm({});
                }}
                saving={saving}
              >
                <div className="op-form-grid">
                  <div className="form-field">
                    <label className="form-label">Tipo visita</label>
                    <input
                      className="form-input"
                      value={visitaForm.tipo ?? ''}
                      placeholder="Visita cardiologica…"
                      onChange={(e) => setVisitaForm((p) => ({ ...p, tipo: e.target.value }))}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Data</label>
                    <input
                      className="form-input"
                      type="date"
                      value={visitaForm.data ?? todayStr()}
                      onChange={(e) => setVisitaForm((p) => ({ ...p, data: e.target.value }))}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Ora</label>
                    <input
                      className="form-input"
                      type="time"
                      value={visitaForm.ora ?? ''}
                      onChange={(e) => setVisitaForm((p) => ({ ...p, ora: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="form-field" style={{ marginTop: 8 }}>
                  <label className="form-label">Descrizione *</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={visitaForm.descrizione ?? ''}
                    onChange={(e) => setVisitaForm((p) => ({ ...p, descrizione: e.target.value }))}
                  />
                </div>
                <div className="form-field" style={{ marginTop: 8 }}>
                  <label className="form-label">Esito</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={visitaForm.esito ?? ''}
                    onChange={(e) => setVisitaForm((p) => ({ ...p, esito: e.target.value }))}
                  />
                </div>
                <div className="form-field" style={{ marginTop: 8 }}>
                  <label className="form-label">Follow-up</label>
                  <input
                    className="form-input"
                    value={visitaForm.followUp ?? ''}
                    onChange={(e) => setVisitaForm((p) => ({ ...p, followUp: e.target.value }))}
                  />
                </div>
              </InlineForm>
            )}
            <div className="cr-list">
              {cartella.visite.length === 0 && (
                <p className="cr-empty">Nessuna visita registrata.</p>
              )}
              {cartella.visite.map((v) =>
                editVisitaId === v.id ? (
                  <InlineForm
                    key={v.id}
                    onSave={() => updateVisita(v.id)}
                    onCancel={() => {
                      setEditVisitaId(null);
                      setVisitaForm({});
                    }}
                    saving={saving}
                  >
                    <div className="op-form-grid">
                      <div className="form-field">
                        <label className="form-label">Tipo</label>
                        <input
                          className="form-input"
                          value={visitaForm.tipo ?? v.tipo}
                          onChange={(e) => setVisitaForm((p) => ({ ...p, tipo: e.target.value }))}
                        />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Data</label>
                        <input
                          className="form-input"
                          type="date"
                          value={visitaForm.data ?? v.data}
                          onChange={(e) => setVisitaForm((p) => ({ ...p, data: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="form-field" style={{ marginTop: 8 }}>
                      <label className="form-label">Descrizione</label>
                      <textarea
                        className="form-input"
                        rows={3}
                        value={visitaForm.descrizione ?? v.descrizione}
                        onChange={(e) =>
                          setVisitaForm((p) => ({ ...p, descrizione: e.target.value }))
                        }
                      />
                    </div>
                    <div className="form-field" style={{ marginTop: 8 }}>
                      <label className="form-label">Esito</label>
                      <textarea
                        className="form-input"
                        rows={2}
                        value={visitaForm.esito ?? v.esito}
                        onChange={(e) => setVisitaForm((p) => ({ ...p, esito: e.target.value }))}
                      />
                    </div>
                  </InlineForm>
                ) : (
                  <ItemRow
                    key={v.id}
                    onEdit={() => {
                      setEditVisitaId(v.id);
                      setVisitaForm({ ...v });
                    }}
                    onDelete={() => deleteVisita(v.id)}
                  >
                    <div className="cr-visita-row">
                      <div className="cr-visita-header">
                        <span className="cr-visita-tipo">{v.tipo}</span>
                        <span className="cr-diag-meta">
                          {fmtDate(v.data)}
                          {v.ora ? ` ${v.ora}` : ''} · {v.operatore}
                        </span>
                      </div>
                      <p className="cr-nota-text">{v.descrizione}</p>
                      {v.esito && <p className="cr-visita-esito">{v.esito}</p>}
                      {v.followUp && <p className="cr-diag-note">Follow-up: {v.followUp}</p>}
                    </div>
                  </ItemRow>
                ),
              )}
            </div>
          </div>
        </ClinicalTableSection>
      </div>
    );
  }

  // renderParametri replaced by ParametriTab component

  function renderConsegne() {
    return (
      <div className="cr-tab-content">
        <ClinicalTableSection
          title="Consegne"
          count={mieConsegne.filter((c) => c.stato !== 'completata').length}
          countLabel="aperte"
          actions={
            <button className="btn-sm" onClick={() => setShowAddConsegna((v) => !v)}>
              + Aggiungi
            </button>
          }
        >
          <div className="cts__body--padded">
            {showAddConsegna && (
              <ConsegnaQuickAdd patient={paziente} operatori={operatori} onAdd={onAddConsegna} draftStore={consegnaDraftStore} onClose={() => setShowAddConsegna(false)} />
            )}
            <div className="consegne-list">
              {consegneError && (
                <div className="cr-empty" role="alert">
                  <p>{consegneError}</p>
                  <button type="button" className="btn-secondary btn-sm" onClick={onRetryConsegne}>
                    Riprova
                  </button>
                </div>
              )}
              {!consegneError && consegneLoading && mieConsegne.length === 0 ? (
                <p className="cr-empty" role="status">
                  Caricamento consegne…
                </p>
              ) : !consegneError && consegneSummary?.total === 0 ? (
                <p className="cr-empty">Nessuna consegna per questo paziente.</p>
              ) : !consegneError ? (
                <>
                  {consegneSummary && (
                    <p className="cr-empty" role="status">
                      Mostrate {mieConsegne.length} di {consegneSummary.total} consegne.
                    </p>
                  )}
                  {mieConsegne.map((c) => (
                    <div key={c.id} className={`consegna-card consegna-card--${c.priorita}`}>
                      <div className="consegna-card__top">
                        <span
                          className={`consegna-priorita-badge consegna-priorita-badge--${c.priorita}`}
                        >
                          {c.priorita}
                        </span>
                        <span className="consegna-tipo">{c.tipo}</span>
                        {c.oraScadenza && (
                          <span className="consegna-scadenza">
                            <IcoClock />
                            {c.oraScadenza}
                          </span>
                        )}
                        <span className={`stato-pill stato-pill--consegna-${c.stato}`}>
                          {c.stato.replace('_', ' ')}
                        </span>
                      </div>
                      <ConsegnaTimestamp createdAt={c.createdAt} />
                      <p className="consegna-note">{c.note}</p>
                      <div className="consegna-card__footer">
                        <span className="consegna-assegnato">→ {c.operatoreAssegnato}</span>
                        {c.stato !== 'completata' && (
                          <div className="table-actions">
                            {c.stato === 'aperta' && (
                              <button
                                className="btn-secondary btn-sm"
                                onClick={() => onUpdateConsegnaStato(c.id, 'in_corso')}
                              >
                                Prendi in carico
                              </button>
                            )}
                            <button
                              className="icon-btn icon-btn--sm icon-btn--success"
                              onClick={() => onUpdateConsegnaStato(c.id, 'completata')}
                            >
                              <IcoCheck />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {consegneHasMore && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={onLoadMoreConsegne}
                      disabled={consegneLoading}
                    >
                      {consegneLoading ? 'Caricamento…' : 'Carica altre consegne'}
                    </button>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </ClinicalTableSection>
      </div>
    );
  }

  // ── Tab badges ─────────────────────────────────────────────────────────────

  // Feature 010 (FR-014/015): each badge documented; counts match in-tab views.
  const TAB_BADGES: Partial<Record<TabId, number>> = {
    // badge = active diagnoses
    diagnosi: diagnosiAttive.length,
    // badge = active drugs (farmaciAttivi)
    'terapia-farmacologica': farmaciAttivi.length,
    // diario: badge removed (FR-015) — legacy sum does not match DiarioPazienteTab visible count
    // badge = active medications (matches MedicazioniTab in-page filter: !dataFine)
    medicazioni: (cartella.medicazioniFerite ?? []).filter((m) => !m.dataFine).length || 0,
    // badge = active contentions
    contenzioni: (cartella.contenzioni ?? []).filter((c) => c.attiva).length || 0,
    // badge = documents delivered (documentiConsegnati)
    documenti: (cartella.documentiConsegnati ?? []).length || 0,
    // badge = mie consegne non completate
    consegne: consegneSummary?.open ?? 0,
  };

  function groupBadgeSum(gId: TabGroup): number {
    const g = TAB_GROUPS.find((x) => x.id === gId);
    if (!g) return 0;
    return g.tabs.reduce((sum, t) => sum + (TAB_BADGES[t.id] ?? 0), 0);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.classList.remove('tab-panel-transition');
    void el.offsetWidth;
    el.classList.add('tab-panel-transition');
  }, [activeGroup, tab]);

  const activeGroupDefinition = TAB_GROUPS.find((group) => group.id === activeGroup);
  const hasSectionTabs = (activeGroupDefinition?.tabs.length ?? 0) > 1;
  const patientPanelLabelledBy =
    activeGroup !== 'diario' && hasSectionTabs
      ? `patient-secondary-${tab}`
      : `patient-primary-${activeGroup}`;

  return (
    <div className="patient-record-view">
      {/* Patient Compact Header */}
      <PatientCompactHeader
        paziente={paziente}
        cartella={cartella}
        onBack={onBack}
        backLabel={backLabel}
        onPrint={() => setShowPrintDialog(true)}
        onInvioPS={() => setShowInvioPS(true)}
      />

      <DemographicsStatus value={paziente} onEdit={openProfileEditor} busy={profiloSaving} />
      <PatientIntakeReview
        patientId={paziente.id}
        operatorId={operatoreId}
        operatorRole={operatoreRole}
      />

      {/* Banda allergie/rischi — sempre visibile sotto l'header, su tutti i tab */}
      {(hasAllergie || rischioAlto.length > 0) && (
        <div className="cr-alert-band">
          {hasAllergie && (
            <button
              className="cr-alert-strip cr-alert-strip--allergie"
              onClick={() => setCardModal('allergie')}
            >
              <span className="cr-alert-strip__ico">
                <IcoWarning />
              </span>
              <span>
                <strong>ALLERGIE GRAVI:</strong> {allergieGravi.map((a) => a.allergene).join(', ')}
              </span>
              <span className="cr-alert-strip__link">Gestisci →</span>
            </button>
          )}
          {rischioAlto.length > 0 && (
            <div className="cr-alert-strip cr-alert-strip--rischi">
              <span className="cr-alert-strip__ico">
                <IcoWarning />
              </span>
              <span>
                <strong>Rischi attivi:</strong>{' '}
                {rischioAlto.map((r) => `${r.tipo.replace('_', ' ')} (${r.livello})`).join(' · ')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* AC5: anomalie di terapia in testa alla cartella, prima della navigazione, cosi' si
          vedono aprendo il paziente e non solo entrando nella scheda terapia. L'ambito e'
          dichiarato perche' /therapy-slots copre le sole terapie attive di oggi. */}
      <AvvisoAnomalieFarmaci
        esito={anomalieDelPaziente(anomalieReparto, paziente.id)}
        ambito="terapie attive di oggi"
        etichettaAzione="Vai alla terapia"
        onAzione={() => {
          switchGroup('clinica');
          switchTab('terapia-farmacologica');
        }}
      />

      {/* L2 — Navigazione orizzontale principale della pagina */}
      <TopNav
        variant="level2"
        ariaLabel="Aree della cartella paziente"
        visualLabel="Aree cartella"
        idPrefix="patient-primary"
        panelId="patient-tab-panel"
        items={TAB_GROUPS.map((g) => ({
          key: g.id,
          label: g.label,
          badge: groupBadgeSum(g.id) || undefined,
        }))}
        activeKey={activeGroup}
        onChange={(id) => switchGroup(id as TabGroup)}
      />
      {/* L3 — Sotto-navigazione contestuale del gruppo attivo */}
      {(() => {
        if (activeGroup === 'diario') {
          return (
            <div
              className="filter-chips patient-diary-filters no-print"
              role="group"
              aria-label="Filtra il diario per autore"
            >
              {DIARIO_AUTHOR_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  id={`patient-diary-filter-${filter.id}`}
                  type="button"
                  className={`filter-chip${diarioFilter === filter.id ? ' active' : ''}`}
                  aria-pressed={diarioFilter === filter.id}
                  aria-controls="patient-tab-panel"
                  onClick={() => setDiarioFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          );
        }
        const grp = TAB_GROUPS.find((g) => g.id === activeGroup);
        if (!grp || grp.tabs.length <= 1) return null;
        return (
          <TopNav
            variant="level3"
            className="top-nav--section-grid"
            ariaLabel={`Sezioni di ${grp.label}`}
            idPrefix="patient-secondary"
            panelId="patient-tab-panel"
            items={grp.tabs.map((t) => ({
              key: t.id,
              label: t.label,
              badge: TAB_BADGES[t.id] || undefined,
            }))}
            activeKey={tab}
            onChange={(id) => switchTab(id as TabId)}
          />
        );
      })()}

      {/* Content layout */}
      <div className="cr-detail-layout cr-detail-layout--no-sidebar">
        {/* Content area */}
        <div
          ref={contentRef}
          id="patient-tab-panel"
          role="tabpanel"
          aria-labelledby={patientPanelLabelledBy}
          tabIndex={0}
          className="cr-detail-content tab-panel-transition"
        >
          <Suspense fallback={<ClinicalSectionLoading />}>
            {tab === 'riepilogo' && renderRiepilogo()}
            {(tab === 'profilo' || tab === 'contatti') && renderProfilo()}
            {tab === 'diagnosi' && renderDiagnosi()}
            {tab === 'terapia-farmacologica' && (
              <TherapyEditor
                mode="patient-chart"
                paziente={paziente}
                operatoreNome={operatoreNome}
                value={undefined as never}
                onChange={() => {}}
              />
            )}
            {tab === 'note' && renderNote()}
            {tab === 'parametri' && (
              <PatientVitalSignsView
                key={`${paziente.id}:${operatoreId}`}
                operatoreId={operatoreId}
                cartella={cartella}
                paziente={paziente}
                onUpdate={upd}
                operatoreNome={operatoreNome}
              />
            )}
            {tab === 'consegne' && renderConsegne()}
            {tab === 'presa-in-carico' && (
              <PresaInCaricoTab
                cartella={cartella}
                paziente={paziente}
                onUpdate={upd}
                operatoreNome={operatoreNome}
              />
            )}
            {tab === 'documenti' && (
              <DocumentiTab
                cartella={cartella}
                paziente={paziente}
                onUpdate={(updates) =>
                  onUpdateCartella(cartella.pazienteId, updates, { optimistic: false })
                }
                operatoreNome={operatoreNome}
                operatoreId={operatoreId}
                operatoreRole={operatoreRole}
                focusDocumentId={archiveFocus?.patientId === paziente.id ? archiveFocus.documentId : undefined}
                expectedAssessmentId={archiveFocus?.patientId === paziente.id ? archiveFocus.assessment.id : undefined}
                expectedAssessmentType={archiveFocus?.patientId === paziente.id ? archiveFocus.assessment.type : undefined}
                onOpenAssessment={(assessment) => { setAssessmentFocus({ patientId: paziente.id, assessment }); switchTab(assessmentPatientTab(assessment.type)); }}
              />
            )}
            {(tab === 'diagnosi' || tab === 'sezioni-narrative') && (
              <>
                {/* #278: anamnesi strutturata modificabile — stesso cast Anamnesi ⇄
                  Record<string, unknown> già usato in patientSections.ts */}
                <ClinicalTableSection title="Allergie e intolleranze">
                  <div className="cts__body--padded">
                    <AllergiesEditor
                      mode="patient-chart"
                      value={cartella.allergie ?? []}
                      status={cartella.allergieStatus}
                      onStatusChange={(status) => upd({ allergieStatus: status })}
                      operatoreNome={operatoreNome}
                      onChange={(list) => upd({ allergie: list })}
                    />
                  </div>
                </ClinicalTableSection>
                <AnamnesisEditor
                  mode="patient-chart"
                  showAllergySummary={false}
                  value={cartella.anamnesi as unknown as Record<string, unknown>}
                  onChange={(v) => upd({ anamnesi: v as unknown as Anamnesi })}
                  readOnly={false}
                  operatoreNome={operatoreNome}
                  allergie={cartella.allergie ?? []}
                />
                <NarrativeSectionsTab
                  key={
                    assistantSectionRefresh?.actionType === 'update_narrative_section'
                      ? assistantSectionRefresh.version
                      : 'narrative'
                  }
                  patientId={paziente.id}
                  operatoreId={operatoreId}
                  operatoreRole={operatoreRole}
                />
              </>
            )}
            {tab === 'diario' && (
              <DiarioPazienteTab
                key={
                  assistantSectionRefresh?.actionType === 'add_diary_note'
                    ? assistantSectionRefresh.version
                    : 'diary'
                }
                pazienteId={paziente.id}
                operatoreNome={operatoreNome}
                legacyInfermieristico={cartella.diarioInfermieristico}
                legacyMedico={cartella.diarioMedico}
                filterBy={diarioFilter}
              />
            )}
            {tab === 'medicazioni' && (
              <MedicazioniTab
                key={paziente.id}
                cartella={cartella}
                paziente={paziente}
                onUpdate={(updates) =>
                  onUpdateCartella(cartella.pazienteId, updates, { optimistic: false })
                }
                operatoreNome={operatoreNome}
                operatoreId={operatoreId}
                operatoreRole={operatoreRole}
              />
            )}
            {tab === 'contenzioni' && (
              <ContenzioniTab
                cartella={cartella}
                paziente={paziente}
                onUpdate={upd}
                operatoreNome={operatoreNome}
              />
            )}
            {tab === 'esami-consulenze' && (
              <EsamiConsulenzeTab
                cartella={cartella}
                paziente={paziente}
                onUpdate={upd}
                operatoreNome={operatoreNome}
                operatoreId={operatoreId}
                operatoreRole={operatoreRole}
              />
            )}
            {tab === 'braden' && (
              <ScalaBradenTab
                cartella={cartella}
                paziente={paziente}
                onUpdate={upd}
                operatoreNome={operatoreNome}
              />
            )}
            {tab === 'nrs' && (
              <PainAssessmentEditor
                mode="patient-chart"
                cartella={cartella}
                paziente={paziente}
                onUpdate={upd}
                operatoreNome={operatoreNome}
                value={undefined as never}
                onChange={() => {}}
              />
            )}
            {(tab === 'painad' || tab === 'postural_transfers' || tab === 'tinetti' || tab === 'mna' || tab === 'gds') && (
              <AssessmentWorkspace patient={paziente} operatorId={operatoreId} operatorRole={operatoreRole} operatorName={operatoreNome}
                type={tab === 'gds' ? 'gds15' : tab} draftStore={assessmentDraftStore} initialAssessment={assessmentFocus?.patientId === paziente.id ? assessmentFocus.assessment : undefined}
                onOpenArchive={(documentId, assessment) => { setArchiveFocus({ patientId: paziente.id, documentId, assessment }); switchTab('documenti'); }}>
                {tab === 'tinetti' && <ScalaTinettiTab cartella={cartella} paziente={paziente} />}
              </AssessmentWorkspace>
            )}
            {tab === 'dimissione' && (
              <DimissioneTab
                cartella={cartella}
                paziente={paziente}
                onUpdate={upd}
                operatoreNome={operatoreNome}
              />
            )}
          </Suspense>
        </div>
      </div>

      {cardModal === 'diagnosi' && renderDiagnosiModal()}
      {cardModal === 'farmaci' && renderFarmaciModal()}
      {cardModal === 'parametri' && renderParametriModal()}
      {cardModal === 'consegne' && renderConsegneModal()}
      {cardModal === 'allergie' && renderAllergieModal()}
      {cardModal === 'camera' && renderCameraModal()}
      {showPrintDialog && (
        <PatientRecordPrintDialog
          paziente={paziente}
          cartella={cartella}
          consegne={mieConsegne}
          onClose={() => setShowPrintDialog(false)}
        />
      )}
      {showInvioPS && (
        <Suspense fallback={<ClinicalSectionLoading />}>
          <InvioPSModal
            paziente={paziente}
            cartella={cartella}
            onClose={() => setShowInvioPS(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
