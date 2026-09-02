import type { UtenteApp, SlotAgenda, ClinicalOverview, ConsegnaOverview } from '../../types';
import {
  IcoArrow,
  IcoWarning,
  IcoCalendar,
  IcoConsegne,
  IcoActivity,
  IcoShield,
  IcoClock,
  IcoChevronRight,
  IcoBed,
  IcoPill,
} from '../../icons';
import type { NavKey } from '../../types';
import { PageHeader } from '../shared/PageHeader';
import { useAnomalieReparto } from './cartella/useAnomalieReparto';
import { useRiepilogoSomministrazioni } from './cartella/useRiepilogoSomministrazioni';
import { DashboardNotificationCenter } from './DashboardNotificationCenter';
import { buildDashboardNotificationSections } from './buildDashboardNotificationSections';
import { buildDashboardNotificationCounts } from './dashboardNotificationModel';

interface OperatorDashboardProps {
  utente: UtenteApp;
  consegneOverview: ConsegnaOverview | null;
  consegneOverviewState: 'loading' | 'ready' | 'error';
  agenda: SlotAgenda[];
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

const STATO_LABEL: Record<string, string> = {
  completato: 'Completato',
  in_corso: 'In corso',
  programmato: 'Programmato',
  libero: 'Libero',
  annullato: 'Annullato',
};

export function OperatorDashboard({
  utente,
  consegneOverview,
  consegneOverviewState,
  agenda,
  totalePazienti,
  loadingPazienti,
  onNavigate,
  onOpenConsegneAperte,
  onSelectPaziente,
  clinicalOverview = null,
  clinicalOverviewState,
  onRetryClinicalOverview,
}: OperatorDashboardProps) {
  const consegnaSummary = consegneOverview?.summary;
  const urgenti = consegneOverview?.urgentPreview ?? [];
  const overviewAvailable = consegnaSummary !== undefined;
  const urgentCount = consegnaSummary?.urgentOpen;
  const aperte = consegnaSummary?.open;
  const prossimoSlot = agenda.find((s) => s.stato === 'programmato' || s.stato === 'in_corso');
  // AC8: pazienti con farmaci fuori anagrafica. Stessa richiesta di reparto della lista pazienti.
  const anomalie = useAnomalieReparto();
  const somministrazioni = useRiepilogoSomministrazioni();

  // Clinical KPIs from the constant-size server aggregate.
  const critici = clinicalOverview?.critici ?? 0;
  const rischiAlti = clinicalOverview?.rischiAlti ?? 0;
  const allergieGravi = clinicalOverview?.allergieGravi ?? 0;
  const pazientiRicoverati = clinicalOverview?.ricoverati ?? 0;
  const clinicalOverviewReady = clinicalOverviewState === 'ready' && clinicalOverview !== null;
  const overviewValue = (value: number): number | string => (clinicalOverviewReady ? value : '—');

  // Avanzamento terapie / consegne (dati reali)
  const terapieTotali = clinicalOverview?.terapieTotali ?? 0;
  const terapieCompletate = clinicalOverview?.terapieCompletate ?? 0;
  const pctTerapie = terapieTotali > 0 ? Math.round((terapieCompletate / terapieTotali) * 100) : 0;
  const consegneCompletate = consegnaSummary?.completed;
  const consegneTotali = consegnaSummary?.total;
  const pctConsegne =
    consegneTotali && consegneCompletate !== undefined
      ? Math.round((consegneCompletate / consegneTotali) * 100)
      : 0;

  const todayStr = new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const notificationCounts = buildDashboardNotificationCounts({
    delayedPatients: somministrazioni.ritardi.length,
    urgentHandovers: urgentCount ?? 0,
    drugAnomalyPatients: anomalie.pazienti.length,
    deliveryOverviewFailed: consegneOverviewState === 'error',
    clinicalOverviewFailed: clinicalOverviewState === 'error',
    administrationsFailed: somministrazioni.fallito,
    drugVerificationFailed: anomalie.fallito || anomalie.verificaIncompleta,
  });
  const notificationSections = buildDashboardNotificationSections({
    somministrazioni,
    anomalie,
    urgentCount,
    consegneOverviewState,
    clinicalOverviewState,
    overviewAvailable,
    onNavigate,
    onOpenConsegneAperte,
    onSelectPaziente,
    onRetryClinicalOverview,
  });

  return (
    <div className="operator-dashboard">
      <PageHeader
        breadcrumb={[{ label: 'ClinicOS' }, { label: 'Dashboard' }]}
        title={`Benvenuto, ${utente.nome}`}
        subtitle={`${utente.reparto} — ${todayStr}`}
        actions={
          <button className="btn-ghost-outline" onClick={() => onNavigate('pazienti')}>
            <IcoArrow /> Vedi pazienti
          </button>
        }
      />

      <DashboardNotificationCenter
        counts={notificationCounts}
        sections={notificationSections}
        loading={
          somministrazioni.inCorso ||
          anomalie.inCorso ||
          consegneOverviewState === 'loading' ||
          clinicalOverviewState === 'loading'
        }
      />

      {/* Clinical KPI band — banda alert clinici in cima */}
      <div className="kpi-alert-grid" aria-busy={clinicalOverviewState === 'loading'}>
        <div
          className={`kpi-alert-card${
            !clinicalOverviewReady
              ? ' kpi-alert-card--blue'
              : critici > 0
                ? ' kpi-alert-card--red'
                : ' kpi-alert-card--green'
          }`}
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('parametri-multipaziente')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigate('parametri-multipaziente');
            }
          }}
          title="Vai a Parametri"
        >
          <div className="kpi-alert-card__top">
            <span className="kpi-alert-card__ico">
              <IcoActivity />
            </span>
            <span className="kpi-alert-card__chevron">
              <IcoChevronRight />
            </span>
          </div>
          <span className="kpi-alert-card__val">{overviewValue(critici)}</span>
          <span className="kpi-alert-card__lbl">Parametri critici</span>
          {clinicalOverviewReady && critici === 0 && (
            <span className="kpi-alert-card__ok">Nessuna criticità</span>
          )}
        </div>
        <div
          className={`kpi-alert-card${
            !clinicalOverviewReady
              ? ' kpi-alert-card--blue'
              : rischiAlti > 0
                ? ' kpi-alert-card--amber'
                : ' kpi-alert-card--green'
          }`}
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('pazienti')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigate('pazienti');
            }
          }}
          title="Vai a Pazienti"
        >
          <div className="kpi-alert-card__top">
            <span className="kpi-alert-card__ico">
              <IcoShield />
            </span>
            <span className="kpi-alert-card__chevron">
              <IcoChevronRight />
            </span>
          </div>
          <span className="kpi-alert-card__val">{overviewValue(rischiAlti)}</span>
          <span className="kpi-alert-card__lbl">Rischi alti/critici</span>
          {clinicalOverviewReady && rischiAlti === 0 && (
            <span className="kpi-alert-card__ok">Nessuna criticità</span>
          )}
        </div>
        <div
          className={`kpi-alert-card${
            !clinicalOverviewReady
              ? ' kpi-alert-card--blue'
              : allergieGravi > 0
                ? ' kpi-alert-card--amber'
                : ' kpi-alert-card--green'
          }`}
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('pazienti')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigate('pazienti');
            }
          }}
          title="Vai a Pazienti"
        >
          <div className="kpi-alert-card__top">
            <span className="kpi-alert-card__ico">
              <IcoWarning />
            </span>
            <span className="kpi-alert-card__chevron">
              <IcoChevronRight />
            </span>
          </div>
          <span className="kpi-alert-card__val">{overviewValue(allergieGravi)}</span>
          <span className="kpi-alert-card__lbl">Allergie gravi</span>
          {clinicalOverviewReady && allergieGravi === 0 && (
            <span className="kpi-alert-card__ok">Nessuna criticità</span>
          )}
        </div>
        <div
          className="kpi-alert-card kpi-alert-card--blue"
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('pazienti')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigate('pazienti');
            }
          }}
          title="Vai a Pazienti"
        >
          <div className="kpi-alert-card__top">
            <span className="kpi-alert-card__ico">
              <IcoBed />
            </span>
            <span className="kpi-alert-card__chevron">
              <IcoChevronRight />
            </span>
          </div>
          <span className="kpi-alert-card__val">{overviewValue(pazientiRicoverati)}</span>
          <span className="kpi-alert-card__lbl">Ricoverati attivi</span>
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
          onClick={() => onNavigate('agenda-operatore')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigate('agenda-operatore');
            }
          }}
          title="Vai a Agenda"
        >
          <div className="kpi-alert-card__top">
            <span className="kpi-alert-card__ico">
              <IcoPill />
            </span>
            <span className="kpi-alert-card__chevron">
              <IcoChevronRight />
            </span>
          </div>
          <span className="kpi-alert-card__val">
            {somministrazioni.inCorso
              ? '—'
              : `${somministrazioni.inRitardo}/${somministrazioni.daFare}`}
          </span>
          <span className="kpi-alert-card__lbl">Somministrazioni in ritardo</span>
          {!somministrazioni.inCorso && somministrazioni.inRitardo === 0 && (
            <span className="kpi-alert-card__ok">Nessuna criticità</span>
          )}
        </div>
      </div>

      {/* Stat cards — KPI grandi e cliccabili */}
      <div className="stats-grid">
        {[
          {
            key: 'pazienti' as NavKey,
            mod: 'blue',
            label: 'I Miei Pazienti',
            value: loadingPazienti || clinicalOverviewState !== 'ready' ? '—' : totalePazienti,
            cta: 'Lista pazienti',
          },
          {
            key: 'agenda-operatore' as NavKey,
            mod: 'indigo',
            label: 'Appuntamenti Oggi',
            value: agenda.filter((s) => s.stato !== 'libero' && s.stato !== 'annullato').length,
            cta: 'Agenda',
          },
          {
            key: 'consegne' as NavKey,
            mod: 'emerald',
            label: 'Consegne Aperte',
            value:
              consegneOverviewState === 'loading' && !overviewAvailable ? '—' : (aperte ?? '—'),
            cta: 'Vedi consegne',
            danger: urgentCount !== undefined && urgentCount > 0,
          },
        ].map((c) => {
          // #283: la card consegne apre la pagina già filtrata (e con focus se una sola aperta)
          const open =
            c.key === 'consegne' && onOpenConsegneAperte
              ? onOpenConsegneAperte
              : () => onNavigate(c.key);
          return (
            <div
              key={c.key}
              className={`stat-card stat-card--${c.mod} stat-card--clickable`}
              role="button"
              tabIndex={0}
              onClick={open}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  open();
                }
              }}
            >
              <div className="stat-card__label">{c.label}</div>
              <div className="stat-card__value" style={c.danger ? { color: 'var(--red)' } : {}}>
                {c.value}
              </div>
              <span className="stat-card__action">
                {c.cta} <IcoArrow />
              </span>
            </div>
          );
        })}
      </div>

      {/* Avanzamento terapie — barre di avanzamento (dati reali cartelle) */}
      {(terapieTotali > 0 || overviewAvailable) && (
        <div className="progress-card-grid">
          {terapieTotali > 0 && (
            <div className="progress-card">
              <div className="progress-card__head">
                <span className="progress-card__label">Terapie completate</span>
                <span className="progress-card__count">
                  {terapieCompletate}/{terapieTotali}
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar__fill progress-bar__fill--emerald"
                  style={{ width: `${pctTerapie}%` }}
                />
              </div>
            </div>
          )}
          {overviewAvailable && (
            <div className="progress-card">
              <div className="progress-card__head">
                <span className="progress-card__label">Consegne evase</span>
                <span className="progress-card__count">
                  {consegneCompletate}/{consegneTotali}
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar__fill progress-bar__fill--blue"
                  style={{ width: `${pctConsegne}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Prossimo appuntamento */}
      {prossimoSlot && (
        <div className="next-appt-banner">
          <div className="next-appt-banner__label">
            <IcoCalendar /> Prossimo appuntamento
          </div>
          <div className="next-appt-banner__content">
            <span className="next-appt-banner__time">{prossimoSlot.ora}</span>
            {onSelectPaziente && prossimoSlot.pazienteNome ? (
              <button
                className="link-btn next-appt-banner__patient"
                onClick={() => onSelectPaziente(prossimoSlot.pazienteNome!, prossimoSlot.patientId)}
              >
                {prossimoSlot.pazienteNome}
              </button>
            ) : (
              <span className="next-appt-banner__patient">{prossimoSlot.pazienteNome}</span>
            )}
            <span className="next-appt-banner__motivo">{prossimoSlot.motivo}</span>
            <span className={`agenda-stato-pill agenda-stato--${prossimoSlot.stato}`}>
              {STATO_LABEL[prossimoSlot.stato] ?? prossimoSlot.stato}
            </span>
          </div>
        </div>
      )}

      {/* Agenda del giorno */}
      <div className="section-header" style={{ marginTop: 32 }}>
        <h3 className="section-header__title">
          <span className="section-header__ico">
            <IcoCalendar />
          </span>
          Agenda di Oggi
        </h3>
        <button className="link-btn" onClick={() => onNavigate('agenda-operatore')}>
          Vedi tutto <IcoArrow />
        </button>
      </div>

      <div className="agenda-day-list">
        {agenda.map((slot) => (
          <div key={slot.id} className={`agenda-day-slot agenda-day-slot--${slot.stato}`}>
            <span className="agenda-day-slot__time">{slot.ora}</span>
            <div className="agenda-day-slot__info">
              {slot.pazienteNome ? (
                onSelectPaziente ? (
                  <button
                    className="link-btn agenda-day-slot__patient"
                    onClick={() => onSelectPaziente(slot.pazienteNome!, slot.patientId)}
                  >
                    {slot.pazienteNome}
                  </button>
                ) : (
                  <span className="agenda-day-slot__patient">{slot.pazienteNome}</span>
                )
              ) : (
                <span className="agenda-day-slot__free">Slot libero</span>
              )}
              {slot.motivo && <span className="agenda-day-slot__motivo">{slot.motivo}</span>}
            </div>
            <span className={`agenda-stato-pill agenda-stato--${slot.stato}`}>
              {STATO_LABEL[slot.stato] ?? slot.stato}
            </span>
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
              Le Mie Consegne Urgenti
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
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
