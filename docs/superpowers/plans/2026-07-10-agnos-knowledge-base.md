# Agnos Knowledge Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Espandere Agnos con 7 nuovi intent read (confronti parametri, camere con occupanti, consegne, diario, scale cliniche, turni operatori), planning LLM-first con guardie deterministiche, ed esito `clarify` con suggerimenti cliccabili anti-allucinazione.

**Architecture:** Si costruisce su `origin/main` (che ha già llm-planner → validazione → inject patientId → fallback deterministico, il flusso LLM-first della spec). I nuovi intent si aggiungono in 4 strati: gateway (services+sources), allowlist tool (read-tools), planner deterministico di fallback (plan.ts), dispatch (service.ts). I delta li calcola un modulo puro backend (`vitals-compare.ts`), mai l'LLM. `clarify` è un nuovo esito con catalogo statico di suggerimenti template. Turni operatori: nuovo modello Prisma additivo `OperatorShift`.

**Tech Stack:** Node/Express/TS (backend), Prisma 7/PostgreSQL, React+Vite (frontend), node:test via `tsx --test`, Playwright (evidenza).

**Spec:** `docs/superpowers/specs/2026-07-10-agnos-knowledge-base-design.md`

## Global Constraints

- **Base branch: `origin/main`** — NON il branch locale `ai/codex-project-stabilization` (manca llm-planner/runtime/composer). Lavorare in worktree dedicato.
- **Codex Gate**: mai chiudere issue, mai merge su main, mai deploy. Esito finale dichiarabile: `READY FOR CODEX QA`.
- **SOURCE_ONLY**: ogni valore in risposta proviene da un tool result e cita una fonte; niente inventato.
- **Sicurezza invariata**: delete sempre rifiutato; write terapie/allergie rifiutati; `refuse_clinical` intatto; patientId AUTORITATIVO server-side (`injectPatientId`), mai dall'LLM.
- **LLM sempre mockato nei test** (fixture di piani validi/invalidi via `PlanQueryLLMDeps.callPlanRuntime`); nessun test dipende da Azure.
- **Delta/statistiche solo backend**: l'LLM non computa mai numeri.
- **No PHI nei log**: log planner solo `planner=llm|fallback` + intent, mai testo domanda integrale né nomi.
- **Migration solo additive**: unica ammessa `OperatorShift` (decisione utente 2026-07-10).
- Test backend: `node_modules/.bin/tsx --test backend/src/ai/__tests__/<file>.test.ts` · build backend: `npm --prefix backend run build` · build frontend: `NODE_OPTIONS=--max-old-space-size=4096 npm run build:frontend`.
- Commit convenzionali `feat(agnos-kb): …`, frequenti (uno per task).

**Interfacce esistenti su main (riferimento per tutti i task):**

```ts
// backend/src/ai/assistant/plan.ts
export type AssistantIntent = 'allergies'|'therapies'|'vitals_range'|'vitals_recent'|'narrative_search'
  |'document_search'|'timeline'|'appointments'|'correlate'|'patient_search'|'refuse_clinical'|'data_query'|'unknown';
export interface QueryPlan { intent: AssistantIntent; scope: 'current_patient'|'cross_patient';
  tools: {tool:string; args:Record<string,unknown>}[]; requiresCrossPatientAccess: boolean; refusalReason?: string }
export function planQuery(question: string, ctx: PlanContext = {}): QueryPlan  // PlanContext = { currentPatientId?: string }

// backend/src/ai/assistant/llm-planner.ts
//   INTENTS: Set<AssistantIntent> (enum whitelist post-LLM) · PATIENT_SCOPED: Set<string> (inject patientId)
//   CROSS_TOOLS: Set<string> · validatePlan(raw, ctx) · planQueryLLM(question, ctx, deps): Promise<PlanResult>

// backend/src/ai/assistant/read-tools.ts
//   READ_TOOLS: string[] (allowlist deny-by-default) · isReadTool(name) · READ_TOOL_SCHEMA: {name,args}[]

// backend/src/ai/assistant/service.ts
export interface AssistantAnswer { intent; scope; plan; results: unknown[]; sources: SourceReference[];
  navigation: NavAction[]; notFound: boolean; refusal?: string; truncated: boolean;
  mode?: 'deterministic'|'llm'; answerText?: string; composed?: boolean }
export async function assistantQuery(question, ctx: UserContext, planCtx?: PlanContext, env?): Promise<AssistantAnswer>

// backend/src/ai/gateway/services.ts — pattern di ogni service:
//   assertTenant(ctx); assertPatientAllowed(ctx, patientId); query Prisma read-only;
//   refs = rows.map(r => xxxSource(...)); gatewayAudit(ctx, 'tool_name', [ids], n, 'ok'|'empty', nowIso());
//   return { data, sourceRefs }
//   GIÀ ESISTENTE: getPatientDiary(patientId, ctx, {authorType?, from?, to?}) con diarySource.

// Parametri vitali: dentro Cartella.data JSON → cartella.parametriVitali: Array<{id?, etichetta?, valore?, rilevato?}>
//   (valore es. "120/80" per PA, "36.5" per T; rilevato = ISO datetime). loadCartella(patientId) in services.ts.
// Scale cliniche: cartella.valutazioniBraden / valutazioniTinetti / valutazioniNRS / medicazioniFerite / contenzioni
// Prisma: Consegna{pazienteId,pazienteNome,priorita,stato,tipo,note,scadenza,oraScadenza,operatoreAssegnato}
//   Room{numero,tipo,piano,stato} · Bed{roomId,label,stato} ·
//   PatientRoomAssignment{patientId,roomId,bedId,startDate,endDate(null=attiva)} · Operator{userId→User{name?,role}}
// Frontend: AgnosTurn{ read?: AssistantAnswer; text; status?; … } in useAgnosChat.ts; AnswerView renderizza turn.read.
```

---

### Task 0: Worktree su origin/main + porting spec

**Files:**
- Create: worktree `.worktrees/agnos-kb` su branch `feat/agnos-kb` da `origin/main`
- Create (copy): `docs/superpowers/specs/2026-07-10-agnos-knowledge-base-design.md`

**Interfaces:** Produce l'ambiente di lavoro per tutti i task successivi. Ogni comando dei task successivi si esegue dentro `.worktrees/agnos-kb`.

- [ ] **Step 1: Creare worktree e branch**

```bash
cd "E:/Workspace/DG_SE_DEV/ClinicOS"
git fetch origin main
git worktree add .worktrees/agnos-kb -b feat/agnos-kb origin/main
# node_modules è condiviso a livello repo: creare junction (Windows)
cmd //c "mklink /J .worktrees\\agnos-kb\\node_modules node_modules"
cmd //c "mklink /J .worktrees\\agnos-kb\\frontend\\node_modules frontend\\node_modules"
cp backend/.env .worktrees/agnos-kb/backend/.env
cp .env .worktrees/agnos-kb/.env 2>/dev/null; cp frontend/.env .worktrees/agnos-kb/frontend/.env
```

- [ ] **Step 2: Copiare la spec dal branch feat/agnos-knowledge-base e committare**

```bash
cd "E:/Workspace/DG_SE_DEV/ClinicOS/.worktrees/agnos-kb"
git checkout feat/agnos-knowledge-base -- docs/superpowers/specs/2026-07-10-agnos-knowledge-base-design.md
git commit -m "docs(agnos-kb): spec design Agnos Knowledge Base (base: main)" \
  docs/superpowers/specs/2026-07-10-agnos-knowledge-base-design.md
```

- [ ] **Step 3: Verificare che la base compili e i test passino (baseline verde)**

```bash
npm --prefix backend run build          # atteso: exit 0
node_modules/.bin/tsx --test backend/src/ai/__tests__/assistant-plan.test.ts   # atteso: tutti PASS
node_modules/.bin/tsx --test backend/src/ai/__tests__/llm-planner.test.ts 2>/dev/null || true  # se esiste: PASS
```

---

### Task 1: Motore di confronto parametri (`vitals-compare.ts`)

**Files:**
- Create: `backend/src/ai/assistant/vitals-compare.ts`
- Test: `backend/src/ai/__tests__/vitals-compare.test.ts`

**Interfaces:**
- Consumes: nulla (modulo puro; riceve `VitalEntry[]` già letti dal chiamante).
- Produces (usati dal Task 5 dispatch):

