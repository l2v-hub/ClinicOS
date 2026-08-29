import { Component, lazy, Suspense, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import './App.css';
import { API_URL } from './config';
import { cachedGetJson, invalidateCachedGet, clearCachedGet } from './lib/cachedFetch';
import { fetchPatientById, fetchPatientPage } from './lib/patientPage';
import { usePatientDirectorySearch } from './lib/usePatientDirectorySearch';
import { setCurrentOperator, operatorHeaders } from './lib/operatorSession';
import { acquireApiToken } from './lib/entraAuth';
import {
  buildAppointmentRangeUrl,
  localIsoDate,
  type AppointmentRangeRequest,
} from './lib/appointmentRange';
import {
  buildNotesMailboxUrl,
  mapNoteDto,
  mergeNotesPage,
  type NotesMailboxQuery,
  type NotesPageInfo,
  type NotesPageResponse,
} from './lib/notesMailbox';
import {
  buildConsegnaFeedUrl,
  isConsegnaFeedResponse,
  mergeConsegnaPage,
  type ConsegnaFeedQuery,
} from './lib/consegneFeed';

import type {
  UtenteApp,
  Paziente,
  Operatore,
  Consegna,
  NavKey,
  Appuntamento,
  Camera,
  ScheduleOperatore,
  SlotAgenda,
  Nota,
  StatoNota,
  CartellaPaziente,
  ClinicalOverview,
  TherapySlot,
  MotivoNonErogazione,
  TherapySlotPatient,
  TherapyAdministration,
  TipoIntervento,
  ConsegnaOverview,
  ConsegnaPageInfo,
  ConsegnaSummary,
  NewConsegnaInput,
} from './types';
import { OPERATOR_COLOR_PALETTE } from './types';
import { createDefaultCartella } from './mockData';

import { Login } from './components/Login';
import type { TabId } from './components/operator/tabGroups';
import type { AssistantNav } from './components/shared/AIAssistantButton';
import { navTabId } from './components/shared/agnos/agnosNav';
import TeamsLikeSidebar from './components/shared/TeamsLikeSidebar';

import { IcoAI, IcoSearch, IcoX } from './icons';

const AdminDashboard = lazy(() =>
  import('./components/admin/AdminDashboard').then((module) => ({
    default: module.AdminDashboard,
  })),
);
const OperatorManagement = lazy(() =>
  import('./components/admin/OperatorManagement').then((module) => ({
    default: module.OperatorManagement,
  })),
);
const AdminAgenda = lazy(() =>
  import('./components/admin/AdminAgenda').then((module) => ({ default: module.AdminAgenda })),
);
const RoomsManagement = lazy(() =>
  import('./components/admin/RoomsManagement').then((module) => ({
    default: module.RoomsManagement,
  })),
);
const OperatorSchedule = lazy(() =>
  import('./components/admin/OperatorSchedule').then((module) => ({
    default: module.OperatorSchedule,
  })),
);
const OperatorDashboard = lazy(() =>
  import('./components/operator/OperatorDashboard').then((module) => ({
    default: module.OperatorDashboard,
  })),
);
const PatientList = lazy(() =>
  import('./components/operator/PatientList').then((module) => ({ default: module.PatientList })),
);
const PatientDetail = lazy(() =>
  import('./components/operator/PatientDetail').then((module) => ({
    default: module.PatientDetail,
  })),
);
const ConsegnePage = lazy(() =>
  import('./components/operator/ConsegnePage').then((module) => ({ default: module.ConsegnePage })),
);
const OperatorAgenda = lazy(() =>
  import('./components/operator/OperatorAgenda').then((module) => ({
    default: module.OperatorAgenda,
  })),
);
const NotesPage = lazy(() =>
  import('./components/shared/NotesPage').then((module) => ({ default: module.NotesPage })),
);
const MultiPatientParametri = lazy(() =>
  import('./components/operator/MultiPatientParametri').then((module) => ({
    default: module.MultiPatientParametri,
  })),
);
const AnagraficaFarmaciPage = lazy(() =>
  import('./components/operator/AnagraficaFarmaciPage').then((module) => ({
    default: module.AnagraficaFarmaciPage,
  })),
);
const AgnosPanel = lazy(() =>
  import('./components/shared/AgnosPanel').then((module) => ({ default: module.AgnosPanel })),
);

function PageLoading() {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <span className="page-loading__spinner" aria-hidden="true" />
      Caricamento modulo…
    </div>
  );
}

class LazyLoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="page-load-error" role="alert">
          <strong>Il modulo non è stato caricato.</strong>
          <span>Potrebbe essere disponibile una versione più recente dell’applicazione.</span>
          <button type="button" onClick={() => window.location.reload()}>
            Ricarica ClinicOS
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Navigation helpers ─────────────────────────────────────────────────────────

// #243: valid "Moduli" tab ids a moduleTabId coming from the intake wizard may target —
// guards against forwarding an unexpected string as an initialTab.
const MODULE_TAB_IDS: TabId[] = [
  'medicazioni',
  'contenzioni',
  'braden',
  'tinetti',
  'nrs',
  'dimissione',
];

const NAV_LABELS: Record<NavKey, string> = {
  login: 'Login',
  'admin-dashboard': 'Dashboard',
  'gestione-operatori': 'Operatori',
  'agenda-admin': 'Agenda',
  'posti-letto': 'Posti Letto',
  'orari-operatori': 'Orari',
  note: 'Note',
  'operator-dashboard': 'Dashboard',
  pazienti: 'Pazienti',
  'dettaglio-paziente': 'Scheda Paziente',
  consegne: 'Consegne',
  'agenda-operatore': 'Agenda',
  'parametri-multipaziente': 'Parametri',
  'anagrafica-farmaci': 'Anagrafica farmaci',
  'ai-assistant': 'Assistente ClinicOS',
};

const NAV_FALLBACK: Partial<Record<NavKey, NavKey>> = {
  'dettaglio-paziente': 'pazienti',
  'parametri-multipaziente': 'operator-dashboard',
  'anagrafica-farmaci': 'operator-dashboard',
  'gestione-operatori': 'admin-dashboard',
  'posti-letto': 'admin-dashboard',
  'orari-operatori': 'admin-dashboard',
  'agenda-admin': 'admin-dashboard',
  'agenda-operatore': 'operator-dashboard',
};

// ── Appuntamenti: mapping DTO backend → tipo Appuntamento della UI (SPEC-015 US4) ──
//
// Il backend espone il modello Prisma Appointment come { data, ora, durata, tipologia, note,
// stato, patientName, operatorName }. La UI usa lo stesso vocabolario tranne: tipologia libera
// (es. "fisioterapia" via Agnos) → tipoIntervento 'altro' con la tipologia riportata nelle note;
// priorita/cameraId non sono persistiti dal modello → default.

const TIPI_NOTI: readonly TipoIntervento[] = [
  'visita',
  'controllo',
  'procedura',
  'urgenza',
  'consulto',
  'follow-up',
  'altro',
];

