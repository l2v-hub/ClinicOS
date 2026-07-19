# F4 — Intake Workspace (#122) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Replace the small `NewPatientModal` popup with a full-screen 6-step guided intake workspace that fills a server-persisted `PatientIntakeDraft` (#125) using the shared clinical editors (#123), then creates the patient transactionally via `confirmDraft`.

**Architecture:** A new `IntakeWorkspace` component (6-step stepper). On open it `POST /intake/drafts` to create a draft, autosaves each step via `PATCH /intake/drafts/:id` (debounced). Steps 1-2 are anagrafica/admission forms; step 3 renders the registry's `intakeSections()` editors in `mode="intake"` driven by `draft.data` (extracted editors — Allergie/Diagnosi/Anamnesi — are already controlled; wrapped editors — Terapia/Parametri/NRS — render their "in arrivo" placeholder until their controlled variants land in a follow-up); steps 4-5 are moduli/documenti; step 6 reviews and calls `POST /intake/drafts/:id/confirm`. The "+ Nuovo paziente" triggers (PatientList, Operator/Admin Agenda) open the workspace instead of the popup.

**Tech Stack:** React + TypeScript + Vite. API via `API_URL` from `frontend/src/config.ts`. Pure-logic tests via node runner (`tsx --test`). Visual via `.claude/skills/run-clinicos/driver.mjs`.

## Global Constraints

