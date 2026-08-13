// Sub-agent profiles. Two role-scoped assistants over the EXISTING read intents: ogni agente ha il
// suo dominio, ma una domanda dell'altro dominio viene INSTRADATA al proprietario ed eseguita
// (`resolveAgent`) — mai rimandata all'utente con «selezionalo tu»: chi chiede ha già diritto al
// dato per ruolo. Pure + testable: no DB, no model, no side effects. I guardrail (refuse_clinical,
// role clamp, tenant isolation, cross-patient gate, SOURCE_ONLY) restano gli unici a poter negare
// una risposta: la scelta dell'agente non è e non è mai stata un controllo di accesso.

import type { AssistantIntent } from './plan.js';

export type AgentId = 'facility' | 'clinical';

// Intents any agent may serve: patient lookup (neutral), not-recognised, clinical refusal, and the
// shared agenda/appointments read (relevant to both management and clinical contexts).
// La coda operatore («cosa devo fare adesso») è condivisa per costruzione: mette insieme terapie
// dovute e consegne aperte, cioè un pezzo del dominio clinico e uno di quello organizzativo.
// Reindirizzarla all'altro agente lascerebbe l'operatore senza risposta qualunque agente scelga.
const SHARED: ReadonlySet<AssistantIntent> = new Set([
  'patient_search',
  'appointments',
  'operator_queue',
  'unknown',
  'refuse_clinical',
]);

// Management/facility domain: structure & operations (aggregate rooms/occupancy, DSL facility
// reads, staff roster — Fase 1b).
const FACILITY_ONLY: ReadonlySet<AssistantIntent> = new Set([
  'rooms_occupancy',
  'data_query',
  'staff_list',
  'facility_snapshot',
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

/** Agent that actually serves this intent. Se l'intent appartiene all'altro dominio, la richiesta
 *  viene instradata al suo proprietario invece di essere rimandata all'utente: chi chiede ha già
 *  diritto al dato per ruolo, e la scelta dell'agente non è mai stata un controllo di accesso
 *  (role clamp, tenant isolation, cross-patient gate e refuse_clinical restano gli unici guardrail). */
export function resolveAgent(selected: AgentId, intent: AssistantIntent): AgentId {
  if (agentAllowsIntent(selected, intent)) return selected;
  return ownerAgent(intent) ?? selected;
}
