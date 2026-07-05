// 016 F3: execute a VALIDATED query plan against Prisma (never raw SQL). Enforces authz per entity
// (facility flag / patient-authoritative / tenant), evaluates inter-step conditions (runIf) and
// correlation (bindFrom), applies row limits, and returns SOURCE_ONLY results — every row carries a
// SourceReference. Aggregate rows cite the filtered set (the filter is their provenance).

import { prisma } from '../../../lib/prisma.js';
import { GatewayError, type UserContext, type SourceReference } from '../types.js';
import { canFacilityRead, assertTenant, assertPatientAllowed } from '../context.js';
import * as svc from '../services.js';
import { getEntity } from './schema.js';
import type { ValidatedPlan, ValidatedStep } from './validate.js';
import type { RawFilter } from './dsl.js';
import { resolvePatientFilter } from './patient-scope.js';

export interface QueryAnswer { rows: unknown[]; sources: SourceReference[]; }

const SRC_TYPE: Record<string, SourceReference['sourceType']> = {
  room: 'ROOM', bed: 'ROOM', roomAssignment: 'OCCUPANCY', appointment: 'APPOINTMENT',
  therapy: 'THERAPY', patient: 'PATIENT_FIELD', vitalSign: 'VITAL_SIGN',
};

function dateWindowBounds(v: unknown): { from?: Date; to?: Date } {
  const w = v as { lastDays?: number; day?: string; from?: string; to?: string } | undefined;
  if (!w || typeof w !== 'object') return {};
  if (typeof w.lastDays === 'number') { const to = new Date(); const from = new Date(to.getTime() - w.lastDays * 864e5); return { from, to }; }
  if (w.day === 'today' || w.day === 'yesterday') {
    const d = new Date(); if (w.day === 'yesterday') d.setDate(d.getDate() - 1);
    const from = new Date(d); from.setHours(0, 0, 0, 0); const to = new Date(d); to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (w.from || w.to) return { from: w.from ? new Date(w.from) : undefined, to: w.to ? new Date(w.to) : undefined };
  return {};
}

function opToPrisma(f: RawFilter): unknown {
  switch (f.op) {
    case 'eq': return f.value;
    case 'in': return { in: Array.isArray(f.value) ? f.value : [f.value] };
    case 'lt': return { lt: f.value };
    case 'lte': return { lte: f.value };
    case 'gt': return { gt: f.value };
    case 'gte': return { gte: f.value };
    case 'isNull': return null;
    case 'contains': return { contains: String(f.value), mode: 'insensitive' };
    case 'between': { const [a, b] = (f.value as [unknown, unknown]) ?? []; return { gte: a, lte: b }; }
    case 'dateWindow': { const { from, to } = dateWindowBounds(f.value); const c: Record<string, unknown> = {}; if (from) c.gte = from; if (to) c.lte = to; return c; }
    default: return f.value;
  }
}

function whereFromFilters(filters: RawFilter[]): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  for (const f of filters) {
    if (f.field === 'patient') continue; // patient-scoped: injected after resolution
    const [rel, sub] = f.field.split('.');
    const cond = opToPrisma(f);
    if (sub) {
      const existing = (where[rel] as { is?: Record<string, unknown> } | undefined) ?? {};
      where[rel] = { is: { ...(existing.is ?? {}), [sub]: cond } };
    } else {
      where[f.field] = cond;
    }
  }
  return where;
}

function sourceFor(entityName: string, row: Record<string, unknown>): SourceReference {
  const patientId = String((row.patientId as string) ?? '');
  const recordId = String((row.id as string) ?? patientId ?? entityName);
  return { sourceType: SRC_TYPE[entityName] ?? 'PATIENT_FIELD', patientId, recordId, label: entityName };
}

function projectRows(rows: Record<string, unknown>[], select: string[]): unknown[] {
  if (!select.length) return rows;
  return rows.map((r) => {
    const o: Record<string, unknown> = {};
    for (const k of select) { const [rel, sub] = k.split('.'); o[k] = sub ? (r[rel] as Record<string, unknown> | undefined)?.[sub] : r[k]; }
    return o;
  });
}

async function vitalStep(step: ValidatedStep, patientId: string, ctx: UserContext): Promise<QueryAnswer> {
  const label = step.filters.find((f) => f.field === 'etichetta')?.value as string | undefined;
  const systolicMin = step.filters.find((f) => f.field === 'systolic' && (f.op === 'gte' || f.op === 'gt'))?.value as number | undefined;
  const systolicMax = step.filters.find((f) => f.field === 'systolic' && (f.op === 'lte' || f.op === 'lt'))?.value as number | undefined;
  const win = step.filters.find((f) => f.op === 'dateWindow')?.value;
  const { from, to } = dateWindowBounds(win);
  const r = await svc.getPatientVitalSigns({ patientId, label, systolicMin, systolicMax } as never, ctx);
  const data = (r.data as Array<{ rilevato?: string }>).filter((v) => {
    const t = v.rilevato ? new Date(v.rilevato).getTime() : 0;
    return (!from || t >= from.getTime()) && (!to || t <= to.getTime());
  });
  return { rows: data, sources: r.sourceRefs.slice(0, data.length) };
}

