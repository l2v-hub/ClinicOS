// Skill workflow engine (Phase 3, extended in Phase 4). One turn = one call:
//
//   message/action → policy re-evaluation → (Agno | deterministic) interpretation → skill →
//   resident access scope + context resolution → NEEDS_CLARIFICATION | NEEDS_CONFIRMATION
//   (preview) | EXECUTING → Tool Layer (re-authorized per call) → COMPLETED | DENIED | FAILED |
//   CANCELLED → audit (origin AI_ASSISTANT).
//
// Invariants:
//   - the policy is evaluated on EVERY turn and again by the Tool Layer on every tool call: a
//     workflow started while authorized is never a standing authorization;
//   - every resident is checked by the Resident Access Scope on selection AND before execution;
//   - no write without a resolved, unambiguous target and an explicit UI confirmation bound to
//     the current preview id (a changed payload issues a new id; an old confirmation is refused);
//   - a different page resident invalidates an open workflow (never an invisible resident);
//   - the reply never claims success unless the tool returned ok;
//   - a write is attempted at most once per workflow (EXECUTING/COMPLETED block replays) and
//     idempotent tools reuse the same requestId on an explicit retry.

import { randomUUID } from 'node:crypto';
import {
  canAccessResident,
  describeResident,
  type ResidentOperation,
} from '../access-scope/resident-access-scope.js';
import { recordAuditEvent, type AiAuditKind, type AiAuditOutcome } from '../ai/audit-store.js';
import {
  facilityToday,
  parseParameterReading,
  ParameterReadingError,
} from '../patients/parameter-reading-input.js';
import type { ToolRegistry } from '../tools/registry.js';
import type { ToolContext } from '../tools/types.js';
import { availabilityOf, evaluateTools, type SkillAvailability } from './availability.js';
import { profileFor } from '../copilot/profiles.js';
import { SKILL_CATALOG, skillById } from './catalog.js';
import { confirmationFor, isExplicitCancellation, isExplicitConfirmation } from './confirmation.js';
import { buildPreview, executeSkill, type SkillInvoke } from './executors.js';
import type { Interpreter } from './interpreter.js';
import type { SpeechToTextProvider } from '../voice/stt.js';
import type { WorkflowStore } from './store.js';
import {
  TERMINAL_STATUSES,
  type ConverseRequest,
  type ConverseResponse,
  type Interpretation,
  type PatientRef,
  type SkillDefinition,
  type WorkflowSlots,
  type WorkflowState,
  type WorkflowStatus,
} from './types.js';

export interface SkillEngineDeps {
  registry: ToolRegistry;
  store: WorkflowStore & { ttlMs?: number };
  interpreter: Interpreter;
  now?: () => Date;
  /** Sandbox hook for failure tests: wraps the real Tool Layer invoker (never replaces policy). */
  wrapInvoke?: (invoke: SkillInvoke) => SkillInvoke;
  /** Phase 5: speech-to-text provider of the voice channel (default: the AI runtime). */
  stt?: SpeechToTextProvider;
}

type Identity = ToolContext['identity'];

interface Turn {
  deps: SkillEngineDeps;
  identity: Identity;
  roleId: string;
  now: Date;
  today: string;
  availability: Map<string, SkillAvailability>;
  context: { currentPatientId?: string; currentPatientLabel?: string };
  /** The request carried a `context` (the UI always does): used to detect a resident change. */
  contextProvided: boolean;
  /** Phase 5: the message is a reviewed voice transcript (audit only). */
  voiceInput?: boolean;
}

const WRITE_RETRY_SAFE = new Set([
  'vitals.record',
  'handover.create',
  'therapy.prescribe',
  'administration.record',
]);

const PRIORITIES = new Set(['normale', 'alta', 'urgente']);

// ── audit (AiAuditEvent, PHI-safe: names only, origin AI_ASSISTANT) ────────────────────────

function audit(
  turn: Turn,
  state: Pick<WorkflowState, 'id' | 'skillId' | 'slots'> | null,
  skillId: string,
  stage: 'request' | 'proposal' | 'confirmation' | 'execute' | 'denied',
  outcome: AiAuditOutcome,
  fields: string[],
  kind: AiAuditKind = stage === 'execute' ? 'action' : 'read',
) {
  recordAuditEvent({
    requestId: state ? `skill-${state.id}` : `skill-${randomUUID()}`,
    operatorId: turn.identity.operatorId,
    operatorRole: turn.roleId,
    patientId: state?.slots.patient?.id ?? null,
    actionType: `skill:${skillId}:${stage}`,
    kind,
    channel: 'ai_assistant',
    fields: (turn.voiceInput && stage === 'request' ? ['input:voice', ...fields] : fields).slice(
      0,
      20,
    ),
    outcome,
  });
}

// ── helpers ────────────────────────────────────────────────────────────────────────────────

function classicScreenOf(state: WorkflowState) {
  const skill = skillById(state.skillId);
  if (!skill?.classicScreen) return undefined;
  return {
    ...skill.classicScreen,
    ...(state.slots.patient ? { patientId: state.slots.patient.id } : {}),
  };
}

function respond(
  state: WorkflowState,
  reply: string,
  extra: Partial<ConverseResponse> = {},
): ConverseResponse {
  const needsFallback =
    state.status === 'DENIED' ||
    state.status === 'FAILED' ||
    (state.status === 'NEEDS_CONFIRMATION' && state.preview?.confirmable === false);
  return {
    workflowId: state.id,
    status: state.status,
    skillId: state.skillId,
    reply,
    pending: state.pending,
    ...(state.candidates.length ? { candidates: state.candidates } : {}),
    preview: state.preview,
    ...(state.status === 'COMPLETED' ? { result: state.result } : {}),
    error: state.error,
    interpreter: state.interpreter,
    resident: state.slots.patient ?? null,
    ...(needsFallback && classicScreenOf(state) ? { classicScreen: classicScreenOf(state) } : {}),
    ...extra,
  };
}

