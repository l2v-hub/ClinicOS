# Tasks: Parametri Pazienti Compact Quick-Entry Layout

**Input**: Design documents from `/specs/011-parametri-quick-entry/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-components.md, quickstart.md

**Tests**: Not requested in the feature specification. No test tasks are generated.

**Organization**: Tasks are grouped by user story (US1 P1, US2 P1, US3 P2) so each story can be implemented and validated as an independent slice.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Different file, no dependency on an incomplete task → can run in parallel.
- **[Story]**: `US1`–`US3` (matches priorities in spec.md). Setup, Foundational, and Polish phases carry no story label.
- Include exact file paths.

## Path Conventions

- Web application monorepo. This feature touches only `frontend/`.
- Backend, Prisma, API, and environment configuration are out of scope.

---

## Phase 1: Setup

**Purpose**: Verify the working environment is ready. No code edits in this phase.

- [ ] T001 Confirm branch `011-parametri-quick-entry` is active by running `git rev-parse --abbrev-ref HEAD` in the repo root and verifying the output equals `011-parametri-quick-entry`
- [ ] T002 From `C:/Workspace/DG_SE_DEV/ClinicOS/frontend` run `npm install` (only if `node_modules` is missing) then `npm run build`; record the gzipped CSS and JS bundle sizes as the Phase 1 baseline for later comparison
- [ ] T003 [P] Read `specs/011-parametri-quick-entry/data-model.md` and `specs/011-parametri-quick-entry/research.md` end-to-end to internalise the 9 new `--qe-*` tokens and the 5 design decisions before any edit
- [ ] T004 [P] Read `specs/011-parametri-quick-entry/contracts/ui-components.md` to internalise the `RigaPaziente` prop contract, the save behaviour contract (auto-`ora` + auto-`operatore` injection), and the keyboard contract
- [ ] T005 [P] Read `frontend/src/components/operator/MultiPatientParametri.tsx` (~413 lines) end-to-end to map the current `RigaPaziente` JSX shape, the `rigaToParametroGiorno` mapper, the `Props.operatoreNome` flow, and any inline override that might fight the new compact layout

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Land the 9 design tokens + the `.qe-*` rule block + the responsive media query. Every user-story phase depends on this CSS surface.

**⚠️ CRITICAL**: No user-story work may begin until Phase 2 is complete.

- [ ] T006 In `frontend/src/App.css` `:root` (the existing 009 token block near line 110-111), add the 9 new tokens listed in data-model.md § "Tokens this feature adds": `--qe-row-h: 56px`, `--qe-row-vpad: 8px`, `--qe-row-hpad: 12px`, `--qe-input-h: 36px`, `--qe-input-w-narrow: 64px`, `--qe-input-w-wide: 96px`, `--qe-patient-col-w: 220px`, `--qe-row-gap: 8px`, `--qe-divider-color: var(--border-subtle)`. Place them immediately after the existing 010 tokens; do not rename or reorder existing ones
- [ ] T007 In `frontend/src/App.css` add the `.qe-*` rule block per data-model.md § "CSS Classes — New `.qe-row*` block": `.qe-list`, `.qe-row`, `.qe-row__patient`, `.qe-row__avatar`, `.qe-row__name`, `.qe-row__room`, `.qe-row__input`, `.qe-row__input--wide`, `.qe-row__input:focus-visible`, `.qe-row__note-btn`, `.qe-row__note-btn--has-note`, `.qe-row__save`, `.qe-row__note-input`, `.qe-row--has-note-open`, `.qe-row:hover`. Place the block after the `.clinical-card*` rules from 010 and before the `@keyframes tabPanelEnter` (~ line 3490 area). Reuse existing `--primary`, `--border-subtle`, `--surface`, `--text-soft` tokens — do NOT introduce new colors
- [ ] T008 [P] In `frontend/src/App.css` add the responsive media query: `@media (max-width: 1180px) { .qe-row { grid-template-columns: 180px repeat(6, auto) auto auto; } }`. Place immediately after the `.qe-*` block from T007
- [ ] T009 From `C:/Workspace/DG_SE_DEV/ClinicOS/frontend` run `npm run build`; verify zero new TypeScript errors and zero new Vite warnings versus the Phase 1 baseline; halt the next phase if the build fails

**Checkpoint**: Tokens declared, `.qe-*` rules live, responsive query in place. User-story phases can now begin.

---

## Phase 3: User Story 1 — Operator records vitals for a full ward with minimal scrolling (Priority: P1) 🎯 MVP

**Goal**: Refactor `RigaPaziente` into a single compact grid row with the six clinical fields visible inline. Resting row height ≤ 56 px. At least 8 patient rows visible above the fold at 1024 × 768.

**Independent Test**: Open Parametri Pazienti on a 1024 × 768 tablet emulation. Count rows above the fold (≥ 8). Measure resting row height (≤ 56 px). Confirm the six clinical fields are visible inline on every row and that Ora rilevazione, Operatore, and Note rapide are not visible by default.

### Implementation for User Story 1

- [ ] T010 [US1] In `frontend/src/components/operator/MultiPatientParametri.tsx` refactor the `RigaPaziente` sub-component JSX so the entire row is rendered as a `<div className="qe-row" role="group" aria-label={...}>` containing: (a) the left patient block `.qe-row__patient` with `.qe-row__avatar` + `.qe-row__name` + `.qe-row__room`, (b) the six clinical inputs in this order — `PA` (wide), `SpO2` (narrow), `FC` (narrow), `TC` (narrow), `DTX` (narrow), `Evacuazione` (wide) — each with `className="qe-row__input"` and a wide modifier where applicable, (c) a `.qe-row__note-btn` placeholder (US3 wires it up), (d) a `.qe-row__save` button. Use the existing field values from `riga` state; preserve all existing onChange handlers verbatim. The outer `<div className="qe-list">` wraps the list in the parent
- [ ] T011 [US1] In `frontend/src/components/operator/MultiPatientParametri.tsx` `RigaPaziente` add `inputmode` hints per data-model.md: `inputmode="text"` on PA + Evacuazione; `inputmode="decimal"` on SpO2 + FC + TC + DTX. Add `placeholder` text with unit hints (`PA`, `SpO2 %`, `FC bpm`, `TC °C`, `DTX`, `Evac.`)
- [ ] T012 [US1] In `frontend/src/components/operator/MultiPatientParametri.tsx` delete the `<input>` elements for `riga.ora` and `riga.operatore` from the `RigaPaziente` JSX (US2 will reuse the underlying `riga.ora` / `riga.operatore` fields at save time but they MUST NOT appear in the DOM as form controls)
- [ ] T013 [US1] In `frontend/src/components/operator/MultiPatientParametri.tsx` delete the always-visible `<textarea>` / `<input>` for `riga.note` (US3 reintroduces it as opt-in). The underlying `riga.note` field stays in `RigaEditabile` and in the save payload; only its always-visible rendering is removed
- [ ] T014 [P] [US1] In `frontend/src/components/operator/MultiPatientParametri.tsx` delete the surrounding card chrome around each patient (`<div className="cr-form-section">` or equivalent wrapper, plus any decorative `<h4>` / `<hr>`). The flat `.qe-row` grid replaces it
- [ ] T015 [US1] In `frontend/src/components/operator/MultiPatientParametri.tsx` parent component wrap the `pazienti.map(...)` block with `<div className="qe-list">`; preserve the existing key + paginated / virtualised rendering logic if present
- [ ] T016 [US1] From `C:/Workspace/DG_SE_DEV/ClinicOS/frontend` run `npm run build`; zero-error / zero-new-warning gate
- [ ] T017 [US1] Manual QA per quickstart.md § "Density (US1)" at 1024 × 768: paste the DevTools console snippet that measures `rows.length`, `rows[0].offsetHeight`, and the count of rows above the fold; confirm `offsetHeight ≤ 56 px` and `above-fold count ≥ 8` with a ward of 10+ patients. Capture one screenshot per viewport (1024 / 1180 / 1366 / 1920) for the PR description

**Checkpoint**: US1 ships as the MVP. The list is dense, tablet-friendly, and shows only the six clinical fields per patient. Stop here if scope must be cut.

---

## Phase 4: User Story 2 — Operator never types the current time or their own name (Priority: P1)

**Goal**: At Save, the system synthesises `ora` (current time) and `operatore` (current `operatoreNome` prop) and persists them in the existing payload shape — without the operator entering either value.

**Independent Test**: With Parametri Pazienti open, fill the six clinical fields on any patient row and click Save. Inspect the network request: payload `ora` equals the save moment within ±2 s; payload `firmaIpM` equals the current logged-in operator name. Confirm no `<input name="ora">` or `<input name="operatore">` exists in the DOM.

### Implementation for User Story 2

- [ ] T018 [US2] In `frontend/src/components/operator/MultiPatientParametri.tsx` `RigaPaziente` add a `handleSave` async function exactly as in contracts/ui-components.md § "Save Behaviour Contract": guards against double-click via `saving` state; computes `oraAuto = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })` and `operatoreAuto = operatoreNome` (read from props at call time, NOT from a closure capture); calls `await onSalva(paziente.id, { ...riga, ora: oraAuto, operatore: operatoreAuto })`; surfaces `errorMessage` on failure but leaves `riga` state intact
- [ ] T019 [US2] In `frontend/src/components/operator/MultiPatientParametri.tsx` `RigaPaziente` add `useState<boolean>(false)` for `saving` and `useState<string | null>(null)` for `errorMessage`. Wire them into the JSX from T010: `Salva` button has `disabled={saving}` and shows `'...'` when saving; an error message `<div role="alert" className="qe-row__error">{errorMessage}</div>` renders below the row inputs when set
- [ ] T020 [P] [US2] In `frontend/src/components/operator/MultiPatientParametri.tsx` audit `rigaToParametroGiorno()` (existing mapper) and confirm `ora` and `firmaIpM` keys are still emitted in the backend payload. Do NOT remove them from `RigaEditabile` interface or the mapper — only the input fields disappear from the UI; the save shape is unchanged
- [ ] T021 [US2] In `frontend/src/components/operator/MultiPatientParametri.tsx` `RigaPaziente` add an Enter-key listener on the clinical inputs that triggers `handleSave()` for that row (R-5). Use `onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave(); } }}` on each of the six inputs
- [ ] T022 [US2] In `frontend/src/components/operator/MultiPatientParametri.tsx` `RigaPaziente` if a user session is missing (`operatoreNome === ''` or null), the `handleSave` function MUST surface `'Sessione scaduta — accedi di nuovo'` and NOT call `onSalva` (FR-014). Add the guard at the top of `handleSave`
- [ ] T023 [US2] From `C:/Workspace/DG_SE_DEV/ClinicOS/frontend` run `npm run build`; zero-error / zero-new-warning gate
- [ ] T024 [US2] Manual QA per quickstart.md § "Auto-`ora` and Auto-`operatore`": fill the six fields on the first patient row, click Save, inspect Network → confirm payload `ora` ≈ now, `firmaIpM` = operator name; paste the DOM-audit console snippet to confirm `ora` / `operatore` input counts are 0

**Checkpoint**: US1 + US2 together deliver the two P1 pillars — compact layout + zero manual entry of Ora/Operatore.

---

## Phase 5: User Story 3 — Operator can attach a note only when needed (Priority: P2)

**Goal**: A per-row Note button toggles an opt-in note input inside the row. Only one row at a time has the note input open. Rows with saved notes show a visible indicator.

**Independent Test**: Open Parametri Pazienti — no Note input visible on any row. Click Note on row 1 → input appears below row 1 only; row 2's height does not change. Open Note on row 5 → row 1's note input closes. Type a note + Save row 5 → row collapses, Note button on row 5 shows the filled indicator.

### Implementation for User Story 3

- [ ] T025 [US3] In `frontend/src/components/operator/MultiPatientParametri.tsx` parent component add `const [noteOpenForPazienteId, setNoteOpenForPazienteId] = useState<string | null>(null);` near other parent-level state. Wire it down to each `<RigaPaziente>` as two props: `isNoteOpen={noteOpenForPazienteId === paziente.id}` and `onToggleNote={(open) => setNoteOpenForPazienteId(open ? paziente.id : null)}`
- [ ] T026 [US3] In `frontend/src/components/operator/MultiPatientParametri.tsx` `RigaPaziente` add the two new props (`isNoteOpen: boolean`, `onToggleNote: (open: boolean) => void`) to `RigaProps` interface
- [ ] T027 [US3] In `frontend/src/components/operator/MultiPatientParametri.tsx` `RigaPaziente` wire the `.qe-row__note-btn` placeholder from T010 to a real button: `<button type="button" className={"qe-row__note-btn" + (hasSavedNote ? " qe-row__note-btn--has-note" : "")} aria-label="Apri note" aria-expanded={isNoteOpen} tabIndex={isNoteOpen ? 0 : -1} onClick={() => onToggleNote(!isNoteOpen)}>📝</button>`. Compute `hasSavedNote = Boolean(riga.note && riga.note.trim().length > 0)`
- [ ] T028 [US3] In `frontend/src/components/operator/MultiPatientParametri.tsx` `RigaPaziente` when `isNoteOpen` is true, render the note input as a sibling inside the same grid: `<div className="qe-row__note-input" style={{ gridColumn: '1 / -1' }}><textarea className="form-input" rows={2} value={riga.note} placeholder="Note rapide" onChange={e => setRiga(r => ({ ...r, note: e.target.value }))} /></div>`. Apply `className="qe-row qe-row--has-note-open"` to the outer row when open so the row can grow past 56 px
- [ ] T029 [P] [US3] In `frontend/src/components/operator/MultiPatientParametri.tsx` `RigaPaziente` `handleSave` (from T018) extend the success branch: on `await onSalva(...)` success call `onToggleNote(false)` so the note input closes when the row is saved
- [ ] T030 [US3] In `frontend/src/components/operator/MultiPatientParametri.tsx` `RigaPaziente` add an Escape-key handler on the note `<textarea>` that calls `onToggleNote(false)` and returns focus to the Note button: `onKeyDown={e => { if (e.key === 'Escape') { onToggleNote(false); } }}`
- [ ] T031 [US3] From `C:/Workspace/DG_SE_DEV/ClinicOS/frontend` run `npm run build`; zero-error / zero-new-warning gate
- [ ] T032 [US3] Manual QA per quickstart.md § "Note Affordance (US3 / SC-005)": confirm no Note input is visible at rest; open Note on row 1, measure row 2 height before/after (must be equal); open Note on row 5, confirm row 1's input closes automatically; type a note + save; reload page and confirm the `--has-note` indicator persists on rows with non-empty `noteRapide`

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening, evidence capture, and clean handoff.

- [ ] T033 Full viewport sweep per quickstart.md § "Overflow Audit (SC-007)" at all four viewports (1024 × 768, 1180 × 820, 1366 × 768, 1920 × 1080): paste the overflow audit script in DevTools Console at each viewport; confirm zero output rows. Capture one screenshot per viewport for the PR description
- [ ] T034 [P] Click-to-save stopwatch (SC-009): on a populated 10-patient ward run the stopwatch drill from quickstart.md § "Click-to-Save Stopwatch" for 5 rows; record median and confirm ≤ 6 s
- [ ] T035 [P] Constitution re-check: open `.specify/memory/constitution.md` and verify nothing in this feature contradicts Principles I, II, III, IV, V, VI; record a one-line confirmation per principle in the PR description
- [ ] T036 [P] Grep `frontend/src/components/operator/MultiPatientParametri.tsx` and `frontend/src/App.css` for `console.log(`, `// TODO`, and `// FIXME` introduced by this branch (compare against `main`). Remove any left-behind debug code per Constitution VI before the final build
- [ ] T037 Edge-case drill per quickstart.md § "Edge-Case Drills": (a) disconnect network, click Save — confirm row keeps values + error surfaces; (b) trigger Enter-to-save on a clinical input — confirm save fires; (c) verify the `noteOpenForPazienteId` state resets cleanly when navigating away and back to the page
- [ ] T038 Final `npm run build` from `C:/Workspace/DG_SE_DEV/ClinicOS/frontend`; verify zero TS errors, zero new Vite warnings, and a gzipped CSS bundle delta < 2 kB versus the Phase 1 baseline recorded in T002
- [ ] T039 Commit on branch `011-parametri-quick-entry` with the message `feat: parametri quick-entry compact layout (011)`; do NOT amend prior commits and do NOT skip hooks

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Phase 1; blocks every user-story phase.
- **US1 (Phase 3, P1)**: depends on Phase 2. MVP — can ship alone.
- **US2 (Phase 4, P1)**: depends on US1 (the new JSX from T010 must exist before the save handler from T018 can attach to it). NOT independent of US1; the two P1 stories ship together.
- **US3 (Phase 5, P2)**: depends on US1 (the `.qe-row__note-btn` placeholder must exist) AND on US2 (the `handleSave` extension in T029 hooks into the save flow from T018). NOT independent.
- **Polish (Phase 6)**: depends on every shipped user story.

### Within Each User Story

- CSS edits before component edits.
- Per-story `npm run build` gate before manual QA.
- Manual QA before the next story begins.
- Within US1: T010 (JSX structure) before T011/T012/T013/T014 (field-level tweaks).
- Within US2: T018 (save handler) before T019 (`saving`/`errorMessage` state wiring).
- Within US3: T025/T026 (parent state + props) before T027/T028 (UI wiring).

### Parallel Opportunities

- T003 ‖ T004 ‖ T005 in Setup.
- T008 ‖ T007 (both in App.css but different blocks, additive).
- T014 ‖ T010/T011/T012/T013 within US1 (same file but disjoint JSX regions).
- T020 ‖ T018/T019 within US2 (mapper audit is read-only).
- T029 ‖ T027/T028 within US3.
- T034 ‖ T035 ‖ T036 within Polish.

---

## Parallel Example: Foundational

```bash
# After Setup lands, two CSS-aware developers can work simultaneously:
Developer A: T006 + T007  -> frontend/src/App.css (tokens + .qe-* block)
Developer B: T008         -> frontend/src/App.css (media query)
# Then T009 (build gate) runs once both land.
```

---

## Implementation Strategy

### MVP First (US1 + US2 together)

1. Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2) → slim Phase 6 → commit and demo.
2. The two P1 stories are technically coupled — US2's save handler attaches to US1's compact-row JSX. They ship together as the MVP.

