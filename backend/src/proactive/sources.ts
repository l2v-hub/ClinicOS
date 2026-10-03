// Phase 7 — event sources: READ-ONLY projections of facts the existing services already store.
// No new business logic: visibility reuses the existing rules (Resident Access Scope in the query,
// consegne feed rule, notes mailbox rule, therapy slot builder). Each source is bounded (LIMIT) and
// returns structured events — never prose, never free clinical text beyond a short title.

import { prisma } from '../lib/prisma.js';
import type { Operator } from '../ai/auth.js';
import { residentScopeWhere } from '../access-scope/resident-access-scope.js';
import { loadConsegnaFeed } from '../consegne/read-service.js';
import { parseConsegnaFeedQuery } from '../consegne/query.js';
import { diaryEntriesUrgencySettled } from '../patients/diary-ack-service.js';
import { buildTherapySlots } from '../therapies/therapy-slots.js';
import { therapySlotPatientAccess } from '../routes/therapy.js';
import { unreadNotesWhere } from '../routes/note.js';
import type { WorkflowState } from '../skills/types.js';
import type { EventType } from './catalog.js';
import { romeInstant, romeParts } from './time.js';

export interface ProactiveEvent {
  eventId: string;
  type: EventType;
  occurredAt: string;
  residentId: string | null;
  residentLabel: string | null;
  actor: { kind: 'operator' | 'system'; id: string | null; name: string | null };
  /** Structured, minimal payload (ids, enums, counts, short labels). */
  payload: Record<string, string | number | boolean | null>;
}

export interface SourceContext {
  operator: Pick<Operator, 'id' | 'role'>;
  since: Date;
  now: Date;
  limit: number;
  listWorkflows?: (operatorId: string) => WorkflowState[];
  env?: NodeJS.ProcessEnv;
}

type Collector = (ctx: SourceContext) => Promise<ProactiveEvent[]>;

const label = (p: { lastName: string; firstName: string } | null | undefined) =>
  p ? `${p.lastName} ${p.firstName}`.trim() : null;
const short = (text: string | null | undefined, max = 80) =>
  text ? text.replace(/\s+/g, ' ').trim().slice(0, max) : null;
const intEnv = (env: NodeJS.ProcessEnv | undefined, key: string, fallback: number) => {
  const n = Number.parseInt(env?.[key] ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};
const patientSelect = { select: { lastName: true, firstName: true } } as const;

const vitals: Collector = async ({ operator, since, limit }) => {
  const rows = await prisma.patientParameterReading.findMany({
    where: { createdAt: { gte: since }, patient: residentScopeWhere(operator) },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      patientId: true,
      createdAt: true,
      measuredAt: true,
      values: true,
      authorOperatorId: true,
      authorName: true,
      patient: patientSelect,
    },
  });
  return rows
    .filter((r) => r.authorOperatorId !== operator.id)
    .map((r) => ({
      eventId: `vitals.recorded:${r.id}`,
      type: 'vitals.recorded' as const,
      occurredAt: r.createdAt.toISOString(),
      residentId: r.patientId,
      residentLabel: label(r.patient),
      actor: { kind: 'operator' as const, id: r.authorOperatorId, name: r.authorName },
      // Parameter NAMES only: values are read through the vitals skill on drill-down.
      payload: {
        parameters: Object.keys((r.values as Record<string, unknown>) ?? {})
          .filter((k) => k !== 'note')
          .join(','),
        measuredAt: r.measuredAt.toISOString(),
      },
    }));
};

const diary: Collector = async ({ operator, since, limit }) => {
  const rows = await prisma.patientDiaryEntry.findMany({
    where: { createdAt: { gte: since }, patient: residentScopeWhere(operator) },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      patientId: true,
      createdAt: true,
      authorType: true,
      authorName: true,
      title: true,
      priority: true,
      category: true,
      patient: patientSelect,
    },
  });
  // UX2 W8: an urgent entry already taken in charge (first «Ho capito» by a non-author) is no
  // longer flagged as urgent for anyone: it stays as information with normal priority.
  const settled = await diaryEntriesUrgencySettled(
    rows.filter((r) => r.priority === 'urgente').map((r) => r.id),
  );
  return rows.map((r) => ({
    eventId: `diary.entry_created:${r.id}`,
    type: 'diary.entry_created' as const,
    occurredAt: r.createdAt.toISOString(),
    residentId: r.patientId,
    residentLabel: label(r.patient),
    actor: { kind: 'operator' as const, id: null, name: r.authorName },
    payload: {
      authorType: r.authorType,
      priority: settled.has(r.id) ? 'normale' : r.priority,
      urgencyTaken: settled.has(r.id),
      category: r.category,
      // Author-written title (untrusted text): shown as data, fenced before any LLM use.
      title: short(r.title),
    },
  }));
};

