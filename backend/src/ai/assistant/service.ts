// REQ-040: assistant orchestration. Executes a typed QueryPlan over the REQ-039 Data Gateway and
// assembles a SOURCE_ONLY answer — every value comes from a tool result and carries a source; nothing
// is invented; clinical-advice questions are refused; cross-patient access is role-gated; results are
// capped. No model call here: the plan is deterministic and the executor is the trusted boundary.

import { prisma } from '../../lib/prisma.js';
import * as svc from '../gateway/services.js';
import { canCrossPatientSearch } from '../gateway/context.js';
import { GatewayError, type SourceReference, type UserContext } from '../gateway/types.js';
import { appointmentSource, vitalSource } from '../gateway/sources.js';
import { planQuery, extractPatientName, pickResolvedPatient, type AssistantIntent, type PlanContext, type QueryPlan } from './plan.js';
import { planQueryLLM, injectPatientId } from './llm-planner.js';
import { composeAnswer } from './composer.js';
import { callPlanRuntime, callComposeRuntime } from './runtime-client.js';
import { loadAssistantLlmConfig } from './config.js';
import { validateQueryPlan } from '../gateway/query/validate.js';
import { runQueryPlan } from '../gateway/query/engine.js';
// Agnos KB (Task 5): motore di confronto/andamento parametri — SEMPRE calcolato dal backend, mai
// dall'LLM (che propone solo il tool; l'aritmetica resta qui, deterministica e testabile).
import { compareVitals, vitalsTrend, type VitalValue } from './vitals-compare.js';
// Agnos KB (Task 6): esito `clarify` — catalogo statico di chip suggerite quando la domanda non
// produce risultati e non è già un rifiuto (clinico/authz). Anti-allucinazione: mai testo libero.
import { suggestFor } from './clarify.js';

export interface NavAction { type: string; label: string; patientId?: string; sectionKey?: string; documentId?: string; recordId?: string; pageNumber?: number }

export interface AssistantAnswer {
  intent: AssistantIntent;
  scope: QueryPlan['scope'];
  plan: QueryPlan;
  results: unknown[];
  sources: SourceReference[];
  navigation: NavAction[];
  notFound: boolean;
  refusal?: string;
  truncated: boolean;
  // 016: modalità dell'interprete (F0 = deterministic) e risposta discorsiva opzionale (F2).
  mode?: 'deterministic' | 'llm';
  answerText?: string;
  composed?: boolean;
  // Agnos KB (Task 6): chip cliccabili da catalogo statico, popolate SOLO sull'esito `clarify`
  // (notFound senza refusal) — mai su un rifiuto o su una risposta con risultati reali.
  suggestions?: string[];
}

function limits(env: NodeJS.ProcessEnv = process.env) {
  const int = (k: string, d: number) => { const n = parseInt(env[k] ?? '', 10); return Number.isFinite(n) ? n : d; };
  return { maxResults: int('AI_SEARCH_MAX_RESULTS', 50), maxToolCalls: int('AI_MAX_TOOL_CALLS', 12), maxPatients: int('AI_QUERY_MAX_PATIENTS', 100) };
}

function navFromSource(s: SourceReference): NavAction {
  switch (s.sourceType) {
    case 'NARRATIVE_SECTION': return { type: 'open_section', label: `Apri sezione ${s.sectionKey}`, patientId: s.patientId, sectionKey: s.sectionKey, recordId: s.recordId };
    case 'DOCUMENT': return { type: 'open_document', label: 'Apri documento', patientId: s.patientId, documentId: s.documentId, pageNumber: s.pageNumber };
    case 'APPOINTMENT': return { type: 'open_appointment', label: 'Apri appuntamento', patientId: s.patientId, recordId: s.recordId };
    case 'VITAL_SIGN': return { type: 'open_parameter', label: `Apri parametro ${s.label}`, patientId: s.patientId, recordId: s.recordId };
    case 'THERAPY': return { type: 'open_therapy', label: 'Apri terapia', patientId: s.patientId, recordId: s.recordId };
    default: return { type: 'open_patient', label: 'Apri paziente', patientId: s.patientId, recordId: s.recordId };
  }
}

