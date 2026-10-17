import { useEffect, useState } from 'react';
import type {
  Operatore,
  Camera,
  ClinicalOverview,
  ConsegnaOverview,
  NavKey,
  ScheduleOperatore,
} from '../../types';
import { PageHeader } from '../shared/PageHeader';
import { useAnomalieReparto, anomalyTherapyId } from '../operator/cartella/useAnomalieReparto';
import { useRiepilogoSomministrazioni } from '../operator/cartella/useRiepilogoSomministrazioni';
import type { PatientLanding } from '../../lib/patientTargetResolver';
import type { PatientListEntry } from '../../lib/patientListView';
import type { ConsegnaFeedQuery } from '../../lib/consegneFeed';
import { API_URL } from '../../config';
import { operatorHeaders } from '../../lib/operatorSession';
import { useCan } from '../../lib/capabilities';
import { useUnreadUrgencies } from '../../lib/useUnreadUrgencies';
import { facilityLocalMinute } from '../../lib/facilityTime';
import {
  buildAdminAttention,
  operatorsOnDuty,
  parseAttentionSchedules,
  type AdminAttention,
} from './adminAttentionModel';
import { AdminAttentionList } from './AdminAttentionList';
import './AdminAttentionList.css';

interface AdminDashboardProps {
  operatori: Operatore[];
  operatorSummary?: { total: number; active: number; appointmentsToday: number } | null;
  consegneOverview: ConsegnaOverview | null;
  consegneOverviewState: 'loading' | 'ready' | 'error';
  camere: Camera[];
  camereLoadState: 'idle' | 'loading' | 'ready' | 'error';
  camereLoadError: string | null;
  onRetryCamere: () => void;
  totalePazienti: number;
  loadingPazienti: boolean;
  onNavigate: (nav: NavKey) => void;
  onOpenLateTherapy?: () => void;
  onOpenConsegneAperte?: () => void;
  onOpenConsegneFeed?: () => void;
  onSelectPaziente?: (nome: string, patientId?: string, landing?: PatientLanding) => void;
  onOpenPatientList?: (entry: PatientListEntry) => void;
  onOpenConsegneQuery?: (query: ConsegnaFeedQuery) => void;
  clinicalOverview?: ClinicalOverview | null;
  clinicalOverviewState: 'loading' | 'ready' | 'error';
  onRetryClinicalOverview: () => void;
}

function useStaffing(enabled: boolean) {
  const [now, setNow] = useState(() => new Date());
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<{
    state: 'loading' | 'ready' | 'error';
    rows: ScheduleOperatore[];
  }>({ state: 'loading', rows: [] });
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      setNow(new Date());
      setRevision((value) => value + 1);
    };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void fetch(`${API_URL}/operators/schedules`, {
      headers: operatorHeaders(),
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Orari non disponibili');
        const rows = parseAttentionSchedules(await response.json());
        if (!controller.signal.aborted) setSnapshot({ state: 'ready', rows });
      })
      .catch(() => {
        if (!controller.signal.aborted) setSnapshot({ state: 'error', rows: [] });
      });
    return () => controller.abort();
  }, [enabled, revision]);
  return { ...snapshot, now, retry: () => setRevision((value) => value + 1) };
}

