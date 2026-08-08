// REQ-040: assistant orchestration. Executes a typed QueryPlan over the REQ-039 Data Gateway and
// assembles a SOURCE_ONLY answer — every value comes from a tool result and carries a source; nothing
// is invented; clinical-advice questions are refused; cross-patient access is role-gated; results are
// capped. No model call here: the plan is deterministic and the executor is the trusted boundary.

import { prisma } from '../../lib/prisma.js';
import * as svc from '../gateway/services.js';
import { canCrossPatientSearch, canFacilityRead, isPatientAllowed } from '../gateway/context.js';
import { GatewayError, type SourceReference, type UserContext } from '../gateway/types.js';
import {
  appointmentSource,
  consegnaSource,
  roomOccupancySource,
  staffSource,
  therapySource,
} from '../gateway/sources.js';
import { buildTherapySlots } from '../../therapies/therapy-slots.js';
import {
  collectTherapiesDue,
  dayKey,
  isConsegnaOpen,
  isConsegnaOverdue,
  partitionByOperator,
  sortConsegne,
  type ConsegnaRow,
  type TherapyDueItem,
} from './facility-signals.js';
import {
  planQuery,
  extractPatientName,
  pickResolvedPatient,
  type AssistantIntent,
  type PlanContext,
  type QueryPlan,
} from './plan.js';
import { agentAllowsIntent, redirectMessage, type AgentId } from './agents.js';
import { planQueryLLM, injectPatientId } from './llm-planner.js';
import { composeAnswer } from './composer.js';
import { callPlanRuntime, callComposeRuntime } from './runtime-client.js';
import { loadAssistantLlmConfig } from './config.js';
import { validateQueryPlan } from '../gateway/query/validate.js';
import { dedupeNav, navFromSource, type NavAction } from './nav.js';
import { runQueryPlan } from '../gateway/query/engine.js';

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
  /** Fase 0: sub-agent that produced (or redirected) this answer. */
  agent?: AgentId;
}

function limits(env: NodeJS.ProcessEnv = process.env) {
  const int = (k: string, d: number) => {
    const n = parseInt(env[k] ?? '', 10);
    return Number.isFinite(n) ? n : d;
  };
  return {
    maxResults: int('AI_SEARCH_MAX_RESULTS', 50),
    maxToolCalls: int('AI_MAX_TOOL_CALLS', 12),
    maxPatients: int('AI_QUERY_MAX_PATIENTS', 100),
  };
}

async function appointmentsToday(
  ctx: UserContext,
): Promise<{ data: unknown[]; sourceRefs: SourceReference[] }> {
  const today = new Date();
  const from = new Date(today);
  from.setHours(0, 0, 0, 0);
  const to = new Date(today);
  to.setHours(23, 59, 59, 999);
  const rows = await prisma.appointment.findMany({
    where: { scheduledAt: { gte: from, lte: to } },
    orderBy: { scheduledAt: 'asc' },
    take: 200,
  });
  const allowed = rows.filter(
    (a) => ctx.permittedPatientIds === null || ctx.permittedPatientIds.includes(a.patientId),
  );
  return {
    data: allowed,
    sourceRefs: allowed.map((a) =>
      appointmentSource(a.patientId, a.id, a.reason ?? 'appuntamento', a.scheduledAt.toISOString()),
    ),
  };
}

/** issue #239: aggregate rooms/beds occupancy — counts only, NEVER patient names/identifiers.
 *  Facility-level read (canFacilityRead), same "active assignment" convention already used by
 *  the /admin/rooms/occupancy route (backend/src/routes/admin-rooms.ts): an assignment is active
 *  when endDate is null OR still in the future (>= today) — a bed with a scheduled-but-not-yet-
 *  ended stay must count as occupied here too, or the assistant's numbers would disagree with the
 *  admin panel's. Maintenance beds are counted separately (never as free). */