```ts
export interface VitalEntry { id?: string; etichetta?: string; valore?: string; rilevato?: string }
export interface VitalValue { num: number; num2?: number }            // num2 = diastolica per PA
export interface VitalsComparison { label: string; dayA: string; dayB: string;
  valA: VitalValue|null; valB: VitalValue|null; delta: VitalValue|null; unit: string;
  weeklyAvg: VitalValue|null; deviation: boolean }
export interface TrendDay { date: string; min: number; max: number; avg: number }
export interface VitalsTrend { label: string; days: TrendDay[]; direction: 'salita'|'stabile'|'calo'; unit: string }
export function parseVitalValue(valore: string): VitalValue | null
export function compareVitals(entries: VitalEntry[], label: string, dayA: string, dayB: string,
  env?: NodeJS.ProcessEnv): VitalsComparison | null
export function vitalsTrend(entries: VitalEntry[], label: string, today: string, giorni?: number): VitalsTrend | null
```

- [ ] **Step 1: Scrivere i test che falliscono**

```ts
// backend/src/ai/__tests__/vitals-compare.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVitalValue, compareVitals, vitalsTrend } from '../assistant/vitals-compare.js';

const E = (etichetta: string, valore: string, rilevato: string) => ({ etichetta, valore, rilevato });
const PA = [
  E('PA', '140/85', '2026-07-09T08:00:00.000Z'),
  E('PA', '150/90', '2026-07-10T08:12:00.000Z'),
  E('PA', '142/86', '2026-07-07T08:00:00.000Z'),
  E('PA', '138/84', '2026-07-05T08:00:00.000Z'),
];

test('parseVitalValue: PA "150/90" → {150, 90}; T "36.5" → {36.5}; spazzatura → null', () => {
  assert.deepEqual(parseVitalValue('150/90'), { num: 150, num2: 90 });
  assert.deepEqual(parseVitalValue('36.5'), { num: 36.5 });
  assert.equal(parseVitalValue('n/d'), null);
});

test('compareVitals oggi vs ieri: delta computato dal backend', () => {
  const c = compareVitals(PA, 'PA', '2026-07-10', '2026-07-09');
  assert.ok(c);
  assert.deepEqual(c!.valA, { num: 150, num2: 90 });
  assert.deepEqual(c!.valB, { num: 140, num2: 85 });
  assert.deepEqual(c!.delta, { num: 10, num2: 5 });
});

test('compareVitals: giorno senza rilevazioni → valB null, delta null, non inventa', () => {
  const c = compareVitals(PA, 'PA', '2026-07-10', '2026-07-08');
  assert.ok(c);
  assert.equal(c!.valB, null);
  assert.equal(c!.delta, null);
});

test('compareVitals: deviation true quando |delta| supera la soglia PA (default 15)', () => {
  const entries = [...PA, E('PA', '170/100', '2026-07-10T18:00:00.000Z')]; // ultimo del 10/07 = 170
  const c = compareVitals(entries, 'PA', '2026-07-10', '2026-07-09');
  assert.equal(c!.deviation, true);   // 170-140=30 > 15
});

test('vitalsTrend 7gg: serie giornaliera con min/max/media e direzione', () => {
  const t = vitalsTrend(PA, 'PA', '2026-07-10', 7);
  assert.ok(t);
  assert.equal(t!.days.length, 4);                       // solo i giorni con dati
  assert.equal(t!.days[t!.days.length - 1].date, '2026-07-10');
  assert.ok(['salita', 'stabile', 'calo'].includes(t!.direction));
  assert.equal(t!.direction, 'salita');                  // 138→142→140→150 sistolica media in salita
});

test('vitalsTrend: etichetta assente → null (mai serie inventata)', () => {
  assert.equal(vitalsTrend(PA, 'SpO2', '2026-07-10', 7), null);
});
```

- [ ] **Step 2: Eseguire i test → devono FALLIRE** (`Cannot find module '../assistant/vitals-compare.js'`)

```bash
node_modules/.bin/tsx --test backend/src/ai/__tests__/vitals-compare.test.ts
```

- [ ] **Step 3: Implementazione minima**

```ts
// backend/src/ai/assistant/vitals-compare.ts
// Agnos KB: confronti parametri computati dal BACKEND (mai dall'LLM). Funzioni pure e testabili.
// entries = cartella.parametriVitali (letti dal gateway a monte, authz già applicata).

export interface VitalEntry { id?: string; etichetta?: string; valore?: string; rilevato?: string }
export interface VitalValue { num: number; num2?: number }
export interface VitalsComparison { label: string; dayA: string; dayB: string;
  valA: VitalValue | null; valB: VitalValue | null; delta: VitalValue | null; unit: string;
  weeklyAvg: VitalValue | null; deviation: boolean }
export interface TrendDay { date: string; min: number; max: number; avg: number }
export interface VitalsTrend { label: string; days: TrendDay[]; direction: 'salita' | 'stabile' | 'calo'; unit: string }

const UNITS: Record<string, string> = { PA: 'mmHg', FC: 'bpm', TC: '°C', T: '°C', SPO2: '%', FR: 'atti/min' };
// Soglie scostamento (spec §3): sono DATO, mai giudizio clinico. Override via env AGNOS_DEV_<LABEL>.
const DEV_THRESHOLDS: Record<string, number> = { PA: 15, FC: 15, TC: 0.8, T: 0.8, SPO2: 3 };

const normLabel = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export function parseVitalValue(valore: string): VitalValue | null {
  const two = /^(\d{2,3})\s*\/\s*(\d{2,3})$/.exec((valore || '').trim());
  if (two) return { num: parseInt(two[1], 10), num2: parseInt(two[2], 10) };
  const one = /^(\d{1,3}(?:[.,]\d+)?)$/.exec((valore || '').trim());
  if (one) return { num: parseFloat(one[1].replace(',', '.')) };
  return null;
}

function ofLabel(entries: VitalEntry[], label: string): Array<{ at: string; v: VitalValue }> {
  const want = normLabel(label);
  return entries
    .filter((e) => e.rilevato && normLabel(e.etichetta ?? '') === want)
    .map((e) => ({ at: e.rilevato!, v: parseVitalValue(e.valore ?? '') }))
    .filter((x): x is { at: string; v: VitalValue } => x.v !== null)
    .sort((a, b) => a.at.localeCompare(b.at));
}

const day = (iso: string) => iso.slice(0, 10);
const lastOfDay = (pts: Array<{ at: string; v: VitalValue }>, d: string): VitalValue | null => {
  const same = pts.filter((p) => day(p.at) === d);
  return same.length ? same[same.length - 1].v : null;
};

function threshold(label: string, env: NodeJS.ProcessEnv): number {
  const key = normLabel(label);
  const fromEnv = parseFloat(env[`AGNOS_DEV_${key}`] ?? '');
  return Number.isFinite(fromEnv) ? fromEnv : (DEV_THRESHOLDS[key] ?? Number.POSITIVE_INFINITY);
}

function weeklyAvg(pts: Array<{ at: string; v: VitalValue }>, upToDay: string): VitalValue | null {
  const from = new Date(`${upToDay}T00:00:00.000Z`); from.setUTCDate(from.getUTCDate() - 6);
  const inWin = pts.filter((p) => day(p.at) >= from.toISOString().slice(0, 10) && day(p.at) <= upToDay);
  if (!inWin.length) return null;
  const avg = (sel: (v: VitalValue) => number | undefined) => {
    const nums = inWin.map((p) => sel(p.v)).filter((n): n is number => typeof n === 'number');
    return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : undefined;
  };
  const num = avg((v) => v.num); if (num === undefined) return null;
  const num2 = avg((v) => v.num2);
  return num2 === undefined ? { num } : { num, num2 };
}

export function compareVitals(entries: VitalEntry[], label: string, dayA: string, dayB: string,
  env: NodeJS.ProcessEnv = process.env): VitalsComparison | null {
  const pts = ofLabel(entries, label);
  if (!pts.length) return null;
  const valA = lastOfDay(pts, dayA); const valB = lastOfDay(pts, dayB);
  const delta = valA && valB
    ? { num: Math.round((valA.num - valB.num) * 10) / 10,
        ...(valA.num2 !== undefined && valB.num2 !== undefined ? { num2: Math.round((valA.num2 - valB.num2) * 10) / 10 } : {}) }
    : null;
  const avg = weeklyAvg(pts, dayA);
  const deviation = !!delta && Math.abs(delta.num) > threshold(label, env);
  return { label, dayA, dayB, valA, valB, delta, unit: UNITS[normLabel(label)] ?? '', weeklyAvg: avg, deviation };
}

export function vitalsTrend(entries: VitalEntry[], label: string, today: string, giorni = 7): VitalsTrend | null {
  const pts = ofLabel(entries, label);
  if (!pts.length) return null;
  const from = new Date(`${today}T00:00:00.000Z`); from.setUTCDate(from.getUTCDate() - (giorni - 1));
  const fromDay = from.toISOString().slice(0, 10);
  const byDay = new Map<string, number[]>();
  for (const p of pts) { const d = day(p.at); if (d >= fromDay && d <= today) { (byDay.get(d) ?? byDay.set(d, []).get(d)!).push(p.num !== undefined ? p.v.num : p.v.num); } }
  // (nota: la riga sopra usa solo la componente principale — sistolica per PA)
  const days: TrendDay[] = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([date, nums]) => ({ date, min: Math.min(...nums), max: Math.max(...nums),
      avg: Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 }));
  if (!days.length) return null;
  // Direzione: pendenza della regressione lineare sulle medie giornaliere (indice → avg).
  const n = days.length; const xs = days.map((_, i) => i); const ys = days.map((d) => d.avg);
  const mx = xs.reduce((a, b) => a + b, 0) / n; const my = ys.reduce((a, b) => a + b, 0) / n;
  const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / (xs.reduce((s, x) => s + (x - mx) ** 2, 0) || 1);
  const direction = slope > 0.5 ? 'salita' : slope < -0.5 ? 'calo' : 'stabile';
  return { label, days, direction, unit: UNITS[normLabel(label)] ?? '' };
}
```

