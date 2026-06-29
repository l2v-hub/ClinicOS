# Intake Clinical Editors (Terapia / Parametri / Dolore) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the three placeholder intake editors (Terapia, Parametri, Dolore) controlled and fillable during patient intake, and persist their data in the transactional `confirmDraft` — therapy as real `PatientTherapy`/`TherapySchedule` rows, vitals/pain in the `Cartella.data` JSON.

**Architecture:** Backend — extract the therapy create logic from the POST route into a shared `createTherapyInTx(tx, patientId, input)` reused by both the route and a therapy-aware `materializePatient`. Frontend — extract the therapy form fields from `TerapiaFarmacologicaTab` into a presentational `TherapyFormFields` consumed by both the chart tab (no behaviour change) and a new controlled `TherapyEditor` intake list; wrap the cartella-backed `ParametriTab`/`ScalaNRSTab` in intake shims; wire the three section values into `handleConfirm`.

**Tech Stack:** Node + Express + Prisma 7 (backend, vitest/`tsx --test`), React + TypeScript + Vite (frontend).

## Global Constraints

- Do NOT change the Prisma schema (PatientTherapy/TherapySchedule already exist; vitals/pain stay in Cartella JSON — no new tables).
- The Patient Chart therapy tab (`TerapiaFarmacologicaTab`, `mode="patient-chart"`) must behave EXACTLY as before after the form extraction — same fields, same API save/list. Verify no-regression before building the intake editor.
- Do NOT break the existing `/patients/:patientId/therapies` route behaviour (the extraction is a pure refactor — the existing backend suite must stay green).
- Do NOT break the manual or import intake paths: therapy/vitals/pain are additive; a draft without them confirms exactly as today (`therapies=undefined`).
- Therapy parity: intake therapy must produce the SAME `PatientTherapy`+`TherapySchedule` rows as the chart route (reuse `createTherapyInTx`, do not invent a second therapy persistence path).
- Type-check is authoritative: `cd frontend && NODE_OPTIONS=--max-old-space-size=7168 node ../node_modules/typescript/bin/tsc -b` must pass (vite build does NOT type-check). Backend: `cd backend && npx tsc --noEmit` + `npm test`.
- Operator-gated confirm already threads `X-Operator-Id`/`X-Operator-Role`; therapy rows carry `operatoreInseritore` = the operator name passed through.

---

### Task 1: Backend — extract `createTherapyInTx` shared helper; route reuses it

**Files:**
- Create: `backend/src/therapies/therapy-create.ts`
- Modify: `backend/src/routes/patient-therapies.ts:48-130` (POST handler → call the helper)
- Test: `backend/src/therapies/__tests__/therapy-create.test.ts`

**Interfaces:**
- Consumes: `normalizeSchedules`, `deriveLegacyFromSchedules`, `type ScheduleInput` from `../lib/therapy-dose.js`; `PrismaTx` (a `prisma.$transaction` tx client).
- Produces: `export interface TherapyCreateInput { farmacoNome: string; dataInizio: string; dosaggio?: string; viaSomministrazione?: string; tipo?: string; stato?: string; dataFine?: string; fasceMattina?: boolean; fascePranzo?: boolean; fascePomeriggio?: boolean; fasceSera?: boolean; fasceNotte?: boolean; orarioSpecifico?: string; prescrittore?: string; operatoreInseritore?: string; note?: string; dataSomministrazione?: string; orarioSomministrazione?: string; commercialStrengthValue?: number | string | null; commercialStrengthUnit?: string; pharmaceuticalForm?: string; allowedFractions?: string; drugPackageRef?: string; schedules?: unknown }` and `export async function createTherapyInTx(tx: PrismaTx, patientId: string, input: TherapyCreateInput): Promise<PatientTherapyWithSchedules>` (throws `Error('Campi obbligatori: farmacoNome, dataInizio')` when either is missing). `PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]`.