async function roomsOccupancy(
  env: NodeJS.ProcessEnv,
): Promise<{ data: unknown[]; sourceRefs: SourceReference[] }> {
  if (!canFacilityRead(env))
    throw new GatewayError('forbidden', 'Funzioni di struttura non abilitate');
  const today = new Date().toISOString().slice(0, 10);
  const rooms = await prisma.room.findMany({
    include: {
      beds: {
        include: {
          assignments: { where: { OR: [{ endDate: null }, { endDate: { gte: today } }] } },
        },
      },
    },
  });
  let totalBeds = 0;
  let occupiedBeds = 0;
  let maintenanceBeds = 0;
  for (const room of rooms) {
    for (const bed of room.beds) {
      totalBeds++;
      if (bed.assignments.length > 0) occupiedBeds++;
      if (bed.stato === 'manutenzione') maintenanceBeds++;
    }
  }
  const freeBeds = Math.max(0, totalBeds - occupiedBeds - maintenanceBeds);
  const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  const data = [
    { totalRooms: rooms.length, totalBeds, occupiedBeds, freeBeds, maintenanceBeds, occupancyPct },
  ];
  return {
    data,
    sourceRefs: [
      roomOccupancySource(
        `${occupiedBeds}/${totalBeds} letti occupati; ${rooms.length} camere censite`,
        new Date().toISOString(),
      ),
    ],
  };
}

/** Fase 1b: staff roster (User+Operator) — organisational data only (fullName/ruolo/qualifica/
 *  reparto/stato), NEVER patient data. Facility-level read behind the same canFacilityRead gate
 *  as rooms_occupancy; email/phone are deliberately not exposed to the assistant. */
async function staffList(
  env: NodeJS.ProcessEnv,
): Promise<{ data: unknown[]; sourceRefs: SourceReference[] }> {
  if (!canFacilityRead(env))
    throw new GatewayError('forbidden', 'Funzioni di struttura non abilitate');
  const operators = await prisma.operator.findMany({
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  });
  const data = operators.map((op) => ({
    fullName: op.user.fullName,
    ruolo: op.ruolo ?? null,
    qualifica: op.qualifica ?? null,
    reparto: op.department ?? null,
    stato: op.user.isActive ? 'attivo' : 'inattivo',
  }));
  return {
    data,
    sourceRefs: [staffSource(`${data.length} operatori censiti`, new Date().toISOString())],
  };
}

/** Quante eccezioni vengono elencate per esteso accanto al conteggio: abbastanza da nominare i casi
 *  concreti ("2 consegne scadute: …"), non tante da trasformare l'istantanea in un elenco. */
const SAMPLE_SIZE = 5;
/** Finestra della coda operatore: le dosi oltre questo orizzonte non sono "adesso". */
const QUEUE_WINDOW_MINUTES = 120;

// Il perimetro paziente usa la funzione canonica del gateway, non una copia locale: una riga senza
// paziente collegato (`Consegna.pazienteId` è `String @default("")`) porta comunque nome paziente e
// note in chiaro, quindi con una allow-list esplicita deve restare fuori.
async function openConsegne(ctx: UserContext): Promise<ConsegnaRow[]> {
  const rows = (await prisma.consegna.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
  })) as ConsegnaRow[];
  return rows.filter((c) => isConsegnaOpen(c) && isPatientAllowed(ctx, c.pazienteId));
}

async function therapiesDue(ctx: UserContext, now: Date, windowMinutes: number) {
  const slots = await buildTherapySlots(dayKey(now));
  const scoped = slots.map((s) => ({
    ...s,
    patients: s.patients.filter((p) => isPatientAllowed(ctx, p.patientId)),
  }));
  return collectTherapiesDue(scoped, now, windowMinutes);
}

const therapyItemSource = (t: TherapyDueItem) =>
  therapySource(
    t.patientId,
    t.therapyId,
    `${t.drugName} ${t.scheduledTime}`,
    `${t.drugName} delle ${t.scheduledTime} non ancora somministrata (${t.patientName})`,
    undefined,
  );

const consegnaItemSource = (c: ConsegnaRow) =>
  consegnaSource(
    c.pazienteId,
    c.id,
    `Consegna ${c.tipo}`,
    `${c.pazienteNome}: ${c.note}`.slice(0, 300),
    c.oraScadenza ? `${c.scadenza}T${c.oraScadenza}` : c.scadenza,
  );

/** Istantanea della struttura: occupazione + terapie in ritardo + consegne scadute + appuntamenti
 *  di oggi, in una sola lettura. Facility-level (canFacilityRead, role-independent) come
 *  rooms_occupancy: aggrega ciò che l'operatore vede già nelle schermate di reparto, non apre
 *  alcuna ricerca clinica cross-paziente. Conteggi e campioni rispettano comunque l'eventuale
 *  allow-list di pazienti del chiamante. */