const handovers: Collector = async ({ operator, limit, now }) => {
  // Existing feed rule (creator / assignee, facility for supervisors), page size ≤ 20 → cursor.
  // UX2 W8: only ACTIVE urgencies (no «Ho capito» by a non-author yet) become a signal — a
  // handover is otherwise a plain note. The author is not signalled about their own urgency (it is
  // for the next operator to take charge of it).
  const items: Array<Record<string, unknown>> = [];
  let cursor: string | null = null;
  for (let page = 0; page < 5 && items.length < limit; page += 1) {
    const feed = (await loadConsegnaFeed(
      operator as Operator,
      parseConsegnaFeedQuery({ urgency: 'active', limit: '20', ...(cursor ? { cursor } : {}) }),
    )) as { items: Array<Record<string, unknown>>; pageInfo: { nextCursor: string | null } };
    items.push(...feed.items.filter((c) => c.creatoDaId !== operator.id));
    cursor = feed.pageInfo.nextCursor;
    if (!cursor) break;
  }
  // The feed rule decides who gets the HANDOVER (creator / assignee); the RESIDENT it names is
  // disclosed by the signal (and to the AI) only when it is in the reader's Resident Access Scope.
  const named = [
    ...new Set(
      items.map((c) => c.pazienteId).filter((x): x is string => typeof x === 'string' && x !== ''),
    ),
  ];
  const inScope = new Set(
    named.length
      ? (
          await prisma.patient.findMany({
            where: { id: { in: named }, ...residentScopeWhere(operator) },
            select: { id: true },
          })
        ).map((p) => p.id)
      : [],
  );
  const today = romeParts(now).date;
  return items.map((c) => {
    const pid = (c.pazienteId as string) || null;
    const visible = Boolean(pid && inScope.has(pid));
    return {
      eventId: `handover.open:${String(c.id)}`,
      type: 'handover.open' as const,
      // Last change (priority / status edits re-surface an acknowledged handover).
      occurredAt: new Date(String(c.updatedAt ?? c.createdAt)).toISOString(),
      residentId: visible ? pid : null,
      residentLabel: visible ? (c.pazienteNome as string) || null : null,
      actor: {
        kind: 'operator' as const,
        id: (c.creatoDaId as string) ?? null,
        name: (c.creatoDA as string) ?? null,
      },
      payload: {
        priority: String(c.priorita ?? 'normale'),
        kind: String(c.tipo ?? ''),
        dueDate: (c.scadenza as string) ?? null,
        dueTime: (c.oraScadenza as string) ?? null,
        assignedTo: (c.operatoreAssegnato as string) ?? null,
        assignedToMe: c.operatoreAssegnatoId === operator.id,
        overdue: Boolean(c.scadenza && String(c.scadenza) < today),
        residentHidden: Boolean(pid) && !visible,
      },
    };
  });
};

const therapies: Collector = async ({ operator, since, limit }) => {
  const rows = await prisma.patientTherapy.findMany({
    where: {
      OR: [{ createdAt: { gte: since } }, { updatedAt: { gte: since } }],
      patient: residentScopeWhere(operator),
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      patientId: true,
      farmacoNome: true,
      stato: true,
      tipo: true,
      operatoreInseritore: true,
      createdAt: true,
      updatedAt: true,
      patient: patientSelect,
    },
  });
  const events: ProactiveEvent[] = [];
  for (const r of rows) {
    const created = r.createdAt.getTime() >= since.getTime();
    const changed = r.updatedAt.getTime() - r.createdAt.getTime() > 60_000;
    const base = {
      residentId: r.patientId,
      residentLabel: label(r.patient),
      actor: { kind: 'operator' as const, id: null, name: r.operatoreInseritore },
      payload: { drug: short(r.farmacoNome, 60), status: r.stato, kind: r.tipo },
    };
    if (created)
      events.push({
        ...base,
        eventId: `therapy.prescribed:${r.id}`,
        type: 'therapy.prescribed',
        occurredAt: r.createdAt.toISOString(),
      });
    if (changed && r.updatedAt.getTime() >= since.getTime())
      events.push({
        ...base,
        eventId: `therapy.changed:${r.id}:${r.updatedAt.getTime()}`,
        type: 'therapy.changed',
        occurredAt: r.updatedAt.toISOString(),
      });
  }
  return events;
};