- [ ] **Step 1: Write the failing test** — `therapy-create.test.ts` (same `tsx --test` / node:test harness + prisma setup as `backend/src/intake/__tests__/seed-draft-from-import.test.ts`): create a patient, then in a `prisma.$transaction(tx => createTherapyInTx(tx, patient.id, {...}))` with `farmacoNome:'Tachipirina', dataInizio:'2026-06-29', commercialStrengthValue:500, commercialStrengthUnit:'mg', pharmaceuticalForm:'compressa', viaSomministrazione:'orale', tipo:'periodica', schedules:[{time:'08:00', quantityNumerator:1, quantityDenominator:1, administrationUnit:'compressa'}], operatoreInseritore:'Op Test'}`. Assert: returned row `farmacoNome==='Tachipirina'`, `dosaggio==='500 mg compressa'` (derived), `commercialStrengthValue===500`, one `schedules` row at `08:00`, and `fasceMattina===true` (derived from the 08:00 schedule). Add a second case: missing `farmacoNome` → the tx rejects with the obligatori error.
- [ ] **Step 2: Run test to verify it fails** — `cd backend && npx tsx --test src/therapies/__tests__/therapy-create.test.ts` → FAIL (module not found).
- [ ] **Step 3: Implement `createTherapyInTx`** — move the body of the POST handler (`backend/src/routes/patient-therapies.ts` lines ~53-129: the `deriveDosaggio` helper, strength/form parsing, `normalizeSchedules`, `deriveLegacyFromSchedules` fallback, and the `tx.patientTherapy.create({ data: {...}, include: { schedules: ... } })`) into `createTherapyInTx`. Use `tx` instead of `prisma`. Throw `Error('Campi obbligatori: farmacoNome, dataInizio')` instead of writing an HTTP 400. Keep `deriveDosaggio` co-located in this file (export it or keep private). Do NOT do the `patient.findUnique` existence check here — the caller owns that (the route keeps its 404; the confirm path already created the patient in the same tx).
- [ ] **Step 4: Refactor the route** — in `patient-therapies.ts` POST handler keep the `patient.findUnique` 404 check, then `const therapy = await prisma.$transaction(tx => createTherapyInTx(tx, patientId, req.body as TherapyCreateInput));` wrapped in try/catch that maps the obligatori `Error` → 400 and others → 500. Remove the now-duplicated inline create logic.
- [ ] **Step 5: Run tests** — `cd backend && npx tsx --test src/therapies/__tests__/therapy-create.test.ts` → PASS. Then `cd backend && npm test` → full suite green (route behaviour unchanged). `cd backend && npx tsc --noEmit` clean.
- [ ] **Step 6: Commit** — `git add backend/src/therapies backend/src/routes/patient-therapies.ts && git commit -m "intake-editors: extract createTherapyInTx shared helper"`

---

### Task 2: Backend — therapy-aware `materializePatient` + `confirmDraft`

**Files:**
- Modify: `backend/src/ai/upload/confirm-service.ts` (`MaterializeArgs`, `materializePatient`, `ConfirmPayload`, `confirmDraft`)
- Test: `backend/src/intake/__tests__/confirm-draft-therapy.test.ts`

**Interfaces:**
- Consumes: `createTherapyInTx`, `TherapyCreateInput` from `../../therapies/therapy-create.js`.
- Produces: `ConfirmPayload.therapies?: TherapyCreateInput[]`; `MaterializeArgs.therapies?: TherapyCreateInput[]`.

- [ ] **Step 1: Write the failing test** — `confirm-draft-therapy.test.ts`: create a draft (`createDraft({source:'manual'})`), then call `confirmDraft(draft.id, { patient:{firstName:'Anna', lastName:'Bianchi', dateOfBirth:'1960-01-01'}, cartella:{ parametriMensili:[{id:'p1', mese:6, anno:2026, giorni:[{giorno:1, pa:'120/80'}], createdAt:'2026-06-29T00:00:00Z'}], valutazioniNRS:[{id:'n1', data:'2026-06-29', punteggio:4, operatore:'Op', note:'', createdAt:'2026-06-29T00:00:00Z'}] }, therapies:[{farmacoNome:'Tachipirina', dataInizio:'2026-06-29', schedules:[{time:'08:00', quantityNumerator:1, quantityDenominator:1, administrationUnit:'compressa'}], operatoreInseritore:'Op'}] })`. Assert: result `status==='created'`; `prisma.patientTherapy.findMany({where:{patientId}})` returns 1 row with a schedule; the created `Cartella.data` contains `parametriMensili` (len 1) and `valutazioniNRS` (len 1).
- [ ] **Step 2: Run test to verify it fails** — `cd backend && npx tsx --test src/intake/__tests__/confirm-draft-therapy.test.ts` → FAIL (therapies not persisted).
- [ ] **Step 3: Extend `materializePatient`** — add `therapies?: TherapyCreateInput[]` to `MaterializeArgs`; after the `tx.cartella.create(...)` line, add: `if (therapies?.length) { for (const t of therapies) { await createTherapyInTx(tx, created.id, t); } }`. (Vitals/pain need nothing here — they are already inside `cartellaData`.)
- [ ] **Step 4: Thread through `confirmDraft`** — add `therapies?: TherapyCreateInput[]` to `ConfirmPayload`; in `confirmDraft`, pass `therapies: payload.therapies` into the `materializePatient(tx, {...})` call. Leave `confirmJob`'s call unchanged (no `therapies` → import path unaffected).
- [ ] **Step 5: Run tests** — `cd backend && npx tsx --test src/intake/__tests__/confirm-draft-therapy.test.ts` → PASS. Full suite `cd backend && npm test` green; `npx tsc --noEmit` clean.
- [ ] **Step 6: Commit** — `git add backend/src/ai/upload/confirm-service.ts backend/src/intake/__tests__/confirm-draft-therapy.test.ts && git commit -m "intake-editors: materialize therapies + persist vitals/pain on confirmDraft"`