async function appointmentsToday(ctx: UserContext): Promise<{ data: unknown[]; sourceRefs: SourceReference[] }> {
  const today = new Date(); const from = new Date(today); from.setHours(0, 0, 0, 0); const to = new Date(today); to.setHours(23, 59, 59, 999);
  const rows = await prisma.appointment.findMany({ where: { scheduledAt: { gte: from, lte: to } }, orderBy: { scheduledAt: 'asc' }, take: 200 });
  const allowed = rows.filter((a) => ctx.permittedPatientIds === null || ctx.permittedPatientIds.includes(a.patientId));
  return { data: allowed, sourceRefs: allowed.map((a) => appointmentSource(a.patientId, a.id, a.reason ?? 'appuntamento', a.scheduledAt.toISOString())) };
}

/** Run the assistant for a question. Pure orchestration over the gateway; SOURCE_ONLY. */
export async function assistantQuery(
  question: string,
  ctx: UserContext,
  planCtx: PlanContext = {},
  env: NodeJS.ProcessEnv = process.env,
): Promise<AssistantAnswer> {
  const lim = limits(env);

  // 016 F0: se nessun paziente è aperto ma la domanda ne nomina uno, risolverlo per nome
  // riusando il tool gateway `search_patients` (authz applicata). Univoco ⇒ scope su quel paziente;
  // ambiguo/assente ⇒ nessuna invenzione (si continua e l'intent cadrà su unknown/not-found).
  let effectiveCtx = planCtx;
  if (!planCtx.currentPatientId) {
    const name = extractPatientName(question);
    if (name) {
      const matches = await svc.searchPatients({ query: name } as never, ctx);
      const resolved = pickResolvedPatient(matches.map((m) => ({ patientId: m.patientId })));
      if (resolved !== 'none' && resolved !== 'ambiguous') {
        effectiveCtx = { ...planCtx, currentPatientId: resolved.patientId };
      }
    }
  }

  // 016 F1: se il planner LLM è attivo e il runtime è configurato, l'LLM propone il piano
  // (validato + fallback deterministico garantito); altrimenti percorso deterministico (default).
  const cfg = loadAssistantLlmConfig(env);
  let plan: QueryPlan;
  let mode: 'deterministic' | 'llm';
  if (cfg.planEnabled && cfg.runtimeUrl && cfg.planModel) {
    const r = await planQueryLLM(question, effectiveCtx, { callPlanRuntime: (req) => callPlanRuntime(req, cfg), roles: ctx.roles });
    plan = r.plan; mode = r.mode;
  } else {
    plan = planQuery(question, effectiveCtx); mode = 'deterministic';
  }
  // Paziente autoritativo lato server: inietta il currentPatientId (risolto da F0) nei tool
  // patient-scoped del piano — l'LLM propone i tool ma non sceglie il paziente.
  plan = injectPatientId(plan, effectiveCtx.currentPatientId);
  const empty = (extra: Partial<AssistantAnswer> = {}): AssistantAnswer =>
    ({ intent: plan.intent, scope: plan.scope, plan, results: [], sources: [], navigation: [], notFound: true, truncated: false, mode, composed: false, ...extra });
  // Agnos KB (Task 6): esito `clarify` — quando la risposta finale è notFound e NON è già un
  // rifiuto (clinico/authz), propone chip da catalogo statico invece di un "non trovato" muto.
  // Non tocca mai un rifiuto reale né una risposta con risultati (notFound è già false in quei casi).
  const withClarify = (a: AssistantAnswer): AssistantAnswer => {
    if (!a.notFound || a.refusal) return a;
    return {
      ...a,
      suggestions: suggestFor({
        currentPatientId: effectiveCtx.currentPatientId,
        currentPatientName: effectiveCtx.currentPatientName,
        roles: ctx.roles,
      }),
      answerText: 'Non ho capito bene la domanda. Forse intendevi:',
    };
  };

  if (plan.intent === 'refuse_clinical') {
    return empty({ notFound: false, refusal: 'L’assistente non fornisce diagnosi, terapie o valutazioni cliniche. Posso solo cercare e mostrare dati esistenti con la loro fonte.' });
  }
  // An explicit LLM plan {intent:'clarify', tools:[...]} must surface suggestions, not execute
  // tools — the clarify short-circuit fires on intent alone, not just on an empty tool list.
  if (plan.intent === 'unknown' || plan.intent === 'clarify' || plan.tools.length === 0) {
    return withClarify(empty({ refusal: undefined }));
  }
  // cross-patient access is role + env gated; a denied request is reported, not executed
  if (plan.requiresCrossPatientAccess && !canCrossPatientSearch(ctx, env)) {
    return empty({ notFound: false, refusal: 'Ricerca tra più pazienti non autorizzata per il tuo ruolo.' });
  }

  const results: unknown[] = [];
  const sources: SourceReference[] = [];
  let calls = 0;
  for (const call of plan.tools) {
    if (calls >= lim.maxToolCalls) break;
    calls++;
    try {
      const r = await dispatch(call.tool, call.args, ctx);
      for (const item of r.data) { if (results.length >= lim.maxResults) break; results.push(item); }
      sources.push(...r.sourceRefs);
    } catch (e) {
      if (e instanceof GatewayError && (e.kind === 'forbidden' || e.kind === 'tenant_isolation' || e.kind === 'cross_patient_disabled')) {
        return empty({ notFound: false, refusal: 'Accesso non autorizzato per questa richiesta.' });
      }
      throw e;
    }
  }
  const navigation = dedupeNav(sources.slice(0, lim.maxResults).map(navFromSource));
  const cappedSources = sources.slice(0, lim.maxResults);

  // 016 F2: risposta discorsiva — solo se il composer è attivo e con dati recuperati; il post-check
  // anti-invenzione scarta prosa non fondata (→ risposta strutturata). Dati clinici → modello EU.
  let answerText: string | undefined;
  let composed = false;
  if (cfg.composeEnabled && cfg.composeModel && results.length > 0) {
    const c = await composeAnswer(question, results, cappedSources, { callComposeRuntime: (req) => callComposeRuntime(req, cfg) });
    if (c.composed) { answerText = c.answerText; composed = true; }
  }

  return withClarify({
    intent: plan.intent, scope: plan.scope, plan,
    results, sources: cappedSources, navigation,
    notFound: results.length === 0,
    truncated: results.length >= lim.maxResults,
    mode, answerText, composed,
  });
}

