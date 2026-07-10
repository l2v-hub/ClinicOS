// 016 F1: planner LLM per le letture. L'LLM (via runtime) PROPONE un piano; il backend lo VALIDA
// contro l'allowlist di sola lettura e RICALCOLA server-side l'accesso cross-patient. Qualunque
// problema (runtime assente/timeout, JSON/piano non valido, tool fuori allowlist) → fallback
// deterministico, senza errori per l'utente. L'LLM non può mai produrre un tool eseguibile di
// scrittura/cancellazione (non è nello schema né supera la validazione).

import { planQuery, type PlanContext, type QueryPlan, type AssistantIntent } from './plan.js';
import { isReadTool, READ_TOOL_SCHEMA } from './read-tools.js';

export interface LlmPlanRequest {
  question: string;
  currentPatientId?: string;
  roles: string[];
  toolSchema: typeof READ_TOOL_SCHEMA;
}
export interface LlmPlanResponse { plan: unknown; confidence?: number }

export interface PlanQueryLLMDeps {
  /** Client del runtime LLM (iniettabile per i test). Assente ⇒ solo deterministico. */
  callPlanRuntime?: (req: LlmPlanRequest) => Promise<LlmPlanResponse>;
  roles?: string[];
}

export interface PlanResult { plan: QueryPlan; mode: 'llm' | 'deterministic' }

// I tool che comportano accesso cross-patient: se il piano LLM ne usa uno, il server IMPONE cross.
// spec §2: nomi occupanti visibili a entrambi i ruoli (stessa disclosure della UI); protezione =
// canFacilityRead + permittedPatientIds, NON il gate cross-patient — query_room_occupants NON è
// in questo set. Anche query_rooms_occupancy (solo aggregato, MAI nomi) e query_operators (dato
// organizzativo, gate ammesso solo al ruolo admin dentro il service) restano fuori: non
// espongono/attraversano cartelle di più pazienti oltre quanto già gestito a valle da
// canFacilityRead()/ruolo admin in gateway/services.ts, non dal gate cross.
const CROSS_TOOLS = new Set(['search_across_patients', 'correlate_structured_data', 'query_appointments_today']);

// Tool vincolati a un singolo paziente: il patientId è AUTORITATIVO lato server (risolto da F0),
// mai dedotto dall'LLM. Vi si inietta il currentPatientId quando manca.
const PATIENT_SCOPED = new Set([
  'get_patient_allergies', 'get_patient_therapies', 'get_patient_vital_signs', 'get_patient_timeline',
  'get_patient_appointments', 'search_clinical_sections',
  // Agnos KB (Task 5)
  'compare_patient_vitals', 'get_patient_vitals_trend', 'get_patient_diary', 'get_clinical_scores',
]);

/**
 * Impone il currentPatientId (risolto server-side da F0) su OGNI tool patient-scoped. Il
 * paziente è AUTORITATIVO lato server: l'LLM propone i tool ma NON sceglie/cambia il paziente,
 * quindi qualunque valore da esso proposto (un placeholder tipo "<resolved_patientId>" o,
 * peggio, l'id di un ALTRO paziente) viene sovrascritto. No-op solo se il patientId non è noto
 * (paziente non risolto) o per i tool non patient-scoped (es. search_patients, cross-patient).
 */
export function injectPatientId(plan: QueryPlan, patientId?: string): QueryPlan {
  if (!patientId) return plan;
  const tools = plan.tools.map((t) =>
    PATIENT_SCOPED.has(t.tool) ? { ...t, args: { ...t.args, patientId } } : t,
  );
  return { ...plan, tools };
}
const INTENTS = new Set<AssistantIntent>([
  'allergies', 'therapies', 'vitals_range', 'vitals_recent', 'narrative_search', 'document_search',
  'timeline', 'appointments', 'correlate', 'patient_search', 'refuse_clinical', 'data_query', 'unknown',
  // Agnos KB (Task 5): 8 nuovi intent di lettura + 'clarify' (predisposto per Task 6).
  'vitals_compare', 'vitals_trend', 'rooms_occupancy', 'rooms_occupants', 'consegne',
  'diary_notes', 'clinical_scores', 'operators_on_duty', 'clarify',
]);

/** Valida la forma del piano LLM e i tool contro l'allowlist read. Ritorna null se non valido. */
function validatePlan(raw: unknown, ctx: PlanContext): QueryPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  if (!INTENTS.has(p.intent as AssistantIntent)) return null;
  if (!Array.isArray(p.tools)) return null;
  const tools: QueryPlan['tools'] = [];
  for (const t of p.tools) {
    if (!t || typeof t !== 'object') return null;
    const name = (t as Record<string, unknown>).tool;
    if (typeof name !== 'string' || !isReadTool(name)) return null; // deny-by-default
    const args = ((t as Record<string, unknown>).args ?? {}) as Record<string, unknown>;
    tools.push({ tool: name, args });
  }
  // Cross-patient è determinato SOLO dai tool effettivamente usati (verità server-side), MAI
  // dallo 'scope' dichiarato dall'LLM: il modello etichetta a volte "cross_patient" una domanda
  // su un SINGOLO paziente (es. "allergie di Folli") solo perché va cercato per nome → falso
  // positivo che la faceva rifiutare in modo non deterministico. Un piano con soli tool
  // patient-scoped/lookup (search_patients) NON è cross-patient.
  const usesCrossTool = tools.some((t) => CROSS_TOOLS.has(t.tool));
  const scope: QueryPlan['scope'] = usesCrossTool ? 'cross_patient' : 'current_patient';
  const requiresCrossPatientAccess = usesCrossTool;
  return { intent: p.intent as AssistantIntent, scope, tools, requiresCrossPatientAccess };
}

/** Pianifica una lettura via LLM con validazione e fallback deterministico garantito. Il
 *  currentPatientId (autoritativo, risolto da F0) è iniettato QUI su ogni tool patient-scoped —
 *  non solo a valle in service.ts — così planQueryLLM è già sicuro anche se chiamato in isolamento
 *  (es. nei test): il paziente proposto dall'LLM non è MAI quello eseguito. */
export async function planQueryLLM(question: string, ctx: PlanContext, deps: PlanQueryLLMDeps = {}): Promise<PlanResult> {
  const fallback = (): PlanResult => ({ plan: injectPatientId(planQuery(question, ctx), ctx.currentPatientId), mode: 'deterministic' });
  if (!deps.callPlanRuntime) return fallback();
  try {
    const res = await deps.callPlanRuntime({
      question, currentPatientId: ctx.currentPatientId, roles: deps.roles ?? [], toolSchema: READ_TOOL_SCHEMA,
    });
    const validated = validatePlan(res?.plan, ctx);
    if (!validated) return fallback();
    // F1 ≥ F0: se l'LLM non sa (piano vuoto/unknown) ma il deterministico ha un piano, usa quello.
    if (validated.tools.length === 0 || validated.intent === 'unknown') {
      const det = planQuery(question, ctx);
      if (det.tools.length > 0) return { plan: injectPatientId(det, ctx.currentPatientId), mode: 'deterministic' };
    }
    return { plan: injectPatientId(validated, ctx.currentPatientId), mode: 'llm' };
  } catch {
    return fallback(); // runtime assente/timeout/errore → deterministico, nessun errore utente
  }
}
