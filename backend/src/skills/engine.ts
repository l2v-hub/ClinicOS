// Skill workflow engine (Phase 3). One turn = one call:
//
//   message/action → policy re-evaluation → (Agno | deterministic) interpretation → skill →
//   context resolution → NEEDS_CLARIFICATION | NEEDS_CONFIRMATION (preview) | EXECUTING →
//   Tool Layer (re-authorized per call) → COMPLETED | DENIED | FAILED | CANCELLED → audit.
//
// Invariants:
//   - the policy is evaluated on EVERY turn and again by the Tool Layer on every tool call: a
//     workflow started while authorized is never a standing authorization;
//   - no write without a resolved, unambiguous target and an explicit confirmation;
//   - the reply never claims success unless the tool returned ok;
//   - a write is attempted at most once per workflow (EXECUTING/COMPLETED block replays) and
//     idempotent tools reuse the same requestId on an explicit retry.

import { randomUUID } from 'node:crypto';
import { recordAuditEvent, type AiAuditKind, type AiAuditOutcome } from '../ai/audit-store.js';
import {
  facilityToday,
  parseParameterReading,
  ParameterReadingError,
} from '../patients/parameter-reading-input.js';
import type { ToolRegistry } from '../tools/registry.js';
import type { ToolContext } from '../tools/types.js';
import { availabilityOf, evaluateTools, type SkillAvailability } from './availability.js';
import { SKILL_CATALOG, skillById } from './catalog.js';
import { confirmationFor, isExplicitCancellation, isExplicitConfirmation } from './confirmation.js';
import { buildPreview, executeSkill, type SkillInvoke } from './executors.js';
import type { Interpreter } from './interpreter.js';
import type { WorkflowStore } from './store.js';
import {
  TERMINAL_STATUSES,
  type ConverseRequest,
  type ConverseResponse,
  type Interpretation,
  type PatientRef,
  type SkillDefinition,
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
}

const HANDOFF: Record<string, string> = {
  'therapy.prescribe':
    'La prescrizione di una terapia è un’azione clinicamente critica: non la eseguo io. Compilala e confermala dalla scheda Terapia dell’ospite (oppure da Diario → Terapia).',
  'administration.record':
    'La registrazione di una somministrazione è un’azione clinicamente critica: non la eseguo io. Registrala dal giro terapia (Terapia → Somministrazioni).',
};

const WRITE_RETRY_SAFE = new Set(['vitals.record', 'handover.create']);

// ── audit (AiAuditEvent, PHI-safe: names only) ─────────────────────────────────────────────

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
    channel: 'ai',
    fields: fields.slice(0, 20),
    outcome,
  });
}

// ── helpers ────────────────────────────────────────────────────────────────────────────────

function respond(state: WorkflowState, reply: string): ConverseResponse {
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
      origin: 'ai',
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
    ...preview.notes,
    'Origine: richiesta all’assistente (AI).',
    'Confermi? Rispondi «conferma» per procedere o «annulla».',
  ];
  return lines.join('\n');
}

// ── slot filling & context resolution ─────────────────────────────────────────────────────

function applyInterpretation(state: WorkflowState, interpretation: Interpretation) {
  const slots = state.slots;
  if (interpretation.values && Object.keys(interpretation.values).length) {
    slots.values = { ...(slots.values ?? {}), ...interpretation.values };
  }
  if (interpretation.text) slots.text = interpretation.text;
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
  return exact.length === 1 ? exact[0] : undefined;
}

type Resolution = 'resolved' | 'ask' | 'denied';

