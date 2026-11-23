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
export interface LlmPlanResponse {
  plan: unknown;
  confidence?: number;
}

export interface PlanQueryLLMDeps {
  /** Client del runtime LLM (iniettabile per i test). Assente ⇒ solo deterministico. */
  callPlanRuntime?: (req: LlmPlanRequest) => Promise<LlmPlanResponse>;
  roles?: string[];
}

export interface PlanResult {
  plan: QueryPlan;
  mode: 'llm' | 'deterministic';
}

// I tool che comportano accesso cross-patient: se il piano LLM ne usa uno, il server IMPONE cross.
const CROSS_TOOLS = new Set([
  'search_across_patients',
  'correlate_structured_data',
  'query_appointments_today',
]);

// Tool vincolati a un singolo paziente: il patientId è AUTORITATIVO lato server (risolto da F0),
// mai dedotto dall'LLM. Vi si inietta il currentPatientId quando manca.
const PATIENT_SCOPED = new Set([
  'get_patient_allergies',
  'get_patient_therapies',
  'get_patient_vital_signs',
  'get_patient_timeline',
  'get_patient_appointments',
  'search_clinical_sections',
  'get_patient_parameters',
  'get_patient_news2',
  'get_patient_diary',
  'get_patient_assessments',
  'get_patient_administrations',
  'get_patient_care_contacts',
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
  'allergies',
  'therapies',
  'vitals_range',
  'vitals_recent',
  'narrative_search',
  'document_search',
  'timeline',
  'appointments',
  'correlate',
  'patient_search',
  'staff_list',
  'refuse_clinical',
  'data_query',
  'unknown',
  // Erano validi nel pianificatore deterministico ma scartati da quello LLM.
  'vitals_trend',
  'rooms_occupancy',
  'facility_snapshot',
  'operator_queue',
  // Milo fase 1
  'parameters_overview',
  'clinical_score',
  'diary',
  'assessments',
  'administrations',
  'staff_shifts',
  'agenda',
  // Milo, casi d'uso
  'patient_status',
  'care_contacts',
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

/** Pianifica una lettura via LLM con validazione e fallback deterministico garantito. */
/** Intent del deterministico abbastanza specifici da prevalere su un piano LLM diverso. */
export const PRECISE_INTENTS = new Set<string>([
  'staff_shifts',
  'agenda',
  'parameters_overview',
  'clinical_score',
  'diary',
  'assessments',
  'administrations',
  'patient_status',
  'care_contacts',
  'rooms_occupancy',
]);

export async function planQueryLLM(
  question: string,
  ctx: PlanContext,
  deps: PlanQueryLLMDeps = {},
): Promise<PlanResult> {
  const fallback = (): PlanResult => ({ plan: planQuery(question, ctx), mode: 'deterministic' });
  if (!deps.callPlanRuntime) return fallback();
  try {
    const res = await deps.callPlanRuntime({
      question,
      currentPatientId: ctx.currentPatientId,
      roles: deps.roles ?? [],
      toolSchema: READ_TOOL_SCHEMA,
    });
    const validated = validatePlan(res?.plan, ctx);
    if (!validated) return fallback();
    // Milo: le domande che il deterministico riconosce con certezza fra le letture dedicate (turni,
    // agenda, parametri, NEWS2, diario, scale, somministrazioni) usano lo strumento dedicato anche se
    // il modello propone una lettura generica (panoramica, query_data): più precisa e senza date
    // costruite dal modello.
    const precise = planQuery(question, ctx);
    if (PRECISE_INTENTS.has(precise.intent) && validated.intent !== precise.intent)
      return { plan: precise, mode: 'deterministic' };
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
