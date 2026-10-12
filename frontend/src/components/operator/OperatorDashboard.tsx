import type { UtenteApp, SlotAgenda, ClinicalOverview, ConsegnaOverview } from '../../types';
import type { NavKey } from '../../types';
import { PageHeader } from '../shared/PageHeader';
import { anomalyTherapyId, useAnomalieReparto } from './cartella/useAnomalieReparto';
import type { PatientLanding } from '../../lib/patientTargetResolver';
import type { PatientListEntry } from '../../lib/patientListView';
import { useRiepilogoSomministrazioni } from './cartella/useRiepilogoSomministrazioni';
import { DashboardNotificationCenter } from './DashboardNotificationCenter';
import { TurnoActionChips } from './TurnoActionChips';
import { buildTurnoChips } from '../../lib/turnoChips';
import { AdessoQueue } from './AdessoQueue';
import { TurnoAppointments } from './TurnoAppointments';
import { TurnoHandovers } from './TurnoHandovers';
import { buildAdessoQueue } from '../../lib/adessoQueue';
import { landingOf } from '../../lib/patientTargetResolver';
import { useCan } from '../../lib/capabilities';
import { countToTakeCharge } from '../../lib/urgency';
import { useTurnoAllergies } from '../../lib/useTurnoAllergies';
import { buildDashboardNotificationSections } from './buildDashboardNotificationSections';
import { buildDashboardNotificationCounts } from './dashboardNotificationModel';
import './OperatorDashboard.css';

interface OperatorDashboardProps {
  utente: UtenteApp;
  consegneOverview: ConsegnaOverview | null;
  consegneOverviewState: 'loading' | 'ready' | 'error';
  agenda: SlotAgenda[];
  /** Stato degli appuntamenti di oggi: la card non dice "nessuno" se non li ha letti. */
  agendaState?: 'loading' | 'ready' | 'error';
  onRetryAgenda?: () => void;
  onNavigate: (nav: NavKey) => void;
  /** Giro terapia aperto sull'ora con dosi in ritardo, solo da somministrare (accesso diretto). */
  onOpenLateTherapy?: () => void;
  /** #283: apertura mirata della pagina Consegne (filtro aperte + focus se una sola). */
  onOpenConsegneAperte?: () => void;
  onOpenConsegneFeed?: () => void;
  onRetryConsegne?: () => void;
  onSelectPaziente?: (nome: string, patientId?: string, landing?: PatientLanding) => void;
  /** Direct access: lista pazienti già filtrata su ciò che una tessera/segnalazione conta. */
  onOpenPatientList?: (entry: PatientListEntry) => void;
  clinicalOverview?: ClinicalOverview | null;
  clinicalOverviewState: 'loading' | 'ready' | 'error';
  onRetryClinicalOverview: () => void;
  /** «Ho capito» su una consegna urgente direttamente dal Turno (#445). */
  onAcknowledgeConsegna?: (id: string) => Promise<boolean>;
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
  onOpenLateTherapy,
  onOpenConsegneAperte,
  onOpenConsegneFeed,
  onRetryConsegne,
  onSelectPaziente,
  onOpenPatientList,
  clinicalOverview = null,
  clinicalOverviewState,
  onRetryClinicalOverview,
  onAcknowledgeConsegna,
}: OperatorDashboardProps) {
  const consegnaSummary = consegneOverview?.summary;
  const urgenti = consegneOverview?.urgentPreview ?? [];
  const overviewAvailable = consegnaSummary !== undefined;
  // UX2 W8: urgenze da prendere in carico (attive), mai «consegne aperte».
  const urgentCount = consegnaSummary?.urgentActive;
  // AC8: pazienti con farmaci fuori anagrafica. Stessa richiesta di reparto della lista pazienti.
  const anomalie = useAnomalieReparto();
  const somministrazioni = useRiepilogoSomministrazioni();
  // Coda "Adesso" = da somministrare (#445): urgenze e farmaci da verificare stanno nelle chip in
  // alto e nella colonna «Da leggere», non una terza volta qui.
  const adesso = buildAdessoQueue({
    now: new Date(),
    scadute: somministrazioni.scadute,
    prossime: somministrazioni.prossime,
    senzaOrario: somministrazioni.senzaOrario,
    urgenti: [],
    anomalie: [],
  });
  const canAdminister = useCan('administration.confirm');
  const allergie = useTurnoAllergies(
    adesso.filter((it) => it.kind.startsWith('terapia-')).map((it) => it.patientId),
  );
  const farmaciDaVerificare = anomalie.pazienti.reduce((n, p) => n + p.esito.totale, 0);
  const chips = buildTurnoChips({
    urgentToTakeCharge: consegnaSummary
      ? Math.max(urgentCount ?? 0, countToTakeCharge(urgenti))
      : undefined,
    urgentState: consegneOverviewState,
    critici: clinicalOverview?.critici ?? 0,
    clinicalState: clinicalOverviewState,
    anomalie: {
      pazienti: anomalie.pazienti.length,
      farmaci: farmaciDaVerificare,
      fallito: anomalie.fallito,
    },
    onOpenUrgent: onOpenConsegneAperte ?? (() => onNavigate('consegne')),
    onOpenCritici: () =>
      onOpenPatientList
        ? onOpenPatientList({ signal: 'critici' })
        : onNavigate('parametri-multipaziente'),
    onRetryClinical: onRetryClinicalOverview,
    onOpenAnomalie: () => {
      const only = anomalie.pazienti.length === 1 ? anomalie.pazienti[0] : null;
      if (only && onSelectPaziente)
        onSelectPaziente(
          only.nome,
          only.patientId,
          landingOf({
            kind: 'drug-anomaly',
            patientId: only.patientId,
            therapyId: anomalyTherapyId(anomalie, only.patientId),
          }),
        );
      else if (onOpenPatientList) onOpenPatientList({ signal: 'anomalie' });
      else onNavigate('pazienti');
    },
  });

  // Same literal non-discharged predicate as the list; this is not an admission count.
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
    onOpenPatientList,
  });

  const subtitle = [
    clinicalOverviewReady
      ? `${pazientiRicoverati} ${pazientiRicoverati === 1 ? 'paziente non dimesso' : 'pazienti non dimessi'}`
      : '',
    utente.reparto?.trim() ?? '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="operator-dashboard turno">
      <PageHeader title="Il mio turno" subtitle={subtitle} />

      <TurnoActionChips chips={chips} />

      <div className="turno-grid">
        <AdessoQueue
          items={adesso}
          terapie={
            somministrazioni.fallito ? 'error' : somministrazioni.inCorso ? 'loading' : 'ready'
          }
          consegne="ready"
          anomalie="ready"
          allergie={allergie}
          canAdminister={canAdminister}
          onAdministered={somministrazioni.aggiorna}
          onSelectPaziente={onSelectPaziente}
          onOpenTherapy={onOpenLateTherapy ?? (() => onNavigate('terapie'))}
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
          <TurnoHandovers
            overview={consegneOverview}
            state={consegneOverviewState}
            onOpen={onOpenConsegneFeed ?? (() => onNavigate('consegne'))}
            onRetry={onRetryConsegne}
            onSelectPaziente={onSelectPaziente}
            onAcknowledge={onAcknowledgeConsegna}
          />
        </div>
      </div>
    </div>
  );
}
