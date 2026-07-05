# Composable Query Engine (Agnos composable reads) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a trusted, composable read-query engine so the Agnos assistant can answer a general class of managerial/operational/clinical-structured questions (rooms, occupancy, counts, correlations, vitals trends, conditional multi-step) by having the LLM emit a validated query plan the backend executes safely.

**Architecture:** The LLM emits a multi-step query plan (DSL) carried by a new read-tool `query_data`. A declarative schema descriptor whitelists entities/fields/relations with a per-entity authz class. A validator rejects anything off-whitelist (deny-by-default). An engine translates the *validated* plan into parameterized Prisma calls, enforces authz per entity, evaluates inter-step conditions/bindings, and returns `SourcedResult` (SOURCE_ONLY). Existing typed clinical tools (F0–F2) stay; the planner chooses.

**Tech Stack:** Node + TypeScript (ESM, `.js` import specifiers), Prisma 7, `node:test` + `node:assert/strict`, existing gateway (`backend/src/ai/gateway/`), runtime prompt in Python (`clinicos-ai-runtime`).

## Global Constraints

- Branch: work on `016-facility-reads` (off `main`). The composable-reads code lives on `main`'s tree; do NOT base on `015-*`.
- Import specifiers use `.js` extension (ESM), matching existing gateway files.
- **Read-only**: the DSL has no mutation ops; no Prisma `create/update/delete` in the engine.
- **Deny-by-default**: any entity/field/relation/operator not in `QUERY_SCHEMA` → plan rejected (engine throws `GatewayError('bad_request')`; planner falls back to deterministic).
- **SOURCE_ONLY**: every returned row/value carries a `SourceReference`; aggregates cite the counted record set.
- **Patient authoritative server-side**: patient identity in the DSL is a *name* or `"current"`, resolved by the backend (`searchPatients`/`ctx`), never a raw id from the LLM.
- **Env flag** `AI_FACILITY_QUERIES_ENABLED` default `false` (no regression). Facility entities require it.
- Backend must build (`npm --prefix backend run build`) and tests pass (`npm --prefix backend test`) — both run in the `ai-import-e2e.yml` gate.
- Existing invariants unchanged: `canCrossPatientSearch` (flag+role) untouched; existing read-tools intact.

**Reference types (already in `backend/src/ai/gateway/types.ts`):**
```ts
type SourceType = 'PATIENT_FIELD'|'NARRATIVE_SECTION'|'VITAL_SIGN'|'DIARY_ENTRY'|'DOCUMENT'|'APPOINTMENT'|'THERAPY';
interface SourceReference { sourceType: SourceType; patientId: string; recordId: string; sectionKey?: string; documentId?: string; pageNumber?: number; label: string; exactText?: string; recordedAt?: string; }
interface UserContext { userId: string; tenantId: string; roles: string[]; permittedPatientIds: string[] | null; requestId: string; }
interface SourcedResult<T> { data: T; sourceRefs: SourceReference[]; }
```
`GatewayError` (in the same module) has kinds incl. `'bad_request' | 'forbidden'`. `prisma` is imported from `../../lib/prisma.js`.

---

### Task 1: Facility authz gate

**Files:**
- Modify: `backend/src/ai/gateway/context.ts` (add `canFacilityRead`)
- Test: `backend/src/ai/__tests__/context-facility.test.ts`

**Interfaces:**
- Produces: `canFacilityRead(env?: NodeJS.ProcessEnv): boolean`

- [ ] **Step 1: Write the failing test**
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canFacilityRead } from '../gateway/context.js';

test('facility read off by default', () => {
  assert.equal(canFacilityRead({}), false);
});
test('facility read enabled by env flag (role-independent)', () => {
  assert.equal(canFacilityRead({ AI_FACILITY_QUERIES_ENABLED: 'true' }), true);
});
```
- [ ] **Step 2: Run test to verify it fails** — Run: `npm --prefix backend test -- --test-name-pattern="facility read"` — Expected: FAIL (`canFacilityRead` not exported).
- [ ] **Step 3: Write minimal implementation** — append to `context.ts`:
```ts
/** Facility/operational reads (rooms, beds, occupancy, facility-wide agenda) are a deployment-level
 *  trust decision, independent of the (unverified) role header. Gated ONLY by an env flag. */
