// SPEC-015 (Agnos unificato): orchestratore channel-agnostic per comandi testo e voce.
//
// RIUSA i moduli voce esistenti (planner deterministico, preview, executor, idempotenza, audit):
// nessuna logica duplicata. Un comando digitato segue ESATTAMENTE lo stesso percorso di sicurezza
// di uno vocale: plan → preview → conferma → execute (SC-008: zero differenze tra canali).
//
// Guardie di execute, nell'ordine: feature flag → allowlist catalogo (deny-by-default, kind
// 'not_in_catalog') → rifiuto delete ('delete_forbidden') → guardie esistenti di execute.ts
// (ambiguità, conferma, idempotenza) → dispatch al writer condiviso → audit (con canale).
//
// Le dipendenze DB (prisma, writer reale, assistantQuery) sono caricate LAZY e iniettabili:
// questo modulo resta importabile e testabile senza database (lib/prisma.js richiede DATABASE_URL).

import { planAction, DELETE_REFUSAL_MESSAGE, type VoicePlanContext } from '../voice/plan.js';
import { buildPreview, type PreviewContext } from '../voice/preview.js';
import { executeAction, VoiceError, type VoiceWriter } from '../voice/execute.js';
import { IdempotencyStore, voiceIdempotency } from '../voice/idempotency.js';
import { loadVoiceConfig, type VoiceConfig } from '../voice/config.js';
import { voiceAudit } from '../voice/audit.js';
import {
  isWriteAction,
  type ActionPlan,
  type ActionPreview,
  type ExecuteResult,
} from '../voice/types.js';
import { isActionAllowed } from './catalog.js';
import {
  matchAppointmentCommand,
  groundAppointmentPlan,
  isAppointmentAction,
  type AppointmentLookupDeps,
} from './appointments.js';
import {
  matchConsegnaCommand,
  groundConsegnaPlan,
  isConsegnaAction,
  type ConsegnaLookupDeps,
} from './consegne.js';
import {
  matchParameterCommand,
  groundParameterPlan,
  isParameterAction,
  type ParameterLookupDeps,
} from './parameters.js';
import { matchPrescriptionRequest, prescriptionHandoff } from './prescriptions.js';
import { patientQueryOf } from './parameters.js';
import { defaultGetPatient, defaultSearchPatients } from './appointments.js';
import { facilityDate } from '../../lib/facility-time.js';
import type { UserContext } from '../gateway/types.js';
import { assertPatientAllowed } from '../gateway/context.js';
import type { AssistantAnswer } from '../assistant/service.js';
import type { AgentId } from '../assistant/agents.js';

export type AgnosChannel = 'testo' | 'voce';

const AUDIT_CHANNEL: Record<AgnosChannel, 'TESTO' | 'VOCE'> = { testo: 'TESTO', voce: 'VOCE' };

/** SPEC-015 (data-model): audit actionType for refusals — delete ⇒ refused_delete,
 *  clinical ⇒ refused_clinical, any other refusal ⇒ refused_forbidden. */
function auditedActionType(plan: ActionPlan): string {
  if (plan.actionType === 'refuse_clinical') return 'refused_clinical';
  if (plan.actionType === 'refuse_forbidden')
    return plan.refusalKind === 'delete' ? 'refused_delete' : 'refused_forbidden';
  return plan.actionType;
}

/** Operator identity + gateway context (already role-clamped by the route) for read delegation. */
export interface AgnosOperatorContext {
  operatorId: string;
  operatorName: string;
  gatewayCtx: UserContext;
  /**
   * Phase 2 capability policy: may this caller perform the action (agnos.action.<type>, governed by
   * the same functional capability as the GUI, e.g. create_consegna → consegne.create)?
   */
  allowsAction?: (actionType: string) => boolean;
  /**
   * May this caller prepare a prescription (same capability as the «Prepara prescrizione» skill)?
   * Undefined = policy enforcement off: the prescription flow itself still decides.
   */
  canPrescribe?: boolean;
}

export type AgnosPlan = ActionPlan & { channel: AgnosChannel };

/** SPEC-015 US4: single plan derivation for BOTH plan and execute. The voice planner runs FIRST so
 *  every refusal (delete/clinical/forbidden — FR-008) keeps absolute priority; only when the plan
 *  is not a refusal does the appointment matcher get a chance to claim the command (it requires an
 *  explicit appointment verb, so reads and the 4 legacy write actions are never hijacked). */
