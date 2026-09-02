import { IcoArrow } from '../../icons';
import type { NavKey } from '../../types';
import {
  MAX_DASHBOARD_DELAY_ITEMS,
  MAX_DASHBOARD_NOTIFICATION_PATIENTS,
} from '../shared/dashboardAlertLimits';
import type { DashboardNotificationSection } from './DashboardNotificationCenter';
import { IndicatoreAnomalie } from './cartella/AvvisoAnomalieFarmaci';
import { MAX_ANOMALIE_NEL_RIEPILOGO, messaggioAnomalieCompatto } from './cartella/anomalieFarmaco';
import type { AnomalieReparto } from './cartella/useAnomalieReparto';
import type { RiepilogoSomministrazioni } from './cartella/useRiepilogoSomministrazioni';
import './cartella/AvvisoAnomalieFarmaci.css';

interface BuildDashboardNotificationSectionsInput {
  somministrazioni: RiepilogoSomministrazioni;
  anomalie: AnomalieReparto;
  urgentCount?: number;
  consegneOverviewState: 'loading' | 'ready' | 'error';
  clinicalOverviewState: 'loading' | 'ready' | 'error';
  overviewAvailable: boolean;
  onNavigate: (nav: NavKey) => void;
  onOpenConsegneAperte?: () => void;
  onSelectPaziente?: (nome: string, patientId?: string) => void;
  onRetryClinicalOverview: () => void;
}