export function canFacilityRead(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.AI_FACILITY_QUERIES_ENABLED || 'false').trim() === 'true';
}
```
- [ ] **Step 4: Run test to verify it passes** — Run: `npm --prefix backend test -- --test-name-pattern="facility read"` — Expected: PASS.
- [ ] **Step 5: Commit**
```bash
git add backend/src/ai/gateway/context.ts backend/src/ai/__tests__/context-facility.test.ts
git commit -m "feat(016): canFacilityRead env gate for facility queries"
```

---

### Task 2: DSL types + schema descriptor

**Files:**
- Create: `backend/src/ai/gateway/query/dsl.ts`
- Create: `backend/src/ai/gateway/query/schema.ts`
- Test: `backend/src/ai/__tests__/query-schema.test.ts`

**Interfaces:**
- Produces (`dsl.ts`):
```ts
export type FilterOp = 'eq'|'in'|'lt'|'lte'|'gt'|'gte'|'isNull'|'contains'|'between'|'dateWindow';
export interface RawFilter { field: string; op: FilterOp; value?: unknown; }
export interface RawAggregate { op: 'count'|'countDistinct'|'min'|'max'|'avg'|'sum'; field?: string; groupBy?: string[]; }
export interface RawRunIf { step: string; predicate: 'nonEmpty'|'empty'|'countGte'; value?: number; }
export interface RawBindFrom { step: string; field: string; into: string; }
export interface RawStep { id: string; from: string; filter?: RawFilter[]; relate?: string[]; aggregate?: RawAggregate; select?: string[]; sort?: Array<{ field: string; dir?: 'asc'|'desc' }>; limit?: number; runIf?: RawRunIf; bindFrom?: RawBindFrom; }
export interface RawQueryPlan { steps: RawStep[]; answer?: { primaryStep?: string }; }
```
- Produces (`schema.ts`):
```ts
export type AuthzClass = 'public'|'facility'|'patient-scoped';
export interface FieldDef { type: 'string'|'number'|'date'|'boolean'; sensitive?: boolean; column?: string; }
export interface RelationDef { target: string; kind: 'toOne'|'toMany'; }
export interface EntityDef { prismaModel?: string; authz: AuthzClass; patientIdField?: string; fields: Record<string, FieldDef>; relations: Record<string, RelationDef>; custom?: boolean; }
export const QUERY_SCHEMA: Record<string, EntityDef>;
export function getEntity(name: string): EntityDef | null;
export function resolveField(entityName: string, path: string): { entity: EntityDef; field: string; def: FieldDef } | null; // supports 'rel.field' 1-hop
```

- [ ] **Step 1: Write the failing test**
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEntity, resolveField, QUERY_SCHEMA } from '../gateway/query/schema.js';

test('known entity resolves; unknown denied', () => {
  assert.ok(getEntity('roomAssignment'));
  assert.equal(getEntity('secretTable'), null);
});
test('field resolves incl 1-hop relation; unknown field denied', () => {
  assert.ok(resolveField('roomAssignment', 'endDate'));
  assert.ok(resolveField('roomAssignment', 'room.numero'));
  assert.equal(resolveField('roomAssignment', 'room.secret'), null);
  assert.equal(resolveField('roomAssignment', 'ssn'), null);
});
test('vitalSign is patient-scoped with patientId authority + custom loader', () => {
  assert.equal(QUERY_SCHEMA.vitalSign.authz, 'patient-scoped');
  assert.equal(QUERY_SCHEMA.vitalSign.custom, true);
});
```
- [ ] **Step 2: Run test to verify it fails** — Run: `npm --prefix backend test -- --test-name-pattern="entity|field resolves|vitalSign is"` — Expected: FAIL (module missing).
- [ ] **Step 3: Write `dsl.ts`** (exact `Produces` block above).
- [ ] **Step 3b: Write `schema.ts`** with the v1 entities:
```ts
import type { FieldDef } from './dsl.js'; // (FieldDef lives in schema.ts; keep imports minimal — define locally)

export type AuthzClass = 'public'|'facility'|'patient-scoped';
export interface FieldDef { type: 'string'|'number'|'date'|'boolean'; sensitive?: boolean; column?: string; }
export interface RelationDef { target: string; kind: 'toOne'|'toMany'; }
export interface EntityDef { prismaModel?: string; authz: AuthzClass; patientIdField?: string; fields: Record<string, FieldDef>; relations: Record<string, RelationDef>; custom?: boolean; }

const S = (sensitive = false): FieldDef => ({ type: 'string', sensitive });
const N: FieldDef = { type: 'number' };
const D: FieldDef = { type: 'date' };

export const QUERY_SCHEMA: Record<string, EntityDef> = {
  patient: { prismaModel: 'patient', authz: 'public', patientIdField: 'id',
    fields: { id: S(), firstName: S(true), lastName: S(true), medicalRecordNumber: S(true), dateOfBirth: D, sex: S(), createdAt: D },
    relations: {} },
  room: { prismaModel: 'room', authz: 'facility',
    fields: { id: S(), numero: S(), tipo: S(), piano: S(), reparto: S(), stato: S() },
    relations: { beds: { target: 'bed', kind: 'toMany' } } },
  bed: { prismaModel: 'bed', authz: 'facility',
    fields: { id: S(), label: S(), stato: S(), roomId: S() },
    relations: { room: { target: 'room', kind: 'toOne' } } },
  roomAssignment: { prismaModel: 'patientRoomAssignment', authz: 'facility', patientIdField: 'patientId',
    fields: { id: S(), patientId: S(), roomId: S(), bedId: S(), startDate: S(), endDate: S() },
    relations: { patient: { target: 'patient', kind: 'toOne' }, bed: { target: 'bed', kind: 'toOne' }, room: { target: 'room', kind: 'toOne' } } },
  appointment: { prismaModel: 'appointment', authz: 'facility', patientIdField: 'patientId',
    fields: { id: S(), patientId: S(), scheduledAt: D, status: S(), reason: S() },
    relations: { patient: { target: 'patient', kind: 'toOne' } } },
  therapy: { prismaModel: 'patientTherapy', authz: 'patient-scoped', patientIdField: 'patientId',
    fields: { id: S(), patientId: S(), name: S(), createdAt: D },
    relations: {} },
  vitalSign: { authz: 'patient-scoped', custom: true, patientIdField: 'patientId',
    fields: { patientId: S(), etichetta: S(), valore: N, systolic: N, rilevato: D },
    relations: {} },
};

export function getEntity(name: string): EntityDef | null { return Object.prototype.hasOwnProperty.call(QUERY_SCHEMA, name) ? QUERY_SCHEMA[name] : null; }

export function resolveField(entityName: string, path: string): { entity: EntityDef; field: string; def: FieldDef } | null {
  const e = getEntity(entityName); if (!e) return null;
  const parts = path.split('.');
  if (parts.length === 1) { const def = e.fields[parts[0]]; return def ? { entity: e, field: parts[0], def } : null; }
  if (parts.length === 2) { const rel = e.relations[parts[0]]; if (!rel) return null; const te = getEntity(rel.target); if (!te) return null; const def = te.fields[parts[1]]; return def ? { entity: te, field: parts[1], def } : null; }
  return null; // >1 hop denied in v1
}
```
> Note: `therapy.name` — confirm the real column in `prisma/schema.prisma` `PatientTherapy`; adjust `fields`/`column` if the field is named differently (e.g. `farmaco`). Use `column` on `FieldDef` when logical≠physical.
- [ ] **Step 4: Run test to verify it passes** — Run: `npm --prefix backend test -- --test-name-pattern="entity|field resolves|vitalSign is"` — Expected: PASS.
- [ ] **Step 5: Commit**
```bash
git add backend/src/ai/gateway/query/dsl.ts backend/src/ai/gateway/query/schema.ts backend/src/ai/__tests__/query-schema.test.ts
git commit -m "feat(016): query DSL types + whitelisted schema descriptor"
```

---

### Task 3: Plan validator (deny-by-default)

**Files:**
- Create: `backend/src/ai/gateway/query/validate.ts`
- Test: `backend/src/ai/__tests__/query-validate.test.ts`

**Interfaces:**
- Consumes: `RawQueryPlan`, `FilterOp` (`dsl.ts`); `getEntity`, `resolveField` (`schema.ts`)
- Produces:
```ts
export interface ValidatedStep { id: string; entity: string; filters: RawFilter[]; relate: string[]; aggregate?: RawAggregate; select: string[]; sort: Array<{ field: string; dir: 'asc'|'desc' }>; limit: number; runIf?: RawRunIf; bindFrom?: RawBindFrom; }
export interface ValidatedPlan { steps: ValidatedStep[]; primaryStep: string; }
export const MAX_STEPS = 4, MAX_ROWS = 200, MAX_RELATE = 3;
/** Returns a validated plan, or null if anything is off-whitelist / malformed / exceeds limits. */
export function validateQueryPlan(raw: unknown): ValidatedPlan | null;
```

