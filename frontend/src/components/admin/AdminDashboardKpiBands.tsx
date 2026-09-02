import {
  IcoActivity,
  IcoCalendar,
  IcoCartelle,
  IcoConsegne,
  IcoOperatori,
  IcoPazienti,
  IcoPill,
  IcoShield,
} from '../../icons';
import type { NavKey } from '../../types';
import {
  DashboardKpiBand,
  type DashboardKpiItem,
  type DashboardKpiTone,
} from '../shared/DashboardKpiBand';

interface Props {
  loadingPazienti: boolean;
  totalePazienti: number;
  activeOperatorTotal: number;
  operatorTotal: number;
  appointmentsTodayTotal: number;
  consegneAperte?: number;
  consegneInCorso?: number;
  urgentCount?: number;
  consegneOverviewState: 'loading' | 'ready' | 'error';
  overviewAvailable: boolean;
  clinicalOverviewState: 'loading' | 'ready' | 'error';
  clinicalOverviewReady: boolean;
  critici: number;
  rischiAlti: number;
  dimessi: number;
  somministrazioni: {
    inCorso: boolean;
    fallito: boolean;
    inRitardo: number;
    daFare: number;
  };
  onNavigate: (nav: NavKey) => void;
  onOpenConsegneAperte?: () => void;
}

function clinicalItem(
  ready: boolean,
  loading: boolean,
  value: number,
  options: Omit<DashboardKpiItem, 'value' | 'tone' | 'status'> & {
    attentionTone: DashboardKpiTone;
    clearStatus: string;
    attentionStatus: string;
  },
): DashboardKpiItem {
  if (!ready) {
    return {
      ...options,
      value: '—',
      tone: 'unknown',
      status: loading ? 'Aggiornamento…' : 'Dato non disponibile',
    };
  }

  return {
    ...options,
    value,
    tone: value > 0 ? options.attentionTone : 'positive',
    status: value > 0 ? options.attentionStatus : options.clearStatus,
  };
}

