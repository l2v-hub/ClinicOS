// REQ-040: assistant orchestration. Executes a typed QueryPlan over the REQ-039 Data Gateway and
// assembles a SOURCE_ONLY answer — every value comes from a tool result and carries a source; nothing
// is invented; clinical-advice questions are refused; cross-patient access is role-gated; results are
// capped. No model call here: the plan is deterministic and the executor is the trusted boundary.

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { getFacilityOccupancy } from '../../rooms/occupancy-service.js';
import * as svc from '../gateway/services.js';
import { canCrossPatientSearch, canFacilityRead } from '../gateway/context.js';
import { GatewayError, type SourceReference, type UserContext } from '../gateway/types.js';
import {
  appointmentSource,
  consegnaSource,
  roomOccupancySource,
  staffSource,
  therapySource,
} from '../gateway/sources.js';
import { findTherapiesDue } from '../../therapies/due-therapy-query.js';
import { dayKey, type ConsegnaRow, type TherapyDueItem } from './facility-signals.js';
import {
  planQuery,
  extractPatientName,
  pickResolvedPatient,
  type AssistantIntent,
  type PlanContext,
  type QueryPlan,
} from './plan.js';
import { resolveAgent, type AgentId } from './agents.js';
import { planQueryLLM, injectPatientId } from './llm-planner.js';
import { composeAnswer } from './composer.js';
import { callPlanRuntime, callComposeRuntime } from './runtime-client.js';
import { loadAssistantLlmConfig } from './config.js';
import { validateQueryPlan } from '../gateway/query/validate.js';
import { dedupeNav, navFromSource, type NavAction } from './nav.js';
import { runQueryPlan } from '../gateway/query/engine.js';
import { boundStaffList, MAX_STAFF_RESULTS } from './staff-window.js';
import { boundTodayAppointments, todayAppointmentLimit } from './appointments-today-window.js';

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
  /** Sub-agent che ha prodotto la risposta: lo decide l'intent, non la scelta dell'utente. */
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

function appointmentsTodayWhere(ctx: UserContext, now: Date): Prisma.AppointmentWhereInput {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  return {
    scheduledAt: { gte: from, lte: to },
    ...(ctx.permittedPatientIds === null ? {} : { patientId: { in: ctx.permittedPatientIds } }),
  };
}

async function appointmentsToday(
  ctx: UserContext,
  env: NodeJS.ProcessEnv,
  now: Date = new Date(),
): Promise<{ data: unknown[]; sourceRefs: SourceReference[]; truncated: boolean }> {
  if (ctx.permittedPatientIds?.length === 0) {
    return { data: [], sourceRefs: [], truncated: false };
  }
  const limit = todayAppointmentLimit(limits(env).maxResults);
  const rows = await prisma.appointment.findMany({
    where: appointmentsTodayWhere(ctx, now),
    select: {
      id: true,
      patientId: true,
      scheduledAt: true,
      durationMinutes: true,
      reason: true,
      status: true,
    },
    orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }],
    take: limit + 1,
  });
  const result = boundTodayAppointments(rows, limit);
  return {
    data: result.data,
    sourceRefs: result.data.map((a) =>
      appointmentSource(a.patientId, a.id, a.reason ?? 'appuntamento', a.scheduledAt.toISOString()),
    ),
    truncated: result.truncated,
  };
}