function derivePlan(text: string, ctx: VoicePlanContext, genId?: () => string): ActionPlan {
  const voicePlan = genId ? planAction(text, ctx, genId) : planAction(text, ctx);
  if (voicePlan.actionType === 'refuse_forbidden' || voicePlan.actionType === 'refuse_clinical')
    return voicePlan;
  const appointmentPlan = matchAppointmentCommand(
    text,
    { currentPatientId: ctx.currentPatientId },
    { genId },
  );
  // Issue #130: consegna matcher, same contract (explicit "consegna" verb form required, so reads
  // and the other write actions are never hijacked).
  const consegnaPlan = matchConsegnaCommand(
    text,
    { currentPatientId: ctx.currentPatientId },
    { genId },
  );
  // Milo: più parametri in un comando (o evacuazione/coscienza/ossigeno) → una rilevazione della
  // pagina Parametri. Un solo parametro numerico resta al comando storico del planner vocale.
  const parameterPlan = matchParameterCommand(
    text,
    { currentPatientId: ctx.currentPatientId },
    { genId },
  );
  return appointmentPlan ?? consegnaPlan ?? parameterPlan ?? voicePlan;
}

// ── planCommand ─────────────────────────────────────────────────────────────

export interface PlanCommandInput {
  text: string;
  channel: AgnosChannel;
  currentPatientId?: string;
  operatorCtx: AgnosOperatorContext;
  /** Sub-agent di partenza; una domanda dell'altro dominio viene instradata, non rifiutata. */
  agent?: AgentId;
  /** Milo fase 2: ultimi scambi della conversazione, contesto per il team (mai istruzioni). */
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
}

export interface PlanCommandResult {
  plan: AgnosPlan;
  preview: ActionPreview | null;
  read: AssistantAnswer | null;
}

/** Injectable data access — defaults hit the real DB/assistant, tests pass stubs. */
export interface PlanCommandDeps {
  runRead?: (
    query: string,
    ctx: UserContext,
    currentPatientId?: string,
    agent?: AgentId,
    operatorName?: string,
    history?: PlanCommandInput['history'],
  ) => Promise<AssistantAnswer>;
  loadPreviewContext?: (plan: ActionPlan) => Promise<PreviewContext>;
  /** SPEC-015 US4: patient/slot lookups for appointment grounding (tests inject stubs, no DB). */
  appointmentLookup?: AppointmentLookupDeps;
  /** Issue #130: patient lookups for consegna grounding (tests inject stubs, no DB). */
  consegnaLookup?: ConsegnaLookupDeps;
  /** Milo: patient lookups for the parameter reading (tests inject stubs, no DB). */
  parameterLookup?: ParameterLookupDeps;
  /** Milo: clock and configuration of the prescription hand-off (tests). */
  now?: () => Date;
  env?: NodeJS.ProcessEnv;
}

/** Risposta di Milo a una richiesta di prescrizione: testo preparato + pulsante verso il flusso. */
async function prescriptionRead(
  text: string,
  request: NonNullable<ReturnType<typeof matchPrescriptionRequest>>,
  input: PlanCommandInput,
  deps: PlanCommandDeps,
): Promise<AssistantAnswer> {
  const permitted = input.operatorCtx.gatewayCtx.permittedPatientIds;
  const search =
    deps.parameterLookup?.searchPatients ?? ((q: string) => defaultSearchPatients(q, permitted));
  const get =
    deps.parameterLookup?.getPatient ?? ((id: string) => defaultGetPatient(id, permitted));
  const named = patientQueryOf(text);
  let patient: { id: string; firstName: string; lastName: string } | null = null;
  if (named) {
    const hits = await search(named);
    patient = hits.length === 1 ? hits[0] : null;
  } else if (input.currentPatientId) patient = await get(input.currentPatientId);
  if (patient) assertPatientAllowed(input.operatorCtx.gatewayCtx, patient.id);
  const handoff = prescriptionHandoff(
    request,
    patient ? `${patient.lastName} ${patient.firstName}`.trim() : null,
  );
  return {
    intent: 'prescription_handoff',
    scope: 'current_patient',
    plan: {
      intent: 'prescription_handoff',
      scope: 'current_patient',
      tools: [],
      requiresCrossPatientAccess: false,
    },
    results: [],
    sources: [],
    navigation: [],
    notFound: false,
    truncated: false,
    mode: 'deterministic',
    answerText: handoff.text,
    blocks: [
      {
        type: 'table',
        title: 'Prescrizione da preparare',
        columns: [
          { key: 'campo', label: 'Campo' },
          { key: 'valore', label: 'Valore' },
        ],
        rows: handoff.rows.map(([campo, valore]) => ({ campo, valore })),
      },
      ...(handoff.message
        ? [
            {
              type: 'handoff' as const,
              title: 'La conferma resta al medico',
              label: 'Prepara la prescrizione',
              target: 'prescription' as const,
              message: handoff.message,
            },
          ]
        : []),
    ],
  };
}