async function facilitySnapshot(
  ctx: UserContext,
  env: NodeJS.ProcessEnv,
  now: Date = new Date(),
): Promise<{ data: unknown[]; sourceRefs: SourceReference[] }> {
  if (!canFacilityRead(env))
    throw new GatewayError('forbidden', 'Funzioni di struttura non abilitate');

  const occ = await roomsOccupancy(env);
  const { overdue } = await therapiesDue(ctx, now, 0);
  const consegneOverdue = sortConsegne(
    (await openConsegne(ctx)).filter((c) => isConsegnaOverdue(c, now)),
  );
  const appuntamenti = await appointmentsToday(ctx);
  const generatedAt = now.toISOString();

  const therapiesOverdue = overdue.slice(0, SAMPLE_SIZE);
  const consegneSample = consegneOverdue.slice(0, SAMPLE_SIZE);

  const data = [
    {
      generatedAt,
      occupancy: occ.data[0] ?? null,
      therapiesOverdueCount: overdue.length,
      therapiesOverdue,
      consegneOverdueCount: consegneOverdue.length,
      consegneOverdue: consegneSample.map((c) => ({
        id: c.id,
        pazienteId: c.pazienteId,
        pazienteNome: c.pazienteNome,
        tipo: c.tipo,
        priorita: c.priorita,
        stato: c.stato,
        note: c.note,
        scadenza: c.scadenza,
        oraScadenza: c.oraScadenza,
        operatoreAssegnato: c.operatoreAssegnato,
      })),
      appointmentsTodayCount: appuntamenti.data.length,
    },
  ];

  const sourceRefs: SourceReference[] = [...occ.sourceRefs];
  sourceRefs.push(
    therapySource(
      '',
      'therapies-overdue',
      'Somministrazioni in ritardo',
      `${overdue.length} somministrazioni ancora da erogare oltre l'orario previsto`,
      generatedAt,
    ),
  );
  sourceRefs.push(...therapiesOverdue.map(therapyItemSource));
  sourceRefs.push(
    consegnaSource(
      '',
      'consegne-overdue',
      'Consegne scadute',
      `${consegneOverdue.length} consegne aperte oltre il termine`,
      generatedAt,
    ),
  );
  sourceRefs.push(...consegneSample.map(consegnaItemSource));
  sourceRefs.push(
    appointmentSource(
      '',
      'agenda-today',
      'Agenda di oggi',
      `${appuntamenti.data.length} appuntamenti programmati oggi`,
    ),
  );
  return { data, sourceRefs };
}

/** Coda di lavoro «cosa devo fare adesso»: dosi in ritardo o dovute entro la finestra + consegne
 *  aperte. LIMITE DICHIARATO: non esiste alcuna assegnazione paziente↔operatore nel modello dati,
 *  quindi questa è la giornata del REPARTO, non "i tuoi pazienti". `operatoreAssegnato` è testo
 *  libero: la corrispondenza sul nome ORDINA la lista (gruppo `myLikelyConsegne`) e non ne scarta
 *  mai una — un match sbagliato non deve poter nascondere un'attività a nessuno. */
