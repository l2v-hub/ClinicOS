---
description: "Task list for Clean Navigation Layout (007-clean-nav-layout)"
---

# Tasks: Clean Navigation Layout

**Input**: Design documents from `/specs/007-clean-nav-layout/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: No automated tests requested. Validation via manual QA (browser viewports) + `npm run build`.

**Organization**: Tasks grouped by user story for independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: US1–US4 maps to user-story phase tasks
- Setup, Foundational, Polish phases have no story label

## Path Conventions

Web app — frontend-only. All paths under `frontend/src/` unless noted.

---

## Phase 1: Setup

**Purpose**: Verify dev environment ready (no project init needed — existing frontend).

- [X] T001 Verify `frontend/` builds cleanly on current branch: run `npm run build` in `C:\Workspace\DG_SE_DEV\ClinicOS\frontend` and confirm zero errors. Baseline before edits.
- [X] T002 [P] Audit `frontend/src/index.css` for current `#root` width rule (likely `width: 1126px`) and document line number in task notes.
- [X] T003 [P] Audit `frontend/src/App.css` for current `.app-shell`, `.main-area-clean`, `.content-panel`, `.main-h-nav`, `.context-sub-tabs` rule locations (note line numbers).
- [X] T004 [P] Audit `frontend/src/app-additions.css` for any rules overriding the classes in T003 (specifically `padding`, `max-width`, `border`, `background` on those classes).

**Checkpoint**: Setup complete. Edit targets identified, baseline build confirmed clean.

---

## Phase 2: Foundational

**Purpose**: Add shared CSS variables that all user stories consume.

**⚠️ CRITICAL**: T005 blocks US1, US2, US3, US4 (variables used everywhere).

- [X] T005 Add new CSS variables to `:root` in `frontend/src/App.css`: `--tab-transition-duration: 180ms`, `--tab-transition-easing: ease-out`, `--l2-underline-color: var(--blue, #1A56DB)`, `--l2-underline-h: 2px`, `--content-px: 16px`, `--content-px-lg: 24px`, `--content-px-xl: 32px`. Modify `--l3-h` from `36px` to `32px`.

**Checkpoint**: Variables defined. All user stories can now start.

---

## Phase 3: User Story 1 — Fluid Full-Width Layout (Priority: P1) 🎯 MVP

**Goal**: Eliminate dead lateral space; main content fills viewport between sidebar and right edge across tablet/desktop breakpoints. Implements R01 + R02.

**Independent Test**:
1. Open Scheda Paziente at 1024×768, 1180×820, 1366×768, 1920×1080
2. Verify no horizontal scrollbar on `<body>` or `.app-shell`
3. Verify no gap between sidebar (right edge) and `.content-panel` (left edge)
4. Verify `.content-panel` padding scales: 16px tablet, 24px large tablet, 32px desktop
5. Run `npm run build` — zero errors

### Implementation

- [X] T006 [US1] Fix `#root` width constraint in `frontend/src/index.css`: change `width: 1126px` to `width: 100%; max-width: none`. Keep `min-height: 100vh`.
- [X] T007 [US1] Update `.app-shell` rule in `frontend/src/App.css`: confirm/ensure `width: 100%` with no `max-width`. Keep `display: flex; height: 100vh; overflow: hidden`.
- [X] T008 [US1] Update `.main-area-clean` rule in `frontend/src/App.css`: add `min-width: 0` to allow flex child to shrink (prevents overflow from rigid children). Keep `margin-left: var(--sidebar-w); flex: 1; overflow-y: auto`.
- [X] T009 [US1] Update `.content-panel` rule in `frontend/src/App.css`: change horizontal padding to `var(--content-px)`. Final: `padding: 12px var(--content-px) 16px`.
- [X] T010 [US1] Add `@media (min-width: 1180px)` block in `frontend/src/App.css` to override `.content-panel` padding: `padding: 12px var(--content-px-lg) 16px`.
- [X] T011 [US1] Add `@media (min-width: 1366px)` block in `frontend/src/App.css` to override `.content-panel` padding: `padding: 16px var(--content-px-xl) 20px`.
- [X] T012 [US1] Audit `frontend/src/app-additions.css` overrides flagged in T004; remove or adjust any rule that re-imposes `max-width` or fixed padding on `.app-shell`, `.main-area-clean`, `.content-panel`.
- [X] T013 [US1] Run `npm run build` and manual viewport check at all 4 sizes. Confirm overflow detector script (from quickstart.md) returns zero results.