const administrationsRecorded: Collector = async ({ operator, since, limit }) => {
  const rows = await prisma.medicationAdministration.findMany({
    where: {
      confirmedAt: { gte: since },
      stato: { in: ['erogata', 'non_erogata'] },
      patient: residentScopeWhere(operator),
    },
    orderBy: { confirmedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      patientId: true,
      farmacoNome: true,
      fascia: true,
      date: true,
      stato: true,
      operatoreId: true,
      operatoreNome: true,
      confirmedAt: true,
      patient: patientSelect,
    },
  });
  return rows
    .filter((r) => r.operatoreId !== operator.id)
    .map((r) => ({
      eventId: `administration.recorded:${r.id}`,
      type: 'administration.recorded' as const,
      occurredAt: (r.confirmedAt ?? new Date()).toISOString(),
      residentId: r.patientId,
      residentLabel: label(r.patient),
      actor: { kind: 'operator' as const, id: r.operatoreId, name: r.operatoreNome },
      payload: { drug: short(r.farmacoNome, 60), slot: r.fascia, date: r.date, outcome: r.stato },
    }));
};

const administrationsDue: Collector = async ({ operator, now, env }) => {
  const { date, hhmm } = romeParts(now);
  const grace = intEnv(env, 'PROACTIVE_OVERDUE_GRACE_MIN', 30);
  const ahead = intEnv(env, 'PROACTIVE_DUE_AHEAD_MIN', 60);
  const slots = await buildTherapySlots(date, therapySlotPatientAccess(operator as Operator));
  const events: ProactiveEvent[] = [];
  for (const slot of slots) {
    const at = romeInstant(date, slot.ora);
    const minutes = (now.getTime() - at.getTime()) / 60_000;
    const overdue = minutes > grace;
    const upcoming = minutes <= 0 && -minutes <= ahead;
    if (!overdue && !upcoming) continue;
    for (const p of slot.patients) {
      for (const a of p.administrations) {
        if (a.status !== 'pending') continue;
        events.push({
          eventId: `administration.due:${a.therapyId}:${date}:${slot.fascia}`,
          type: 'administration.due',
          // When the slot BECAME relevant (entered the ahead window / passed the grace time): never
          // in the future, so «Segna tutto come visto» really clears it until the state changes.
          occurredAt: new Date(at.getTime() + (overdue ? grace : -ahead) * 60_000).toISOString(),
          residentId: p.patientId,
          residentLabel: `${p.lastName} ${p.firstName}`.trim(),
          actor: { kind: 'system', id: null, name: 'Piano terapeutico' },
          payload: {
            slot: slot.fascia,
            time: slot.ora,
            date,
            drug: short(a.drugName, 60),
            overdue,
            now: hhmm,
          },
        });
      }
    }
  }
  return events;
};

const documents: Collector = async ({ operator, since, limit }) => {
  const rows = await prisma.patientDocument.findMany({
    where: { createdAt: { gte: since }, patient: residentScopeWhere(operator) },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      patientId: true,
      documentType: true,
      createdAt: true,
      createdById: true,
      patient: patientSelect,
    },
  });
  return rows
    .filter((r) => r.createdById !== operator.id)
    .map((r) => ({
      eventId: `document.added:${r.id}`,
      type: 'document.added' as const,
      occurredAt: r.createdAt.toISOString(),
      residentId: r.patientId,
      residentLabel: label(r.patient),
      actor: { kind: 'operator' as const, id: r.createdById, name: null },
      payload: { documentType: r.documentType },
    }));
};

const rooms: Collector = async ({ operator, since, limit }) => {
  const rows = await prisma.patientRoomAssignment.findMany({
    where: { createdAt: { gte: since }, patient: residentScopeWhere(operator) },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      patientId: true,
      startDate: true,
      createdAt: true,
      createdById: true,
      bed: { select: { label: true, room: { select: { numero: true } } } },
      patient: patientSelect,
    },
  });
  return rows.map((r) => ({
    eventId: `room.changed:${r.id}`,
    type: 'room.changed' as const,
    occurredAt: r.createdAt.toISOString(),
    residentId: r.patientId,
    residentLabel: label(r.patient),
    actor: { kind: 'operator' as const, id: r.createdById, name: null },
    payload: { room: r.bed?.room?.numero ?? null, bed: r.bed?.label ?? null, from: r.startDate },
  }));
};