**Attenzione (bug intenzionalmente da sistemare in TDD):** la riga `byDay` sopra contiene un'espressione confusa — la versione corretta minima è:

```ts
for (const p of pts) {
  const d = day(p.at);
  if (d >= fromDay && d <= today) {
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(p.v.num);
  }
}
```

- [ ] **Step 4: Eseguire i test → PASS**

```bash
node_modules/.bin/tsx --test backend/src/ai/__tests__/vitals-compare.test.ts
# atteso: 6/6 pass
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/ai/assistant/vitals-compare.ts backend/src/ai/__tests__/vitals-compare.test.ts
git commit -m "feat(agnos-kb): motore confronti parametri backend-only (compare/trend/deviation)"
```

---

### Task 2: Gateway — nuovi SourceType, sources e services (consegne, camere, scale)

**Files:**
- Modify: `backend/src/ai/gateway/types.ts` (union `SourceType`)
- Modify: `backend/src/ai/gateway/sources.ts` (nuovi helper)
- Modify: `backend/src/ai/gateway/services.ts` (nuovi service)
- Test: `backend/src/ai/__tests__/gateway-kb.test.ts`

**Interfaces:**
- Consumes: pattern service esistente (`assertTenant`, `assertPatientAllowed`, `gatewayAudit`, `loadCartella`, `prisma`).
- Produces (usati dal Task 5):

```ts
// sources.ts
export function consegnaSource(patientId: string, recordId: string, tipo: string, text: string, at?: string): SourceReference
export function clinicalScoreSource(patientId: string, recordId: string, scale: string, text: string, at?: string): SourceReference
export function roomOccupancySource(recordId: string, text: string): SourceReference          // aggregato, MAI nomi
export function roomOccupantsSource(patientId: string, recordId: string, text: string): SourceReference
// services.ts
export async function getConsegne(input: { patientId?: string; day?: string }, ctx: UserContext): Promise<SourcedResult<unknown[]>>
export async function queryRoomsOccupancy(ctx: UserContext): Promise<SourcedResult<[RoomsAggregate]>>
  // RoomsAggregate = { totalRooms, totalBeds, occupiedBeds, freeBeds, maintenanceBeds, occupancyPct } — SENZA nomi
export async function queryRoomOccupants(input: { roomNumero?: string }, ctx: UserContext): Promise<SourcedResult<RoomOccupantRow[]>>
  // RoomOccupantRow = { roomNumero, bedLabel, patientId, patientName, startDate } — CON nomi (disclosure = UI attuale)
export async function getClinicalScores(input: { patientId: string; scale?: 'braden'|'tinetti'|'nrs'|'medicazioni'|'contenzioni' }, ctx: UserContext): Promise<SourcedResult<unknown[]>>
```

- [ ] **Step 1: Test che falliscono** (occupazione attiva = `endDate === null`; letto manutenzione escluso dai liberi; aggregato senza nomi; scale dalla cartella)

```ts
// backend/src/ai/__tests__/gateway-kb.test.ts — servizi testati con prisma mock iniettabile?
// I service esistenti usano prisma importato: per coerenza col pattern del repo si testano le
// FUNZIONI PURE estratte: aggregateRooms(beds) e occupantRows(assignments). Estrarle in services.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateRooms, occupantRows } from '../gateway/services.js';

const beds = [
  { id: 'b1', stato: 'libero', room: { numero: '12' }, label: 'A', active: null },
  { id: 'b2', stato: 'libero', room: { numero: '12' }, label: 'B',
    active: { patientId: 'p1', patient: { firstName: 'Elena', lastName: 'Moretti' }, startDate: '2026-07-01' } },
  { id: 'b3', stato: 'manutenzione', room: { numero: '14' }, label: 'A', active: null },
];

test('aggregateRooms: conta occupati/liberi/manutenzione senza nomi', () => {
  const a = aggregateRooms(2, beds);
  assert.deepEqual(a, { totalRooms: 2, totalBeds: 3, occupiedBeds: 1, freeBeds: 1, maintenanceBeds: 1, occupancyPct: 33 });
  assert.equal(JSON.stringify(a).includes('Moretti'), false);
});

test('occupantRows: righe con nome per il letto occupato, filtro per camera', () => {
  const rows = occupantRows(beds, '12');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].patientName, 'Moretti Elena');
  assert.equal(rows[0].roomNumero, '12');
  assert.equal(rows[0].bedLabel, 'B');
});

test('occupantRows senza filtro: tutte le camere con occupante', () => {
  assert.equal(occupantRows(beds).length, 1);
});
```

- [ ] **Step 2: Eseguire → FAIL** (`aggregateRooms is not exported`)

- [ ] **Step 3: Implementare in `services.ts`** (funzioni pure esportate + service Prisma che le usa)