---

### Task 3: Frontend — extract `TherapyFormFields` from `TerapiaFarmacologicaTab` (no-regression)

**Files:**
- Create: `frontend/src/components/operator/cartella/TherapyFormFields.tsx`
- Modify: `frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx` (consume the extracted component)

**Interfaces:**
- Produces: `export interface TherapyFormValue { farmacoNome: string; pharmaceuticalForm: string; commercialStrengthValue: string; commercialStrengthUnit: string; allowedFractions: string[]; viaSomministrazione: string; tipo: 'periodica' | 'una_tantum' | 'al_bisogno'; stato: 'attiva' | 'sospesa' | 'conclusa'; dataInizio: string; dataFine: string; schedules: ScheduleRow[]; prescrittore: string; note: string; dataSomministrazione: string; orarioSomministrazione: string }` (this is the existing in-file `TherapyForm` interface — re-export it under this name, or export the existing `TherapyForm` and alias). `export function TherapyFormFields({ value, onChange, operatoreNome }: { value: TherapyFormValue; onChange: (next: TherapyFormValue) => void; operatoreNome?: string })` — a controlled, presentational render of ALL therapy form inputs + the schedule builder (the JSX the tab currently renders inside its add/edit form, including `updateSchedule`/add-row/remove-row handlers operating on `value.schedules` via `onChange`).

- [ ] **Step 1: Read the tab** — open `TerapiaFarmacologicaTab.tsx`; identify the `TherapyForm` interface (line ~54), `emptyForm()` (~74), `updateSchedule` (~366), and the form JSX block (inside the `showForm` render, roughly lines ~607-820 — the farmaco/dose/via/tipo/schedule inputs). These move into `TherapyFormFields`.
- [ ] **Step 2: Create `TherapyFormFields.tsx`** — export `TherapyFormValue` (= the `TherapyForm` shape) and the `ScheduleRow` re-export; implement `TherapyFormFields` as a controlled component: it renders every therapy input bound to `value.*` and calls `onChange({ ...value, <field>: ... })` on edits; the schedule rows use `onChange({ ...value, schedules: nextRows })`. No `useState` for the form value (fully controlled), no fetch, no patientId. Keep `emptyForm()` exported here too (`export function emptyTherapyForm(): TherapyFormValue`).
- [ ] **Step 3: Refactor the tab to consume it** — in `TerapiaFarmacologicaTab`, replace the inline form JSX with `<TherapyFormFields value={form} onChange={setForm} operatoreNome={operatoreNome} />`; import `emptyTherapyForm` for its `emptyForm()` uses (or keep a thin local wrapper). The tab keeps its `useState<TherapyForm>`, its API `formToPayload`/save/list/delete, sub-tabs, and slot logic unchanged.
- [ ] **Step 4: Type-check** — `cd frontend && NODE_OPTIONS=--max-old-space-size=7168 node ../node_modules/typescript/bin/tsc -b` → 0 errors.
- [ ] **Step 5: No-regression visual check** — start tiers + drive the chart therapy tab (run-clinicos driver) and confirm the add-therapy form renders identically (all fields + schedule builder). Capture a screenshot to `requirements/evidence/intake-editors/therapy-tab-after-extract.png`. (Synthetic data only; do not screenshot real patients — use the form view.)
- [ ] **Step 6: Commit** — `git add frontend/src/components/operator/cartella/TherapyFormFields.tsx frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx requirements/evidence/intake-editors && git commit -m "intake-editors: extract TherapyFormFields shared form (chart unchanged)"`

