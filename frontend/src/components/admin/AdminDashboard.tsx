import type { Operatore, Camera, ClinicalOverview, ConsegnaOverview, NavKey } from '../../types';
import {
  IcoArrow,
  IcoWarning,
  IcoOperatori,
  IcoConsegne,
  IcoCalendar,
  IcoBed,
  IcoActivity,
  IcoShield,
  IcoClock,
  IcoPill,
} from '../../icons';
import { PageHeader } from '../shared/PageHeader';
import { MAX_DASHBOARD_DELAY_ITEMS } from '../shared/dashboardAlertLimits';
import { useRiepilogoSomministrazioni } from '../operator/cartella/useRiepilogoSomministrazioni';
import '../operator/cartella/AvvisoAnomalieFarmaci.css';

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
  /** #283: apertura mirata della pagina Consegne (filtro aperte + focus se una sola). */
  onOpenConsegneAperte?: () => void;
  onSelectPaziente?: (nome: string, patientId?: string) => void;
  clinicalOverview?: ClinicalOverview | null;
  clinicalOverviewState: 'loading' | 'ready' | 'error';
  onRetryClinicalOverview: () => void;
}

function WorkloadBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const bg = color ?? (pct >= 80 ? 'var(--red)' : pct >= 60 ? 'var(--amber)' : 'var(--emerald)');
  return (
    <div className="workload-bar-track">
      <div className="workload-bar-fill" style={{ width: `${pct}%`, background: bg }} />
    </div>
  );
}