function transition(state: WorkflowState, status: WorkflowStatus, event: string, detail?: string) {
  state.status = status;
  state.updatedAt = new Date().toISOString();
  state.history.push({ at: state.updatedAt, event, ...(detail ? { detail } : {}) });
}

export class WorkflowConflictError extends Error {
  constructor(public readonly workflowId: string) {
    super('workflow_conflict');
  }
}

function save(turn: Turn, state: WorkflowState, force = false) {
  const ttl = turn.deps.store.ttlMs ?? 30 * 60 * 1000;
  state.expiresAt = new Date(turn.now.getTime() + ttl).toISOString();
  if (!turn.deps.store.save(state, { force })) throw new WorkflowConflictError(state.id);
}

function newState(
  turn: Turn,
  skill: SkillDefinition,
  interpretation: Interpretation,
): WorkflowState {
  const at = turn.now.toISOString();
  return {
    id: randomUUID(),
    operatorId: turn.identity.operatorId,
    roleId: turn.roleId,
    skillId: skill.id,
    status: 'START',
    slots: {},
    pending: null,
    candidates: [],
    preview: null,
    writeRequestId: null,
    result: null,
    error: null,
    interpreter: interpretation.source,
    contextPatientId: turn.context.currentPatientId ?? null,
    version: 0,
    turns: 0,
    history: [{ at, event: 'START' }],
    createdAt: at,
    updatedAt: at,
    expiresAt: at,
  };
}

function invokerFor(turn: Turn, state: WorkflowState, confirmed: boolean): SkillInvoke {
  const base: SkillInvoke = (tool, input, options) =>
    turn.deps.registry.invoke(tool, input, {
      identity: turn.identity,
      origin: 'ai_assistant',
      requestId: `skill-${state.id}`,
      confirmed: confirmed && options?.confirmed !== false,
    });
  return turn.deps.wrapInvoke ? turn.deps.wrapInvoke(base) : base;
}

function suggestions(turn: Turn) {
  return SKILL_CATALOG.filter(
    (skill) => skill.executable && turn.availability.get(skill.id)?.available,
  ).map((skill) => ({ id: skill.id, name: skill.name }));
}

function describePreview(state: WorkflowState): string {
  const preview = state.preview!;
  const lines = [
    `${preview.action}`,
    `Ospite: ${preview.patient?.label ?? '—'}`,
    ...Object.entries(preview.values).map(([label, value]) => `${label}: ${value}`),
    ...preview.warnings.map((w) => `Attenzione: ${w}`),
    ...preview.notes,
    'Origine: richiesta all’assistente (AI).',
    preview.confirmable
      ? 'Controlla l’anteprima e premi «Conferma», «Modifica» o «Annulla».'
      : `${preview.blockedReason ?? 'Non confermabile dall’assistente.'} Premi «Annulla» o apri la schermata classica.`,
  ];
  return lines.join('\n');
}