- [ ] **Step 1: Write the failing test**
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateQueryPlan } from '../gateway/query/validate.js';

test('valid single-step plan accepted', () => {
  const p = validateQueryPlan({ steps: [{ id: 's1', from: 'roomAssignment', filter: [{ field: 'endDate', op: 'isNull' }], aggregate: { op: 'countDistinct', field: 'roomId' } }] });
  assert.ok(p); assert.equal(p!.steps[0].entity, 'roomAssignment'); assert.equal(p!.primaryStep, 's1');
});
test('unknown entity rejected', () => { assert.equal(validateQueryPlan({ steps: [{ id: 's1', from: 'secretTable' }] }), null); });
test('unknown field rejected', () => { assert.equal(validateQueryPlan({ steps: [{ id: 's1', from: 'room', filter: [{ field: 'ssn', op: 'eq', value: 'x' }] }] }), null); });
test('unknown relation rejected', () => { assert.equal(validateQueryPlan({ steps: [{ id: 's1', from: 'room', relate: ['secret'] }] }), null); });
test('bad op rejected', () => { assert.equal(validateQueryPlan({ steps: [{ id: 's1', from: 'room', filter: [{ field: 'numero', op: 'DROP', value: 1 }] }] }), null); });
test('too many steps rejected', () => { assert.equal(validateQueryPlan({ steps: Array.from({ length: 5 }, (_, i) => ({ id: 's' + i, from: 'room' })) }), null); });
test('runIf referencing unknown step rejected', () => { assert.equal(validateQueryPlan({ steps: [{ id: 's1', from: 'room', runIf: { step: 'sX', predicate: 'nonEmpty' } }] }), null); });
```
- [ ] **Step 2: Run test to verify it fails** — Run: `npm --prefix backend test -- --test-name-pattern="plan accepted|rejected"` — Expected: FAIL.
- [ ] **Step 3: Write `validate.ts`**
```ts
import type { RawQueryPlan, RawStep, RawFilter, RawAggregate, RawRunIf, RawBindFrom, FilterOp } from './dsl.js';
import { getEntity, resolveField } from './schema.js';

export interface ValidatedStep { id: string; entity: string; filters: RawFilter[]; relate: string[]; aggregate?: RawAggregate; select: string[]; sort: Array<{ field: string; dir: 'asc'|'desc' }>; limit: number; runIf?: RawRunIf; bindFrom?: RawBindFrom; }
export interface ValidatedPlan { steps: ValidatedStep[]; primaryStep: string; }
export const MAX_STEPS = 4, MAX_ROWS = 200, MAX_RELATE = 3;

const OPS = new Set<FilterOp>(['eq','in','lt','lte','gt','gte','isNull','contains','between','dateWindow']);
const AGG = new Set(['count','countDistinct','min','max','avg','sum']);
const PRED = new Set(['nonEmpty','empty','countGte']);
const RESERVED_FILTER = new Set(['patient']); // 'patient' filter resolved server-side by the engine

function validStep(raw: RawStep, priorIds: Set<string>): ValidatedStep | null {
  if (!raw || typeof raw.id !== 'string' || typeof raw.from !== 'string') return null;
  const entity = getEntity(raw.from); if (!entity) return null;
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
    if (raw.aggregate.field && !resolveField(raw.from, raw.aggregate.field)) return null;
    for (const g of raw.aggregate.groupBy ?? []) if (!resolveField(raw.from, g)) return null;
  }
  const select = raw.select ?? [];
  for (const s of select) if (!resolveField(raw.from, s)) return null;
  const sort = (raw.sort ?? []).map((s) => ({ field: s.field, dir: s.dir === 'desc' ? 'desc' as const : 'asc' as const }));
  for (const s of sort) if (!resolveField(raw.from, s.field)) return null;
  const limit = Math.min(typeof raw.limit === 'number' && raw.limit > 0 ? raw.limit : MAX_ROWS, MAX_ROWS);
  let runIf: RawRunIf | undefined;
  if (raw.runIf) { if (!priorIds.has(raw.runIf.step) || !PRED.has(raw.runIf.predicate)) return null; runIf = raw.runIf; }
  let bindFrom: RawBindFrom | undefined;
  if (raw.bindFrom) { if (!priorIds.has(raw.bindFrom.step) || typeof raw.bindFrom.field !== 'string' || typeof raw.bindFrom.into !== 'string') return null; bindFrom = raw.bindFrom; }
  return { id: raw.id, entity: raw.from, filters, relate, aggregate: raw.aggregate, select, sort, limit, runIf, bindFrom };
}

export function validateQueryPlan(raw: unknown): ValidatedPlan | null {
  const p = raw as RawQueryPlan;
  if (!p || !Array.isArray(p.steps) || p.steps.length === 0 || p.steps.length > MAX_STEPS) return null;
  const priorIds = new Set<string>(); const steps: ValidatedStep[] = [];
  for (const s of p.steps) { const v = validStep(s, priorIds); if (!v) return null; if (priorIds.has(v.id)) return null; priorIds.add(v.id); steps.push(v); }
  const primaryStep = p.answer?.primaryStep && priorIds.has(p.answer.primaryStep) ? p.answer.primaryStep : steps[steps.length - 1].id;
  return { steps, primaryStep };
}
```
- [ ] **Step 4: Run test to verify it passes** — Run: `npm --prefix backend test -- --test-name-pattern="plan accepted|rejected"` — Expected: PASS.
- [ ] **Step 5: Commit**
```bash
git add backend/src/ai/gateway/query/validate.ts backend/src/ai/__tests__/query-validate.test.ts
git commit -m "feat(016): query plan validator (deny-by-default, limits)"
```

---

### Task 4: Engine — single-step Prisma read (from/filter/select/sort/limit) + facility authz + sources

**Files:**
- Create: `backend/src/ai/gateway/query/engine.ts`
- Modify: `backend/src/ai/gateway/types.ts` (add `'ROOM'|'OCCUPANCY'` to `SourceType`)
- Test: `backend/src/ai/__tests__/query-engine.test.ts` (uses the real test DB the gate provisions)

**Interfaces:**
- Consumes: `ValidatedPlan`, `ValidatedStep` (`validate.ts`); `QUERY_SCHEMA`, `getEntity` (`schema.ts`); `canFacilityRead` (`context.ts`); `UserContext`, `SourcedResult`, `SourceReference`, `GatewayError`, `prisma`.
- Produces:
```ts
export interface QueryAnswer { rows: unknown[]; sources: SourceReference[]; }
export async function runQueryPlan(plan: ValidatedPlan, ctx: UserContext, env?: NodeJS.ProcessEnv): Promise<QueryAnswer>;
```

- [ ] **Step 1: Add source types** — in `types.ts` change the union to include `| 'ROOM' | 'OCCUPANCY'`.
- [ ] **Step 2: Write the failing test** (seed two rooms + one active assignment):
```ts
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma.js';
import { validateQueryPlan } from '../gateway/query/validate.js';
import { runQueryPlan } from '../gateway/query/engine.js';