async function appointmentsTodayCount(ctx: UserContext, now: Date): Promise<number> {
  if (ctx.permittedPatientIds?.length === 0) return 0;
  return prisma.appointment.count({ where: appointmentsTodayWhere(ctx, now) });
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
  const occupancy = await getFacilityOccupancy();
  const data = [occupancy];
  return {
    data,
    sourceRefs: [
      roomOccupancySource(
        `${occupancy.occupiedBeds}/${occupancy.totalBeds} letti occupati; ${occupancy.totalRooms} camere censite`,
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
): Promise<{ data: unknown[]; sourceRefs: SourceReference[]; truncated: boolean }> {
  if (!canFacilityRead(env))
    throw new GatewayError('forbidden', 'Funzioni di struttura non abilitate');
  const operators = await prisma.operator.findMany({
    select: {
      ruolo: true,
      qualifica: true,
      department: true,
      user: { select: { fullName: true, isActive: true } },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: MAX_STAFF_RESULTS + 1,
  });
  const result = boundStaffList(operators);
  const sourceText = result.truncated
    ? `${result.data.length} operatori mostrati; elenco parziale`
    : `${result.data.length} operatori censiti`;
  return {
    data: result.data,
    sourceRefs: [staffSource(sourceText, new Date().toISOString())],
    truncated: result.truncated,
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
function privilegedContext(ctx: UserContext): boolean {
  return ctx.roles.some((role) => role === 'admin' || role === 'manager');
}

function consegnaPatientSql(ctx: UserContext): Prisma.Sql {
  if (ctx.permittedPatientIds === null) return Prisma.sql`TRUE`;
  if (ctx.permittedPatientIds.length === 0) return Prisma.sql`FALSE`;
  return Prisma.sql`c."pazienteId" IN (${Prisma.join(ctx.permittedPatientIds)})`;
}

function consegnaActorSql(ctx: UserContext): Prisma.Sql {
  return privilegedContext(ctx)
    ? Prisma.sql`TRUE`
    : Prisma.sql`(c."creatoDaId" = ${ctx.userId} OR c."operatoreAssegnatoId" = ${ctx.userId})`;
}

const AI_CONSEGNA_COLUMNS = Prisma.raw(`
  c."id", c."pazienteId", c."pazienteNome", c."priorita", c."stato", c."tipo",
  c."note", c."scadenza", c."oraScadenza", c."operatoreAssegnato",
  c."operatoreAssegnatoId", c."creatoDaId"`);

async function overdueConsegne(ctx: UserContext, now: Date) {
  const today = dayKey(now);
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const where = Prisma.sql`
    c."stato" <> 'completata'
    AND ${consegnaActorSql(ctx)}
    AND ${consegnaPatientSql(ctx)}
    AND (
      c."scadenza" < ${today}
      OR (
        c."scadenza" = ${today}
        AND c."oraScadenza" ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'
        AND c."oraScadenza" < ${currentTime}
      )
    )`;
  const [countRows, items] = await Promise.all([
    prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS "count" FROM "Consegna" c WHERE ${where}
    `),
    prisma.$queryRaw<ConsegnaRow[]>(Prisma.sql`
      SELECT ${AI_CONSEGNA_COLUMNS} FROM "Consegna" c WHERE ${where}
      ORDER BY
        CASE c."priorita" WHEN 'urgente' THEN 0 WHEN 'alta' THEN 1 ELSE 2 END,
        c."scadenza" ASC, c."oraScadenza" ASC NULLS LAST, c."id" ASC
      LIMIT ${SAMPLE_SIZE}
    `),
  ]);
  return { count: countRows[0]?.count ?? 0, items };
}

async function openConsegnaQueue(ctx: UserContext) {
  const base = Prisma.sql`
    c."stato" <> 'completata'
    AND ${consegnaActorSql(ctx)}
    AND ${consegnaPatientSql(ctx)}`;
  const mine = Prisma.sql`${base} AND c."operatoreAssegnatoId" = ${ctx.userId}`;
  const others = Prisma.sql`${base} AND (c."operatoreAssegnatoId" IS NULL OR c."operatoreAssegnatoId" <> ${ctx.userId})`;
  const order = Prisma.sql`
    ORDER BY CASE c."priorita" WHEN 'urgente' THEN 0 WHEN 'alta' THEN 1 ELSE 2 END,
      c."scadenza" ASC, c."oraScadenza" ASC NULLS LAST, c."id" ASC`;
  const [mineCount, otherCount, mineItems, otherItems] = await Promise.all([
    prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS "count" FROM "Consegna" c WHERE ${mine}`),
    prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS "count" FROM "Consegna" c WHERE ${others}`),
    prisma.$queryRaw<ConsegnaRow[]>(Prisma.sql`
      SELECT ${AI_CONSEGNA_COLUMNS} FROM "Consegna" c WHERE ${mine} ${order} LIMIT ${SAMPLE_SIZE}`),
    prisma.$queryRaw<ConsegnaRow[]>(Prisma.sql`
      SELECT ${AI_CONSEGNA_COLUMNS} FROM "Consegna" c WHERE ${others} ${order} LIMIT ${SAMPLE_SIZE}`),
  ]);
  return {
    mineCount: mineCount[0]?.count ?? 0,
    otherCount: otherCount[0]?.count ?? 0,
    mineItems,
    otherItems,
  };
}

async function therapiesDue(ctx: UserContext, now: Date, windowMinutes: number) {
  return findTherapiesDue(
    dayKey(now),
    { patientIds: ctx.permittedPatientIds },
    now,
    windowMinutes,
    SAMPLE_SIZE,
  );
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
): Promise<{ data: unknown[]; sourceRefs: SourceReference[]; truncated: boolean }> {
  if (!canFacilityRead(env))
    throw new GatewayError('forbidden', 'Funzioni di struttura non abilitate');

  const occ = await roomsOccupancy(env);
  const therapies = await therapiesDue(ctx, now, 0);
  const consegneOverdue = await overdueConsegne(ctx, now);
  const appointmentsTodayTotal = await appointmentsTodayCount(ctx, now);
  const generatedAt = now.toISOString();

  const therapiesOverdue = therapies.overdue;
  const consegneSample = consegneOverdue.items;

  const data = [
    {
      generatedAt,
      occupancy: occ.data[0] ?? null,
      therapiesOverdueCount: therapies.overdueCount,
      therapiesOverdueSampleCount: therapiesOverdue.length,
      therapiesOverdue,
      consegneOverdueCount: consegneOverdue.count,
      consegneOverdueSampleCount: consegneSample.length,
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
      appointmentsTodayCount: appointmentsTodayTotal,
    },
  ];

  const sourceRefs: SourceReference[] = [...occ.sourceRefs];
  sourceRefs.push(
    therapySource(
      '',
      'therapies-overdue',
      'Somministrazioni in ritardo',
      `${therapies.overdueCount} somministrazioni ancora da erogare oltre l'orario previsto`,
      generatedAt,
    ),
  );
  sourceRefs.push(...therapiesOverdue.map(therapyItemSource));
  sourceRefs.push(
    consegnaSource(
      '',
      'consegne-overdue',
      'Consegne scadute',
      `${consegneOverdue.count} consegne aperte oltre il termine`,
      generatedAt,
    ),
  );
  sourceRefs.push(...consegneSample.map(consegnaItemSource));
  sourceRefs.push(
    appointmentSource(
      '',
      'agenda-today',
      'Agenda di oggi',
      `${appointmentsTodayTotal} appuntamenti programmati oggi`,
    ),
  );
  return {
    data,
    sourceRefs,
    truncated: therapies.truncated || consegneOverdue.count > consegneOverdue.items.length,
  };
}

/** Coda di lavoro «cosa devo fare adesso»: dosi dovute più consegne create/assegnate all'attore.
 *  L'identità usa solo gli ID verificati; allow-list paziente, ACL, conteggi e sample vengono
 *  applicati in SQL prima dei LIMIT. I vecchi nomi restano solo campi di presentazione. */
async function operatorQueue(
  ctx: UserContext,
  env: NodeJS.ProcessEnv,
  operatorName?: string,
  now: Date = new Date(),
): Promise<{ data: unknown[]; sourceRefs: SourceReference[]; truncated: boolean }> {
  if (!canFacilityRead(env))
    throw new GatewayError('forbidden', 'Funzioni di struttura non abilitate');

  const therapies = await therapiesDue(ctx, now, QUEUE_WINDOW_MINUTES);
  const queue = await openConsegnaQueue(ctx);
  const generatedAt = now.toISOString();

  const therapiesOverdue = therapies.overdue;
  const therapiesDueSoon = therapies.dueSoon;
  const myLikelyConsegne = queue.mineItems;
  const otherOpenConsegne = queue.otherItems;

  const data = [
    {
      generatedAt,
      windowMinutes: QUEUE_WINDOW_MINUTES,
      operatorName: operatorName ?? null,
      scope: privilegedContext(ctx) ? 'reparto' : 'operatore',
      therapiesOverdueCount: therapies.overdueCount,
      therapiesOverdueSampleCount: therapiesOverdue.length,
      therapiesOverdue,
      therapiesDueSoonCount: therapies.dueSoonCount,
      therapiesDueSoonSampleCount: therapiesDueSoon.length,
      therapiesDueSoon,
      myLikelyConsegneCount: queue.mineCount,
      myLikelyConsegneSampleCount: myLikelyConsegne.length,
      myLikelyConsegne,
      otherOpenConsegneCount: queue.otherCount,
      otherOpenConsegneSampleCount: otherOpenConsegne.length,
      otherOpenConsegne,
    },
  ];

  const sourceRefs: SourceReference[] = [
    therapySource(
      '',
      'therapies-queue',
      'Somministrazioni da erogare',
      `${therapies.overdueCount} in ritardo, ${therapies.dueSoonCount} entro ${QUEUE_WINDOW_MINUTES} minuti`,
      generatedAt,
    ),
    ...therapiesOverdue.map(therapyItemSource),
    ...therapiesDueSoon.map(therapyItemSource),
    consegnaSource(
      '',
      'consegne-open',
      'Consegne aperte',
      `${queue.mineCount + queue.otherCount} consegne aperte`,
      generatedAt,
    ),
    ...myLikelyConsegne.map(consegnaItemSource),
    ...otherOpenConsegne.map(consegnaItemSource),
  ];
  return {
    data,
    sourceRefs,
    truncated:
      therapies.truncated ||
      queue.mineCount > queue.mineItems.length ||
      queue.otherCount > queue.otherItems.length,
  };
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
  // Sub-agent scoping: l'intent decide l'agente. Se la domanda appartiene all'altro dominio la
  // richiesta viene instradata al suo proprietario ed eseguita — chi chiede (es. l'operatore che
  // chiede allergie con l'agente struttura attivo) ha già diritto al dato per ruolo. La selezione
  // dell'agente non è un controllo di accesso: role clamp, tenant isolation, cross-patient gate e
  // refuse_clinical restano invariati e sono gli unici a poter negare una risposta.
  const answeringAgent = planCtx.agent ? resolveAgent(planCtx.agent, plan.intent) : undefined;
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
    agent: answeringAgent,
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
  // cross-patient access is role + env gated; a denied request is reported, not executed
  if (plan.requiresCrossPatientAccess && !canCrossPatientSearch(ctx, env)) {
    return empty({
      notFound: false,
      refusal: 'Ricerca tra più pazienti non autorizzata per il tuo ruolo.',
    });
  }

  const results: unknown[] = [];
  const sources: SourceReference[] = [];
  let sourceTruncated = false;
  let calls = 0;
  for (const call of plan.tools) {
    if (calls >= lim.maxToolCalls || results.length >= lim.maxResults) {
      sourceTruncated = true;
      break;
    }
    calls++;
    try {
      const r = await dispatch(call.tool, call.args, ctx, env, effectiveCtx.operatorName);
      sourceTruncated ||= r.truncated === true;
      const remaining = Math.max(0, lim.maxResults - results.length);
      if (r.data.length > remaining) sourceTruncated = true;
      for (const item of r.data.slice(0, remaining)) {
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
    truncated: sourceTruncated,
    mode,
    answerText,
    composed,
    agent: answeringAgent,
  };
}

async function dispatch(
  tool: string,
  args: Record<string, unknown>,
  ctx: UserContext,
  env: NodeJS.ProcessEnv = process.env,
  operatorName?: string,
): Promise<{ data: unknown[]; sourceRefs: SourceReference[]; truncated?: boolean }> {
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
        return await crossVitals(Number(args.systolicMin), ctx, env);
      const data = await svc.searchAcrossPatients(args as never, ctx);
      return { data, sourceRefs: data.flatMap((m) => m.sourceRefs) };
    }
    case 'correlate_structured_data': {
      const r = await svc.correlate(args as never, ctx);
      return { data: r.data, sourceRefs: r.sourceRefs };
    }
    case 'query_appointments_today':
      return await appointmentsToday(ctx, env);
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
): Promise<{ data: unknown[]; sourceRefs: SourceReference[]; truncated?: boolean }> {
  const validated = validateQueryPlan(rawPlan);
  if (!validated) return { data: [], sourceRefs: [] };
  try {
    const out = await runQueryPlan(validated, ctx, env, currentPatientId);
    return { data: out.rows, sourceRefs: out.sources, truncated: out.truncated };
  } catch (e) {
    if (e instanceof GatewayError && e.kind === 'bad_request') return { data: [], sourceRefs: [] };
    throw e;
  }
}

/** Cross-patient "systolic > N" — gated already by the planner's requiresCrossPatientAccess. */
async function crossVitals(
  systolicMin: number,
  ctx: UserContext,
  env: NodeJS.ProcessEnv,
): Promise<{ data: unknown[]; sourceRefs: SourceReference[]; truncated?: boolean }> {
  const lim = limits(env);
  return svc.getCrossPatientVitalSigns(
    {
      label: 'PA',
      systolicMin,
      patientLimit: lim.maxPatients,
      resultLimit: lim.maxResults,
      vitalLimitPerPatient: lim.maxResults,
    },
    ctx,
    env,
  );
}