**Checkpoint**: US1 complete. Layout is fluid across all target viewports. MVP achieved.

---

## Phase 4: User Story 2 — L2 Underline Navigation (Priority: P2)

**Goal**: Replace pill/border L2 tab styling with animated underline indicator. Implements R03.

**Independent Test**:
1. Open Scheda Paziente
2. Click between L2 tabs (Panoramica, Clinica, Diario, Moduli, Documenti)
3. Verify active tab shows underline only (no border, no background fill)
4. Verify underline animates width 0→100% within 180ms on tab switch
5. Verify inactive tab on hover shows light background tint, no border
6. Verify L2 tab height ≥44px (touch target)

### Implementation

- [X] T014 [US2] Update `.main-h-nav .nav-tab` rule in `frontend/src/App.css`: add `position: relative`. Preserve existing height (`--l2-h: 44px`) and font (`--l2-font: 14px`). _(Applied to actual class `.page-tabs__btn` in `app-additions.css` — the React component uses class names `page-tabs`/`section-tabs` not the hypothetical `main-h-nav`/`context-sub-tabs`.)_
- [X] T015 [US2] Remove pill/border styling from `.main-h-nav .nav-tab.active` in `frontend/src/App.css`: strip `border`, `border-radius`, `box-shadow`, `background` from active state. Keep text color emphasis (bolder weight or color shift) for active identification. _(Applied to `.page-tabs__btn--active`.)_
- [X] T016 [US2] Add `.main-h-nav .nav-tab::after` pseudo-element in `frontend/src/App.css`: `content: ''; position: absolute; bottom: 0; left: 0; width: 0; height: var(--l2-underline-h); background: var(--l2-underline-color); transition: width var(--tab-transition-duration) var(--tab-transition-easing)`. _(Applied to `.page-tabs__btn::after`.)_
- [X] T017 [US2] Add `.main-h-nav .nav-tab.active::after` rule in `frontend/src/App.css`: `width: 100%`. _(Applied to `.page-tabs__btn--active::after`.)_
- [X] T018 [US2] Add hover state for `.main-h-nav .nav-tab:hover:not(.active)` in `frontend/src/App.css`: `background: rgba(0, 0, 0, 0.04); border-radius: 4px`. _(Applied to `.page-tabs__btn:hover:not(.page-tabs__btn--active)`.)_
- [X] T019 [US2] Run `npm run build` and manual L2 tab click-through QA. Confirm animation duration in DevTools (180ms ±20ms).

**Checkpoint**: US2 complete. L2 navigation visually distinct from L3 with animated underline.

---

## Phase 5: User Story 3 — L3 Scrollable Pills (Priority: P2)

**Goal**: Keep L3 as compact pills with horizontal scroll when overflow; hidden scrollbar. Implements R04.

**Independent Test**:
1. Open Scheda Paziente → tab group with many L3 sub-tabs (e.g., Clinica → many sections)
2. Resize viewport to 1024px width
3. Verify L3 pills scroll horizontally inside `.context-sub-tabs`
4. Verify no visible scrollbar (Chrome/Edge/Firefox)
5. Verify L3 active pill has lighter background than L2 active state
6. Verify L3 pill height matches `--l3-h: 32px`

### Implementation

- [X] T020 [US3] Update `.context-sub-tabs` container rule in `frontend/src/App.css`: add `overflow-x: auto`, `white-space: nowrap`, `scrollbar-width: none`, `-ms-overflow-style: none`. _(Applied to `.section-tabs`.)_
- [X] T021 [US3] Add `.context-sub-tabs::-webkit-scrollbar` rule in `frontend/src/App.css`: `display: none`. _(Already on `.section-tabs::-webkit-scrollbar`.)_
- [X] T022 [US3] Update `.context-sub-tabs__pill` rule in `frontend/src/App.css`: confirm `display: inline-flex` (prevents wrap inside scrollable container). Keep pill shape (`border-radius`). _(Applied to `.section-tabs__btn`.)_
- [X] T023 [US3] Update `.context-sub-tabs__pill.active` rule in `frontend/src/App.css`: reduce contrast vs L2 — use subtle background like `var(--hover, #F5F8FB)` instead of strong fill. No heavy border. _(Applied to `.section-tabs__btn--active`.)_
- [X] T024 [US3] Run `npm run build` and manual QA: open patient detail in a section with many L3 tabs, verify horizontal scroll works and scrollbar hidden in all major browsers.