async function defaultRunRead(
  query: string,
  ctx: UserContext,
  currentPatientId?: string,
  agent?: AgentId,
  operatorName?: string,
  history?: PlanCommandInput['history'],
): Promise<AssistantAnswer> {
  const { assistantQuery } = await import('../assistant/service.js');
  return assistantQuery(query, ctx, { currentPatientId, agent, operatorName, history });
}

// Same grounded-preview lookups the voice route performed inline before SPEC-015.
async function defaultLoadPreviewContext(plan: ActionPlan): Promise<PreviewContext> {
  const pctx: PreviewContext = {};
  if (!plan.patientId) return pctx;
  const { prisma } = await import('../../lib/prisma.js');
  const p = await prisma.patient.findUnique({ where: { id: plan.patientId } });
  if (p) pctx.patientName = `${p.lastName ?? ''} ${p.firstName ?? ''}`.trim();
  if (plan.actionType === 'update_narrative_section' && plan.sectionKey) {
    const { getNarrativeSection, pickDisplayText } =
      await import('../sections/patient-narrative.js');
    const sec = await getNarrativeSection(plan.patientId, plan.sectionKey);
    if (sec) pctx.currentNarrativeText = pickDisplayText(sec.originalText, sec.reviewedText);
  }
  if (plan.actionType === 'update_patient_demographics' && p) {
    pctx.currentDemographicValue =
      String((p as Record<string, unknown>)[String(plan.fields.field)] ?? '') || '—';
  }
  return pctx;
}

/** Interpret a command (typed or transcribed) WITHOUT executing anything. Reads are delegated
 *  to the read-only assistant; writes get a grounded preview; refusals get a refusal preview. */
