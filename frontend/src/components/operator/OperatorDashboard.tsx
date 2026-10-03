import type { UtenteApp, SlotAgenda, ClinicalOverview, ConsegnaOverview } from '../../types';
import type { NavKey } from '../../types';
import { useMemo } from 'react';
import type { TurnoTherapies } from '../../lib/turnoPatients';
import { PageHeader } from '../shared/PageHeader';
import { useAnomalieReparto } from './cartella/useAnomalieReparto';
import { useRiepilogoSomministrazioni } from './cartella/useRiepilogoSomministrazioni';
import { DashboardNotificationCenter } from './DashboardNotificationCenter';
import { OperatorClinicalKpiBand } from './OperatorClinicalKpiBand';
import { AdessoQueue } from './AdessoQueue';
import { TurnoAppointments } from './TurnoAppointments';
import { TurnoPatients } from './TurnoPatients';
import { buildAdessoQueue } from '../../lib/adessoQueue';
import { buildDashboardNotificationSections } from './buildDashboardNotificationSections';
import { buildDashboardNotificationCounts } from './dashboardNotificationModel';
import './OperatorDashboard.css';
import type { TabId } from './tabGroups';

interface OperatorDashboardProps {
  utente: UtenteApp;
  consegneOverview: ConsegnaOverview | null;
  consegneOverviewState: 'loading' | 'ready' | 'error';
  agenda: SlotAgenda[];
  /** Stato degli appuntamenti di oggi: la card non dice "nessuno" se non li ha letti. */
  agendaState?: 'loading' | 'ready' | 'error';
  onRetryAgenda?: () => void;
  onNavigate: (nav: NavKey) => void;
  /** #283: apertura mirata della pagina Consegne (filtro aperte + focus se una sola). */
  onOpenConsegneAperte?: () => void;
  onOpenConsegneFeed?: () => void;
  onSelectPaziente?: (nome: string, patientId?: string, tab?: TabId) => void;
  clinicalOverview?: ClinicalOverview | null;
  clinicalOverviewState: 'loading' | 'ready' | 'error';
  onRetryClinicalOverview: () => void;
}

/** Schermata "Il mio turno" (HMI 1): indicatori, poi a sinistra la coda "Adesso" e a destra
 *  prossimi appuntamenti e card dei pazienti. Tutti i dati sono quelli reali dell'app. */
export function OperatorDashboard({
  utente,
  consegneOverview,
  consegneOverviewState,
  agenda,
  agendaState = 'ready',
  onRetryAgenda,
  onNavigate,
  onOpenConsegneAperte,
  onOpenConsegneFeed,
  onSelectPaziente,
  clinicalOverview = null,
  clinicalOverviewState,
  onRetryClinicalOverview,
}: OperatorDashboardProps) {
  const consegnaSummary = consegneOverview?.summary;
  const urgenti = consegneOverview?.urgentPreview ?? [];
  const overviewAvailable = consegnaSummary !== undefined;
  const urgentCount = consegnaSummary?.urgentOpen;
  // AC8: pazienti con farmaci fuori anagrafica. Stessa richiesta di reparto della lista pazienti.
  const anomalie = useAnomalieReparto();
  const somministrazioni = useRiepilogoSomministrazioni();
  // Coda "Adesso": stessi dati delle altre viste, in un solo ordine di urgenza.
  const adesso = buildAdessoQueue({
    now: new Date(),
    scadute: somministrazioni.scadute,
    prossime: somministrazioni.prossime,
    senzaOrario: somministrazioni.senzaOrario,
    urgenti,
    anomalie: anomalie.pazienti,
  });

  const terapieState = somministrazioni.fallito
    ? 'error'
    : somministrazioni.inCorso
      ? 'loading'
      : 'ready';
  const turnoTherapies = useMemo(
    () => ({
      state: terapieState,
      scadute: somministrazioni.scadute,
      prossime: somministrazioni.prossime,
      senzaOrario: somministrazioni.senzaOrario,
      domani: somministrazioni.domaniFallito
        ? 'error'
        : somministrazioni.domaniInCorso
          ? 'loading'
          : 'ready',
    }),
    [
      terapieState,
      somministrazioni.scadute,
      somministrazioni.prossime,
      somministrazioni.senzaOrario,
      somministrazioni.domaniFallito,
      somministrazioni.domaniInCorso,
    ],
  ) as TurnoTherapies;

  // Clinical KPIs from the constant-size server aggregate.
  const critici = clinicalOverview?.critici ?? 0;
  const rischiAlti = clinicalOverview?.rischiAlti ?? 0;
  const allergieGravi = clinicalOverview?.allergieGravi ?? 0;
  // In carico = non dimessi, la stessa regola delle card Turno e della lista "Ricoverati": un
  // paziente senza stato di ricovero esplicito non è un "dimesso" (prima l'intestazione diceva
  // "0 ricoverati" accanto a cinque card di pazienti).
  const pazientiRicoverati = clinicalOverview
    ? Math.max(0, clinicalOverview.totalPatients - clinicalOverview.dimessi)
    : 0;
  const clinicalOverviewReady = clinicalOverviewState === 'ready' && clinicalOverview !== null;

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

  const subtitle = [
    clinicalOverviewReady
      ? `${pazientiRicoverati} ${pazientiRicoverati === 1 ? 'ricoverato' : 'ricoverati'}`
      : '',
    utente.reparto?.trim() ?? '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="operator-dashboard turno">
      <PageHeader title="Il mio turno" subtitle={subtitle} />

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
        onOpenTherapy={() => onNavigate('terapie')}
      />

      <div className="turno-grid">
        <AdessoQueue
          items={adesso}
          terapie={
            somministrazioni.fallito ? 'error' : somministrazioni.inCorso ? 'loading' : 'ready'
          }
          consegne={consegneOverviewState}
          anomalie={anomalie.fallito ? 'error' : anomalie.inCorso ? 'loading' : 'ready'}
          onSelectPaziente={onSelectPaziente}
          onOpenTherapy={() => onNavigate('terapie')}
          onOpenConsegne={() =>
            onOpenConsegneFeed ? onOpenConsegneFeed() : onNavigate('consegne')
          }
          onRetryTherapy={somministrazioni.aggiorna}
          domani={
            somministrazioni.domaniFallito
              ? 'error'
              : somministrazioni.domaniInCorso
                ? 'loading'
                : 'ready'
          }
          onRefresh={somministrazioni.aggiorna}
          refreshing={somministrazioni.aggiornamentoInCorso}
          headerAction={
            <DashboardNotificationCenter
              compact
              counts={notificationCounts}
              sections={notificationSections}
              loading={
                somministrazioni.inCorso ||
                anomalie.inCorso ||
                consegneOverviewState === 'loading' ||
                clinicalOverviewState === 'loading'
              }
            />
          }
        />
        <div className="turno-side">
          <TurnoAppointments
            agenda={agenda}
            state={agendaState}
            onRetry={onRetryAgenda}
            onOpenAgenda={() => onNavigate('agenda-operatore')}
            onSelectPaziente={onSelectPaziente}
          />
          <TurnoPatients therapies={turnoTherapies} onSelectPaziente={onSelectPaziente} />
        </div>
      </div>
    </div>
  );
}
