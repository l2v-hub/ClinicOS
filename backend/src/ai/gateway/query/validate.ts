// 016 F3: validate an LLM-emitted query plan against the whitelist. Deny-by-default: any unknown
// entity/field/relation/operator, malformed step, or over-limit plan → null (the caller falls back
// to the deterministic path). Nothing here trusts the LLM; the engine additionally re-checks authz.
// aggregate/groupBy/sort/bindFrom targets are restricted to single-hop SCALAR fields (relational
// aggregation/sorting is not valid Prisma in v1) to avoid runtime crashes.

import type {
  RawQueryPlan,
  RawStep,
  RawFilter,
  RawAggregate,
  RawRunIf,
  RawBindFrom,
  FilterOp,
} from './dsl.js';
import { getEntity, resolveField } from './schema.js';

export interface ValidatedStep {
  id: string;
  entity: string;
  filters: RawFilter[];
  relate: string[];
  aggregate?: RawAggregate;
  select: string[];
  sort: Array<{ field: string; dir: 'asc' | 'desc' }>;
  limit: number;
  runIf?: RawRunIf;
  bindFrom?: RawBindFrom;
}

export interface ValidatedPlan {
  steps: ValidatedStep[];
  primaryStep: string;
}

export const MAX_STEPS = 4;
export const MAX_ROWS = 200;
export const MAX_RELATE = 3;

const OPS = new Set<FilterOp>([
  'eq',
  'in',
  'lt',
  'lte',
  'gt',
  'gte',
  'isNull',
  'contains',
  'between',
  'dateWindow',
]);
const AGG = new Set(['count', 'countDistinct', 'min', 'max', 'avg', 'sum']);
const PRED = new Set(['nonEmpty', 'empty', 'countGte']);
// 'patient' is a reserved logical filter resolved server-side by the engine (name/"current" → id).
const RESERVED_FILTER = new Set(['patient']);

const scalar = (entityFrom: string, path: string): boolean =>
  !path.includes('.') && !!resolveField(entityFrom, path);

function validStep(raw: RawStep, priorIds: Set<string>): ValidatedStep | null {
  if (!raw || typeof raw.id !== 'string' || typeof raw.from !== 'string') return null;
  const entity = getEntity(raw.from);
  if (!entity) return null;

  const filters: RawFilter[] = [];
  for (const f of raw.filter ?? []) {
    if (!f || typeof f.field !== 'string' || !OPS.has(f.op)) return null;
    if (!RESERVED_FILTER.has(f.field) && !resolveField(raw.from, f.field)) return null;
    filters.push(f);
  }

  const relate = raw.relate ?? [];
  if (relate.length > MAX_RELATE) return null;
  for (const r of relate) if (!entity.relations[r]) return null;

  if (raw.aggregate) {
    if (!AGG.has(raw.aggregate.op)) return null;
    if (raw.aggregate.field && !scalar(raw.from, raw.aggregate.field)) return null;
    for (const g of raw.aggregate.groupBy ?? []) if (!scalar(raw.from, g)) return null;
  }

  const select = raw.select ?? [];
  for (const s of select) if (!resolveField(raw.from, s)) return null;

  const sort = (raw.sort ?? []).map((s) => ({
    field: s.field,
    dir: s.dir === 'desc' ? ('desc' as const) : ('asc' as const),
  }));
  for (const s of sort) if (!scalar(raw.from, s.field)) return null;

  const limit = Math.min(
    typeof raw.limit === 'number' && raw.limit > 0 ? raw.limit : MAX_ROWS,
    MAX_ROWS,
  );

  let runIf: RawRunIf | undefined;
  if (raw.runIf) {
    if (!priorIds.has(raw.runIf.step) || !PRED.has(raw.runIf.predicate)) return null;
    runIf = raw.runIf;
  }

  let bindFrom: RawBindFrom | undefined;
  if (raw.bindFrom) {
    if (
      !priorIds.has(raw.bindFrom.step) ||
      typeof raw.bindFrom.field !== 'string' ||
      typeof raw.bindFrom.into !== 'string'
    )
      return null;
    if (!scalar(raw.from, raw.bindFrom.into)) return null; // 'into' must be a scalar field of THIS entity
    bindFrom = raw.bindFrom;
  }

  return {
    id: raw.id,
    entity: raw.from,
    filters,
    relate,
    aggregate: raw.aggregate,
    select,
    sort,
    limit,
    runIf,
    bindFrom,
  };
}

export function validateQueryPlan(raw: unknown): ValidatedPlan | null {
  const p = raw as RawQueryPlan;
  if (!p || !Array.isArray(p.steps) || p.steps.length === 0 || p.steps.length > MAX_STEPS)
    return null;
  const priorIds = new Set<string>();
  const steps: ValidatedStep[] = [];
  for (const s of p.steps) {
    const v = validStep(s, priorIds);
    if (!v) return null;
    if (priorIds.has(v.id)) return null;
    priorIds.add(v.id);
    steps.push(v);
  }
  const primaryStep =
    p.answer?.primaryStep && priorIds.has(p.answer.primaryStep)
      ? p.answer.primaryStep
      : steps[steps.length - 1].id;
  return { steps, primaryStep };
}
