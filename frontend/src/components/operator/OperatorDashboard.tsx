import type { UtenteApp, SlotAgenda, ClinicalOverview, ConsegnaOverview } from '../../types';
import { IcoArrow, IcoCalendar, IcoConsegne, IcoClock, IcoPazienti } from '../../icons';
import type { NavKey } from '../../types';
import { PageHeader } from '../shared/PageHeader';
import { useAnomalieReparto } from './cartella/useAnomalieReparto';
import { useRiepilogoSomministrazioni } from './cartella/useRiepilogoSomministrazioni';
import { DashboardNotificationCenter } from './DashboardNotificationCenter';
import { OperatorClinicalKpiBand } from './OperatorClinicalKpiBand';
import { buildDashboardNotificationSections } from './buildDashboardNotificationSections';
import { buildDashboardNotificationCounts } from './dashboardNotificationModel';
import './OperatorDashboard.css';

interface OperatorDashboardProps {
  utente: UtenteApp;
  consegneOverview: ConsegnaOverview | null;
  consegneOverviewState: 'loading' | 'ready' | 'error';
  agenda: SlotAgenda[];
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
          <button
            type="button"
            className="btn-secondary operator-dashboard__patient-cta"
            onClick={() => onNavigate('pazienti')}
          >
            <IcoPazienti /> Pazienti
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

      <OperatorClinicalKpiBand
        loading={clinicalOverviewState === 'loading' || somministrazioni.inCorso}
        clinicalReady={clinicalOverviewReady}
        critici={critici}
        rischiAlti={rischiAlti}
        allergieGravi={allergieGravi}
        pazientiRicoverati={pazientiRicoverati}
        somministrazioni={somministrazioni}
        onOpenParametri={() => onNavigate('parametri-multipaziente')}
        onOpenPazienti={() => onNavigate('pazienti')}
        onOpenAgenda={() => onNavigate('agenda-operatore')}
      />

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