function facilityMinute(now: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

// ── slot filling & context resolution ─────────────────────────────────────────────────────

function applyInterpretation(state: WorkflowState, interpretation: Interpretation) {
  const slots = state.slots;
  if (interpretation.values && Object.keys(interpretation.values).length) {
    slots.values = { ...(slots.values ?? {}), ...interpretation.values };
  }
  if (interpretation.text) {
    if (slots.text !== interpretation.text) {
      slots.therapyDraft = undefined;
      slots.therapyInput = undefined;
    }
    slots.text = interpretation.text;
  }
  if (interpretation.query) slots.query = interpretation.query;
  if (interpretation.date) slots.date = interpretation.date;
  if (interpretation.patientQuery && !slots.patient)
    slots.patientQuery = interpretation.patientQuery;
}

function pickCandidate(state: WorkflowState, message: string): PatientRef | undefined {
  if (!state.candidates.length) return undefined;
  const ordinal = /^\s*(?:il |la )?(\d|primo|prima|secondo|seconda|terzo|terza)\b/i.exec(message);
  if (ordinal) {
    const words: Record<string, number> = {
      primo: 1,
      prima: 1,
      secondo: 2,
      seconda: 2,
      terzo: 3,
      terza: 3,
    };
    const index = Number(ordinal[1]) || words[ordinal[1].toLowerCase()];
    return state.candidates[index - 1];
  }
  const text = message.trim().toLowerCase();
  const exact = state.candidates.filter((c) => c.label.toLowerCase() === text);
  if (exact.length === 1) return exact[0];
  // Administration choice by drug name ("il paracetamolo").
  if (state.pending === 'administration') {
    const partial = state.candidates.filter((c) =>
      text.includes(c.label.split(' — ')[0].toLowerCase()),
    );
    return partial.length === 1 ? partial[0] : undefined;
  }
  return undefined;
}

type Resolution =
  | { kind: 'resolved' }
  | { kind: 'ask'; reply: string }
  | { kind: 'denied'; code: string; reply: string };

async function scopeCheck(
  turn: Turn,
  state: WorkflowState,
  residentId: string,
  operation: ResidentOperation,
): Promise<Resolution | null> {
  const decision = await canAccessResident(
    { id: turn.identity.operatorId, role: turn.identity.role },
    residentId,
    { operation, skillId: state.skillId },
  );
  if (decision.allowed) return null;
  return {
    kind: 'denied',
    code: 'resident_out_of_scope',
    reply: 'Questo ospite non rientra tra quelli a cui hai accesso.',
  };
}

async function resolvePatient(
  turn: Turn,
  state: WorkflowState,
  interpretation: Interpretation,
): Promise<Resolution> {
  if (state.slots.patient) return { kind: 'resolved' };
  const invoke = invokerFor(turn, state, false);
  const context = turn.context;

  if (interpretation.currentPatient) {
    if (!context.currentPatientId) {
      state.pending = 'patient';
      return {
        kind: 'ask',
        reply: 'Non c’è un ospite attivo. Per quale ospite?',
      };
    }
    // Resident Access Scope (backend enforcement): the page context is a hint, never a permission.
    const denied = await scopeCheck(turn, state, context.currentPatientId, 'select');
    if (denied) return denied;
    const described = await describeResident(
      { id: turn.identity.operatorId, role: turn.identity.role },
      context.currentPatientId,
    );
    if (!described) {
      return {
        kind: 'denied',
        code: 'resident_out_of_scope',
        reply: 'Questo ospite non rientra tra quelli a cui hai accesso.',
      };
    }
    // Label from server data only (the client label is display-only and never trusted).
    state.slots.patient = described;
    state.candidates = [];
    return { kind: 'resolved' };
  }

  const query = state.slots.patientQuery?.trim();
  if (!query) {
    state.pending = 'patient';
    const hint = context.currentPatientId
      ? ' (se intendi l’ospite attivo rispondi «questo ospite»)'
      : '';
    return { kind: 'ask', reply: `Per quale ospite?${hint}` };
  }
  const search = await invoke('patients.search', { body: { q: query } });
  if (!search.ok) {
    if (search.error.code === 'forbidden')
      return { kind: 'denied', code: 'capability_denied', reply: search.error.message };
    state.pending = 'patient';
    state.slots.patientQuery = undefined;
    return {
      kind: 'ask',
      reply: `Ricerca ospite non riuscita (${search.error.message}). Per quale ospite?`,
    };
  }
  type Found = { id: string; firstName?: string; lastName?: string };
  let items = ((search.data as { items?: unknown[] }).items ?? []) as Found[];
  const tokens = query.split(/[,\s]+/).filter(Boolean);
  if (items.length === 0 && tokens.length > 1) {
    // patients.search reads any 16-character alphanumeric text as a codice fiscale (e.g.
    // "Anna Bianchiabcde"): retry with the longest token and keep only the rows matching ALL tokens.
    const longest = [...tokens].sort((a, b) => b.length - a.length)[0];
    const retry = await invoke('patients.search', { body: { q: longest } });
    if (retry.ok) {
      const lower = tokens.map((t) => t.toLowerCase());
      items = (((retry.data as { items?: unknown[] }).items ?? []) as Found[]).filter((p) => {
        const name = `${p.firstName ?? ''} ${p.lastName ?? ''}`.toLowerCase();
        return lower.every((t) => name.includes(t));
      });
    }
  }
  const refs = items.slice(0, 5).map((p) => ({
    id: p.id,
    label: `${p.lastName ?? ''} ${p.firstName ?? ''}`.trim(),
  }));
  if (refs.length === 1 && items.length === 1) {
    const denied = await scopeCheck(turn, state, refs[0].id, 'select');
    if (denied) return denied;
    state.slots.patient = refs[0];
    state.candidates = [];
    state.slots.patientQuery = undefined;
    return { kind: 'resolved' };
  }
  state.pending = 'patient';
  state.slots.patientQuery = undefined;
  if (refs.length === 0) {
    state.candidates = [];
    return { kind: 'ask', reply: `Nessun ospite trovato per «${query}». Per quale ospite?` };
  }
  state.candidates = refs;
  return {
    kind: 'ask',
    reply: `Ho trovato più ospiti per «${query}»:\n${refs
      .map((r, i) => `${i + 1}) ${r.label}`)
      .join('\n')}\nQuale? (scegli o rispondi con il numero)`,
  };
}

function checkValues(state: WorkflowState, now: Date): string | null {
  const values = state.slots.values ?? {};
  if (!Object.keys(values).length) {
    return 'Quali valori devo registrare? (es. pressione 120/80, SpO2 97, FC 72, temperatura 36.8)';
  }
  try {
    // Same validation as the service (reused, not duplicated): errors surface before the preview.
    parseParameterReading({ requestId: randomUUID(), measuredAt: now.toISOString(), values });
    return null;
  } catch (error) {
    state.slots.values = undefined;
    const message = error instanceof ParameterReadingError ? error.message : 'valori non validi';
    return `Valori non validi: ${message}. Ripeti i valori da registrare.`;
  }
}

/** administration.record: the resident's pending administrations of the day (Tool Layer read). */
async function resolveAdministration(
  turn: Turn,
  state: WorkflowState,
): Promise<Resolution | { kind: 'none'; reply: string } | { kind: 'failed'; reply: string }> {
  if (state.slots.administration) return { kind: 'resolved' };
  const date = state.slots.date ?? turn.today;
  const result = await invokerFor(
    turn,
    state,
    false,
  )('administration.list_slots', {
    query: { date },
  });
  if (!result.ok) {
    if (result.error.code === 'forbidden')
      return { kind: 'denied', code: 'capability_denied', reply: result.error.message };
    return { kind: 'failed', reply: result.error.message };
  }
  type Admin = {
    therapyId: string;
    drugName: string;
    dosage: string;
    route: string;
    scheduledTime: string;
    status: string;
  };
  const slots = (Array.isArray(result.data) ? result.data : []) as {
    fascia: string;
    patients: { patientId: string; administrations: Admin[] }[];
  }[];
  const options: NonNullable<WorkflowSlots['administrationOptions']> = [];
  for (const slot of slots) {
    for (const patient of slot.patients ?? []) {
      if (patient.patientId !== state.slots.patient?.id) continue;
      for (const a of patient.administrations ?? []) {
        if (a.status !== 'pending') continue;
        options.push({
          therapyId: a.therapyId,
          fascia: slot.fascia,
          date,
          drugName: a.drugName,
          dosage: a.dosage,
          route: a.route,
          scheduledTime: a.scheduledTime,
        });
      }
    }
  }
  if (options.length === 0) {
    return {
      kind: 'none',
      reply: `Nessuna somministrazione in attesa per ${state.slots.patient?.label} il ${date}: nessuna registrazione eseguita.`,
    };
  }
  if (options.length === 1) {
    state.slots.administration = options[0];
    return { kind: 'resolved' };
  }
  state.slots.administrationOptions = options;
  state.candidates = options.map((o, i) => ({
    id: String(i),
    label: `${o.drugName} — ${o.fascia}${o.scheduledTime ? ` ${o.scheduledTime}` : ''}`,
  }));
  state.pending = 'administration';
  return {
    kind: 'ask',
    reply: `Ci sono più somministrazioni in attesa per ${state.slots.patient?.label}:\n${state.candidates
      .map((c, i) => `${i + 1}) ${c.label}`)
      .join('\n')}\nQuale vuoi registrare?`,
  };
}