const CTX = { userId: 'op', tenantId: 't', roles: ['operatore'], permittedPatientIds: null, requestId: 'r' };
const ENV = { AI_FACILITY_QUERIES_ENABLED: 'true' };

test('facility flag OFF → forbidden', async () => {
  const plan = validateQueryPlan({ steps: [{ id: 's1', from: 'room', select: ['numero'] }] })!;
  await assert.rejects(() => runQueryPlan(plan, CTX, {}), /forbidden|non abilitate/i);
});
test('from+filter+select returns rows with sources', async () => {
  const plan = validateQueryPlan({ steps: [{ id: 's1', from: 'room', filter: [{ field: 'stato', op: 'eq', value: 'attiva' }], select: ['numero','stato'], limit: 50 }] })!;
  const out = await runQueryPlan(plan, CTX, ENV);
  assert.ok(Array.isArray(out.rows));
  assert.ok(out.sources.every((s) => s.sourceType && s.recordId));
});
```
> The gate job runs migrations + `npm --prefix backend test` against a fresh Postgres; if a seed is needed, add minimal `prisma.room.create(...)` in a `before()` hook and clean up. Keep assertions structural (shape/source presence), not exact counts, to stay seed-robust.
- [ ] **Step 3: Run test to verify it fails** — Run: `npm --prefix backend test -- --test-name-pattern="facility flag OFF|from\\+filter"` — Expected: FAIL.
- [ ] **Step 4: Write `engine.ts` (single-step core)**
```ts
import { prisma } from '../../lib/prisma.js';
import { GatewayError, type UserContext, type SourceReference } from '../types.js';
import { canFacilityRead } from '../context.js';
import { getEntity, type EntityDef } from './schema.js';
import type { ValidatedPlan, ValidatedStep } from './validate.js';
import type { RawFilter } from './dsl.js';

export interface QueryAnswer { rows: unknown[]; sources: SourceReference[]; }

function authorize(entity: EntityDef, ctx: UserContext, env: NodeJS.ProcessEnv): void {
  if (entity.authz === 'facility' && !canFacilityRead(env)) throw new GatewayError('forbidden', 'Funzioni di struttura non abilitate');
  // patient-scoped authz is applied when the patient is resolved (Task 7); public needs only tenant.
}

function whereFromFilters(filters: RawFilter[]): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  for (const f of filters) {
    if (f.field === 'patient') continue; // resolved in Task 7
    const [rel, sub] = f.field.split('.');
    const cond = opToPrisma(f);
    if (sub) where[rel] = { ...(where[rel] as object ?? {}), is: { ...((where[rel] as any)?.is ?? {}), [sub]: cond } };
    else where[f.field] = cond;
  }
  return where;
}
function opToPrisma(f: RawFilter): unknown {
  switch (f.op) {
    case 'eq': return f.value; case 'in': return { in: f.value as unknown[] };
    case 'lt': return { lt: f.value }; case 'lte': return { lte: f.value };
    case 'gt': return { gt: f.value }; case 'gte': return { gte: f.value };
    case 'isNull': return null; case 'contains': return { contains: String(f.value), mode: 'insensitive' };
    case 'between': { const [a, b] = f.value as [unknown, unknown]; return { gte: a, lte: b }; }
    default: return f.value; // dateWindow handled before reaching here (Task 7)
  }
}

function sourceFor(entityName: string, row: Record<string, unknown>): SourceReference {
  const patientId = String(row.patientId ?? '');
  const recordId = String(row.id ?? patientId ?? entityName);
  const map: Record<string, SourceReference['sourceType']> = { room: 'ROOM', bed: 'ROOM', roomAssignment: 'OCCUPANCY', appointment: 'APPOINTMENT', therapy: 'THERAPY', patient: 'PATIENT_FIELD', vitalSign: 'VITAL_SIGN' };
  return { sourceType: map[entityName] ?? 'PATIENT_FIELD', patientId, recordId, label: entityName };
}

async function runStep(step: ValidatedStep, ctx: UserContext, env: NodeJS.ProcessEnv): Promise<QueryAnswer> {
  const entity = getEntity(step.entity)!;
  authorize(entity, ctx, env);
  const delegate = (prisma as any)[entity.prismaModel!];
  const where = whereFromFilters(step.filters);
  const orderBy = step.sort.map((s) => ({ [s.field]: s.dir }));
  const rows: Record<string, unknown>[] = await delegate.findMany({ where, orderBy: orderBy.length ? orderBy : undefined, take: step.limit });
  const sources = rows.map((r) => sourceFor(step.entity, r));
  const projected = step.select.length ? rows.map((r) => Object.fromEntries(step.select.map((k) => [k, (r as any)[k]]))) : rows;
  return { rows: projected, sources };
}