```ts
// — Agnos KB: camere. Occupazione attiva = assignment con endDate null. Aggregato SENZA nomi (spec §2).
export interface RoomsAggregate { totalRooms: number; totalBeds: number; occupiedBeds: number; freeBeds: number; maintenanceBeds: number; occupancyPct: number }
export interface RoomOccupantRow { roomNumero: string; bedLabel: string; patientId: string; patientName: string; startDate: string }
type BedRow = { id: string; stato: string; label: string; room: { numero: string };
  active: { patientId: string; startDate: string; patient: { firstName: string; lastName: string } } | null };

export function aggregateRooms(totalRooms: number, beds: BedRow[]): RoomsAggregate {
  const occupiedBeds = beds.filter((b) => b.active).length;
  const maintenanceBeds = beds.filter((b) => !b.active && b.stato === 'manutenzione').length;
  const totalBeds = beds.length;
  const freeBeds = totalBeds - occupiedBeds - maintenanceBeds;
  return { totalRooms, totalBeds, occupiedBeds, freeBeds, maintenanceBeds,
    occupancyPct: totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0 };
}

export function occupantRows(beds: BedRow[], roomNumero?: string): RoomOccupantRow[] {
  return beds
    .filter((b) => b.active && (!roomNumero || b.room.numero === roomNumero))
    .map((b) => ({ roomNumero: b.room.numero, bedLabel: b.label, patientId: b.active!.patientId,
      patientName: `${b.active!.patient.lastName} ${b.active!.patient.firstName}`.trim(), startDate: b.active!.startDate }));
}

async function loadBeds(): Promise<{ totalRooms: number; beds: BedRow[] }> {
  const rooms = await prisma.room.count({ where: { stato: 'attiva' } });
  const rows = await prisma.bed.findMany({
    include: { room: { select: { numero: true } },
      assignments: { where: { endDate: null }, include: { patient: { select: { firstName: true, lastName: true } } }, take: 1 } },
  });
  return { totalRooms: rooms, beds: rows.map((b) => ({ id: b.id, stato: b.stato, label: b.label,
    room: { numero: b.room.numero },
    active: b.assignments[0] ? { patientId: b.assignments[0].patientId, startDate: b.assignments[0].startDate,
      patient: b.assignments[0].patient } : null })) };
}

export async function queryRoomsOccupancy(ctx: UserContext): Promise<SourcedResult<[RoomsAggregate]>> {
  assertTenant(ctx);
  const { totalRooms, beds } = await loadBeds();
  const agg = aggregateRooms(totalRooms, beds);
  const text = `${agg.occupiedBeds}/${agg.totalBeds} letti occupati; ${agg.totalRooms} camere censite`;
  gatewayAudit(ctx, 'query_rooms_occupancy', [], 1, 'ok', nowIso());
  return { data: [agg], sourceRefs: [roomOccupancySource('rooms-aggregate', text)] };
}

export async function queryRoomOccupants(input: { roomNumero?: string }, ctx: UserContext): Promise<SourcedResult<RoomOccupantRow[]>> {
  assertTenant(ctx);
  const { beds } = await loadBeds();
  const rows = occupantRows(beds, input.roomNumero).filter((r) =>
    ctx.permittedPatientIds === null || ctx.permittedPatientIds.includes(r.patientId));
  gatewayAudit(ctx, 'query_room_occupants', rows.map((r) => r.patientId), rows.length, rows.length ? 'ok' : 'empty', nowIso());
  return { data: rows, sourceRefs: rows.map((r) => roomOccupantsSource(r.patientId, `room-${r.roomNumero}-${r.bedLabel}`,
    `Camera ${r.roomNumero} letto ${r.bedLabel}: ${r.patientName}`)) };
}

export async function getConsegne(input: { patientId?: string; day?: string }, ctx: UserContext): Promise<SourcedResult<unknown[]>> {
  assertTenant(ctx);
  if (input.patientId) assertPatientAllowed(ctx, input.patientId);
  const rows = await prisma.consegna.findMany({
    where: { ...(input.patientId ? { pazienteId: input.patientId } : {}), ...(input.day ? { scadenza: input.day } : {}),
      stato: { not: 'completata' } },
    orderBy: [{ scadenza: 'asc' }, { priorita: 'desc' }], take: 50 });
  const allowed = rows.filter((c) => !c.pazienteId || ctx.permittedPatientIds === null || ctx.permittedPatientIds.includes(c.pazienteId));
  gatewayAudit(ctx, 'get_consegne', allowed.map((c) => c.pazienteId).filter(Boolean), allowed.length, allowed.length ? 'ok' : 'empty', nowIso());
  return { data: allowed, sourceRefs: allowed.map((c) => consegnaSource(c.pazienteId, c.id, c.tipo, `${c.tipo}: ${c.note}`, c.scadenza)) };
}

export async function getClinicalScores(input: { patientId: string; scale?: string }, ctx: UserContext): Promise<SourcedResult<unknown[]>> {
  assertTenant(ctx); assertPatientAllowed(ctx, input.patientId);
  const { cartella, recordId } = await loadCartella(input.patientId);
  const c = cartella as Record<string, unknown[]>;
  const all: Record<string, unknown[]> = {
    braden: c.valutazioniBraden ?? [], tinetti: c.valutazioniTinetti ?? [], nrs: c.valutazioniNRS ?? [],
    medicazioni: c.medicazioniFerite ?? [], contenzioni: c.contenzioni ?? [],
  };
  const picked = input.scale ? { [input.scale]: all[input.scale] ?? [] } : all;
  const data = Object.entries(picked).flatMap(([scale, rows]) => (rows ?? []).slice(-3).map((r) => ({ scale, ...(r as object) })));
  gatewayAudit(ctx, 'get_clinical_scores', [input.patientId], data.length, data.length ? 'ok' : 'empty', nowIso());
  return { data, sourceRefs: data.map((d, i) => clinicalScoreSource(input.patientId, `${recordId}-${i}`,
    (d as { scale: string }).scale, `Scala ${(d as { scale: string }).scale}`)) };
}
```

In `types.ts` estendere la union:

```ts
export type SourceType =
  | 'PATIENT_FIELD' | 'NARRATIVE_SECTION' | 'VITAL_SIGN' | /* …esistenti… */
  | 'CONSEGNE' | 'CLINICAL_SCORE' | 'ROOM_OCCUPANCY' | 'ROOM_OCCUPANTS' | 'OPERATOR_SHIFT';
```

In `sources.ts` aggiungere gli helper seguendo ESATTAMENTE il pattern degli esistenti (`vitalSource`, `diarySource`):

```ts
export const consegnaSource = (patientId: string, recordId: string, label: string, text: string, at?: string): SourceReference =>
  ({ sourceType: 'CONSEGNE', patientId, recordId, label, text, at });
export const clinicalScoreSource = (patientId: string, recordId: string, label: string, text: string, at?: string): SourceReference =>
  ({ sourceType: 'CLINICAL_SCORE', patientId, recordId, label, text, at });
export const roomOccupancySource = (recordId: string, text: string): SourceReference =>
  ({ sourceType: 'ROOM_OCCUPANCY', patientId: '', recordId, label: 'Occupazione camere', text });
export const roomOccupantsSource = (patientId: string, recordId: string, text: string): SourceReference =>
  ({ sourceType: 'ROOM_OCCUPANTS', patientId, recordId, label: 'Occupante camera', text });
export const operatorShiftSource = (recordId: string, text: string): SourceReference =>
  ({ sourceType: 'OPERATOR_SHIFT', patientId: '', recordId, label: 'Turni operatori', text });
```

**Nota:** se `SourceReference` su main ha campi obbligatori diversi (es. `at`), adattare gli helper alla shape reale del file — la shape vincolante è quella di `types.ts` su main, non questa bozza.

- [ ] **Step 4: Test → PASS; poi build**

```bash
node_modules/.bin/tsx --test backend/src/ai/__tests__/gateway-kb.test.ts   # atteso: 3/3
npm --prefix backend run build                                             # atteso: exit 0
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/ai/gateway backend/src/ai/__tests__/gateway-kb.test.ts
git commit -m "feat(agnos-kb): gateway services camere (aggregato+occupanti), consegne, scale cliniche"
```

---

### Task 3: Turni operatori persistiti (`OperatorShift` + route + UI save)

**Files:**
- Modify: `prisma/schema.prisma` (nuovo modello additivo)
- Create: `prisma/migrations/20260710090000_operator_shifts/migration.sql`
- Create: `backend/src/routes/operator-shifts.ts`
- Modify: `backend/src/app.ts` (mount route — seguire il pattern degli altri `app.use`)
- Modify: `frontend/src/App.tsx` (caricare/salvare schedules dal backend invece di `MOCK_SCHEDULES`)
- Test: `backend/src/ai/__tests__/operator-shifts.test.ts` (helper puri)

**Interfaces:**
- Produces: modello `OperatorShift { id, operatoreId, operatoreNome, giorno('lun'..'dom'), oraInizio, oraFine, disponibile }`; route `GET/PUT /operator-shifts`; helper `onDuty(shifts, weekday)` usato dal Task 4.

- [ ] **Step 1: Schema + migration**

```prisma
// prisma/schema.prisma — aggiunta additiva (Agnos KB: turni persistiti, decisione 2026-07-10)
model OperatorShift {
  id            String   @id @default(cuid())
  operatoreId   String
  operatoreNome String
  giorno        String   // lun | mar | mer | gio | ven | sab | dom
  oraInizio     String   @default("08:00")
  oraFine       String   @default("20:00")
  disponibile   Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([operatoreId, giorno])
  @@index([giorno])
}
```

```sql
-- prisma/migrations/20260710090000_operator_shifts/migration.sql
CREATE TABLE "OperatorShift" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "operatoreId" TEXT NOT NULL,
  "operatoreNome" TEXT NOT NULL,
  "giorno" TEXT NOT NULL,
  "oraInizio" TEXT NOT NULL DEFAULT '08:00',
  "oraFine" TEXT NOT NULL DEFAULT '20:00',
  "disponibile" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "OperatorShift_operatoreId_giorno_key" ON "OperatorShift"("operatoreId", "giorno");
CREATE INDEX "OperatorShift_giorno_idx" ON "OperatorShift"("giorno");
```