/** therapy.prescribe: draft from the SAME interpreter as Diario → Terapia (Tool Layer). */
async function prepareTherapyDraft(
  turn: Turn,
  state: WorkflowState,
): Promise<Resolution | { kind: 'failed'; reply: string }> {
  if (state.slots.therapyDraft) return { kind: 'resolved' };
  const entryDateTime = facilityMinute(turn.now);
  const result = await invokerFor(
    turn,
    state,
    false,
  )('diary.therapy_preview', {
    patientId: state.slots.patient!.id,
    body: { text: state.slots.text ?? '', entryDateTime },
  });
  if (!result.ok) {
    if (result.error.code === 'forbidden')
      return { kind: 'denied', code: 'capability_denied', reply: result.error.message };
    return { kind: 'failed', reply: result.error.message };
  }
  const preview = result.data as Record<string, unknown> & { intent?: string };
  if (preview.intent !== 'prescrizione' && preview.intent !== 'al_bisogno') {
    state.slots.text = undefined;
    state.pending = 'text';
    return {
      kind: 'ask',
      reply:
        'Il testo non descrive una nuova prescrizione (sembra una sospensione, una somministrazione o una modifica). Scrivi la prescrizione (es. «Paracetamolo 1 g alle 8 e alle 20») oppure usa la scheda Terapia.',
    };
  }
  state.slots.therapyDraft = { preview, entryDateTime };
  return { kind: 'resolved' };
}

// Keys the classic Terapia mapper produces (previewToTherapyForm → diaryTherapyInput). Anything
// else could be written without being shown in the preview, so it is refused (QA Phase 4).
const BINDABLE_THERAPY_KEYS = new Set([
  'farmacoNome',
  'drugPackageRef',
  'pharmaceuticalForm',
  'commercialStrengthValue',
  'commercialStrengthUnit',
  'allowedFractions',
  'viaSomministrazione',
  'tipo',
  'stato',
  'dataInizio',
  'dataFine',
  'schedules',
  'giorniSettimana',
  'prescrittore',
  'note',
  'dataSomministrazione',
  'orarioSomministrazione',
]);

/**
 * Normalises the therapy to bind: only mapper keys; fields the preview does not show are forced to
 * the classic-flow values (active therapy, no package link, empty prescriber — like the classic
 * Diario → Terapia flow; the inserting operator is set by the service); one-off dates are not an
 * assistant flow. null = refused.
 */
export function bindableTherapy(therapy: Record<string, unknown>): Record<string, unknown> | null {
  if (Object.keys(therapy).some((key) => !BINDABLE_THERAPY_KEYS.has(key))) return null;
  if (therapy.stato !== undefined && therapy.stato !== 'attiva') return null;
  if (therapy.drugPackageRef !== undefined && therapy.drugPackageRef !== null && therapy.drugPackageRef !== '')
    return null;
  if (therapy.prescrittore !== undefined && String(therapy.prescrittore).trim() !== '') return null;
  if (therapy.tipo !== 'periodica' && therapy.tipo !== 'al_bisogno') return null;
  if (String(therapy.dataSomministrazione ?? '').trim() || String(therapy.orarioSomministrazione ?? '').trim())
    return null;
  const { prescrittore: _p, dataSomministrazione: _d, orarioSomministrazione: _o, ...rest } = therapy;
  return { ...rest, stato: 'attiva', drugPackageRef: null };
}

/** The therapy confirmed by the doctor must be the drafted one (drug, times, start). */
function therapyMatchesDraft(state: WorkflowState, therapy: Record<string, unknown>): boolean {
  const draft = state.slots.therapyDraft?.preview as
    { row?: Record<string, unknown>; intent?: string } | undefined;
  const row = draft?.row ?? {};
  const norm = (v: unknown) =>
    String(v ?? '')
      .trim()
      .toLowerCase();
  if (!norm(row.farmacoNome) || norm(row.farmacoNome) !== norm(therapy.farmacoNome)) return false;
  const draftTimes = (Array.isArray(row.orari) ? (row.orari as string[]) : [])
    .map((t) => (/^\d:\d{2}$/.test(t) ? `0${t}` : t))
    .sort();
  const schedules = Array.isArray(therapy.schedules)
    ? (therapy.schedules as { time?: unknown }[]).map((s) => String(s.time ?? '')).sort()
    : [];
  if (draft?.intent !== 'al_bisogno' && JSON.stringify(draftTimes) !== JSON.stringify(schedules))
    return false;
  const entryDay = (state.slots.therapyDraft?.entryDateTime ?? '').slice(0, 10);
  const expectedStart = String(row.dataInizio ?? '') || entryDay;
  return String(therapy.dataInizio ?? '') === expectedStart;
}