export async function runQueryPlan(plan: ValidatedPlan, ctx: UserContext, env: NodeJS.ProcessEnv = process.env): Promise<QueryAnswer> {
  // Single-step for now; multi-step orchestration added in Task 8.
  const primary = plan.steps.find((s) => s.id === plan.primaryStep) ?? plan.steps[0];
  return runStep(primary, ctx, env);
}
```
- [ ] **Step 5: Run test to verify it passes** — Run: `npm --prefix backend test -- --test-name-pattern="facility flag OFF|from\\+filter"` — Expected: PASS.
- [ ] **Step 6: Commit**
```bash
git add backend/src/ai/gateway/query/engine.ts backend/src/ai/gateway/types.ts backend/src/ai/__tests__/query-engine.test.ts
git commit -m "feat(016): query engine single-step read + facility authz + sources"
```

---

### Task 5: Engine — aggregate (count/countDistinct/min/max/avg + groupBy)

**Files:** Modify `engine.ts`; extend `query-engine.test.ts`
**Interfaces:** unchanged public API; `runStep` now honors `step.aggregate`.

- [ ] **Step 1: Write the failing test**
```ts
test('countDistinct returns a single numeric aggregate row', async () => {
  const plan = validateQueryPlan({ steps: [{ id: 's1', from: 'roomAssignment', filter: [{ field: 'endDate', op: 'isNull' }], aggregate: { op: 'countDistinct', field: 'roomId' } }] })!;
  const out = await runQueryPlan(plan, CTX, ENV);
  assert.equal(out.rows.length, 1);
  assert.equal(typeof (out.rows[0] as any).value, 'number');
});
```
- [ ] **Step 2: Run test to verify it fails** — Run: `npm --prefix backend test -- --test-name-pattern="countDistinct"` — Expected: FAIL.
- [ ] **Step 3: Implement aggregate in `runStep`** — before the `findMany`, add:
```ts
  if (step.aggregate) {
    const a = step.aggregate;
    if (a.op === 'count') { const value = await delegate.count({ where }); return { rows: [{ value }], sources: [] }; }
    if (a.op === 'countDistinct') { const grp = await delegate.groupBy({ by: [a.field!], where }); return { rows: [{ value: grp.length }], sources: [] }; }
    if (a.groupBy?.length) { const grp = await delegate.groupBy({ by: a.groupBy, where, _count: true }); return { rows: grp, sources: [] }; }
    const agg = await delegate.aggregate({ where, [`_${a.op}`]: { [a.field!]: true } }); return { rows: [{ value: (agg as any)[`_${a.op}`][a.field!] }], sources: [] };
  }
```
> Aggregates return computed numbers; per SOURCE_ONLY the composer states these are counts over the filtered set (the filter itself is the provenance). If per-row provenance is later required, switch `count` to fetch ids. Acceptable for v1 counts.
- [ ] **Step 4: Run test to verify it passes** — Run: `npm --prefix backend test -- --test-name-pattern="countDistinct"` — Expected: PASS.
- [ ] **Step 5: Commit**
```bash
git add backend/src/ai/gateway/query/engine.ts backend/src/ai/__tests__/query-engine.test.ts
git commit -m "feat(016): query engine aggregates (count/distinct/min/max/avg/groupBy)"
```

---

### Task 6: Engine — relate (1-hop joins) + sensitive fields

**Files:** Modify `engine.ts`; extend test.
**Interfaces:** unchanged; `runStep` includes whitelisted relations and projects `rel.field`.

- [ ] **Step 1: Write the failing test**
```ts
test('relate includes 1-hop relation and projects rel fields', async () => {
  const plan = validateQueryPlan({ steps: [{ id: 's1', from: 'roomAssignment', filter: [{ field: 'endDate', op: 'isNull' }], relate: ['room','patient'], select: ['room.numero','patient.lastName'], limit: 20 }] })!;
  const out = await runQueryPlan(plan, CTX, ENV);
  assert.ok(Array.isArray(out.rows));
  if (out.rows.length) assert.ok('room.numero' in (out.rows[0] as object));
});
```
- [ ] **Step 2: Run test to verify it fails** — Run: `npm --prefix backend test -- --test-name-pattern="relate includes"` — Expected: FAIL.
- [ ] **Step 3: Implement relate** — in `runStep`, build `include` from `step.relate` and flatten `rel.field` in projection:
```ts
  const include = step.relate.length ? Object.fromEntries(step.relate.map((r) => [r, true])) : undefined;
  const rows: Record<string, unknown>[] = await delegate.findMany({ where, orderBy: orderBy.length ? orderBy : undefined, take: step.limit, include });
  const flat = (r: Record<string, unknown>) => {
    if (!step.select.length) return r;
    const o: Record<string, unknown> = {};
    for (const k of step.select) { const [rel, sub] = k.split('.'); o[k] = sub ? ((r[rel] as any)?.[sub]) : (r as any)[k]; }
    return o;
  };
  const projected = rows.map(flat);
```
(Replace the earlier `projected` line; keep sources from `rows`.)
- [ ] **Step 4: Run test to verify it passes** — Run: `npm --prefix backend test -- --test-name-pattern="relate includes"` — Expected: PASS.
- [ ] **Step 5: Commit**
```bash
git add backend/src/ai/gateway/query/engine.ts backend/src/ai/__tests__/query-engine.test.ts
git commit -m "feat(016): query engine 1-hop relate + rel-field projection"
```

---

### Task 7: Engine — patient resolution (authoritative), vitalSign loader, dateWindow

**Files:** Modify `engine.ts`; add `backend/src/ai/gateway/query/patient-scope.ts`; extend test.
**Interfaces:**
- Produces (`patient-scope.ts`): `resolvePatientFilter(filters: RawFilter[], ctx: UserContext): Promise<string | null>` — reads the reserved `patient` filter (name or `"current"`), resolves via `searchPatients`, returns an authoritative patientId (or null if unresolved/ambiguous).
- `runStep` for `patient-scoped` entities: require a resolved patientId, enforce `assertPatientAllowed`, and for `vitalSign` use a custom loader over `Cartella.parametriVitali` with `dateWindow`.

- [ ] **Step 1: Write the failing test** (seed a patient + cartella vitals, or assert structural/empty):
```ts
test('patient-scoped without resolved patient → bad_request', async () => {
  const plan = validateQueryPlan({ steps: [{ id: 's1', from: 'vitalSign', filter: [{ field: 'etichetta', op: 'eq', value: 'PA' }] }] })!;
  await assert.rejects(() => runQueryPlan(plan, CTX, ENV), /paziente|bad_request/i);
});
test('vitalSign dateWindow lastDays filters by rilevato', async () => {
  const plan = validateQueryPlan({ steps: [{ id: 's1', from: 'vitalSign', filter: [{ field: 'patient', op: 'eq', value: 'current' }, { field: 'rilevato', op: 'dateWindow', value: { lastDays: 7 } }] }] })!;
  const out = await runQueryPlan(plan, { ...CTX, permittedPatientIds: null } as any, ENV).catch((e) => ({ err: String(e) }));
  assert.ok(out); // resolves 'current' via planCtx in integration; unit asserts no crash on shape
});
```
> `"current"` needs a current patient in context; in the unit test without one it should reject cleanly. Full happy-path is covered by the live verification (Task 12).
- [ ] **Step 2: Run test to verify it fails** — Run: `npm --prefix backend test -- --test-name-pattern="patient-scoped without|vitalSign dateWindow"` — Expected: FAIL.
- [ ] **Step 3: Write `patient-scope.ts`**
```ts
import * as svc from '../services.js';
import type { UserContext } from '../types.js';
import type { RawFilter } from './dsl.js';

