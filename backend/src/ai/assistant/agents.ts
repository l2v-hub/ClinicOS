// Agnos sub-agent profiles (Fase 0). Two role-scoped assistants over the EXISTING read intents:
// each agent serves only its domain; an out-of-domain question is redirected (not executed), never
// invented. Pure + testable: no DB, no model, no side effects. Guardrails (refuse_clinical, role
// clamp, SOURCE_ONLY) are unchanged — this only narrows which intents an agent will answer.

import type { AssistantIntent } from './plan.js';

export type AgentId = 'facility' | 'clinical';

// Intents any agent may serve: patient lookup (neutral), not-recognised, clinical refusal, and the
// shared agenda/appointments read (relevant to both management and clinical contexts).
const SHARED: ReadonlySet<AssistantIntent> = new Set([
  'patient_search',
  'appointments',
  'unknown',
  'refuse_clinical',
]);

// Management/facility domain: structure & operations (aggregate rooms/occupancy, DSL facility
// reads, staff roster — Fase 1b).
const FACILITY_ONLY: ReadonlySet<AssistantIntent> = new Set([
  'rooms_occupancy',
  'data_query',
  'staff_list',
]);

// Clinical/nursing domain: the patient-centric reads.
const CLINICAL_ONLY: ReadonlySet<AssistantIntent> = new Set([
  'allergies',
  'therapies',
  'vitals_recent',
  'vitals_range',
  'vitals_trend',
  'timeline',
  'narrative_search',
  'document_search',
  'correlate',
]);

export interface AgentProfile {
  id: AgentId;
  label: string;
  /** Persona used to steer the optional LLM composer; behaviour is enforced by the allowlist, not the prose. */
  persona: string;
  allowed: ReadonlySet<AssistantIntent>;
}

export const AGENT_PROFILES: Record<AgentId, AgentProfile> = {
  facility: {
    id: 'facility',
    label: 'Gestione struttura',
    persona:
      "Sei l'assistente di direzione/gestione della struttura ClinicOS. Rispondi solo con dati operativi e di struttura (camere, occupazione, agenda) citando sempre la fonte. Non fornisci dati clinici del singolo paziente né interpreti valori.",
    allowed: FACILITY_ONLY,
  },
  clinical: {
    id: 'clinical',
    label: 'Assistente clinico',
    persona:
      "Sei l'assistente clinico-infermieristico di ClinicOS. Rispondi solo con dati clinici esistenti del paziente (parametri, terapie, allergie, timeline, documenti) citando sempre la fonte. Non interpreti i valori né fornisci diagnosi, terapie o consigli clinici.",
    allowed: CLINICAL_ONLY,
  },
};

export function isAgentId(v: unknown): v is AgentId {
  return v === 'facility' || v === 'clinical';
}

/** Owner agent of a DOMAIN intent (for redirect messaging); null = shared/neutral intent. */
export function ownerAgent(intent: AssistantIntent): AgentId | null {
  if (FACILITY_ONLY.has(intent)) return 'facility';
  if (CLINICAL_ONLY.has(intent)) return 'clinical';
  return null;
}

/** True if the selected agent may serve this intent (its own domain OR a shared/neutral intent). */
export function agentAllowsIntent(agent: AgentId, intent: AssistantIntent): boolean {
  return SHARED.has(intent) || AGENT_PROFILES[agent].allowed.has(intent);
}

/** Message when the selected agent can't serve an intent owned by the other agent. Empty string when
 *  there is nothing to redirect (shared/neutral intent or same-owner). */
export function redirectMessage(selected: AgentId, intent: AssistantIntent): string {
  const owner = ownerAgent(intent);
  if (!owner || owner === selected) return '';
  return `Questa richiesta è di competenza dell'assistente «${AGENT_PROFILES[owner].label}». Selezionalo per ottenere la risposta.`;
}