async function dispatch(tool: string, args: Record<string, unknown>, ctx: UserContext): Promise<{ data: unknown[]; sourceRefs: SourceReference[] }> {
  const pid = String(args.patientId ?? '');
  switch (tool) {
    case 'get_patient_allergies': { const r = await svc.getPatientAllergies(pid, ctx); return r; }
    case 'get_patient_therapies': { const r = await svc.getPatientTherapies(pid, ctx); return r; }
    case 'get_patient_vital_signs': { const r = await svc.getPatientVitalSigns(args as never, ctx); return r; }
    case 'get_patient_timeline': { const r = await svc.getPatientTimeline(pid, ctx); return r; }
    case 'get_patient_appointments': { const r = await svc.getPatientAppointments(pid, ctx); return r; }
    case 'search_clinical_sections': { const data = await svc.searchClinicalSections(args as never, ctx); return { data, sourceRefs: data.flatMap((m) => m.sourceRefs) }; }
    case 'search_documents': { const r = await svc.searchDocuments(args as never, ctx); return r; }
    case 'search_patients': { const data = await svc.searchPatients(args as never, ctx); return { data, sourceRefs: data.flatMap((m) => m.sourceRefs) }; }
    case 'search_across_patients': {
      // systolic-based broad query → correlate via cross-patient vitals; text → across search
      if (typeof args.systolicMin === 'number') return await crossVitals(Number(args.systolicMin), ctx);
      const data = await svc.searchAcrossPatients(args as never, ctx); return { data, sourceRefs: data.flatMap((m) => m.sourceRefs) };
    }
    case 'correlate_structured_data': { const r = await svc.correlate(args as never, ctx); return { data: r.data, sourceRefs: r.sourceRefs }; }
    case 'query_appointments_today': return await appointmentsToday(ctx);
    case 'query_data': return await dispatchQueryData((args as { plan?: unknown }).plan, ctx);
    // Agnos KB (Task 5): 8 nuovi tool di sola lettura.
    case 'compare_patient_vitals': {
      const vit = await svc.getPatientVitalSigns({ patientId: pid }, ctx);
      const today = new Date().toISOString().slice(0, 10);
      const dayA = (args.dayA as string) ?? today;
      const rawB = (args.dayB as string) ?? 'yesterday';
      const dayB = rawB === 'yesterday' ? new Date(Date.now() - 86400000).toISOString().slice(0, 10) : rawB;
      const cmp = compareVitals(vit.data, (args.label as string) ?? 'PA', dayA, dayB);
      if (!cmp) return { data: [], sourceRefs: [] };
      return {
        data: [cmp],
        sourceRefs: [vitalSource(pid, `cmp-${cmp.label}`, cmp.label,
          `${cmp.label} ${dayA}: ${fmtVal(cmp.valA)} · ${dayB}: ${fmtVal(cmp.valB)} · Δ ${fmtVal(cmp.delta)} ${cmp.unit}`, dayA)],
      };
    }
    case 'get_patient_vitals_trend': {
      const vit = await svc.getPatientVitalSigns({ patientId: pid }, ctx);
      const today = new Date().toISOString().slice(0, 10);
      const giorni = typeof args.giorni === 'number' ? args.giorni : 7;
      const trend = vitalsTrend(vit.data, (args.label as string) ?? 'PA', today, giorni);
      if (!trend) return { data: [], sourceRefs: [] };
      return {
        data: [trend],
        sourceRefs: [vitalSource(pid, `trend-${trend.label}`, trend.label,
          `${trend.label} andamento ${giorni}gg: ${trend.direction}`, today)],
      };
    }
    case 'query_rooms_occupancy': { const r = await svc.queryRoomsOccupancy(ctx); return r; }
    case 'query_room_occupants': { const r = await svc.queryRoomOccupants(args as never, ctx); return r; }
    case 'get_consegne': { const r = await svc.getConsegne(args as never, ctx); return r; }
    case 'get_patient_diary': { const r = await svc.getPatientDiary(pid, ctx, args as never); return r; }
    case 'get_clinical_scores': { const r = await svc.getClinicalScores(args as never, ctx); return r; }
    case 'query_operators': { const r = await svc.queryOperators(args as never, ctx); return r; }
    default: return { data: [], sourceRefs: [] };
  }
}