function mapAppointmentDTO(r: Record<string, unknown>): Appuntamento {
  const tipologia = String(r.tipologia ?? '');
  const known = (TIPI_NOTI as readonly string[]).includes(tipologia);
  const note = String(r.note ?? '');
  const stato = String(r.stato ?? 'programmato');
  return {
    id: String(r.id ?? ''),
    data: String(r.data ?? ''),
    ora: String(r.ora ?? ''),
    durata: Number(r.durata ?? 30),
    pazienteId: r.patientId ? String(r.patientId) : null,
    pazienteNome: r.patientName ? String(r.patientName) : null,
    operatoreId: String(r.operatorId ?? ''),
    operatoreNome: r.operatorName ? String(r.operatorName) : '',
    tipoIntervento: (known ? tipologia : 'altro') as TipoIntervento,
    stato: (['programmato', 'in_corso', 'completato', 'annullato'].includes(stato)
      ? stato
      : 'programmato') as Appuntamento['stato'],
    priorita: 'normale',
    note: known || !tipologia ? note : note ? `${tipologia} — ${note}` : tipologia,
  };
}

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const [utente, setUtente] = useState<UtenteApp | null>(null);
  const [navKey, setNavKey] = useState<NavKey>('admin-dashboard');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiOpenTrigger, setAiOpenTrigger] = useState(0);
  const [aiLoaded, setAiLoaded] = useState(false);

  function openAiAssistant() {
    setAiLoaded(true);
    setAiOpen(true);
    setAiOpenTrigger((trigger) => trigger + 1);
  }

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }

  // Navigation history tracking
  const prevNavKeyRef = useRef<NavKey | null>(null);
  const historyDepth = useRef(0);
  // Patient id parsed from the hash on mount (refresh/reopened tab). It is resolved with one
  // authenticated lookup after login; no facility-wide roster is downloaded.
  const pendingPazienteRestoreIdRef = useRef<string | null>(null);
  const patientNavigationSequenceRef = useRef(0);
  const sessionEpochRef = useRef(0);
  const appointmentRequestSequenceRef = useRef(0);
  const therapyRequestSequenceRef = useRef(0);
  const notesRequestSequenceRef = useRef(0);
  const notesAbortControllerRef = useRef<AbortController | null>(null);
  const consegneRequestSequenceRef = useRef(0);
  const consegneAbortControllerRef = useRef<AbortController | null>(null);
  const consegneQueryRef = useRef<ConsegnaFeedQuery>({});
  const consegnePageInfoRef = useRef<ConsegnaPageInfo>({ hasMore: false, nextCursor: null });
  const consegneOverviewRequestRef = useRef(0);
  const consegneOverviewAbortRef = useRef<AbortController | null>(null);
  const patientConsegneRequestRef = useRef(0);
  const patientConsegneAbortRef = useRef<AbortController | null>(null);
  const patientConsegnePageInfoRef = useRef<ConsegnaPageInfo>({
    hasMore: false,
    nextCursor: null,
  });
  const notesQueryRef = useRef<NotesMailboxQuery>({ box: 'all', q: '' });
  const notesPageInfoRef = useRef<NotesPageInfo>({ hasMore: false, nextCursor: null });
  const therapyDateRef = useRef(localIsoDate());
  const appointmentRangeRef = useRef<AppointmentRangeRequest>({
    from: localIsoDate(),
    to: localIsoDate(),
  });
  // True while that restore is pending, so the render below can show a loading state instead of
  // flashing the "Nessun paziente selezionato" empty state before the patients list arrives.
  const [restoringPazienteFromHash, setRestoringPazienteFromHash] = useState(false);

  // Search
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // PatientList owns its bounded page; only the selected patient is retained globally. Its filters
  // stay lifted here so they survive while that component unmounts for an open patient chart.
  const [pazientiRicerca, setPazientiRicerca] = useState('');
  const [pazientiFiltroSesso, setPazientiFiltroSesso] = useState<'tutti' | 'M' | 'F'>('tutti');
  const [pazienteSelezionato, setPazienteSelezionato] = useState<Paziente | null>(null);
  // #243: "Moduli" tab to land on when opening pazienteSelezionato (set only right after a
  // patient is created from the intake wizard with a module card selected in step 4).
  const [pendingModuleTab, setPendingModuleTab] = useState<TabId | undefined>(undefined);

  // Mock state
  const [operatori, setOperatori] = useState<Operatore[]>([]);
  const [consegne, setConsegne] = useState<Consegna[]>([]);
  const [patientConsegne, setPatientConsegne] = useState<Consegna[]>([]);
  const [patientConsegneSummary, setPatientConsegneSummary] = useState<ConsegnaSummary | null>(
    null,
  );
  const [patientConsegnePageInfo, setPatientConsegnePageInfo] = useState<ConsegnaPageInfo>({
    hasMore: false,
    nextCursor: null,
  });
  const [loadingPatientConsegne, setLoadingPatientConsegne] = useState(false);
  const [patientConsegneError, setPatientConsegneError] = useState<string | null>(null);
  const [consegneOverview, setConsegneOverview] = useState<ConsegnaOverview | null>(null);
  const [consegneOverviewState, setConsegneOverviewState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [consegneSummary, setConsegneSummary] = useState<ConsegnaSummary>({
    total: 0,
    open: 0,
    inProgress: 0,
    completed: 0,
    urgentOpen: 0,
  });
  const [consegnePageInfo, setConsegnePageInfo] = useState<ConsegnaPageInfo>({
    hasMore: false,
    nextCursor: null,
  });
  const [loadingConsegne, setLoadingConsegne] = useState(false);
  const [consegneLoadError, setConsegneLoadError] = useState<string | null>(null);
  // #283: come aprire la pagina Consegne (filtro iniziale + eventuale consegna da evidenziare)
  const [consegneView, setConsegneView] = useState<{
    filtro: 'tutte' | 'attive' | Consegna['stato'];
    focusId: string | null;
  }>({ filtro: 'tutte', focusId: null });
  const [cartelle, setCartelle] = useState<CartellaPaziente[]>([]);
  // Le dashboard consumano un aggregato di dimensione costante, indipendente dal roster.
  const [clinicalOverview, setClinicalOverview] = useState<ClinicalOverview | null>(null);
  const [loadingClinicalOverview, setLoadingClinicalOverview] = useState(true);
  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([]); // SPEC-015 US4: da GET /appointments
  // Senza questo flag l'agenda, prima che la fetch risponda, dichiara "tutti gli slot liberi":
  // su uno strumento clinico e' un'informazione falsa, non solo mancante.
  const [loadingAppuntamenti, setLoadingAppuntamenti] = useState(true);
  const [appointmentLoadError, setAppointmentLoadError] = useState<string | null>(null);
  const [camere, setCamere] = useState<Camera[]>([]);
  // #285: orari operatori persistiti via /operators/schedules (prima erano MOCK_SCHEDULES)
  const [schedules, setSchedules] = useState<ScheduleOperatore[]>([]);
  const [note, setNote] = useState<Nota[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [notesLoadError, setNotesLoadError] = useState<string | null>(null);
  const [notesUnreadCount, setNotesUnreadCount] = useState(0);
  const [notesPageInfo, setNotesPageInfo] = useState<NotesPageInfo>({
    hasMore: false,
    nextCursor: null,
  });
  const [therapySlots, setTherapySlots] = useState<TherapySlot[]>([]);
  const [loadingTherapySlots, setLoadingTherapySlots] = useState(true);
  const [therapyLoadError, setTherapyLoadError] = useState<string | null>(null);

  // #285: il widget agenda della dashboard operatore deriva dagli appuntamenti REALI di oggi
  // (prima mostrava MOCK_AGENDA, dati finti mai persistiti).
  const todayISO = localIsoDate();
  const agendaOggi: SlotAgenda[] = appuntamenti
    .filter((a) => a.data === todayISO)
    .sort((a, b) => a.ora.localeCompare(b.ora))
    .map((a) => ({
      id: a.id,
      patientId: a.pazienteId ?? undefined,
      ora: a.ora,
      pazienteNome: a.pazienteNome,
      motivo: a.tipoIntervento,
      stato: a.stato,
      operatoreId: a.operatoreId,
    }));

  // ── History API navigation ─────────────────────────────────────────────────

  function pushNav(key: NavKey, paziente?: Paziente) {
    prevNavKeyRef.current = navKey;
    historyDepth.current += 1;
    // #<loop-cycle-1>: encode the patient id in the hash (dettaglio-paziente only) so a page
    // refresh/reopen can restore the chart by re-fetching that id — see the mount effect below.
    const hash = key === 'dettaglio-paziente' && paziente ? `#/${key}/${paziente.id}` : `#/${key}`;
    window.history.pushState(
      { navKey: key, pazienteId: paziente?.id, prevNavKey: navKey },
      '',
      hash,
    );
    setNavKey(key);
    if (paziente) {
      setPazienteSelezionato(paziente);
    } else if (key !== 'dettaglio-paziente') {
      setPazienteSelezionato(null);
    }
  }

  function navigate(key: NavKey) {
    setMobileNavOpen(false); // chiudi il drawer di navigazione mobile a ogni cambio sezione
    if (key === 'ai-assistant') {
      openAiAssistant();
      return;
    }
    // #283: una navigazione "generica" verso Consegne (sidebar) azzera filtro/focus impostati
    // dalla card della dashboard — unico writer di consegneView è navigate/openConsegneAperte.
    if (key === 'consegne') setConsegneView({ filtro: 'tutte', focusId: null });
    pushNav(key);
    if (key === 'agenda-operatore' || key === 'agenda-admin') loadTherapySlots();
  }

  // #283: la card "Consegne aperte" apre la pagina già filtrata sulle aperte; se la consegna
  // aperta è UNA sola, evidenzia e scrolla direttamente quella card.
  function openConsegneAperte() {
    const summary = consegneOverview?.summary;
    const single = summary?.open === 1 ? consegneOverview?.openPreview[0] : undefined;
    setConsegneView({
      filtro: 'attive',
      focusId: single?.id ?? null,
    });
    setMobileNavOpen(false);
    pushNav('consegne');
  }

  function selectPaziente(p: Paziente, moduleTabId?: TabId) {
    patientNavigationSequenceRef.current += 1;
    setRestoringPazienteFromHash(false);
    pushNav('dettaglio-paziente', p);
    loadCartella(p.id);
    // Reset on every selection (not just when a module is passed) so a stale target from a
    // previous intake-created patient never leaks into an unrelated navigation.
    setPendingModuleTab(moduleTabId);
  }

  async function selectPazienteById(patientId: string, moduleTabId?: TabId) {
    const request = ++patientNavigationSequenceRef.current;
    try {
      const patient = await fetchPatientById(API_URL, patientId, {
        headers: operatorHeaders(),
      });
      if (request !== patientNavigationSequenceRef.current) return;
      selectPaziente(patient, moduleTabId);
    } catch {
      if (request === patientNavigationSequenceRef.current) {
        showToast('Paziente non disponibile o non autorizzato');
      }
    }
  }

  // AC5: la NavAction del backend porta sectionKey/recordId/documentId/pageNumber e non solo il
  // paziente — leggerne solo l'id faceva atterrare ogni azione sulla scheda generica, perdendo
  // la sezione citata. Le destinazioni di reparto (agenda, consegne, terapie di oggi) non hanno
  // alcun paziente: vanno gestite prima.
  async function agnosNavigate(n: AssistantNav) {
    if (n.type === 'open_agenda') {
      navigate(isAdmin ? 'agenda-admin' : 'agenda-operatore');
      return;
    }
    if (n.type === 'open_therapies_today') {
      // Lo stato delle somministrazioni di oggi a livello di reparto vive nella dashboard
      // (useRiepilogoSomministrazioni): non esiste una schermata terapie facility-wide.
      navigate(isAdmin ? 'admin-dashboard' : 'operator-dashboard');
      return;
    }
    if (n.type === 'open_beds') {
      // RoomsManagement è montata solo per admin: un operatore atterrerebbe su una pagina vuota.
      navigate(isAdmin ? 'posti-letto' : 'operator-dashboard');
      return;
    }
    if (n.type === 'open_consegne' && !n.patientId) {
      // navigate('consegne') azzera filtro e focus: qui la consegna citata va evidenziata.
      setConsegneView({ filtro: 'tutte', focusId: n.recordId ?? null });
      setMobileNavOpen(false);
      pushNav('consegne');
      return;
    }
    if (n.patientId) {
      await selectPazienteById(n.patientId, navTabId(n));
    }
  }

  const goBack = useCallback(
    (fallbackKey?: NavKey) => {
      if (historyDepth.current > 0) {
        window.history.back();
      } else {
        const target =
          fallbackKey ??
          NAV_FALLBACK[navKey] ??
          (utente?.ruolo === 'admin' ? 'admin-dashboard' : 'operator-dashboard');
        navigate(target);
      }
    },
    [navKey, utente?.ruolo],
  );

  // Restore nav from hash on mount + listen to popstate
  useEffect(() => {
    const hash = window.location.hash.replace('#/', '');
    // dettaglio-paziente/<id>: restore the chart with a single lookup after authentication.
    if (hash.startsWith('dettaglio-paziente/')) {
      const id = hash.slice('dettaglio-paziente/'.length);
      if (id) {
        pendingPazienteRestoreIdRef.current = id;
        setRestoringPazienteFromHash(true);
        setNavKey('dettaglio-paziente');
      }
    } else if (hash && hash !== 'dettaglio-paziente' && hash !== 'login') {
      const k = hash as NavKey;
      setNavKey(k);
    }

    function onPopState(e: PopStateEvent) {
      if (historyDepth.current > 0) historyDepth.current -= 1;
      if (e.state?.navKey) {
        prevNavKeyRef.current = e.state.prevNavKey ?? null;
        setNavKey(e.state.navKey as NavKey);
        if (e.state.navKey !== 'dettaglio-paziente') {
          setPazienteSelezionato(null);
        }
      }
    }

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // ── Load therapy slots (clinical API; never substitute mock data on failure) ──

  const loadTherapySlots = useCallback(async (date?: string) => {
    const sessionEpoch = sessionEpochRef.current;
    const request = ++therapyRequestSequenceRef.current;
    const d = date || localIsoDate();
    therapyDateRef.current = d;
    setLoadingTherapySlots(true);
    setTherapyLoadError(null);
    setTherapySlots([]);
    try {
      const raw = await cachedGetJson<unknown>(`${API_URL}/therapy-slots?date=${d}`);
      const slots = Array.isArray(raw) ? raw : [];
      const data: TherapySlot[] = slots.map((s: Record<string, unknown>) => ({
        id: s.id as string,
        fascia: s.fascia as TherapySlot['fascia'],
        label: s.label as string,
        ora: s.ora as string,
        summary: (s.summary as TherapySlot['summary']) ?? {
          total: 0,
          administered: 0,
          notAdministered: 0,
          pending: 0,
        },
        patients: Array.isArray(s.patients) ? (s.patients as TherapySlotPatient[]) : [],
      }));
      if (
        sessionEpoch === sessionEpochRef.current &&
        request === therapyRequestSequenceRef.current &&
        d === therapyDateRef.current
      ) {
        setTherapySlots(data);
      }
    } catch {
      if (
        sessionEpoch === sessionEpochRef.current &&
        request === therapyRequestSequenceRef.current &&
        d === therapyDateRef.current
      ) {
        const message = 'Terapie non disponibili: riprova prima di registrare una somministrazione';
        setTherapyLoadError(message);
        showToast(message);
      }
    } finally {
      if (
        sessionEpoch === sessionEpochRef.current &&
        request === therapyRequestSequenceRef.current &&
        d === therapyDateRef.current
      ) {
        setLoadingTherapySlots(false);
      }
    }
  }, []);

  const retryTherapySlots = useCallback(() => {
    void loadTherapySlots(therapyDateRef.current);
  }, [loadTherapySlots]);

  // ── Load appointments (API — SPEC-015 US4, sostituisce MOCK_APPUNTAMENTI) ──

  const loadAppuntamenti = useCallback(async (range?: AppointmentRangeRequest) => {
    const sessionEpoch = sessionEpochRef.current;
    const request = ++appointmentRequestSequenceRef.current;
    const today = localIsoDate();
    const requestedRange = range ?? { from: today, to: today };
    appointmentRangeRef.current = requestedRange;
    setLoadingAppuntamenti(true);
    setAppointmentLoadError(null);
    setAppuntamenti([]);
    try {
      const res = await fetch(buildAppointmentRangeUrl(API_URL, requestedRange), {
        headers: operatorHeaders(),
      });
      if (!res.ok) {
        if (request === appointmentRequestSequenceRef.current) {
          const message =
            res.status === 422
              ? 'Troppi appuntamenti: restringi periodo o operatore'
              : 'Impossibile caricare gli appuntamenti';
          setAppointmentLoadError(message);
          showToast(message);
        }
        return;
      }
      const raw = await res.json();
      const rows = Array.isArray(raw) ? raw : [];
      if (
        sessionEpoch === sessionEpochRef.current &&
        request === appointmentRequestSequenceRef.current
      ) {
        setAppuntamenti(rows.map((r: Record<string, unknown>) => mapAppointmentDTO(r)));
      }
    } catch {
      if (request === appointmentRequestSequenceRef.current) {
        const message = 'Connessione non disponibile: agenda non caricata';
        setAppointmentLoadError(message);
        showToast(message);
      }
    } finally {
      if (
        sessionEpoch === sessionEpochRef.current &&
        request === appointmentRequestSequenceRef.current
      )
        setLoadingAppuntamenti(false);
    }
  }, []);

  const loadAppointmentRange = useCallback(
    (from: string, to: string, operatorId?: string) => {
      void loadAppuntamenti({ from, to, operatorId });
    },
    [loadAppuntamenti],
  );

  const retryAppointmentRange = useCallback(() => {
    void loadAppuntamenti(appointmentRangeRef.current);
  }, [loadAppuntamenti]);

  // ── Bounded handover feed and exact dashboard read model ──────────────────

  const loadConsegne = useCallback(async (query?: ConsegnaFeedQuery, append = false) => {
    const requestedQuery = query ?? consegneQueryRef.current;
    const cursor = append ? consegnePageInfoRef.current.nextCursor : null;
    if (append && !cursor) return;
    const sessionEpoch = sessionEpochRef.current;
    const request = ++consegneRequestSequenceRef.current;
    consegneAbortControllerRef.current?.abort();
    const controller = new AbortController();
    consegneAbortControllerRef.current = controller;
    consegneQueryRef.current = requestedQuery;
    setLoadingConsegne(true);
    setConsegneLoadError(null);
    if (!append) setConsegne([]);
    try {
      const response = await fetch(buildConsegnaFeedUrl(API_URL, requestedQuery, cursor), {
        headers: operatorHeaders(),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`consegne_${response.status}`);
      const page = (await response.json()) as unknown;
      if (!isConsegnaFeedResponse(page)) throw new Error('consegne_shape');
      if (
        sessionEpoch !== sessionEpochRef.current ||
        request !== consegneRequestSequenceRef.current
      )
        return;
      const items = page.items.map((c) => ({ ...c, oraScadenza: c.oraScadenza ?? undefined }));
      setConsegne((current) => mergeConsegnaPage(current, items, append));
      setConsegneSummary(page.summary);
      consegnePageInfoRef.current = page.pageInfo;
      setConsegnePageInfo(page.pageInfo);
    } catch (error) {
      if ((error as { name?: string }).name === 'AbortError') return;
      if (
        sessionEpoch === sessionEpochRef.current &&
        request === consegneRequestSequenceRef.current
      ) {
        setConsegneLoadError('Consegne non disponibili. Riprova.');
      }
    } finally {
      if (
        sessionEpoch === sessionEpochRef.current &&
        request === consegneRequestSequenceRef.current
      ) {
        setLoadingConsegne(false);
      }
    }
  }, []);

  const loadConsegneOverview = useCallback(async () => {
    const sessionEpoch = sessionEpochRef.current;
    const request = ++consegneOverviewRequestRef.current;
    consegneOverviewAbortRef.current?.abort();
    const controller = new AbortController();
    consegneOverviewAbortRef.current = controller;
    setConsegneOverviewState('loading');
    try {
      const response = await fetch(`${API_URL}/consegne/overview`, {
        headers: operatorHeaders(),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('consegne_overview');
      const overview = (await response.json()) as ConsegnaOverview;
      if (
        sessionEpoch === sessionEpochRef.current &&
        request === consegneOverviewRequestRef.current
      ) {
        setConsegneOverview(overview);
        setConsegneOverviewState('ready');
      }
    } catch (error) {
      if ((error as { name?: string }).name === 'AbortError') return;
      if (
        sessionEpoch === sessionEpochRef.current &&
        request === consegneOverviewRequestRef.current
      ) {
        // Keep the last known snapshot if there is one, but never present a failed initial read
        // as a real zero. Dashboards receive this explicit error state.
        setConsegneOverviewState('error');
      }
    }
  }, []);

  const loadPatientConsegne = useCallback(async (patientId: string, append = false) => {
    const cursor = append ? patientConsegnePageInfoRef.current.nextCursor : null;
    if (append && !cursor) return;
    const sessionEpoch = sessionEpochRef.current;
    const request = ++patientConsegneRequestRef.current;
    patientConsegneAbortRef.current?.abort();
    const controller = new AbortController();
    patientConsegneAbortRef.current = controller;
    setLoadingPatientConsegne(true);
    setPatientConsegneError(null);
    if (!append) {
      setPatientConsegne([]);
      setPatientConsegneSummary(null);
      patientConsegnePageInfoRef.current = { hasMore: false, nextCursor: null };
      setPatientConsegnePageInfo({ hasMore: false, nextCursor: null });
    }
    try {
      const response = await fetch(buildConsegnaFeedUrl(API_URL, { patientId }, cursor), {
        headers: operatorHeaders(),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('patient_consegne');
      const page = (await response.json()) as unknown;
      if (!isConsegnaFeedResponse(page)) throw new Error('patient_consegne_shape');
      if (
        sessionEpoch === sessionEpochRef.current &&
        request === patientConsegneRequestRef.current
      ) {
        setPatientConsegne((current) => mergeConsegnaPage(current, page.items, append));
        setPatientConsegneSummary(page.summary);
        patientConsegnePageInfoRef.current = page.pageInfo;
        setPatientConsegnePageInfo(page.pageInfo);
      }
    } catch (error) {
      if ((error as { name?: string }).name === 'AbortError') return;
      if (
        sessionEpoch === sessionEpochRef.current &&
        request === patientConsegneRequestRef.current
      ) {
        setPatientConsegneError('Consegne del paziente non disponibili. Riprova.');
      }
    } finally {
      if (
        sessionEpoch === sessionEpochRef.current &&
        request === patientConsegneRequestRef.current
      ) {
        setLoadingPatientConsegne(false);
      }
    }
  }, []);

  // ── Load note private e paginate ───────────────────────────────────────────

  const loadNotes = useCallback(async (query?: NotesMailboxQuery, append = false) => {
    const requestedQuery = query ?? notesQueryRef.current;
    const sessionEpoch = sessionEpochRef.current;
    const request = ++notesRequestSequenceRef.current;
    notesAbortControllerRef.current?.abort();
    const controller = new AbortController();
    notesAbortControllerRef.current = controller;
    notesQueryRef.current = requestedQuery;
    const cursor = append ? notesPageInfoRef.current.nextCursor : null;
    if (append && !cursor) return;
    setLoadingNotes(true);
    setNotesLoadError(null);
    if (!append) setNote([]);
    try {
      const response = await fetch(buildNotesMailboxUrl(API_URL, requestedQuery, cursor), {
        headers: operatorHeaders(),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`notes_${response.status}`);
      const page = (await response.json()) as NotesPageResponse;
      if (!Array.isArray(page.items) || !page.pageInfo || !page.summary) {
        throw new Error('notes_shape');
      }
      if (sessionEpoch !== sessionEpochRef.current || request !== notesRequestSequenceRef.current)
        return;
      const items = page.items.map(mapNoteDto);
      setNote((current) => (append ? mergeNotesPage(current, items) : items));
      notesPageInfoRef.current = page.pageInfo;
      setNotesPageInfo(page.pageInfo);
      setNotesUnreadCount(page.summary.unread);
    } catch (error) {
      if ((error as { name?: string }).name === 'AbortError') return;
      if (sessionEpoch === sessionEpochRef.current && request === notesRequestSequenceRef.current) {
        setNotesLoadError('Note non disponibili. Riprova.');
      }
    } finally {
      if (sessionEpoch === sessionEpochRef.current && request === notesRequestSequenceRef.current) {
        setLoadingNotes(false);
      }
    }
  }, []);

  // ── Load rooms (camere + letti con occupazione reale) ───────────────────────

  const loadCamere = useCallback(() => {
    const sessionEpoch = sessionEpochRef.current;
    fetch(`${API_URL}/admin/rooms`, { headers: operatorHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then(
        (
          rooms: Array<{
            id: string;
            numero: string;
            tipo: string;
            piano: string;
            reparto: string;
            stato: string;
            note: string;
            beds: Array<{
              id: string;
              label: string;
              stato: string;
              assignments: Array<{
                patientId: string;
                patient: { firstName: string; lastName: string };
              }>;
            }>;
          }>,
        ) => {
          if (sessionEpoch !== sessionEpochRef.current) return;
          setCamere(
            rooms.map((r) => ({
              id: r.id,
              numero: r.numero,
              tipo: r.tipo as Camera['tipo'],
              piano: r.piano,
              reparto: r.reparto,
              stato: r.stato as Camera['stato'],
              note: r.note,
              letti: r.beds.map((b) => ({
                id: b.id,
                numero: b.label === 'A' ? 1 : b.label === 'B' ? 2 : 3,
                stato: (b.assignments.length > 0
                  ? 'occupato'
                  : b.stato === 'manutenzione'
                    ? 'manutenzione'
                    : 'libero') as Camera['letti'][0]['stato'],
                pazienteId: b.assignments[0]?.patientId,
                pazienteNome: b.assignments[0]?.patient
                  ? `${b.assignments[0].patient.lastName}, ${b.assignments[0].patient.firstName}`
                  : undefined,
              })),
            })),
          );
        },
      )
      .catch(() => {
        /* keep empty array */
      });
  }, []);

  // ── Fetch constant-size session data ───────────────────────────────────────

  useEffect(() => {
    if (!utente) return;
    const sessionEpoch = sessionEpochRef.current;
    const sessionController = new AbortController();
    fetch(`${API_URL}/patients/clinical-summary/overview`, {
      headers: operatorHeaders(),
      signal: sessionController.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error('overview unavailable');
        return r.json();
      })
      .then((data: ClinicalOverview) => {
        if (sessionEpoch === sessionEpochRef.current) setClinicalOverview(data);
      })
      .catch((error: unknown) => {
        if (
          (error as { name?: string }).name !== 'AbortError' &&
          sessionEpoch === sessionEpochRef.current
        )
          setClinicalOverview(null);
      })
      .finally(() => {
        if (!sessionController.signal.aborted && sessionEpoch === sessionEpochRef.current)
          setLoadingClinicalOverview(false);
      });
    loadTherapySlots();
    const appointmentDay = localIsoDate();
    void loadAppuntamenti({
      from: appointmentDay,
      to: appointmentDay,
      operatorId: utente.ruolo === 'operatore' ? utente.id : undefined,
    });
    // Load rooms from API for AdminDashboard
    loadCamere();
    // Dashboard receives only a constant-size exact read model; the feed loads on navigation.
    void loadConsegneOverview();
    const operatorDirectoryPath = utente.ruolo === 'admin' ? '/operators' : '/operators/directory';
    const operatorSchedulesPath =
      utente.ruolo === 'admin' ? '/operators/schedules' : '/operators/directory/schedules';
    // #285: orari operatori persistiti. Gli operatori ricevono turni senza note amministrative.
    fetch(`${API_URL}${operatorSchedulesPath}`, {
      headers: operatorHeaders(),
      signal: sessionController.signal,
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ScheduleOperatore[]) => {
        if (sessionEpoch === sessionEpochRef.current) setSchedules(data);
      })
      .catch(() => {
        /* keep empty array */
      });
    // Fase 1b: operatori reali dal backend (niente più mock); iniziali/colore client-derived
    fetch(`${API_URL}${operatorDirectoryPath}`, {
      headers: operatorHeaders(),
      signal: sessionController.signal,
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Omit<Operatore, 'iniziali' | 'colore'>[]) => {
        if (sessionEpoch !== sessionEpochRef.current) return;
        setOperatori(
          data.map((row, i) => ({
            ...row,
            iniziali: `${row.nome[0] ?? ''}${row.cognome[0] ?? ''}`.toUpperCase(),
            colore: OPERATOR_COLOR_PALETTE[i % OPERATOR_COLOR_PALETTE.length],
          })),
        );
      })
      .catch(() => {
        /* keep empty array */
      });
    void loadNotes({ box: 'all', q: '' });
    return () => sessionController.abort();
  }, [utente, loadTherapySlots, loadAppuntamenti, loadCamere, loadConsegneOverview, loadNotes]);

  useEffect(() => {
    if (!utente || navKey !== 'consegne') return;
    void loadConsegne(consegneQueryRef.current);
  }, [utente, navKey, loadConsegne]);

  useEffect(() => {
    if (!utente || navKey !== 'dettaglio-paziente' || !pazienteSelezionato) return;
    const timer = window.setTimeout(() => void loadPatientConsegne(pazienteSelezionato.id), 0);
    return () => window.clearTimeout(timer);
  }, [utente, navKey, pazienteSelezionato, loadPatientConsegne]);

  // Resolve a patient restored from the hash with one URL-encoded authenticated lookup. The
  // pending id is consumed once and every outcome closes the loading state.
  useEffect(() => {
    if (!utente || !pendingPazienteRestoreIdRef.current) return;
    const id = pendingPazienteRestoreIdRef.current;
    pendingPazienteRestoreIdRef.current = null;
    const request = ++patientNavigationSequenceRef.current;
    const controller = new AbortController();
    fetchPatientById(API_URL, id, {
      headers: operatorHeaders(),
      signal: controller.signal,
    })
      .then((patient) => {
        if (request !== patientNavigationSequenceRef.current) return;
        setPazienteSelezionato(patient);
        return loadCartella(patient.id);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== 'AbortError') {
          showToast('Paziente non disponibile o non autorizzato');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && request === patientNavigationSequenceRef.current) {
          setRestoringPazienteFromHash(false);
        }
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadCartella/cartelle stabili per lo scopo dell'effetto
  }, [utente]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Un modale clinico full-overlay (.modal-overlay/.therapy-modal-overlay, z-index >=
        // 1000) blocca gia' i click di sfondo, incluso il bottone di ricerca in topbar — ma
        // questo listener e' globale su window e non lo sapeva, aprendo .search-overlay
        // (z-index 300) VISIVAMENTE SOTTO il modale gia' aperto: un secondo overlay invisibile
        // e incliccabile, non un rischio dati (nessun risultato raggiungibile), ma un
        // comportamento incoerente con l'equivalente click col mouse (gia' bloccato).
        if (document.querySelector('.modal-overlay, .therapy-modal-overlay')) return;
        setSearchOpen((v) => !v);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  // ── Auth ────────────────────────────────────────────────────────────────────

  async function handleLogin(u: UtenteApp) {
    sessionEpochRef.current += 1;
    appointmentRequestSequenceRef.current += 1;
    therapyRequestSequenceRef.current += 1;
    notesRequestSequenceRef.current += 1;
    notesAbortControllerRef.current?.abort();
    consegneRequestSequenceRef.current += 1;
    consegneAbortControllerRef.current?.abort();
    consegneOverviewRequestRef.current += 1;
    consegneOverviewAbortRef.current?.abort();
    patientConsegneRequestRef.current += 1;
    patientConsegneAbortRef.current?.abort();
    patientNavigationSequenceRef.current += 1;
    // In Entra mode the redirect/silent flow completes before any clinical fetch starts.
    // The selected card is only a demo/local hint: with a token, id and UI role are replaced by
    // the identity resolved server-side so an operator cannot unlock admin UI by choosing a card.
    const accessToken = await acquireApiToken();
    let resolvedUser = u;
    if (accessToken) {
      const identityResponse = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!identityResponse.ok) {
        showToast('Identità non autorizzata in ClinicOS');
        return;
      }
      const identity = (await identityResponse.json()) as {
        id: string;
        role: string;
        name?: string;
      };
      const resolvedRole = ['admin', 'manager'].includes(identity.role.toLowerCase())
        ? 'admin'
        : 'operatore';
      resolvedUser = {
        ...u,
        id: identity.id,
        ruolo: resolvedRole,
        nome: identity.name?.trim() || u.nome,
      };
    }
    setCurrentOperator({
      id: resolvedUser.id,
      role: resolvedUser.ruolo,
      accessToken: accessToken ?? undefined,
    });
    setLoadingClinicalOverview(true);
    setUtente(resolvedUser);
    // The mount effect above already parsed a dettaglio-paziente/<id> hash (set before login,
    // since there's no session persistence — every reload hits the role-picker first) and left
    // pendingPazienteRestoreIdRef set for the resolve effect below to pick up once the patients
    // list loads. Read window.location.hash directly here (rather than that ref) so this check
    // never depends on React's effect/commit timing relative to the login click.
    const currentHash = window.location.hash.replace('#/', '');
    if (currentHash.startsWith('dettaglio-paziente/')) return;
    const key: NavKey = resolvedUser.ruolo === 'admin' ? 'admin-dashboard' : 'operator-dashboard';
    window.history.replaceState({ navKey: key }, '', `#/${key}`);
    setNavKey(key);
  }

  function handleLogout() {
    sessionEpochRef.current += 1;
    appointmentRequestSequenceRef.current += 1;
    patientNavigationSequenceRef.current += 1;
    notesRequestSequenceRef.current += 1;
    notesAbortControllerRef.current?.abort();
    consegneRequestSequenceRef.current += 1;
    consegneAbortControllerRef.current?.abort();
    consegneOverviewRequestRef.current += 1;
    consegneOverviewAbortRef.current?.abort();
    patientConsegneRequestRef.current += 1;
    patientConsegneAbortRef.current?.abort();
    setUtente(null);
    setAppointmentLoadError(null);
    setTherapyLoadError(null);
    setNotesLoadError(null);
    setLoadingNotes(false);
    setNotesUnreadCount(0);
    notesQueryRef.current = { box: 'all', q: '' };
    notesPageInfoRef.current = { hasMore: false, nextCursor: null };
    setNotesPageInfo({ hasMore: false, nextCursor: null });
    setConsegne([]);
    setPatientConsegne([]);
    setPatientConsegneSummary(null);
    setPatientConsegneError(null);
    setLoadingPatientConsegne(false);
    patientConsegnePageInfoRef.current = { hasMore: false, nextCursor: null };
    setPatientConsegnePageInfo({ hasMore: false, nextCursor: null });
    setConsegneOverview(null);
    setConsegneOverviewState('loading');
    setConsegneLoadError(null);
    setLoadingConsegne(false);
    consegneQueryRef.current = {};
    consegnePageInfoRef.current = { hasMore: false, nextCursor: null };
    setConsegnePageInfo({ hasMore: false, nextCursor: null });
    setLoadingTherapySlots(true);
    setCurrentOperator(null);
    clearCachedGet();
    setClinicalOverview(null);
    setLoadingClinicalOverview(true);
    setPazienteSelezionato(null);
    pendingPazienteRestoreIdRef.current = null;
    setRestoringPazienteFromHash(false);
    setSearchOpen(false);
    setSearchQuery('');
    setAiOpen(false);
    setAiLoaded(false);
    setToastMsg(null);
    setMobileNavOpen(false);
    setPazientiRicerca('');
    setPazientiFiltroSesso('tutti');
    setPendingModuleTab(undefined);
    setConsegneView({ filtro: 'tutte', focusId: null });
    setCartelle([]);
    setAppuntamenti([]);
    setNote([]);
    setConsegne([]);
    setTherapySlots([]);
    setCamere([]);
    setOperatori([]);
    setSchedules([]);
    window.history.replaceState({}, '', '#/login');
    setNavKey('login');
  }

  // ── Operatori CRUD (API-persisted, Fase 1b) ────────────────────────────────
  // Il backend restituisce righe già nella forma `Operatore` SENZA iniziali/colore:
  // derivati client-side (iniziali da nome+cognome, colore dalla palette per indice).

  type OperatoreApi = Omit<Operatore, 'iniziali' | 'colore'>;

  function decorateOperatore(row: OperatoreApi, index: number, colore?: string): Operatore {
    return {
      ...row,
      iniziali: `${row.nome[0] ?? ''}${row.cognome[0] ?? ''}`.toUpperCase(),
      colore: colore || OPERATOR_COLOR_PALETTE[index % OPERATOR_COLOR_PALETTE.length],
    };
  }

  async function addOperatore(
    op: Omit<Operatore, 'id' | 'pazientiAssegnati' | 'appuntamentiOggi' | 'iniziali'>,
  ) {
    try {
      const res = await fetch(`${API_URL}/operators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify(op),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        showToast(err?.error ?? "Impossibile creare l'operatore");
        return;
      }
      const created = (await res.json()) as OperatoreApi;
      setOperatori((prev) => [...prev, decorateOperatore(created, prev.length, op.colore)]);
      showToast('Operatore creato');
    } catch {
      showToast("Impossibile creare l'operatore");
    }
  }

  async function updateOperatore(id: string, updates: Partial<Operatore>) {
    try {
      const res = await fetch(`${API_URL}/operators/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        showToast(err?.error ?? "Impossibile aggiornare l'operatore");
        return;
      }
      const saved = (await res.json()) as OperatoreApi;
      setOperatori((prev) =>
        prev.map((o, i) =>
          o.id === id ? decorateOperatore(saved, i, updates.colore ?? o.colore) : o,
        ),
      );
      showToast('Operatore aggiornato');
    } catch {
      showToast("Impossibile aggiornare l'operatore");
    }
  }

  function toggleStatoOperatore(id: string) {
    const current = operatori.find((o) => o.id === id);
    if (!current) return;
    void updateOperatore(id, { stato: current.stato === 'attivo' ? 'inattivo' : 'attivo' });
  }

  // ── Consegne CRUD ───────────────────────────────────────────────────────────

  // ── Consegne CRUD (API-persisted) ─────────────────────────────────────────

  function refreshConsegnaViews() {
    void loadConsegneOverview();
    if (navKey === 'consegne') void loadConsegne(consegneQueryRef.current);
    if (pazienteSelezionato) void loadPatientConsegne(pazienteSelezionato.id);
  }

  async function addConsegna(c: NewConsegnaInput): Promise<boolean> {
    const sessionEpoch = sessionEpochRef.current;
    try {
      const res = await fetch(`${API_URL}/consegne`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify({
          pazienteId: c.pazienteId,
          priorita: c.priorita,
          tipo: c.tipo,
          note: c.note,
          scadenza: c.scadenza,
          oraScadenza: c.oraScadenza ?? null,
          operatoreAssegnatoId: c.operatoreAssegnatoId ?? null,
        }),
      });
      if (!res.ok) {
        showToast('Impossibile creare la consegna');
        return false;
      }
      await res.json();
      if (sessionEpoch !== sessionEpochRef.current) return false;
      refreshConsegnaViews();
      showToast('Consegna creata');
      return true;
    } catch {
      showToast('Impossibile creare la consegna');
      return false;
    }
  }

  async function updateConsegna(id: string, patch: Partial<Consegna>): Promise<boolean> {
    const sessionEpoch = sessionEpochRef.current;
    const allowedPatch = {
      ...(patch.priorita !== undefined ? { priorita: patch.priorita } : {}),
      ...(patch.stato !== undefined ? { stato: patch.stato } : {}),
      ...(patch.tipo !== undefined ? { tipo: patch.tipo } : {}),
      ...(patch.note !== undefined ? { note: patch.note } : {}),
      ...(patch.scadenza !== undefined ? { scadenza: patch.scadenza } : {}),
      ...(patch.oraScadenza !== undefined ? { oraScadenza: patch.oraScadenza || null } : {}),
      ...(patch.operatoreAssegnatoId !== undefined
        ? { operatoreAssegnatoId: patch.operatoreAssegnatoId }
        : {}),
    };
    try {
      const res = await fetch(`${API_URL}/consegne/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify(allowedPatch),
      });
      if (!res.ok) {
        showToast('Impossibile salvare la consegna');
        return false;
      }
      await res.json();
      if (sessionEpoch !== sessionEpochRef.current) return false;
      refreshConsegnaViews();
      showToast('Consegna aggiornata');
      return true;
    } catch {
      showToast('Impossibile salvare la consegna');
      return false;
    }
  }

  function updateConsegnaStato(id: string, stato: Consegna['stato']): Promise<boolean> {
    return updateConsegna(id, { stato });
  }

  async function deleteConsegna(id: string): Promise<void> {
    const sessionEpoch = sessionEpochRef.current;
    try {
      const res = await fetch(`${API_URL}/consegne/${id}`, {
        method: 'DELETE',
        headers: operatorHeaders(),
      });
      if (!res.ok) {
        showToast('Impossibile eliminare la consegna');
        return;
      }
      if (sessionEpoch === sessionEpochRef.current) refreshConsegnaViews();
    } catch {
      showToast('Impossibile eliminare la consegna');
    }
  }

  // ── Appuntamenti CRUD (API-persisted — SPEC-015 US4) ───────────────────────

  /** POST /appointments; ritorna il messaggio di errore (mostrato nel form) o null se salvato. */
  async function addAppuntamento(apt: Omit<Appuntamento, 'id'>): Promise<string | null> {
    if (!apt.pazienteId) return 'Seleziona un paziente per l’appuntamento.';
    try {
      const res = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify({
          patientId: apt.pazienteId,
          operatorId: apt.operatoreId,
          operatorName: apt.operatoreNome,
          data: apt.data,
          ora: apt.ora,
          durata: apt.durata,
          tipologia: apt.tipoIntervento,
          note: apt.note,
          stato: apt.stato,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: { kind?: string; message?: string };
      } & Record<string, unknown>;
      if (res.status === 409)
        return body.error?.message ?? 'Slot già occupato: scegli un altro orario.';
      if (!res.ok) return body.error?.message ?? 'Impossibile salvare l’appuntamento.';
      setAppuntamenti((prev) => [...prev, mapAppointmentDTO(body)]);
      showToast('Appuntamento salvato');
      return null;
    } catch {
      return 'Errore di rete: appuntamento non salvato.';
    }
  }

  /** PATCH /appointments/:id; stessa convenzione di addAppuntamento: messaggio d'errore o null. */
  async function updateAppuntamento(
    id: string,
    apt: Omit<Appuntamento, 'id'>,
  ): Promise<string | null> {
    try {
      const res = await fetch(`${API_URL}/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify({
          operatorId: apt.operatoreId,
          data: apt.data,
          ora: apt.ora,
          durata: apt.durata,
          tipologia: apt.tipoIntervento,
          note: apt.note,
          stato: apt.stato,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: { kind?: string; message?: string };
      } & Record<string, unknown>;
      if (res.status === 409)
        return body.error?.message ?? 'Slot gia occupato: scegli un altro orario.';
      if (!res.ok) return body.error?.message ?? 'Impossibile aggiornare l’appuntamento.';
      const updated = mapAppointmentDTO(body);
      setAppuntamenti((prev) => prev.map((a) => (a.id === id ? updated : a)));
      showToast('Appuntamento aggiornato');
      return null;
    } catch {
      return 'Errore di rete: appuntamento non aggiornato.';
    }
  }

  /** DELETE /appointments/:id con rollback della lista se il server rifiuta. */
  async function deleteAppuntamento(id: string): Promise<void> {
    const snapshot = appuntamenti;
    setAppuntamenti((prev) => prev.filter((a) => a.id !== id));
    try {
      const res = await fetch(`${API_URL}/appointments/${id}`, {
        method: 'DELETE',
        headers: operatorHeaders(),
      });
      if (!res.ok) {
        setAppuntamenti(snapshot);
        showToast('Impossibile eliminare l’appuntamento');
        return;
      }
      showToast('Appuntamento eliminato');
    } catch {
      setAppuntamenti(snapshot);
      showToast('Impossibile eliminare l’appuntamento');
    }
  }

  // ── Camere CRUD ─────────────────────────────────────────────────────────────

  // Room CRUD now handled by RoomsManagement component directly via API

  // ── Schedules ───────────────────────────────────────────────────────────────

  // #285: persistiti su DB (upsert per operatore); lo stato locale segue la risposta del server.
  async function saveSchedule(s: ScheduleOperatore) {
    try {
      const res = await fetch(`${API_URL}/operators/${s.operatoreId}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify({ turni: s.turni, note: s.note }),
      });
      if (!res.ok) {
        showToast('Impossibile salvare gli orari');
        return;
      }
      const saved = (await res.json()) as ScheduleOperatore;
      setSchedules((prev) => {
        const idx = prev.findIndex((x) => x.operatoreId === saved.operatoreId);
        if (idx >= 0) return prev.map((x, i) => (i === idx ? saved : x));
        return [...prev, saved];
      });
      showToast('Orari salvati');
    } catch {
      showToast('Impossibile salvare gli orari');
    }
  }

  // ── Cartella CRUD (API-persisted) ─────────────────────────────────────────

  function getCartella(pazienteId: string): CartellaPaziente {
    return cartelle.find((c) => c.pazienteId === pazienteId) ?? createDefaultCartella(pazienteId);
  }

  async function loadCartella(pazienteId: string): Promise<void> {
    const sessionEpoch = patientNavigationSequenceRef.current;
    try {
      const res = await fetch(`${API_URL}/patients/${pazienteId}/cartella`, {
        headers: operatorHeaders(),
      });
      if (!res.ok) return;
      const json = (await res.json()) as { patientId: string; data: CartellaPaziente | null };
      if (sessionEpoch !== patientNavigationSequenceRef.current) return;
      if (json.data) {
        setCartelle((prev) => {
          const idx = prev.findIndex((c) => c.pazienteId === pazienteId);
          const base = createDefaultCartella(pazienteId);
          const baseRec = base as unknown as Record<string, unknown>;
          const merged = { ...base, ...json.data, pazienteId } as unknown as Record<
            string,
            unknown
          >;
          // Defensive: a clinical-list field stored as a non-array (e.g. an object written by an
          // older import) must never reach the UI — coerce it back to the default array so
          // `.filter`/`.map` never crash the patient record.
          for (const k of Object.keys(baseRec)) {
            if (Array.isArray(baseRec[k]) && !Array.isArray(merged[k])) merged[k] = baseRec[k];
          }
          const safe = merged as unknown as CartellaPaziente;
          if (idx >= 0) return prev.map((c, i) => (i === idx ? safe : c));
          return [...prev, safe];
        });
      }
    } catch {
      if (sessionEpoch === patientNavigationSequenceRef.current) {
        showToast('Impossibile caricare la cartella clinica');
      }
    }
  }

  async function updateCartella(
    pazienteId: string,
    updates: Partial<CartellaPaziente>,
  ): Promise<boolean> {
    const existing =
      cartelle.find((c) => c.pazienteId === pazienteId) ?? createDefaultCartella(pazienteId);
    const updated = { ...existing, ...updates };

    // Optimistic update
    setCartelle((prev) => {
      const idx = prev.findIndex((c) => c.pazienteId === pazienteId);
      return idx >= 0 ? prev.map((c, i) => (i === idx ? updated : c)) : [...prev, updated];
    });

    // Persist to backend; return success so callers (e.g. inline edit) can react to failure.
    const dataToSave = Object.fromEntries(
      Object.entries(updated).filter(([key]) => key !== 'pazienteId'),
    );
    try {
      const r = await fetch(`${API_URL}/patients/${pazienteId}/cartella`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify({ data: dataToSave }),
      });
      if (r.ok) {
        showToast('Dati salvati correttamente');
        return true;
      }
      showToast('Impossibile salvare i dati');
      return false;
    } catch {
      showToast('Impossibile salvare i dati');
      return false;
    }
  }

  // ── Issue #128: sincronizza l'assegnazione camera reale (letti/PatientRoomAssignment) ──
  // La cartella (JSON) conserva solo cameraNumero/lettoNumero visuali: l'occupazione
  // vera vive nelle assegnazioni letto. Senza questa sync la camera restava "libera".
  async function syncCameraAssignment(
    pazienteId: string,
    cameraNumero?: string,
    lettoNumero?: string,
  ): Promise<{ ok: boolean; lettoLabel?: string }> {
    try {
      const today = localIsoDate();
      const assignRes = await fetch(`${API_URL}/patients/${pazienteId}/room-assignments`, {
        headers: operatorHeaders(),
      });
      const assignments: Array<{ id: string; bedId: string; endDate: string | null }> = assignRes.ok
        ? await assignRes.json()
        : [];
      const active = assignments.find((a) => a.endDate === null || a.endDate >= today);

      // Camera rimossa → chiudi l'assegnazione attiva
      if (!cameraNumero) {
        if (active) {
          await fetch(`${API_URL}/patients/${pazienteId}/room-assignments/${active.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
            body: JSON.stringify({ endDate: today }),
          });
          loadCamere();
        }
        return { ok: true };
      }

      const roomsRes = await fetch(`${API_URL}/admin/rooms`, { headers: operatorHeaders() });
      const rooms: Array<{
        id: string;
        numero: string;
        beds: Array<{
          id: string;
          label: string;
          stato: string;
          assignments: Array<{ patientId: string }>;
        }>;
      }> = roomsRes.ok ? await roomsRes.json() : [];
      const room = rooms.find((r) => r.numero === cameraNumero);
      if (!room) {
        showToast(`Camera ${cameraNumero} non trovata`);
        return { ok: false };
      }

      const isFree = (bd: { stato: string; assignments: Array<{ patientId: string }> }) =>
        bd.stato !== 'manutenzione' && bd.assignments.every((a) => a.patientId === pazienteId);
      const wanted = (lettoNumero ?? '').trim().toUpperCase();
      const byIndex = /^\d+$/.test(wanted) ? 'ABCDEFGH'[parseInt(wanted, 10) - 1] : undefined;
      let bed = room.beds.find(
        (bd) =>
          bd.label.toUpperCase() === wanted || (byIndex !== undefined && bd.label === byIndex),
      );
      if (bed && !isFree(bed)) {
        showToast(`Letto ${bed.label} già occupato nella camera ${cameraNumero}`);
        return { ok: false };
      }
      if (!bed) bed = room.beds.find(isFree);
      if (!bed) {
        showToast(`Camera ${cameraNumero} occupata: nessun letto libero`);
        return { ok: false };
      }

      if (active && active.bedId === bed.id) return { ok: true, lettoLabel: bed.label };

      const res = await fetch(`${API_URL}/patients/${pazienteId}/room-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify({ bedId: bed.id, startDate: today }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        showToast(err?.error ?? 'Impossibile assegnare la camera');
        return { ok: false };
      }
      loadCamere();
      return { ok: true, lettoLabel: bed.label };
    } catch {
      showToast('Impossibile assegnare la camera');
      return { ok: false };
    }
  }

  async function updatePaziente(id: string, updates: Partial<Pick<Paziente, 'email' | 'phone'>>) {
    setPazienteSelezionato((current) =>
      current?.id === id ? { ...current, ...updates } : current,
    );
    try {
      const res = await fetch(`${API_URL}/patients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify(updates),
      });
      if (res.ok) showToast('Dati paziente aggiornati');
      else showToast('Impossibile aggiornare il paziente');
    } catch {
      showToast('Impossibile aggiornare il paziente');
    }
  }

  // ── Navigate to patient by name ─────────────────────────────────────────────

  async function goToPazienteByNome(nome: string, patientId?: string) {
    if (patientId) {
      await selectPazienteById(patientId);
      return;
    }
    if (!nome) return;
    const request = ++patientNavigationSequenceRef.current;
    const normalizeName = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('it-IT')
        .replace(/[,\s]+/g, ' ')
        .trim();
    const q = normalizeName(nome);
    try {
      const page = await fetchPatientPage(
        API_URL,
        { q: nome, limit: 25 },
        {
          headers: operatorHeaders(),
        },
      );
      const exact = page.items.filter((patient) => {
        const firstLast = normalizeName(`${patient.firstName} ${patient.lastName}`);
        const lastFirst = normalizeName(`${patient.lastName} ${patient.firstName}`);
        return q === firstLast || q === lastFirst;
      });
      if (request !== patientNavigationSequenceRef.current) return;
      if (exact.length === 1 && !page.hasMore) selectPaziente(exact[0]);
      else if (page.hasMore) showToast('Ricerca non univoca: usa il codice MRN del paziente');
      else if (exact.length > 1)
        showToast('Più pazienti hanno questo nome: usa la ricerca per MRN');
      else showToast('Paziente non trovato');
    } catch {
      if (request === patientNavigationSequenceRef.current) {
        showToast('Ricerca paziente non disponibile');
      }
    }
  }

  // ── Note CRUD ───────────────────────────────────────────────────────────────

  // ── Note / Messaggi CRUD (API-persisted) ──────────────────────────────────

  async function addNota(n: Omit<Nota, 'id' | 'createdAt'>): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify({
          destinatarioId: n.destinatarioId,
          pazienteId: n.pazienteId ?? null,
          priorita: n.priorita,
          messaggio: n.messaggio,
        }),
      });
      if (!res.ok) {
        showToast('Impossibile inviare la nota');
        return false;
      }
      await res.json();
      await loadNotes(notesQueryRef.current);
      showToast('Nota inviata');
      return true;
    } catch {
      showToast('Impossibile inviare la nota');
      return false;
    }
  }

  async function updateNota(id: string, patch: Partial<Nota>): Promise<boolean> {
    const snapshot = note;
    const mutationSession = sessionEpochRef.current;
    const mutationQuery = notesQueryRef.current;
    const mutationRequest = notesRequestSequenceRef.current;
    setNote((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    try {
      const res = await fetch(`${API_URL}/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify({
          ...(patch.destinatarioId !== undefined ? { destinatarioId: patch.destinatarioId } : {}),
          ...(patch.pazienteId !== undefined ? { pazienteId: patch.pazienteId ?? null } : {}),
          ...(patch.priorita !== undefined ? { priorita: patch.priorita } : {}),
          ...(patch.messaggio !== undefined ? { messaggio: patch.messaggio } : {}),
          ...(patch.stato !== undefined ? { stato: patch.stato } : {}),
        }),
      });
      if (mutationSession !== sessionEpochRef.current) return false;
      if (!res.ok) {
        if (
          mutationQuery === notesQueryRef.current &&
          mutationRequest === notesRequestSequenceRef.current
        ) {
          setNote(snapshot);
        } else {
          void loadNotes(notesQueryRef.current);
        }
        showToast('Impossibile salvare la nota');
        return false;
      }
      const updated = (await res.json()) as Nota;
      setNote((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...updated,
                pazienteId: updated.pazienteId ?? undefined,
                pazienteNome: updated.pazienteNome ?? undefined,
              }
            : n,
        ),
      );
      await loadNotes(notesQueryRef.current);
      return true;
    } catch {
      if (mutationSession !== sessionEpochRef.current) return false;
      if (
        mutationQuery === notesQueryRef.current &&
        mutationRequest === notesRequestSequenceRef.current
      ) {
        setNote(snapshot);
      } else {
        void loadNotes(notesQueryRef.current);
      }
      showToast('Impossibile salvare la nota');
      return false;
    }
  }

  function updateNotaStato(id: string, stato: StatoNota): Promise<boolean> {
    return updateNota(id, { stato });
  }

  // ── Therapy CRUD (API-persisted with optimistic update) ─────────────────────

  async function confirmTherapy(info: {
    patientId: string;
    therapyId: string;
    drugName: string;
    dosage: string;
    route: string;
    fascia: string;
    ora: string;
  }) {
    const now = new Date();
    setTherapySlots((prev) =>
      prev.map((slot) => {
        if (slot.fascia !== info.fascia) return slot;
        return {
          ...slot,
          summary: {
            ...slot.summary,
            administered: slot.summary.administered + 1,
            pending: Math.max(0, slot.summary.pending - 1),
          },
          patients: slot.patients.map((p: TherapySlotPatient) => {
            if (p.patientId !== info.patientId) return p;
            return {
              ...p,
              administrations: p.administrations.map((a: TherapyAdministration) =>
                a.therapyId === info.therapyId
                  ? {
                      ...a,
                      status: 'administered' as const,
                      administeredAt: now.toISOString(),
                      administeredBy: utente?.nome ?? '',
                    }
                  : a,
              ),
            };
          }),
        };
      }),
    );

    try {
      const res = await fetch(`${API_URL}/therapy-slots/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify({
          patientId: info.patientId,
          farmacoNome: info.drugName,
          farmacoDose: info.dosage,
          farmacoVia: info.route,
          date: localIsoDate(now),
          fascia: info.fascia,
          ora: info.ora,
          operatoreId: utente?.id ?? '',
          operatoreNome: utente?.nome ?? '',
          therapyId: info.therapyId,
        }),
      });

      invalidateCachedGet(`${API_URL}/therapy-slots`); // mutazione: il prossimo load rilegge dal server
      if (res.status === 409) {
        showToast('Terapia già erogata');
        loadTherapySlots();
        return;
      }
      if (res.ok) {
        showToast('Somministrazione confermata');
        loadTherapySlots();
      } else {
        showToast('Errore durante conferma');
        loadTherapySlots();
      }
    } catch {
      showToast('Errore di rete');
      loadTherapySlots();
    }
  }

  async function notAdministeredTherapy(
    info: {
      patientId: string;
      therapyId: string;
      drugName: string;
      dosage: string;
      route: string;
      fascia: string;
      ora: string;
    },
    motivo: MotivoNonErogazione,
    noteText: string,
  ) {
    const now = new Date();
    setTherapySlots((prev) =>
      prev.map((slot) => {
        if (slot.fascia !== info.fascia) return slot;
        return {
          ...slot,
          summary: {
            ...slot.summary,
            notAdministered: slot.summary.notAdministered + 1,
            pending: Math.max(0, slot.summary.pending - 1),
          },
          patients: slot.patients.map((p: TherapySlotPatient) => {
            if (p.patientId !== info.patientId) return p;
            return {
              ...p,
              administrations: p.administrations.map((a: TherapyAdministration) =>
                a.therapyId === info.therapyId
                  ? { ...a, status: 'not_administered' as const, notAdministeredReason: motivo }
                  : a,
              ),
            };
          }),
        };
      }),
    );

    try {
      const res = await fetch(`${API_URL}/therapy-slots/not-administered`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify({
          patientId: info.patientId,
          farmacoNome: info.drugName,
          farmacoDose: info.dosage,
          farmacoVia: info.route,
          date: localIsoDate(now),
          fascia: info.fascia,
          ora: info.ora,
          operatoreId: utente?.id ?? '',
          operatoreNome: utente?.nome ?? '',
          therapyId: info.therapyId,
          motivo,
          note: noteText,
        }),
      });

      invalidateCachedGet(`${API_URL}/therapy-slots`); // mutazione: il prossimo load rilegge dal server
      if (res.ok) {
        showToast('Non somministrazione registrata');
        loadTherapySlots();
      } else {
        showToast('Errore durante registrazione');
        loadTherapySlots();
      }
    } catch {
      showToast('Errore di rete');
      loadTherapySlots();
    }
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  const globalPatientSearch = usePatientDirectorySearch(searchQuery, {
    enabled: searchOpen,
    limit: 6,
  });
  const searchResults = globalPatientSearch.results;

  const utenteId = utente?.id ?? '';
  const isAdmin = utente?.ruolo === 'admin';

  // ── Login gate ──────────────────────────────────────────────────────────────

  if (!utente) return <Login onLogin={handleLogin} />;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className={`app-shell${mobileNavOpen ? ' app-shell--nav-open' : ''}`}>
      {/* Scrim per il drawer di navigazione mobile (≤1023px) */}
      {mobileNavOpen && (
        <div
          className="mobile-nav-scrim"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}
      {toastMsg && (
        <div className="app-toast app-toast--success" role="status">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMsg}</span>
          <button
            className="app-toast__close"
            onClick={() => setToastMsg(null)}
            aria-label="Chiudi"
          >
            ×
          </button>
        </div>
      )}

      {/* Teams-style sidebar */}
      <TeamsLikeSidebar
        activeKey={navKey}
        utente={utente}
        onNavigate={(k) => navigate(k)}
        onLogout={handleLogout}
        unreadNotes={notesUnreadCount}
      />

      {/* Main */}
      <div className="main-area-clean">
        {/* Compact Topbar */}
        <div className="compact-topbar">
          <button
            type="button"
            className="topbar-hamburger"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label={mobileNavOpen ? 'Chiudi menu' : 'Apri menu'}
            aria-expanded={mobileNavOpen}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <button
            type="button"
            className="topbar-search"
            onClick={() => setSearchOpen(true)}
            title="Cerca (Ctrl+K)"
          >
            <IcoSearch />
            <span className="topbar-search__ph">Cerca paziente, camera, MRN…</span>
            <kbd className="topbar-search__kbd">/</kbd>
          </button>
          {utente && (
            <div className="topbar-ctx">
              <span className="topbar-shift">
                <span className="topbar-shift__dot" aria-hidden="true" />
                {utente.reparto}
              </span>
              <div className="topbar-user">
                <span className="topbar-user__avatar" aria-hidden="true">
                  {utente.iniziali}
                </span>
                <span className="topbar-user__meta">
                  <span className="topbar-user__name">{utente.nome}</span>
                  <span className="topbar-user__role">
                    {utente.ruolo === 'admin' ? 'Amministratore' : 'Operatore'}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Search overlay */}
        {searchOpen && (
          <div className="search-overlay" onClick={() => setSearchOpen(false)}>
            <div className="search-modal" onClick={(e) => e.stopPropagation()}>
              <div className="search-modal__input-wrap">
                <IcoSearch />
                <input
                  ref={searchRef}
                  className="search-modal__input"
                  type="search"
                  placeholder="Cerca paziente per nome o MRN…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  maxLength={80}
                />
                <button className="icon-btn" onClick={() => setSearchOpen(false)}>
                  <IcoX />
                </button>
              </div>
              {searchResults.length > 0 && (
                <ul className="search-modal__results">
                  {searchResults.map((p) => (
                    <li key={p.id}>
                      <button
                        className="search-modal__result-item"
                        onClick={() => {
                          selectPaziente(p);
                          setSearchOpen(false);
                          setSearchQuery('');
                        }}
                      >
                        <span
                          className="op-avatar-sm"
                          style={{ width: 32, height: 32, fontSize: 12 }}
                          aria-hidden="true"
                        >
                          {p.firstName[0]}
                          {p.lastName[0]}
                        </span>
                        <div>
                          <span className="search-result__name">
                            {p.lastName}, {p.firstName}
                          </span>
                          <span className="search-result__mrn">{p.medicalRecordNumber}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {globalPatientSearch.loading && (
                <p className="search-modal__empty" role="status">
                  Ricerca in corso…
                </p>
              )}
              {globalPatientSearch.error && (
                <p className="search-modal__empty" role="alert">
                  {globalPatientSearch.error}
                </p>
              )}
              {searchQuery.trim().length > 1 &&
                !globalPatientSearch.loading &&
                !globalPatientSearch.error &&
                searchResults.length === 0 && (
                  <p className="search-modal__empty">Nessun paziente trovato.</p>
                )}
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="page-content content-panel">
          <LazyLoadBoundary>
            <Suspense fallback={<PageLoading />}>
              {/* ── ADMIN ── */}
              {isAdmin && navKey === 'admin-dashboard' && (
                <AdminDashboard
                  operatori={operatori}
                  consegneOverview={consegneOverview}
                  consegneOverviewState={consegneOverviewState}
                  camere={camere}
                  totalePazienti={clinicalOverview?.totalPatients ?? 0}
                  loadingPazienti={loadingClinicalOverview}
                  onNavigate={navigate}
                  onOpenConsegneAperte={openConsegneAperte}
                  onSelectPaziente={goToPazienteByNome}
                  clinicalOverview={clinicalOverview}
                />
              )}
              {isAdmin && navKey === 'gestione-operatori' && (
                <OperatorManagement
                  operatori={operatori}
                  onAdd={addOperatore}
                  onUpdate={updateOperatore}
                  onToggleStato={toggleStatoOperatore}
                />
              )}
              {isAdmin && navKey === 'agenda-admin' && (
                <AdminAgenda
                  operatori={operatori}
                  appuntamenti={appuntamenti}
                  onAddAppuntamento={addAppuntamento}
                  onUpdateAppuntamento={updateAppuntamento}
                  onDeleteAppuntamento={deleteAppuntamento}
                  loadingAppuntamenti={loadingAppuntamenti}
                  appointmentLoadError={appointmentLoadError}
                  onRetryAppointments={retryAppointmentRange}
                  onLoadAppointments={loadAppointmentRange}
                  onAddPaziente={() => {}}
                  onSelectPaziente={goToPazienteByNome}
                  therapySlots={therapySlots}
                  loadingTherapySlots={loadingTherapySlots}
                  therapyLoadError={therapyLoadError}
                  onRetryTherapySlots={retryTherapySlots}
                  onLoadTherapySlots={loadTherapySlots}
                />
              )}
              {isAdmin && navKey === 'posti-letto' && <RoomsManagement />}
              {isAdmin && navKey === 'orari-operatori' && (
                <OperatorSchedule
                  operatori={operatori}
                  schedules={schedules}
                  onSave={saveSchedule}
                />
              )}

              {/* ── SHARED ── */}
              {navKey === 'consegne' && (
                <ConsegnePage
                  consegne={consegne}
                  summary={consegneSummary}
                  operatori={operatori}
                  operatoreId={utenteId}
                  isAdmin={isAdmin}
                  onAdd={addConsegna}
                  onUpdate={updateConsegna}
                  onUpdateStato={updateConsegnaStato}
                  onDelete={deleteConsegna}
                  loading={loadingConsegne}
                  loadError={consegneLoadError}
                  hasMore={consegnePageInfo.hasMore}
                  onQueryChange={loadConsegne}
                  onLoadMore={() => void loadConsegne(consegneQueryRef.current, true)}
                  onRetry={() => void loadConsegne(consegneQueryRef.current)}
                  onSelectPaziente={goToPazienteByNome}
                  initialFiltroStato={consegneView.filtro}
                  focusId={consegneView.focusId}
                />
              )}
              {navKey === 'note' && (
                <NotesPage
                  note={note}
                  utenteId={utenteId}
                  utenteNome={utente.nome}
                  isAdmin={isAdmin}
                  operatori={operatori}
                  loading={loadingNotes}
                  loadError={notesLoadError}
                  unreadCount={notesUnreadCount}
                  hasMore={notesPageInfo.hasMore}
                  onAdd={addNota}
                  onUpdate={updateNota}
                  onUpdateStato={updateNotaStato}
                  onQueryChange={loadNotes}
                  onLoadMore={() => void loadNotes(notesQueryRef.current, true)}
                  onRetry={() => void loadNotes(notesQueryRef.current)}
                />
              )}

              {/* ── OPERATOR ── */}
              {!isAdmin && navKey === 'operator-dashboard' && (
                <OperatorDashboard
                  utente={utente}
                  consegneOverview={consegneOverview}
                  consegneOverviewState={consegneOverviewState}
                  agenda={agendaOggi}
                  totalePazienti={clinicalOverview?.totalPatients ?? 0}
                  loadingPazienti={loadingClinicalOverview}
                  onNavigate={navigate}
                  onOpenConsegneAperte={openConsegneAperte}
                  onSelectPaziente={goToPazienteByNome}
                  clinicalOverview={clinicalOverview}
                />
              )}
              {!isAdmin && navKey === 'pazienti' && (
                <PatientList
                  totalPatients={clinicalOverview?.totalPatients ?? 0}
                  ricerca={pazientiRicerca}
                  onRicercaChange={setPazientiRicerca}
                  filtroSesso={pazientiFiltroSesso}
                  onFiltroSessoChange={setPazientiFiltroSesso}
                  onSelect={selectPaziente}
                  operatorId={utente?.id}
                  operatorRole={utente?.ruolo}
                  onDeleted={(patientId) => {
                    setPazienteSelezionato((current) =>
                      current?.id === patientId ? null : current,
                    );
                  }}
                  onImported={(patientId, moduleTabId) => {
                    // La lista ricarica gia' la propria pagina. Per navigare a un paziente appena
                    // creato basta un lookup puntuale: non scaricare di nuovo l'intero roster.
                    if (!patientId) return;
                    const tab =
                      moduleTabId && MODULE_TAB_IDS.includes(moduleTabId as TabId)
                        ? (moduleTabId as TabId)
                        : undefined;
                    void selectPazienteById(patientId, tab);
                  }}
                />
              )}
              {navKey === 'dettaglio-paziente' &&
                !pazienteSelezionato &&
                restoringPazienteFromHash && (
                  <div
                    style={{
                      padding: '48px 32px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <p style={{ fontSize: 16 }}>Caricamento scheda paziente…</p>
                  </div>
                )}
              {navKey === 'dettaglio-paziente' &&
                !pazienteSelezionato &&
                !restoringPazienteFromHash && (
                  <div
                    style={{
                      padding: '48px 32px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <p style={{ fontSize: 16, marginBottom: 16 }}>Nessun paziente selezionato.</p>
                    <button className="btn-primary" onClick={() => goBack('pazienti')}>
                      Vai alla lista pazienti
                    </button>
                  </div>
                )}
              {navKey === 'dettaglio-paziente' && pazienteSelezionato && (
                <PatientDetail
                  paziente={pazienteSelezionato}
                  cartella={getCartella(pazienteSelezionato.id)}
                  consegne={patientConsegne}
                  consegneSummary={patientConsegneSummary}
                  consegneLoading={loadingPatientConsegne}
                  consegneError={patientConsegneError}
                  consegneHasMore={patientConsegnePageInfo.hasMore}
                  onLoadMoreConsegne={() => void loadPatientConsegne(pazienteSelezionato.id, true)}
                  onRetryConsegne={() => void loadPatientConsegne(pazienteSelezionato.id)}
                  operatori={operatori}
                  camere={camere}
                  onBack={() => goBack('pazienti')}
                  backLabel={NAV_LABELS[prevNavKeyRef.current ?? 'pazienti']}
                  onAddConsegna={addConsegna}
                  onUpdateConsegnaStato={updateConsegnaStato}
                  onUpdateCartella={updateCartella}
                  onUpdatePaziente={updatePaziente}
                  onAssignCamera={syncCameraAssignment}
                  operatoreNome={utente.nome}
                  operatoreId={utenteId}
                  initialTab={pendingModuleTab}
                  operatoreRole={utente?.ruolo}
                />
              )}
              {!isAdmin && navKey === 'anagrafica-farmaci' && <AnagraficaFarmaciPage />}
              {!isAdmin && navKey === 'parametri-multipaziente' && (
                <MultiPatientParametri
                  operatoreNome={utente.nome}
                  onSelectPaziente={(patientId) => void selectPazienteById(patientId)}
                />
              )}
              {!isAdmin && navKey === 'agenda-operatore' && (
                <OperatorAgenda
                  operatoreId={utenteId}
                  nomeOperatore={utente.nome}
                  operatori={operatori}
                  appuntamenti={appuntamenti}
                  onAddAppuntamento={addAppuntamento}
                  onUpdateAppuntamento={updateAppuntamento}
                  onDeleteAppuntamento={deleteAppuntamento}
                  loadingAppuntamenti={loadingAppuntamenti}
                  appointmentLoadError={appointmentLoadError}
                  onRetryAppointments={retryAppointmentRange}
                  onLoadAppointments={loadAppointmentRange}
                  onSelectPaziente={goToPazienteByNome}
                  therapySlots={therapySlots}
                  loadingTherapySlots={loadingTherapySlots}
                  therapyLoadError={therapyLoadError}
                  onRetryTherapySlots={retryTherapySlots}
                  onConfirmTherapy={confirmTherapy}
                  onNotAdministeredTherapy={notAdministeredTherapy}
                  onLoadTherapySlots={loadTherapySlots}
                />
              )}
            </Suspense>
          </LazyLoadBoundary>
        </main>
      </div>

      {aiLoaded ? (
        <LazyLoadBoundary>
          <Suspense
            fallback={
              <button type="button" className="ai-fab" disabled aria-label="Caricamento assistente">
                <IcoAI />
              </button>
            }
          >
            <AgnosPanel
              key={aiOpenTrigger}
              forceOpen={aiOpen}
              onClose={() => setAiOpen(false)}
              operatorId={utente?.id}
              operatorRole={utente?.ruolo}
              operatorName={utente?.nome}
              currentPatientId={
                navKey === 'dettaglio-paziente' ? pazienteSelezionato?.id : undefined
              }
              currentPatientName={
                navKey === 'dettaglio-paziente' && pazienteSelezionato
                  ? `${pazienteSelezionato.lastName ?? ''} ${pazienteSelezionato.firstName ?? ''}`.trim()
                  : undefined
              }
              onExecuted={(info) => {
                if (pazienteSelezionato) loadCartella(pazienteSelezionato.id);
                // SPEC-015 US4: un'azione Agnos sull'agenda aggiorna subito la lista appuntamenti (FR-020)
                if (
                  info?.actionType === 'create_appointment' ||
                  info?.actionType === 'update_appointment'
                )
                  void loadAppuntamenti(appointmentRangeRef.current);
                // Agnos invalidates the same bounded feed/overview/patient read models as the UI.
                if (info?.actionType === 'create_consegna') refreshConsegnaViews();
              }}
              navKey={navKey}
              resolvePatientName={(id) => {
                const patient = pazienteSelezionato?.id === id ? pazienteSelezionato : null;
                return patient
                  ? `${patient.lastName ?? ''} ${patient.firstName ?? ''}`.trim()
                  : undefined;
              }}
              onNavigate={(nav) => {
                void agnosNavigate(nav);
              }}
            />
          </Suspense>
        </LazyLoadBoundary>
      ) : (
        <button
          type="button"
          className="ai-fab"
          onClick={openAiAssistant}
          aria-label="Assistente virtuale ClinicOS"
          title="Assistente virtuale ClinicOS"
        >
          <IcoAI />
        </button>
      )}
    </div>
  );
}
