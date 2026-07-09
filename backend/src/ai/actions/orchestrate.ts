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
import { isWriteAction, type ActionPlan, type ActionPreview, type ExecuteResult } from '../voice/types.js';
import { isActionAllowed } from './catalog.js';
import {
  matchAppointmentCommand, groundAppointmentPlan, isAppointmentAction, type AppointmentLookupDeps,
} from './appointments.js';
import type { UserContext } from '../gateway/types.js';
import type { AssistantAnswer } from '../assistant/service.js';

export type AgnosChannel = 'testo' | 'voce';

const AUDIT_CHANNEL: Record<AgnosChannel, 'TESTO' | 'VOCE'> = { testo: 'TESTO', voce: 'VOCE' };

/** SPEC-015 (data-model): audit actionType for refusals — delete ⇒ refused_delete,
 *  clinical ⇒ refused_clinical, any other refusal ⇒ refused_forbidden. */
function auditedActionType(plan: ActionPlan): string {
  if (plan.actionType === 'refuse_clinical') return 'refused_clinical';
  if (plan.actionType === 'refuse_forbidden') return plan.refusalKind === 'delete' ? 'refused_delete' : 'refused_forbidden';
  return plan.actionType;
}

/** Operator identity + gateway context (already role-clamped by the route) for read delegation. */
export interface AgnosOperatorContext {
  operatorId: string;
  operatorName: string;
  gatewayCtx: UserContext;
}

export type AgnosPlan = ActionPlan & { channel: AgnosChannel };

/** SPEC-015 US4: single plan derivation for BOTH plan and execute. The voice planner runs FIRST so
 *  every refusal (delete/clinical/forbidden — FR-008) keeps absolute priority; only when the plan
 *  is not a refusal does the appointment matcher get a chance to claim the command (it requires an
 *  explicit appointment verb, so reads and the 4 legacy write actions are never hijacked). */
function derivePlan(text: string, ctx: VoicePlanContext, genId?: () => string): ActionPlan {
  const voicePlan = genId ? planAction(text, ctx, genId) : planAction(text, ctx);
  if (voicePlan.actionType === 'refuse_forbidden' || voicePlan.actionType === 'refuse_clinical') return voicePlan;
  const appointmentPlan = matchAppointmentCommand(text, { currentPatientId: ctx.currentPatientId }, { genId });
  return appointmentPlan ?? voicePlan;
}

// ── planCommand ─────────────────────────────────────────────────────────────

export interface PlanCommandInput {
  text: string;
  channel: AgnosChannel;
  currentPatientId?: string;
  operatorCtx: AgnosOperatorContext;
}

export interface PlanCommandResult {
  plan: AgnosPlan;
  preview: ActionPreview | null;
  read: AssistantAnswer | null;
}

/** Injectable data access — defaults hit the real DB/assistant, tests pass stubs. */
export interface PlanCommandDeps {
  runRead?: (query: string, ctx: UserContext, currentPatientId?: string) => Promise<AssistantAnswer>;
  loadPreviewContext?: (plan: ActionPlan) => Promise<PreviewContext>;
  /** SPEC-015 US4: patient/slot lookups for appointment grounding (tests inject stubs, no DB). */
  appointmentLookup?: AppointmentLookupDeps;
}

async function defaultRunRead(query: string, ctx: UserContext, currentPatientId?: string): Promise<AssistantAnswer> {
  const { assistantQuery } = await import('../assistant/service.js');
  return assistantQuery(query, ctx, { currentPatientId });
}

// Same grounded-preview lookups the voice route performed inline before SPEC-015.
async function defaultLoadPreviewContext(plan: ActionPlan): Promise<PreviewContext> {
  const pctx: PreviewContext = {};
  if (!plan.patientId) return pctx;
  const { prisma } = await import('../../lib/prisma.js');
  const p = await prisma.patient.findUnique({ where: { id: plan.patientId } });
  if (p) pctx.patientName = `${p.lastName ?? ''} ${p.firstName ?? ''}`.trim();
  if (plan.actionType === 'update_narrative_section' && plan.sectionKey) {
    const { getNarrativeSection, pickDisplayText } = await import('../sections/patient-narrative.js');
    const sec = await getNarrativeSection(plan.patientId, plan.sectionKey);
    if (sec) pctx.currentNarrativeText = pickDisplayText(sec.originalText, sec.reviewedText);
  }
  if (plan.actionType === 'update_patient_demographics' && p) {
    pctx.currentDemographicValue = String((p as Record<string, unknown>)[String(plan.fields.field)] ?? '') || '—';
  }
  return pctx;
}