/** Formatta un valore vitale per il testo del SourceReference (mai per calcoli/decisioni). */
function fmtVal(v: VitalValue | null): string {
  return v ? (v.num2 !== undefined ? `${v.num}/${v.num2}` : String(v.num)) : 'n/d';
}

/** 016 F3: run a composable query plan (query_data tool). Validates the LLM-emitted plan against the
 *  whitelist and executes it via the trusted engine. Invalid plan → empty (composer degrades). A
 *  bad_request (patient not resolved) → empty; forbidden/tenant errors propagate so assistantQuery
 *  reports a clean refusal. */
export async function dispatchQueryData(rawPlan: unknown, ctx: UserContext, env: NodeJS.ProcessEnv = process.env, currentPatientId?: string): Promise<{ data: unknown[]; sourceRefs: SourceReference[] }> {
  const validated = validateQueryPlan(rawPlan);
  if (!validated) return { data: [], sourceRefs: [] };
  try {
    const out = await runQueryPlan(validated, ctx, env, currentPatientId);
    return { data: out.rows, sourceRefs: out.sources };
  } catch (e) {
    if (e instanceof GatewayError && e.kind === 'bad_request') return { data: [], sourceRefs: [] };
    throw e;
  }
}

/** Cross-patient "systolic > N" — gated already by the planner's requiresCrossPatientAccess. */
async function crossVitals(systolicMin: number, ctx: UserContext): Promise<{ data: unknown[]; sourceRefs: SourceReference[] }> {
  const patients = await prisma.patient.findMany({ take: 100 });
  const data: unknown[] = []; const sourceRefs: SourceReference[] = [];
  for (const p of patients) {
    if (ctx.permittedPatientIds !== null && !ctx.permittedPatientIds.includes(p.id)) continue;
    const r = await svc.getPatientVitalSigns({ patientId: p.id, label: 'PA', systolicMin }, ctx);
    if (r.data.length) { data.push({ patientId: p.id, vitals: r.data }); sourceRefs.push(...r.sourceRefs); }
  }
  return { data, sourceRefs };
}

function dedupeNav(nav: NavAction[]): NavAction[] {
  const seen = new Set<string>(); const out: NavAction[] = [];
  for (const n of nav) { const k = `${n.type}:${n.patientId}:${n.recordId ?? n.documentId ?? n.sectionKey ?? ''}`; if (!seen.has(k)) { seen.add(k); out.push(n); } }
  return out;
}