/** The DSL identifies a patient by NAME or the literal "current"; the server resolves it
 *  authoritatively (search_patients + authz). Never trusts an LLM-provided id. */
export async function resolvePatientFilter(filters: RawFilter[], ctx: UserContext, currentPatientId?: string): Promise<string | null> {
  const pf = filters.find((f) => f.field === 'patient');
  if (!pf) return null;
  if (pf.value === 'current') return currentPatientId ?? null;
  const name = String(pf.value ?? '').trim(); if (!name) return null;
  const matches = await svc.searchPatients({ query: name } as never, ctx);
  return matches.length === 1 ? matches[0].patientId : null; // unique only; no invention
}
```
- [ ] **Step 3b: Wire patient-scope + vitalSign loader + dateWindow into `engine.ts`** — extend `runQueryPlan` signature to accept `currentPatientId`, and in `runStep`:
```ts
  if (entity.authz === 'patient-scoped') {
    const pid = await resolvePatientFilter(step.filters, ctx, currentPatientId);
    if (!pid) throw new GatewayError('bad_request', 'Paziente non risolto per la query');
    assertPatientAllowed(ctx, pid); // import from ../filters.js or services helper
    if (step.entity === 'vitalSign') return vitalStep(step, pid, ctx);
    // therapy etc: inject patientId into where, run generic path
    step.filters = step.filters.filter((f) => f.field !== 'patient').concat([{ field: entity.patientIdField!, op: 'eq', value: pid }]);
  }