export async function planCommand(
  input: PlanCommandInput,
  deps: PlanCommandDeps = {},
): Promise<PlanCommandResult> {
  const text = String(input.text ?? '').slice(0, 500);
  const planCtx: VoicePlanContext = { currentPatientId: input.currentPatientId };
  const plan: AgnosPlan = { ...derivePlan(text, planCtx), channel: input.channel };

  // Phase 2 capability policy: an action (or the read delegation) the caller's role may not perform
  // is refused already at plan time, so the assistant never proposes it.
  const allows = input.operatorCtx.allowsAction;
  const governed =
    plan.actionType === 'read' || plan.actionType === 'unknown'
      ? 'read'
      : isWriteAction(plan.actionType)
        ? plan.actionType
        : null;
  if (allows && governed && !allows(governed)) {
    throw new VoiceError('capability_denied', 'Azione non consentita al tuo ruolo.');
  }

  // Milo: richiesta di una NUOVA prescrizione («aggiungi un diuretico ogni 8 ore per 5 giorni»).
  // Milo non prescrive: prepara il testo e passa al flusso del medico. Cancellazioni e richieste
  // di giudizio clinico restano rifiuti; chi non può prescrivere riceve il rifiuto del ruolo.
  const prescription =
    plan.actionType === 'refuse_clinical' || plan.refusalKind === 'delete'
      ? null
      : matchPrescriptionRequest(text, facilityDate(deps.now?.() ?? new Date()), deps.env);
  if (prescription) {
    if (input.operatorCtx.canPrescribe === false) {
      plan.actionType = 'refuse_forbidden';
      plan.refusalReason =
        'La prescrizione è riservata al medico: può prepararla con Milo o dalla scheda Terapia.';
    } else {
      const read = await prescriptionRead(text, prescription, input, deps);
      return { plan: { ...plan, actionType: 'read', readQuery: text }, preview: null, read };
    }
  }

  // Preview/read grounding must never become a side-channel for a patient outside the
  // server-derived operator scope. Appointment/consegna grounding receives the same scope below.
  if (plan.patientId) assertPatientAllowed(input.operatorCtx.gatewayCtx, plan.patientId);

  // #239 chatbot: a read query OR any text that is NOT a recognised write/refusal/appointment command
  // is delegated to the read-only assistant (Azure-backed planner + SOURCE_ONLY answer). This prevents
  // a natural question the deterministic verb-matcher didn't catch from dead-ending as
  // "Comando non riconosciuto"; the assistant itself returns not-found / clinical-refusal as needed.
  if (plan.actionType === 'read' || plan.actionType === 'unknown') {
    const runRead = deps.runRead ?? defaultRunRead;
    const read = await runRead(
      plan.readQuery ?? text,
      input.operatorCtx.gatewayCtx,
      input.currentPatientId,
      input.agent,
      input.operatorCtx.operatorName,
      input.history,
    );
    return { plan, preview: null, read };
  }

  // SPEC-015 (US2): a refusal at PLAN time (delete/clinical/forbidden) is an auditable event —
  // logged AND persisted (kind 'refusal'), before the refusal preview is returned to the client.
  if (plan.actionType === 'refuse_forbidden' || plan.actionType === 'refuse_clinical') {
    voiceAudit(
      {
        requestId: input.operatorCtx.gatewayCtx.requestId,
        userId: input.operatorCtx.operatorId,
        operatorRole: input.operatorCtx.gatewayCtx.roles[0] ?? 'operatore',
        channel: AUDIT_CHANNEL[input.channel],
      },
      auditedActionType(plan),
      plan.patientId,
      null,
      [],
      'denied',
      new Date().toISOString(),
    );
  }

  // SPEC-015 US4: appointment plans are grounded (patient by name, target slot, CONFLICT check —
  // a busy slot is a BLOCKING ambiguity in the preview) and build their own preview.
  if (isAppointmentAction(plan.actionType)) {
    const { preview } = await groundAppointmentPlan(
      plan,
      input.operatorCtx.operatorId,
      deps.appointmentLookup,
      input.operatorCtx.gatewayCtx.permittedPatientIds,
    );
    return { plan, preview, read: null };
  }

  // Issue #130: consegna plans are grounded (patient by name or context) and build their own preview.
  if (isConsegnaAction(plan.actionType)) {
    const { preview } = await groundConsegnaPlan(
      plan,
      deps.consegnaLookup,
      input.operatorCtx.gatewayCtx.permittedPatientIds,
    );
    return { plan, preview, read: null };
  }

  // Milo: rilevazione con più parametri — paziente per nome o contesto, orario esplicito.
  if (isParameterAction(plan.actionType)) {
    const { preview } = await groundParameterPlan(
      plan,
      deps.parameterLookup,
      input.operatorCtx.gatewayCtx.permittedPatientIds,
    );
    return { plan, preview, read: null };
  }

  const loadCtx = deps.loadPreviewContext ?? defaultLoadPreviewContext;
  const pctx = await loadCtx(plan);
  return { plan, preview: buildPreview(plan, pctx), read: null };
}

// ── executeCommand ──────────────────────────────────────────────────────────

export interface ExecuteCommandInput {
  text: string;
  channel: AgnosChannel;
  patientId?: string;
  idempotencyKey: string;
  confirmed: boolean;
  operatorCtx: AgnosOperatorContext;
}

/** Injectable runtime pieces — defaults are the live config/writer/store, tests pass fakes. */
export interface ExecuteCommandDeps {
  cfg?: VoiceConfig;
  writer?: VoiceWriter;
  store?: IdempotencyStore;
  env?: NodeJS.ProcessEnv;
  nowISO?: string;
  /** SPEC-015 US4: patient/slot lookups for appointment grounding (tests inject stubs, no DB). */
  appointmentLookup?: AppointmentLookupDeps;
  /** Issue #130: patient lookups for consegna grounding (tests inject stubs, no DB). */
  consegnaLookup?: ConsegnaLookupDeps;
  /** Milo: patient lookups for the parameter reading (tests inject stubs, no DB). */
  parameterLookup?: ParameterLookupDeps;
}

/** Execute a CONFIRMED write command. The plan is ALWAYS re-derived server-side from the text
 *  (tamper-proof); the client's idempotency key is reused so replays never duplicate a write. */