---

### Task 4: Frontend — `TherapyEditor` controlled intake list

**Files:**
- Modify: `frontend/src/components/operator/sections/TherapyEditor.tsx`

**Interfaces:**
- Consumes: `TherapyFormFields`, `TherapyFormValue`, `emptyTherapyForm` from `../cartella/TherapyFormFields`.
- Produces: `TherapyEditor` now accepts `SectionProps<TherapyFormValue[]>` (value = the list of therapy items collected during intake) in addition to the existing `patient-chart` branch.

- [ ] **Step 1: Change the value type + add the intake branch** — update the props to `SectionProps<TherapyFormValue[]> & { paziente?: Paziente }`. Keep the existing `mode==='patient-chart'` branch (renders `TerapiaFarmacologicaTab`) unchanged. Add: when `mode==='intake'`, render a controlled list editor:
  - local `useState` only for the in-progress draft item (`emptyTherapyForm()`) and an `editingIndex|null`;
  - `<TherapyFormFields value={draftItem} onChange={setDraftItem} operatoreNome={operatoreNome} />` + an "Aggiungi terapia" button that appends `draftItem` to `value` via `onChange([...value, draftItem])` (or replaces at `editingIndex`) and resets the draft;
  - a list of the added therapies (`value`, default `[]`) showing `farmacoNome` + `dosaggio`-ish summary, each with "Modifica" (load into draftItem) and "Rimuovi" (`onChange(value.filter((_,i)=>i!==idx))`).
  - Guard `const items = value ?? []` (draft may seed `undefined`).
- [ ] **Step 2: Type-check** — `cd frontend && NODE_OPTIONS=--max-old-space-size=7168 node ../node_modules/typescript/bin/tsc -b` → 0 errors. (The registry cast in `patientSections.ts` is `as unknown as ComponentType<SectionProps<never>>`, so the widened value type still compiles; if tsc flags the registry entry, keep the existing `as unknown as` cast.)
- [ ] **Step 3: Commit** — `git add frontend/src/components/operator/sections/TherapyEditor.tsx && git commit -m "intake-editors: TherapyEditor controlled intake list"`

---

### Task 5: Frontend — `VitalSignsEditor` + `PainAssessmentEditor` intake shims

**Files:**
- Modify: `frontend/src/components/operator/sections/VitalSignsEditor.tsx`
- Modify: `frontend/src/components/operator/sections/PainAssessmentEditor.tsx`

**Interfaces:**
- Consumes: `ParametriTab`/`ScalaNRSTab` (already lazy-imported), `CartellaPaziente`, `ParametriMensili`, `ScalaNRSValutazione` from `../../../types`.
- Produces: `VitalSignsEditor: SectionProps<ParametriMensili[]>`, `PainAssessmentEditor: SectionProps<ScalaNRSValutazione[]>` (plus the existing patient-chart extras).

- [ ] **Step 1: VitalSignsEditor intake shim** — widen props to `SectionProps<ParametriMensili[]> & { cartella?: CartellaPaziente; paziente?: Paziente; onUpdate?: (patch: Partial<CartellaPaziente>) => void }`. Keep the `patient-chart` branch. Add `mode==='intake'`: build a synthetic cartella `const shim = { parametriMensili: value ?? [] } as unknown as CartellaPaziente;` and render `<Suspense fallback={null}><ParametriTab cartella={shim} paziente={(paziente ?? {}) as Paziente} onUpdate={(patch) => onChange((patch.parametriMensili as ParametriMensili[]) ?? (value ?? []))} operatoreNome={operatoreNome ?? ''} /></Suspense>`. (Read `ParametriTab` first to confirm it does not dereference required `paziente` fields that would crash on `{}`; if it reads `paziente.nome`/etc for a signature label, pass `{ nome:'', cognome:'' } as Paziente` or whatever minimal it needs.)
- [ ] **Step 2: PainAssessmentEditor intake shim** — same pattern with `valutazioniNRS`: widen to `SectionProps<ScalaNRSValutazione[]>`; intake branch builds `{ valutazioniNRS: value ?? [] } as unknown as CartellaPaziente` and maps `onUpdate` → `onChange((patch.valutazioniNRS as ScalaNRSValutazione[]) ?? (value ?? []))`. Read `ScalaNRSTab` first for the same paziente-field safety check.
- [ ] **Step 3: Type-check** — `cd frontend && NODE_OPTIONS=--max-old-space-size=7168 node ../node_modules/typescript/bin/tsc -b` → 0 errors.
- [ ] **Step 4: Commit** — `git add frontend/src/components/operator/sections/VitalSignsEditor.tsx frontend/src/components/operator/sections/PainAssessmentEditor.tsx && git commit -m "intake-editors: vitals + pain intake shims over existing tabs"`