const notes: Collector = async ({ operator, limit }) => {
  const rows = await prisma.nota.findMany({
    where: unreadNotesWhere(operator as Operator),
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      autoreId: true,
      autoreNome: true,
      pazienteId: true,
      pazienteNome: true,
      priorita: true,
      createdAt: true,
    },
  });
  // The mailbox rule decides who gets the NOTE; the RESIDENT it names is disclosed by the signal
  // only when that resident is in the reader's Resident Access Scope.
  const named = [...new Set(rows.map((r) => r.pazienteId).filter((x): x is string => Boolean(x)))];
  const inScope = new Set(
    named.length
      ? (
          await prisma.patient.findMany({
            where: { id: { in: named }, ...residentScopeWhere(operator) },
            select: { id: true },
          })
        ).map((p) => p.id)
      : [],
  );
  return rows.map((r) => {
    const visible = Boolean(r.pazienteId && inScope.has(r.pazienteId));
    return {
      eventId: `note.received:${r.id}`,
      type: 'note.received' as const,
      occurredAt: r.createdAt.toISOString(),
      residentId: visible ? r.pazienteId : null,
      residentLabel: visible ? (r.pazienteNome ?? null) : null,
      actor: { kind: 'operator' as const, id: r.autoreId, name: r.autoreNome },
      payload: { priority: r.priorita, residentHidden: Boolean(r.pazienteId) && !visible },
    };
  });
};

const workflows: Collector = async ({ operator, listWorkflows }) => {
  if (!listWorkflows) return [];
  return listWorkflows(operator.id)
    .filter((w) => w.status === 'NEEDS_CONFIRMATION' && w.preview)
    .map((w) => ({
      eventId: `workflow.pending:${w.id}`,
      type: 'workflow.pending' as const,
      occurredAt: w.updatedAt,
      residentId: w.slots.patient?.id ?? null,
      residentLabel: w.slots.patient?.label ?? null,
      actor: { kind: 'operator' as const, id: operator.id, name: null },
      payload: { workflowId: w.id, skillId: w.skillId, action: w.preview?.action ?? null },
    }));
};

const policies: Collector = async ({ since, limit }) => {
  const rows = await prisma.authzPolicyVersion.findMany({
    where: { appliedAt: { gte: since } },
    orderBy: { version: 'desc' },
    take: limit,
    select: { id: true, version: true, appliedAt: true, appliedById: true },
  });
  return rows.map((r) => ({
    eventId: `policy.applied:${r.id}`,
    type: 'policy.applied' as const,
    occurredAt: (r.appliedAt ?? new Date()).toISOString(),
    residentId: null,
    residentLabel: null,
    actor: { kind: 'operator' as const, id: r.appliedById ?? null, name: null },
    payload: { version: r.version },
  }));
};

const deniedSummary: Collector = async ({ since, env, now }) => {
  const groups = await prisma.aiAuditEvent.groupBy({
    by: ['actionType'],
    where: { outcome: 'denied', createdAt: { gte: since } },
    _count: { _all: true },
    _max: { createdAt: true },
    orderBy: { _count: { actionType: 'desc' } },
    take: 10,
  });
  const total = groups.reduce((sum, g) => sum + g._count._all, 0);
  if (!total) return [];
  const threshold = intEnv(env, 'PROACTIVE_DENIED_THRESHOLD', 10);
  // Stable per facility day; the revision moves only when a NEW denied operation happens.
  const latest = groups.reduce((max, g) => Math.max(max, g._max.createdAt?.getTime() ?? 0), 0);
  return [
    {
      eventId: `access.denied_summary:${romeParts(now).date}`,
      type: 'access.denied_summary' as const,
      occurredAt: new Date(latest || now.getTime()).toISOString(),
      residentId: null,
      residentLabel: null,
      actor: { kind: 'system', id: null, name: 'Audit' },
      payload: {
        total,
        overThreshold: total >= threshold,
        topActions: groups
          .slice(0, 3)
          .map((g) => `${g.actionType}×${g._count._all}`)
          .join(', '),
      },
    },
  ];
};

export const COLLECTORS: Record<EventType, Collector> = {
  'vitals.recorded': vitals,
  'diary.entry_created': diary,
  'handover.open': handovers,
  'therapy.prescribed': therapies,
  'therapy.changed': async () => [], // produced by the therapies collector together with prescribed
  'administration.recorded': administrationsRecorded,
  'administration.due': administrationsDue,
  'document.added': documents,
  'room.changed': rooms,
  'note.received': notes,
  'workflow.pending': workflows,
  'policy.applied': policies,
  'access.denied_summary': deniedSummary,
};
