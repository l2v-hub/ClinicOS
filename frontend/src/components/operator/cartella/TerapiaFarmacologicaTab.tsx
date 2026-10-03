import { lazy, Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createSubmissionKey } from '../../../lib/submissionKey';
import type {
  MotivoNonErogazione,
  Paziente,
  PatientTherapyAPI,
  TherapySlot,
  TherapySlotPatient,
  TherapyAdministration,
} from '../../../types';
import type { TherapyTarget } from '../../../lib/patientTarget';
import { API_URL } from '../../../config';
import { IcoCheck } from '../../../icons';
import { cachedGetJson, invalidateCachedGet } from '../../../lib/cachedFetch';
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
import {
  loadTherapyPage,
  type TherapyListFilters,
  type TherapyListType,
} from '../../../lib/therapyPages';
import { operatorHeaders } from '../../../lib/operatorSession';
import { useCan, useRequiresConfirmation } from '../../../lib/capabilities';
import { recordAdministration } from '../../../lib/therapyAdministrationWrite';
import { facilityNow } from '../../../lib/therapyDoseStatus';
import { localIsoDate } from '../../../lib/appointmentRange';
import type { GiroTime } from '../../../lib/therapyGiro';
import { TherapyGiroRows } from '../TherapyGiroRows';
import { TherapyDrugDosePanel } from './TherapyDrugDosePanel';
import { useCanAdministerTherapy } from '../../../lib/therapyPermissions';
import { loadMedicationAdministrationPage } from '../../../lib/medicationAdministrationPages';
import { ClinicalTableSection, LoadingState } from './shared';
import { LoadErrorState } from './LoadErrorState';
import { PatientTherapyCalendar } from './PatientTherapyCalendar';
import { ClinicalTable } from './ClinicalTable';
import { AdministrationStatus } from './AdministrationStatus';
import type { ColumnDef } from './ClinicalTable';
import { formatFraction, computeEquivalent, scheduleLabel } from './therapyDose';
import { TherapyFormFields, emptyTherapyForm, type TherapyFormValue } from './TherapyFormFields';
import { schedulesFromTherapy } from './therapyFormRestore';
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
import { AvvisoAnomalieFarmaci } from './AvvisoAnomalieFarmaci';
import { anomalieDi } from './anomalieFarmaco';
import type { PrescrizioneDaAbbinare } from './farmacoCorrispondenza';
import './TherapyRowFocus.css';

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Dosaggio di una riga, qualunque tabella la produca.
 *
 * Le cinque tabelle di questa scheda chiamano il campo in modi diversi — `dosaggio` nelle
 * terapie, `farmacoDose` nelle somministrazioni — e la cella del farmaco e' la stessa per tutte.
 * Leggere il primo campo presente costa meno che uniformare cinque modelli di riga per una
 * colonna, e non richiede di toccare dati che funzionano.
 */
function dosaggioDellaRiga(row: unknown): string | null {
  if (!row || typeof row !== 'object') return null;
  const campi = row as Record<string, unknown>;
  for (const chiave of ['dosaggio', 'farmacoDose', 'dose']) {
    const valore = campi[chiave];
    if (typeof valore === 'string' && valore.trim()) return valore;
  }
  return null;
}

const STATO_BADGE: Record<string, string> = {
  attiva: 'badge--green',
  sospesa: 'badge--amber',
  conclusa: 'badge--gray',
};

const TIPO_BADGE: Record<string, string> = {
  periodica: 'badge--blue',
  una_tantum: 'badge--gray',
  // Non ambra: nella tabella Programmazione la colonna Tipo sta accanto a Stato, dove ambra
  // significa «sospesa». Due pillole identiche affiancate direbbero due cose diverse.
  al_bisogno: 'badge--teal',
};

const STATO_ORDER: Record<string, number> = { attiva: 0, sospesa: 1, conclusa: 2 };

// ── Types ─────────────────────────────────────────────────────────────────────

type SubTab = 'attivi' | 'programmazione' | 'calendario' | 'giornaliere' | 'storico' | 'sospese';

interface MedAdmin {
  id: string;
  therapyId?: string | null;
  patientId?: string;
  farmacoNome: string;
  farmacoDose: string;
  farmacoVia: string;
  date: string;
  fascia: string;
  ora: string;
  stato: string;
  operatoreNome?: string;
  confirmedAt?: string;
  motivo?: string;
  note?: string;
}

interface Props {
  paziente: Paziente;
  operatoreNome: string;
  /** Diario terapia: riga da mettere a fuoco ed evidenziare. Se non e' fra le terapie caricate,
   *  la scheda si apre normalmente, senza errori. */
  focusTherapyId?: string;
  /**
   * Accesso diretto (UX 2026-10-03): sotto-vista, giorno e farmaco su cui atterrare. Il farmaco
   * si apre con il pannello di somministrazione; un nuovo `requestId` riapplica lo stesso bersaglio.
   */
  therapyTarget?: TherapyTarget & { requestId: number };
}

// ── Form helpers ──────────────────────────────────────────────────────────────

// TherapyForm is an alias for the shared TherapyFormValue — no duplication.
type TherapyForm = TherapyFormValue;

function todayStr(): string {
  // Giorno locale (non UTC): a mezzanotte l'ISO in UTC darebbe il giorno sbagliato.
  return localIsoDate();
}

/** "08:00" o una fascia ("mattina"): la chiave che il pannello del farmaco evidenzia. */
const FASCIA_TIME: Record<string, string> = {
  mattina: '08:00',
  pranzo: '12:00',
  pomeriggio: '16:00',
  sera: '20:00',
  notte: '22:00',
};

const emptyForm = emptyTherapyForm;

// ── Daily admin row type ───────────────────────────────────────────────────────

type DailyAdminRow = {
  therapyId: string;
  /**
   * Identita' della riga nella tabella giornaliera. Non basta `therapyId`: una terapia
   * bigiornaliera compare in due fasce e produrrebbe due righe con la stessa chiave, quindi
   * indistinguibili per React e per chiunque debba agire su una sola delle due.
   */
  rowKey: string;
  drugName: string;
  dosage: string;
  route: string;
  fascia: string;
  scheduledTime: string;
  status: string;
  administeredBy?: string | null;
  administeredAt?: string | null;
  notAdministeredReason?: string | null;
  slotLabel?: string;
  /** Riga del giro di quel paziente (azioni in linea). */
  slotPatient?: TherapySlotPatient;
  administration?: TherapyAdministration;
  [key: string]: unknown;
};

// ── Schedule summary (REQ-093) ──────────────────────────────────────────────────

