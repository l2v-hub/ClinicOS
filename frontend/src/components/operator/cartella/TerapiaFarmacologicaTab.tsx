// Calendario: slot compatti e popup per le somministrazioni; gli slot vuoti aprono il form
// di prescrizione solo con therapy.create. Piano terapeutico contiene tutti i farmaci attivi.
// • Storico: com'è andata — somministrazioni nel tempo con filtri; «sospese/concluse» è un filtro.
// • Nuova terapia: la stessa maschera di registrazione usata dalla popup dello slot.
// I vecchi collegamenti (attivi, programmazione, giornaliere, sospese) atterrano sulle nuove viste;
// la vista scelta resta nell'URL (ricarica e Indietro la riaprono).
import { lazy, Suspense, useState, useEffect, useCallback, useRef, useId } from 'react';
import { AccessibleDialogSurface } from '../../shared/AccessibleDialogSurface';
import { therapyFormAtCalendarSlot } from '../../../lib/therapyCalendarCreate';
import { createSubmissionKey } from '../../../lib/submissionKey';
import type { Paziente, PatientTherapyAPI } from '../../../types';
import type { TherapyTarget, TherapyView } from '../../../lib/patientTarget';
import { API_URL } from '../../../config';
import { IcoCheck } from '../../../icons';
import { invalidateCachedGet } from '../../../lib/cachedFetch';
import {
  invalidateSessionCache,
  readSessionCache,
  writeSessionCache,
} from '../../../lib/sessionCache';
import {
  sortTherapiesByState,
  therapyListCacheKey as therapyCacheKey,
  type TherapyListSnapshot,
} from '../../../lib/patientTabSnapshots';
import { loadTherapyPage } from '../../../lib/therapyPages';
import { operatorHeaders } from '../../../lib/operatorSession';
import { useCan } from '../../../lib/capabilities';
import { rememberTherapyView } from '../../../lib/patientTargetHash';
import {
  doseTimeOf,
  therapyLanding,
  therapySubViewOf,
  type HistoryStatus,
} from '../../../lib/therapyView';
import { ClinicalTableSection, LoadingState } from './shared';
import { LoadErrorState } from './LoadErrorState';
import { PatientTherapyCalendar } from './PatientTherapyCalendar';
import { TherapyDrugList, TherapyPrescriptionDetail } from './TherapyDrugList';
import { TherapyHistoryView } from './TherapyHistoryView';
import { TherapyFormFields, emptyTherapyForm, type TherapyFormValue } from './TherapyFormFields';
import { therapyToForm, formToPayload } from './therapyFormMapping';
import {
  therapyFormIssues,
  therapyIssuesSummary,
  therapySaveErrorMessage,
} from './therapySaveFeedback';
import { ConfirmDialog } from '../../shared/ConfirmDialog';
import { TopNav, type TopNavItem } from '../../navigation/TopNav';
import { useRisoluzioniFarmaco, trovaRisoluzione, etichettaDocumento } from './farmacoRiferimento';
import type { DocumentoFarmaco, FarmacoTrovato } from './farmacoRiferimento';
// Il visore del foglio illustrativo trascina lo stack PDF (~1,7 MB): resta fuori dal chunk del
// tab e si scarica solo alla prima apertura di un documento.
const VisoreDocumentoFarmaco = lazy(() =>
  import('./VisoreDocumentoFarmaco').then((m) => ({ default: m.VisoreDocumentoFarmaco })),
);
import { RicercaFarmacoModal } from './RicercaFarmaco';
import type { PrescrizioneDaAbbinare } from './farmacoCorrispondenza';
import './TherapyRowFocus.css';
import './TherapyViews.css';

const STATO_ORDER: Record<string, number> = { attiva: 0, sospesa: 1, conclusa: 2 };

interface Props {
  paziente: Paziente;
  operatoreNome: string;
  /** Diario terapia: farmaco da aprire ed evidenziare. Se non e' fra le terapie caricate, la
   *  scheda si apre normalmente, senza errori. */
  focusTherapyId?: string;
  /**
   * Accesso diretto: vista (nuova o del ciclo 1), giorno, fascia e farmaco su cui atterrare; un
   * nuovo `requestId` riapplica lo stesso bersaglio.
   */
  therapyTarget?: TherapyTarget & { requestId: number };
}

type TherapyForm = TherapyFormValue;
type CalendarFocus = { requestId: number; date?: string; time?: string };