// ── the turn ─────────────────────────────────────────────────────────────────────────────

async function deny(turn: Turn, state: WorkflowState, code: string, message: string) {
  state.error = { code, message };
  state.pending = null;
  state.preview = null;
  transition(state, 'DENIED', 'DENIED', code);
  save(turn, state);
  audit(turn, state, state.skillId, 'denied', 'denied', [`code:${code}`]);
  return respond(state, message);
}

async function execute(turn: Turn, state: WorkflowState, confirmed: boolean) {
  const skill = skillById(state.skillId)!;
  const availability = turn.availability.get(skill.id)!;
  // POLICY ALWAYS WINS: re-evaluated now, not when the workflow started.
  if (!availability.available) {
    return deny(
      turn,
      state,
      'capability_revoked',
      `Operazione non eseguita: i tuoi permessi non consentono più ${availability.missingRequired.join(', ')}.`,
    );
  }
  // Resident Access Scope, again, right before touching the resident.
  if (state.slots.patient) {
    const denied = await scopeCheck(
      turn,
      state,
      state.slots.patient.id,
      skill.kind === 'read' ? 'read' : 'write',
    );
    if (denied && denied.kind === 'denied') {
      // The resident was reachable at preview time: now it is gone or out of scope (stale context).
      state.error = {
        code: 'resident_unavailable',
        message: 'Ospite non più disponibile (rimosso o fuori dal tuo accesso)',
      };
      state.pending = null;
      transition(state, 'FAILED', 'FAILED', 'resident_unavailable');
      save(turn, state, true);
      audit(turn, state, skill.id, 'execute', 'denied', ['error:resident_unavailable']);
      return respond(
        state,
        'Operazione NON eseguita: l’ospite non è più disponibile per te (rimosso o fuori dal tuo accesso).',
      );
    }
  }
  transition(state, 'EXECUTING', 'EXECUTING');
  save(turn, state);
  const allowedOptional = new Set(
    skill.optionalTools.filter((tool) => !availability.missingOptional.includes(tool)),
  );
  let outcome;
  try {
    outcome = await executeSkill(
      state,
      invokerFor(turn, state, confirmed),
      allowedOptional,
      turn.now,
    );
  } catch {
    outcome = {
      ok: false as const,
      tool: 'unknown',
      toolsUsed: [],
      error: { code: 'internal' as const, status: 500, message: 'Errore imprevisto del servizio' },
    };
  }
  const toolFields = outcome.toolsUsed.map((tool) => `tool:${tool}`);
  const previewField = state.preview ? [`preview:${state.preview.previewId}`] : [];
  if (outcome.ok) {
    state.result = outcome.result;
    state.error = null;
    transition(state, 'COMPLETED', 'COMPLETED', outcome.toolsUsed.join(','));
    save(turn, state, true);
    audit(turn, state, skill.id, 'execute', 'ok', [
      ...toolFields,
      ...previewField,
      confirmed ? 'confirmed' : 'no_confirmation_required',
    ]);
    return respond(state, outcome.reply);
  }
  state.error = {
    code: outcome.error.domainCode ?? outcome.error.code,
    message: outcome.error.message,
  };
  const denied =
    outcome.error.code === 'forbidden' || outcome.error.code === 'confirmation_required';
  transition(state, denied ? 'DENIED' : 'FAILED', denied ? 'DENIED' : 'FAILED', outcome.tool);
  save(turn, state, true);
  audit(turn, state, skill.id, 'execute', denied ? 'denied' : 'error', [
    ...toolFields,
    ...previewField,
    `error:${state.error.code}`,
  ]);
  const retry =
    !denied && skill.kind !== 'read' && WRITE_RETRY_SAFE.has(skill.id)
      ? ' Puoi riprovare con «Riprova»: la stessa richiesta non verrà duplicata.'
      : '';
  return respond(
    state,
    `${denied ? 'Operazione negata' : 'Operazione NON eseguita'}: ${outcome.error.message}.${retry}`,
  );
}

async function ask(turn: Turn, state: WorkflowState, slot: string, reply: string) {
  transition(state, 'NEEDS_CLARIFICATION', 'NEEDS_CLARIFICATION', slot);
  save(turn, state);
  return respond(state, reply);
}