async function resolvePatient(
  turn: Turn,
  state: WorkflowState,
  interpretation: Interpretation,
): Promise<{ kind: Resolution; reply?: string }> {
  if (state.slots.patient) return { kind: 'resolved' };
  const invoke = invokerFor(turn, state, false);
  const context = turn.context;

  if (interpretation.currentPatient) {
    if (!context.currentPatientId) {
      state.pending = 'patient';
      return {
        kind: 'ask',
        reply:
          'Non so a quale ospite ti riferisci: non sei nella scheda di un ospite. Per quale ospite?',
      };
    }
    // Scope check through the Tool Layer: the page context is a hint, never a permission.
    const check = await invoke('patients.clinical_summary', {
      query: { patientIds: context.currentPatientId },
    });
    if (!check.ok) {
      if (check.error.code === 'forbidden') return { kind: 'denied', reply: check.error.message };
      state.pending = 'patient';
      return { kind: 'ask', reply: 'Non riesco a verificare l’ospite corrente. Per quale ospite?' };
    }
    const rows = (check.data as { patientId?: string }[]) ?? [];
    if (
      !Array.isArray(rows) ||
      rows.length !== 1 ||
      rows[0]?.patientId !== context.currentPatientId
    ) {
      state.pending = 'patient';
      return {
        kind: 'ask',
        reply: 'L’ospite corrente non è tra quelli che puoi vedere. Per quale ospite?',
      };
    }
    // The label shown in the preview comes from server data: the client label is only a search
    // hint, accepted when the search returns the SAME verified id.
    let label = 'ospite della scheda aperta';
    if (context.currentPatientLabel?.trim()) {
      const named = await invoke('patients.search', {
        body: { q: context.currentPatientLabel.trim().slice(0, 80) },
      });
      const match = named.ok
        ? (((named.data as { items?: unknown[] }).items ?? []) as {
            id: string;
            firstName?: string;
            lastName?: string;
          }[]).find((p) => p.id === context.currentPatientId)
        : undefined;
      if (match) label = `${match.lastName ?? ''} ${match.firstName ?? ''}`.trim();
    }
    state.slots.patient = { id: context.currentPatientId, label };
    state.candidates = [];
    return { kind: 'resolved' };
  }

  const query = state.slots.patientQuery?.trim();
  if (!query) {
    state.pending = 'patient';
    const hint = context.currentPatientId
      ? ' (se intendi l’ospite della scheda aperta rispondi «questo ospite»)'
      : '';
    return { kind: 'ask', reply: `Per quale ospite?${hint}` };
  }
  const search = await invoke('patients.search', { body: { q: query } });
  if (!search.ok) {
    if (search.error.code === 'forbidden') return { kind: 'denied', reply: search.error.message };
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
      .join('\n')}\nQuale? (rispondi con il numero)`,
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

// ── the turn ─────────────────────────────────────────────────────────────────────────────

async function deny(turn: Turn, state: WorkflowState, code: string, message: string) {
  state.error = { code, message };
  state.pending = null;
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
  if (outcome.ok) {
    state.result = outcome.result;
    state.error = null;
    transition(state, 'COMPLETED', 'COMPLETED', outcome.toolsUsed.join(','));
    save(turn, state, true);
    audit(turn, state, skill.id, 'execute', 'ok', [
      ...toolFields,
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
    `error:${state.error.code}`,
  ]);
  const retry =
    !denied && skill.kind !== 'read' && WRITE_RETRY_SAFE.has(skill.id)
      ? ' Puoi riprovare con «riprova»: la stessa richiesta non verrà duplicata.'
      : '';
  return respond(
    state,
    `${denied ? 'Operazione negata' : 'Operazione NON eseguita'}: ${outcome.error.message}.${retry}`,
  );
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
      if (resolution.kind === 'denied') {
        return deny(turn, state, 'capability_denied', `Operazione negata: ${resolution.reply}`);
      }
      if (resolution.kind === 'ask') {
        transition(state, 'NEEDS_CLARIFICATION', 'NEEDS_CLARIFICATION', 'patient');
        save(turn, state);
        return respond(state, resolution.reply!);
      }
    }
    if (slot === 'values') {
      const problem = checkValues(state, turn.now);
      if (problem) {
        state.pending = 'values';
        transition(state, 'NEEDS_CLARIFICATION', 'NEEDS_CLARIFICATION', 'values');
        save(turn, state);
        return respond(state, problem);
      }
    }
    if (slot === 'text' && !state.slots.text?.trim()) {
      state.pending = 'text';
      transition(state, 'NEEDS_CLARIFICATION', 'NEEDS_CLARIFICATION', 'text');
      save(turn, state);
      return respond(
        state,
        skill.id === 'handover.create'
          ? 'Cosa scrivo nella consegna?'
          : 'Cosa devo scrivere nel diario?',
      );
    }
    if (slot === 'query' && !state.slots.query?.trim()) {
      state.pending = 'query';
      transition(state, 'NEEDS_CLARIFICATION', 'NEEDS_CLARIFICATION', 'query');
      save(turn, state);
      return respond(
        state,
        skill.id === 'drug.lookup' ? 'Quale farmaco cerco?' : 'Cosa devo cercare?',
      );
    }
  }
  if (
    skill.optionalSlots?.includes('patient') &&
    !state.slots.patient &&
    (interpretation.currentPatient || state.slots.patientQuery)
  ) {
    const resolution = await resolvePatient(turn, state, interpretation);
    if (resolution.kind === 'denied') {
      return deny(turn, state, 'capability_denied', `Operazione negata: ${resolution.reply}`);
    }
    if (resolution.kind === 'ask') {
      transition(state, 'NEEDS_CLARIFICATION', 'NEEDS_CLARIFICATION', 'patient');
      save(turn, state);
      return respond(state, resolution.reply!);
    }
  }
  state.candidates = [];
  transition(state, 'READY', 'READY');

  const confirmation = confirmationFor(skill, availability.confirmationTools);
  if (confirmation.mode === 'none') return execute(turn, state, false);
  // understand → prepare → preview → confirm → execute → verify → audit
  state.slots.at = turn.now.toISOString();
  state.writeRequestId = randomUUID();
  state.preview = buildPreview(state, turn.now);
  transition(state, 'NEEDS_CONFIRMATION', 'PREVIEW', state.preview.tool);
  save(turn, state);
  audit(turn, state, skill.id, 'proposal', 'ok', [
    'preview',
    `tool:${state.preview.tool}`,
    `class:${state.preview.confirmationClass}`,
    ...Object.keys(state.slots.values ?? {}).map((key) => `value:${key}`),
    ...(state.slots.text ? ['text'] : []),
  ]);
  return respond(state, describePreview(state));
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
      ...(typeof request.context?.currentPatientId === 'string'
        ? { currentPatientId: request.context.currentPatientId }
        : {}),
      ...(typeof request.context?.currentPatientLabel === 'string'
        ? { currentPatientLabel: request.context.currentPatientLabel }
        : {}),
    },
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
        if (!WRITE_RETRY_SAFE.has(state.skillId)) {
          return respond(
            state,
            'Questa operazione non si può ripetere in sicurezza: ricomincia la richiesta.',
          );
        }
        audit(turn, state, state.skillId, 'confirmation', 'ok', ['retry']);
        return execute(turn, state, true);
      }
      return respond(state, `Il flusso è già concluso (${state.status}).`);
    }
    if (state.status === 'EXECUTING') {
      return respond(state, 'Operazione in corso: attendi l’esito.');
    }
    if (request.action === 'cancel' || isExplicitCancellation(message)) {
      state.pending = null;
      transition(state, 'CANCELLED', 'CANCELLED', 'user');
      save(turn, state);
      audit(turn, state, state.skillId, 'confirmation', 'ok', ['cancelled']);
      return respond(state, 'Annullato. Nessuna modifica è stata eseguita.');
    }
    if (state.status === 'NEEDS_CONFIRMATION') {
      if (request.action === 'confirm' || isExplicitConfirmation(message)) {
        audit(turn, state, state.skillId, 'confirmation', 'ok', ['confirmed']);
        return execute(turn, state, true);
      }
      if (message) {
        // A correction before confirming. Never guess: vital signs need new values, a text needs
        // an explicit «correggi: …» (so «sì, conferma» can never become the stored note).
        const ask =
          state.skillId === 'vitals.record'
            ? 'Per confermare rispondi solo «conferma» (o «annulla»); per cambiare i valori scrivili di nuovo (es. «pressione 130/80»).'
            : 'Per confermare rispondi solo «conferma» (o «annulla»); per cambiare il testo scrivi «correggi: nuovo testo».';
        let interpretation: Interpretation | null = null;
        if (state.skillId === 'vitals.record') {
          const candidate = await deps.interpreter({
            message,
            available,
            pending: { skillId: state.skillId, slot: 'values' },
            today: turn.today,
          });
          if (candidate.values && Object.keys(candidate.values).length) interpretation = candidate;
        } else {
          const correction = /^\s*(?:correggi|modifica|cambia)(?:\s+il\s+testo)?\s*[:,]\s*(.+)$/is.exec(message);
          if (correction) {
            interpretation = { source: state.interpreter, skillId: state.skillId, text: correction[1].trim() };
          }
        }
        if (!interpretation) return respond(state, ask);
        state.preview = null;
        return advance(turn, state, interpretation);
      }
      return respond(state, 'Rispondi «conferma» per procedere oppure «annulla».');
    }
    if (request.action === 'confirm') {
      return respond(state, 'Non c’è ancora nulla da confermare.');
    }
    if (!message) return respond(state, 'Attendo una risposta.');
    // NEEDS_CLARIFICATION / CONTEXT_REQUIRED: the message answers the pending question.
    const picked = state.pending === 'patient' ? pickCandidate(state, message) : undefined;
    if (picked) {
      state.slots.patient = picked;
      state.candidates = [];
      return advance(turn, state, { source: state.interpreter, skillId: state.skillId });
    }
    const interpretation = await deps.interpreter({
      message,
      available,
      pending: state.pending ? { skillId: state.skillId, slot: state.pending } : null,
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
    pending: null,
    today: turn.today,
  });
  const skill = interpretation.skillId ? skillById(interpretation.skillId) : undefined;
  if (!skill) {
    audit(turn, null, 'unknown', 'request', 'empty', [`interpreter:${interpretation.source}`]);
    return {
      workflowId: null,
      status: 'NEEDS_CLARIFICATION',
      skillId: null,
      reply: 'Non ho capito cosa vuoi fare. Ecco cosa posso fare per te:',
      suggestions: suggestions(turn),
      interpreter: interpretation.source,
    };
  }
  const state = newState(turn, skill, interpretation);
  audit(turn, state, skill.id, 'request', 'ok', [
    `interpreter:${interpretation.source}`,
    ...(interpretation.patientQuery || interpretation.currentPatient ? ['patient_reference'] : []),
    ...Object.keys(interpretation.values ?? {}).map((key) => `value:${key}`),
  ]);
  if (!skill.executable) {
    return deny(
      turn,
      state,
      'human_control_required',
      HANDOFF[skill.id] ?? 'Operazione riservata alla GUI.',
    );
  }
  transition(state, 'CONTEXT_REQUIRED', 'CONTEXT_REQUIRED');
  return advance(turn, state, interpretation);
}

