import { PATIENT_SECTION_FOR_WARD_NAV, TAB_GROUPS, type TabId } from '../operator/tabGroups';
import type { NavKey } from '../../types';
import type { TherapyTarget } from '../../lib/patientTarget';
import type { ClassicScreen } from './assistantApi';

const CHART_TABS = new Set<string>(TAB_GROUPS.flatMap((group) => group.tabs.map((t) => t.id)));

export type ClassicTarget =
  | { kind: 'patient'; patientId: string; tab?: TabId; therapy?: TherapyTarget }
  | { kind: 'screen'; screen: NavKey };

/** «Apri nella GUI classica»: con l'ospite già noto si apre la sua sezione, non la pagina
 *  generica di reparto né la Panoramica (Prompt 10 §13). Un tab sconosciuto non si inventa.
 *  Direct access: anche i workflow che dichiarano una pagina di reparto (consegne, giro terapia,
 *  parametri) aprono la sezione corrispondente dell'ospite quando l'ospite è noto. */
export function classicScreenTarget(target: ClassicScreen): ClassicTarget {
  const declared =
    target.patientTab && CHART_TABS.has(target.patientTab)
      ? (target.patientTab as TabId)
      : undefined;
  const tab = declared ?? PATIENT_SECTION_FOR_WARD_NAV[target.screen];
  if (target.patientId && (target.needsResident || tab))
    return {
      kind: 'patient',
      patientId: target.patientId,
      ...(tab ? { tab } : {}),
      // Il giro terapia di reparto corrisponde alle somministrazioni di oggi dell'ospite.
      ...(target.screen === 'terapie' && tab === 'terapia-farmacologica'
        ? { therapy: { subView: 'giornaliere' as const } }
        : {}),
    };
  return { kind: 'screen', screen: target.screen as NavKey };
}