async function advance(turn: Turn, state: WorkflowState, interpretation: Interpretation) {
  const skill = skillById(state.skillId)!;
  const availability = turn.availability.get(skill.id)!;
  if (!availability.available) {
    return deny(
      turn,
      state,
      'capability_denied',
      `Non sei autorizzato a «${skill.name}»: servono ${availability.missingRequired.join(', ')}.`,
    );
  }
  applyInterpretation(state, interpretation);
  state.pending = null;

  for (const slot of skill.slots) {
    if (slot === 'patient') {
      const resolution = await resolvePatient(turn, state, interpretation);
      if (resolution.kind === 'denied')
        return deny(turn, state, resolution.code, `Operazione negata: ${resolution.reply}`);
      if (resolution.kind === 'ask') return ask(turn, state, 'patient', resolution.reply);
    }
    if (slot === 'values') {
      const problem = checkValues(state, turn.now);
      if (problem) {
        state.pending = 'values';
        return ask(turn, state, 'values', problem);
      }
    }
    if (slot === 'text' && !state.slots.text?.trim()) {
      state.pending = 'text';
      return ask(
        turn,
        state,
        'text',
        skill.id === 'handover.create'
          ? 'Cosa scrivo nella consegna?'
          : skill.id === 'therapy.prescribe'
            ? 'Cosa devo prescrivere? (es. «Paracetamolo 1 g alle 8 e alle 20»)'
            : 'Cosa devo scrivere nel diario?',
      );
    }
    if (slot === 'query' && !state.slots.query?.trim()) {
      state.pending = 'query';
      return ask(
        turn,
        state,
        'query',
        skill.id === 'drug.lookup' ? 'Quale farmaco cerco?' : 'Cosa devo cercare?',
      );
    }
    if (slot === 'administration') {
      const resolution = await resolveAdministration(turn, state);
      if (resolution.kind === 'denied')
        return deny(turn, state, resolution.code, `Operazione negata: ${resolution.reply}`);
      if (resolution.kind === 'ask') return ask(turn, state, 'administration', resolution.reply);
      if (resolution.kind === 'failed') {
        state.error = { code: 'upstream_error', message: resolution.reply };
        transition(state, 'FAILED', 'FAILED', 'administration.list_slots');
        save(turn, state);
        return respond(state, `Operazione NON eseguita: ${resolution.reply}.`);
      }
      if (resolution.kind === 'none') {
        state.result = { recorded: false, pending: 0 };
        transition(state, 'COMPLETED', 'COMPLETED', 'nothing_pending');
        save(turn, state);
        return respond(state, resolution.reply);
      }
    }
  }
  if (skill.id === 'therapy.prescribe') {
    const draft = await prepareTherapyDraft(turn, state);
    if (draft.kind === 'denied')
      return deny(turn, state, draft.code, `Operazione negata: ${draft.reply}`);
    if (draft.kind === 'ask') return ask(turn, state, 'text', draft.reply);
    if (draft.kind === 'failed') {
      state.error = { code: 'upstream_error', message: draft.reply };
      transition(state, 'FAILED', 'FAILED', 'diary.therapy_preview');
      save(turn, state);
      return respond(state, `Operazione NON eseguita: ${draft.reply}.`);
    }
  }
  if (
    skill.optionalSlots?.includes('patient') &&
    !state.slots.patient &&
    (interpretation.currentPatient || state.slots.patientQuery)
  ) {
    const resolution = await resolvePatient(turn, state, interpretation);
    if (resolution.kind === 'denied')
      return deny(turn, state, resolution.code, `Operazione negata: ${resolution.reply}`);
    if (resolution.kind === 'ask') return ask(turn, state, 'patient', resolution.reply);
  }
  state.candidates = [];
  transition(state, 'READY', 'READY');

  const confirmation = confirmationFor(skill, availability.confirmationTools);
  if (confirmation.mode === 'none') return execute(turn, state, false);
  // understand → prepare → preview → confirm → execute → verify → audit
  state.slots.at = turn.now.toISOString();
  // New content → new write id and new preview id: an older confirmation can never apply.
  state.writeRequestId = randomUUID();
  state.preview = buildPreview(state, turn.now, randomUUID(), {
    name: turn.identity.name ?? turn.identity.operatorId,
    role: turn.roleId,
  });
  transition(state, 'NEEDS_CONFIRMATION', 'PREVIEW', state.preview.tool);
  save(turn, state);
  audit(turn, state, skill.id, 'proposal', 'ok', [
    'preview',
    `preview:${state.preview.previewId}`,
    `tool:${state.preview.tool}`,
    `class:${state.preview.confirmationClass}`,
    `confirmable:${state.preview.confirmable}`,
    ...Object.keys(state.slots.values ?? {}).map((key) => `value:${key}`),
    ...(state.slots.text ? ['text'] : []),
    ...(state.slots.priority ? [`priority:${state.slots.priority}`] : []),
  ]);
  return respond(state, describePreview(state));
}

function editableOf(state: WorkflowState) {
  return {
    ...(state.slots.values ? { values: state.slots.values } : {}),
    ...(state.slots.text !== undefined ? { text: state.slots.text } : {}),
    ...(state.skillId === 'handover.create' ? { priority: state.slots.priority ?? 'normale' } : {}),
  };
}

/** One workflow turn. A turn that raced with another one on the same workflow is refused. */
export async function converse(
  deps: SkillEngineDeps,
  identity: Identity,
  request: ConverseRequest,
): Promise<ConverseResponse> {
  try {
    return await converseTurn(deps, identity, request);
  } catch (error) {
    if (!(error instanceof WorkflowConflictError)) throw error;
    const current = deps.store.get(error.workflowId);
    if (!current || current.operatorId !== identity.operatorId) throw error;
    return respond(
      current,
      `Nel frattempo il flusso è cambiato (stato: ${current.status}). Nessuna ulteriore operazione eseguita da questa richiesta.`,
    );
  }
}

