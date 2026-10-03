// UX cycle 2 — W5 «Storico»: how the therapy went. Scheduled doses (given / not given + reason)
// and «al bisogno» doses over time, grouped by day, with period, drug and status filters.
// «Sospese/concluse» is one of the status filters: it lists the suspended/concluded prescriptions
// (rendered by the tab, with Riattiva for the prescriber). Read-only for doses: administering is
// done from the Calendario. Same endpoints as before (bounded history feed + per-day PRN read).
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { loadMedicationAdministrationPage } from '../../../lib/medicationAdministrationPages';
import {
  loadPrnAdministrations,
  type PrnAdministration,
} from '../../../lib/therapyAdministrationWrite';
import { administeredTime, motivoLabel } from '../../../lib/therapyGiro';
import { facilityNow } from '../../../lib/therapyDoseStatus';
import {
  PRN_MAX_DAYS,
  filterHistory,
  historyDrugNames,
  periodDays,
  periodStart,
  type HistoryPeriod,
  type HistoryRow,
  type HistoryStatus,
} from '../../../lib/therapyView';
import { LoadingState } from './shared';
import { LoadErrorState } from './LoadErrorState';

interface MedAdmin {
  id: string;
  therapyId?: string | null;
  farmacoNome: string;
  farmacoDose: string;
  farmacoVia: string;
  date: string;
  fascia: string;
  ora: string;
  stato: string;
  operatoreNome?: string | null;
  motivo?: string | null;
  note?: string | null;
}

const PERIODS: { value: HistoryPeriod; label: string }[] = [
  { value: 'oggi', label: 'Oggi' },
  { value: '7', label: '7 giorni' },
  { value: '30', label: '30 giorni' },
  { value: 'tutto', label: 'Tutto' },
];
const STATUSES: { value: HistoryStatus; label: string }[] = [
  { value: 'tutte', label: 'Tutte' },
  { value: 'erogata', label: 'Somministrate' },
  { value: 'non_erogata', label: 'Non somministrate' },
  { value: 'prn', label: 'Al bisogno' },
  { value: 'sospese', label: 'Prescrizioni sospese/concluse' },
];
const PAGE = 60;

function scheduledRow(a: MedAdmin): HistoryRow {
  const reason = motivoLabel(a.motivo ?? null);
  return {
    id: `s-${a.id}`,
    kind: 'scheduled',
    therapyId: a.therapyId ?? null,
    date: a.date,
    time: a.ora,
    drugName: a.farmacoNome,
    dose: a.farmacoDose,
    route: a.farmacoVia,
    status: a.stato,
    operator: a.operatoreNome ?? null,
    detail: [reason, a.note].filter(Boolean).join(' · ') || null,
  };
}

function prnRow(p: PrnAdministration): HistoryRow {
  return {
    id: `p-${p.id}`,
    kind: 'prn',
    therapyId: p.therapyId,
    date: p.date,
    time: administeredTime(p.administeredAt) ?? '—',
    drugName: p.drugName,
    dose: p.dosage,
    route: p.route,
    status: 'al_bisogno',
    operator: p.administeredBy,
    detail: [`Indicazione: ${p.indication}`, p.note].filter(Boolean).join(' · '),
  };
}

function Outcome({ row }: { row: HistoryRow }) {
  if (row.kind === 'prn')
    return (
      <span className="ptc-status ptc-status--done">
        Al bisogno · somministrata{row.operator ? ` da ${row.operator}` : ''}
      </span>
    );
  if (row.status === 'erogata')
    return (
      <span className="ptc-status ptc-status--done">
        Somministrata{row.operator ? ` da ${row.operator}` : ''}
      </span>
    );
  if (row.status === 'non_erogata')
    return <span className="ptc-status ptc-status--missed">Non somministrata</span>;
  return <span className="ptc-status ptc-status--due">Da somministrare</span>;
}