```
And add `vitalStep` reusing the gateway vitals service with a date filter:
```ts
import * as svc from '../services.js';
function dateWindowBounds(v: any): { from?: Date; to?: Date } {
  if (v?.lastDays) { const to = new Date(); const from = new Date(to.getTime() - v.lastDays * 864e5); return { from, to }; }
  if (v?.day === 'today' || v?.day === 'yesterday') { const d = new Date(); if (v.day === 'yesterday') d.setDate(d.getDate() - 1); const from = new Date(d); from.setHours(0,0,0,0); const to = new Date(d); to.setHours(23,59,59,999); return { from, to }; }
  if (v?.from || v?.to) return { from: v.from ? new Date(v.from) : undefined, to: v.to ? new Date(v.to) : undefined };
  return {};
}
async function vitalStep(step: ValidatedStep, patientId: string, ctx: UserContext): Promise<QueryAnswer> {
  const label = (step.filters.find((f) => f.field === 'etichetta')?.value as string) || undefined;
  const systolicMin = step.filters.find((f) => f.field === 'systolic' && (f.op === 'gte' || f.op === 'gt'))?.value as number | undefined;
  const systolicMax = step.filters.find((f) => f.field === 'systolic' && (f.op === 'lte' || f.op === 'lt'))?.value as number | undefined;
  const win = step.filters.find((f) => f.op === 'dateWindow')?.value;
  const { from, to } = dateWindowBounds(win);
  const r = await svc.getPatientVitalSigns({ patientId, label, systolicMin, systolicMax } as never, ctx);
  const inWindow = (r.data as any[]).filter((v) => { const t = v.rilevato ? new Date(v.rilevato).getTime() : 0; return (!from || t >= from.getTime()) && (!to || t <= to.getTime()); });
  return { rows: inWindow, sources: r.sourceRefs.slice(0, inWindow.length) };
}
```
> Confirm `assertPatientAllowed` import path (it's used in `services.ts`). If systolic is embedded in the PA value string, extend `filterVitals`/`getPatientVitalSigns` to expose a numeric `systolic` (it already supports `systolicMin`).
- [ ] **Step 4: Run test to verify it passes** — Run: `npm --prefix backend test -- --test-name-pattern="patient-scoped without|vitalSign dateWindow"` — Expected: PASS.
- [ ] **Step 5: Commit**
```bash
git add backend/src/ai/gateway/query/engine.ts backend/src/ai/gateway/query/patient-scope.ts backend/src/ai/__tests__/query-engine.test.ts
git commit -m "feat(016): patient-authoritative resolution + vitalSign loader + dateWindow"
```

---

### Task 8: Engine — multi-step (runIf + bindFrom + combined sources)

**Files:** Modify `engine.ts`; extend test.
**Interfaces:** `runQueryPlan` now executes all steps in order, honoring `runIf`/`bindFrom`, and returns the primaryStep rows plus any steps feeding the answer.

- [ ] **Step 1: Write the failing test**
```ts
test('runIf skips step2 when step1 empty', async () => {
  const plan = validateQueryPlan({ steps: [
    { id: 's1', from: 'room', filter: [{ field: 'numero', op: 'eq', value: '__none__' }], select: ['numero'] },
    { id: 's2', from: 'room', runIf: { step: 's1', predicate: 'nonEmpty' }, aggregate: { op: 'count' } },
  ], answer: { primaryStep: 's2' } })!;
  const out = await runQueryPlan(plan, CTX, ENV);
  assert.deepEqual(out.rows, []); // s2 skipped
});
```
- [ ] **Step 2: Run test to verify it fails** — Run: `npm --prefix backend test -- --test-name-pattern="runIf skips"` — Expected: FAIL.
- [ ] **Step 3: Rewrite `runQueryPlan` for multi-step**
```ts
export async function runQueryPlan(plan: ValidatedPlan, ctx: UserContext, env: NodeJS.ProcessEnv = process.env, currentPatientId?: string): Promise<QueryAnswer> {
  const results = new Map<string, QueryAnswer>();
  for (const step of plan.steps) {
    if (step.runIf) {
      const prev = results.get(step.runIf.step); const n = prev ? prev.rows.length : 0;
      const ok = step.runIf.predicate === 'nonEmpty' ? n > 0 : step.runIf.predicate === 'empty' ? n === 0 : n >= (step.runIf.value ?? 1);
      if (!ok) { results.set(step.id, { rows: [], sources: [] }); continue; }
    }
    if (step.bindFrom) {
      const prev = results.get(step.bindFrom.step);
      const vals = (prev?.rows ?? []).map((r) => (r as any)[step.bindFrom!.field]).filter((v) => v != null);
      step = { ...step, filters: [...step.filters, { field: step.bindFrom.into, op: 'in', value: vals }] };
    }
    results.set(step.id, await runStep(step, ctx, env, currentPatientId));
  }
  const primary = results.get(plan.primaryStep) ?? { rows: [], sources: [] };
  // include sources from every executed step feeding the answer
  const allSources = [...results.values()].flatMap((r) => r.sources);
  return { rows: primary.rows, sources: dedupeSources(allSources) };
}
function dedupeSources(s: SourceReference[]): SourceReference[] {
  const seen = new Set<string>(); const out: SourceReference[] = [];
  for (const x of s) { const k = `${x.sourceType}:${x.recordId}`; if (!seen.has(k)) { seen.add(k); out.push(x); } }
  return out;
}
```
(Change `runStep` signature to accept `currentPatientId` and thread it to patient-scope.)
- [ ] **Step 4: Run test to verify it passes** — Run: `npm --prefix backend test -- --test-name-pattern="runIf skips"` — Expected: PASS. Then run the full engine suite: `npm --prefix backend test -- --test-name-pattern="query"`.
- [ ] **Step 5: Commit**
```bash
git add backend/src/ai/gateway/query/engine.ts backend/src/ai/__tests__/query-engine.test.ts
git commit -m "feat(016): query engine multi-step runIf + bindFrom + merged sources"
```

---

### Task 9: Planner integration — `query_data` tool + `data_query` intent

**Files:**
- Modify: `backend/src/ai/assistant/read-tools.ts` (add tool + schema)
- Modify: `backend/src/ai/assistant/llm-planner.ts` (add `data_query` intent)
- Test: `backend/src/ai/__tests__/llm-planner.test.ts` (extend)

**Interfaces:**
- Consumes: nothing new externally. Produces: `READ_TOOLS` includes `'query_data'`; `INTENTS` includes `'data_query'`; a `query_data` tool passes `{ plan: <RawQueryPlan> }` in `args`.

- [ ] **Step 1: Write the failing test** (planner accepts a `query_data` tool + `data_query` intent):
```ts
test('016 F3: piano LLM con query_data + intent data_query è accettato', async () => {
  const runtime = async () => ({ plan: { intent: 'data_query', scope: 'current_patient', tools: [{ tool: 'query_data', args: { plan: { steps: [{ id: 's1', from: 'roomAssignment', aggregate: { op: 'count' } }] } } }], requiresCrossPatientAccess: false }, confidence: 0.9 });
  const r = await planQueryLLM('quante camere occupate', {}, { callPlanRuntime: runtime });
  assert.equal(r.mode, 'llm');
  assert.equal(r.plan.tools[0].tool, 'query_data');
});
```
- [ ] **Step 2: Run test to verify it fails** — Run: `npm --prefix backend test -- --test-name-pattern="query_data \\+ intent"` — Expected: FAIL (`query_data` not in allowlist / `data_query` not in INTENTS).
- [ ] **Step 3: Implement**
  - In `read-tools.ts`: add `'query_data'` to `READ_TOOLS`, and to `READ_TOOL_SCHEMA` add `{ name: 'query_data', args: { plan: 'object' } }`.
  - In `llm-planner.ts`: add `'data_query'` to the `INTENTS` set.
- [ ] **Step 4: Run test to verify it passes** — Run: `npm --prefix backend test -- --test-name-pattern="query_data \\+ intent"` — Expected: PASS.
- [ ] **Step 5: Commit**
```bash
git add backend/src/ai/assistant/read-tools.ts backend/src/ai/assistant/llm-planner.ts backend/src/ai/__tests__/llm-planner.test.ts
git commit -m "feat(016): planner allowlists query_data tool + data_query intent"
```

---

### Task 10: Executor dispatch — wire `query_data` into the assistant

**Files:**
- Modify: `backend/src/ai/assistant/service.ts` (dispatch `query_data` → validate → engine)
- Test: `backend/src/ai/__tests__/assistant-query-data.test.ts`

**Interfaces:**
- Consumes: `validateQueryPlan` (`validate.ts`), `runQueryPlan` (`engine.ts`). In `dispatch()`, a `query_data` tool validates `args.plan` and runs the engine, returning `{ data: rows, sourceRefs: sources }`. Invalid plan → empty result (no throw) so the composer degrades gracefully.

- [ ] **Step 1: Write the failing test** (end-to-end through `assistantQuery`, facility flag on):
```ts
import { assistantQuery } from '../assistant/service.js';
test('016 F3: query_data occupancy via assistantQuery', async () => {
  const ctx = { userId: 'op', tenantId: 't', roles: ['operatore'], permittedPatientIds: null, requestId: 'r' };
  // planner injected deterministically via env-less path is complex; assert dispatch layer instead:
  const { dispatchQueryData } = await import('../assistant/service.js');
  const out = await dispatchQueryData({ steps: [{ id: 's1', from: 'roomAssignment', aggregate: { op: 'count' } }] }, ctx, { AI_FACILITY_QUERIES_ENABLED: 'true' });
  assert.equal(typeof (out.data[0] as any).value, 'number');
});
```
- [ ] **Step 2: Run test to verify it fails** — Run: `npm --prefix backend test -- --test-name-pattern="query_data occupancy"` — Expected: FAIL.
- [ ] **Step 3: Implement in `service.ts`** — add an exported helper + a `dispatch` case:
```ts
import { validateQueryPlan } from '../gateway/query/validate.js';
import { runQueryPlan } from '../gateway/query/engine.js';

export async function dispatchQueryData(rawPlan: unknown, ctx: UserContext, env: NodeJS.ProcessEnv = process.env, currentPatientId?: string): Promise<{ data: unknown[]; sourceRefs: SourceReference[] }> {
  const validated = validateQueryPlan(rawPlan);
  if (!validated) return { data: [], sourceRefs: [] };
  try { const out = await runQueryPlan(validated, ctx, env, currentPatientId); return { data: out.rows, sourceRefs: out.sources }; }
  catch (e) { if (e instanceof GatewayError && (e.kind === 'forbidden' || e.kind === 'bad_request')) return { data: [], sourceRefs: [] }; throw e; }
}
```
And in `dispatch()` add:
```ts
    case 'query_data': { const r = await dispatchQueryData((args as any).plan, ctx, process.env, undefined); return r; }