async function converseTurn(
  deps: SkillEngineDeps,
  identity: Identity,
  request: ConverseRequest,
): Promise<ConverseResponse> {
  const now = deps.now ? deps.now() : new Date();
  const decisions = await evaluateTools(deps.registry, identity, 'skill-policy');
  const turn: Turn = {
    deps,
    identity,
    roleId: identity.appRole ?? identity.role,
    now,
    today: facilityToday(now),
    availability: new Map(
      SKILL_CATALOG.map((skill) => [skill.id, availabilityOf(skill, decisions)]),
    ),
    context: {
      ...(typeof request.context?.currentPatientId === 'string' && request.context.currentPatientId
        ? { currentPatientId: request.context.currentPatientId }
        : {}),
      ...(typeof request.context?.currentPatientLabel === 'string'
        ? { currentPatientLabel: request.context.currentPatientLabel }
        : {}),
    },
    contextProvided: request.context !== undefined,
    voiceInput: request.inputChannel === 'voice',
  };
  const message = typeof request.message === 'string' ? request.message.trim() : '';
  const available = SKILL_CATALOG.filter((skill) => turn.availability.get(skill.id)?.available);

  // ── continue an existing workflow ──
  if (request.workflowId) {
    const state = deps.store.get(request.workflowId);
    if (!state || state.operatorId !== identity.operatorId) {
      return {
        workflowId: request.workflowId,
        status: 'FAILED',
        skillId: null,
        reply: 'Questo flusso non è più disponibile (scaduto o non tuo). Ricomincia la richiesta.',
        error: { code: 'workflow_not_found', message: 'Flusso non trovato o scaduto' },
      };
    }
    state.turns += 1;
    if (TERMINAL_STATUSES.has(state.status)) {
      if (request.action === 'retry' && state.status === 'FAILED' && state.writeRequestId) {
        if (!WRITE_RETRY_SAFE.has(state.skillId) || !state.preview) {
          return respond(
            state,
            'Questa operazione non si può ripetere in sicurezza: ricomincia la richiesta.',
          );
        }
        audit(turn, state, state.skillId, 'confirmation', 'ok', [
          'retry',
          `preview:${state.preview.previewId}`,
        ]);
        return execute(turn, state, true);
      }
      return respond(state, `Il flusso è già concluso (${state.status}).`);
    }
    if (state.status === 'EXECUTING') {
      return respond(state, 'Operazione in corso: attendi l’esito.');
    }
    // Prompt 4 §6/§12: another resident on screen invalidates the open workflow.
    if (
      turn.contextProvided &&
      (turn.context.currentPatientId ?? null) !== state.contextPatientId &&
      // Opening the page (or picking) the very resident the workflow targets is not a change.
      !(turn.context.currentPatientId && turn.context.currentPatientId === state.slots.patient?.id)
    ) {
      const previous = state.slots.patient?.label ?? 'l’ospite precedente';
      state.pending = null;
      state.preview = null;
      state.error = { code: 'resident_changed', message: 'Ospite attivo cambiato' };
      transition(state, 'CANCELLED', 'CANCELLED', 'resident_changed');
      save(turn, state);
      audit(turn, state, state.skillId, 'confirmation', 'ok', ['cancelled', 'resident_changed']);
      return respond(
        state,
        `Hai cambiato ospite: l’operazione preparata per ${previous} è stata annullata. Nessuna modifica eseguita.`,
      );
    }
    if (request.action === 'cancel' || isExplicitCancellation(message)) {
      state.pending = null;
      transition(state, 'CANCELLED', 'CANCELLED', 'user');
      save(turn, state);
      audit(turn, state, state.skillId, 'confirmation', 'ok', [
        'cancelled',
        ...(state.preview ? [`preview:${state.preview.previewId}`] : []),
      ]);
      return respond(state, 'Annullato. Nessuna modifica è stata eseguita.');
    }
    if (
      request.action === 'edit' &&
      (state.pending === 'edit' || state.status === 'NEEDS_CONFIRMATION')
    ) {
      const edit = request.edit ?? {};
      const interpretation: Interpretation = { source: state.interpreter, skillId: state.skillId };
      if (edit.values && state.skillId === 'vitals.record') state.slots.values = { ...edit.values };
      if (typeof edit.text === 'string' && edit.text.trim()) {
        interpretation.text = edit.text.trim();
      }
      if (edit.priority !== undefined) {
        if (state.skillId !== 'handover.create' || !PRIORITIES.has(edit.priority))
          return respond(state, 'Priorità non valida.', { editable: editableOf(state) });
        state.slots.priority = edit.priority;
      }
      const therapy = request.payload?.therapy;
      if (therapy !== undefined) {
        // Prescription: bind the EXACT therapy that will be written; the next preview shows it.
        const bindable =
          therapy && typeof therapy === 'object' ? bindableTherapy(therapy) : null;
        if (
          state.skillId !== 'therapy.prescribe' ||
          !state.slots.therapyDraft ||
          !bindable ||
          !therapyMatchesDraft(state, bindable)
        ) {
          audit(turn, state, state.skillId, 'confirmation', 'denied', ['preview_mismatch']);
          return respond(
            state,
            'La terapia non corrisponde alla bozza preparata: nessuna prescrizione creata.',
            { error: { code: 'preview_mismatch', message: 'Terapia diversa dalla bozza' } },
          );
        }
        state.slots.therapyInput = bindable;
      }
      state.preview = null;
      audit(turn, state, state.skillId, 'confirmation', 'ok', [
        'edit',
        ...Object.keys(edit).map((k) => `edit:${k}`),
        ...(therapy !== undefined ? ['edit:therapy_payload'] : []),
      ]);
      return advance(turn, state, interpretation);
    }
    if (state.status === 'NEEDS_CONFIRMATION' && state.preview) {
      const preview = state.preview;
      if (request.action === 'modify') {
        state.preview = null;
        state.pending = 'edit';
        transition(state, 'NEEDS_CLARIFICATION', 'MODIFY', preview.previewId);
        save(turn, state);
        audit(turn, state, state.skillId, 'confirmation', 'ok', [
          'modify',
          `preview:${preview.previewId}`,
        ]);
        return respond(
          state,
          'Modifica i dati e invia: verrà preparata una nuova anteprima (quella precedente non è più valida).',
          { editable: editableOf(state) },
        );
      }
      if (request.action === 'confirm') {
        if (!request.previewId || request.previewId !== preview.previewId) {
          audit(turn, state, state.skillId, 'confirmation', 'denied', [
            'preview_stale',
            `preview:${preview.previewId}`,
          ]);
          return respond(
            state,
            'Questa conferma si riferisce a un’anteprima non più valida: controlla l’anteprima attuale.',
            { error: { code: 'preview_stale', message: 'Anteprima non più valida' } },
          );
        }
        if (!preview.confirmable) {
          return respond(state, preview.blockedReason ?? 'Anteprima non confermabile.', {
            error: { code: 'not_confirmable', message: preview.blockedReason ?? '' },
          });
        }
        if (state.skillId === 'therapy.prescribe' && !preview.therapyBound) {
          // Only a preview built from the exact therapy payload can be confirmed.
          return respond(state, 'Anteprima della terapia non ancora completa: nessuna prescrizione creata.', {
            error: { code: 'payload_not_bound', message: 'Terapia non allegata all’anteprima' },
          });
        }
        audit(turn, state, state.skillId, 'confirmation', 'ok', [
          'confirmed',
          `preview:${preview.previewId}`,
          'ui_event',
        ]);
        return execute(turn, state, true);
      }
      if (isExplicitConfirmation(message)) {
        return respond(state, 'Per confermare premi «Conferma» sull’anteprima.');
      }
      if (message) {
        // A correction before confirming. Never guess: vital signs need new values, a text needs
        // an explicit «correggi: …» (so «sì, conferma» can never become the stored note).
        const hint =
          state.skillId === 'vitals.record'
            ? 'Per cambiare i valori scrivili di nuovo (es. «pressione 130/80») o premi «Modifica».'
            : 'Per cambiare il testo scrivi «correggi: nuovo testo» o premi «Modifica».';
        let interpretation: Interpretation | null = null;
        if (state.skillId === 'vitals.record') {
          const candidate = await deps.interpreter({
            message,
            available,
            pending: { skillId: state.skillId, slot: 'values' },
            today: turn.today,
          });
          if (candidate.values && Object.keys(candidate.values).length) interpretation = candidate;
        } else if (state.skillId !== 'administration.record') {
          const correction =
            /^\s*(?:correggi|modifica|cambia)(?:\s+il\s+testo)?\s*[:,]\s*(.+)$/is.exec(message);
          if (correction) {
            interpretation = {
              source: state.interpreter,
              skillId: state.skillId,
              text: correction[1].trim(),
            };
          }
        }
        if (!interpretation) return respond(state, hint);
        state.preview = null;
        return advance(turn, state, interpretation);
      }
      return respond(state, 'Premi «Conferma», «Modifica» oppure «Annulla».');
    }
    if (request.action === 'confirm') {
      return respond(state, 'Non c’è ancora nulla da confermare.');
    }
    if (!message) return respond(state, 'Attendo una risposta.');
    // NEEDS_CLARIFICATION / CONTEXT_REQUIRED: the message answers the pending question.
    if (state.pending === 'patient' || state.pending === 'administration') {
      const picked = pickCandidate(state, message);
      if (picked && state.pending === 'patient') {
        state.slots.patient = picked;
        state.candidates = [];
        const denied = await scopeCheck(turn, state, picked.id, 'select');
        if (denied && denied.kind === 'denied')
          return deny(turn, state, denied.code, `Operazione negata: ${denied.reply}`);
        return advance(turn, state, { source: state.interpreter, skillId: state.skillId });
      }
      if (picked && state.pending === 'administration') {
        state.slots.administration = state.slots.administrationOptions?.[Number(picked.id)];
        state.candidates = [];
        return advance(turn, state, { source: state.interpreter, skillId: state.skillId });
      }
      if (state.pending === 'administration')
        return respond(state, 'Scegli una delle somministrazioni elencate (numero o farmaco).');
    }
    const interpretation = await deps.interpreter({
      message,
      available,
      pending: state.pending
        ? {
            skillId: state.skillId,
            slot:
              state.pending === 'edit'
                ? state.skillId === 'vitals.record'
                  ? 'values'
                  : 'text'
                : state.pending,
          }
        : null,
      today: turn.today,
    });
    if (interpretation.cancel) {
      transition(state, 'CANCELLED', 'CANCELLED', 'user');
      save(turn, state);
      audit(turn, state, state.skillId, 'confirmation', 'ok', ['cancelled']);
      return respond(state, 'Annullato. Nessuna modifica è stata eseguita.');
    }
    return advance(turn, state, interpretation);
  }

  // ── new request ──
  if (request.action === 'cancel' || isExplicitCancellation(message)) {
    return {
      workflowId: null,
      status: 'CANCELLED',
      skillId: null,
      reply: 'Nessuna operazione in corso.',
    };
  }
  if (!message) {
    return {
      workflowId: null,
      status: 'NEEDS_CLARIFICATION',
      skillId: null,
      reply: 'Cosa vuoi fare?',
      suggestions: suggestions(turn),
    };
  }
  const interpretation = await deps.interpreter({
    message,
    available,
    unavailable: SKILL_CATALOG.filter((skill) => !available.includes(skill)),
    pending: null,
    today: turn.today,
    // Phase 8: role profile wording only; the skill list above is already the authorized subset.
    roleHint: profileFor(turn.roleId).assistantHint,
  });
  const skill = interpretation.skillId ? skillById(interpretation.skillId) : undefined;
  if (!skill) {
    audit(turn, null, 'unknown', 'request', 'empty', [`interpreter:${interpretation.source}`]);
    return {
      workflowId: null,
      status: 'NEEDS_CLARIFICATION',
      skillId: null,
      reply:
        'Non ho capito cosa vuoi fare, oppure non è tra le azioni dell’assistente. Ecco cosa posso fare per te (o usa le schermate classiche):',
      suggestions: suggestions(turn),
      interpreter: interpretation.source,
    };
  }
  const state = newState(turn, skill, interpretation);
  audit(turn, state, skill.id, 'request', 'ok', [
    `interpreter:${interpretation.source}`,
    ...(interpretation.patientQuery || interpretation.currentPatient ? ['patient_reference'] : []),
    ...(turn.context.currentPatientId ? ['resident_context'] : []),
    ...Object.keys(interpretation.values ?? {}).map((key) => `value:${key}`),
  ]);
  if (!skill.executable) {
    return deny(turn, state, 'human_control_required', 'Operazione riservata alla GUI.');
  }
  transition(state, 'CONTEXT_REQUIRED', 'CONTEXT_REQUIRED');
  return advance(turn, state, interpretation);
}
