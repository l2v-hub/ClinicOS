import { IcoActivity, IcoBed, IcoPill, IcoShield, IcoWarning } from '../../icons';
import {
  DashboardKpiBand,
  type DashboardKpiItem,
  type DashboardKpiTone,
} from '../shared/DashboardKpiBand';
import type { PatientListEntry } from '../../lib/patientListView';

interface Props {
  loading: boolean;
  clinicalReady: boolean;
  critici: number;
  rischiAlti: number;
  allergieGravi: number;
  pazientiRicoverati: number;
  somministrazioni: {
    /** false = il ruolo non legge le somministrazioni: la tessera non viene mostrata. */
    disponibile?: boolean;
    inCorso: boolean;
    fallito: boolean;
    inRitardo: number;
    daFare: number;
  };
  onOpenParametri: () => void;
  onOpenPazienti: () => void;
  onOpenTherapy: () => void;
  /** Direct access: la tessera apre la lista già filtrata su ciò che conta. */
  onOpenPatientList?: (entry: PatientListEntry) => void;
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

export function OperatorClinicalKpiBand({
  loading,
  clinicalReady,
  critici,
  rischiAlti,
  allergieGravi,
  pazientiRicoverati,
  somministrazioni,
  onOpenParametri,
  onOpenPazienti,
  onOpenTherapy,
  onOpenPatientList,
}: Props) {
  const openList = (entry: PatientListEntry, fallback: () => void) => () =>
    onOpenPatientList ? onOpenPatientList(entry) : fallback();
  const administrationValue =
    somministrazioni.inCorso || somministrazioni.fallito ? '—' : somministrazioni.inRitardo;
  const administrationTone: DashboardKpiTone = somministrazioni.fallito
    ? 'attention'
    : somministrazioni.inCorso
      ? 'unknown'
      : somministrazioni.inRitardo > 0
        ? 'critical'
        : 'positive';

  const items: DashboardKpiItem[] = [
    clinicalItem(clinicalReady, loading, critici, {
      id: 'parametri',
      label: 'Parametri critici',
      icon: <IcoActivity />,
      onOpen: openList({ signal: 'critici' }, onOpenParametri),
      actionLabel: 'Apri i pazienti con parametri critici',
      attentionTone: 'critical',
      clearStatus: 'Nella norma',
      attentionStatus: 'Intervento richiesto',
    }),
    clinicalItem(clinicalReady, loading, rischiAlti, {
      id: 'rischi',
      label: 'Rischi elevati',
      icon: <IcoShield />,
      onOpen: openList({ signal: 'rischi' }, onOpenPazienti),
      actionLabel: 'Apri i pazienti con rischio elevato',
      attentionTone: 'attention',
      clearStatus: 'Nessun rischio alto',
      attentionStatus: 'Da valutare',
    }),
    clinicalItem(clinicalReady, loading, allergieGravi, {
      id: 'allergie',
      label: 'Allergie gravi',
      icon: <IcoWarning />,
      onOpen: openList({ signal: 'allergie' }, onOpenPazienti),
      actionLabel: 'Apri i pazienti con allergie gravi',
      attentionTone: 'attention',
      clearStatus: 'Nessuna allergia grave',
      attentionStatus: 'Attenzione clinica',
    }),
    {
      id: 'ricoverati',
      label: 'Ricoverati',
      value: clinicalReady ? pazientiRicoverati : '—',
      status: clinicalReady
        ? pazientiRicoverati === 1
          ? '1 paziente in carico'
          : `${pazientiRicoverati} pazienti in carico`
        : 'Dato non disponibile',
      tone: clinicalReady ? 'info' : 'unknown',
      icon: <IcoBed />,
      onOpen: openList({ view: 'in_carico' }, onOpenPazienti),
      actionLabel: 'Apri i pazienti ricoverati',
    },
    {
      id: 'somministrazioni',
      label: 'Terapie in ritardo',
      value: administrationValue,
      spokenValue:
        somministrazioni.inCorso || somministrazioni.fallito
          ? undefined
          : `${somministrazioni.inRitardo} su ${somministrazioni.daFare} da fare`,
      status: somministrazioni.fallito
        ? 'Dato non disponibile'
        : somministrazioni.inCorso
          ? 'Aggiornamento…'
          : `su ${somministrazioni.daFare} da fare`,
      tone: administrationTone,
      icon: <IcoPill />,
      onOpen: onOpenTherapy,
      actionLabel: 'Apri terapia',
    },
  ];

  const visible =
    somministrazioni.disponibile === false
      ? items.filter((item) => item.id !== 'somministrazioni')
      : items;
  return <DashboardKpiBand label="Quadro clinico operativo" items={visible} loading={loading} />;
}