---

### Task 6: Frontend — confirm wiring in `IntakeWorkspace`

**Files:**
- Modify: `frontend/src/components/shared/intake/IntakeWorkspace.tsx` (`handleConfirm`)
- Modify (if needed): `frontend/src/components/shared/intake/StepClinica.tsx` (value typing only — it already passes `data[sectionKey]`/`onUpdateSection`)

**Interfaces:**
- Consumes: `data.terapia: TherapyFormValue[]`, `data.parametri: ParametriMensili[]`, `data.dolore: ScalaNRSValutazione[]` from the draft (populated by Tasks 4-5).

- [ ] **Step 1: Map therapy form → TherapyCreateInput** — add a small mapper in `IntakeWorkspace.tsx` (mirror of the tab's `formToPayload` minus patientId): `function therapyFormToInput(f, operatoreNome) { return { farmacoNome:f.farmacoNome, dataInizio:f.dataInizio, dataFine:f.dataFine||undefined, viaSomministrazione:f.viaSomministrazione, tipo:f.tipo, stato:f.stato, commercialStrengthValue:f.commercialStrengthValue?Number(f.commercialStrengthValue):undefined, commercialStrengthUnit:f.commercialStrengthUnit||undefined, pharmaceuticalForm:f.pharmaceuticalForm||undefined, allowedFractions:f.allowedFractions?.join(',')||undefined, prescrittore:f.prescrittore||undefined, operatoreInseritore:operatoreNome||undefined, note:f.note||undefined, dataSomministrazione:f.dataSomministrazione||undefined, orarioSomministrazione:f.orarioSomministrazione||undefined, schedules:f.schedules } }`. (Confirm the exact `formToPayload` field mapping in `TerapiaFarmacologicaTab.tsx:134` and match it.)
- [ ] **Step 2: Extend `handleConfirm`** — in the cartella object add `...(data.parametri && { parametriMensili: data.parametri }), ...(data.dolore && { valutazioniNRS: data.dolore })`; in the top-level `payload` object add `...(Array.isArray(data.terapia) && data.terapia.length && { therapies: (data.terapia as TherapyFormValue[]).map(f => therapyFormToInput(f, operatoreNome)) })`. The `confirmDraft` client already sends `payload` verbatim — no api client change needed.
- [ ] **Step 3: Type-check** — `cd frontend && NODE_OPTIONS=--max-old-space-size=7168 node ../node_modules/typescript/bin/tsc -b` → 0 errors.
- [ ] **Step 4: Commit** — `git add frontend/src/components/shared/intake/IntakeWorkspace.tsx frontend/src/components/shared/intake/StepClinica.tsx && git commit -m "intake-editors: wire terapia/parametri/dolore into confirm"`

---

## Self-Review notes
- Spec A (backend therapy create + materialize) → Tasks 1-2. Spec B (therapy form + intake editor) → Tasks 3-4. Spec C (vitals/pain shims) → Task 5. Spec D (confirm wiring) → Task 6. All covered.
- Type consistency: `TherapyCreateInput` (backend) defined Task 1, consumed Tasks 2+6 (frontend mapper produces the same field set). `TherapyFormValue` defined Task 3, consumed Tasks 4+6. `ParametriMensili[]`/`ScalaNRSValutazione[]` from `frontend/src/types.ts` used Tasks 5+6.
- No-regression gate on the one risky refactor (Task 3 form extraction) before the intake editor depends on it (Task 4).
- Persistence: vitals/pain ride in `cartella` (already written to `Cartella.data`); therapy via `createTherapyInTx` in the same confirm transaction → full rollback on any failure.