export function TerapiaFarmacologicaTab({
  paziente,
  operatoreNome,
  focusTherapyId,
  therapyTarget,
}: Props) {
  // La GUI nasconde la prescrizione se il ruolo non la consente (il backend la rifiuta comunque):
  // l'infermiere somministra dal calendario, il medico modifica / sospende dalla prescrizione.
  const canCreateTherapy = useCan('therapy.create');
  const canUpdateTherapy = useCan('therapy.update');
  const canDeleteTherapy = useCan('therapy.delete');

  const [view, setView] = useState<TherapyView>(
    () => therapyLanding(therapyTarget?.subView, { canCreate: canCreateTherapy }).view,
  );
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>(
    () => therapyLanding(therapyTarget?.subView).historyStatus ?? 'tutte',
  );
  // Prescrizione aperta (una per volta) e farmaco evidenziato da un collegamento diretto.
  const [openDrugId, setOpenDrugId] = useState<string | null>(null);
  const [focusDrugId, setFocusDrugId] = useState<string | null>(null);
  const [scrollToDrug, setScrollToDrug] = useState(0);
  // Calendario: giorno/ora di arrivo da un collegamento diretto (rimonta il calendario).
  const [calendarFocus, setCalendarFocus] = useState<CalendarFocus | null>(null);
  const [calendarRefresh, setCalendarRefresh] = useState(0);

  // Ultimo elenco gia' mostrato per questo paziente in sessione: il tab si disegna subito con
  // quello e lo rivalida in background invece di ripartire da "Caricamento…".
  const initialSnapshot = readSessionCache<TherapyListSnapshot>(therapyCacheKey(paziente.id, {}));
  const [therapies, setTherapies] = useState<PatientTherapyAPI[]>(
    () => initialSnapshot?.therapies ?? [],
  );
  const [loading, setLoading] = useState(!initialSnapshot);
  const [nextTherapyCursor, setNextTherapyCursor] = useState<string | null>(
    initialSnapshot?.nextCursor ?? null,
  );
  const [loadingMoreTherapies, setLoadingMoreTherapies] = useState(false);
  const [therapySummary, setTherapySummary] = useState<{
    total: number;
    active: number;
    inactive: number;
  } | null>(initialSnapshot?.summary ?? null);
  const [error, setError] = useState('');
  const [therapyLoadError, setTherapyLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [createSlot, setCreateSlot] = useState<{ patientId: string; date: string; time: string } | null>(null);
  const createDialogTitle = useId();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TherapyForm>(emptyTherapyForm());
  const [saving, setSaving] = useState(false);
  const therapyLoadSequence = useRef(0);
  const activePatientId = useRef(paziente.id);
  const tabRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activePatientId.current = paziente.id;
  }, [paziente.id]);

  // ── Loaders ──────────────────────────────────────────────────────────────────

  // Dedup (015 T028): stessa GET condivisa con App.tsx/InvioPSModal nello stesso flusso.
  // Le mutazioni sotto invalidano prima di ricaricare.
  const invalidateTherapies = useCallback(() => {
    invalidateCachedGet(`${API_URL}/patients/${paziente.id}/therapies`);
    invalidateCachedGet(`${API_URL}/therapy-slots`);
    invalidateSessionCache(`therapies:${paziente.id}:`);
  }, [paziente.id]);

  const loadTherapies = useCallback(async () => {
    const sequence = ++therapyLoadSequence.current;
    const requestedPatientId = paziente.id;
    const cacheKey = therapyCacheKey(requestedPatientId, {});
    try {
      // Con un elenco gia' in cache la rivalidazione avviene senza svuotare l'elenco.
      setLoading(readSessionCache(cacheKey) === undefined);
      setLoadingMoreTherapies(false);
      setTherapyLoadError('');
      const page = await loadTherapyPage(requestedPatientId, 'tutte', null);
      if (
        sequence !== therapyLoadSequence.current ||
        activePatientId.current !== requestedPatientId
      ) {
        return;
      }
      const data = sortTherapiesByState(page.items);
      setTherapies(data);
      setNextTherapyCursor(page.pageInfo.nextCursor);
      setTherapySummary(page.summary);
      writeSessionCache<TherapyListSnapshot>(cacheKey, {
        therapies: data,
        nextCursor: page.pageInfo.nextCursor,
        summary: page.summary,
      });
    } catch (err) {
      if (
        sequence === therapyLoadSequence.current &&
        activePatientId.current === requestedPatientId
      ) {
        setTherapies([]);
        setNextTherapyCursor(null);
        setTherapySummary(null);
        setTherapyLoadError(
          err instanceof Error ? err.message : 'Impossibile caricare le terapie.',
        );
      }
    } finally {
      if (
        sequence === therapyLoadSequence.current &&
        activePatientId.current === requestedPatientId
      ) {
        setLoading(false);
      }
    }
  }, [paziente.id]);

  const loadMoreTherapies = useCallback(async () => {
    if (!nextTherapyCursor || loadingMoreTherapies) return;
    const sequence = ++therapyLoadSequence.current;
    const requestedPatientId = paziente.id;
    try {
      setLoadingMoreTherapies(true);
      setTherapyLoadError('');
      const page = await loadTherapyPage(requestedPatientId, 'tutte', nextTherapyCursor);
      if (
        sequence !== therapyLoadSequence.current ||
        activePatientId.current !== requestedPatientId
      ) {
        return;
      }
      setTherapies((current) => {
        const merged = new Map(current.map((therapy) => [therapy.id, therapy]));
        for (const therapy of page.items) merged.set(therapy.id, therapy);
        return [...merged.values()].sort(
          (a, b) => (STATO_ORDER[a.stato] ?? 9) - (STATO_ORDER[b.stato] ?? 9),
        );
      });
      setNextTherapyCursor(page.pageInfo.nextCursor);
    } catch (err) {
      if (
        sequence === therapyLoadSequence.current &&
        activePatientId.current === requestedPatientId
      ) {
        setTherapyLoadError(
          err instanceof Error ? err.message : 'Impossibile caricare altre terapie.',
        );
      }
    } finally {
      if (
        sequence === therapyLoadSequence.current &&
        activePatientId.current === requestedPatientId
      ) {
        setLoadingMoreTherapies(false);
      }
    }
  }, [loadingMoreTherapies, nextTherapyCursor, paziente.id]);

  useEffect(() => {
    void (async () => {
      await loadTherapies();
    })();
  }, [loadTherapies]);

  /** Dopo ogni modifica della prescrizione: elenco e calendario si rileggono. */
  const reloadAfterChange = async () => {
    invalidateTherapies();
    setCalendarRefresh((value) => value + 1);
    await loadTherapies();
  };

  // ── Viste ────────────────────────────────────────────────────────────────────

  /** Cambio di vista dell'operatore: la vista entra nell'URL (QA F2: ricarica e Indietro). */
  const showView = (next: TherapyView, status: HistoryStatus = historyStatus) => {
    // L'errore appartiene alla schermata che l'ha prodotto.
    setError('');
    setView(next);
    if (createSlot) closeForm();
    if (next !== 'attivi' && editId) closeForm();
    if (next === 'nuova' && (!showForm || editId || createSlot)) openAdd();
    rememberTherapyView(paziente.id, therapySubViewOf(next, status));
  };
  const changeHistoryStatus = (status: HistoryStatus) => {
    setHistoryStatus(status);
    rememberTherapyView(paziente.id, therapySubViewOf('storico', status));
  };
  const toggleDrug = (id: string) => {
    setFocusDrugId(null);
    setOpenDrugId((current) => (current === id ? null : id));
  };

  // ── Form ─────────────────────────────────────────────────────────────────────

  // Errori per campo: compaiono dopo il primo «Salva» e si aggiornano mentre si corregge.
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [saveError, setSaveError] = useState('');
  const formShellRef = useRef<HTMLDivElement>(null);
  const editFocusPending = useRef(false);
  useEffect(() => {
    if (!editFocusPending.current || !showForm || !editId || view !== 'attivi' || !canUpdateTherapy) return;
    const heading = formShellRef.current?.querySelector<HTMLElement>('h2');
    if (!heading) return;
    editFocusPending.current = false;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, [showForm, editId, view, canUpdateTherapy]);
  const formIssues = showForm && saveAttempted ? therapyFormIssues(form) : [];
  const resetSaveFeedback = () => {
    setSaveAttempted(false);
    setSaveError('');
  };

  function openAdd() {
    resetSaveFeedback();
    setEditId(null);
    setForm(emptyTherapyForm());
    setShowForm(true);
  }
  function openCalendarCreate(date: string, time: string) {
    if (!canCreateTherapy || saving) return;
    const initialized = therapyFormAtCalendarSlot(emptyTherapyForm(), date, time);
    if (!initialized) return;
    resetSaveFeedback();
    setEditId(null);
    setForm(initialized);
    setShowForm(true);
    setCreateSlot({ patientId: paziente.id, date, time });
  }
  const openEdit = (t: PatientTherapyAPI, exactTimesOnly = false) => {
    if (!canUpdateTherapy || saving || t.patientId !== paziente.id) return;
    resetSaveFeedback();
    editFocusPending.current = true;
    setCreateSlot(null);
    setEditId(t.id);
    setForm(therapyToForm(t, { exactTimesOnly }));
    setShowForm(true);
    setView('attivi');
    rememberTherapyView(paziente.id, 'attivi');
  };
  function openIncompleteEdit(t: PatientTherapyAPI) {
    openEdit(t, true);
  }
  function closeForm() {
    editFocusPending.current = false;
    resetSaveFeedback();
    setShowForm(false);
    setCreateSlot(null);
    setEditId(null);
    setForm(emptyTherapyForm());
  }
  useEffect(() => {
    if (showForm && (editId ? !canUpdateTherapy : !canCreateTherapy)) closeForm();
    if (!canUpdateTherapy) setPendingSospendiId(null);
    if (!canDeleteTherapy) setPendingDeleteId(null);
  }, [canCreateTherapy, canUpdateTherapy, canDeleteTherapy, showForm, editId]);
  useEffect(() => {
    if (createSlot && createSlot.patientId !== paziente.id) closeForm();
  }, [paziente.id, createSlot]);

  const [createKey] = useState(createSubmissionKey);
  const handleSave = async () => {
    if (saving || (editId ? !canUpdateTherapy : !canCreateTherapy)) return;
    if (createSlot && createSlot.patientId !== paziente.id) return;
    // Stesso controllo per campo dell'ingresso (campi obbligatori inclusi): il primo campo da
    // correggere riceve il fuoco invece di un pulsante disabilitato senza indicazioni sul campo.
    const issues = therapyFormIssues(form);
    setSaveAttempted(true);
    if (issues.length) {
      setSaveError('');
      window.requestAnimationFrame(() => {
        const first = formShellRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
        first?.focus({ preventScroll: true });
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    const payload = formToPayload(form, paziente.id, operatoreNome);
    const editing = editId;
    try {
      setSaving(true);
      setError('');
      setSaveError('');
      const url = editing
        ? `${API_URL}/patients/${paziente.id}/therapies/${editing}`
        : `${API_URL}/patients/${paziente.id}/therapies`;
      // Phase 6: a retried creation (lost response, double submit) reuses the same requestId →
      // the backend replays the first prescription instead of creating a duplicate.
      const body = editing ? payload : { ...payload, requestId: createKey.for(payload) };
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setSaveError(await therapySaveErrorMessage(res));
        return;
      }
      const saved = (await res.json().catch(() => null)) as { id?: unknown } | null;
      const savedId = editing ?? (typeof saved?.id === 'string' ? saved.id : null);
      createKey.reset();
      closeForm();
      await reloadAfterChange();
      // Il farmaco salvato si vede subito nell'elenco del calendario, aperto.
      setView('calendario');
      rememberTherapyView(paziente.id, 'calendario');
      if (savedId) {
        setOpenDrugId(savedId);
        setFocusDrugId(savedId);
        setScrollToDrug((value) => value + 1);
      }
    } catch {
      setSaveError('Terapia non salvata: errore di rete. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  // ── Azioni del prescrittore ──────────────────────────────────────────────────

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const confirmDelete = async () => {
    if (!pendingDeleteId || !canDeleteTherapy || deleting) return;
    setDeleting(true);
    try {
      setError('');
      const res = await fetch(`${API_URL}/patients/${paziente.id}/therapies/${pendingDeleteId}`, {
        method: 'DELETE',
        headers: operatorHeaders(),
      });
      if (!res.ok) throw new Error(await therapySaveErrorMessage(res, 'Terapia non eliminata'));
      setOpenDrugId(null);
      await reloadAfterChange();
      setPendingDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore eliminazione');
    } finally {
      setDeleting(false);
    }
  };

  // La sospensione ferma le somministrazioni future senza dirlo a nessuno, e il suo pulsante e'
  // accanto a Elimina: un clic sbagliato qui e' l'unico che non lascia traccia visibile.
  const [pendingSospendiId, setPendingSospendiId] = useState<string | null>(null);
  const [sospendendo, setSospendendo] = useState(false);
  const confirmSospendi = async () => {
    if (!pendingSospendiId || !canUpdateTherapy || sospendendo) return;
    setSospendendo(true);
    try {
      setError('');
      const res = await fetch(`${API_URL}/patients/${paziente.id}/therapies/${pendingSospendiId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify({ stato: 'sospesa' }),
      });
      if (!res.ok) throw new Error(await therapySaveErrorMessage(res, 'Terapia non sospesa'));
      setOpenDrugId(null);
      await reloadAfterChange();
      setPendingSospendiId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sospensione');
    } finally {
      setSospendendo(false);
    }
  };

  const handleRiattiva = async (t: PatientTherapyAPI) => {
    if (!canUpdateTherapy) return;
    try {
      setError('');
      const res = await fetch(`${API_URL}/patients/${paziente.id}/therapies/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify({ stato: 'attiva' }),
      });
      if (!res.ok) throw new Error(await therapySaveErrorMessage(res, 'Terapia non riattivata'));
      await reloadAfterChange();
      // Riattivata: torna fra i farmaci attivi del calendario, aperta.
      setView('calendario');
      rememberTherapyView(paziente.id, 'calendario');
      setOpenDrugId(t.id);
      setFocusDrugId(t.id);
      setScrollToDrug((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore riattivazione');
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────────

  const attive = therapies.filter((t) => t.stato === 'attiva');
  const inattive = therapies.filter((t) => t.stato !== 'attiva');

  // ── Accesso diretto: vista, giorno/ora e farmaco (riapplicato a ogni requestId) ──
  const [targetViewApplied, setTargetViewApplied] = useState<number | null>(null);
  const [handledTargetId, setHandledTargetId] = useState<number | null>(null);
  // 1) Vista, giorno e ora valgono subito (non servono le terapie caricate).
  if (therapyTarget && targetViewApplied !== therapyTarget.requestId) {
    setTargetViewApplied(therapyTarget.requestId);
    const landing = therapyLanding(therapyTarget.subView, {
      canCreate: canCreateTherapy,
      hasDrug: Boolean(therapyTarget.therapyId),
    });
    setView(landing.view);
    if (landing.historyStatus) setHistoryStatus(landing.historyStatus);
    if (landing.view === 'nuova' && !showForm) openAdd();
    setCalendarFocus(
      landing.openDose && (therapyTarget.date || therapyTarget.fascia)
        ? {
            requestId: therapyTarget.requestId,
            date: therapyTarget.date,
            time: doseTimeOf(therapyTarget.fascia),
          }
        : null,
    );
    setOpenDrugId(null);
    setFocusDrugId(therapyTarget.therapyId ?? null);
  }
  // 2) Il farmaco si apre appena compare fra le terapie caricate (se non c'e', nessun errore).
  const targetTherapy =
    therapyTarget?.therapyId && handledTargetId !== therapyTarget.requestId
      ? therapies.find((t) => t.id === therapyTarget.therapyId)
      : undefined;
  if (therapyTarget && targetTherapy) {
    setHandledTargetId(therapyTarget.requestId);
    const landing = therapyLanding(therapyTarget.subView, {
      canCreate: canCreateTherapy,
      drugState: targetTherapy.stato,
      hasDrug: true,
    });
    setView(landing.view);
    if (landing.historyStatus) setHistoryStatus(landing.historyStatus);
    if (landing.openDrug) {
      setOpenDrugId(targetTherapy.id);
      setScrollToDrug((value) => value + 1);
    }
    // fascia del server → ora reale della prescrizione (07:00 resta 07:00, non 08:00)
    if (landing.openDose && therapyTarget.fascia) {
      const time = doseTimeOf(therapyTarget.fascia, targetTherapy.schedules);
      if (time && time !== calendarFocus?.time)
        setCalendarFocus({ requestId: therapyTarget.requestId, date: therapyTarget.date, time });
    }
  }
  // Diario terapia («apri» dalla voce del diario): stesso atterraggio di un farmaco senza vista.
  const [diaryFocusHandled, setDiaryFocusHandled] = useState(false);
  const diaryTarget =
    focusTherapyId && !diaryFocusHandled && !therapyTarget
      ? therapies.find((t) => t.id === focusTherapyId)
      : undefined;
  if (diaryTarget) {
    setDiaryFocusHandled(true);
    const landing = therapyLanding(undefined, { drugState: diaryTarget.stato, hasDrug: true });
    setView(landing.view);
    if (landing.historyStatus) setHistoryStatus(landing.historyStatus);
    setOpenDrugId(diaryTarget.id);
    setFocusDrugId(diaryTarget.id);
    setScrollToDrug((value) => value + 1);
  }

  // La prescrizione aperta da un collegamento entra in vista (anche quando i dati arrivano dopo).
  const listReady = `${view}|${historyStatus}|${therapies.length}`;
  useEffect(() => {
    if (!scrollToDrug) return;
    const frame = window.requestAnimationFrame(() => {
      tabRootRef.current
        ?.querySelector('.tf-drugs__item.is-open, .therapy-list-row--focus')
        ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [scrollToDrug, listReady]);

  // Gli stessi campi che `handleSave` pretende, elencati per nome.
  const campiMancanti =
    [!form.farmacoNome.trim() && 'il prodotto medicinale', !form.dataInizio && 'la data di inizio']
      .filter((v): v is string => typeof v === 'string')
      .join(' e ') || null;

  // ── Anagrafica farmaci (AIFA) ─────────────────────────────────────────────────

  // Documenti ufficiali AIFA dei farmaci in terapia. L'operatore verifica la posologia sulla
  // fonte autorevole senza uscire dall'applicazione; ClinicOS non interpreta nulla.
  const risoluzioni = useRisoluzioniFarmaco(
    therapies.map((t) => ({
      farmacoNome: t.farmacoNome,
      dosaggio: t.dosaggio,
      viaSomministrazione: t.viaSomministrazione,
    })),
  );
  // AC7: farmaci in terapia che l'anagrafica non riconosce. W5: lo stato sta sulla riga del farmaco
  // (dove si corregge), non in un secondo avviso che ripete quello in testa alla cartella.
  const registryState = (t: PatientTherapyAPI) => {
    const stato = trovaRisoluzione(risoluzioni, t.farmacoNome, t.dosaggio?.trim() || null)?.stato;
    return stato === 'non-trovato' || stato === 'senza-documento' ? stato : null;
  };
  const lineBadge = (t: PatientTherapyAPI) => {
    const stato = registryState(t);
    return stato ? (
      <span className="ds-badge ds-badge--warning">
        {stato === 'non-trovato' ? 'non in anagrafica' : 'senza documento'}
      </span>
    ) : null;
  };
  /** Documento aperto nel visore, con la prescrizione che serve a riconoscerne la formulazione. */
  const [documentoAperto, setDocumentoAperto] = useState<{
    documento: DocumentoFarmaco;
    prescrizione: PrescrizioneDaAbbinare;
  } | null>(null);
  /** Nome da cui parte la ricerca quando il farmaco non e' in anagrafica. */
  const [ricercaPer, setRicercaPer] = useState<string | null>(null);
  const apriDocumentoDaRicerca = useCallback(
    (documento: DocumentoFarmaco, confezione: FarmacoTrovato) => {
      setRicercaPer(null);
      // La confezione arriva da una scelta esplicita dell'operatore: la sua forma e' un dato.
      setDocumentoAperto({
        documento,
        prescrizione: { dosaggio: confezione.descrizione, forma: confezione.forma },
      });
    },
    [],
  );

  /**
   * Nome del farmaco nella prescrizione, con accanto l'azione giusta per il suo stato in
   * anagrafica: documento apribile, farmaco senza documento, non trovato, anagrafica che non
   * risponde — tutti visibili.
   */
  const renderFarmaco = (t: PatientTherapyAPI) => {
    const v = t.farmacoNome;
    const dosaggio = t.dosaggio?.trim() ? t.dosaggio : null;
    const risoluzione = trovaRisoluzione(risoluzioni, v, dosaggio);
    return (
      <span className="tf-farmaco">
        <strong>{v}</strong>
        {risoluzione?.stato === 'trovato' && risoluzione.documento && (
          <button
            type="button"
            className="ds-icon-btn tf-farmaco__doc"
            title={etichettaDocumento(risoluzione.documento)}
            // Il nome accessibile porta la dose prescritta: due prescrizioni dello stesso farmaco a
            // dosaggi diversi non espongono due controlli con un nome identico.
            aria-label={`${etichettaDocumento(risoluzione.documento)} — ${
              dosaggio ? `dose prescritta ${dosaggio}` : 'dose non specificata'
            }`}
            onClick={() =>
              setDocumentoAperto({
                documento: risoluzione.documento!,
                prescrizione: { dosaggio, forma: risoluzione.confezione?.forma },
              })
            }
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M8 13h8M8 17h5" />
            </svg>
          </button>
        )}
        {(risoluzione?.stato === 'trovato' || risoluzione?.stato === 'senza-documento') && (
          <span className="farmaco-trovato" title="Farmaco presente nell'anagrafica AIFA">
            <span aria-hidden="true">
              <IcoCheck />
            </span>
            Trovato in AIFA
          </span>
        )}
        {(risoluzione?.stato === 'non-trovato' || risoluzione?.stato === 'senza-documento') && (
          <button
            type="button"
            className="ds-badge ds-badge--warning farmaco-non-trovato"
            aria-haspopup="dialog"
            onClick={() => setRicercaPer(v)}
            title={
              risoluzione.stato === 'non-trovato'
                ? `«${v}» non risulta in anagrafica AIFA: cerca il farmaco o il principio attivo`
                : `«${v}» è in anagrafica ma senza documento ufficiale: cerca un'altra confezione`
            }
          >
            {risoluzione.stato === 'non-trovato' ? 'non in anagrafica' : 'senza documento'}
          </button>
        )}
        {risoluzione?.stato === 'fonte-non-disponibile' && (
          <span
            className="ds-badge ds-badge--stale farmaco-non-trovato"
            title="L'anagrafica farmaci non ha risposto: non è detto che il farmaco sia assente"
          >
            anagrafica non raggiungibile
          </span>
        )}
      </span>
    );
  };

  const prescriptionActions = {
    canUpdate: canUpdateTherapy,
    canDelete: canDeleteTherapy,
    onEdit: openEdit,
    onSuspend: (t: PatientTherapyAPI) => setPendingSospendiId(t.id),
    onDelete: (t: PatientTherapyAPI) => setPendingDeleteId(t.id),
    onReactivate: (t: PatientTherapyAPI) => void handleRiattiva(t),
  };
  const renderDetail = (t: PatientTherapyAPI) => (
    <TherapyPrescriptionDetail therapy={t} name={renderFarmaco(t)} actions={prescriptionActions} />
  );

  const therapyPager = nextTherapyCursor ? (
    <div className="tf-pager">
      {therapyLoadError && therapies.length > 0 && (
        <p className="tf-pager__error" role="alert">{therapyLoadError}</p>
      )}
      <span>
        {therapies.length} di {therapySummary?.total ?? '—'} terapie caricate
      </span>
      <button
        type="button"
        className="ds-btn ds-btn--secondary"
        disabled={loadingMoreTherapies}
        onClick={() => void loadMoreTherapies()}
      >
        {loadingMoreTherapies ? 'Caricamento…' : 'Carica altre terapie'}
      </button>
    </div>
  ) : null;

  const listState = loading ? (
    <LoadingState />
  ) : therapyLoadError && therapies.length === 0 ? (
    <LoadErrorState
      message={therapyLoadError}
      onRetry={() => void loadTherapies()}
      retryLabel="Riprova"
    />
  ) : null;

  // ── Sub-nav ───────────────────────────────────────────────────────────────────

  const VIEWS: TopNavItem[] = [
    { key: 'calendario', label: 'Calendario' },
    { key: 'storico', label: 'Storico' },
    { key: 'attivi', label: 'Piano terapeutico' },
    ...(canCreateTherapy ? [{ key: 'nuova', label: 'Nuova terapia' }] : []),
  ];
  const activeView: TherapyView = view === 'nuova' && !canCreateTherapy ? 'calendario' : view;
  const editing = showForm && editId !== null && canUpdateTherapy;

  const formShell = (
    <div className="terapia-sched-form therapy-form-shell" ref={formShellRef}>
      <header className="therapy-form-shell__heading">
        <h2 id={createDialogTitle} tabIndex={-1}>{editId ? 'Modifica terapia' : 'Nuova terapia'}</h2>
        {createSlot && <p>{createSlot.date} · ore {createSlot.time}</p>}
        <p>I campi con * sono obbligatori.</p>
      </header>
      <TherapyFormFields
        value={form}
        onChange={setForm}
        operatoreNome={operatoreNome}
        issues={formIssues}
      />
      {(formIssues.length > 0 || saveError) && (
        <p className="therapy-form__error" role="alert" data-testid="therapy-save-error">
          {formIssues.length ? therapyIssuesSummary(formIssues) : saveError}
        </p>
      )}
      <div className="form-actions therapy-form-shell__actions">
        {campiMancanti && <small className="form-hint">Manca: {campiMancanti}.</small>}
        <button
          type="button"
          className="ds-btn ds-btn--secondary"
          disabled={saving}
          onClick={() => {
            closeForm();
            if (!editId) showView('calendario');
          }}
        >
          Annulla
        </button>
        <button
          type="button"
          className="ds-btn ds-btn--primary"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? 'Salvataggio...' : editId ? 'Aggiorna' : 'Salva terapia'}
        </button>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    <div className="cr-tab-content" ref={tabRootRef}>
      <ClinicalTableSection
        title="Terapia Farmacologica"
        count={therapySummary?.active ?? attive.length}
        countLabel="farmaci attivi"
      >
        {/* Navigazione prima di avvisi e controlli condizionali: cambiare vista non la sposta. */}
        <div className="tf-subtabs" style={{ marginTop: 'var(--clinical-submenu-gap, 16px)' }}>
          <TopNav
            variant="level3"
            items={VIEWS}
            activeKey={activeView}
            onChange={(next) => showView(next as TherapyView)}
            ariaLabel="Sezioni della terapia farmacologica"
            idPrefix="therapy-section"
          />
        </div>

        {error && (
          <div className="alert alert--error tf-error" role="alert">
            {error}
          </div>
        )}

        {activeView === 'attivi' && (
          <div className="cts__body--padded tf-active">
            {nextTherapyCursor && <p role="status">Verifica anagrafica parziale: carica le altre terapie per consultare tutti i farmaci.</p>}
            {editing ? formShell : listState ?? <>
              <TherapyDrugList therapies={attive} openId={openDrugId} focusId={focusDrugId}
                onToggle={toggleDrug} renderDetail={renderDetail} label="Farmaci attivi"
                lineBadge={lineBadge} emptyText={nextTherapyCursor ? 'Nessun farmaco attivo tra le terapie caricate.' : 'Nessun farmaco attivo.'} />
              {therapyPager}
            </>}
          </div>
        )}
        {activeView === 'calendario' && (
          <div className="cts__body--padded tf-calendar-view">
            <PatientTherapyCalendar
              key={`${paziente.id}|${calendarFocus?.requestId ?? 0}|${calendarFocus?.time ?? ''}`}
              patientId={paziente.id} initialDate={calendarFocus?.date}
              initialOpenTime={calendarFocus?.time} focusTherapyId={focusDrugId ?? undefined}
              onCreate={canCreateTherapy ? openCalendarCreate : undefined}
              onEditTherapy={canUpdateTherapy ? openIncompleteEdit : undefined}
              refreshKey={calendarRefresh} />
          </div>
        )}

        {activeView === 'storico' && (
          <div className="cts__body--padded">
            <TherapyHistoryView
              patientId={paziente.id}
              status={historyStatus}
              onStatusChange={changeHistoryStatus}
              prescriptionNames={therapies.map((t) => t.farmacoNome)}
              renderPrescriptions={(drug) => {
                const list = drug
                  ? inattive.filter(
                      (t) => t.farmacoNome.toLocaleLowerCase('it') === drug.toLocaleLowerCase('it'),
                    )
                  : inattive;
                return (
                  listState ?? (
                    <>
                      <TherapyDrugList
                        therapies={list}
                        openId={openDrugId}
                        focusId={focusDrugId}
                        onToggle={toggleDrug}
                        renderDetail={renderDetail}
                        label="Prescrizioni sospese o concluse"
                        emptyText={
                          nextTherapyCursor
                            ? 'Nessuna terapia sospesa o conclusa tra quelle caricate.'
                            : 'Nessuna terapia sospesa o conclusa.'
                        }
                      />
                      {therapyPager}
                    </>
                  )
                );
              }}
            />
          </div>
        )}

        {activeView === 'nuova' && <div className="cts__body--padded">{formShell}</div>}
      </ClinicalTableSection>

      {createSlot && createSlot.patientId === paziente.id && canCreateTherapy && <AccessibleDialogSurface
        labelledBy={createDialogTitle} className="therapy-calendar-dialog"
        dismissible={!saving} closeOnOverlay={!saving} onClose={closeForm}>
        <button type="button" className="ds-icon-btn" aria-label="Chiudi nuova terapia" title="Chiudi nuova terapia" data-dialog-initial-focus disabled={saving} onClick={closeForm}>×</button>
        {formShell}
      </AccessibleDialogSurface>}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Eliminare la terapia?"
        message="La terapia verrà rimossa dalla cartella del paziente. L'azione non è reversibile."
        confirmLabel="Elimina terapia"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDeleteId(null)}
      />

      <ConfirmDialog
        open={pendingSospendiId !== null}
        title="Sospendere la terapia?"
        message="Le somministrazioni programmate non verranno più generate finché la terapia resta sospesa. La terapia resta in cartella e si può riattivare da Storico › Prescrizioni sospese/concluse."
        confirmLabel="Sospendi terapia"
        tone="primary"
        busy={sospendendo}
        onConfirm={() => void confirmSospendi()}
        onCancel={() => setPendingSospendiId(null)}
      />

      {documentoAperto && (
        <Suspense fallback={<LoadingState msg="Apertura del documento…" />}>
          <VisoreDocumentoFarmaco
            documento={documentoAperto.documento}
            prescrizione={documentoAperto.prescrizione}
            onChiudi={() => setDocumentoAperto(null)}
          />
        </Suspense>
      )}

      {ricercaPer !== null && (
        <RicercaFarmacoModal
          nomeIniziale={ricercaPer}
          onChiudi={() => setRicercaPer(null)}
          onApriDocumento={apriDocumentoDaRicerca}
        />
      )}
    </div>
  );
}