**Checkpoint**: US3 complete. L3 navigation lighter than L2, scrolls cleanly when overflowed.

---

## Phase 6: User Story 4 — Tab Content Transitions (Priority: P3)

**Goal**: Smooth fade+slide transition when active tab content changes. Implements R05.

**Independent Test**:
1. Open Scheda Paziente
2. Switch between L2 tabs — observe incoming content fade in + slide from right (8px) over 180ms
3. Switch between L3 sub-tabs — same effect
4. In DevTools → Rendering → set `prefers-reduced-motion: reduce` — verify transitions are instant
5. Verify no layout thrash or flicker during transitions

### Implementation

- [X] T025 [US4] Add `.tab-panel-transition` class + `@keyframes tabPanelEnter` to `frontend/src/App.css` per data-model.md spec (opacity 0→1, transform translateX(8px)→0, duration var(--tab-transition-duration), easing var(--tab-transition-easing)).
- [X] T026 [US4] Add `@media (prefers-reduced-motion: reduce) { .tab-panel-transition { animation: none } }` block in `frontend/src/App.css`.
- [X] T027 [US4] Update `frontend/src/components/operator/PatientDetail.tsx`: locate the tab content wrapper (likely the panel rendered after L2/L3 nav). Add `className="tab-panel-transition"` and `key={activeTabId}` (or equivalent active key combining L2+L3) so React remounts on tab change. _(Applied to `.cr-detail-content` with `key={`${activeGroup}-${tab}`}`.)_
- [X] T028 [US4] Run `npm run build` and manual QA: tab through L2 and L3 with and without `prefers-reduced-motion`. Verify animation triggers and respects user preference.

**Checkpoint**: US4 complete. Tab content transitions smoothly. All four user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: Final validation across all stories.

- [ ] T029 Run full QA checklist from `specs/007-clean-nav-layout/spec.md`: 12 items at 1024, 1180, 1366, 1920 viewports. _(Pending manual browser QA by user.)_
- [ ] T030 Run overflow detector script from `quickstart.md` in DevTools console at each viewport; confirm zero matches. _(Pending manual browser QA by user.)_
- [X] T031 Final `npm run build` — zero TypeScript errors, zero lint errors.
- [ ] T032 Verify no regressions in Agenda, Terapia, Parametri, Diario pages (each test described in spec.md QA checklist). _(Pending manual browser QA by user.)_
- [ ] T033 Commit changes: `improve fluid navigation tabs and transitions`. _(Deferred per agent instructions — user reviews before commit.)_

---

## Phase 8: Expanded Scope (user-requested)

- [X] EX01 L1 sidebar (`.nav-rail`) Teams-style refinement: width 64px (was 96px), icon-only labels (visually hidden via clip-path; `title`/`aria-label` preserve tooltip + accessibility), 4px white left accent bar on active item (top:8px / bottom:8px), softened hover background `rgba(255,255,255,0.06)`.
- [X] EX02 Vertical space optimization: `.cr-breadcrumb` padding reduced (12px→4px top, 20px→16px sides), `.cr-header` patient card padding 20px/24px→10px/16px and `min-height: 48px`, `border-radius` 16px→12px, `margin: 10px 16px→6px 16px`.
- [X] EX03 New variable `--topbar-h: 32px` registered for future micro-bars. `--header-h` left at 60px (existing topbar).
- [X] EX04 `overflow-x: hidden` added on `.app-shell` (NOT body) to prevent any cross-page horizontal scrollbar.

---

## Phase 9: Review Fixes

Blocking fixes applied during post-implementation review.

