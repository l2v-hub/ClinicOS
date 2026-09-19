import type { AssistantAnswer, AssistantNav } from '../AIAssistantButton';
import { navTabId } from './agnosNav';
import type { TabId } from '../../operator/tabGroups';
import type { NavKey } from '../../../types';

const WRITE_DESTINATIONS: Record<string, { type: string; label: string }> = {
  create_vital_sign: { type: 'open_parameter', label: 'Parametri Vitali' },
  update_patient_demographics: { type: 'open_profile', label: 'Profilo' },
  update_narrative_section: { type: 'open_section', label: 'Sezioni cliniche' },
  add_diary_note: { type: 'open_diary', label: 'Diario' },
  create_appointment: { type: 'open_agenda', label: 'Agenda' },
  update_appointment: { type: 'open_agenda', label: 'Agenda' },
  create_consegna: { type: 'open_consegne', label: 'Consegne' },
};
const PATIENT_DESTINATIONS = new Set([
  'open_patient', 'open_profile', 'open_diary', 'open_section', 'open_therapy', 'open_parameter', 'open_document',
]);
const SHARED_DESTINATIONS = new Set(['open_agenda', 'open_appointment', 'open_beds', 'open_therapies_today', 'open_consegne']);
const validId = (id: unknown): id is string => typeof id === 'string' && /^[\w-]{1,128}$/.test(id);

export function writeActionNavigation(plan?: { actionType: string; patientId?: string | null }): AssistantNav | null {
  const destination = plan && WRITE_DESTINATIONS[plan.actionType];
  if (!destination || !validId(plan?.patientId)) return null;
  return { ...destination, patientId: plan.patientId };
}

/** Automatic read navigation requires an explicit request and one unambiguous page. */
export function readActionNavigation(text: string, answer: AssistantAnswer): AssistantNav | null {
  if (!/^\s*(?:apri|mostra(?:mi)?|vai|portami|fammi vedere)\b/i.test(text) || answer.refusal || answer.notFound) return null;
  const destinations = new Map<string, AssistantNav>();
  for (const nav of answer.navigation ?? []) {
    if (!PATIENT_DESTINATIONS.has(nav.type) && !SHARED_DESTINATIONS.has(nav.type)) return null;
    if ((PATIENT_DESTINATIONS.has(nav.type) && !validId(nav.patientId)) ||
        (nav.patientId != null && !validId(nav.patientId))) return null;
    const type = nav.type === 'open_appointment' ? 'open_agenda' : nav.type;
    // Records on the same page need one navigation, not one redirect for each cited source.
    destinations.set(`${type}:${nav.patientId ?? ''}`, { ...nav, type });
  }
  return destinations.size === 1 ? [...destinations.values()][0] : null;
}

export function navigationScope(nav: AssistantNav, role?: string) {
  if (nav.type === 'open_agenda' || nav.type === 'open_appointment')
    return { currentPatientId: undefined, navKey: role === 'admin' ? 'agenda-admin' : 'agenda-operatore' };
  if (nav.type === 'open_beds')
    return { currentPatientId: undefined, navKey: role === 'admin' ? 'posti-letto' : 'operator-dashboard' };
  if (nav.type === 'open_therapies_today')
    return { currentPatientId: undefined, navKey: role === 'admin' ? 'admin-dashboard' : 'operator-dashboard' };
  if (nav.patientId) return { currentPatientId: nav.patientId, navKey: 'dettaglio-paziente' };
  return { currentPatientId: undefined, navKey: 'consegne' };
}

export async function navigateAgnosTarget(nav: AssistantNav, handlers: {
  isAdmin: boolean;
  navigate: (key: NavKey) => void;
  openPatient: (id: string, tab?: TabId, signal?: AbortSignal) => Promise<boolean>;
  openConsegne: (recordId?: string) => void;
}, signal?: AbortSignal): Promise<boolean> {
  if (signal?.aborted) return false;
  if (nav.type === 'open_agenda' || nav.type === 'open_appointment') {
    handlers.navigate(handlers.isAdmin ? 'agenda-admin' : 'agenda-operatore'); return true;
  }
  if (nav.type === 'open_therapies_today') {
    handlers.navigate(handlers.isAdmin ? 'admin-dashboard' : 'operator-dashboard'); return true;
  }
  if (nav.type === 'open_beds') {
    if (!handlers.isAdmin) return false;
    handlers.navigate('posti-letto'); return true;
  }
  if (nav.type === 'open_consegne' && !nav.patientId) { handlers.openConsegne(nav.recordId); return true; }
  if ((PATIENT_DESTINATIONS.has(nav.type) || nav.type === 'open_consegne') && validId(nav.patientId))
    return await handlers.openPatient(nav.patientId, navTabId(nav), signal);
  return false;
}