### Incremental Delivery

1. Setup + Foundational ready → token contract + CSS surface enforced.
2. US1 → demo: compact rows, six fields inline.
3. US2 → demo: auto-`ora` + auto-`operatore`; no manual time/operator entry.
4. US3 → demo: opt-in Note expansion + filled indicator.
5. Polish → PR ready with screenshots, overflow audit, stopwatch results, clean build.

### Parallel Team Strategy

One developer can land the entire feature efficiently because all edits concentrate in two files (App.css + MultiPatientParametri.tsx). If two developers are available, split US1 (JSX shape) and US2 (save handler) — they touch the same file but disjoint regions and can merge cleanly.

---

## Notes

- [P] = different file, no dependency on an incomplete task.
- [Story] = US1 / US2 / US3 maps each story task back to its acceptance scenarios in spec.md.
- This is a CSS-first refinement plus a focused refactor of a single sub-component. No new files are created. No new dependencies are added.
- Test tasks are intentionally absent: the spec did not request automated tests; validation is design-quality + stopwatch + build gate.
- US1 and US2 are technically coupled (US2's save handler depends on US1's row structure) — they should ship in the same PR as the MVP.
- Commit at the end of US3 + Polish if scope might be cut mid-feature.
- Do NOT touch backend, Prisma, API, `VITE_API_URL`, `TeamsLikeSidebar.tsx`, or `NavComponents.tsx` at any point.
