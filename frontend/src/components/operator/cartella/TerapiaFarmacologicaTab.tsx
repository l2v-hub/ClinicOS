import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Paziente, PatientTherapyAPI, TherapySlot } from '../../../types';
import { API_URL } from '../../../config';
import { cachedGetJson, invalidateCachedGet } from '../../../lib/cachedFetch';
import {
  loadTherapyPage,
  type TherapyListFilters,
  type TherapyListType,
} from '../../../lib/therapyPages';
import { operatorHeaders } from '../../../lib/operatorSession';
import { loadMedicationAdministrationPage } from '../../../lib/medicationAdministrationPages';
import { ClinicalTableSection, LoadingState } from './shared';
import { LoadErrorState } from './LoadErrorState';
import { ClinicalTable } from './ClinicalTable';
import type { ColumnDef } from './ClinicalTable';
import {
  FRACTION_PRESETS,
  ADMIN_UNITS,
  formatFraction,
  computeEquivalent,
  scheduleLabel,
  parseAllowedFractions,
  type ScheduleRow,
} from './therapyDose';
import { TherapyFormFields, emptyTherapyForm, type TherapyFormValue } from './TherapyFormFields';
import { ConfirmDialog } from '../../shared/ConfirmDialog';
import { TopNav, type TopNavItem } from '../../navigation/TopNav';
import { useRisoluzioniFarmaco, trovaRisoluzione, etichettaDocumento } from './farmacoRiferimento';
import type { DocumentoFarmaco, FarmacoTrovato } from './farmacoRiferimento';
import { VisoreDocumentoFarmaco } from './VisoreDocumentoFarmaco';
import { RicercaFarmacoModal } from './RicercaFarmaco';
import { AvvisoAnomalieFarmaci } from './AvvisoAnomalieFarmaci';
import { anomalieDi } from './anomalieFarmaco';
import type { PrescrizioneDaAbbinare } from './farmacoCorrispondenza';

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

type SubTab = 'attivi' | 'programmazione' | 'giornaliere' | 'storico' | 'sospese';

interface MedAdmin {
  id: string;
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
}

// ── Form helpers ──────────────────────────────────────────────────────────────

// TherapyForm is an alias for the shared TherapyFormValue — no duplication.
type TherapyForm = TherapyFormValue;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = emptyTherapyForm;