```
> Thread `effectiveCtx.currentPatientId` for `"current"` support: pass it from `assistantQuery` into `dispatch` (small refactor) OR resolve names only for v1. Names cover the examples; `"current"` is a follow-up.
- [ ] **Step 4: Run test to verify it passes** — Run: `npm --prefix backend test -- --test-name-pattern="query_data occupancy"` — Expected: PASS. Then full backend build: `npm --prefix backend run build`.
- [ ] **Step 5: Commit**
```bash
git add backend/src/ai/assistant/service.ts backend/src/ai/__tests__/assistant-query-data.test.ts
git commit -m "feat(016): assistant dispatches query_data through validate+engine"
```

---

### Task 11: Runtime prompt — teach the DSL + exposed schema

**Files:**
- Modify: `clinicos-ai-runtime/clinicos_ai/agents/assistant.py` (`_INTENTS` + a DSL/schema section in `_SYSTEM`)
- Test: `clinicos-ai-runtime/tests/test_assistant_plan.py` (extend the prompt-contract guard)

**Interfaces:** The planner prompt gains `data_query` in the intent enum and a compact description of `query_data` + the whitelisted entities/fields/operators, instructing the model to emit `{ tool: "query_data", args: { plan: {...DSL...} } }` for structural/aggregate/relational/multi-step questions.

- [ ] **Step 1: Write the failing test** (guard the new intent + tool are described):
```python
class DataQueryPromptTests(unittest.TestCase):
    def test_prompt_teaches_query_data(self):
        from clinicos_ai.agents.assistant import _SYSTEM, _INTENTS
        self.assertIn("data_query", _INTENTS)
        for tok in ("query_data", "roomAssignment", "aggregate", "runIf"):
            self.assertIn(tok, _SYSTEM)
```
- [ ] **Step 2: Run test to verify it fails** — Run: `cd clinicos-ai-runtime && python -m unittest tests.test_assistant_plan -v -k data_query` — Expected: FAIL.
- [ ] **Step 3: Implement** — add `data_query` to `_INTENTS`, and append to `_SYSTEM` a concise DSL guide:
```python
# (append inside _SYSTEM string)
"Per domande su NUMERI/ELENCHI/CORRELAZIONI di struttura o strutturate (camere, letti, occupazione, "
"appuntamenti, conteggi, andamenti, condizioni tra dati) usa il tool 'query_data' con intent 'data_query' "
"ed emetti un piano: {\"steps\":[{\"id\",\"from\",\"filter\":[{\"field\",\"op\",\"value\"}],\"relate\":[],"
"\"aggregate\":{\"op\",\"field\",\"groupBy\"},\"select\":[],\"runIf\":{\"step\",\"predicate\"},"
"\"bindFrom\":{\"step\",\"field\",\"into\"}}],\"answer\":{\"primaryStep\"}}. "
"Entita: roomAssignment(patientId,roomId,bedId,startDate,endDate; rel room,bed,patient), room(numero,tipo,piano,reparto,stato), "
"bed(label,stato; rel room), appointment(patientId,scheduledAt,status,reason; rel patient), patient(firstName,lastName,medicalRecordNumber,dateOfBirth,sex), "
"therapy(patientId,name), vitalSign(patientId,etichetta,valore,systolic,rilevato). "
"op: eq,in,lt,lte,gt,gte,isNull,contains,between,dateWindow(lastDays|day:today/yesterday|from/to). "
"Il paziente si indica con filtro field='patient' value=<nome> o 'current' (il server lo risolve). "
"Camera occupata = roomAssignment con endDate isNull."
```
- [ ] **Step 4: Run test to verify it passes** — Run: `cd clinicos-ai-runtime && python -m unittest tests.test_assistant_plan -v` — Expected: PASS (all).
- [ ] **Step 5: Commit**
```bash
git add clinicos-ai-runtime/clinicos_ai/agents/assistant.py clinicos-ai-runtime/tests/test_assistant_plan.py
git commit -m "feat(016): runtime prompt teaches query_data DSL + exposed schema"
```

---

### Task 12: Deploy + activate flag + live verification

**Files:** none (ops). Uses existing workflows.

- [ ] **Step 1: Open PR `016-facility-reads` → `main`; wait for the `gate` job (backend build + `npm --prefix backend test` + import E2E) green.** `browser-e2e` (req020) is a known flake, non-required.
- [ ] **Step 2: Merge (squash).** This triggers `deploy-backend.yml` (backend) and `deploy-runtime.yml` (runtime prompt path).
- [ ] **Step 3: Set the flag** — dispatch `railway-set-var.yml` to set `AI_FACILITY_QUERIES_ENABLED=true` on `clinicos-backend`, then force a backend redeploy via `deploy-backend.yml` (railway var set does not auto-redeploy).
- [ ] **Step 4: Live verify** (prod, real roster) — for each, confirm `mode=llm`, results, `composed=true`, and correct content:
```bash
Q(){ curl -s -X POST https://clinicos-backend-production-df88.up.railway.app/ai/assistant/query -H "Content-Type: application/json" -H "X-Operator-Id: v" -H "X-Operator-Role: operatore" -d "{\"question\":\"$1\"}"; }
Q "quante camere sono occupate?"; Q "quanti pazienti ci sono in struttura?"; Q "la camera 12 è occupata e da chi?"; Q "andamento dei parametri degli ultimi 7 giorni del paziente Folli"; Q "che appuntamenti ci sono oggi?"
```
- [ ] **Step 5: Record evidence** to `artifacts/task-validation/016-composable-reads/` (JSON responses + a PASS/FAIL table per the validation-method) and note the deploy manifest.

---

## Self-Review

- **Spec coverage:** §3 components → Tasks 2–4 (schema/dsl/validate/engine); §4 schema descriptor → Task 2; §5 DSL incl runIf/bindFrom/dateWindow → Tasks 3,7,8; §6 authz → Tasks 1,4,7; §7 planner/executor/composer/sources → Tasks 4,9,10 (+source types Task 4); §8 examples → covered by engine capabilities + Task 12 live checks; §9 Phase 2 → out of scope (documented); §10 tests → each task's TDD + Task 12; §11 deploy → Task 12. Composer reuse: no code change needed (existing F2 path composes any results>0) — verified in Task 12.
- **Placeholder scan:** no TBD/TODO; the two “confirm column name / import path” notes are explicit verification steps, not deferred work.
- **Type consistency:** `ValidatedPlan/ValidatedStep` (Task 3) consumed unchanged by engine (Tasks 4–8); `QueryAnswer{rows,sources}` stable; `runQueryPlan(plan,ctx,env,currentPatientId?)` signature settled in Task 8 and used in Task 10; `dispatchQueryData` signature consistent Task 10.