/** Interpret a command (typed or transcribed) WITHOUT executing anything. Reads are delegated
 *  to the read-only assistant; writes get a grounded preview; refusals get a refusal preview. */
export async function planCommand(input: PlanCommandInput, deps: PlanCommandDeps = {}): Promise<PlanCommandResult> {
  const text = String(input.text ?? '').slice(0, 500);
  const planCtx: VoicePlanContext = { currentPatientId: input.currentPatientId };
  const plan: AgnosPlan = { ...derivePlan(text, planCtx), channel: input.channel };

  if (plan.actionType === 'read') {
    const runRead = deps.runRead ?? defaultRunRead;
    const read = await runRead(plan.readQuery ?? text, input.operatorCtx.gatewayCtx, input.currentPatientId);
    return { plan, preview: null, read };
  }

  if (plan.actionType === 'unknown') {
    const runRead = deps.runRead ?? defaultRunRead;
    const read = await runRead(text, input.operatorCtx.gatewayCtx, input.currentPatientId);
    return {
      plan: { ...plan, actionType: 'read', readQuery: text, ambiguities: [], requiresConfirmation: false },
      preview: null,
      read,
    };
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
      auditedActionType(plan), plan.patientId, null, [], 'denied', new Date().toISOString(),
    );
  }

  // SPEC-015 US4: appointment plans are grounded (patient by name, target slot, CONFLICT check —
  // a busy slot is a BLOCKING ambiguity in the preview) and build their own preview.
  if (isAppointmentAction(plan.actionType)) {
    const { preview } = await groundAppointmentPlan(plan, input.operatorCtx.operatorId, deps.appointmentLookup);
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
}

/** Execute a CONFIRMED write command. The plan is ALWAYS re-derived server-side from the text
 *  (tamper-proof); the client's idempotency key is reused so replays never duplicate a write. */
export async function executeCommand(input: ExecuteCommandInput, deps: ExecuteCommandDeps = {}): Promise<ExecuteResult> {
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
  const deny = (kind: VoiceError['kind'], message: string): never => {
    voiceAudit(ctx, auditedActionType(plan), plan.patientId, null, Object.keys(plan.fields), 'denied', nowISO);
    throw new VoiceError(kind, message);
  };

  // 1) feature flag (existing config; AI_VOICE_ENABLED is the Agnos master switch)
  if (!cfg.voiceEnabled) {
    deny('feature_disabled', input.channel === 'voce' ? 'Funzione vocale disabilitata.' : 'Assistente AI disabilitato.');
  }
  // 2) allowlist deny-by-default: a write action must exist in the catalog AND be enabled
  if (isWriteAction(plan.actionType) && !isActionAllowed(plan.actionType, env)) {
    deny('not_in_catalog', 'Azione non presente nel catalogo delle azioni consentite o disabilitata.');
  }
  // 3) refusals: deletion attempts are rejected with a dedicated kind, everything else as not executable
  if (plan.actionType === 'refuse_forbidden' || plan.actionType === 'refuse_clinical') {
    if (plan.refusalKind === 'delete') deny('delete_forbidden', plan.refusalReason ?? DELETE_REFUSAL_MESSAGE);
    deny('not_executable', plan.refusalReason ?? 'Azione non consentita.');
  }

  const writer = deps.writer ?? (await import('../voice/write-services.js')).prismaVoiceWriter;
  const store = deps.store ?? voiceIdempotency;

  // 3b) SPEC-015 US4: re-ground appointment plans server-side (tamper-proof, same lookups as the
  // preview): patient by name, target appointment, slot conflict. Any unresolved item lands in
  // plan.ambiguities and is rejected by the existing 'ambiguous' guard in executeAction.
  // Idempotent replay short-circuits BEFORE grounding: the write already applied, so its own slot
  // would read as a conflict — return the original result (deduped), same audit as executeAction.
  if (isAppointmentAction(plan.actionType) && input.confirmed === true) {
    const prior = store.get(plan.idempotencyKey, Date.parse(nowISO) || Date.now());
    if (prior) {
      voiceAudit(ctx, plan.actionType, plan.patientId, prior.recordId ?? null, Object.keys(plan.fields), 'deduped', nowISO);
      return prior;
    }
    await groundAppointmentPlan(plan, input.operatorCtx.operatorId, deps.appointmentLookup);
  }

  // 4) existing execute.ts guards (ambiguity, confirmation, idempotency) + dispatch + audit
  return executeAction(plan, { confirmed: input.confirmed === true, ctx, cfg, writer, store, nowISO: deps.nowISO });
}