// Build editable schedule rows from a loaded therapy: prefer structured schedules,
// else synthesize from legacy orarioSpecifico, else from fascia booleans.
function schedulesFromTherapy(t: PatientTherapyAPI): ScheduleRow[] {
  const unit =
    t.pharmaceuticalForm && ADMIN_UNITS.includes(t.pharmaceuticalForm)
      ? t.pharmaceuticalForm
      : 'compressa';
  if (t.schedules && t.schedules.length) {
    return t.schedules
      .map((s) => ({
        time: s.time,
        quantityNumerator: s.quantityNumerator,
        quantityDenominator: s.quantityDenominator,
        administrationUnit: s.administrationUnit || unit,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }
  const times: string[] = [];
  if (t.orarioSpecifico)
    times.push(
      ...t.orarioSpecifico
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
  if (!times.length) {
    if (t.fasceMattina) times.push('08:00');
    if (t.fascePranzo) times.push('12:00');
    if (t.fascePomeriggio) times.push('16:00');
    if (t.fasceSera) times.push('20:00');
    if (t.fasceNotte) times.push('22:00');
  }
  if (!times.length) times.push('08:00');
  return times.map((time) => ({
    time,
    quantityNumerator: 1,
    quantityDenominator: 1,
    administrationUnit: unit,
  }));
}

function therapyToForm(t: PatientTherapyAPI): TherapyForm {
  return {
    farmacoNome: t.farmacoNome,
    pharmaceuticalForm: t.pharmaceuticalForm ?? 'compressa',
    commercialStrengthValue:
      t.commercialStrengthValue != null ? String(t.commercialStrengthValue) : '',
    commercialStrengthUnit: t.commercialStrengthUnit ?? 'mg',
    allowedFractions: Array.from(parseAllowedFractions(t.allowedFractions)),
    viaSomministrazione: t.viaSomministrazione,
    tipo: t.tipo,
    stato: t.stato,
    dataInizio: t.dataInizio,
    dataFine: t.dataFine ?? '',
    schedules: schedulesFromTherapy(t),
    giorniSettimana: t.giorniSettimana
      ? t.giorniSettimana
          .split(',')
          .map(Number)
          .filter((n) => n >= 1 && n <= 7)
      : [],
    prescrittore: t.prescrittore ?? '',
    note: t.note ?? '',
    dataSomministrazione: t.dataSomministrazione ?? todayStr(),
    orarioSomministrazione: t.orarioSomministrazione ?? '',
  };
}

function formToPayload(form: TherapyForm, patientId: string, operatoreNome: string) {
  const strengthValue = form.commercialStrengthValue.trim()
    ? Number(form.commercialStrengthValue)
    : null;
  // Allowed fractions are stored ordered as they appear in presets (config persists per therapy/drug).
  const allowed = FRACTION_PRESETS.filter((p) => form.allowedFractions.includes(p.key)).map(
    (p) => p.key,
  );
  const schedules =
    form.tipo === 'periodica'
      ? form.schedules
          .filter((s) => /^\d{1,2}:\d{2}$/.test(s.time))
          .map((s) => ({
            time: s.time,
            quantityNumerator: s.quantityNumerator,
            quantityDenominator: s.quantityDenominator,
            administrationUnit: s.administrationUnit,
          }))
      : [];
  return {
    patientId,
    farmacoNome: form.farmacoNome,
    dosaggio: '', // derived server-side from strength + form
    viaSomministrazione: form.viaSomministrazione,
    tipo: form.tipo,
    stato: form.stato,
    dataInizio: form.dataInizio,
    dataFine: form.tipo === 'periodica' && form.dataFine ? form.dataFine : null,
    commercialStrengthValue: strengthValue,
    commercialStrengthUnit: form.commercialStrengthUnit || null,
    pharmaceuticalForm: form.pharmaceuticalForm || null,
    allowedFractions: allowed.length ? allowed.join(',') : '1',
    giorniSettimana:
      form.tipo === 'periodica' && form.giorniSettimana.length
        ? form.giorniSettimana.join(',')
        : null,
    schedules,
    prescrittore: form.prescrittore || null,
    operatoreInseritore: operatoreNome,
    note: form.note || null,
    dataSomministrazione:
      form.tipo === 'una_tantum' && form.dataSomministrazione ? form.dataSomministrazione : null,
    orarioSomministrazione:
      form.tipo === 'una_tantum' && form.orarioSomministrazione
        ? form.orarioSomministrazione
        : null,
  };
}

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

export function TerapiaFarmacologicaTab({ paziente, operatoreNome }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('attivi');
  const [therapies, setTherapies] = useState<PatientTherapyAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextTherapyCursor, setNextTherapyCursor] = useState<string | null>(null);
  const [loadingMoreTherapies, setLoadingMoreTherapies] = useState(false);
  const [therapySummary, setTherapySummary] = useState<{
    total: number;
    active: number;
    inactive: number;
  } | null>(null);
  const [therapyFilterDraft, setTherapyFilterDraft] = useState<TherapyListFilters>({});
  const [therapyFilters, setTherapyFilters] = useState<TherapyListFilters>({});
  const [error, setError] = useState('');
  const [therapyLoadError, setTherapyLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TherapyForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  // Daily view state
  const [dailyDate, setDailyDate] = useState(todayStr());
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
  }, [paziente.id]);

  const loadTherapies = useCallback(async () => {
    const sequence = ++therapyLoadSequence.current;
    const requestedPatientId = paziente.id;
    try {
      setLoading(true);
      setLoadingMoreTherapies(false);
      setTherapyLoadError('');
      const page = await loadTherapyPage(requestedPatientId, 'tutte', null, therapyFilters);
      if (
        sequence !== therapyLoadSequence.current ||
        activePatientId.current !== requestedPatientId
      ) {
        return;
      }
      const data = [...page.items];
      data.sort((a, b) => (STATO_ORDER[a.stato] ?? 9) - (STATO_ORDER[b.stato] ?? 9));
      setTherapies(data);
      setNextTherapyCursor(page.pageInfo.nextCursor);
      setTherapySummary(page.summary);
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

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm());
    setShowForm(true);
    setSubTab('programmazione');
  };
  const openEdit = (t: PatientTherapyAPI) => {
    setEditId(t.id);
    setForm(therapyToForm(t));
    setShowForm(true);
    setSubTab('programmazione');
  };
  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm());
  };

  const handleSave = async () => {
    if (!form.farmacoNome.trim() || !form.dataInizio) return;
    if (form.tipo === 'periodica' && !form.schedules.some((s) => /^\d{1,2}:\d{2}$/.test(s.time))) {
      setError('Aggiungi almeno un orario di somministrazione.');
      return;
    }
    const payload = formToPayload(form, paziente.id, operatoreNome);
    try {
      setSaving(true);
      setError('');
      const url = editId
        ? `${API_URL}/patients/${paziente.id}/therapies/${editId}`
        : `${API_URL}/patients/${paziente.id}/therapies`;
      const res = await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Errore ${res.status}`);
      closeForm();
      invalidateTherapies();
      await loadTherapies();
      setSubTab('attivi');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore salvataggio');
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
      if (!res.ok) throw new Error(`Errore ${res.status}`);
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
      if (!res.ok) throw new Error(`Errore ${res.status}`);
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
      if (!res.ok) throw new Error(`Errore ${res.status}`);
      invalidateTherapies();
      await loadTherapies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore riattivazione');
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────────

  const attive = therapies.filter((t) => t.stato === 'attiva');
  const inattive = therapies.filter((t) => t.stato !== 'attiva');

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
        })),
      ),
  );

  // ── Sub-tab nav ────────────────────────────────────────────────────────────────

  const SUB_TABS: TopNavItem[] = [
    { key: 'attivi', label: 'Farmaci attivi', badge: therapySummary?.active ?? attive.length },
    { key: 'programmazione', label: 'Programmazione' },
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
  const renderFarmaco = (v: string, row?: unknown) => {
    const dosaggio = dosaggioDellaRiga(row);
    const risoluzione = trovaRisoluzione(risoluzioni, v, dosaggio);
    return (
      <span style={{ fontWeight: 600 }}>
        {v}
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
        {(risoluzione?.stato === 'non-trovato' || risoluzione?.stato === 'senza-documento') && (
          <button
            type="button"
            className="farmaco-non-trovato"
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
            className="farmaco-non-trovato"
            title="L'anagrafica farmaci non ha risposto: non è detto che il farmaco sia assente"
            style={{ cursor: 'default' }}
          >
            anagrafica non raggiungibile
          </span>
        )}
      </span>
    );
  };

  // ── Column definitions ────────────────────────────────────────────────────────

  const attiviColumns: ColumnDef<PatientTherapyAPI>[] = [
    {
      key: 'farmacoNome',
      label: 'Farmaco',
      sortable: true,
      filterable: false,
      filterType: 'text',
      render: renderFarmaco,
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
          <button
            className="icon-btn icon-btn--sm icon-btn--edit"
            title="Modifica"
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
          <button
            className="icon-btn icon-btn--sm"
            title="Sospendi"
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
          <button
            className="icon-btn icon-btn--sm icon-btn--danger"
            title="Elimina"
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
        </div>
      ),
    },
  ];

  const programmazioneColumns: ColumnDef<PatientTherapyAPI>[] = [
    {
      key: 'farmacoNome',
      label: 'Farmaco',
      sortable: true,
      filterable: false,
      filterType: 'text',
      render: renderFarmaco,
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
          <button
            className="icon-btn icon-btn--sm icon-btn--edit"
            title="Modifica"
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
          <button
            className="icon-btn icon-btn--sm icon-btn--danger"
            title="Elimina"
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
        </div>
      ),
    },
  ];

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
      render: (v: string) => (
        <span
          className={`badge ${v === 'administered' ? 'badge--green' : v === 'not_administered' ? 'badge--red' : 'badge--amber'}`}
        >
          {v === 'administered'
            ? 'Erogata'
            : v === 'not_administered'
              ? 'Non erogata'
              : 'Da erogare'}
        </span>
      ),
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
      render: (v: string) => (
        <span
          className={`badge ${v === 'erogata' ? 'badge--green' : v === 'non_erogata' ? 'badge--red' : 'badge--amber'}`}
        >
          {v === 'erogata' ? 'Erogata' : v === 'non_erogata' ? 'Non erogata' : 'Da erogare'}
        </span>
      ),
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
      render: (_: unknown, t: PatientTherapyAPI) => (
        <button
          className="icon-btn icon-btn--sm"
          title="Riattiva"
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
    <div className="cr-tab-content">
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
          Verifica anagrafica parziale: carica le altre terapie prima di considerare completo il
          controllo delle anomalie.
        </div>
      )}

      <ClinicalTableSection
        title="Terapia Farmacologica"
        count={therapySummary?.active ?? attive.length}
        countLabel={therapyFiltersActive ? 'farmaci attivi nei risultati' : 'farmaci attivi'}
        actions={
          <button className="btn-sm" onClick={openAdd}>
            + Aggiungi farmaco
          </button>
        }
      >
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
              <button type="button" className="btn-secondary btn-sm" onClick={clearTherapyFilters}>
                Azzera
              </button>
            )}
          </div>
        </div>
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

        {/* Sub-tab navigation — Feature 010 (FR-013): clinical sub-menu gap */}
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
                <button className="link-btn" onClick={openAdd}>
                  + Aggiungi
                </button>
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
              />
              {therapyPager}
            </>
          ))}

        {/* ── Sub-tab: Programmazione ── */}
        {subTab === 'programmazione' && (
          <div className="cts__body--padded">
            {showForm ? (
              <div className="terapia-sched-form">
                <TherapyFormFields value={form} onChange={setForm} operatoreNome={operatoreNome} />
                <div className="form-actions">
                  {campiMancanti && (
                    // Il pulsante disabilitato da solo non dice cosa manca, e il campo mancante
                    // puo' essere fuori schermo in una maschera lunga come questa.
                    <small className="form-hint">Manca: {campiMancanti}.</small>
                  )}
                  <button className="btn-secondary btn-sm" onClick={closeForm}>
                    Annulla
                  </button>
                  <button
                    className="btn-success btn-sm"
                    disabled={saving || campiMancanti !== null}
                    onClick={handleSave}
                  >
                    {saving ? 'Salvataggio...' : editId ? 'Aggiorna' : 'Salva terapia'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  className="btn-success btn-sm"
                  style={{ marginBottom: 12 }}
                  onClick={openAdd}
                >
                  + Nuova terapia
                </button>
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
                    />
                    {therapyPager}
                  </>
                )}
              </>
            )}
          </div>
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
              />
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
        <VisoreDocumentoFarmaco
          documento={documentoAperto.documento}
          prescrizione={documentoAperto.prescrizione}
          onChiudi={() => setDocumentoAperto(null)}
        />
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