export async function executeCommand(
  input: ExecuteCommandInput,
  deps: ExecuteCommandDeps = {},
): Promise<ExecuteResult> {
  const env = deps.env ?? process.env;
  const cfg = deps.cfg ?? loadVoiceConfig(env);
  const nowISO = deps.nowISO ?? new Date().toISOString();
  const text = String(input.text ?? '').slice(0, 500);
  const plan: AgnosPlan = {
    ...derivePlan(text, { currentPatientId: input.patientId }, () => input.idempotencyKey),
    channel: input.channel,
  };
  const ctx = {
    requestId: `${input.channel === 'voce' ? 'voice' : 'agnos'}-${input.operatorCtx.operatorId}`,
    userId: input.operatorCtx.operatorId,
    operatorName: input.operatorCtx.operatorName,
    operatorRole: input.operatorCtx.gatewayCtx.roles[0] ?? 'operatore',
    channel: AUDIT_CHANNEL[input.channel],
  };

  // Check before idempotent replay and before any writer is loaded: a previously valid key must
  // not become a capability after the operator loses access to the patient.
  if (plan.patientId) assertPatientAllowed(input.operatorCtx.gatewayCtx, plan.patientId);
  const deny = (kind: VoiceError['kind'], message: string): never => {
    voiceAudit(
      ctx,
      auditedActionType(plan),
      plan.patientId,
      null,
      Object.keys(plan.fields),
      'denied',
      nowISO,
    );
    throw new VoiceError(kind, message);
  };

  // 1) feature flag (existing config; AI_VOICE_ENABLED is the Agnos master switch)
  if (!cfg.voiceEnabled) {
    deny(
      'feature_disabled',
      input.channel === 'voce' ? 'Funzione vocale disabilitata.' : 'Assistente AI disabilitato.',
    );
  }
  // 2) allowlist deny-by-default: a write action must exist in the catalog AND be enabled
  if (isWriteAction(plan.actionType) && !isActionAllowed(plan.actionType, env)) {
    deny(
      'not_in_catalog',
      'Azione non presente nel catalogo delle azioni consentite o disabilitata.',
    );
  }
  // 2b) capability policy of the caller's role (same decision as the GUI route of the action)
  if (
    isWriteAction(plan.actionType) &&
    input.operatorCtx.allowsAction &&
    !input.operatorCtx.allowsAction(plan.actionType)
  ) {
    deny('capability_denied', 'Azione non consentita al tuo ruolo.');
  }
  // 3) refusals: deletion attempts are rejected with a dedicated kind, everything else as not executable
  if (plan.actionType === 'refuse_forbidden' || plan.actionType === 'refuse_clinical') {
    if (plan.refusalKind === 'delete')
      deny('delete_forbidden', plan.refusalReason ?? DELETE_REFUSAL_MESSAGE);
    deny('not_executable', plan.refusalReason ?? 'Azione non consentita.');
  }

  const writer = deps.writer ?? (await import('../voice/write-services.js')).prismaVoiceWriter;
  const store = deps.store ?? voiceIdempotency;

  // 3b) SPEC-015 US4: re-ground appointment plans server-side (tamper-proof, same lookups as the
  // preview): patient by name, target appointment, slot conflict. Grounding happens even on replay
  // so a stale idempotency key cannot bypass a revoked patient scope. A conflict caused by the
  // already-applied write is harmless because a scoped replay returns before executeAction.
  if (
    (isAppointmentAction(plan.actionType) ||
      isConsegnaAction(plan.actionType) ||
      isParameterAction(plan.actionType)) &&
    input.confirmed === true
  ) {
    if (isParameterAction(plan.actionType))
      await groundParameterPlan(
        plan,
        deps.parameterLookup,
        input.operatorCtx.gatewayCtx.permittedPatientIds,
        new Date(nowISO),
      );
    else if (isAppointmentAction(plan.actionType))
      await groundAppointmentPlan(
        plan,
        input.operatorCtx.operatorId,
        deps.appointmentLookup,
        input.operatorCtx.gatewayCtx.permittedPatientIds,
      );
    else
      await groundConsegnaPlan(
        plan,
        deps.consegnaLookup,
        input.operatorCtx.gatewayCtx.permittedPatientIds,
      ); // issue #130: same tamper-proof re-grounding with patient scope
    if (plan.patientId) {
      assertPatientAllowed(input.operatorCtx.gatewayCtx, plan.patientId);
      // Consegne e parametri hanno la ricevuta durevole nel servizio: il doppione si ferma lì.
      const prior =
        isConsegnaAction(plan.actionType) || isParameterAction(plan.actionType)
          ? null
          : store.get(plan.idempotencyKey, Date.parse(nowISO) || Date.now());
      if (prior) {
        voiceAudit(
          ctx,
          plan.actionType,
          plan.patientId,
          prior.recordId ?? null,
          Object.keys(plan.fields),
          'deduped',
          nowISO,
        );
        return prior;
      }
    }
  }

  // 4) existing execute.ts guards (ambiguity, confirmation, idempotency) + dispatch + audit
  return executeAction(plan, {
    confirmed: input.confirmed === true,
    ctx,
    cfg,
    writer,
    store,
    nowISO: deps.nowISO,
  });
}
