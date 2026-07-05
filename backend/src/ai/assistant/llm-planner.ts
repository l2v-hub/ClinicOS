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
const CROSS_TOOLS = new Set(['search_across_patients', 'correlate_structured_data', 'query_appointments_today']);

// Tool vincolati a un singolo paziente: il patientId è AUTORITATIVO lato server (risolto da F0),
// mai dedotto dall'LLM. Vi si inietta il currentPatientId quando manca.
const PATIENT_SCOPED = new Set(['get_patient_allergies', 'get_patient_therapies', 'get_patient_vital_signs', 'get_patient_timeline', 'get_patient_appointments', 'search_clinical_sections']);

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
const INTENTS = new Set<AssistantIntent>(['allergies', 'therapies', 'vitals_range', 'vitals_recent', 'narrative_search', 'document_search', 'timeline', 'appointments', 'correlate', 'patient_search', 'refuse_clinical', 'unknown']);

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
  const scope: QueryPlan['scope'] = p.scope === 'cross_patient' || tools.some((t) => CROSS_TOOLS.has(t.tool))
    ? 'cross_patient' : 'current_patient';
  // requiresCrossPatientAccess RICALCOLATO server-side (mai fidato dall'LLM).
  const requiresCrossPatientAccess = scope === 'cross_patient' || tools.some((t) => CROSS_TOOLS.has(t.tool));
  return { intent: p.intent as AssistantIntent, scope, tools, requiresCrossPatientAccess };
}

/** Pianifica una lettura via LLM con validazione e fallback deterministico garantito. */
export async function planQueryLLM(question: string, ctx: PlanContext, deps: PlanQueryLLMDeps = {}): Promise<PlanResult> {
  const fallback = (): PlanResult => ({ plan: planQuery(question, ctx), mode: 'deterministic' });
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
      if (det.tools.length > 0) return { plan: det, mode: 'deterministic' };
    }
    return { plan: validated, mode: 'llm' };
  } catch {
    return fallback(); // runtime assente/timeout/errore → deterministico, nessun errore utente
  }
}