function ScheduleSummary({ t }: { t: PatientTherapyAPI }) {
  const rows = schedulesFromTherapy(t);
  const hasStructured = t.schedules && t.schedules.length > 0;
  if (!rows.length) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>;
  return (
    <div className="sched-summary">
      {rows.map((s, i) => {
        const eq = hasStructured
          ? computeEquivalent(
              s.quantityNumerator,
              s.quantityDenominator,
              t.commercialStrengthValue,
              t.commercialStrengthUnit,
            )
          : null;
        return (
          <span
            key={i}
            className="sched-pill"
            title={scheduleLabel(s, t.commercialStrengthValue, t.commercialStrengthUnit)}
          >
            <strong>{s.time}</strong>
            {hasStructured && (
              <>
                {' '}
                · {formatFraction(s.quantityNumerator, s.quantityDenominator)}{' '}
                {s.administrationUnit}
              </>
            )}
            {eq && <span className="sched-pill__mg"> · {eq}</span>}
          </span>
        );
      })}
      {t.giorniSettimana && t.giorniSettimana.trim() && (
        <span
          className="sched-pill sched-pill--days"
          title="Giorni della settimana"
          data-testid="therapy-days-summary"
        >
          {t.giorniSettimana
            .split(',')
            .map((n) => ['', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'][Number(n.trim())])
            .filter(Boolean)
            .join(' ')}
        </span>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TerapiaFarmacologicaTab({
  paziente,
  operatoreNome,
  focusTherapyId,
  therapyTarget,
}: Props) {
  const [subTab, setSubTab] = useState<SubTab>(() => therapyTarget?.subView ?? 'attivi');
  // La GUI nasconde la prescrizione se il ruolo non la consente (il backend la rifiuta comunque):
  // l'infermiere vede «somministra», il medico «modifica / sospendi» (F5).
  const canCreateTherapy = useCan('therapy.create');
  const canUpdateTherapy = useCan('therapy.update');
  const canDeleteTherapy = useCan('therapy.delete');
  const canAdminister = useCanAdministerTherapy();
  const needsConfirmation = useRequiresConfirmation('administration.confirm');
  // Farmaco aperto in linea (un solo pannello aperto per volta) e ora da evidenziare.
  const [expandedTherapyId, setExpandedTherapyId] = useState<string | null>(null);
  const [expandFocusTime, setExpandFocusTime] = useState<string | undefined>(undefined);
  // Calendario: giorno/ora di arrivo da un collegamento diretto.
  const [calendarFocus, setCalendarFocus] = useState<{
    requestId: number;
    date?: string;
    time?: string;
  } | null>(null);
  const toggleDrug = useCallback((id: string) => {
    setExpandFocusTime(undefined);
    setTargetFocusId(null);
    setExpandedTherapyId((current) => (current === id ? null : id));
  }, []);
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
  const [therapyFilterDraft, setTherapyFilterDraft] = useState<TherapyListFilters>({});
  const [therapyFilters, setTherapyFilters] = useState<TherapyListFilters>({});
  const [error, setError] = useState('');
  const [therapyLoadError, setTherapyLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TherapyForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  // Daily view state
  const [dailyDate, setDailyDate] = useState(() =>
    therapyTarget?.subView === 'giornaliere' && therapyTarget.date
      ? therapyTarget.date
      : todayStr(),
  );
  const [dailySlots, setDailySlots] = useState<TherapySlot[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState('');

  // History state
  const [history, setHistory] = useState<MedAdmin[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [nextHistoryCursor, setNextHistoryCursor] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState('');
  const therapyLoadSequence = useRef(0);
  const dailyLoadSequence = useRef(0);
  const historyLoadSequence = useRef(0);
  const activePatientId = useRef(paziente.id);

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
    const cacheKey = therapyCacheKey(requestedPatientId, therapyFilters);
    try {
      // Con un elenco gia' in cache la rivalidazione avviene senza svuotare la tabella.
      setLoading(readSessionCache(cacheKey) === undefined);
      setLoadingMoreTherapies(false);
      setTherapyLoadError('');
      const page = await loadTherapyPage(requestedPatientId, 'tutte', null, therapyFilters);
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
  }, [paziente.id, therapyFilters]);

  const loadMoreTherapies = useCallback(async () => {
    if (!nextTherapyCursor || loadingMoreTherapies) return;
    const sequence = ++therapyLoadSequence.current;
    const requestedPatientId = paziente.id;
    try {
      setLoadingMoreTherapies(true);
      setTherapyLoadError('');
      const page = await loadTherapyPage(
        requestedPatientId,
        'tutte',
        nextTherapyCursor,
        therapyFilters,
      );
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
  }, [loadingMoreTherapies, nextTherapyCursor, paziente.id, therapyFilters]);

  const loadDaily = useCallback(async (date: string) => {
    const sequence = ++dailyLoadSequence.current;
    try {
      setDailyLoading(true);
      setDailyError('');
      const slots = await cachedGetJson<TherapySlot[]>(`${API_URL}/therapy-slots?date=${date}`);
      if (sequence === dailyLoadSequence.current) setDailySlots(slots);
    } catch (err) {
      if (sequence === dailyLoadSequence.current) {
        setDailySlots([]);
        setDailyError(
          err instanceof Error ? err.message : 'Impossibile caricare le somministrazioni.',
        );
      }
    } finally {
      if (sequence === dailyLoadSequence.current) setDailyLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    const sequence = ++historyLoadSequence.current;
    const requestedPatientId = paziente.id;
    try {
      setHistoryLoading(true);
      setHistoryLoadingMore(false);
      setHistoryError('');
      const page = await loadMedicationAdministrationPage<MedAdmin>(requestedPatientId);
      if (
        sequence !== historyLoadSequence.current ||
        activePatientId.current !== requestedPatientId
      ) {
        return;
      }
      setHistory(page.items);
      setNextHistoryCursor(page.pageInfo.nextCursor);
    } catch (err) {
      if (
        sequence === historyLoadSequence.current &&
        activePatientId.current === requestedPatientId
      ) {
        setHistory([]);
        setNextHistoryCursor(null);
        setHistoryError(err instanceof Error ? err.message : 'Impossibile caricare lo storico.');
      }
    } finally {
      if (
        sequence === historyLoadSequence.current &&
        activePatientId.current === requestedPatientId
      ) {
        setHistoryLoading(false);
      }
    }
  }, [paziente.id]);

  const loadMoreHistory = useCallback(async () => {
    if (!nextHistoryCursor || historyLoadingMore) return;
    const sequence = ++historyLoadSequence.current;
    const requestedPatientId = paziente.id;
    try {
      setHistoryLoadingMore(true);
      setHistoryError('');
      const page = await loadMedicationAdministrationPage<MedAdmin>(
        requestedPatientId,
        nextHistoryCursor,
      );
      if (
        sequence !== historyLoadSequence.current ||
        activePatientId.current !== requestedPatientId
      ) {
        return;
      }
      setHistory((current) => {
        const merged = new Map(
          current.map((administration) => [administration.id, administration]),
        );
        for (const administration of page.items) merged.set(administration.id, administration);
        return [...merged.values()];
      });
      setNextHistoryCursor(page.pageInfo.nextCursor);
    } catch (err) {
      if (
        sequence === historyLoadSequence.current &&
        activePatientId.current === requestedPatientId
      ) {
        setHistoryError(err instanceof Error ? err.message : 'Impossibile caricare altro storico.');
      }
    } finally {
      if (
        sequence === historyLoadSequence.current &&
        activePatientId.current === requestedPatientId
      ) {
        setHistoryLoadingMore(false);
      }
    }
  }, [historyLoadingMore, nextHistoryCursor, paziente.id]);

  useEffect(() => {
    void (async () => {
      await loadTherapies();
    })();
  }, [loadTherapies]);
  useEffect(() => {
    if (subTab === 'giornaliere') {
      void (async () => {
        await loadDaily(dailyDate);
      })();
    }
  }, [subTab, dailyDate, loadDaily]);
  useEffect(() => {
    if (subTab === 'storico') {
      void (async () => {
        await loadHistory();
      })();
    }
  }, [subTab, loadHistory]);

  // ── CRUD ──────────────────────────────────────────────────────────────────────

  // Errori per campo: compaiono dopo il primo «Salva» e si aggiornano mentre si corregge.
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [saveError, setSaveError] = useState('');
  const formShellRef = useRef<HTMLDivElement>(null);
  const formIssues = showForm && saveAttempted ? therapyFormIssues(form) : [];
  const resetSaveFeedback = () => {
    setSaveAttempted(false);
    setSaveError('');
  };

  const openAdd = () => {
    resetSaveFeedback();
    setEditId(null);
    setForm(emptyForm());
    setShowForm(true);
    setSubTab('programmazione');
  };
  const openEdit = (t: PatientTherapyAPI) => {
    resetSaveFeedback();
    setEditId(t.id);
    setForm(therapyToForm(t));
    setShowForm(true);
    setSubTab('programmazione');
  };
  const closeForm = () => {
    resetSaveFeedback();
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm());
  };

  const [createKey] = useState(createSubmissionKey);
  const handleSave = async () => {
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
    try {
      setSaving(true);
      setError('');
      setSaveError('');
      const url = editId
        ? `${API_URL}/patients/${paziente.id}/therapies/${editId}`
        : `${API_URL}/patients/${paziente.id}/therapies`;
      // Phase 6: a retried creation (lost response, double submit) reuses the same requestId →
      // the backend replays the first prescription instead of creating a duplicate.
      const body = editId ? payload : { ...payload, requestId: createKey.for(payload) };
      const res = await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setSaveError(await therapySaveErrorMessage(res));
        return;
      }
      createKey.reset();
      closeForm();
      invalidateTherapies();
      await loadTherapies();
      setSubTab('attivi');
    } catch {
      setSaveError('Terapia non salvata: errore di rete. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = (id: string) => setPendingDeleteId(id);

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      setError('');
      const res = await fetch(`${API_URL}/patients/${paziente.id}/therapies/${pendingDeleteId}`, {
        method: 'DELETE',
        headers: operatorHeaders(),
      });
      if (!res.ok) throw new Error(await therapySaveErrorMessage(res, 'Terapia non eliminata'));
      invalidateTherapies();
      await loadTherapies();
      setPendingDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore eliminazione');
    } finally {
      setDeleting(false);
    }
  };

  // La sospensione ferma le somministrazioni future senza dirlo a nessuno, e il suo pulsante e'
  // a pochi pixel da Elimina: un clic sbagliato qui e' l'unico che non lascia traccia visibile.
  const [pendingSospendiId, setPendingSospendiId] = useState<string | null>(null);
  const [sospendendo, setSospendendo] = useState(false);

  const confirmSospendi = async () => {
    if (!pendingSospendiId) return;
    setSospendendo(true);
    try {
      setError('');
      const res = await fetch(`${API_URL}/patients/${paziente.id}/therapies/${pendingSospendiId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify({ stato: 'sospesa' }),
      });
      if (!res.ok) throw new Error(await therapySaveErrorMessage(res, 'Terapia non sospesa'));
      invalidateTherapies();
      await loadTherapies();
      setPendingSospendiId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sospensione');
    } finally {
      setSospendendo(false);
    }
  };

  const handleRiattiva = async (t: PatientTherapyAPI) => {
    try {
      setError('');
      const res = await fetch(`${API_URL}/patients/${paziente.id}/therapies/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify({ stato: 'attiva' }),
      });
      if (!res.ok) throw new Error(await therapySaveErrorMessage(res, 'Terapia non riattivata'));
      invalidateTherapies();
      await loadTherapies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore riattivazione');
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────────

  const attive = therapies.filter((t) => t.stato === 'attiva');
  const inattive = therapies.filter((t) => t.stato !== 'attiva');

  // ── Diario terapia: riga messa a fuoco ("apri" dalla voce del diario) ──────────
  const [focusedTherapyId, setFocusedTherapyId] = useState<string | null>(null);
  const [focusHandled, setFocusHandled] = useState(false);
  const tabRootRef = useRef<HTMLDivElement>(null);
  // Stato derivato durante il render (non in un effetto): appena la terapia compare fra quelle
  // caricate si apre la sua sotto-scheda. Non ancora (o mai) caricata: nessun errore.
  const focusTarget =
    // Il bersaglio dell'accesso diretto (therapyTarget) vince sul fuoco legacy del diario.
    focusTherapyId && !focusHandled && !therapyTarget
      ? therapies.find((t) => t.id === focusTherapyId)
      : undefined;
  if (focusTarget) {
    setFocusHandled(true);
    setSubTab(focusTarget.stato === 'attiva' ? 'attivi' : 'sospese');
    setFocusedTherapyId(focusTarget.id);
  }
  // Farmaco dell'accesso diretto: resta evidenziato finché l'operatore non apre altro.
  const [targetFocusId, setTargetFocusId] = useState<string | null>(null);
  useEffect(() => {
    if (!focusedTherapyId) return;
    const timer = window.setTimeout(() => setFocusedTherapyId(null), 6000);
    return () => window.clearTimeout(timer);
  }, [focusedTherapyId]);
  // La riga evidenziata entra in vista anche quando i suoi dati arrivano dopo (giornaliere, pagine).
  const focusRowsReady = `${subTab}|${therapies.length}|${dailySlots.length}|${dailyLoading}`;
  useEffect(() => {
    if (!focusedTherapyId && !targetFocusId) return;
    const frame = window.requestAnimationFrame(() => {
      const row = tabRootRef.current?.querySelector('.therapy-list-row--focus');
      row?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusedTherapyId, targetFocusId, focusRowsReady]);
  const isFocused = (id: string) => id === focusedTherapyId || id === targetFocusId;
  const focusRowClass = (t: PatientTherapyAPI) =>
    [
      isFocused(t.id) ? 'therapy-list-row--focus' : '',
      t.id === expandedTherapyId ? 'therapy-row--open' : '',
    ]
      .filter(Boolean)
      .join(' ');

  // ── Accesso diretto: sotto-vista, giorno e farmaco aperto (riapplicato a ogni requestId) ──
  const [handledTargetId, setHandledTargetId] = useState<number | null>(null);
  const [targetViewApplied, setTargetViewApplied] = useState<number | null>(null);
  // 1) La sotto-vista e il giorno valgono subito (non servono le terapie caricate).
  if (therapyTarget && targetViewApplied !== therapyTarget.requestId) {
    setTargetViewApplied(therapyTarget.requestId);
    if (therapyTarget.subView) setSubTab(therapyTarget.subView);
    if (therapyTarget.subView === 'giornaliere' && therapyTarget.date)
      setDailyDate(therapyTarget.date);
    if (therapyTarget.subView === 'calendario')
      setCalendarFocus({
        requestId: therapyTarget.requestId,
        date: therapyTarget.date,
        time: therapyTarget.fascia
          ? (FASCIA_TIME[therapyTarget.fascia] ?? therapyTarget.fascia)
          : undefined,
      });
  }
  // 2) Il farmaco si apre appena compare fra le terapie caricate (se non c'e', nessun errore).
  const targetTherapy =
    therapyTarget?.therapyId && handledTargetId !== therapyTarget.requestId
      ? therapies.find((t) => t.id === therapyTarget.therapyId)
      : undefined;
  if (therapyTarget && targetTherapy) {
    setHandledTargetId(therapyTarget.requestId);
    const view = therapyTarget.subView;
    setTargetFocusId(targetTherapy.id);
    if (targetTherapy.stato !== 'attiva') {
      setSubTab('sospese');
    } else if (!view || view === 'attivi' || view === 'programmazione') {
      if (!view) setSubTab('attivi');
      // pannello di somministrazione aperto sul farmaco, con l'ora/fascia evidenziata
      setExpandedTherapyId(targetTherapy.id);
      setExpandFocusTime(therapyTarget.fascia);
    } else if (view === 'calendario' && therapyTarget.fascia) {
      // fascia del server → ora reale della prescrizione (07:00 resta 07:00, non 08:00)
      const scheduled = targetTherapy.schedules?.find(
        (schedule) => schedule.fascia === therapyTarget.fascia,
      )?.time;
      if (scheduled)
        setCalendarFocus({
          requestId: therapyTarget.requestId,
          date: therapyTarget.date,
          time: scheduled,
        });
    }
  }

  // Gli stessi campi che `handleSave` pretende, elencati per nome: prima il salvataggio usciva
  // in silenzio e il clic sembrava non aver fatto nulla.
  const campiMancanti =
    [!form.farmacoNome.trim() && 'il prodotto medicinale', !form.dataInizio && 'la data di inizio']
      .filter((v): v is string => typeof v === 'string')
      .join(' e ') || null;

  // Filter daily slots for this patient
  const patientDailyAdmins: DailyAdminRow[] = dailySlots.flatMap((slot) =>
    (slot.patients ?? [])
      .filter((p) => p.patientId === paziente.id)
      .flatMap((p) =>
        p.administrations.map((a) => ({
          ...a,
          rowKey: `${a.therapyId}|${slot.fascia}|${a.scheduledTime}`,
          slotLabel: slot.label,
          fascia: slot.fascia,
          ora: slot.ora,
          slotPatient: p,
          administration: a,
        })),
      ),
  );

  // ── Azioni in linea: Somministrazioni giornaliere (F2) e Storico (F7) ─────────────
  const [dailyFeedback, setDailyFeedback] = useState<{ tone: 'ok' | 'error'; text: string } | null>(
    null,
  );
  async function recordDaily(
    info: { patientId: string; therapyId: string; date: string; fascia: string; drugName: string },
    outcome: Parameters<typeof recordAdministration>[1],
    confirmed: boolean,
  ) {
    setDailyFeedback(null);
    const result = await recordAdministration(info, outcome, { confirmed });
    setDailyFeedback(
      result.ok
        ? {
            tone: 'ok',
            text:
              outcome.kind === 'administered'
                ? `Somministrazione di ${info.drugName} registrata.`
                : `Mancata somministrazione di ${info.drugName} registrata.`,
          }
        : { tone: 'error', text: result.message },
    );
    await loadDaily(dailyDate);
  }
  const renderDailyActions = (row: DailyAdminRow) => {
    if (!row.slotPatient || !row.administration) return null;
    // Le dosi future restano in sola lettura; oggi e i giorni passati si possono registrare.
    const actionable = canAdminister && dailyDate <= facilityNow().date;
    const single: GiroTime = {
      ora: row.scheduledTime,
      patients: [
        {
          patient: row.slotPatient,
          items: [
            {
              a: row.administration,
              fascia: row.fascia as TherapySlot['fascia'],
            },
          ],
        },
      ],
      total: 1,
      administered: row.status === 'administered' ? 1 : 0,
      notAdministered: row.status === 'not_administered' ? 1 : 0,
      pending: row.status === 'pending' ? 1 : 0,
    };
    if (row.status !== 'pending') return null;
    return (
      <TherapyGiroRows
        time={single}
        date={dailyDate}
        filtro="tutte"
        readOnly={!actionable}
        hidePatientHead
        hideDrugInfo
        requiresConfirmation={needsConfirmation}
        onConfirm={
          actionable
            ? (info, options) =>
                void recordDaily(info, { kind: 'administered' }, options?.confirmed === true)
            : undefined
        }
        onNotAdministered={
          actionable
            ? (info, motivo: MotivoNonErogazione, note: string, options) =>
                void recordDaily(
                  info,
                  { kind: 'not_administered', motivo, note },
                  options?.confirmed === true,
                )
            : undefined
        }
      />
    );
  };

  const [storicoSending, setStoricoSending] = useState<string | null>(null);
  const [storicoConfirm, setStoricoConfirm] = useState<MedAdmin | null>(null);
  const [storicoFeedback, setStoricoFeedback] = useState<{
    tone: 'ok' | 'error';
    text: string;
  } | null>(null);
  function startStoricoAdminister(row: MedAdmin) {
    if (storicoSending) return;
    if (needsConfirmation) setStoricoConfirm(row);
    else void storicoAdminister(row, false);
  }
  async function storicoAdminister(row: MedAdmin, confirmed: boolean) {
    if (!row.therapyId || storicoSending) return;
    setStoricoSending(row.id);
    setStoricoFeedback(null);
    const result = await recordAdministration(
      { patientId: paziente.id, therapyId: row.therapyId, date: row.date, fascia: row.fascia },
      { kind: 'administered' },
      { confirmed },
    );
    setStoricoSending(null);
    setStoricoFeedback(
      result.ok
        ? { tone: 'ok', text: `Somministrazione di ${row.farmacoNome} registrata.` }
        : { tone: 'error', text: result.message },
    );
    await loadHistory();
  }

  // ── Sub-tab nav ────────────────────────────────────────────────────────────────

  const SUB_TABS: TopNavItem[] = [
    { key: 'attivi', label: 'Farmaci attivi', badge: therapySummary?.active ?? attive.length },
    { key: 'programmazione', label: 'Programmazione' },
    { key: 'calendario', label: 'Calendario' },
    { key: 'giornaliere', label: 'Somministrazioni giornaliere' },
    { key: 'storico', label: 'Storico', badge: history.length },
    {
      key: 'sospese',
      label: 'Sospese/concluse',
      badge: therapySummary?.inactive ?? inattive.length,
    },
  ];

  const therapyFiltersActive = Boolean(
    therapyFilters.q || therapyFilters.tipo || therapyFilters.data,
  );

  const applyTherapyFilters = () => {
    const q = therapyFilterDraft.q?.trim() || undefined;
    if (q && q.length < 2) {
      setError('La ricerca farmaco richiede almeno 2 caratteri.');
      return;
    }
    setError('');
    setTherapyFilters({
      ...(q ? { q } : {}),
      ...(therapyFilterDraft.tipo ? { tipo: therapyFilterDraft.tipo } : {}),
      ...(therapyFilterDraft.data ? { data: therapyFilterDraft.data } : {}),
    });
  };

  const clearTherapyFilters = () => {
    setTherapyFilterDraft({});
    setTherapyFilters({});
    setError('');
  };

  const therapyPager = nextTherapyCursor ? (
    <div className="cts__body--padded" style={{ paddingTop: 12, textAlign: 'center' }}>
      <span style={{ marginRight: 8, color: 'var(--text-muted)', fontSize: 12 }}>
        {therapies.length} di {therapySummary?.total ?? '—'} risultati caricati
      </span>
      <button
        type="button"
        className="btn-secondary btn-sm"
        disabled={loadingMoreTherapies}
        onClick={() => void loadMoreTherapies()}
      >
        {loadingMoreTherapies ? 'Caricamento…' : 'Carica altre terapie'}
      </button>
    </div>
  ) : null;

  // Documenti ufficiali AIFA dei farmaci in terapia. L'operatore verifica la posologia sulla
  // fonte autorevole senza uscire dall'applicazione; ClinicOS non interpreta nulla.
  const risoluzioni = useRisoluzioniFarmaco(
    therapies.map((t) => ({
      farmacoNome: t.farmacoNome,
      dosaggio: t.dosaggio,
      viaSomministrazione: t.viaSomministrazione,
    })),
  );

  // AC7: farmaci in terapia che l'anagrafica non riconosce. `trovaRisoluzione` e' passata come
  // funzione perche' `anomalieDi` non deve sapere nulla della forma della cache.
  const anomalie = useMemo(
    () => anomalieDi(therapies, (nome, dosaggio) => trovaRisoluzione(risoluzioni, nome, dosaggio)),
    [therapies, risoluzioni],
  );

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
      // La confezione arriva da una scelta esplicita dell'operatore: la sua forma e' un dato,
      // non un'ipotesi, quindi puo' guidare l'evidenziazione.
      setDocumentoAperto({
        documento,
        prescrizione: { dosaggio: confezione.descrizione, forma: confezione.forma },
      });
    },
    [],
  );

  /**
   * Nome del farmaco, con accanto l'azione giusta per il suo stato in anagrafica.
   *
   * Quattro esiti, tutti visibili: documento apribile, farmaco senza documento, farmaco non
   * trovato, anagrafica che non risponde. La versione precedente li appiattiva in uno —
   * nessuna icona — lasciando l'operatore senza sapere se il farmaco fosse assente o se fosse
   * la ricerca a non aver funzionato.
   */
  const renderFarmaco = (
    v: string,
    row?: unknown,
    toggle?: { expanded: boolean; onToggle: () => void; hint: string },
  ) => {
    const dosaggio = dosaggioDellaRiga(row);
    const risoluzione = trovaRisoluzione(risoluzioni, v, dosaggio);
    return (
      <span style={{ fontWeight: 600 }}>
        {toggle ? (
          // Tocca il farmaco → pannello in linea con le dosi del giorno e le azioni del ruolo.
          <button
            type="button"
            className="therapy-drug-toggle"
            aria-expanded={toggle.expanded}
            aria-label={`${v}${dosaggio ? ` ${dosaggio}` : ''}: ${toggle.hint}`}
            data-testid="therapy-drug-toggle"
            onClick={toggle.onToggle}
          >
            <span aria-hidden="true">{toggle.expanded ? '▾' : '▸'}</span>
            <span>
              {v}
              <span className="therapy-drug-toggle__hint">
                {' '}
                {toggle.expanded ? 'Chiudi' : toggle.hint}
              </span>
            </span>
          </button>
        ) : (
          v
        )}
        {risoluzione?.stato === 'trovato' && risoluzione.documento && (
          <button
            type="button"
            className="icon-btn icon-btn--inline"
            title={etichettaDocumento(risoluzione.documento)}
            // Il nome accessibile porta la dose prescritta: senza, due righe dello stesso farmaco
            // a dosaggi diversi esporrebbero due controlli con un nome identico.
            aria-label={`${etichettaDocumento(risoluzione.documento)} — ${
              dosaggio ? `dose prescritta ${dosaggio}` : 'dose non specificata'
            }`}
            onClick={() =>
              setDocumentoAperto({
                documento: risoluzione.documento!,
                prescrizione: {
                  dosaggio,
                  // Solo una confezione riconosciuta con certezza porta una forma utilizzabile.
                  forma: risoluzione.confezione?.forma,
                },
              })
            }
          >
            <svg
              width="14"
              height="14"
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

  const drugToggleHint = (t: PatientTherapyAPI) =>
    canAdminister
      ? t.tipo === 'al_bisogno'
        ? 'Somministra al bisogno'
        : 'Somministra'
      : 'Stato di oggi';
  const renderFarmacoToggle = (v: string, t: PatientTherapyAPI) =>
    renderFarmaco(v, t, {
      expanded: expandedTherapyId === t.id,
      onToggle: () => toggleDrug(t.id),
      hint: drugToggleHint(t),
    });
  const renderDrugPanel = (t: PatientTherapyAPI) => (
    <TherapyDrugDosePanel
      key={`${t.id}|${expandFocusTime ?? ''}`}
      patientId={paziente.id}
      therapy={t}
      focusTime={expandFocusTime}
      onRecorded={() => invalidateCachedGet(`${API_URL}/therapy-slots`)}
    />
  );
  const prescriberActionsVisible = canUpdateTherapy || canDeleteTherapy;

  // ── Column definitions ────────────────────────────────────────────────────────

  const attiviColumnsAll: ColumnDef<PatientTherapyAPI>[] = [
    {
      key: 'farmacoNome',
      label: 'Farmaco',
      sortable: true,
      filterable: false,
      filterType: 'text',
      render: renderFarmacoToggle,
    },
    { key: 'dosaggio', label: 'Dosaggio', sortable: true },
    { key: 'viaSomministrazione', label: 'Via', sortable: true },
    {
      key: 'tipo',
      label: 'Tipo',
      sortable: true,
      filterable: false,
      filterType: 'select',
      options: [
        { value: 'periodica', label: 'Periodica' },
        { value: 'una_tantum', label: 'Una tantum' },
        { value: 'al_bisogno', label: 'Al bisogno' },
      ],
      render: (v: string) => (
        <span className={`badge ${TIPO_BADGE[v] ?? 'badge--gray'}`}>
          {v === 'una_tantum' ? 'una tantum' : v === 'al_bisogno' ? 'al bisogno' : v}
        </span>
      ),
    },
    {
      key: 'fasceMattina',
      label: 'Orari e quantità',
      sortable: false,
      render: (_: unknown, t: PatientTherapyAPI) => <ScheduleSummary t={t} />,
    },
    {
      key: 'dataInizio',
      label: 'Inizio',
      sortable: true,
      filterable: false,
      filterType: 'date',
      render: (v: string) => <span style={{ fontSize: 12 }}>{v}</span>,
    },
    {
      key: 'dataFine',
      label: 'Fine',
      sortable: true,
      render: (v: string) => <span style={{ fontSize: 12 }}>{v ?? '—'}</span>,
    },
    {
      key: 'prescrittore',
      label: 'Prescrittore',
      sortable: true,
      render: (v: string) => <span style={{ fontSize: 12 }}>{v ?? '—'}</span>,
    },
    {
      key: 'id',
      label: '',
      width: '90px',
      render: (_: unknown, t: PatientTherapyAPI) => (
        <div style={{ display: 'flex', gap: 4 }}>
          {canUpdateTherapy && (
            <button
              className="icon-btn icon-btn--sm icon-btn--edit"
              title="Modifica"
              aria-label={`Modifica ${t.farmacoNome}`}
              onClick={() => openEdit(t)}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          {canUpdateTherapy && (
            <button
              className="icon-btn icon-btn--sm"
              title="Sospendi"
              aria-label={`Sospendi ${t.farmacoNome}`}
              onClick={() => setPendingSospendiId(t.id)}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            </button>
          )}
          {canDeleteTherapy && (
            <button
              className="icon-btn icon-btn--sm icon-btn--danger"
              title="Elimina"
              aria-label={`Elimina ${t.farmacoNome}`}
              onClick={() => handleDelete(t.id)}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      ),
    },
  ];
  const attiviColumns = attiviColumnsAll.filter(
    (column) => column.key !== 'id' || prescriberActionsVisible,
  );

  const programmazioneColumnsAll: ColumnDef<PatientTherapyAPI>[] = [
    {
      key: 'farmacoNome',
      label: 'Farmaco',
      sortable: true,
      filterable: false,
      filterType: 'text',
      render: (v: string, t: PatientTherapyAPI) =>
        t.stato === 'attiva' ? renderFarmacoToggle(v, t) : renderFarmaco(v, t),
    },
    { key: 'dosaggio', label: 'Dosaggio', sortable: true },
    { key: 'viaSomministrazione', label: 'Via', sortable: true },
    {
      key: 'stato',
      label: 'Stato',
      sortable: true,
      filterable: false,
      filterType: 'select',
      options: [
        { value: 'attiva', label: 'Attiva' },
        { value: 'sospesa', label: 'Sospesa' },
        { value: 'conclusa', label: 'Conclusa' },
      ],
      render: (v: string) => (
        <span className={`badge ${STATO_BADGE[v] ?? 'badge--gray'}`}>{v}</span>
      ),
    },
    {
      key: 'tipo',
      label: 'Tipo',
      sortable: true,
      filterable: false,
      filterType: 'select',
      options: [
        { value: 'periodica', label: 'Periodica' },
        { value: 'una_tantum', label: 'Una tantum' },
        { value: 'al_bisogno', label: 'Al bisogno' },
      ],
      render: (v: string) => (
        <span className={`badge ${TIPO_BADGE[v] ?? 'badge--gray'}`}>
          {v === 'una_tantum' ? 'una tantum' : v === 'al_bisogno' ? 'al bisogno' : v}
        </span>
      ),
    },
    {
      key: 'dataInizio',
      label: 'Inizio',
      sortable: true,
      filterable: false,
      filterType: 'date',
      render: (v: string) => <span style={{ fontSize: 12 }}>{v}</span>,
    },
    {
      key: 'fasceMattina',
      label: 'Orari e quantità',
      sortable: false,
      render: (_: unknown, t: PatientTherapyAPI) => <ScheduleSummary t={t} />,
    },
    {
      key: 'id',
      label: '',
      width: '64px',
      render: (_: unknown, t: PatientTherapyAPI) => (
        <div style={{ display: 'flex', gap: 4 }}>
          {canUpdateTherapy && (
            <button
              className="icon-btn icon-btn--sm icon-btn--edit"
              title="Modifica"
              aria-label={`Modifica ${t.farmacoNome}`}
              onClick={() => openEdit(t)}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          {canDeleteTherapy && (
            <button
              className="icon-btn icon-btn--sm icon-btn--danger"
              title="Elimina"
              aria-label={`Elimina ${t.farmacoNome}`}
              onClick={() => handleDelete(t.id)}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      ),
    },
  ];
  const programmazioneColumns = programmazioneColumnsAll.filter(
    (column) => column.key !== 'id' || prescriberActionsVisible,
  );

  const giornaliereColumns: ColumnDef<DailyAdminRow>[] = [
    {
      key: 'drugName',
      label: 'Farmaco',
      sortable: true,
      filterable: true,
      filterType: 'text',
      render: renderFarmaco,
    },
    {
      key: 'dosage',
      label: 'Quantità',
      render: (_: unknown, a: DailyAdminRow) => (
        <span>{(a.quantityLabel as string) || a.dosage}</span>
      ),
    },
    { key: 'route', label: 'Via' },
    {
      key: 'fascia',
      label: 'Fascia',
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: [
        { value: 'mattina', label: 'Mattina' },
        { value: 'pranzo', label: 'Pranzo' },
        { value: 'pomeriggio', label: 'Pomeriggio' },
        { value: 'sera', label: 'Sera' },
        { value: 'notte', label: 'Notte' },
      ],
      render: (_: unknown, a: DailyAdminRow) => <span>{a.slotLabel ?? a.fascia}</span>,
    },
    { key: 'scheduledTime', label: 'Orario', sortable: true },
    {
      key: 'status',
      label: 'Stato',
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: [
        { value: 'administered', label: 'Erogata' },
        { value: 'not_administered', label: 'Non erogata' },
        { value: 'pending', label: 'Da erogare' },
      ],
      render: (v: string) => <AdministrationStatus status={v} />,
    },
    {
      key: 'administeredBy',
      label: 'Operatore',
      sortable: true,
      render: (v: string) => <span style={{ fontSize: 12 }}>{v ?? '—'}</span>,
    },
    {
      key: 'administeredAt',
      label: 'Ora conferma',
      sortable: true,
      render: (v: string) => (
        <span style={{ fontSize: 12 }}>
          {v
            ? new Date(v).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
            : '—'}
        </span>
      ),
    },
    {
      key: 'notAdministeredReason',
      label: 'Motivo',
      render: (v: string) => <span style={{ fontSize: 12 }}>{v ?? '—'}</span>,
    },
    {
      key: 'rowKey',
      label: 'Azioni',
      render: (_: unknown, row: DailyAdminRow) => renderDailyActions(row),
    },
  ];

  const storicoColumns: ColumnDef<MedAdmin>[] = [
    {
      key: 'date',
      label: 'Data',
      sortable: true,
      filterable: true,
      filterType: 'date',
      render: (v: string) => <span style={{ fontSize: 12 }}>{v}</span>,
    },
    {
      key: 'farmacoNome',
      label: 'Farmaco',
      sortable: true,
      filterable: true,
      filterType: 'text',
      render: renderFarmaco,
    },
    { key: 'farmacoDose', label: 'Dose' },
    { key: 'farmacoVia', label: 'Via' },
    {
      key: 'fascia',
      label: 'Fascia',
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: [
        { value: 'mattina', label: 'Mattina' },
        { value: 'pranzo', label: 'Pranzo' },
        { value: 'pomeriggio', label: 'Pomeriggio' },
        { value: 'sera', label: 'Sera' },
        { value: 'notte', label: 'Notte' },
      ],
    },
    {
      key: 'stato',
      label: 'Stato',
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: [
        { value: 'erogata', label: 'Erogata' },
        { value: 'non_erogata', label: 'Non erogata' },
      ],
      render: (v: string) => <AdministrationStatus status={v} />,
    },
    {
      key: 'operatoreNome',
      label: 'Operatore',
      sortable: true,
      render: (v: string) => <span style={{ fontSize: 12 }}>{v ?? '—'}</span>,
    },
    {
      key: 'motivo',
      label: 'Motivo',
      render: (v: string) => <span style={{ fontSize: 12 }}>{v ?? '—'}</span>,
    },
    {
      key: 'ora',
      label: '',
      render: (_: unknown, row: MedAdmin) =>
        // F7: la dose di oggi «non erogata» si può ancora somministrare (il server lo consente;
        // una dose erogata resta immutabile).
        canAdminister &&
        row.stato === 'non_erogata' &&
        row.date === facilityNow().date &&
        row.therapyId ? (
          <button
            type="button"
            className="ds-btn ds-btn--primary"
            disabled={storicoSending === row.id}
            aria-label={`Somministra ora: ${row.farmacoNome} ${row.farmacoDose}, ${row.fascia}`}
            onClick={() => startStoricoAdminister(row)}
          >
            {storicoSending === row.id ? 'Invio…' : 'Somministra ora'}
          </button>
        ) : null,
    },
  ];

  const sospeseColumns: ColumnDef<PatientTherapyAPI>[] = [
    {
      key: 'farmacoNome',
      label: 'Farmaco',
      sortable: true,
      filterable: false,
      filterType: 'text',
      render: renderFarmaco,
    },
    { key: 'dosaggio', label: 'Dosaggio' },
    { key: 'viaSomministrazione', label: 'Via' },
    {
      key: 'stato',
      label: 'Stato',
      sortable: true,
      filterable: false,
      filterType: 'select',
      options: [
        { value: 'sospesa', label: 'Sospesa' },
        { value: 'conclusa', label: 'Conclusa' },
      ],
      render: (v: string) => (
        <span className={`badge ${STATO_BADGE[v] ?? 'badge--gray'}`}>{v}</span>
      ),
    },
    {
      key: 'dataInizio',
      label: 'Inizio',
      sortable: true,
      render: (v: string) => <span style={{ fontSize: 12 }}>{v}</span>,
    },
    {
      key: 'dataFine',
      label: 'Fine',
      sortable: true,
      render: (v: string) => <span style={{ fontSize: 12 }}>{v ?? '—'}</span>,
    },
    {
      key: 'note',
      label: 'Note',
      render: (v: string) => (
        <span
          style={{
            fontSize: 12,
            maxWidth: 120,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
          }}
        >
          {v ?? ''}
        </span>
      ),
    },
    {
      key: 'id',
      label: '',
      width: '44px',
      render: (_: unknown, t: PatientTherapyAPI) =>
        canUpdateTherapy && (
          <button
            className="icon-btn icon-btn--sm"
            title="Riattiva"
            aria-label={`Riattiva ${t.farmacoNome}`}
            onClick={() => handleRiattiva(t)}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    <div className="cr-tab-content" ref={tabRootRef}>
      <ClinicalTableSection
        title="Terapia Farmacologica"
        count={subTab === 'calendario' ? undefined : (therapySummary?.active ?? attive.length)}
        countLabel={therapyFiltersActive ? 'farmaci attivi nei risultati' : 'farmaci attivi'}
        actions={
          canCreateTherapy &&
          !(showForm && subTab === 'programmazione') && (
            <button className="btn-sm" onClick={openAdd}>
              + Aggiungi farmaco
            </button>
          )
        }
      >
        {/* Keep navigation before conditional controls and notices so changing views cannot move it. */}
        <div className="tf-subtabs" style={{ marginTop: 'var(--clinical-submenu-gap, 16px)' }}>
          <TopNav
            variant="level3"
            items={SUB_TABS}
            activeKey={subTab}
            onChange={(nextSubTab) => {
              // L'errore appartiene alla schermata che l'ha prodotto: senza azzerarlo, un errore
              // di salvataggio resta appeso in cima mentre si legge lo Storico.
              setError('');
              setSubTab(nextSubTab as SubTab);
            }}
            ariaLabel="Sezioni della terapia farmacologica"
            idPrefix="therapy-section"
          />
        </div>

        {subTab !== 'calendario' && (
          <>
            <AvvisoAnomalieFarmaci
              esito={anomalie}
              ambito={
                nextTherapyCursor
                  ? 'risultati caricati (verifica parziale)'
                  : therapyFiltersActive
                    ? 'tutti i risultati filtrati'
                    : 'tutte le terapie in cartella'
              }
            />
            {nextTherapyCursor && (
              <div className="alert alert--info" role="status">
                Verifica anagrafica parziale: carica le altre terapie prima di considerare completo
                il controllo delle anomalie.
              </div>
            )}
          </>
        )}
        {subTab !== 'calendario' && !(showForm && subTab === 'programmazione') && (
          <div className="cts__body--padded" aria-label="Filtri terapie">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'end' }}>
              <label style={{ minWidth: 220, flex: '1 1 220px' }}>
                <span className="form-label">Cerca farmaco</span>
                <input
                  className="form-input"
                  value={therapyFilterDraft.q ?? ''}
                  maxLength={80}
                  placeholder="Almeno 2 caratteri"
                  onChange={(event) =>
                    setTherapyFilterDraft((current) => ({
                      ...current,
                      q: event.target.value || undefined,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') applyTherapyFilters();
                  }}
                />
              </label>
              <label style={{ minWidth: 170 }}>
                <span className="form-label">Tipo</span>
                <select
                  className="form-input"
                  value={therapyFilterDraft.tipo ?? ''}
                  onChange={(event) =>
                    setTherapyFilterDraft((current) => ({
                      ...current,
                      tipo: (event.target.value || undefined) as TherapyListType | undefined,
                    }))
                  }
                >
                  <option value="">Tutti</option>
                  <option value="periodica">Periodica</option>
                  <option value="una_tantum">Una tantum</option>
                  <option value="al_bisogno">Al bisogno</option>
                </select>
              </label>
              <label style={{ minWidth: 170 }}>
                <span className="form-label">Data inizio</span>
                <input
                  className="form-input"
                  type="date"
                  value={therapyFilterDraft.data ?? ''}
                  onChange={(event) =>
                    setTherapyFilterDraft((current) => ({
                      ...current,
                      data: event.target.value || undefined,
                    }))
                  }
                />
              </label>
              <button type="button" className="btn-primary btn-sm" onClick={applyTherapyFilters}>
                Applica filtri
              </button>
              {therapyFiltersActive && (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={clearTherapyFilters}
                >
                  Azzera
                </button>
              )}
            </div>
          </div>
        )}
        {error && (
          <div
            role="alert"
            style={{
              padding: '8px 12px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 6,
              color: '#991B1B',
              fontSize: 13,
              margin: '0 12px 12px',
            }}
          >
            {error}
          </div>
        )}
        {therapyLoadError &&
          (subTab === 'attivi' || subTab === 'programmazione' || subTab === 'sospese') && (
            <div className="cts__body--padded">
              <LoadErrorState
                message={therapyLoadError}
                onRetry={() => void (therapies.length > 0 ? loadMoreTherapies() : loadTherapies())}
                retryLabel={therapies.length > 0 ? 'Riprova caricamento' : 'Riprova'}
              />
            </div>
          )}

        {/* ── Sub-tab: Farmaci attivi ── */}
        {subTab === 'attivi' &&
          (loading ? (
            <LoadingState />
          ) : therapyLoadError && therapies.length === 0 ? null : attive.length === 0 ? (
            // `.cts__body` non ha padding: senza involucro il testo tocca il bordo della scheda.
            <div className="cts__body--padded">
              <p className="cr-empty">
                {nextTherapyCursor
                  ? 'Nessun farmaco attivo tra le terapie caricate. '
                  : 'Nessun farmaco attivo. '}
                {canCreateTherapy && (
                  <button className="link-btn" onClick={openAdd}>
                    + Aggiungi
                  </button>
                )}
              </p>
              {therapyPager}
            </div>
          ) : (
            <>
              <ClinicalTable<PatientTherapyAPI>
                key={`active-${nextTherapyCursor ? 'partial' : 'complete'}`}
                noWrapper
                title=""
                keyField="id"
                pageSize={25}
                disableSorting={Boolean(nextTherapyCursor)}
                data={attive}
                emptyMessage="Nessun farmaco attivo."
                columns={attiviColumns}
                rowClassName={focusRowClass}
                onRowToggle={(t) => toggleDrug(t.id)}
                expandedRowKey={expandedTherapyId}
                renderExpandedRow={renderDrugPanel}
              />
              {therapyPager}
            </>
          ))}

        {/* ── Sub-tab: Programmazione ── */}
        {subTab === 'programmazione' && (
          <div className="cts__body--padded">
            {showForm ? (
              <div className="terapia-sched-form therapy-form-shell" ref={formShellRef}>
                <header className="therapy-form-shell__heading">
                  <h2>{editId ? 'Modifica terapia' : 'Nuova terapia'}</h2>
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
                  {campiMancanti && (
                    // Il pulsante disabilitato da solo non dice cosa manca, e il campo mancante
                    // puo' essere fuori schermo in una maschera lunga come questa.
                    <small className="form-hint">Manca: {campiMancanti}.</small>
                  )}
                  <button className="btn-secondary btn-sm" onClick={closeForm}>
                    Annulla
                  </button>
                  <button className="btn-success btn-sm" disabled={saving} onClick={handleSave}>
                    {saving ? 'Salvataggio...' : editId ? 'Aggiorna' : 'Salva terapia'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {canCreateTherapy && (
                  <button
                    className="btn-success btn-sm"
                    style={{ marginBottom: 12 }}
                    onClick={openAdd}
                  >
                    + Nuova terapia
                  </button>
                )}
                {loading ? (
                  <LoadingState />
                ) : therapyLoadError && therapies.length === 0 ? null : (
                  <>
                    <ClinicalTable<PatientTherapyAPI>
                      key={`all-${nextTherapyCursor ? 'partial' : 'complete'}`}
                      noWrapper
                      title=""
                      keyField="id"
                      pageSize={25}
                      disableSorting={Boolean(nextTherapyCursor)}
                      data={therapies}
                      emptyMessage="Nessuna terapia programmata."
                      columns={programmazioneColumns}
                      rowClassName={focusRowClass}
                      onRowToggle={(t) => {
                        if (t.stato === 'attiva') toggleDrug(t.id);
                      }}
                      expandedRowKey={expandedTherapyId}
                      renderExpandedRow={(t) => (t.stato === 'attiva' ? renderDrugPanel(t) : null)}
                    />
                    {therapyPager}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {subTab === 'calendario' && (
          <PatientTherapyCalendar
            key={`${paziente.id}|${calendarFocus?.requestId ?? 0}|${calendarFocus?.time ?? ''}`}
            patientId={paziente.id}
            initialDate={calendarFocus?.date}
            initialOpenTime={calendarFocus?.time}
          />
        )}

        {/* ── Sub-tab: Somministrazioni giornaliere ── */}
        {subTab === 'giornaliere' && (
          <div className="cts__body--padded">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Data:</label>
              <input
                className="form-input"
                type="date"
                value={dailyDate}
                style={{ width: 160 }}
                onChange={(e) => setDailyDate(e.target.value)}
              />
              {/* Le dosi da somministrare si registrano sulla riga; il calendario resta un collegamento. */}
              <button
                type="button"
                className="btn-secondary btn-sm"
                data-testid="daily-open-calendar"
                onClick={() => setSubTab('calendario')}
              >
                Vai al calendario
              </button>
            </div>
            {dailyLoading ? (
              <LoadingState />
            ) : dailyError ? (
              <LoadErrorState message={dailyError} onRetry={() => void loadDaily(dailyDate)} />
            ) : (
              <ClinicalTable<DailyAdminRow>
                noWrapper
                title=""
                keyField="rowKey"
                pageSize={25}
                data={patientDailyAdmins}
                emptyMessage="Nessuna somministrazione prevista per questa data."
                columns={giornaliereColumns}
                rowClassName={(row) =>
                  isFocused(row.therapyId) &&
                  (!therapyTarget?.fascia || therapyTarget.fascia === row.fascia)
                    ? 'therapy-list-row--focus'
                    : ''
                }
              />
            )}
            {dailyFeedback && (
              <p
                className={`drug-dose-panel__feedback is-${dailyFeedback.tone}`}
                role={dailyFeedback.tone === 'error' ? 'alert' : 'status'}
              >
                {dailyFeedback.text}
              </p>
            )}
          </div>
        )}

        {/* ── Sub-tab: Storico ── */}
        {subTab === 'storico' &&
          (historyLoading ? (
            <LoadingState msg="Caricamento storico…" />
          ) : historyError && history.length === 0 ? (
            <div className="cts__body--padded">
              <LoadErrorState message={historyError} onRetry={() => void loadHistory()} />
            </div>
          ) : (
            <>
              {historyError && (
                <div className="cts__body--padded">
                  <LoadErrorState
                    message={historyError}
                    onRetry={() => void loadMoreHistory()}
                    retryLabel="Riprova caricamento"
                  />
                </div>
              )}
              {storicoFeedback && (
                <p
                  className={`drug-dose-panel__feedback is-${storicoFeedback.tone} cts__body--padded`}
                  role={storicoFeedback.tone === 'error' ? 'alert' : 'status'}
                >
                  {storicoFeedback.text}
                </p>
              )}
              <ClinicalTable<MedAdmin>
                key={`history-${nextHistoryCursor ? 'partial' : 'complete'}`}
                noWrapper
                title=""
                keyField="id"
                pageSize={25}
                disableSorting={Boolean(nextHistoryCursor)}
                data={history}
                emptyMessage="Nessuna somministrazione registrata."
                columns={storicoColumns}
              />
              {nextHistoryCursor && !historyError && (
                <div className="cts__body--padded" style={{ textAlign: 'center' }}>
                  <span style={{ marginRight: 8, color: 'var(--text-muted)', fontSize: 12 }}>
                    {history.length} somministrazioni caricate; lo storico è parziale.
                  </span>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    disabled={historyLoadingMore}
                    onClick={() => void loadMoreHistory()}
                  >
                    {historyLoadingMore ? 'Caricamento…' : 'Carica altro storico'}
                  </button>
                </div>
              )}
            </>
          ))}

        {/* ── Sub-tab: Sospese/concluse ── */}
        {subTab === 'sospese' &&
          (loading ? (
            <LoadingState />
          ) : therapyLoadError && therapies.length === 0 ? null : (
            <>
              <ClinicalTable<PatientTherapyAPI>
                key={`inactive-${nextTherapyCursor ? 'partial' : 'complete'}`}
                noWrapper
                title=""
                keyField="id"
                pageSize={25}
                disableSorting={Boolean(nextTherapyCursor)}
                data={inattive}
                rowClassName={focusRowClass}
                emptyMessage={
                  nextTherapyCursor
                    ? 'Nessuna terapia sospesa o conclusa tra quelle caricate.'
                    : 'Nessuna terapia sospesa o conclusa.'
                }
                columns={sospeseColumns}
              />
              {therapyPager}
            </>
          ))}
      </ClinicalTableSection>

      <ConfirmDialog
        open={storicoConfirm !== null}
        title="Confermi la somministrazione?"
        message={
          storicoConfirm
            ? `${storicoConfirm.farmacoNome} ${storicoConfirm.farmacoDose}, ${storicoConfirm.fascia} di oggi. Il tuo ruolo registra la somministrazione con conferma esplicita.`
            : ''
        }
        confirmLabel="Conferma somministrazione"
        tone="primary"
        onConfirm={() => {
          const row = storicoConfirm;
          setStoricoConfirm(null);
          if (row) void storicoAdminister(row, true);
        }}
        onCancel={() => setStoricoConfirm(null)}
      />

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
        message="Le somministrazioni programmate non verranno più generate finché la terapia resta sospesa. La terapia resta in cartella e si può riattivare da «Sospese/concluse»."
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