function dayHeading(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

interface Props {
  patientId: string;
  status: HistoryStatus;
  onStatusChange: (status: HistoryStatus) => void;
  /** Drug names of the prescriptions (the drug filter also lists drugs without doses yet). */
  prescriptionNames: string[];
  /** Suspended/concluded prescriptions for the drug filter (rendered by the tab). */
  renderPrescriptions: (drug: string) => ReactNode;
}

export function TherapyHistoryView({
  patientId,
  status,
  onStatusChange,
  prescriptionNames,
  renderPrescriptions,
}: Props) {
  const today = facilityNow().date;
  const [period, setPeriod] = useState<HistoryPeriod>('7');
  const [drug, setDrug] = useState('');
  const [shown, setShown] = useState(PAGE);

  // Scheduled doses: bounded cursor feed (most recent first).
  const [history, setHistory] = useState<MedAdmin[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [nextHistoryCursor, setNextHistoryCursor] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState('');
  const historyLoadSequence = useRef(0);

  const loadHistory = useCallback(async () => {
    const sequence = ++historyLoadSequence.current;
    try {
      setHistoryLoading(true);
      setHistoryError('');
      const page = await loadMedicationAdministrationPage<MedAdmin>(patientId);
      if (sequence !== historyLoadSequence.current) return;
      setHistory(page.items);
      setNextHistoryCursor(page.pageInfo.nextCursor);
    } catch (err) {
      if (sequence !== historyLoadSequence.current) return;
      setHistory([]);
      setNextHistoryCursor(null);
      setHistoryError(err instanceof Error ? err.message : 'Impossibile caricare lo storico.');
    } finally {
      if (sequence === historyLoadSequence.current) setHistoryLoading(false);
    }
  }, [patientId]);

  const loadMoreHistory = useCallback(async () => {
    if (!nextHistoryCursor || historyLoadingMore) return;
    const sequence = ++historyLoadSequence.current;
    try {
      setHistoryLoadingMore(true);
      setHistoryError('');
      const page = await loadMedicationAdministrationPage<MedAdmin>(patientId, nextHistoryCursor);
      if (sequence !== historyLoadSequence.current) return;
      setHistory((current) => {
        const merged = new Map(current.map((a) => [a.id, a]));
        for (const a of page.items) merged.set(a.id, a);
        return [...merged.values()];
      });
      setNextHistoryCursor(page.pageInfo.nextCursor);
    } catch (err) {
      if (sequence === historyLoadSequence.current)
        setHistoryError(err instanceof Error ? err.message : 'Impossibile caricare altro storico.');
    } finally {
      if (sequence === historyLoadSequence.current) setHistoryLoadingMore(false);
    }
  }, [historyLoadingMore, nextHistoryCursor, patientId]);

  useEffect(() => {
    void (async () => {
      await loadHistory();
    })();
  }, [loadHistory]);

  // «Al bisogno» doses: one read per day of the period (periods up to PRN_MAX_DAYS).
  const prnDays = useMemo(() => periodDays(period, today), [period, today]);
  const prnKey = `${patientId}|${prnDays?.join(',') ?? ''}`;
  const [prn, setPrn] = useState<{ key: string; rows: PrnAdministration[]; error: boolean }>({
    key: '',
    rows: [],
    error: false,
  });
  useEffect(() => {
    if (!prnDays) return;
    const controller = new AbortController();
    Promise.all(prnDays.map((day) => loadPrnAdministrations(patientId, day, controller.signal)))
      .then((days) => setPrn({ key: prnKey, rows: days.flat(), error: false }))
      .catch(() => {
        if (!controller.signal.aborted) setPrn({ key: prnKey, rows: [], error: true });
      });
    return () => controller.abort();
  }, [patientId, prnDays, prnKey]);
  const prnCurrent = prnDays && prn.key === prnKey ? prn : null;

  const rows = useMemo(
    () => [...history.map(scheduledRow), ...(prnCurrent?.rows ?? []).map(prnRow)],
    [history, prnCurrent],
  );
  const drugs = useMemo(
    () => historyDrugNames([...prescriptionNames, ...rows.map((r) => r.drugName)]),
    [prescriptionNames, rows],
  );
  const visible = useMemo(
    () => filterHistory(rows, { period, drug, status }, today),
    [rows, period, drug, status, today],
  );
  // The feed is most recent first: older days of the period may still be on the server.
  const start = periodStart(period, today);
  const oldestLoaded = history.length ? history[history.length - 1].date : null;
  const periodPartial =
    Boolean(nextHistoryCursor) && (!start || (oldestLoaded !== null && oldestLoaded >= start));

  const groups = useMemo(() => {
    const byDay = new Map<string, HistoryRow[]>();
    for (const row of visible.slice(0, shown)) {
      const list = byDay.get(row.date) ?? [];
      list.push(row);
      byDay.set(row.date, list);
    }
    return [...byDay.entries()];
  }, [visible, shown]);

  const prescriptions = status === 'sospese';

  return (
    <section className="tf-history" aria-label="Storico della terapia">
      <div className="tf-history__filters" role="group" aria-label="Filtri dello storico">
        <div className="tf-history__filter">
          <span className="form-label" id="tf-history-status">
            Mostra
          </span>
          <div className="ds-chip-group tf-chips" role="group" aria-labelledby="tf-history-status">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                className="ds-chip"
                aria-pressed={status === s.value}
                onClick={() => {
                  setShown(PAGE);
                  onStatusChange(s.value);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        {!prescriptions && (
          <div className="tf-history__filter">
            <span className="form-label" id="tf-history-period">
              Periodo
            </span>
            <div
              className="ds-chip-group tf-chips"
              role="group"
              aria-labelledby="tf-history-period"
            >
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className="ds-chip"
                  aria-pressed={period === p.value}
                  onClick={() => {
                    setShown(PAGE);
                    setPeriod(p.value);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <label className="tf-history__filter tf-history__drug">
          <span className="form-label">Farmaco</span>
          <select
            className="form-input"
            value={drug}
            onChange={(event) => {
              setShown(PAGE);
              setDrug(event.target.value);
            }}
          >
            <option value="">Tutti i farmaci</option>
            {drugs.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {prescriptions ? (
        renderPrescriptions(drug)
      ) : historyLoading ? (
        <LoadingState msg="Caricamento storico…" />
      ) : historyError && history.length === 0 ? (
        <LoadErrorState message={historyError} onRetry={() => void loadHistory()} />
      ) : (
        <>
          {historyError && (
            <LoadErrorState
              message={historyError}
              onRetry={() => void loadMoreHistory()}
              retryLabel="Riprova caricamento"
            />
          )}
          {!prnDays && (status === 'tutte' || status === 'prn') && (
            <p className="tf-history__note" role="note">
              Le dosi al bisogno si vedono per periodi fino a {PRN_MAX_DAYS} giorni: scegli «Oggi» o
              «7 giorni».
            </p>
          )}
          {prnCurrent?.error && (
            <p className="tf-history__note" role="alert">
              Dosi al bisogno non disponibili: lo storico mostra solo le dosi programmate.
            </p>
          )}
          <p className="tf-history__count" role="status">
            {visible.length === 0
              ? 'Nessuna somministrazione per questi filtri.'
              : `${visible.length} ${visible.length === 1 ? 'somministrazione' : 'somministrazioni'}`}
          </p>
          <ol className="tf-history__days">
            {groups.map(([date, list]) => (
              <li key={date} className="tf-history__day">
                <h4>{dayHeading(date)}</h4>
                <ul>
                  {list.map((row) => (
                    <li
                      key={row.id}
                      className="tf-history__row"
                      data-testid="therapy-history-row"
                      data-therapy-id={row.therapyId ?? undefined}
                    >
                      <time className="tf-history__time">
                        {row.time}
                      </time>
                      <span className="tf-history__drug-cell">
                        <strong>{row.drugName}</strong>
                        <span>
                          {row.dose}
                          {row.route ? ` · ${row.route}` : ''}
                        </span>
                      </span>
                      <span className="tf-history__outcome">
                        <Outcome row={row} />
                        {row.detail && <span className="tf-history__detail">{row.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          {visible.length > shown && (
            <button
              type="button"
              className="ds-btn ds-btn--secondary"
              onClick={() => setShown((n) => n + PAGE)}
            >
              Mostra altre {Math.min(PAGE, visible.length - shown)}
            </button>
          )}
          {periodPartial && !historyError && (
            <p className="tf-history__more">
              <span>{history.length} somministrazioni caricate; lo storico è parziale.</span>{' '}
              <button
                type="button"
                className="ds-btn ds-btn--secondary"
                disabled={historyLoadingMore}
                onClick={() => void loadMoreHistory()}
              >
                {historyLoadingMore ? 'Caricamento…' : 'Carica altro storico'}
              </button>
            </p>
          )}
        </>
      )}
    </section>
  );
}