- Do NOT change backend/Prisma/routes (#125 endpoints already exist: `POST/GET/PATCH /intake/drafts`, `POST /intake/drafts/:id/confirm`). Do NOT change `VITE_API_URL`.
- Reuse the shared editors + registry from #123 (`sections/patientSections.ts`, `PatientSection`/`intakeSections`); reuse the existing nav/stepper styling (the `DischargeImportModal` review pattern); medical-blue palette, no red as brand.
- Do NOT delete `NewPatientModal` yet (keep it importable until the workspace fully replaces it across all 3 trigger sites and is verified); just stop opening it from the triggers.
- Heavy local builds OOM → `cd frontend && node ../node_modules/vite/bin/vite.js build` (not npx); ALWAYS run `NODE_OPTIONS=--max-old-space-size=7168 node ../node_modules/typescript/bin/tsc -b` before declaring done — `vite build` does NOT type-check. Authoritative tsc on Vercel deploy.
- Unit tests: `node node_modules/tsx/dist/cli.mjs --test <file>` from repo root. Commit after each task.

---

### Task 1: Draft API client + IntakeWorkspace shell

**Files:**

- Create: `frontend/src/components/shared/intake/intakeDraftApi.ts` (typed fetch wrappers)
- Create: `frontend/src/components/shared/intake/IntakeWorkspace.tsx` (6-step shell)
- Create: `frontend/src/components/shared/intake/__tests__/intakeDraftApi.test.ts`

**Interfaces:**

- Produces:
  - `createDraft(source?: 'manual'|'import'): Promise<{ id: string; data: Record<string, unknown> }>`
  - `patchDraft(id: string, patch: Record<string, unknown>): Promise<{ id: string; data: Record<string, unknown> }>`
  - `confirmDraft(id: string, payload: object): Promise<{ status: string; patient?: { id: string }; duplicate?: unknown }>`
  - `IntakeWorkspace({ open, onClose, onCreated, operatoreNome }: { open: boolean; onClose: () => void; onCreated: (patientId: string) => void; operatoreNome?: string })`

- [ ] **Step 1: Write the API client test** (pure — mock `fetch` to assert URL/method/body):

```ts
// frontend/src/components/shared/intake/__tests__/intakeDraftApi.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDraft, patchDraft } from '../intakeDraftApi.js';

test('createDraft POSTs to /intake/drafts', async () => {
  const calls: any[] = [];
  globalThis.fetch = (async (url: string, opts: any) => {
    calls.push({ url, opts });
    return { ok: true, json: async () => ({ id: 'd1', data: {} }) };
  }) as any;
  const d = await createDraft('manual');
  assert.equal(d.id, 'd1');
  assert.match(calls[0].url, /\/intake\/drafts$/);
  assert.equal(calls[0].opts.method, 'POST');
});

test('patchDraft PATCHes the draft id', async () => {
  const calls: any[] = [];
  globalThis.fetch = (async (url: string, opts: any) => {
    calls.push({ url, opts });
    return { ok: true, json: async () => ({ id: 'd1', data: { a: 1 } }) };
  }) as any;
  await patchDraft('d1', { a: 1 });
  assert.match(calls[0].url, /\/intake\/drafts\/d1$/);
  assert.equal(calls[0].opts.method, 'PATCH');
});
```

- [ ] **Step 2: Run → fails** (`intakeDraftApi` missing). `node node_modules/tsx/dist/cli.mjs --test frontend/src/components/shared/intake/__tests__/intakeDraftApi.test.ts`.

- [ ] **Step 3: Implement `intakeDraftApi.ts`** — `API_URL` from `../../../config`; the operator header pattern the app already uses for operator-gated calls (grep an existing operator fetch, e.g. the discharge import, for the exact header names); `createDraft`/`patchDraft`/`confirmDraft` with JSON bodies + error throw on `!ok`.

- [ ] **Step 4: Implement `IntakeWorkspace.tsx` shell** — full-screen overlay (`modal-overlay` + a full-width card), a 6-step stepper header `[1 Anagrafica][2 Ingresso][3 Clinica][4 Moduli][5 Documenti][6 Verifica]` (reuse the `DischargeImportModal` review/step styling classes), `step` state, Avanti/Indietro nav, and a `draftId` created via `createDraft('manual')` on first open (store in state; show a spinner until ready). Step bodies are placeholders `<div data-testid={`intake-step-${step}`}>` for now (filled in Tasks 2-4). Close calls `onClose`.

- [ ] **Step 5: Run → API test passes.** Then `cd frontend && node ../node_modules/vite/bin/vite.js build` succeeds; `tsc -b` clean.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/shared/intake/
git commit -m "feat(intake): draft API client + IntakeWorkspace 6-step shell (#122)"
```

---

### Task 2: Step 1 Anagrafica + Step 2 Ingresso (autosave to draft)

**Files:**

- Create: `frontend/src/components/shared/intake/StepAnagrafica.tsx`
- Create: `frontend/src/components/shared/intake/StepIngresso.tsx`
- Modify: `IntakeWorkspace.tsx` (render these for steps 1-2; debounced `patchDraft` on change)

**Interfaces:**

- Consumes: `patchDraft` (Task 1); `draft.data`.
- Produces: `StepAnagrafica({ value, onChange })` / `StepIngresso({ value, onChange })` — controlled, write to `draft.data.anagrafica` / `draft.data.ingresso`.

- [ ] **Step 1:** `StepAnagrafica` — copy the field set from `NewPatientModal` (Nome, Cognome, Data di nascita [required], Sesso, Codice fiscale, Residenza/contatti, referente). Controlled (`value`/`onChange`).
- [ ] **Step 2:** `StepIngresso` — admission fields per the gap analysis §2 (Data/ora presa in carico, Provenienza, Modalità ingresso, Motivo ingresso, Operatore, Note iniziali). Controlled.
- [ ] **Step 3:** In `IntakeWorkspace`, hold `data` state seeded from the draft; render StepAnagrafica/StepIngresso bound to `data.anagrafica`/`data.ingresso`; on change update local state + debounced `patchDraft(draftId, { anagrafica })` / `{ ingresso }`.
- [ ] **Step 4:** Validate required anagrafica (Nome/Cognome/Data nascita) before allowing step 6 confirm.
- [ ] **Step 5:** vite build + tsc -b clean.
- [ ] **Step 6:** Commit `feat(intake): anagrafica + ingresso steps with draft autosave (#122)`.

---

### Task 3: Step 3 Clinica — registry editors in intake mode

**Files:**

- Create: `frontend/src/components/shared/intake/StepClinica.tsx`
- Modify: `IntakeWorkspace.tsx` (render StepClinica for step 3)

**Interfaces:**

- Consumes: `intakeSections()` + `PatientSection` (from `sections/`); `draft.data`.

- [ ] **Step 1:** `StepClinica` iterates `intakeSections()`. For each section render its registry component in `mode="intake"` with `value={data[sectionKey]}` and `onChange={v => updateSection(sectionKey, v)}` (which updates local `data` + debounced `patchDraft(draftId, { [sectionKey]: v })`). The extracted editors (Allergie/Diagnosi/Anamnesi) are controlled and work directly; the wrapped editors (Terapia/Parametri/NRS) render their built-in "in arrivo" intake placeholder — acceptable for this task (controlled variants are a follow-up noted on #122/#124).
- [ ] **Step 2:** Map registry `sectionKey` → the `data` key used by each editor (allergie→allergie array, diagnosi→diagnosi array, anamnesi→anamnesi object). Keep a small explicit map; do not guess.
- [ ] **Step 3:** vite build + tsc -b clean; a small pure test that `intakeSections()` returns the 6 keys (already covered by the registry test — no new test needed unless you add mapping logic, then test the mapper).
- [ ] **Step 4:** Commit `feat(intake): clinica step renders shared editors in intake mode (#122)`.

---

### Task 4: Steps 4-6 (Moduli, Documenti, Verifica → confirm) + wire triggers

**Files:**

- Create: `frontend/src/components/shared/intake/StepVerifica.tsx`
- Modify: `IntakeWorkspace.tsx` (steps 4-6); `PatientList.tsx`, `OperatorAgenda.tsx`, `AdminAgenda.tsx` (open `IntakeWorkspace` instead of `NewPatientModal`)

- [ ] **Step 1:** Step 4 Moduli — render the configured intake modules via the registry (non-required skippable); for now a simple list + the NRS/Tinetti/Braden module renderers if trivially available, else a documented placeholder. Step 5 Documenti — reuse `DischargeImportModal`'s upload/`CameraCapture` entry points or a minimal "Importa / Scatta foto" that attaches to the draft (if the attach-to-draft API isn't ready, link to F5 and keep a placeholder). Keep scope honest — placeholders are fine where a dependency isn't built, but `log`/comment them.
- [ ] **Step 2:** `StepVerifica` — summary from `data`; "Crea paziente" button → `confirmDraft(draftId, { patient: data.anagrafica-mapped, cartella: {...}, confirmDuplicate })`; handle 201 created (call `onCreated(patient.id)`), 409 duplicate (prompt + retry with confirmDuplicate), error.
- [ ] **Step 3:** Re-wire the 3 trigger sites: replace `<NewPatientModal .../>` usage with `<IntakeWorkspace open onClose onCreated operatoreNome />`. Keep NewPatientModal imported elsewhere if still referenced.
- [ ] **Step 4:** vite build + tsc -b clean.
- [ ] **Step 5:** Commit `feat(intake): moduli/documenti/verifica steps + wire Nuovo paziente triggers (#122)`.

---

### Task 5: Verify (live), deploy, close #122

- [ ] **Step 1:** Run section + api tests: `node node_modules/tsx/dist/cli.mjs --test frontend/src/components/shared/intake/__tests__/*.test.ts frontend/src/components/operator/sections/__tests__/*.test.ts` → all pass.
- [ ] **Step 2:** `tsc -b` clean (authoritative).
- [ ] **Step 3:** Live verify (run-clinicos): "+ Nuovo paziente" opens the workspace; walk the 6 steps; create a synthetic patient end-to-end; screenshots under `requirements/evidence/BUG-070/`. (Local DB; synthetic data only.)
- [ ] **Step 4:** Push → merge to main → `vercel deploy --prod --archive=tgz --yes` (frontend); confirm prod bundle updated.
- [ ] **Step 5:** Comment on #122 with the workspace screenshots + the create flow; close #122.

## Self-Review

**Spec coverage (#122 + design §3):** 6-step full-screen workspace ✅ (Tasks 1-4); replaces the popup ✅ (Task 4 trigger re-wire); steps fill the draft via autosave ✅ (Tasks 2-3); Clinica reuses the shared editors in intake mode ✅ (Task 3 — extracted editors fully; wrapped editors placeholder, flagged as follow-up); Verifica → transactional create via `confirmDraft` ✅ (Task 4). Documenti/Moduli depth is scoped honestly with placeholders where F5/controlled-variants aren't built yet — flagged on the issue.
**Placeholder scan:** the intra-plan placeholders (wrapped-editor intake mode, documenti attach) are real dependency gaps, explicitly flagged to log — not silent.
**Type consistency:** `createDraft/patchDraft/confirmDraft`, `IntakeWorkspace` props, `intakeSections()` used consistently.
