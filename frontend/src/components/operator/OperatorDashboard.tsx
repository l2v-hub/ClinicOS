import { TherapyVerificationPanel } from '../shared/TherapyVerificationPanel';
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
import { TurnoDaLeggere } from './TurnoDaLeggere';
import { TurnoUrgenti } from './TurnoUrgenti';
import { TurnoDecisioni } from './TurnoDecisioni';
import { TurnoGiroParametri } from './TurnoGiroParametri';
import { useUnreadDiaryQueue } from './useUnreadDiaryQueue';
import { nienteInSospeso, turnoVariant } from '../../lib/turnoVariant';
import { useUnreadUrgencies } from '../../lib/useUnreadUrgencies';
import { useGiroParametri } from '../../lib/useGiroParametri';
import { buildAdessoQueue } from '../../lib/adessoQueue';
import { landingOf } from '../../lib/patientTargetResolver';
import { useCan } from '../../lib/capabilities';
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
  onSelectPaziente?: (nome: string, patientId?: string, landing?: PatientLanding) => void;
  /** Direct access: lista pazienti già filtrata su ciò che una tessera/segnalazione conta. */
  onOpenPatientList?: (entry: PatientListEntry) => void;
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
  onOpenLateTherapy,
  onOpenConsegneAperte,
  onOpenConsegneFeed,
  onSelectPaziente,
  onOpenPatientList,
  clinicalOverview = null,
  clinicalOverviewState,
  onRetryClinicalOverview,
}: OperatorDashboardProps) {
  const consegnaSummary = consegneOverview?.summary;
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
  // #446: il Turno di chi somministra, di chi prescrive, di chi assiste — decide la capability.
  const variant = turnoVariant({
    administer: canAdminister,
    prescribe: useCan('therapy.create'),
    recordVitals: useCan('parameters.create_reading'),
  });
  // «Da leggere» e urgenze: la stessa coda del badge Consegne (note di diario e consegne senza
  // conferma), così home e badge contano le stesse cose.
  const canReadDiary = useCan('diary.list');
  const queue = useUnreadDiaryQueue(canReadDiary, true);
  // Urgenze raccolte su più pagine della coda: non spariscono dietro le 20 note più recenti.
  const urgentQueue = useUnreadUrgencies(canReadDiary);
  const urgentIds = new Set(urgentQueue.rows.map((row) => row.id));
  const giro = useGiroParametri(variant === 'oss');
  const allergie = useTurnoAllergies(
    adesso.filter((it) => it.kind.startsWith('terapia-')).map((it) => it.patientId),
  );
  const farmaciDaVerificare = anomalie.pazienti.reduce((n, p) => n + p.esito.totale, 0);
  const chips = buildTurnoChips({
    // Solo le urgenze di altri, dalla coda del badge (#445 QA, #446).
    urgentToTakeCharge: urgentQueue.state === 'ready' ? urgentQueue.rows.length : undefined,
    urgentAtLeast: urgentQueue.atLeast,
    urgentState: urgentQueue.state,
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

  // Le chip non ripetono ciò che la variante mostra già in evidenza.
  const visibleChips = chips.filter(
    (chip) =>
      !(variant !== 'infermiere' && chip.id === 'urgenze') &&
      !(variant === 'medico' && chip.id === 'farmaci'),
  );

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

  // #446 AC3: solo se tutte le fonti sono arrivate e dicono «niente».
  const sospeso = nienteInSospeso({
    daLeggere: queue.page ? queue.page.totalUnread : null,
    critici: clinicalOverviewReady ? clinicalOverview!.critici : null,
    giro:
      variant === 'oss' && giro.state === 'ready'
        ? {
            fatti: giro.pazienti.filter((p) => p.rilevatoOggi).length,
            totale: giro.pazienti.length,
            completo: giro.completo,
          }
        : null,
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

      <TurnoActionChips chips={visibleChips} />
      <TherapyVerificationPanel groups={somministrazioni.verificationGroups} />
      {variant !== 'infermiere' && (
        <TurnoUrgenti
          rows={variant === 'oss' ? urgentQueue.rows : []}
          // il medico ha urgenze e avviso dentro «Serve una tua decisione»: qui non si ripetono
          atLeast={variant === 'oss' && urgentQueue.atLeast}
          state={variant === 'oss' ? urgentQueue.state : 'ready'}
          queue={queue}
          onSelectPaziente={onSelectPaziente}
        />
      )}
      {sospeso && somministrazioni.daVerificare === 0 && (
        <p className="turno-niente" role="status">
          Niente in sospeso: nessuna nota da leggere, nessun parametro critico, giro parametri
          completo.
        </p>
      )}

      <div className="turno-grid">
        {variant === 'medico' ? (
          <TurnoDecisioni
            urgenti={urgentQueue.rows}
            urgentiState={urgentQueue.state}
            urgentiAtLeast={urgentQueue.atLeast}
            queue={queue}
            farmaci={anomalie.pazienti.map((p) => ({
              patientId: p.patientId,
              nome: p.nome,
              totale: p.esito.totale,
              farmaci: (p.esito.anomalie ?? []).map((a) => a.farmacoNome).filter(Boolean),
              therapyId: anomalyTherapyId(anomalie, p.patientId),
            }))}
            farmaciState={anomalie.fallito ? 'error' : anomalie.inCorso ? 'loading' : 'ready'}
            dosiNonRegistrate={
              somministrazioni.disponibile && !somministrazioni.fallito && !somministrazioni.inCorso
                ? { dosi: somministrazioni.inRitardo, pazienti: somministrazioni.ritardi.length }
                : null
            }
            onSelectPaziente={onSelectPaziente}
            onOpenLateTherapy={onOpenLateTherapy ?? (() => onNavigate('terapie'))}
          />
        ) : variant === 'oss' ? (
          <TurnoGiroParametri
            giro={giro}
            onSelectPaziente={onSelectPaziente}
            onStartGiro={() => onNavigate('parametri-multipaziente')}
          />
        ) : (
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
            revisione={somministrazioni.revisione}
            revisioneLetta={somministrazioni.revisioneLetta}
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
        )}
        <div className="turno-side">
          <TurnoAppointments
            agenda={agenda}
            state={agendaState}
            onRetry={onRetryAgenda}
            onOpenAgenda={() => onNavigate('agenda-operatore')}
            onSelectPaziente={onSelectPaziente}
          />
          <TurnoDaLeggere
            queue={queue}
            available={canReadDiary}
            exclude={variant === 'infermiere' ? undefined : urgentIds}
            onOpenAll={onOpenConsegneFeed ?? (() => onNavigate('consegne'))}
            onSelectPaziente={onSelectPaziente}
          />
        </div>
      </div>
    </div>
  );
}