async function operatorQueue(
  ctx: UserContext,
  env: NodeJS.ProcessEnv,
  operatorName?: string,
  now: Date = new Date(),
): Promise<{ data: unknown[]; sourceRefs: SourceReference[] }> {
  if (!canFacilityRead(env))
    throw new GatewayError('forbidden', 'Funzioni di struttura non abilitate');

  const { overdue, dueSoon } = await therapiesDue(ctx, now, QUEUE_WINDOW_MINUTES);
  const { mine, others } = partitionByOperator(sortConsegne(await openConsegne(ctx)), operatorName);
  const generatedAt = now.toISOString();

  const therapiesOverdue = overdue.slice(0, SAMPLE_SIZE);
  const therapiesDueSoon = dueSoon.slice(0, SAMPLE_SIZE);
  const myLikelyConsegne = mine.slice(0, SAMPLE_SIZE);
  const otherOpenConsegne = others.slice(0, SAMPLE_SIZE);

  const data = [
    {
      generatedAt,
      windowMinutes: QUEUE_WINDOW_MINUTES,
      operatorName: operatorName ?? null,
      /** Il perimetro è il reparto: nessun filtro per paziente assegnato esiste nel modello dati. */
      scope: 'reparto',
      therapiesOverdueCount: overdue.length,
      therapiesOverdue,
      therapiesDueSoonCount: dueSoon.length,
      therapiesDueSoon,
      myLikelyConsegneCount: mine.length,
      myLikelyConsegne,
      otherOpenConsegneCount: others.length,
      otherOpenConsegne,
    },
  ];

  const sourceRefs: SourceReference[] = [
    therapySource(
      '',
      'therapies-queue',
      'Somministrazioni da erogare',
      `${overdue.length} in ritardo, ${dueSoon.length} entro ${QUEUE_WINDOW_MINUTES} minuti`,
      generatedAt,
    ),
    ...therapiesOverdue.map(therapyItemSource),
    ...therapiesDueSoon.map(therapyItemSource),
    consegnaSource(
      '',
      'consegne-open',
      'Consegne aperte',
      `${mine.length + others.length} consegne aperte`,
      generatedAt,
    ),
    ...myLikelyConsegne.map(consegnaItemSource),
    ...otherOpenConsegne.map(consegnaItemSource),
  ];
  return { data, sourceRefs };
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
    const r = await planQueryLLM(question, effectiveCtx, {
      callPlanRuntime: (req) => callPlanRuntime(req, cfg),
      roles: ctx.roles,
    });
    plan = r.plan;
    mode = r.mode;
  } else {
    plan = planQuery(question, effectiveCtx);
    mode = 'deterministic';
  }
  // Paziente autoritativo lato server: inietta il currentPatientId (risolto da F0) nei tool
  // patient-scoped del piano — l'LLM propone i tool ma non sceglie il paziente.
  plan = injectPatientId(plan, effectiveCtx.currentPatientId);
  const empty = (extra: Partial<AssistantAnswer> = {}): AssistantAnswer => ({
    intent: plan.intent,
    scope: plan.scope,
    plan,
    results: [],
    sources: [],
    navigation: [],
    notFound: true,
    truncated: false,
    mode,
    composed: false,
    agent: planCtx.agent,
    ...extra,
  });

  if (plan.intent === 'refuse_clinical') {
    return empty({
      notFound: false,
      refusal:
        'L’assistente non fornisce diagnosi, terapie o valutazioni cliniche. Posso solo cercare e mostrare dati esistenti con la loro fonte.',
    });
  }
  if (plan.intent === 'unknown' || plan.tools.length === 0) {
    return empty({ refusal: undefined });
  }
  // Fase 0 sub-agent scoping: the selected agent serves only its domain intents; a domain intent
  // owned by the OTHER agent is redirected (not executed). Shared/neutral intents (patient_search,
  // appointments) pass; refusals/not-found already returned above. Additive — no guardrail weakened.
  if (planCtx.agent && !agentAllowsIntent(planCtx.agent, plan.intent)) {
    return empty({ notFound: false, refusal: redirectMessage(planCtx.agent, plan.intent) });
  }
  // cross-patient access is role + env gated; a denied request is reported, not executed
  if (plan.requiresCrossPatientAccess && !canCrossPatientSearch(ctx, env)) {
    return empty({
      notFound: false,
      refusal: 'Ricerca tra più pazienti non autorizzata per il tuo ruolo.',
    });
  }

  const results: unknown[] = [];
  const sources: SourceReference[] = [];
  let calls = 0;
  for (const call of plan.tools) {
    if (calls >= lim.maxToolCalls) break;
    calls++;
    try {
      const r = await dispatch(call.tool, call.args, ctx, env, effectiveCtx.operatorName);
      for (const item of r.data) {
        if (results.length >= lim.maxResults) break;
        results.push(item);
      }
      sources.push(...r.sourceRefs);
    } catch (e) {
      if (
        e instanceof GatewayError &&
        (e.kind === 'forbidden' ||
          e.kind === 'tenant_isolation' ||
          e.kind === 'cross_patient_disabled')
      ) {
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
    const c = await composeAnswer(question, results, cappedSources, {
      callComposeRuntime: (req) => callComposeRuntime(req, cfg),
    });
    if (c.composed) {
      answerText = c.answerText;
      composed = true;
    }
  }

  return {
    intent: plan.intent,
    scope: plan.scope,
    plan,
    results,
    sources: cappedSources,
    navigation,
    notFound: results.length === 0,
    truncated: results.length >= lim.maxResults,
    mode,
    answerText,
    composed,
    agent: planCtx.agent,
  };
}

async function dispatch(
  tool: string,
  args: Record<string, unknown>,
  ctx: UserContext,
  env: NodeJS.ProcessEnv = process.env,
  operatorName?: string,
): Promise<{ data: unknown[]; sourceRefs: SourceReference[] }> {
  const pid = String(args.patientId ?? '');
  switch (tool) {
    case 'get_patient_allergies': {
      const r = await svc.getPatientAllergies(pid, ctx);
      return r;
    }
    case 'get_patient_therapies': {
      const r = await svc.getPatientTherapies(pid, ctx);
      return r;
    }
    case 'get_patient_vital_signs': {
      const r = await svc.getPatientVitalSigns(args as never, ctx);
      return r;
    }
    case 'get_patient_timeline': {
      const r = await svc.getPatientTimeline(pid, ctx);
      return r;
    }
    case 'get_patient_appointments': {
      const r = await svc.getPatientAppointments(pid, ctx);
      return r;
    }
    case 'search_clinical_sections': {
      const data = await svc.searchClinicalSections(args as never, ctx);
      return { data, sourceRefs: data.flatMap((m) => m.sourceRefs) };
    }
    case 'search_documents': {
      const r = await svc.searchDocuments(args as never, ctx);
      return r;
    }
    case 'search_patients': {
      const data = await svc.searchPatients(args as never, ctx);
      return { data, sourceRefs: data.flatMap((m) => m.sourceRefs) };
    }
    case 'search_across_patients': {
      // systolic-based broad query → correlate via cross-patient vitals; text → across search
      if (typeof args.systolicMin === 'number')
        return await crossVitals(Number(args.systolicMin), ctx);
      const data = await svc.searchAcrossPatients(args as never, ctx);
      return { data, sourceRefs: data.flatMap((m) => m.sourceRefs) };
    }
    case 'correlate_structured_data': {
      const r = await svc.correlate(args as never, ctx);
      return { data: r.data, sourceRefs: r.sourceRefs };
    }
    case 'query_appointments_today':
      return await appointmentsToday(ctx);
    case 'query_rooms_occupancy':
      return await roomsOccupancy(env);
    case 'query_staff_list':
      return await staffList(env);
    case 'get_facility_snapshot':
      return await facilitySnapshot(ctx, env);
    // L'identità dell'operatore arriva dal contesto server, mai da `args`: il modello può chiedere
    // la coda, non può chiederla "per conto di" qualcun altro.
    case 'get_operator_queue':
      return await operatorQueue(ctx, env, operatorName);
    case 'query_data':
      return await dispatchQueryData((args as { plan?: unknown }).plan, ctx);
    default:
      return { data: [], sourceRefs: [] };
  }
}

/** 016 F3: run a composable query plan (query_data tool). Validates the LLM-emitted plan against the
 *  whitelist and executes it via the trusted engine. Invalid plan → empty (composer degrades). A
 *  bad_request (patient not resolved) → empty; forbidden/tenant errors propagate so assistantQuery
 *  reports a clean refusal. */
export async function dispatchQueryData(
  rawPlan: unknown,
  ctx: UserContext,
  env: NodeJS.ProcessEnv = process.env,
  currentPatientId?: string,
): Promise<{ data: unknown[]; sourceRefs: SourceReference[] }> {
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
async function crossVitals(
  systolicMin: number,
  ctx: UserContext,
): Promise<{ data: unknown[]; sourceRefs: SourceReference[] }> {
  const patients = await prisma.patient.findMany({ take: 100 });
  const data: unknown[] = [];
  const sourceRefs: SourceReference[] = [];
  for (const p of patients) {
    if (ctx.permittedPatientIds !== null && !ctx.permittedPatientIds.includes(p.id)) continue;
    const r = await svc.getPatientVitalSigns({ patientId: p.id, label: 'PA', systolicMin }, ctx);
    if (r.data.length) {
      data.push({ patientId: p.id, vitals: r.data });
      sourceRefs.push(...r.sourceRefs);
    }
  }
  return { data, sourceRefs };
}
