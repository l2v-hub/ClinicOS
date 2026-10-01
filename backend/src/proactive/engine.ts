// Phase 7 — proactive engine. Pipeline (Prompt 7):
//
//   EVENT (real facts) → DETERMINISTIC ELIGIBILITY (policy capability + Resident Access Scope in
//   the query) → SIGNAL (grouping, dedup, priority from source fields / config rules) → ack /
//   seen state → [optional] AI SYNTHESIS of already-authorized signals → HUMAN ATTENTION.
//
// The engine never writes clinical data and never executes a skill. An action is only a pointer
// to an EXISTING skill (normal Assistant path: preview → «Conferma» button) or to a classic screen.
// Ack / seen are append-only facts in the audit table (AiAuditEvent): they never alter the
// source fact and need no schema change.

import { createHash, randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { recordAuditEvent } from '../ai/audit-store.js';
import type { Operator } from '../ai/auth.js';
import type { AuthzContext } from '../authz/request-context.js';
import { composeAnswer } from '../ai/assistant/composer.js';
import { callComposeRuntime } from '../ai/assistant/runtime-client.js';
import { loadAssistantLlmConfig } from '../ai/assistant/config.js';
import type { SourceReference } from '../ai/gateway/types.js';
import type { WorkflowState } from '../skills/types.js';
import {
  CARE_FEED_CAPABILITY,
  EVENT_CATALOG,
  disabledEventTypes,
  eventDef,
  type EventType,
  type SignalType,
} from './catalog.js';
import { COLLECTORS, type ProactiveEvent } from './sources.js';
import { romeParts, shiftWindow } from './time.js';

export type Priority = 'normale' | 'alta' | 'urgente';

export type SignalAction =
  | { kind: 'skill'; skillId: string; label: string; starter: string; residentId: string | null }
  | { kind: 'resume_workflow'; workflowId: string; label: string; residentId: string | null }
  | { kind: 'classic'; screen: string; label: string };

export interface Signal {
  signalId: string;
  /** Changes when new events join the signal: an ack covers one revision only. */
  rev: string;
  type: SignalType;
  eventType: EventType;
  priority: Priority;
  priorityRule: string;
  title: string;
  detail: string | null;
  residentId: string | null;
  residentLabel: string | null;
  occurredAt: string;
  origin: string;
  reason: string;
  count: number;
  sourceEventIds: string[];
  status: 'nuovo' | 'visto' | 'preso_visione';
  changedSinceLastView: boolean;
  action: SignalAction | null;
}

export interface ProactiveDeps {
  listWorkflows?: (operatorId: string) => WorkflowState[];
  now?: () => Date;
  env?: NodeJS.ProcessEnv;
  /** Sandbox hook (tests): replaces the compose runtime call; policy/scope are unaffected. */
  composeRuntime?: (req: {
    question: string;
    results: unknown[];
    sources: SourceReference[];
  }) => Promise<{ answerText?: string; citedSources?: string[]; refusal?: string }>;
}

export interface Eligibility {
  allowed: EventType[];
  denied: { type: EventType; missing: string[] }[];
}

const PRIORITY_RANK: Record<Priority, number> = { urgente: 3, alta: 2, normale: 1 };
const ID = /^[A-Za-z0-9_.:@-]{1,200}$/;

/** Deterministic eligibility: ALL listed capabilities allowed by the ACTIVE policy (+ care feed). */
export function eligibility(
  authz: AuthzContext,
  env: NodeJS.ProcessEnv = process.env,
): Eligibility {
  const disabled = disabledEventTypes(env);
  const allowed: EventType[] = [];
  const denied: Eligibility['denied'] = [];
  for (const def of EVENT_CATALOG) {
    if (disabled.has(def.type)) {
      denied.push({ type: def.type, missing: ['disabled_by_config'] });
      continue;
    }
    const required =
      def.audience === 'care'
        ? [...new Set([...def.capabilities, CARE_FEED_CAPABILITY])]
        : def.capabilities;
    const missing = required.filter((cap) => {
      try {
        return !authz.can(cap).allowed;
      } catch {
        return true; // fail closed
      }
    });
    if (missing.length) denied.push({ type: def.type, missing });
    else allowed.push(def.type);
  }
  return { allowed, denied };
}

interface CollectResult {
  events: ProactiveEvent[];
  perSource: Record<string, { events: number; ms: number; error?: string }>;
}

async function collect(
  operator: Pick<Operator, 'id' | 'role'>,
  allowed: EventType[],
  since: Date,
  now: Date,
  deps: ProactiveDeps,
): Promise<CollectResult> {
  const allowedSet = new Set(allowed);
  const run = new Set(allowed.map((t) => (t === 'therapy.changed' ? 'therapy.prescribed' : t)));
  // therapy.changed shares the therapies collector; run it if either is allowed.
  const perSource: CollectResult['perSource'] = {};
  const batches = await Promise.all(
    [...run].map(async (type) => {
      const t0 = Date.now();
      try {
        const events = await COLLECTORS[type as EventType]({
          operator,
          since,
          now,
          limit: 100,
          listWorkflows: deps.listWorkflows,
          env: deps.env,
        });
        perSource[type] = { events: events.length, ms: Date.now() - t0 };
        return events;
      } catch (error) {
        // A failing source never breaks the inbox and never widens it: its events are omitted.
        perSource[type] = {
          events: 0,
          ms: Date.now() - t0,
          error: error instanceof Error ? error.name : 'error',
        };
        return [];
      }
    }),
  );
  return { events: batches.flat().filter((e) => allowedSet.has(e.type)), perSource };
}

// ── Event → Signal projection (deterministic) ──────────────────────────────────────────────────

const day = (iso: string) => romeParts(new Date(iso)).date;
const hhmm = (iso: string) => romeParts(new Date(iso)).hhmm;

function sourcePriority(value: unknown): Priority {
  const v = String(value ?? '').toLowerCase();
  if (v === 'urgente') return 'urgente';
  if (v === 'alta' || v === 'importante') return 'alta';
  return 'normale';
}

function reasonFor(type: EventType, event: ProactiveEvent): string {
  const def = eventDef(type);
  if (type === 'handover.open')
    return event.payload.assignedToMe
      ? 'Consegna assegnata a te'
      : 'Consegna visibile al tuo ruolo (creata da te o di reparto)';
  if (type === 'note.received') return 'Nota indirizzata a te o a tutti, non ancora letta';
  if (type === 'workflow.pending') return 'Anteprima preparata da te, in attesa del tuo «Conferma»';
  if (def.audience === 'technical')
    return `Segnale tecnico del tuo ruolo (${def.capabilities.join(', ')})`;
  return `Ospite nel tuo ambito · permesso ${def.capabilities[0]}`;
}

function actionFor(type: EventType, event: ProactiveEvent): SignalAction | null {
  const def = eventDef(type);
  if (type === 'workflow.pending')
    return {
      kind: 'resume_workflow',
      workflowId: String(event.payload.workflowId),
      label: 'Riapri l’anteprima',
      residentId: event.residentId,
    };
  if (def.skillId && def.starter)
    return {
      kind: 'skill',
      skillId: def.skillId,
      label: 'Apri nell’Assistente',
      starter: def.starter,
      residentId: event.residentId,
    };
  if (def.classicScreen)
    return { kind: 'classic', screen: def.classicScreen, label: 'Apri la schermata' };
  return null;
}

interface Group {
  key: string;
  type: EventType;
  signal: SignalType;
  priority: Priority;
  priorityRule: string;
  events: ProactiveEvent[];
  title: (events: ProactiveEvent[]) => string;
  detail: (events: ProactiveEvent[]) => string | null;
}

function groupOf(e: ProactiveEvent): Omit<Group, 'events'> {
  const p = e.payload;
  const resident = e.residentId ?? 'none';
  switch (e.type) {
    case 'vitals.recorded':
      return {
        key: `vitals:${resident}:${day(e.occurredAt)}`,
        type: e.type,
        signal: 'NEW_INFORMATION',
        priority: 'normale',
        priorityRule: 'default normale',
        title: (es) =>
          es.length > 1
            ? `${es.length} nuove rilevazioni di parametri`
            : 'Nuova rilevazione di parametri',
        detail: (es) =>
          [
            ...new Set(
              es.flatMap((x) =>
                String(x.payload.parameters ?? '')
                  .split(',')
                  .filter(Boolean),
              ),
            ),
          ].join(', ') || null,
      };
    case 'diary.entry_created':
      return {
        key: `diary:${resident}:${day(e.occurredAt)}`,
        type: e.type,
        signal: 'NEW_INFORMATION',
        priority: sourcePriority(p.priority),
        priorityRule: 'campo priorità della voce di diario (scelto dall’autore)',
        title: (es) =>
          es.length > 1
            ? `${es.length} nuove voci di diario`
            : `Nuova voce di diario (${es[0]!.payload.authorType})`,
        detail: (es) => (es.length === 1 ? ((es[0]!.payload.title as string) ?? null) : null),
      };
    case 'handover.open': {
      const overdue = Boolean(p.overdue);
      return {
        key: `handover:${e.eventId.split(':')[1]}`,
        type: e.type,
        signal: 'HANDOVER_ITEM',
        priority: sourcePriority(p.priority),
        priorityRule: 'campo priorità della consegna (umano / regola handover.create)',
        title: () =>
          `Consegna ${String(p.status).replace('_', ' ')}${overdue ? ' — scadenza superata' : ''}${p.residentHidden ? ' (ospite fuori dal tuo ambito)' : ''}`,
        detail: () =>
          [p.kind, p.dueDate ? `scadenza ${p.dueDate}${p.dueTime ? ` ${p.dueTime}` : ''}` : null]
            .filter(Boolean)
            .join(' · ') || null,
      };
    }
    case 'therapy.prescribed':
      return {
        key: `therapy-new:${e.eventId.split(':')[1]}`,
        type: e.type,
        signal: 'STATE_CHANGE',
        priority: 'normale',
        priorityRule: 'default normale',
        title: () => `Nuova prescrizione: ${p.drug}`,
        detail: () => `${p.kind === 'una_tantum' ? 'una tantum' : 'periodica'} · stato ${p.status}`,
      };
    case 'therapy.changed':
      return {
        key: `therapy-change:${e.eventId.split(':')[1]}`,
        type: e.type,
        signal: 'STATE_CHANGE',
        priority: 'normale',
        priorityRule: 'default normale',
        title: () => `Prescrizione modificata: ${p.drug}`,
        detail: () => `stato ${p.status}`,
      };
    case 'administration.recorded':
      return p.outcome === 'non_erogata'
        ? {
            key: `adm-not-given:${e.eventId.split(':')[1]}`,
            type: e.type,
            signal: 'FOLLOW_UP',
            priority: 'normale',
            priorityRule: 'regola: non erogata → FOLLOW_UP (priorità normale)',
            title: () => `Somministrazione non erogata: ${p.drug}`,
            detail: () => `fascia ${p.slot} · ${p.date}`,
          }
        : {
            key: `adm-given:${resident}:${p.date}`,
            type: e.type,
            signal: 'STATE_CHANGE',
            priority: 'normale',
            priorityRule: 'default normale',
            title: (es) =>
              es.length > 1
                ? `${es.length} somministrazioni registrate`
                : `Somministrazione registrata: ${p.drug}`,
            detail: (es) => [...new Set(es.map((x) => String(x.payload.slot)))].join(', '),
          };
    case 'administration.due':
      return {
        // Upcoming and overdue are DIFFERENT signals: acknowledging «in arrivo» never hides «in ritardo».
        key: `adm-due:${p.date}:${p.slot}:${p.overdue ? 'overdue' : 'upcoming'}`,
        type: e.type,
        signal: p.overdue ? 'OVERDUE_ACTIVITY' : 'PENDING_ACTIVITY',
        priority: p.overdue ? 'alta' : 'normale',
        priorityRule: p.overdue
          ? 'regola orario: slot superato da più di PROACTIVE_OVERDUE_GRACE_MIN e non registrato'
          : 'regola orario: slot entro PROACTIVE_DUE_AHEAD_MIN',
        title: (es) => {
          const residents = new Set(es.map((x) => x.residentId)).size;
          return `${p.overdue ? 'Somministrazioni non ancora registrate' : 'Somministrazioni in arrivo'} — fascia ${p.slot} (${p.time}): ${es.length} per ${residents} ${residents === 1 ? 'ospite' : 'ospiti'}`;
        },
        detail: (es) =>
          [...new Set(es.map((x) => x.residentLabel).filter(Boolean))].slice(0, 6).join(', ') ||
          null,
      };
    case 'document.added':
      return {
        key: `doc:${resident}:${day(e.occurredAt)}`,
        type: e.type,
        signal: 'DOCUMENT_AVAILABLE',
        priority: 'normale',
        priorityRule: 'default normale',
        title: (es) => (es.length > 1 ? `${es.length} nuovi documenti` : 'Nuovo documento'),
        detail: (es) => [...new Set(es.map((x) => String(x.payload.documentType)))].join(', '),
      };
    case 'room.changed':
      return {
        key: `room:${e.eventId.split(':')[1]}`,
        type: e.type,
        signal: 'STATE_CHANGE',
        priority: 'normale',
        priorityRule: 'default normale',
        title: () =>
          `Cambio stanza/letto${p.room ? `: stanza ${p.room}${p.bed ? ` letto ${p.bed}` : ''}` : ''}`,
        detail: () => (p.from ? `dal ${p.from}` : null),
      };
    case 'note.received':
      return {
        key: `note:${e.eventId.split(':')[1]}`,
        type: e.type,
        signal: 'NEW_INFORMATION',
        priority: sourcePriority(p.priority),
        priorityRule: 'campo priorità della nota (scelto dall’autore)',
        title: () => `Nuova nota da ${e.actor.name ?? 'un collega'}`,
        detail: () => null,
      };
    case 'workflow.pending':
      return {
        key: `workflow:${p.workflowId}`,
        type: e.type,
        signal: 'PENDING_ACTIVITY',
        priority: 'normale',
        priorityRule: 'default normale',
        title: () => `Anteprima da confermare: ${p.action ?? p.skillId}`,
        detail: () => 'Nessuna registrazione finché non premi «Conferma».',
      };
    case 'policy.applied':
      return {
        key: `policy:${day(e.occurredAt)}`,
        type: e.type,
        signal: 'STATE_CHANGE',
        priority: 'normale',
        priorityRule: 'default normale',
        title: (es) => {
          const versions = es.map((x) => Number(x.payload.version)).sort((a, b) => b - a);
          return es.length > 1
            ? `Applicate ${es.length} versioni di ruoli e permessi (ultima: ${versions[0]})`
            : `Applicata la versione ${versions[0]} di ruoli e permessi`;
        },
        detail: () => null,
      };
    case 'access.denied_summary':
      return {
        key: `denied:${e.eventId.split(':')[1]}`,
        type: e.type,
        signal: 'ATTENTION_REQUIRED',
        priority: p.overThreshold ? 'alta' : 'normale',
        priorityRule: 'soglia PROACTIVE_DENIED_THRESHOLD sugli accessi negati',
        title: () => `${p.total} operazioni negate dalla policy`,
        detail: () => (p.topActions as string) || null,
      };
  }
}

export function projectSignals(
  events: ProactiveEvent[],
): Omit<Signal, 'status' | 'changedSinceLastView'>[] {
  const groups = new Map<string, Group>();
  for (const e of events) {
    const g = groupOf(e);
    const existing = groups.get(g.key);
    if (existing) {
      existing.events.push(e);
      if (PRIORITY_RANK[g.priority] > PRIORITY_RANK[existing.priority])
        existing.priority = g.priority;
    } else groups.set(g.key, { ...g, events: [e] });
  }
  const signals: Omit<Signal, 'status' | 'changedSinceLastView'>[] = [];
  for (const g of groups.values()) {
    const events = [...g.events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    const latest = events[0]!;
    const residents = new Set(events.map((e) => e.residentId));
    const single = residents.size === 1;
    signals.push({
      signalId: g.key,
      // An ack covers one revision: newer events, more events, a different priority or signal type
      // (e.g. escalation) make a new revision → visible again.
      rev: `${Math.floor(Date.parse(latest.occurredAt) / 1000)}.${events.length}.${g.priority}.${g.signal}`,
      type: g.signal,
      eventType: g.type,
      priority: g.priority,
      priorityRule: g.priorityRule,
      title: g.title(events),
      detail: g.detail(events),
      residentId: single ? latest.residentId : null,
      residentLabel: single ? latest.residentLabel : null,
      occurredAt: latest.occurredAt,
      origin: latest.actor.name ?? (latest.actor.kind === 'system' ? 'Sistema' : 'Operatore'),
      reason: reasonFor(g.type, latest),
      count: events.length,
      sourceEventIds: events.map((e) => e.eventId).slice(0, 50),
      action: (() => {
        const a = actionFor(g.type, latest);
        // A grouped signal across several residents opens the skill without a resident.
        return a && 'residentId' in a && !single ? { ...a, residentId: null } : a;
      })(),
    });
  }
  return signals.sort(
    (a, b) =>
      PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
      Number(b.type === 'OVERDUE_ACTIVITY') - Number(a.type === 'OVERDUE_ACTIVITY') ||
      b.occurredAt.localeCompare(a.occurredAt),
  );
}

// ── Ack / seen state (append-only facts in the audit table) ─────────────────────────────────────

const ACK = 'proactive:ack';
const SEEN = 'proactive:seen';
const STATE_DAYS = 14;

async function viewState(operatorId: string, now: Date) {
  const from = new Date(now.getTime() - STATE_DAYS * 86_400_000);
  const [acks, seen] = await Promise.all([
    prisma.aiAuditEvent.findMany({
      where: { operatorId, actionType: ACK, createdAt: { gte: from } },
      select: { fields: true },
      take: 5000,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.aiAuditEvent.findFirst({
      where: { operatorId, actionType: SEEN },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ]);
  const acked = new Set<string>();
  for (const row of acks)
    for (const f of row.fields) if (f.startsWith('ack:')) acked.add(f.slice(4));
  return { acked, watermark: seen?.createdAt ?? null };
}

// ── Inbox ──────────────────────────────────────────────────────────────────────────────────────

export interface InboxOptions {
  since?: Date;
  /** Write the «shown» audit row (false for internal recomputation, e.g. ack validation). */
  audit?: boolean;
}

export interface Inbox {
  generatedAt: string;
  since: string;
  watermark: string | null;
  signals: Signal[];
  counts: { total: number; toSee: number; new: number; changed: number; byType: Record<string, number> };
  /** Event sources that failed this time (fail closed: their events are omitted, never widened). */
  degraded: string[];
  eligibility: Eligibility;
  metrics: {
    eventsProcessed: number;
    signals: number;
    dedupRatio: number;
    eventTypesAllowed: number;
    eventTypesFiltered: number;
    perSource: CollectResult['perSource'];
    latencyMs: number;
  };
}

interface Who {
  operator: Pick<Operator, 'id' | 'role'>;
  roleId: string;
  authz: AuthzContext;
}

export async function buildInbox(
  who: Who,
  deps: ProactiveDeps,
  options: InboxOptions = {},
): Promise<Inbox> {
  const t0 = Date.now();
  const now = deps.now?.() ?? new Date();
  const env = deps.env ?? process.env;
  const hours = Number.parseInt(env.PROACTIVE_WINDOW_HOURS ?? '', 10);
  const since =
    options.since ??
    new Date(now.getTime() - (Number.isFinite(hours) && hours > 0 ? hours : 24) * 3_600_000);
  const elig = eligibility(who.authz, env);
  const [{ events, perSource }, state] = await Promise.all([
    collect(who.operator, elig.allowed, since, now, deps),
    viewState(who.operator.id, now),
  ]);
  // Without the care-feed capability (administrator) no resident is ever disclosed, not even in
  // personal items (a note addressed to «tutti» that names a resident).
  let careFeed: boolean;
  try {
    careFeed = who.authz.can(CARE_FEED_CAPABILITY).allowed;
  } catch {
    careFeed = false; // fail closed
  }
  const visible = careFeed
    ? events
    : events.map((e) => ({ ...e, residentId: null, residentLabel: null }));
  const projected = projectSignals(visible);
  const watermark = state.watermark;
  const signals: Signal[] = projected.map((s) => {
    const changed = !watermark || Date.parse(s.occurredAt) > watermark.getTime();
    const acked = state.acked.has(`${s.signalId}@${s.rev}`);
    return {
      ...s,
      changedSinceLastView: changed,
      status: acked ? 'preso_visione' : changed ? 'nuovo' : 'visto',
    };
  });
  const byType: Record<string, number> = {};
  for (const s of signals) byType[s.type] = (byType[s.type] ?? 0) + 1;
  const inbox: Inbox = {
    generatedAt: now.toISOString(),
    since: since.toISOString(),
    watermark: watermark?.toISOString() ?? null,
    signals,
    counts: {
      total: signals.length,
      toSee: signals.filter((s) => s.status !== 'preso_visione').length,
      new: signals.filter((s) => s.status === 'nuovo').length,
      changed: signals.filter((s) => s.changedSinceLastView).length,
      byType,
    },
    degraded: Object.entries(perSource)
      .filter(([, m]) => m.error)
      .map(([source]) => source),
    eligibility: elig,
    metrics: {
      eventsProcessed: events.length,
      signals: signals.length,
      dedupRatio: signals.length ? Number((events.length / signals.length).toFixed(2)) : 0,
      eventTypesAllowed: elig.allowed.length,
      eventTypesFiltered: elig.denied.length,
      perSource,
      latencyMs: Date.now() - t0,
    },
  };
  if (options.audit !== false)
    recordAuditEvent({
      requestId: `proactive-${randomUUID()}`,
      operatorId: who.operator.id,
      operatorRole: who.roleId,
      patientId: null,
      actionType: 'proactive:inbox',
      kind: 'read',
      channel: 'ai_assistant',
      fields: [
        `signals:${signals.length}`,
        `to_see:${inbox.counts.toSee}`,
        `events:${events.length}`,
        ...signals.slice(0, 15).map((s) => `signal:${s.signalId}`),
      ].slice(0, 20),
      outcome: signals.length ? 'ok' : 'empty',
    });
  return inbox;
}

/** Acknowledge signals currently visible to the caller (unknown / foreign ids are ignored). */
export async function acknowledge(
  who: Who,
  deps: ProactiveDeps,
  requested: { signalId: string; rev: string }[],
): Promise<{ acknowledged: string[]; ignored: string[] }> {
  const inbox = await buildInbox(who, deps, { audit: false });
  const visible = new Map(inbox.signals.map((s) => [s.signalId, s]));
  const acknowledged: string[] = [];
  const ignored: string[] = [];
  const rows = [];
  for (const r of requested.slice(0, 100)) {
    const s =
      typeof r?.signalId === 'string' && ID.test(r.signalId) ? visible.get(r.signalId) : undefined;
    if (!s || s.rev !== r.rev) {
      ignored.push(String(r?.signalId ?? '').slice(0, 80));
      continue;
    }
    acknowledged.push(s.signalId);
    rows.push({
      requestId: `proactive-ack-${randomUUID()}`,
      operatorId: who.operator.id,
      operatorRole: who.roleId,
      patientId: s.residentId,
      actionType: ACK,
      kind: 'read',
      channel: 'ai_assistant',
      fields: [
        `ack:${s.signalId}@${s.rev}`,
        `type:${s.type}`,
        ...s.sourceEventIds.slice(0, 10).map((e) => `event:${e}`),
      ].slice(0, 20),
      outcome: 'ok',
    });
  }
  // Synchronous (not best-effort): the ack IS the user's state.
  if (rows.length) await prisma.aiAuditEvent.createMany({ data: rows });
  return { acknowledged, ignored };
}

/** «Ho visto»: moves the change-since-last-view watermark to now (append-only fact). */
export async function markSeen(who: Who, deps: ProactiveDeps): Promise<{ watermark: string }> {
  const now = deps.now?.() ?? new Date();
  const row = await prisma.aiAuditEvent.create({
    data: {
      requestId: `proactive-seen-${randomUUID()}`,
      operatorId: who.operator.id,
      operatorRole: who.roleId,
      patientId: null,
      actionType: SEEN,
      kind: 'read',
      channel: 'ai_assistant',
      fields: [`watermark:${now.toISOString()}`],
      outcome: 'ok',
      createdAt: now,
    },
    select: { createdAt: true },
  });
  return { watermark: row.createdAt.toISOString() };
}

/** Records that the user opened a signal's action; returns the (server-side) action. */
export async function openAction(who: Who, deps: ProactiveDeps, signalId: string) {
  if (!ID.test(signalId)) return null;
  const inbox = await buildInbox(who, deps, { audit: false });
  const s = inbox.signals.find((x) => x.signalId === signalId);
  if (!s || !s.action) return null;
  recordAuditEvent({
    requestId: `proactive-open-${randomUUID()}`,
    operatorId: who.operator.id,
    operatorRole: who.roleId,
    patientId: s.residentId,
    actionType: 'proactive:action_opened',
    kind: 'read',
    channel: 'ai_assistant',
    fields: [
      `signal:${s.signalId}`,
      s.action.kind === 'skill' ? `skill:${s.action.skillId}` : `action:${s.action.kind}`,
    ],
    outcome: 'ok',
  });
  return s.action;
}

// ── Shift briefing ─────────────────────────────────────────────────────────────────────────────

export interface Briefing {
  period: { from: string; to: string; shift: string; previousShift: string };
  facts: Signal[];
  byResident: { residentId: string | null; residentLabel: string; signalIds: string[] }[];
  summary: { text: string; composed: boolean; citedSignalIds: string[] };
  fallback: string;
  metrics: {
    eventsProcessed: number;
    signals: number;
    llmCalls: number;
    contextChars: number;
    latencyMs: number;
    aiLatencyMs: number | null;
    eventTypesFiltered: number;
    aiSkipped: 'same_facts' | 'cooldown' | null;
  };
}

/** Fixed wording per event type for the LLM (never user-written text). */
const AI_FACT: Record<string, string> = {
  'vitals.recorded': 'nuove rilevazioni di parametri vitali',
  'diary.entry_created': 'nuove voci di diario',
  'handover.open': 'consegna aperta',
  'therapy.prescribed': 'nuova prescrizione di terapia',
  'therapy.changed': 'prescrizione di terapia modificata',
  'administration.recorded': 'somministrazioni registrate o non erogate',
  'administration.due': 'somministrazioni previste o non ancora registrate',
  'document.added': 'nuovi documenti in cartella',
  'room.changed': 'cambio di stanza o letto',
  'note.received': 'nuova nota da un collega',
  'workflow.pending': 'anteprima in attesa di conferma',
  'policy.applied': 'nuova versione di ruoli e permessi',
  'access.denied_summary': 'operazioni negate dalla policy',
};

const BRIEFING_QUESTION =
  'Briefing di inizio turno per un operatore sanitario. Riassumi in italiano, in al massimo 5 frasi ' +
  'brevi, SOLO i fatti forniti, raggruppando per ospite. Non fare diagnosi, non dare consigli ' +
  'clinici, non assegnare priorità diverse da quelle indicate, non dire che qualcosa è stato fatto ' +
  'da te. Cita tra parentesi l’id di ogni fatto usato.';

function fallbackText(facts: Signal[]): string {
  if (!facts.length) return 'Nessun fatto nuovo o attività in sospeso nel periodo.';
  return facts
    .slice(0, 12)
    .map(
      (s) =>
        `• ${s.residentLabel ? `${s.residentLabel}: ` : ''}${s.title}${s.priority !== 'normale' ? ` [${s.priority}]` : ''}`,
    )
    .join('\n');
}

// Cost guard (per operator): facts are ALWAYS recomputed (policy / scope revocations apply at once);
// only the AI wording is rate-limited. Same facts → the previous summary is reused (no LLM call);
// different facts inside PROACTIVE_BRIEFING_COOLDOWN_S (default 60 s) → deterministic fallback.
const summaryCache = new Map<string, { at: number; signature: string; summary: Briefing['summary'] }>();

/** Test hook: forget cached AI summaries. */
export function resetBriefingCache(): void {
  summaryCache.clear();
}

export async function buildBriefing(who: Who, deps: ProactiveDeps): Promise<Briefing> {
  return composeBriefing(who, deps);
}

async function composeBriefing(who: Who, deps: ProactiveDeps): Promise<Briefing> {
  const t0 = Date.now();
  const now = deps.now?.() ?? new Date();
  const env = deps.env ?? process.env;
  const window = shiftWindow(now);
  const since = new Date(window.previous.start);
  const inbox = await buildInbox(who, deps, { since, audit: false });
  const facts = inbox.signals;
  const byResidentMap = new Map<
    string,
    { residentId: string | null; residentLabel: string; signalIds: string[] }
  >();
  for (const s of facts) {
    const key = s.residentId ?? 'struttura';
    const entry = byResidentMap.get(key) ?? {
      residentId: s.residentId,
      residentLabel: s.residentLabel ?? 'Struttura / più ospiti',
      signalIds: [],
    };
    entry.signalIds.push(s.signalId);
    byResidentMap.set(key, entry);
  }
  const fallback = fallbackText(facts);
  let summary = { text: fallback, composed: false, citedSignalIds: [] as string[] };
  let llmCalls = 0;
  let contextChars = 0;
  let aiLatencyMs: number | null = null;
  const cfg = loadAssistantLlmConfig(env);
  const runtime =
    deps.composeRuntime ??
    (cfg.composeEnabled && cfg.composeModel
      ? (req: Parameters<typeof callComposeRuntime>[0]) => callComposeRuntime(req, cfg)
      : null);
  // Minimum necessary context: already-authorized signals as FIXED templates only — no free text
  // written by users (diary titles, note / handover bodies, drug names typed in a prescription)
  // reaches the LLM; the operator reads the details in the facts list.
  const results = facts.slice(0, 30).map((s) => ({
    id: s.signalId,
    tipo: s.type,
    ospite: s.residentLabel ?? 'più ospiti / struttura',
    quando: `${day(s.occurredAt)} ${hhmm(s.occurredAt)}`,
    fatto: AI_FACT[s.eventType] ?? s.type,
    conteggio: s.count,
    priorita_dalla_fonte: s.priority,
  }));
  // Reuse key = hash of the EXACT context the AI would receive now (residents included): a scope or
  // policy change that alters any disclosed field can never get an old summary back.
  const cacheKey = `${who.operator.id}:${who.roleId}`;
  const signature = createHash('sha256').update(JSON.stringify(results)).digest('hex');
  const cached = summaryCache.get(cacheKey);
  const cooldown = Number.parseInt(env.PROACTIVE_BRIEFING_COOLDOWN_S ?? '', 10);
  const windowMs = (Number.isFinite(cooldown) && cooldown >= 0 ? cooldown : 60) * 1000;
  const reuse = Number.parseInt(env.PROACTIVE_BRIEFING_REUSE_S ?? '', 10);
  const reuseMs = (Number.isFinite(reuse) && reuse >= 0 ? reuse : 600) * 1000;
  let aiSkipped: 'same_facts' | 'cooldown' | null = null;
  if (cached && cached.signature === signature && cached.summary.composed && Date.now() - cached.at < reuseMs) {
    summary = cached.summary;
    aiSkipped = 'same_facts';
  } else if (cached && Date.now() - cached.at < windowMs) {
    aiSkipped = 'cooldown';
  }
  if (runtime && facts.length && !aiSkipped) {
    const sources: SourceReference[] = results.map((r) => ({
      sourceType: 'signal' as SourceReference['sourceType'],
      patientId: '',
      recordId: r.id,
      label: r.fatto,
    }));
    contextChars = JSON.stringify(results).length;
    llmCalls = 1;
    const a0 = Date.now();
    const out = await composeAnswer(BRIEFING_QUESTION, results, sources, {
      callComposeRuntime: runtime,
    });
    aiLatencyMs = Date.now() - a0;
    if (out.composed && out.answerText) {
      const cited = results.map((r) => r.id).filter((id) => out.answerText!.includes(id));
      summary = { text: out.answerText, composed: true, citedSignalIds: cited };
    }
    summaryCache.set(cacheKey, { at: Date.now(), signature, summary });
    if (summaryCache.size > 2000) summaryCache.delete(summaryCache.keys().next().value!);
  }
  const briefing: Briefing = {
    period: {
      from: since.toISOString(),
      to: now.toISOString(),
      shift: window.current.id,
      previousShift: window.previous.id,
    },
    facts,
    byResident: [...byResidentMap.values()],
    summary,
    fallback,
    metrics: {
      eventsProcessed: inbox.metrics.eventsProcessed,
      signals: facts.length,
      llmCalls,
      contextChars,
      latencyMs: Date.now() - t0,
      aiLatencyMs,
      eventTypesFiltered: inbox.metrics.eventTypesFiltered,
      aiSkipped,
    },
  };
  recordAuditEvent({
    requestId: `proactive-briefing-${randomUUID()}`,
    operatorId: who.operator.id,
    operatorRole: who.roleId,
    patientId: null,
    actionType: 'proactive:briefing',
    kind: 'read',
    channel: 'ai_assistant',
    fields: [
      `signals:${facts.length}`,
      `composed:${summary.composed}`,
      `llm_calls:${llmCalls}`,
      `context_chars:${contextChars}`,
      `ai_skipped:${aiSkipped ?? 'no'}`,
      `from:${briefing.period.from}`,
      ...facts.slice(0, 12).map((s) => `signal:${s.signalId}`),
    ].slice(0, 20),
    outcome: facts.length ? 'ok' : 'empty',
  });
  return briefing;
}