```bash
podman start clinicos-postgres
npx prisma migrate deploy --schema=prisma/schema.prisma   # applica la migration
npm run db:generate
```

- [ ] **Step 2: Test helper puro `onDuty` che fallisce**

```ts
// backend/src/ai/__tests__/operator-shifts.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onDuty, weekdayIt } from '../../routes/operator-shifts.js';

test('weekdayIt: 2026-07-10 (venerdì) → ven', () => { assert.equal(weekdayIt('2026-07-10'), 'ven'); });

test('onDuty filtra per giorno e disponibilità', () => {
  const shifts = [
    { operatoreId: 'o1', operatoreNome: 'Rossi', giorno: 'ven', oraInizio: '08:00', oraFine: '20:00', disponibile: true },
    { operatoreId: 'o2', operatoreNome: 'Bianchi', giorno: 'ven', oraInizio: '08:00', oraFine: '20:00', disponibile: false },
    { operatoreId: 'o3', operatoreNome: 'Verdi', giorno: 'sab', oraInizio: '08:00', oraFine: '20:00', disponibile: true },
  ];
  const r = onDuty(shifts, 'ven');
  assert.equal(r.length, 1);
  assert.equal(r[0].operatoreNome, 'Rossi');
});
```

- [ ] **Step 3: Route + helper**

```ts
// backend/src/routes/operator-shifts.ts — turni operatori persistiti (Agnos KB).
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export interface ShiftRow { operatoreId: string; operatoreNome: string; giorno: string; oraInizio: string; oraFine: string; disponibile: boolean }
const GIORNI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
export const weekdayIt = (isoDay: string): string => GIORNI[new Date(`${isoDay}T12:00:00.000Z`).getUTCDay()];
export const onDuty = (shifts: ShiftRow[], giorno: string): ShiftRow[] =>
  shifts.filter((s) => s.giorno === giorno && s.disponibile);

const router = Router();

router.get('/', async (_req, res) => {
  const rows = await prisma.operatorShift.findMany({ orderBy: [{ operatoreNome: 'asc' }, { giorno: 'asc' }] });
  res.json({ shifts: rows });
});

// PUT idempotente: upsert dell'intera settimana di UN operatore (payload dalla UI OperatorSchedule).
router.put('/:operatoreId', async (req, res) => {
  const { operatoreId } = req.params;
  const { operatoreNome, turni } = req.body as { operatoreNome: string;
    turni: Array<{ giorno: string; oraInizio?: string; oraFine?: string; disponibile: boolean }> };
  if (!operatoreNome || !Array.isArray(turni)) { res.status(400).json({ error: 'operatoreNome e turni richiesti' }); return; }
  for (const t of turni) {
    if (!GIORNI.includes(t.giorno)) { res.status(400).json({ error: `giorno non valido: ${t.giorno}` }); return; }
    await prisma.operatorShift.upsert({
      where: { operatoreId_giorno: { operatoreId, giorno: t.giorno } },
      update: { operatoreNome, oraInizio: t.oraInizio ?? '08:00', oraFine: t.oraFine ?? '20:00', disponibile: t.disponibile },
      create: { operatoreId, operatoreNome, giorno: t.giorno, oraInizio: t.oraInizio ?? '08:00', oraFine: t.oraFine ?? '20:00', disponibile: t.disponibile },
    });
  }
  const rows = await prisma.operatorShift.findMany({ where: { operatoreId } });
  res.json({ shifts: rows });
});

export default router;
```

In `backend/src/app.ts`, accanto agli altri mount: `app.use('/operator-shifts', operatorShiftsRouter);` (import in testa, stesso stile degli esistenti).

- [ ] **Step 4: Frontend — sostituire MOCK_SCHEDULES con fetch/save reali** in `frontend/src/App.tsx`:
  - allo startup: `GET ${API_URL}/operator-shifts` → mappare a `ScheduleOperatore[]` (raggruppando per `operatoreId`, `turni` = righe per giorno);
  - `saveSchedule(s)` (riga ~438): oltre a `setSchedules`, `PUT ${API_URL}/operator-shifts/${s.operatoreId}` con `{ operatoreNome, turni }`;
  - se il GET fallisce → tenere i MOCK come fallback visivo, log console assente (pattern try/catch silenzioso NON ammesso: mostrare toast errore esistente se disponibile, altrimenti stato `schedulesError`).

- [ ] **Step 5: Test + build entrambi**

```bash
node_modules/.bin/tsx --test backend/src/ai/__tests__/operator-shifts.test.ts   # 2/2
npm --prefix backend run build
NODE_OPTIONS=--max-old-space-size=4096 npm run build:frontend
```

- [ ] **Step 6: Commit**

```bash
git add prisma backend/src/routes/operator-shifts.ts backend/src/app.ts frontend/src/App.tsx backend/src/ai/__tests__/operator-shifts.test.ts
git commit -m "feat(agnos-kb): turni operatori persistiti (OperatorShift + route + UI save)"
```

---

### Task 4: Service `queryOperators` (turni reali + pazienti in carico)

**Files:**
- Modify: `backend/src/ai/gateway/services.ts`
- Test: estendere `backend/src/ai/__tests__/gateway-kb.test.ts`

**Interfaces:**
- Consumes: `onDuty`, `weekdayIt` dal Task 3; `operatorShiftSource` dal Task 2.
- Produces: `queryOperators(input: { day?: string }, ctx: UserContext): Promise<SourcedResult<OperatorDutyRow[]>>` con `OperatorDutyRow = { operatoreId, operatoreNome, oraInizio, oraFine, pazientiInCarico: number }`.

- [ ] **Step 1: Test puro che fallisce** — estrarre `dutyRows(shifts, counts, giorno)`:

```ts
test('dutyRows: solo disponibili del giorno, con conteggio pazienti in carico', () => {
  const shifts = [
    { operatoreId: 'o1', operatoreNome: 'Rossi', giorno: 'ven', oraInizio: '08:00', oraFine: '20:00', disponibile: true },
    { operatoreId: 'o2', operatoreNome: 'Bianchi', giorno: 'ven', oraInizio: '08:00', oraFine: '20:00', disponibile: false },
  ];
  const rows = dutyRows(shifts, new Map([['o1', 7]]), 'ven');
  assert.deepEqual(rows, [{ operatoreId: 'o1', operatoreNome: 'Rossi', oraInizio: '08:00', oraFine: '20:00', pazientiInCarico: 7 }]);
});
```

- [ ] **Step 2: Implementare** in `services.ts`:

```ts
import { onDuty, weekdayIt, type ShiftRow } from '../../routes/operator-shifts.js';

export interface OperatorDutyRow { operatoreId: string; operatoreNome: string; oraInizio: string; oraFine: string; pazientiInCarico: number }

export function dutyRows(shifts: ShiftRow[], counts: Map<string, number>, giorno: string): OperatorDutyRow[] {
  return onDuty(shifts, giorno).map((s) => ({ operatoreId: s.operatoreId, operatoreNome: s.operatoreNome,
    oraInizio: s.oraInizio, oraFine: s.oraFine, pazientiInCarico: counts.get(s.operatoreId) ?? 0 }));
}

/** SOLO ADMIN (spec §2): dato organizzativo. Il gate ruolo è imposto qui, non a valle. */
export async function queryOperators(input: { day?: string }, ctx: UserContext): Promise<SourcedResult<OperatorDutyRow[]>> {
  assertTenant(ctx);
  if (!ctx.roles.includes('admin')) {
    throw new GatewayError('role_denied', 'Informazioni sui turni disponibili solo per il ruolo amministratore.');
  }
  const day = input.day ?? new Date().toISOString().slice(0, 10);
  const shifts = await prisma.operatorShift.findMany();
  // pazienti in carico ≈ appuntamenti odierni per operatore (fonte reale disponibile).
  const from = new Date(`${day}T00:00:00.000Z`); const to = new Date(`${day}T23:59:59.999Z`);
  const appts = await prisma.appointment.groupBy({ by: ['operatorId'], where: { scheduledAt: { gte: from, lte: to } }, _count: { _all: true } });
  const counts = new Map(appts.map((a) => [a.operatorId ?? '', a._count._all]));
  const rows = dutyRows(shifts as ShiftRow[], counts, weekdayIt(day));
  gatewayAudit(ctx, 'query_operators', [], rows.length, rows.length ? 'ok' : 'empty', nowIso());
  return { data: rows, sourceRefs: [operatorShiftSource(`duty-${day}`, `${rows.length} operatori disponibili ${day}`)] };
}
```