async function runStep(step: ValidatedStep, ctx: UserContext, env: NodeJS.ProcessEnv, currentPatientId?: string): Promise<QueryAnswer> {
  assertTenant(ctx, env);
  const entity = getEntity(step.entity)!;
  if (entity.authz === 'facility' && !canFacilityRead(env)) throw new GatewayError('forbidden', 'Funzioni di struttura non abilitate');

  let filters = step.filters;
  if (entity.authz === 'patient-scoped') {
    const pid = await resolvePatientFilter(filters, ctx, currentPatientId);
    if (!pid) throw new GatewayError('bad_request', 'Paziente non risolto per la query');
    assertPatientAllowed(ctx, pid);
    if (step.entity === 'vitalSign') return vitalStep(step, pid, ctx);
    filters = filters.filter((f) => f.field !== 'patient').concat([{ field: entity.patientIdField!, op: 'eq', value: pid }]);
  }

  const delegate = (prisma as unknown as Record<string, any>)[entity.prismaModel!];
  const where = whereFromFilters(filters);

  if (step.aggregate) {
    const a = step.aggregate;
    if (a.op === 'count') return { rows: [{ value: await delegate.count({ where }) }], sources: [] };
    if (a.op === 'countDistinct') { const grp = await delegate.groupBy({ by: [a.field!], where }); return { rows: [{ value: grp.length }], sources: [] }; }
    if (a.groupBy?.length) { const grp = await delegate.groupBy({ by: a.groupBy, where, _count: true }); return { rows: grp, sources: [] }; }
    const agg = await delegate.aggregate({ where, [`_${a.op}`]: { [a.field!]: true } });
    return { rows: [{ value: agg[`_${a.op}`][a.field!] }], sources: [] };
  }

  const relSet = new Set<string>(step.relate);
  for (const s of step.select) { const [rel, sub] = s.split('.'); if (sub) relSet.add(rel); }
  const include = relSet.size ? Object.fromEntries([...relSet].map((r) => [r, true])) : undefined;
  const orderBy = step.sort.map((s) => ({ [s.field]: s.dir }));
  const rows: Record<string, unknown>[] = await delegate.findMany({ where, orderBy: orderBy.length ? orderBy : undefined, take: step.limit, include });
  return { rows: projectRows(rows, step.select), sources: rows.map((r) => sourceFor(step.entity, r)) };
}

function dedupeSources(s: SourceReference[]): SourceReference[] {
  const seen = new Set<string>(); const out: SourceReference[] = [];
  for (const x of s) { const k = `${x.sourceType}:${x.recordId}`; if (!seen.has(k)) { seen.add(k); out.push(x); } }
  return out;
}

/** Execute a validated multi-step plan. Steps run in order; runIf gates a step on a prior step's
 *  result; bindFrom feeds a prior step's ids into this step's filter (correlation). */
export async function runQueryPlan(plan: ValidatedPlan, ctx: UserContext, env: NodeJS.ProcessEnv = process.env, currentPatientId?: string): Promise<QueryAnswer> {
  const results = new Map<string, QueryAnswer>();
  for (const original of plan.steps) {
    let step = original;
    if (step.runIf) {
      const prev = results.get(step.runIf.step);
      const n = prev ? prev.rows.length : 0;
      const ok = step.runIf.predicate === 'nonEmpty' ? n > 0 : step.runIf.predicate === 'empty' ? n === 0 : n >= (step.runIf.value ?? 1);
      if (!ok) { results.set(step.id, { rows: [], sources: [] }); continue; }
    }
    if (step.bindFrom) {
      const prev = results.get(step.bindFrom.step);
      const vals = (prev?.rows ?? []).map((r) => (r as Record<string, unknown>)[step.bindFrom!.field]).filter((v) => v != null);
      step = { ...step, filters: [...step.filters, { field: step.bindFrom.into, op: 'in', value: vals }] };
    }
    results.set(step.id, await runStep(step, ctx, env, currentPatientId));
  }
  const primary = results.get(plan.primaryStep) ?? { rows: [], sources: [] };
  const allSources = [...results.values()].flatMap((r) => r.sources);
  return { rows: primary.rows, sources: dedupeSources(allSources) };
}
