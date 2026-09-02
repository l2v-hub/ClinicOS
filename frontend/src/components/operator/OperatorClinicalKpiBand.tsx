import type { ReactNode } from 'react';
import {
  IcoActivity,
  IcoBed,
  IcoCheck,
  IcoChevronRight,
  IcoPill,
  IcoShield,
  IcoWarning,
} from '../../icons';

type KpiTone = 'critical' | 'attention' | 'positive' | 'info' | 'unknown';

interface Props {
  loading: boolean;
  clinicalReady: boolean;
  critici: number;
  rischiAlti: number;
  allergieGravi: number;
  pazientiRicoverati: number;
  somministrazioni: {
    inCorso: boolean;
    fallito: boolean;
    inRitardo: number;
    daFare: number;
  };
  onOpenParametri: () => void;
  onOpenPazienti: () => void;
  onOpenAgenda: () => void;
}

interface KpiItem {
  id: string;
  label: string;
  value: string | number;
  spokenValue?: string;
  status: string;
  tone: KpiTone;
  icon: ReactNode;
  onOpen: () => void;
  actionLabel: string;
}

function clinicalItem(
  ready: boolean,
  loading: boolean,
  value: number,
  options: Omit<KpiItem, 'value' | 'tone' | 'status'> & {
    attentionTone: KpiTone;
    clearStatus: string;
    attentionStatus: string;
  },
): KpiItem {
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
  onOpenAgenda,
}: Props) {
  const administrationValue =
    somministrazioni.inCorso || somministrazioni.fallito
      ? '—'
      : `${somministrazioni.inRitardo}/${somministrazioni.daFare}`;
  const administrationTone: KpiTone = somministrazioni.fallito
    ? 'attention'
    : somministrazioni.inCorso
      ? 'unknown'
      : somministrazioni.inRitardo > 0
        ? 'critical'
        : 'positive';

  const items: KpiItem[] = [
    clinicalItem(clinicalReady, loading, critici, {
      id: 'parametri',
      label: 'Parametri critici',
      icon: <IcoActivity />,
      onOpen: onOpenParametri,
      actionLabel: 'Apri parametri pazienti',
      attentionTone: 'critical',
      clearStatus: 'Nella norma',
      attentionStatus: 'Intervento richiesto',
    }),
    clinicalItem(clinicalReady, loading, rischiAlti, {
      id: 'rischi',
      label: 'Rischi elevati',
      icon: <IcoShield />,
      onOpen: onOpenPazienti,
      actionLabel: 'Apri lista pazienti',
      attentionTone: 'attention',
      clearStatus: 'Nessun rischio alto',
      attentionStatus: 'Da valutare',
    }),
    clinicalItem(clinicalReady, loading, allergieGravi, {
      id: 'allergie',
      label: 'Allergie gravi',
      icon: <IcoWarning />,
      onOpen: onOpenPazienti,
      actionLabel: 'Apri lista pazienti',
      attentionTone: 'attention',
      clearStatus: 'Nessuna allergia grave',
      attentionStatus: 'Attenzione clinica',
    }),
    {
      id: 'ricoverati',
      label: 'Ricoverati attivi',
      value: clinicalReady ? pazientiRicoverati : '—',
      status: clinicalReady
        ? pazientiRicoverati === 1
          ? '1 paziente in carico'
          : `${pazientiRicoverati} pazienti in carico`
        : 'Dato non disponibile',
      tone: clinicalReady ? 'info' : 'unknown',
      icon: <IcoBed />,
      onOpen: onOpenPazienti,
      actionLabel: 'Apri lista pazienti',
    },
    {
      id: 'somministrazioni',
      label: 'Somministrazioni in ritardo',
      value: administrationValue,
      spokenValue:
        somministrazioni.inCorso || somministrazioni.fallito
          ? undefined
          : `${somministrazioni.inRitardo} su ${somministrazioni.daFare} da fare`,
      status: somministrazioni.fallito
        ? 'Dato non disponibile'
        : somministrazioni.inCorso
          ? 'Aggiornamento…'
          : somministrazioni.inRitardo > 0
            ? 'Verifica immediata'
            : 'Terapie puntuali',
      tone: administrationTone,
      icon: <IcoPill />,
      onOpen: onOpenAgenda,
      actionLabel: 'Apri agenda operatore',
    },
  ];

  return (
    <section
      className="operator-clinical-kpis"
      aria-label="Quadro clinico operativo"
      aria-busy={loading}
    >
      {items.map((item) => (
        <button
          type="button"
          className={`operator-clinical-kpi operator-clinical-kpi--${item.tone}`}
          onClick={item.onOpen}
          key={item.id}
          aria-label={`${item.label}: ${item.spokenValue ?? item.value}. ${item.status}. ${item.actionLabel}`}
        >
          <span className="operator-clinical-kpi__icon" aria-hidden="true">
            {item.icon}
          </span>
          <span className="operator-clinical-kpi__value">{item.value}</span>
          <span className="operator-clinical-kpi__label">{item.label}</span>
          <span className="operator-clinical-kpi__status">
            {item.tone === 'positive' && <IcoCheck />}
            {item.status}
          </span>
          <span className="operator-clinical-kpi__arrow" aria-hidden="true">
            <IcoChevronRight />
          </span>
        </button>
      ))}
    </section>
  );
}