**Nota:** verificare il campo operatore su `Appointment` in schema.prisma (`operatorId` — confermare il nome esatto; se diverso, usare quello reale). `GatewayError` esiste già in `gateway/types.ts` — usare la firma reale del costruttore.

- [ ] **Step 3: Test → PASS, build, commit**

```bash
node_modules/.bin/tsx --test backend/src/ai/__tests__/gateway-kb.test.ts
npm --prefix backend run build
git add backend/src/ai/gateway/services.ts backend/src/ai/__tests__/gateway-kb.test.ts
git commit -m "feat(agnos-kb): queryOperators role-gated admin (turni + pazienti in carico)"
```

---

### Task 5: Intent + tool + dispatch (plan.ts, read-tools.ts, llm-planner.ts, service.ts)

**Files:**
- Modify: `backend/src/ai/assistant/plan.ts` (7 intent nel planner deterministico di fallback)
- Modify: `backend/src/ai/assistant/read-tools.ts` (allowlist + schema)
- Modify: `backend/src/ai/assistant/llm-planner.ts` (INTENTS, PATIENT_SCOPED)
- Modify: `backend/src/ai/assistant/service.ts` (dispatch nuovi tool + integrazione vitals-compare)
- Test: estendere `backend/src/ai/__tests__/assistant-plan.test.ts` + nuovo `backend/src/ai/__tests__/llm-planner-kb.test.ts`

**Interfaces:**
- Consumes: Task 1 (`compareVitals`, `vitalsTrend`), Task 2/4 services.
- Produces: `AssistantIntent` esteso con `'vitals_compare'|'vitals_trend'|'rooms_occupancy'|'rooms_occupants'|'consegne'|'diary_notes'|'clinical_scores'|'operators_on_duty'|'clarify'`; tool `compare_patient_vitals`, `get_patient_vitals_trend`, `query_rooms_occupancy`, `query_room_occupants`, `get_consegne`, `get_patient_diary`, `get_clinical_scores`, `query_operators`.

- [ ] **Step 1: Test planner deterministico (fallback) che falliscono** — aggiungere a `assistant-plan.test.ts`:

```ts
test('KB: "com\'è la pressione rispetto a ieri" → vitals_compare (paziente in contesto)', () => {
  const p = planQuery("com'è la pressione rispetto a ieri?", { currentPatientId: P });
  assert.equal(p.intent, 'vitals_compare');
  assert.equal(p.tools[0].tool, 'compare_patient_vitals');
});
test('KB: "andamento della temperatura questa settimana" → vitals_trend', () => {
  const p = planQuery('andamento della temperatura questa settimana', { currentPatientId: P });
  assert.equal(p.intent, 'vitals_trend');
});
test('KB: "quante camere sono occupate oggi" → rooms_occupancy aggregato, no cross access', () => {
  const p = planQuery('quante camere sono occupate oggi');
  assert.equal(p.intent, 'rooms_occupancy');
  assert.equal(p.requiresCrossPatientAccess, false);
});
test('KB: "la camera 12 è occupata da chi" → rooms_occupants con roomNumero', () => {
  const p = planQuery('la camera 12 è occupata da chi?');
  assert.equal(p.intent, 'rooms_occupants');
  assert.equal(p.tools[0].args.roomNumero, '12');
});
test('KB: "che consegne ci sono oggi" → consegne', () => {
  assert.equal(planQuery('che consegne ci sono oggi').intent, 'consegne');
});
test('KB: "cosa è stato scritto ieri nel diario" → diary_notes', () => {
  assert.equal(planQuery('cosa è stato scritto ieri nel diario?', { currentPatientId: P }).intent, 'diary_notes');
});
test('KB: "ultimo punteggio braden" → clinical_scores braden', () => {
  const p = planQuery('ultimo punteggio Braden', { currentPatientId: P });
  assert.equal(p.intent, 'clinical_scores');
  assert.equal(p.tools[0].args.scale, 'braden');
});
test('KB: "chi è di turno oggi" → operators_on_duty', () => {
  assert.equal(planQuery('chi è di turno oggi?').intent, 'operators_on_duty');
});
test('KB invariante: refuse_clinical vince sui nuovi intent', () => {
  assert.equal(planQuery('che terapia dovrei dare per la pressione alta?', { currentPatientId: P }).intent, 'refuse_clinical');
});
```

- [ ] **Step 2: Eseguire → FAIL. Implementare in `plan.ts`** — estendere la union e aggiungere i rami PRIMA dei rami generici `cerca|trova` (ordine: refusal → confronti → camere → consegne → diario → scale → turni → esistenti):

```ts
// dentro planQuery, dopo il blocco CLINICAL_REFUSAL:
if (scope === 'current_patient' && pid) {
  if (/(rispetto a|confronta.*con|vs\.?)\s*(ieri|luned|marted|mercoled|gioved|venerd|sabato|domenica|\d{4}-\d{2}-\d{2})/.test(q)
      && /(pression|pa\b|frequenza|fc\b|temperatura|spo2|satur)/.test(q))
    return base('vitals_compare', [{ tool: 'compare_patient_vitals', args: { patientId: pid, label: vitalLabel(q), dayB: refDay(q) } }]);
  if (/(andamento|trend|ultim[ai] (7|sette) giorni|questa settimana)/.test(q) && /(pression|pa\b|frequenza|fc\b|temperatura|spo2|satur|parametr)/.test(q))
    return base('vitals_trend', [{ tool: 'get_patient_vitals_trend', args: { patientId: pid, label: vitalLabel(q) } }]);
  if (/\bdiario\b|\bnote\b.*\bscritt/.test(q) || /cosa .*scritto/.test(q))
    return base('diary_notes', [{ tool: 'get_patient_diary', args: { patientId: pid, ...dayWindow(q) } }]);
  if (/braden|tinetti|nrs|medicazion|contenzion|scala|punteggio/.test(q))
    return base('clinical_scores', [{ tool: 'get_clinical_scores', args: { patientId: pid, scale: scaleKey(q) } }]);
  if (/\bconsegn/.test(q))
    return base('consegne', [{ tool: 'get_consegne', args: { patientId: pid } }]);
}
// cross / organizzativi:
const roomNum = /camera\s*(\d+)/.exec(q)?.[1];
if (roomNum && /(occupat|da chi|chi c'?e)/.test(q))
  return base('rooms_occupants', [{ tool: 'query_room_occupants', args: { roomNumero: roomNum } }]);
if (/(camere?|stanze?|letti?).*(occupat|liber|disponibil|manutenzione)|occupazione.*(camere?|stanze?|letti?)/.test(q))
  return base('rooms_occupancy', [{ tool: 'query_rooms_occupancy', args: {} }]);
if (/\bconsegn/.test(q))
  return base('consegne', [{ tool: 'get_consegne', args: { day: todayStrPlan() } }]);
if (/(chi e|chi è) di turno|turni (di )?oggi|operatori disponibili/.test(q))
  return base('operators_on_duty', [{ tool: 'query_operators', args: {} }]);
```

Helper da definire in fondo a `plan.ts` (puri): `vitalLabel(q)` (mappa pression→PA, frequenza→FC, temperatura→TC, spo2/satur→SPO2; default 'PA'), `refDay(q)` ('ieri' → stringa `'yesterday'` risolta poi dal dispatch; data esplicita → la data), `dayWindow(q)` ('ieri' → {from,to} del giorno prima, default ultimi 3 giorni), `scaleKey(q)` (braden|tinetti|nrs|medicazioni|contenzioni|undefined), `todayStrPlan()` (`new Date().toISOString().slice(0,10)`).

- [ ] **Step 3: read-tools.ts** — aggiungere a `READ_TOOLS` e `READ_TOOL_SCHEMA`:

