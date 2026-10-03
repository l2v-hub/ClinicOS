import { TAB_GROUPS, type TabId } from '../operator/tabGroups';
import type { NavKey } from '../../types';
import type { ClassicScreen } from './assistantApi';

const CHART_TABS = new Set<string>(TAB_GROUPS.flatMap((group) => group.tabs.map((t) => t.id)));

export type ClassicTarget =
  { kind: 'patient'; patientId: string; tab?: TabId } | { kind: 'screen'; screen: NavKey };

/** «Apri nella GUI classica»: con l'ospite già noto si apre la sua sezione, non la pagina
 *  generica di reparto né la Panoramica (Prompt 10 §13). Un tab sconosciuto non si inventa. */
export function classicScreenTarget(target: ClassicScreen): ClassicTarget {
  const tab =
    target.patientTab && CHART_TABS.has(target.patientTab)
      ? (target.patientTab as TabId)
      : undefined;
  if (target.patientId && (target.needsResident || tab))
    return { kind: 'patient', patientId: target.patientId, ...(tab ? { tab } : {}) };
  return { kind: 'screen', screen: target.screen as NavKey };
}