- [X] FIX1 L1 `.nav-rail` labels restored to visible (Constitution Principle II): rail width 64px → 80px, `.nav-rail__label` sr-only/clip-path block replaced with visible label styling (10px font, centered, ellipsis), `.nav-rail__item` switched to flex-column (icon + label stacked, gap 4px, padding 8px 4px, min-height 60px). Active 4px white accent bar (`::before`) preserved. `--sidebar-w` token left at 240px (not wired to nav-rail width, no consumers found).
- [X] FIX2 Removed all page-level `max-width` constraints (defeated R01/R02 fluid layout). 14 selectors switched from `max-width: NNNNpx` to `width: 100%`: `.dashboard`, `.patients-view`, `.patient-detail`, `.admin-dashboard`, `.operator-dashboard`, `.op-management`, `.agenda-admin-view`, `.consegne-page` (both occurrences), `.patient-detail-view`, `.patient-list-view`, `.operator-agenda-view` in `App.css`; `.rooms-view` in `app-additions.css`.
- [X] FIX3 Removed duplicated `#root` block from `index.css` (App.css now sole authority). Stripped conflicting `:root` declarations (`font: 18px/145%`, `color: var(--text)`, `background: var(--bg)`, light/dark scheme color tokens) from `index.css` `:root`; kept only Vite font-family vars and font-smoothing baseline reset.
- [X] FIX4 Tab transition no longer remounts heavy children in `PatientDetail.tsx`. Removed `key={...}` from `.cr-detail-content`; replaced with `useRef` + `useEffect` that toggles `tab-panel-transition` class with a forced reflow on `[activeGroup, tab]` change. Animation still fires; `TerapiaFarmacologicaTab`/`ParametriTab`/`DiarioPazienteTab` no longer refetch or lose state on tab switch. Added `useRef` to existing `react` import.
- [X] FIX5 Extended `@media (prefers-reduced-motion: reduce)` block in `App.css` to also disable transitions on `.page-tabs__btn::after` (L2 underline), `.page-tabs__btn`, and `.section-tabs__btn` (R05 compliance).

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): no deps — start immediately
- Foundational (Phase 2): depends on Setup. **BLOCKS US1, US2, US3, US4**
- US1 (Phase 3): depends on Foundational. **Prerequisite for visual sanity of US2/US3/US4**
- US2 (Phase 4): depends on Foundational. Can run after US1 or in parallel by separate dev
- US3 (Phase 5): depends on Foundational. Can run in parallel with US2 (different CSS classes)
- US4 (Phase 6): depends on Foundational. Recommend after US1 (layout fluid first); can parallel US2/US3
- Polish (Phase 7): depends on US1–US4 complete

### Within Each User Story

- T006–T012 (US1): T006 first (#root fix unblocks visual testing), then T007–T011 sequential on App.css (same file), T012 last (audit overrides)
- T014–T018 (US2): all touch App.css — sequential to avoid edit conflicts
- T020–T023 (US3): all touch App.css — sequential
- T025–T027 (US4): T025+T026 on App.css (sequential), T027 on PatientDetail.tsx (parallel with App.css)

### Parallel Opportunities

- T002, T003, T004 (audit phase) — different files, parallel
- US2 (App.css) and US4 T027 (PatientDetail.tsx) — different files, can parallel
- US2 and US3 — both App.css but different class selectors; one editor at a time recommended

---

## Implementation Strategy

### MVP (US1 only)

1. T001 baseline build
2. T002–T004 audits (parallel)
3. T005 add variables
4. T006–T013 US1 layout fix
5. **STOP and VALIDATE**: fluid layout works at all viewports
6. Demo: dead space gone, full-width content

### Incremental Delivery

- After MVP: ship US1 alone if pressed for time. Visual upgrade is biggest win.
- Add US2 (L2 underline): visual hierarchy clearly differentiated
- Add US3 (L3 scroll): tablet usability complete
- Add US4 (transitions): polish layer

### Parallel Team Strategy

- Dev A: US1 (after T005)
- Dev B: US2 (after T005, coordinate App.css editor lock with Dev A)
- Dev C: US4 T027 (PatientDetail.tsx) — independent file

---

## Notes

- All work is frontend-only. No backend, no Prisma, no new npm deps.
- Multiple tasks edit `App.css` — sequence them or use careful merge.
- `app-additions.css` may override layout rules — T012 (US1) is critical to surface conflicts.
- Per Constitution Principle VI: `npm run build` must pass after every task that touches code.
- Commit message at T033: `improve fluid navigation tabs and transitions`.