export function buildDashboardNotificationSections({
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
}: BuildDashboardNotificationSectionsInput): DashboardNotificationSection[] {
  const sections: DashboardNotificationSection[] = [];
  const ritardiVisibili = somministrazioni.ritardi.slice(0, MAX_DASHBOARD_NOTIFICATION_PATIENTS);
  const anomalieVisibili = anomalie.pazienti.slice(0, MAX_DASHBOARD_NOTIFICATION_PATIENTS);

  if (somministrazioni.ritardi.length > 0) {
    sections.push({
      id: 'somministrazioni-in-ritardo',
      tone: 'alarm',
      count: somministrazioni.ritardi.length,
      title: 'Somministrazioni in ritardo',
      summary: 'Pazienti che richiedono verifica immediata della terapia programmata.',
      content: (
        <>
          <ul className="anomalie-reparto__lista">
            {ritardiVisibili.map((p) => (
              <li key={p.patientId}>
                <button
                  type="button"
                  className="anomalie-reparto__riga anomalie-reparto__riga--rosso"
                  onClick={() => onSelectPaziente?.(p.nome, p.patientId)}
                  aria-label={`Apri ${p.nome}. ${p.voci.length} somministrazioni in ritardo`}
                >
                  <span className="anomalie-reparto__contenuto">
                    <span className="anomalie-reparto__nome">{p.nome}</span>
                    <span className="anomalie-reparto__farmaci-lista" aria-hidden="true">
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
          {somministrazioni.ritardi.length > MAX_DASHBOARD_NOTIFICATION_PATIENTS && (
            <p className="dashboard-notification-section__message">
              Altri {somministrazioni.ritardi.length - MAX_DASHBOARD_NOTIFICATION_PATIENTS} pazienti
              sono disponibili in Agenda.
            </p>
          )}
          <button
            type="button"
            className="btn-secondary dashboard-notification-section__action"
            onClick={() => onNavigate('agenda-operatore')}
          >
            Apri Agenda <IcoArrow />
          </button>
        </>
      ),
    });
  }

  if (urgentCount !== undefined && urgentCount > 0) {
    sections.push({
      id: 'consegne-urgenti',
      tone: 'alarm',
      count: urgentCount,
      title: 'Consegne urgenti in attesa',
      summary: 'Passaggi di consegna che richiedono presa in carico immediata.',
      content: (
        <button
          type="button"
          className="btn-secondary dashboard-notification-section__action"
          onClick={() => (onOpenConsegneAperte ? onOpenConsegneAperte() : onNavigate('consegne'))}
        >
          Apri Consegne <IcoArrow />
        </button>
      ),
    });
  }

  if (anomalie.pazienti.length > 0) {
    sections.push({
      id: 'farmaci-non-in-anagrafica',
      tone: 'warning',
      count: anomalie.pazienti.length,
      title: 'Farmaci non in anagrafica',
      summary: 'Terapie da verificare e sanare prima della somministrazione.',
      content: (
        <>
          <ul className="anomalie-reparto__lista">
            {anomalieVisibili.map((p) => (
              <li key={p.patientId}>
                <button
                  type="button"
                  className="anomalie-reparto__riga"
                  onClick={() => onSelectPaziente?.(p.nome, p.patientId)}
                  aria-label={`Apri ${p.nome}. ${messaggioAnomalieCompatto(p.esito)}`}
                >
                  <span className="anomalie-reparto__contenuto">
                    <span className="anomalie-reparto__nome">{p.nome}</span>
                    <span className="anomalie-reparto__farmaci-lista" aria-hidden="true">
                      {p.esito.anomalie.slice(0, MAX_ANOMALIE_NEL_RIEPILOGO).map((a) => (
                        <span className="anomalie-reparto__farmaco" key={a.farmacoNome}>
                          <strong>{a.farmacoNome}</strong>
                        </span>
                      ))}
                      {p.esito.anomalie.length > MAX_ANOMALIE_NEL_RIEPILOGO && (
                        <span className="anomalie-reparto__altre-voci">
                          +{p.esito.anomalie.length - MAX_ANOMALIE_NEL_RIEPILOGO} altri farmaci
                        </span>
                      )}
                    </span>
                  </span>
                  <IndicatoreAnomalie esito={p.esito} />
                </button>
              </li>
            ))}
          </ul>
          {anomalie.pazienti.length > MAX_DASHBOARD_NOTIFICATION_PATIENTS && (
            <p className="dashboard-notification-section__message">
              Altri {anomalie.pazienti.length - MAX_DASHBOARD_NOTIFICATION_PATIENTS} pazienti sono
              disponibili nella lista completa.
            </p>
          )}
          <button
            type="button"
            className="btn-secondary dashboard-notification-section__action"
            onClick={() => onNavigate('pazienti')}
          >
            Apri lista pazienti <IcoArrow />
          </button>
        </>
      ),
    });
  }

  if (consegneOverviewState === 'error') {
    sections.push({
      id: 'consegne-non-disponibili',
      tone: 'notice',
      count: 1,
      title: 'Aggiornamento consegne non riuscito',
      summary: overviewAvailable
        ? 'Sono mostrati gli ultimi dati disponibili.'
        : 'Il riepilogo consegne non è disponibile.',
      content: (
        <button
          type="button"
          className="btn-secondary dashboard-notification-section__action"
          onClick={() => onNavigate('consegne')}
        >
          Apri Consegne <IcoArrow />
        </button>
      ),
    });
  }

  if (clinicalOverviewState === 'error') {
    sections.push({
      id: 'riepilogo-clinico-non-disponibile',
      tone: 'warning',
      count: 1,
      title: 'Riepilogo clinico non disponibile',
      summary: 'I valori non verificati sono indicati con un trattino.',
      content: (
        <button
          type="button"
          className="btn-secondary dashboard-notification-section__action"
          onClick={onRetryClinicalOverview}
        >
          Riprova <IcoArrow />
        </button>
      ),
    });
  }

  if (somministrazioni.fallito) {
    sections.push({
      id: 'somministrazioni-non-disponibili',
      tone: 'warning',
      count: 1,
      title: 'Somministrazioni non verificabili',
      summary: 'Il conteggio dei ritardi non è disponibile. Apri Agenda per aggiornare i dati.',
      content: (
        <button
          type="button"
          className="btn-secondary dashboard-notification-section__action"
          onClick={() => onNavigate('agenda-operatore')}
        >
          Apri Agenda <IcoArrow />
        </button>
      ),
    });
  }

  if (anomalie.fallito || anomalie.verificaIncompleta) {
    sections.push({
      id: 'verifica-farmaci-non-disponibile',
      tone: 'warning',
      count: 1,
      title: 'Verifica farmaci non disponibile',
      summary: anomalie.fallito
        ? 'Il numero di terapie da sanare non è verificabile in questo momento.'
        : 'Una o più fonti AIFA non hanno risposto: il conteggio mostrato può essere parziale.',
      content: (
        <button
          type="button"
          className="btn-secondary dashboard-notification-section__action"
          onClick={() => onNavigate('pazienti')}
        >
          Apri lista pazienti <IcoArrow />
        </button>
      ),
    });
  }

  return sections;
}