```ts
'compare_patient_vitals', 'get_patient_vitals_trend', 'query_rooms_occupancy', 'query_room_occupants',
'get_consegne', 'get_patient_diary', 'get_clinical_scores', 'query_operators',
// schema:
{ name: 'compare_patient_vitals', args: { patientId: 'string', label: 'string', dayA: 'string?', dayB: 'string?' } },
{ name: 'get_patient_vitals_trend', args: { patientId: 'string', label: 'string', giorni: 'number?' } },
{ name: 'query_rooms_occupancy', args: {} },
{ name: 'query_room_occupants', args: { roomNumero: 'string?' } },
{ name: 'get_consegne', args: { patientId: 'string?', day: 'string?' } },
{ name: 'get_patient_diary', args: { patientId: 'string', from: 'string?', to: 'string?' } },
{ name: 'get_clinical_scores', args: { patientId: 'string', scale: 'string?' } },
{ name: 'query_operators', args: { day: 'string?' } },
```

- [ ] **Step 4: llm-planner.ts** — estendere `INTENTS` con i 9 nuovi (7 + `rooms_occupancy` + `clarify` del Task 6) e `PATIENT_SCOPED` con `compare_patient_vitals`, `get_patient_vitals_trend`, `get_patient_diary`, `get_clinical_scores`. Test nuovi in `llm-planner-kb.test.ts` con LLM MOCKATO:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planQueryLLM } from '../assistant/llm-planner.js';

const deps = (plan: unknown) => ({ callPlanRuntime: async () => ({ plan }), roles: ['operatore'] });

test('LLM propone vitals_compare valido → accettato, patientId iniettato server-side', async () => {
  const r = await planQueryLLM('pressione vs ieri', { currentPatientId: 'p-1' },
    deps({ intent: 'vitals_compare', scope: 'current_patient', requiresCrossPatientAccess: false,
      tools: [{ tool: 'compare_patient_vitals', args: { patientId: 'ALTRO-PAZIENTE', label: 'PA' } }] }));
  assert.equal(r.mode, 'llm');
  assert.equal(r.plan.tools[0].args.patientId, 'p-1');   // MAI quello proposto dall'LLM
});

test('LLM propone tool fuori allowlist → fallback deterministico', async () => {
  const r = await planQueryLLM('quante camere sono occupate oggi', {},
    deps({ intent: 'rooms_occupancy', scope: 'cross_patient', requiresCrossPatientAccess: false,
      tools: [{ tool: 'delete_patient', args: {} }] }));
  assert.equal(r.mode, 'deterministic');
  assert.equal(r.plan.intent, 'rooms_occupancy');        // il fallback regex lo copre comunque
});
```

- [ ] **Step 5: service.ts dispatch** — nel punto in cui i tool del piano vengono eseguiti (switch/if per tool name, stesso stile di `query_appointments_today`), aggiungere i casi. Per i confronti il dispatch legge la cartella e chiama il motore del Task 1:

```ts
case 'compare_patient_vitals': {
  const { cartella } = await loadCartellaFor(t.args.patientId as string, ctx); // riusare il loader del gateway
  const today = new Date().toISOString().slice(0, 10);
  const dayA = (t.args.dayA as string) ?? today;
  const rawB = (t.args.dayB as string) ?? 'yesterday';
  const dayB = rawB === 'yesterday' ? new Date(Date.now() - 86400000).toISOString().slice(0, 10) : rawB;
  const cmp = compareVitals(cartella.parametriVitali ?? [], (t.args.label as string) ?? 'PA', dayA, dayB);
  if (!cmp) { notFound = true; break; }
  results.push(cmp);
  sources.push(vitalSource(t.args.patientId as string, `cmp-${cmp.label}`, cmp.label,
    `${cmp.label} ${dayA}: ${fmtVal(cmp.valA)} · ${dayB}: ${fmtVal(cmp.valB)} · Δ ${fmtVal(cmp.delta)} ${cmp.unit}`, dayA));
  break;
}
```

(analogo per `get_patient_vitals_trend`; per gli altri 6 tool: chiamare i service del Task 2/4 e accodare `data`/`sourceRefs` — identico al pattern esistente per `search_documents`.) `fmtVal(v)` = `v ? (v.num2 !== undefined ? `${v.num}/${v.num2}` : String(v.num)) : 'n/d'` — definirlo accanto al dispatch.
`GatewayError` con kind `role_denied` (da `query_operators`) → mappare a `refusal` nell'answer (pattern esistente per cross-patient denied).

- [ ] **Step 6: Tutti i test + build**

```bash
node_modules/.bin/tsx --test backend/src/ai/__tests__/assistant-plan.test.ts     # vecchi + 9 nuovi PASS
node_modules/.bin/tsx --test backend/src/ai/__tests__/llm-planner-kb.test.ts     # 2/2
node_modules/.bin/tsx --test backend/src/ai/__tests__/actions.test.ts            # invarianti sicurezza intatti
npm --prefix backend run build
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/ai/assistant backend/src/ai/__tests__
git commit -m "feat(agnos-kb): 8 intent read nuovi end-to-end (planner det+LLM allowlist+dispatch)"
```

---

### Task 6: Esito `clarify` con catalogo suggerimenti

**Files:**
- Create: `backend/src/ai/assistant/clarify.ts`
- Modify: `backend/src/ai/assistant/service.ts` (unknown → clarify; campo `suggestions`)
- Modify: `backend/src/ai/assistant/llm-planner.ts` (accetta `intent:'clarify'` dal piano LLM)
- Test: `backend/src/ai/__tests__/clarify.test.ts`

**Interfaces:**
- Produces: `AssistantAnswer.suggestions?: string[]`; `suggestFor(ctx: { currentPatientId?: string; currentPatientName?: string; roles: string[] }): string[]`.

- [ ] **Step 1: Test che falliscono**

```ts
// backend/src/ai/__tests__/clarify.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestFor } from '../assistant/clarify.js';

test('con scheda aperta: suggerimenti compilati col nome reale, tutti da catalogo template', () => {
  const s = suggestFor({ currentPatientId: 'p1', currentPatientName: 'Moretti Elena', roles: ['operatore'] });
  assert.ok(s.length >= 2 && s.length <= 4);
  assert.ok(s.some((x) => x.includes('Moretti Elena')));
});

test('admin senza scheda: include suggerimenti organizzativi (camere/turni)', () => {
  const s = suggestFor({ roles: ['admin'] });
  assert.ok(s.some((x) => /camere/.test(x)));
  assert.ok(s.some((x) => /turno/.test(x)));
});

test('operatore senza scheda: MAI suggerimento turni (role-gated)', () => {
  const s = suggestFor({ roles: ['operatore'] });
  assert.equal(s.some((x) => /turno/.test(x)), false);
});
```

- [ ] **Step 2: Implementare `clarify.ts`** — catalogo STATICO di template (anti-allucinazione strutturale, spec §3b): ogni voce corrisponde a un intent eseguibile.

```ts
// backend/src/ai/assistant/clarify.ts — spec §3b: suggerimenti da catalogo statico per intent,
// compilati con dati reali del contesto. MAI testo libero LLM ⇒ ogni chip è eseguibile per costruzione.
export interface ClarifyCtx { currentPatientId?: string; currentPatientName?: string; roles: string[] }

const WITH_PATIENT = (nome: string) => [
  `Ultimi parametri di ${nome}`,                 // vitals_recent
  `Confronta la pressione di ${nome} con ieri`,  // vitals_compare
  `Terapie attive di ${nome}`,                   // therapies
  `Consegne per ${nome}`,                        // consegne
];
const GENERIC_OPERATOR = [
  'Quante camere sono occupate?',                // rooms_occupancy
  'Consegne di oggi',                            // consegne
  'Appuntamenti di oggi',                        // appointments
];
const GENERIC_ADMIN = [
  'Quante camere sono occupate?',                // rooms_occupancy
  'La camera 12 è occupata da chi?',             // rooms_occupants
  'Chi è di turno oggi?',                        // operators_on_duty
  'Consegne di oggi',                            // consegne
];

