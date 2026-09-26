// Tab della cartella su cui si può atterrare dopo aver creato un paziente dal wizard di intake.
// Deriva dal catalogo dei moduli: una lista scritta a mano in App.tsx aveva perso PAINAD e
// Trasferimenti posturali, e la scelta dell'operatore veniva ignorata senza avviso.
import { CLINICAL_MODULES } from './assessments/assessmentCatalog';
import type { TabId } from '../components/operator/tabGroups';

export const INTAKE_LANDING_TABS: readonly TabId[] = [
  ...CLINICAL_MODULES.map((module) => module.tab as TabId),
  'nrs',
  'dimissione',
];

export function intakeLandingTab(moduleTabId?: string): TabId | undefined {
  return moduleTabId && (INTAKE_LANDING_TABS as readonly string[]).includes(moduleTabId)
    ? (moduleTabId as TabId)
    : undefined;
}