export function AdminDashboard({
  operatori,
  operatorSummary = null,
  consegneOverview,
  consegneOverviewState,
  camere,
  camereLoadState,
  camereLoadError,
  onRetryCamere,
  totalePazienti,
  loadingPazienti,
  onNavigate,
  onOpenConsegneAperte,
  onSelectPaziente,
  clinicalOverview = null,
  clinicalOverviewState,
  onRetryClinicalOverview,
}: AdminDashboardProps) {
  const attivi = operatori.filter((o) => o.stato === 'attivo');
  const operatorTotal = operatorSummary?.total ?? operatori.length;
  const activeOperatorTotal = operatorSummary?.active ?? attivi.length;
  const appointmentsTodayTotal =
    operatorSummary?.appointmentsToday ??
    attivi.reduce((sum, operator) => sum + operator.appuntamentiOggi, 0);
  const urgenti = consegneOverview?.urgentPreview ?? [];
  const overviewAvailable = consegneOverview !== null;
  const urgentCount = consegneOverview?.summary.urgentOpen;
  const maxPazienti = Math.max(...operatori.map((o) => o.pazientiAssegnati), 1);
  const somministrazioni = useRiepilogoSomministrazioni();

  // Clinical KPIs
  const critici = clinicalOverview?.critici ?? 0;
  const rischiAlti = clinicalOverview?.rischiAlti ?? 0;
  const dimessi = clinicalOverview?.dimessi ?? 0;
  const clinicalOverviewReady = clinicalOverviewState === 'ready' && clinicalOverview !== null;
  const overviewValue = (value: number): number | string => (clinicalOverviewReady ? value : '—');
  const consegneAperte = consegneOverview?.summary.open;
  const consegneInCorso = consegneOverview?.summary.inProgress;

  // Occupancy
  const totaleLetti = camere.flatMap((c) => c.letti);
  const lettiOccupati = totaleLetti.filter((l) => l.stato === 'occupato').length;
  const lettiLiberi = totaleLetti.filter((l) => l.stato === 'libero').length;
  const occupancyPct =
    totaleLetti.length > 0 ? Math.round((lettiOccupati / totaleLetti.length) * 100) : 0;
  const camereOccupate = camere.filter((c) => c.letti.every((l) => l.stato === 'occupato')).length;
  const roomSnapshotAvailable = camereLoadState === 'ready' || camere.length > 0;

  const todayStr = new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="admin-dashboard">
      <PageHeader
        breadcrumb={[{ label: 'ClinicOS' }, { label: 'Dashboard' }]}
        title="Dashboard"
        subtitle={todayStr}
      />

      {/* Alert urgenti */}
      {consegneOverviewState === 'error' && (
        <div className="coverage-alert" role="alert">
          <IcoWarning />
          <span>
            {overviewAvailable
              ? 'Aggiornamento consegne non riuscito: sono mostrati gli ultimi dati disponibili.'
              : 'Riepilogo consegne non disponibile. Apri Consegne per riprovare.'}
          </span>
        </div>
      )}
      {clinicalOverviewState === 'error' && (
        <div className="coverage-alert" role="alert">
          <IcoWarning />
          <span>
            <strong>Riepilogo clinico non disponibile.</strong> I valori non verificati sono
            indicati con un trattino.
          </span>
          <button className="link-btn" type="button" onClick={onRetryClinicalOverview}>
            Riprova <IcoArrow />
          </button>
        </div>
      )}
      {camereLoadState === 'error' && (
        <div className="coverage-alert" role="alert">
          <IcoWarning />
          <span>
            {roomSnapshotAvailable
              ? 'Aggiornamento occupazione non riuscito: sono mostrati gli ultimi dati disponibili.'
              : (camereLoadError ?? 'Occupazione camere non disponibile.')}
          </span>
          <button type="button" className="link-btn" onClick={onRetryCamere}>
            Riprova <IcoArrow />
          </button>
        </div>
      )}
      {urgentCount !== undefined && urgentCount > 0 && (
        <div className="coverage-alert">
          <IcoWarning />
          <span>
            <strong>
              {urgentCount} consegn
              {urgentCount === 1 ? 'a urgente aperta' : 'e urgenti aperte'}
            </strong>{' '}
            — richiedono attenzione immediata
          </span>
          <button className="link-btn" onClick={() => onNavigate('consegne')}>
            Vedi <IcoArrow />
          </button>
        </div>
      )}

      {/* Pazienti con somministrazioni in ritardo: urgenza clinica reale, resta in rosso. */}
      {somministrazioni.ritardi.length > 0 && (
        <div className="coverage-alert" role="alert">
          <IcoWarning />
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>
              {somministrazioni.ritardi.length} pazient
              {somministrazioni.ritardi.length === 1 ? 'e' : 'i'} con somministrazioni in ritardo
            </strong>{' '}
            — richiede attenzione immediata
            <ul className="anomalie-reparto__lista" style={{ marginTop: 8 }}>
              {somministrazioni.ritardi.slice(0, 5).map((p) => (
                <li key={p.patientId}>
                  <button
                    type="button"
                    className="anomalie-reparto__riga anomalie-reparto__riga--rosso"
                    onClick={() => onSelectPaziente?.(p.nome, p.patientId)}
                  >
                    <span className="anomalie-reparto__contenuto">
                      <span className="anomalie-reparto__nome">{p.nome}</span>
                      <span className="anomalie-reparto__farmaci-lista">
                        {p.voci.slice(0, MAX_DASHBOARD_DELAY_ITEMS).map((v, index) => (
                          <span
                            className="anomalie-reparto__farmaco"
                            key={`${v.farmacoNome}-${index}`}
                          >
                            <strong>{v.farmacoNome}</strong>
                            <span>
                              {v.scheduledTime} · +{v.minutiRitardo} min
                            </span>
                          </span>
                        ))}
                        {p.voci.length > MAX_DASHBOARD_DELAY_ITEMS && (
                          <span className="anomalie-reparto__altre-voci">
                            +{p.voci.length - MAX_DASHBOARD_DELAY_ITEMS} altri farmaci
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="badge badge--red">+{p.voci[0].minutiRitardo} min</span>
                  </button>
                </li>
              ))}
            </ul>
            {somministrazioni.ritardi.length > 5 && (
              <button
                className="link-btn"
                style={{ marginTop: 8 }}
                onClick={() => onNavigate('agenda-admin')}
              >
                +{somministrazioni.ritardi.length - 5} altre <IcoArrow />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="stats-grid">
        <div className="stat-card stat-card--blue">
          <div className="stat-card__label">Totale Pazienti</div>
          <div className="stat-card__value">
            {loadingPazienti || clinicalOverviewState !== 'ready' ? '—' : totalePazienti}
          </div>
          <button className="stat-card__action" onClick={() => onNavigate('pazienti')}>
            Vedi pazienti <IcoArrow />
          </button>
        </div>
        <div className="stat-card stat-card--teal">
          <div className="stat-card__label">Operatori Attivi</div>
          <div className="stat-card__value">
            {activeOperatorTotal}
            <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>/{operatorTotal}</span>
          </div>
          <button className="stat-card__action" onClick={() => onNavigate('gestione-operatori')}>
            Gestisci <IcoArrow />
          </button>
        </div>
        <div className="stat-card stat-card--indigo">
          <div className="stat-card__label">Appuntamenti Oggi</div>
          <div className="stat-card__value">{appointmentsTodayTotal}</div>
          <button className="stat-card__action" onClick={() => onNavigate('agenda-admin')}>
            Agenda <IcoArrow />
          </button>
        </div>
        <div className="stat-card stat-card--emerald">
          <div className="stat-card__label">Consegne Aperte</div>
          <div
            className="stat-card__value"
            style={urgentCount !== undefined && urgentCount > 0 ? { color: 'var(--red)' } : {}}
          >
            {consegneOverviewState === 'loading' && !overviewAvailable
              ? '—'
              : (consegneAperte ?? '—')}
          </div>
          <button
            className="stat-card__action"
            onClick={() => (onOpenConsegneAperte ? onOpenConsegneAperte() : onNavigate('consegne'))}
          >
            Vedi tutte <IcoArrow />
          </button>
        </div>
      </div>

      {/* Clinical KPIs */}
      <div className="section-header" style={{ marginTop: 28, marginBottom: 12 }}>
        <h3 className="section-header__title">
          <span className="section-header__ico">
            <IcoActivity />
          </span>
          Situazione Clinica
        </h3>
      </div>
      <div className="kpi-alert-grid" aria-busy={clinicalOverviewState === 'loading'}>
        <div
          className={`kpi-alert-card${
            !clinicalOverviewReady
              ? ' kpi-alert-card--blue'
              : critici > 0
                ? ' kpi-alert-card--red'
                : ' kpi-alert-card--green'
          }`}
        >
          <span className="kpi-alert-card__val">{overviewValue(critici)}</span>
          <span className="kpi-alert-card__lbl">
            <IcoActivity /> Parametri critici
          </span>
        </div>
        <div
          className={`kpi-alert-card${
            !clinicalOverviewReady
              ? ' kpi-alert-card--blue'
              : rischiAlti > 0
                ? ' kpi-alert-card--amber'
                : ' kpi-alert-card--green'
          }`}
        >
          <span className="kpi-alert-card__val">{overviewValue(rischiAlti)}</span>
          <span className="kpi-alert-card__lbl">
            <IcoShield /> Rischi alti/critici
          </span>
        </div>
        <div className="kpi-alert-card kpi-alert-card--blue">
          <span className="kpi-alert-card__val">
            {overviewAvailable ? `${consegneInCorso}/${consegneAperte}` : '—'}
          </span>
          <span className="kpi-alert-card__lbl">
            <IcoConsegne /> Consegne in corso
          </span>
        </div>
        <div
          className={`kpi-alert-card kpi-alert-card--${clinicalOverviewReady ? 'green' : 'blue'}`}
        >
          <span className="kpi-alert-card__val">{overviewValue(dimessi)}</span>
          <span className="kpi-alert-card__lbl">Dimessi in archivio</span>
        </div>
        <div
          className={`kpi-alert-card${
            somministrazioni.inCorso
              ? ' kpi-alert-card--blue'
              : somministrazioni.inRitardo > 0
                ? ' kpi-alert-card--red'
                : ' kpi-alert-card--green'
          }`}
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('agenda-admin')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigate('agenda-admin');
            }
          }}
          title="Vai a Agenda"
        >
          <span className="kpi-alert-card__val">
            {somministrazioni.inCorso
              ? '—'
              : `${somministrazioni.inRitardo}/${somministrazioni.daFare}`}
          </span>
          <span className="kpi-alert-card__lbl">
            <IcoPill /> Somministrazioni in ritardo
          </span>
        </div>
      </div>

      {/* Occupancy section */}
      <div className="section-header" style={{ marginTop: 32 }}>
        <h3 className="section-header__title">
          <span className="section-header__ico">
            <IcoBed />
          </span>
          Occupazione Struttura
        </h3>
        <button className="link-btn" onClick={() => onNavigate('posti-letto')}>
          Gestione posti letto <IcoArrow />
        </button>
      </div>

      {!roomSnapshotAvailable ? (
        <div className="occupancy-overview">
          <p role={camereLoadState === 'error' ? 'alert' : 'status'}>
            {camereLoadState === 'error'
              ? 'Dati di occupazione non disponibili.'
              : 'Caricamento occupazione struttura…'}
          </p>
        </div>
      ) : (
        <div className="occupancy-overview">
          <div className="occ-overview-card">
            <div className="occ-gauge-wrap">
              <svg viewBox="0 0 80 80" className="occ-gauge">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  fill="none"
                  stroke="var(--divider)"
                  strokeWidth="8"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  fill="none"
                  stroke={
                    occupancyPct >= 90
                      ? 'var(--red)'
                      : occupancyPct >= 70
                        ? 'var(--amber)'
                        : 'var(--emerald)'
                  }
                  strokeWidth="8"
                  strokeDasharray={`${occupancyPct * 2.01} 201`}
                  strokeLinecap="round"
                  transform="rotate(-90 40 40)"
                />
                <text
                  x="40"
                  y="44"
                  textAnchor="middle"
                  fontSize="16"
                  fontWeight="700"
                  fill="var(--text)"
                >
                  {occupancyPct}%
                </text>
              </svg>
            </div>
            <div className="occ-overview-stats">
              <div className="occ-overview-stat">
                <span className="occ-stat__val" style={{ color: 'var(--red)' }}>
                  {lettiOccupati}
                </span>
                <span className="occ-stat__lbl">Letti occupati</span>
              </div>
              <div className="occ-overview-stat">
                <span className="occ-stat__val" style={{ color: 'var(--emerald)' }}>
                  {lettiLiberi}
                </span>
                <span className="occ-stat__lbl">Letti liberi</span>
              </div>
              <div className="occ-overview-stat">
                <span className="occ-stat__val">{totaleLetti.length}</span>
                <span className="occ-stat__lbl">Totale letti</span>
              </div>
              <div className="occ-overview-stat">
                <span className="occ-stat__val">
                  {camereOccupate}/{camere.filter((c) => c.stato === 'attiva').length}
                </span>
                <span className="occ-stat__lbl">Camere piene</span>
              </div>
            </div>
          </div>

          {/* Reparto breakdown */}
          <div className="occ-reparti">
            {Array.from(new Set(camere.map((c) => c.reparto))).map((reparto) => {
              const camRep = camere.filter((c) => c.reparto === reparto);
              const lettiRep = camRep.flatMap((c) => c.letti);
              const occRep = lettiRep.filter((l) => l.stato === 'occupato').length;
              const pct = lettiRep.length > 0 ? Math.round((occRep / lettiRep.length) * 100) : 0;
              return (
                <div key={reparto} className="occ-reparto-row">
                  <span className="occ-reparto-name">{reparto}</span>
                  <div style={{ flex: 1 }}>
                    <WorkloadBar
                      value={occRep}
                      max={lettiRep.length}
                      color={
                        pct >= 90 ? 'var(--red)' : pct >= 70 ? 'var(--amber)' : 'var(--emerald)'
                      }
                    />
                  </div>
                  <span className="occ-reparto-count">
                    {occRep}/{lettiRep.length}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Carico operatori */}
      <div className="section-header" style={{ marginTop: 32 }}>
        <h3 className="section-header__title">
          <span className="section-header__ico">
            <IcoOperatori />
          </span>
          Carico Operatori
        </h3>
        <button className="link-btn" onClick={() => onNavigate('gestione-operatori')}>
          Gestione operatori <IcoArrow />
        </button>
      </div>

      <div className="operator-workload-grid">
        {operatori.map((op) => (
          <div
            key={op.id}
            className={`op-workload-card${op.stato === 'inattivo' ? ' op-workload-card--inactive' : ''}`}
            style={{ borderTop: `3px solid ${op.colore}` }}
          >
            <div className="op-workload-card__header">
              <div className="op-avatar-sm" style={{ background: op.colore }}>
                {op.iniziali}
              </div>
              <div className="op-workload-card__info">
                <span className="op-workload-card__name">
                  {op.cognome} {op.nome}
                </span>
                <span className="op-workload-card__role">
                  {op.ruolo} · {op.reparto}
                </span>
              </div>
              <span className={`stato-pill stato-pill--${op.stato}`}>{op.stato}</span>
            </div>
            {op.stato === 'attivo' && (
              <>
                <div className="op-workload-stats">
                  <div className="op-stat">
                    <span className="op-stat__val">{op.pazientiAssegnati}</span>
                    <span className="op-stat__lbl">Pazienti</span>
                  </div>
                  <div className="op-stat">
                    <span className="op-stat__val">{op.appuntamentiOggi}</span>
                    <span className="op-stat__lbl">Appuntamenti</span>
                  </div>
                  <div className="op-stat">
                    <span className="op-stat__val">
                      {overviewAvailable ? (consegneOverview.byOperator[op.id] ?? 0) : '—'}
                    </span>
                    <span className="op-stat__lbl">Consegne</span>
                  </div>
                </div>
                <WorkloadBar value={op.pazientiAssegnati} max={maxPazienti} color={op.colore} />
              </>
            )}
          </div>
        ))}
      </div>

      {/* Agenda sommario */}
      <div className="section-header" style={{ marginTop: 32 }}>
        <h3 className="section-header__title">
          <span className="section-header__ico">
            <IcoCalendar />
          </span>
          Riepilogo Agenda Oggi
        </h3>
        <button className="link-btn" onClick={() => onNavigate('agenda-admin')}>
          Agenda completa <IcoArrow />
        </button>
      </div>

      <div className="agenda-summary-grid">
        {attivi.map((op) => (
          <div
            key={op.id}
            className="agenda-summary-card"
            style={{ borderTop: `3px solid ${op.colore}` }}
          >
            <div className="agenda-summary-card__header">
              <div className="op-avatar-sm" style={{ background: op.colore }}>
                {op.iniziali}
              </div>
              <span className="agenda-summary-card__name">
                {op.cognome} {op.nome}
              </span>
              <span className="agenda-summary-card__count">{op.appuntamentiOggi} appt.</span>
            </div>
            <div className="agenda-summary-slots">
              {Array.from({ length: Math.min(op.appuntamentiOggi, 5) }, (_, i) => (
                <span key={i} className="agenda-slot-dot" style={{ background: op.colore }} />
              ))}
              {op.appuntamentiOggi === 0 && (
                <span className="agenda-summary-free">Nessun appuntamento</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Consegne urgenti */}
      {urgenti.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop: 32 }}>
            <h3 className="section-header__title">
              <span className="section-header__ico">
                <IcoConsegne />
              </span>
              Consegne Urgenti
            </h3>
            <button className="link-btn" onClick={() => onNavigate('consegne')}>
              Vedi tutte <IcoArrow />
            </button>
          </div>
          <div className="consegne-list">
            {urgenti.slice(0, 3).map((c) => (
              <div key={c.id} className="consegna-card consegna-card--urgente">
                <div className="consegna-card__top">
                  <span className="consegna-priorita-badge consegna-priorita-badge--urgente">
                    Urgente
                  </span>
                  <span className="consegna-tipo">{c.tipo}</span>
                  {c.oraScadenza && (
                    <span className="consegna-scadenza">
                      <IcoClock />
                      {c.oraScadenza}
                    </span>
                  )}
                </div>
                {onSelectPaziente && c.pazienteNome ? (
                  <button
                    className="link-btn consegna-paziente"
                    onClick={() => onSelectPaziente(c.pazienteNome!, c.pazienteId)}
                    style={{ fontWeight: 600 }}
                  >
                    {c.pazienteNome}
                  </button>
                ) : (
                  <span className="consegna-paziente">{c.pazienteNome}</span>
                )}
                <p className="consegna-note">{c.note}</p>
                <span className="consegna-assegnato">→ {c.operatoreAssegnato}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