export function suggestFor(ctx: ClarifyCtx): string[] {
  if (ctx.currentPatientId && ctx.currentPatientName) return WITH_PATIENT(ctx.currentPatientName);
  return (ctx.roles.includes('admin') ? GENERIC_ADMIN : GENERIC_OPERATOR).slice(0, 4);
}
```

- [ ] **Step 3: Integrare in `service.ts`**: quando l'esito finale è `unknown`/`notFound` senza refusal, popolare `suggestions: suggestFor({ currentPatientId: effectiveCtx.currentPatientId, currentPatientName: planCtx.currentPatientName, roles: ctx.roles })` e `answerText: 'Non ho capito bene la domanda. Forse intendevi:'`. Aggiungere `suggestions?: string[]` a `AssistantAnswer` e `currentPatientName?: string` a `PlanContext` (propagato dalla route `/ai/actions/plan` che già riceve il body — verificare che il body contenga `currentPatientName`; se no, aggiungerlo al POST del frontend nel Task 7). In `llm-planner.ts` aggiungere `'clarify'` a `INTENTS`: un piano LLM `{intent:'clarify', tools:[]}` è valido e produce l'esito clarify senza eseguire tool.

- [ ] **Step 4: Test → PASS, build, commit**

```bash
node_modules/.bin/tsx --test backend/src/ai/__tests__/clarify.test.ts
npm --prefix backend run build
git add backend/src/ai/assistant backend/src/ai/__tests__/clarify.test.ts
git commit -m "feat(agnos-kb): esito clarify con catalogo suggerimenti role-aware"
```

---

### Task 7: Frontend — chips clarify + rendering confronti

**Files:**
- Modify: `frontend/src/components/shared/agnos/useAgnosChat.ts` (tipo AssistantAnswer client: `suggestions?: string[]`; POST include `currentPatientName`; esporre `submitText(text)` riusabile per le chips)
- Modify: `frontend/src/components/shared/AgnosPanel.tsx` (render chips; TTS legge solo la frase introduttiva)
- Modify: `frontend/src/App.css` (stile `.agnos-chips`)
- Test: build TS (`tsc -b`) — la verifica funzionale è nel Task 8 (Playwright)

**Interfaces:**
- Consumes: `AssistantAnswer.suggestions` dal Task 6.
- Produces: chips cliccabili `data-testid="agnos-chip"` che inviano il testo suggerito come nuovo turno.

- [ ] **Step 1: In `useAgnosChat.ts`** — nel body del POST `/ai/actions/plan` aggiungere `currentPatientName` (la prop esiste già in AgnosPanel). Verificare che la funzione di submit sia già esposta dal hook (es. `send`/`submit`); se è interna, esportarla nel return del hook come `sendText(text: string)`.

- [ ] **Step 2: In `AgnosPanel.tsx`**, sotto `<AnswerView …/>` (riga ~262):

```tsx
{turn.read?.suggestions && turn.read.suggestions.length > 0 && (
  <div className="agnos-chips" role="group" aria-label="Forse intendevi">
    {turn.read.suggestions.map((s) => (
      <button key={s} type="button" className="agnos-chip" data-testid="agnos-chip"
        disabled={busy} onClick={() => sendText(s)}>
        {s}
      </button>
    ))}
  </div>
)}
```

TTS: in `spokenTextFor` (riga ~38), per un turno con `suggestions` ritornare SOLO `turn.read.answerText` (la frase introduttiva), mai le chips.

- [ ] **Step 3: CSS** in `App.css` (palette progetto, mai rosso):

```css
.agnos-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.agnos-chip { border: 1px solid #D0D5DD; background: #fff; color: #0F5FD7; border-radius: 16px;
  padding: 4px 12px; font-size: 13px; cursor: pointer; }
.agnos-chip:hover { background: #E9EDF2; }
.agnos-chip:disabled { opacity: .5; cursor: default; }
```

- [ ] **Step 4: Build + commit**

```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run build:frontend   # tsc -b && vite build, exit 0
git add frontend/src
git commit -m "feat(agnos-kb): chips clarify cliccabili nel pannello Agnos (TTS solo frase intro)"
```

---

### Task 8: Evidenza Playwright + regressione completa (Codex Gate)

**Files:**
- Create: `e2e/agnos-kb.mjs` (harness stesso pattern di `e2e/issue-239-plan-routing.mjs`: intercetta `POST /ai/actions/plan`, trace+video+screenshot)
- Create: `artifacts/task-validation/agnos-knowledge-base/{task-contract.md, validation-report.md, screenshots/, trace/, video/, logs/}`

**Interfaces:** Consuma l'app completa contro stack locale (Postgres Podman + backend :3001 + frontend :5173, DB seeded).

- [ ] **Step 1: Preparare lo stack** (skill run-clinicos): `podman start clinicos-postgres`; `npx prisma migrate deploy`; seed turni sintetici via `PUT /operator-shifts/<op-id>`; seed 2+ giorni di parametri PA sintetici sul paziente demo (via API cartella o SQL diretto, dati SINTETICI).

- [ ] **Step 2: Scenari nell'harness** (ogni scenario = assert su request/response intercettata + assert UI + screenshot):
  1. `quante camere sono occupate oggi` → `intent=rooms_occupancy`, notFound=false, **nessun nome paziente nel payload** (`/nome|patient|cognome/i` assente nei results)
  2. `la camera <numero-reale> è occupata da chi?` → `intent=rooms_occupants`, results[0].patientName presente
  3. `com'è la pressione rispetto a ieri?` (scheda paziente aperta) → `intent=vitals_compare`, delta numerico
  4. `andamento della pressione questa settimana` → `intent=vitals_trend`, direction ∈ {salita,stabile,calo}
  5. `consegne di oggi` → `intent=consegne`
  6. `cosa è stato scritto nel diario?` (scheda aperta) → `intent=diary_notes`
  7. `ultimo punteggio Braden` (scheda aperta) → `intent=clinical_scores`
  8. `chi è di turno oggi?` da ADMIN → `intent=operators_on_duty` con risultati; stesso prompt da OPERATORE → refusal role-gated
  9. **clarify**: `dammi i dati` → `suggestions.length>=2`, chips `[data-testid="agnos-chip"]` visibili → click sulla prima → nuovo turno con risposta reale (screenshot prima/dopo)
  10. Invarianti: `cancella la nota del diario` → refusal (delete); `nessun console error` nuovo
- [ ] **Step 3: Regressione completa backend**

```bash
for f in backend/src/ai/__tests__/*.test.ts; do node_modules/.bin/tsx --test "$f" || exit 1; done
npm --prefix backend run build
NODE_OPTIONS=--max-old-space-size=4096 npm run build:frontend
```

- [ ] **Step 4: `validation-report.md`** con tabella AC (spec §2-§4) → esiti, path evidenze reali, e chiusura: `Final Decision: READY FOR CODEX QA`. Commit + push branch `feat/agnos-kb`.

```bash
git add e2e/agnos-kb.mjs artifacts/task-validation/agnos-knowledge-base
git commit -m "test(agnos-kb): evidenza Playwright completa (10 scenari) + validation report"
git push -u origin feat/agnos-kb
```

- [ ] **Step 5: Aprire PR** verso `main` con `Fixes`/riferimenti alle issue pertinenti, corpo con link evidenze — **senza** merge (Codex Gate).

---

## Self-Review (eseguita)

- **Copertura spec**: architettura LLM-first (Task 5 usa llm-planner esistente di main = spec §1); 7 intent (Task 2/3/4/5); confronti backend-only (Task 1); clarify+chips (Task 6/7); errori/fallback (Task 5 step 4-5, GatewayError→refusal); test LLM-mockato (Task 5 llm-planner-kb, deps iniettate); evidenza Playwright (Task 8). Voce: nessun task — per spec resta invariata; lo scenario TTS/chips è coperto in Task 7 step 2 + Task 8.
- **Scostamenti (spec §3a)**: soglie env `AGNOS_DEV_<LABEL>` implementate in Task 1 `threshold()`; presentazione come dato nel dispatch Task 5 (source text con Δ).
- **Tipi coerenti**: `VitalEntry/VitalsComparison/VitalsTrend` (Task 1) usati nel dispatch (Task 5); `ShiftRow/onDuty/weekdayIt` (Task 3) usati da `dutyRows/queryOperators` (Task 4); `suggestions` (Task 6) letto dal frontend (Task 7) e asserito in E2E (Task 8).
- **Punti da verificare in esecuzione (dichiarati, non placeholder)**: shape esatta `SourceReference` su main (Task 2 nota); nome campo operatore su `Appointment` (Task 4 nota); nome della funzione submit in `useAgnosChat` (Task 7 step 1). Ogni nota indica il file e il criterio di adattamento.