export function AdminDashboardKpiBands({
  loadingPazienti,
  totalePazienti,
  activeOperatorTotal,
  operatorTotal,
  appointmentsTodayTotal,
  consegneAperte,
  consegneInCorso,
  urgentCount,
  consegneOverviewState,
  overviewAvailable,
  clinicalOverviewState,
  clinicalOverviewReady,
  critici,
  rischiAlti,
  dimessi,
  somministrazioni,
  onNavigate,
  onOpenConsegneAperte,
}: Props) {
  const managementLoading = loadingPazienti || consegneOverviewState === 'loading';
  const managementItems: DashboardKpiItem[] = [
    {
      id: 'pazienti',
      label: 'Totale pazienti',
      value: loadingPazienti ? '—' : totalePazienti,
      status: loadingPazienti ? 'Aggiornamento…' : 'Anagrafiche caricate',
      tone: loadingPazienti ? 'unknown' : 'info',
      icon: <IcoPazienti />,
      onOpen: () => onNavigate('pazienti'),
      actionLabel: 'Apri lista pazienti',
    },
    {
      id: 'operatori',
      label: 'Operatori attivi',
      value: `${activeOperatorTotal}/${operatorTotal}`,
      spokenValue: `${activeOperatorTotal} su ${operatorTotal}`,
      status: activeOperatorTotal === operatorTotal ? 'Copertura completa' : 'Verifica copertura',
      tone: activeOperatorTotal === operatorTotal ? 'positive' : 'attention',
      icon: <IcoOperatori />,
      onOpen: () => onNavigate('gestione-operatori'),
      actionLabel: 'Apri gestione operatori',
    },
    {
      id: 'appuntamenti',
      label: 'Appuntamenti oggi',
      value: appointmentsTodayTotal,
      status: appointmentsTodayTotal === 1 ? '1 attività pianificata' : 'Attività pianificate',
      tone: 'info',
      icon: <IcoCalendar />,
      onOpen: () => onNavigate('agenda-admin'),
      actionLabel: 'Apri agenda amministratore',
    },
    {
      id: 'consegne',
      label: 'Consegne aperte',
      value: overviewAvailable ? (consegneAperte ?? 0) : '—',
      status:
        consegneOverviewState === 'loading'
          ? 'Aggiornamento…'
          : !overviewAvailable
            ? 'Dato non disponibile'
            : (urgentCount ?? 0) > 0
              ? `${urgentCount} urgenti`
              : 'Nessuna urgenza',
      tone: !overviewAvailable ? 'unknown' : (urgentCount ?? 0) > 0 ? 'critical' : 'positive',
      icon: <IcoConsegne />,
      onOpen: () => (onOpenConsegneAperte ? onOpenConsegneAperte() : onNavigate('consegne')),
      actionLabel: 'Apri consegne',
    },
  ];

  const administrationValue =
    somministrazioni.inCorso || somministrazioni.fallito
      ? '—'
      : `${somministrazioni.inRitardo}/${somministrazioni.daFare}`;
  const clinicalItems: DashboardKpiItem[] = [
    clinicalItem(clinicalOverviewReady, clinicalOverviewState === 'loading', critici, {
      id: 'parametri',
      label: 'Parametri critici',
      icon: <IcoActivity />,
      onOpen: () => onNavigate('pazienti'),
      actionLabel: 'Apri lista pazienti',
      attentionTone: 'critical',
      clearStatus: 'Nella norma',
      attentionStatus: 'Intervento richiesto',
    }),
    clinicalItem(clinicalOverviewReady, clinicalOverviewState === 'loading', rischiAlti, {
      id: 'rischi',
      label: 'Rischi alti/critici',
      icon: <IcoShield />,
      onOpen: () => onNavigate('pazienti'),
      actionLabel: 'Apri lista pazienti',
      attentionTone: 'attention',
      clearStatus: 'Nessun rischio alto',
      attentionStatus: 'Da valutare',
    }),
    {
      id: 'consegne-in-corso',
      label: 'Consegne in corso',
      value: overviewAvailable ? `${consegneInCorso ?? 0}/${consegneAperte ?? 0}` : '—',
      spokenValue: overviewAvailable
        ? `${consegneInCorso ?? 0} su ${consegneAperte ?? 0}`
        : undefined,
      status: overviewAvailable ? 'Flusso operativo' : 'Dato non disponibile',
      tone: overviewAvailable ? 'info' : 'unknown',
      icon: <IcoConsegne />,
      onOpen: () => onNavigate('consegne'),
      actionLabel: 'Apri consegne',
    },
    clinicalItem(clinicalOverviewReady, clinicalOverviewState === 'loading', dimessi, {
      id: 'dimessi',
      label: 'Dimessi in archivio',
      icon: <IcoCartelle />,
      onOpen: () => onNavigate('pazienti'),
      actionLabel: 'Apri lista pazienti',
      attentionTone: 'info',
      clearStatus: 'Nessun dimesso',
      attentionStatus: 'Archivio aggiornato',
    }),
    {
      id: 'somministrazioni',
      label: 'Somministrazioni in ritardo',
      value: administrationValue,
      spokenValue:
        somministrazioni.inCorso || somministrazioni.fallito
          ? undefined
          : `${somministrazioni.inRitardo} su ${somministrazioni.daFare}`,
      status: somministrazioni.fallito
        ? 'Dato non disponibile'
        : somministrazioni.inCorso
          ? 'Aggiornamento…'
          : somministrazioni.inRitardo > 0
            ? 'Verifica immediata'
            : 'Terapie puntuali',
      tone: somministrazioni.fallito
        ? 'attention'
        : somministrazioni.inCorso
          ? 'unknown'
          : somministrazioni.inRitardo > 0
            ? 'critical'
            : 'positive',
      icon: <IcoPill />,
      onOpen: () => onNavigate('agenda-admin'),
      actionLabel: 'Apri agenda amministratore',
    },
  ];

  return (
    <>
      <DashboardKpiBand
        label="Riepilogo amministrativo"
        items={managementItems}
        loading={managementLoading}
      />

      <div className="section-header admin-dashboard__clinical-heading">
        <h3 className="section-header__title">
          <span className="section-header__ico">
            <IcoActivity />
          </span>
          Situazione clinica
        </h3>
      </div>
      <DashboardKpiBand
        label="Situazione clinica"
        items={clinicalItems}
        loading={clinicalOverviewState === 'loading' || somministrazioni.inCorso}
      />
    </>
  );
}