export function AdminDashboard({
  operatori,
  operatorSummary = null,
  consegneOverviewState,
  camere,
  camereLoadState,
  camereLoadError,
  onRetryCamere,
  loadingPazienti,
  onNavigate,
  onOpenConsegneAperte,
  onSelectPaziente,
  onOpenPatientList,
  clinicalOverview = null,
  clinicalOverviewState,
  onRetryClinicalOverview,
}: AdminDashboardProps) {
  const canReadDiary = useCan('diary.list');
  const canReadSchedules = useCan('operators.schedules');
  const canReadRooms = useCan('rooms.list');
  const urgencies = useUnreadUrgencies(canReadDiary);
  const somministrazioni = useRiepilogoSomministrazioni();
  const anomalie = useAnomalieReparto();
  const staffing = useStaffing(canReadSchedules);
  const rows = buildAdminAttention({
    urgencies: urgencies.rows,
    therapies: somministrazioni.disponibile && !somministrazioni.fallito ? somministrazioni : null,
    clinical: clinicalOverview,
    anomalies: anomalie.pazienti.flatMap((patient) =>
      patient.esito.anomalie.map((anomaly) => ({
        patientId: patient.patientId,
        nome: patient.nome,
        farmacoNome: anomaly.farmacoNome,
        therapyId: anomalyTherapyId(anomalie, patient.patientId, anomaly.farmacoNome),
      })),
    ),
  });
  const uncertain =
    !canReadDiary ||
    urgencies.state !== 'ready' ||
    urgencies.atLeast ||
    somministrazioni.inCorso ||
    somministrazioni.fallito ||
    anomalie.inCorso ||
    anomalie.fallito ||
    anomalie.verificaIncompleta ||
    clinicalOverviewState !== 'ready';
  const currentStaff = operatorsOnDuty(operatori, staffing.rows, staffing.now);
  const beds = camere.flatMap((camera) => camera.letti);
  const occupied = beds.filter((bed) => bed.stato === 'occupato').length;
  const free = beds.filter((bed) => bed.stato === 'libero').length;
  const openAttention = (row: AdminAttention) => {
    if ('list' in row.target) {
      if (onOpenPatientList) onOpenPatientList(row.target.list);
      else onNavigate('pazienti');
    } else if (onSelectPaziente) {
      onSelectPaziente(row.patientName ?? '', row.target.patientId, row.target.landing);
    } else onNavigate('pazienti');
  };
  const openUrgencies = () =>
    onOpenConsegneAperte ? onOpenConsegneAperte() : onNavigate('consegne');
  const localDay = facilityLocalMinute(staffing.now).slice(0, 10);
  const dayLabel = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Rome',
  }).format(staffing.now);

  return (
    <div className="admin-dashboard" data-clinical-day={localDay}>
      <PageHeader
        breadcrumb={[{ label: 'ClinicOS' }, { label: 'Reparto adesso' }]}
        title="Reparto adesso"
        subtitle={dayLabel}
      />
      <AdminAttentionList
        rows={rows}
        loading={
          urgencies.state === 'loading' ||
          somministrazioni.inCorso ||
          anomalie.inCorso ||
          clinicalOverviewState === 'loading'
        }
        uncertain={uncertain}
        urgencyCount={canReadDiary && urgencies.state === 'ready' ? urgencies.rows.length : null}
        atLeast={urgencies.atLeast}
        onOpen={openAttention}
      >
        {!canReadDiary && (
          <p className="admin-attention__status" role="status">
            La coda delle urgenze non è disponibile per il tuo ruolo.
          </p>
        )}
        {canReadDiary && urgencies.state === 'error' && (
          <p className="admin-attention__status" role="alert">
            Urgenze non disponibili: il dato non equivale a zero.{' '}
            <button type="button" className="link-btn" onClick={openUrgencies}>
              Apri Consegne
            </button>
          </p>
        )}
        {urgencies.atLeast && (
          <p className="admin-attention__status" role="status">
            Ci possono essere altre urgenze oltre le pagine lette.{' '}
            <button type="button" className="link-btn" onClick={openUrgencies}>
              Tutte le urgenze
            </button>
          </p>
        )}
        {somministrazioni.fallito && (
          <p className="admin-attention__status" role="alert">
            Dosi di oggi non disponibili.{' '}
            <button type="button" className="link-btn" onClick={somministrazioni.aggiorna}>
              Riprova dosi
            </button>
          </p>
        )}
        {somministrazioni.aggiornamentoInCorso && !somministrazioni.inCorso && (
          <p className="admin-attention__status" role="status">
            Aggiornamento delle dosi in corso; sono mostrati gli ultimi dati disponibili.
          </p>
        )}
        {clinicalOverviewState === 'error' && (
          <p className="admin-attention__status" role="alert">
            Situazione clinica non aggiornata
            {clinicalOverview ? ': sono mostrati gli ultimi dati disponibili.' : '.'}{' '}
            <button type="button" className="link-btn" onClick={onRetryClinicalOverview}>
              Riprova dati clinici
            </button>
          </p>
        )}
        {consegneOverviewState === 'error' && (
          <p className="admin-attention__status" role="alert">
            Riepilogo consegne non disponibile. Le urgenze mostrate provengono dalla coda diario e
            consegne.{' '}
            <button type="button" className="link-btn" onClick={openUrgencies}>
              Apri Consegne
            </button>
          </p>
        )}
        {(anomalie.fallito || anomalie.verificaIncompleta) && (
          <p className="admin-attention__status" role="alert">
            Verifica prescrizioni {anomalie.fallito ? 'non disponibile' : 'parziale'}.{' '}
            <button
              type="button"
              className="link-btn"
              onClick={() =>
                onOpenPatientList
                  ? onOpenPatientList({ signal: 'anomalie' })
                  : onNavigate('pazienti')
              }
            >
              Verifica prescrizioni
            </button>
          </p>
        )}
      </AdminAttentionList>
      <section
        className="admin-ward-summary"
        data-admin-staffing
        aria-labelledby="admin-staffing-title"
      >
        <h2 id="admin-staffing-title">In turno ora</h2>
        {!canReadSchedules ? (
          <p role="status">Gli orari non sono disponibili per il tuo ruolo.</p>
        ) : staffing.state === 'loading' ? (
          <p role="status">Caricamento turni…</p>
        ) : staffing.state === 'error' ? (
          <p role="alert">
            Turni non disponibili.{' '}
            <button type="button" className="link-btn" onClick={staffing.retry}>
              Riprova turni
            </button>
          </p>
        ) : staffing.rows.length === 0 ? (
          <p>
            Nessun orario configurato.{' '}
            <button
              type="button"
              className="link-btn"
              onClick={() => onNavigate('orari-operatori')}
            >
              Configura turni
            </button>
          </p>
        ) : (
          <>
            {currentStaff.length > 0 ? (
              <ul className="admin-ward-summary__list">
                {currentStaff.map((operator) => (
                  <li key={operator.id} data-on-duty={operator.id}>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => onNavigate('orari-operatori')}
                    >
                      {operator.cognome} {operator.nome}
                    </button>
                    <span>{operator.pazientiAssegnati} pazienti assegnati</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                Nessun operatore in turno negli orari configurati.{' '}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => onNavigate('orari-operatori')}
                >
                  Verifica turni
                </button>
              </p>
            )}
            {operatori.some(
              (operator) =>
                operator.stato === 'attivo' &&
                !staffing.rows.some((schedule) => schedule.operatoreId === operator.id),
            ) && (
              <p role="status">
                Alcuni operatori non hanno orari configurati.{' '}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => onNavigate('orari-operatori')}
                >
                  Completa turni
                </button>
              </p>
            )}
          </>
        )}
        {(loadingPazienti || (operatorSummary && operatorSummary.total > operatori.length)) && (
          <p role="status">
            Carichi mostrati per gli operatori disponibili
            {operatorSummary ? ` (${operatori.length} di ${operatorSummary.total})` : ''}.{' '}
            <button
              type="button"
              className="link-btn"
              onClick={() => onNavigate('gestione-operatori')}
            >
              Gestione operatori
            </button>
          </p>
        )}
        {canReadRooms && (
          <div className="admin-ward-summary__occupancy" data-admin-occupancy>
            {camereLoadState === 'idle' || camereLoadState === 'loading' ? (
              <span role="status">Caricamento occupazione…</span>
            ) : camereLoadState === 'error' ? (
              <span role="alert">
                Occupazione non aggiornata
                {camere.length > 0
                  ? `: ultimi dati ${occupied}/${beds.length} letti occupati.`
                  : '.'}{' '}
                {camereLoadError && <span>{camereLoadError}</span>}{' '}
                <button type="button" className="link-btn" onClick={onRetryCamere}>
                  Riprova occupazione
                </button>
              </span>
            ) : camere.length === 0 ? (
              <>
                <span>Nessuna camera configurata.</span>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => onNavigate('posti-letto')}
                >
                  Configura camere
                </button>
              </>
            ) : (
              <>
                <span>
                  Letti: {occupied}/{beds.length} occupati · {free} liberi
                </span>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => onNavigate('posti-letto')}
                >
                  Gestisci letti
                </button>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
