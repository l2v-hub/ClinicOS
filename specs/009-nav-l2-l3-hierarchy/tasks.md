# Tasks: Navigation Level 2 & Level 3 Hierarchy Redesign

**Input**: Design documents from `/specs/009-nav-l2-l3-hierarchy/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-components.md, quickstart.md

**Tests**: Not requested in the feature specification. No test tasks are generated.

**Organization**: Tasks are grouped by user story (US1 P1, US2 P2, US3 P3) so each story can be implemented and validated as an independent slice.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Different file, no dependency on an incomplete task → can run in parallel.
- **[Story]**: `US1`, `US2`, `US3` (matches priorities in spec.md). Setup, Foundational, and Polish phases carry no story label.
- Include exact file paths.

## Path Conventions

- Web application monorepo. This feature touches only `frontend/`.
- Backend, Prisma, API, and environment configuration are out of scope.

---

## Phase 1: Setup

**Purpose**: Verify the working environment is ready. No code edits in this phase.

- [ ] T001 Confirm branch `009-nav-l2-l3-hierarchy` is active by running `git rev-parse --abbrev-ref HEAD` in the repo root and verifying the output equals `009-nav-l2-l3-hierarchy`
- [ ] T002 Verify `frontend/` is buildable on the current branch by running `npm install` (only if `node_modules` is missing) and `npm run build` from `C:/Workspace/DG_SE_DEV/ClinicOS/frontend`; capture and record the bundle size baseline (CSS and JS gzipped) from the build output for later comparison
- [ ] T003 [P] Read `specs/009-nav-l2-l3-hierarchy/data-model.md` and `specs/009-nav-l2-l3-hierarchy/research.md` to confirm the token list and the seven research decisions before any CSS edit

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Enforce the design-token contract that every subsequent user story relies on. Until this phase is complete no user-story phase can start.

**⚠️ CRITICAL**: No user-story work may begin until Phase 2 is complete.

- [ ] T004 Open `frontend/src/App.css` and confirm `:root` declares each of the following tokens with exactly the values listed in `specs/009-nav-l2-l3-hierarchy/data-model.md` § CSS Design Tokens: `--l2-h: 44px`, `--l3-h: 32px`, `--l2-font: 14px`, `--l3-font: 11.5px`, `--tab-transition-duration: 180ms`, `--tab-transition-easing: ease-out`, `--l2-underline-h: 2px`, `--l2-underline-color: var(--primary, var(--blue, #1A56DB))`, `--content-px: 16px`, `--content-px-lg: 24px`, `--content-px-xl: 32px`. Add any missing entry and correct any divergent value; do not rename existing tokens
- [ ] T005 In `frontend/src/App.css` `:root` add the two new tokens introduced by this feature: `--l3-underline-h: 1px` and `--l3-underline-color: color-mix(in srgb, var(--primary, #1A56DB) 70%, transparent)`; if `--primary` is undefined in `:root`, alias it to the existing `--blue` token rather than introducing a new color
- [ ] T006 In `frontend/src/App.css` confirm `.app-shell` declares `width: 100%; overflow-x: hidden;` and the page-content media query blocks for `min-width: 1180px` and `min-width: 1366px` exist with the padding values from data-model.md § Media Query Blocks; add missing rules without touching unrelated selectors
- [ ] T007 Audit `frontend/src/index.css` to confirm no `#root { width: <fixed>; }` clamp exists; if such a clamp is found, delete only that property and leave the rest of the rule untouched. If `#root` already uses `width: 100%`, this task is a no-op (record "no change" in the commit)
- [ ] T008 From `C:/Workspace/DG_SE_DEV/ClinicOS/frontend` run `npm run build` and verify zero new TypeScript errors and zero new Vite warnings versus the Phase 1 baseline; abort the next phase if the build fails

**Checkpoint**: Tokens, page shell, and root width are aligned. User-story phases can now begin.

---

## Phase 3: User Story 1 — L2 reads as the primary page menu (Priority: P1) 🎯 MVP

**Goal**: When an operator opens a clinical record, the Level 2 row is unambiguously the page-level primary menu, with a clean underline / active-bar treatment and tablet-friendly touch targets.

**Independent Test**: Render `/scheda-paziente/:id` at 1366×768 desktop and 1024×768 tablet. The L2 row dominates visually, the active tab is marked by a 2-px underline (no border, no pill, no shadow), every L2 button computes ≥ 44 px in height, and no global horizontal scrollbar appears at either viewport.

### Implementation for User Story 1

- [ ] T009 [US1] In `frontend/src/App.css` rewrite `.page-tabs` per data-model.md § `.page-tabs` (L2): set `display: flex`, `flex-wrap: nowrap`, `gap: 4px`, `width: 100%`, `overflow-x: auto`, `scrollbar-width: thin`, `border-bottom: 1px solid var(--border-subtle, rgba(0,0,0,0.08))`, `padding-bottom: 0`. Remove any prior `max-width` or `padding-bottom` that conflicts; do not add new selectors
- [ ] T010 [US1] In `frontend/src/App.css` rewrite `.page-tabs__btn` per data-model.md: `position: relative`, `height: var(--l2-h)`, `font-size: var(--l2-font)`, `font-weight: 500`, `padding: 0 12px`, `border: none`, `background: transparent`, `border-radius: 0`, `box-shadow: none`, `cursor: pointer`, `color: var(--text-strong, currentColor)`, `transition: color var(--tab-transition-duration) var(--tab-transition-easing)`. Delete any prior pill/border/shadow declarations on this selector
- [ ] T011 [US1] In `frontend/src/App.css` add or rewrite the `.page-tabs__btn::after` underline rule per data-model.md: `content:''`, `position: absolute`, `left: 0`, `bottom: 0`, `width: 0`, `height: var(--l2-underline-h)`, `background: var(--l2-underline-color)`, `transition: width var(--tab-transition-duration) var(--tab-transition-easing)`. Add the `.page-tabs__btn--active::after { width: 100%; }` rule for the animated reveal
- [ ] T012 [US1] In `frontend/src/App.css` add hover and focus-visible states on `.page-tabs__btn`: hover changes text color toward the primary token, focus-visible adds a 2-px outline matching the primary color (offset 2px). No background fill, no border on focus
- [ ] T013 [P] [US1] In `frontend/src/app-additions.css` audit every selector that overrides `.page-tabs`, `.page-tabs__btn`, or `.page-tabs__btn--active`. Remove any rule that re-introduces border, box-shadow, background fill, or a max-width clamp on the row. Leave clinical-record context selectors (e.g. `.cr-detail .page-tabs ...`) only when they refine spacing without contradicting Phase 3 base rules; annotate every kept override with a single-line comment naming the FR it preserves
- [ ] T014 [US1] In `frontend/src/components/operator/PatientDetail.tsx` locate the L2 nav block (the row that renders the Diario / Terapia / Parametri / Agenda buttons) and confirm each `<button>` carries the canonical class names `page-tabs__btn` and conditionally `page-tabs__btn--active`. Do not change the JSX shape, key handlers, or the surrounding `<div className="page-tabs" role="tablist">` markup; if any button uses a different class, rename to match. Add or verify `aria-selected` and `role="tab"` per contracts/ui-components.md
- [ ] T015 [US1] From `C:/Workspace/DG_SE_DEV/ClinicOS/frontend` run `npm run build`; require zero new TS errors and zero new Vite warnings versus the Phase 2 baseline before declaring US1 implementation complete
- [ ] T016 [US1] Manual visual QA at 1024×768 and 1366×768 per quickstart.md § Manual QA Matrix steps 1, 2, 4, and 6 limited to L2 only: confirm L2 dominance, 2-px underline animation, no border / pill / shadow on tabs, computed `outerHeight >= 44px` on every L2 button, and zero hits from the overflow audit script at both viewports. Record the result with screenshots in the PR description

**Checkpoint**: US1 ships as the MVP. The page-level primary navigation is professional, touch-friendly, and overflow-safe at supported viewports. Stop here if scope must be cut.

---

## Phase 4: User Story 2 — L3 reads as a clearly subordinate sub-menu (Priority: P2)

**Goal**: When an L2 section reveals sub-tabs (e.g. Terapia → Farmacologica / Riabilitativa / Psicologica), the Level 3 row belongs to the same design family as L2 but is unmistakably smaller, lighter, and less prominent.

**Independent Test**: With US1 deployed, open Scheda Paziente → Terapia. The L3 row appears below L2, every L3 button is shorter and uses a smaller font than L2, the L3 active underline is 1 px and ~70 % opacity of the L2 underline color, and when L3 items exceed the row width the row scrolls horizontally without showing a scrollbar and without producing a global page overflow.

### Implementation for User Story 2

- [ ] T017 [US2] In `frontend/src/App.css` rewrite `.section-tabs` per data-model.md § `.section-tabs` (L3): same flex shape as `.page-tabs` but with `scrollbar-width: none`, plus `.section-tabs::-webkit-scrollbar { display: none; }`. Drop any `border-bottom` baseline on the L3 row (sub-nav stays lighter)
- [ ] T018 [US2] In `frontend/src/App.css` rewrite `.section-tabs__btn` per data-model.md: `position: relative`, `height: var(--l3-h)`, `font-size: var(--l3-font)`, `font-weight: 500`, `letter-spacing: 0.2px`, `padding: 0 8px`, `border: none`, `background: transparent`, `border-radius: 0`, `box-shadow: none`, `cursor: pointer`, `transition: color var(--tab-transition-duration) var(--tab-transition-easing)`. Delete any prior pill / shadow / heavy border declarations
- [ ] T019 [US2] In `frontend/src/App.css` add or rewrite `.section-tabs__btn::after` per data-model.md with `height: var(--l3-underline-h)` and `background: var(--l3-underline-color)`; mirror the `.section-tabs__btn--active::after { width: 100%; }` rule
- [ ] T020 [P] [US2] In `frontend/src/app-additions.css` audit every override that targets `.section-tabs`, `.section-tabs__btn`, or `.section-tabs__btn--active`. Strip rules that re-introduce border, box-shadow, fill, or that make the L3 underline thicker or more opaque than the values set in T019; annotate each retained override with the FR it serves
- [ ] T021 [US2] In `frontend/src/components/operator/PatientDetail.tsx` confirm the L3 nav block (sub-tabs row inside a section) uses the canonical `section-tabs` / `section-tabs__btn` / `section-tabs__btn--active` class names. Do not change JSX shape; align class names if they drifted. Verify `role="tablist"` on the container and `role="tab" aria-selected={…}` on each button per contracts/ui-components.md
- [ ] T022 [US2] From `C:/Workspace/DG_SE_DEV/ClinicOS/frontend` run `npm run build`; zero-error / zero-new-warning gate same as T015
- [ ] T023 [US2] Manual visual QA at 1024×768 and 1366×768 per quickstart.md § Manual QA Matrix steps 3 and 4: confirm L3 underline is 1 px and visibly lighter than L2, L3 button height is ≥ 32 px and < L2, scrollbar is hidden when L3 overflows, overflow audit script reports zero hits, and the 5-second-test (SC-001 / SC-002) on a colleague returns "L2 = main menu, L3 = sub-menu" without hints

**Checkpoint**: US1 + US2 together deliver the full Left-Top-Top hierarchy specified in the feature ask. Stop here if motion polish is being deferred.

---

## Phase 5: User Story 3 — Polished, accessibility-respecting tab transition (Priority: P3)

**Goal**: Switching between L2 or L3 tabs produces a brief content transition (≤ 200 ms) that respects `prefers-reduced-motion`.

**Independent Test**: With motion enabled, switching tabs shows a visible but brief fade / 8-px slide; with `prefers-reduced-motion: reduce` set in DevTools, the transition is fully suppressed and the underline width-animation also stops.

### Implementation for User Story 3

- [ ] T024 [US3] In `frontend/src/App.css` confirm `.tab-panel-transition` exists with the `tabPanelEnter` keyframes per data-model.md § `.tab-panel-transition`. If any property drifted (duration, easing, opacity range, translateX distance) restore the spec values; do not add new keyframes
- [ ] T025 [US3] In `frontend/src/App.css` ensure the `@media (prefers-reduced-motion: reduce)` block includes ALL of: `.tab-panel-transition`, `.page-tabs__btn::after`, `.section-tabs__btn::after`, `.page-tabs__btn`, `.section-tabs__btn` with `animation: none !important; transition: none !important;`. Add any missing selector; do not weaken existing reduced-motion rules
- [ ] T026 [US3] In `frontend/src/components/operator/PatientDetail.tsx` confirm the `contentRef` + `useEffect(() => { el.classList.remove('tab-panel-transition'); void el.offsetWidth; el.classList.add('tab-panel-transition'); }, [activeGroup, tab])` block exists exactly as in contracts/ui-components.md § "Tab Content Wrapper Contract". If a `key={…}` remount pattern is present, replace it with the ref pattern per research R-4 (do NOT use `key` — it triggers a fetch storm on TerapiaFarmacologicaTab and other stateful children). If the ref pattern is already in place, this task is a no-op
- [ ] T027 [US3] From `C:/Workspace/DG_SE_DEV/ClinicOS/frontend` run `npm run build`; zero-error / zero-new-warning gate
- [ ] T028 [US3] Manual motion QA per quickstart.md § Manual QA Matrix step 5: with motion enabled at 1024 × 768, switch L2 tabs four times and L3 tabs four times — content fade / slide is visible and completes in ≤ 200 ms each time (record with DevTools Performance trace if uncertain); then enable `prefers-reduced-motion: reduce`, repeat the eight switches, and confirm zero visible animation on tabs or underlines

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening, evidence capture, and clean handoff.

- [ ] T029 Full viewport sweep per quickstart.md § Manual QA Matrix at all four viewports (1024 × 768, 1180 × 820, 1366 × 768, 1920 × 1080): run the overflow audit script in each and confirm zero output rows. Capture one screenshot per viewport for the PR description
- [ ] T030 [P] Constitution re-check: open `.specify/memory/constitution.md` and verify nothing in this feature contradicts Principles I, II, IV, V, VI; record a one-line confirmation per principle in the PR description
- [ ] T031 [P] Grep `frontend/src/**/*.{ts,tsx,css}` for `console.log(`, `// TODO`, and `// FIXME` added by this branch (compare against `main`). Remove any left-behind debug code per Constitution VI before the final build
- [ ] T032 Final `npm run build` from `C:/Workspace/DG_SE_DEV/ClinicOS/frontend`; verify zero TS errors, zero new Vite warnings, and a gzipped CSS bundle delta < 1 kB vs the Phase 1 baseline recorded in T002
- [ ] T033 Commit on branch `009-nav-l2-l3-hierarchy` with the message `feat: redesign L2/L3 nav hierarchy (009)`; do NOT amend prior commits and do NOT skip hooks

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Phase 1; blocks every user-story phase.
- **US1 (Phase 3, P1)**: depends on Phase 2. MVP — can ship alone.
- **US2 (Phase 4, P2)**: depends on Phase 2 only. Visually composes with US1 but does not require US1 internally (L3 styles are independent).
- **US3 (Phase 5, P3)**: depends on Phase 2 only; touches the transition surface which exists from prior features (007). Composes with US1 and US2.
- **Polish (Phase 6)**: depends on all user stories that are being shipped.

### Within Each User Story

- CSS base rules before override audits (App.css before app-additions.css).
- CSS edits before JSX class-name verification.
- Per-story `npm run build` gate before manual QA.
- Manual QA before the next story starts (avoid stacking unverified styling changes).

### Parallel Opportunities

- T003 reads docs while T002 builds — independent.
- Within US1: T013 (override audit in app-additions.css) is parallel to T009 / T010 / T011 (base rules in App.css) because the files are different and the override audit only removes contradictions written before this branch.
- Within US2: T020 is parallel to T017 / T018 / T019 for the same reason.
- Phase 6: T030 and T031 are parallel — they read different files and neither edits production code paths.

---

## Parallel Example: User Story 1 base + override audit

```bash
# After Phase 2 completes, these can be worked simultaneously by two developers:
Task T009 + T010 + T011 + T012  -> frontend/src/App.css         (one developer)
Task T013                       -> frontend/src/app-additions.css (a second developer)

# Then T014 (PatientDetail.tsx) and T015 (build) must be done sequentially.
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 → Phase 2 → Phase 3 (US1) → Phase 6 (polish, with US1-only scope) → commit and demo.
2. Ship US1 alone if scope must be cut: the page-level primary nav is now professional and tablet-friendly, which is the highest-impact half of the feature.

### Incremental Delivery

1. Setup + Foundational ready → token contract enforced.
2. US1 → demo: L2 hierarchy visible.
3. US2 → demo: full Left-Top-Top hierarchy.
4. US3 → demo: polished motion + reduced-motion compliance.
5. Polish → PR ready with screenshots, audit results, constitution check, and clean build.

### Parallel Team Strategy

Two developers can land US1 + US2 in parallel (different files) provided they share the Phase 2 token contract as a baseline. US3 is best owned by whoever last touched `PatientDetail.tsx` to avoid merge churn on the largest file in the change set.

---

## Notes

- [P] = different file, no dependency on an incomplete task.
- [Story] = US1 / US2 / US3 maps each story task back to its acceptance scenarios in spec.md.
- This is a CSS-first refinement of existing markup. No new React components are created; no new dependencies are added.
- Test tasks are intentionally absent: the spec did not request automated tests and the validation is design-quality, not behavioural.
- Commit after each user story checkpoint if scope might be cut, so an in-progress branch always represents a shippable increment.
- Do NOT touch backend, Prisma, API, `VITE_API_URL`, or `TeamsLikeSidebar.tsx` at any point in this feature.
