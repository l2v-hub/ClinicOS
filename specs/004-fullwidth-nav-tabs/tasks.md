# Tasks: Navigazione Full-Width Adattiva con Tab Underline e Transizione Scorrevole

**Input**: Design documents from `specs/004-fullwidth-nav-tabs/`

**Prerequisites**: spec.md ✓, project context (no plan.md — tech stack known: React 19 + TypeScript + Vite + pure CSS, frontend-only)

**Tests**: No automated tests — manual QA at 1024×768 and 1366px per spec acceptance criteria.

**Organization**: Tasks grouped by user story. All tasks are frontend-only (`frontend/src/`). No backend/Prisma/API changes.

**Hard constraints**:

- No new npm dependencies
- `npm run build` must pass after every phase
- Italian labels preserved
- No VITE_API_URL, backend, Prisma, or API changes
- `prefers-reduced-motion` must be respected for all animations

**Codebase context** (established before task generation):

- L2 nav CSS class: `.page-tabs` / `.page-tabs__btn` / `.page-tabs__btn--active` (in `App.css:291`)
- L3 nav CSS class: `.section-tabs` / `.section-tabs__btn` / `.section-tabs__btn--active` (in `App.css:342`)
- Tab transition: `tab-panel-transition` CSS class + `@keyframes tabPanelEnter` already exist (in `App.css:3672`)
- Current width blockers: `.page-content { max-width: 1200px }` (line 2368), `.patients-view { max-width: 1040px }` (line 1015), `.patient-detail { max-width: 1100px }` (line 1253)
- Tab consumers: only `PatientDetail.tsx` uses `PageTabs` + `SectionTabs` + `tab-panel-transition`

---

## Phase 1: Setup (Verify baseline)

**Purpose**: Confirm current build is clean before any changes.

- [ ] T001 Verify `npm run build` passes clean in `frontend/` — confirm no TypeScript errors or CSS errors before any edits

---

## Phase 2: Foundational (No blocking prerequisites for this feature — CSS-only changes)

This feature has no cross-phase blocking dependencies. All user story phases can proceed after T001.

---

## Phase 3: User Story 1 — Layout Full-Width Adattivo (Priority: P1)

**Goal**: Remove max-width constraints on key layout containers so content fills all available horizontal space.

**Independent Test**: Open `http://localhost:5173` at 1024×768 and 1366px. Patient list and patient detail must fill the full width (minus 64px sidebar). No horizontal scrollbar. Content does not leave wide empty margins.

### Implementation for User Story 1

- [ ] T002 [US1] In `frontend/src/App.css` at line 2368, remove `max-width: 1200px` from `.page-content` — replace with `max-width: 100%` (or delete the property entirely, leaving `flex: 1` to control expansion). This is the primary full-width blocker.

- [ ] T003 [US1] In `frontend/src/App.css` at line 1015, remove `max-width: 1040px` from `.patients-view`. The patients table should expand to fill available space. Add `width: 100%` if not already present to ensure it fills its flex container.

- [ ] T004 [US1] In `frontend/src/App.css` at line 1253, remove `max-width: 1100px` from `.patient-detail`. Patient detail content should expand to fill available space. Add `width: 100%` if not already present.

- [ ] T005 [P] [US1] In `frontend/src/App.css`, verify that `.content-panel` (line 485) uses `flex: 1` and `padding: 12px 16px 16px` without any max-width. Confirm `.main-area-clean` (line 477) uses `margin-left: var(--sidebar-w)` and `height: 100vh` without width restrictions. No changes needed if already correct.

- [ ] T006 [US1] In `frontend/src/App.css`, update the `.page-content` responsive media queries (lines 2372-2377) so that at `min-width: 1180px` and `min-width: 1366px` the padding increases to give wider viewports more breathing room without capping width. Change `--content-px-lg` usage to `padding: 12px 24px 16px` and `--content-px-xl` to `padding: 16px 32px 20px`. These are padding-only adjustments — no max-width.

**Checkpoint**: `npm run build` passes. At 1024px, patient list table fills all available width. At 1366px, patient detail has no wide empty side margins. No horizontal scrollbar.

---

## Phase 4: User Story 2 — Secondo Livello con Solo Underline (Priority: P2)

**Goal**: Remove visual gap/separation between L2 tab buttons that creates a "border around items" appearance. The active tab should show only underline, with tabs flush/continuous.

**Independent Test**: Open patient detail. L2 tab row shows tab labels continuously (no visible space between them). Active tab has blue underline only. Inactive tabs have no visible border or separation. Hover shows subtle color change only.

### Implementation for User Story 2

- [ ] T007 [US2] In `frontend/src/App.css` at the `.page-tabs` rule (line 291), change `gap: 4px` to `gap: 0`. This removes the visible spacing between tab buttons that creates the "box around each item" appearance. Tabs will be flush, letting the underline be the only visual indicator.

- [ ] T008 [US2] In `frontend/src/App.css` at `.page-tabs__btn` (line 302), increase `padding` from `0 12px` to `0 16px` to give each tab more horizontal breathing room within itself, compensating visually for the removed gap. Verify the button height stays at `var(--l2-h)` (44px).

- [ ] T009 [P] [US2] In `frontend/src/App.css`, verify `.page-tabs__btn:hover` (line 320) only changes `color` with no background fill. If any `background` property exists on hover, remove it. Add `background: rgba(0,0,0,0.03)` as a minimal hover fill for touch target clarity without visual heaviness. This is a light touch — must not look like a pill/box.

**Checkpoint**: `npm run build` passes. L2 tab buttons appear as a continuous labeled strip, not as individual pill-shaped buttons. Active underline is clearly visible. No box around inactive tabs.

---

## Phase 5: User Story 3 — Transizione Fluida al Cambio Tab (Priority: P3)

**Goal**: Make the content panel slide animation more perceptible. Current `translateX(8px)` is too subtle. Increase to 14px and ensure the animation reliably triggers on both L2 and L3 tab changes.

**Independent Test**: In patient detail, rapidly click between 3 L2 tabs. Each switch must show a visible left-to-right slide-in of the content panel (≤200ms). Same must happen when switching L3 sub-tabs. With OS reduced-motion enabled, no animation should occur.

### Implementation for User Story 3

- [ ] T010 [US3] In `frontend/src/App.css` at `@keyframes tabPanelEnter` (line 3676), change `translateX(8px)` to `translateX(14px)` in the `from` state. This makes the slide effect more perceptible while staying professional and subtle. The opacity fade stays the same (0→1).

- [ ] T011 [P] [US3] In `frontend/src/App.css`, verify `--tab-transition-duration` (currently `180ms`, line 102) is appropriate for the more visible slide. If the 14px slide at 180ms feels too fast, increase to `220ms`. Keep `--tab-transition-easing: ease-out` unchanged.

- [ ] T012 [US3] In `frontend/src/components/operator/PatientDetail.tsx` at lines 1674-1681, verify the `useEffect` that drives the `tab-panel-transition` class toggle is correct. The dependency array `[activeGroup, tab]` must include both to trigger on both L2 and L3 changes. The `void el.offsetWidth` DOM reflow trick must be present to force CSS animation restart. If missing, add it between the `classList.remove` and `classList.add` calls. No behavioral changes — only verify correctness.

- [ ] T013 [P] [US3] In `frontend/src/App.css` at the `@media (prefers-reduced-motion: reduce)` block (line 3680), verify that `tab-panel-transition` is included in the selectors with `animation: none !important`. Verify `page-tabs__btn::after` and `section-tabs__btn::after` are also included for underline transition suppression. Add any missing selectors. No changes if already correct.

**Checkpoint**: `npm run build` passes. Tab switch shows clear slide-in animation at 14px. With reduced-motion OS setting, no animation appears. Rapid clicking does not freeze or leave intermediate states.

---

## Phase 6: User Story 4 — Terzo Livello Visivamente Subordinato (Priority: P4)

**Goal**: Verify L3 remains clearly subordinate to L2 after Phase 4/5 changes. Confirm visual hierarchy is maintained — no CSS changes expected, only verification.

**Independent Test**: With patient detail open, compare L2 (page-tabs) and L3 (section-tabs) visually. L2 must be taller (44px vs 32px), larger font (14px vs 11.5px), and visually dominant. L3 must be clearly secondary.

### Implementation for User Story 4

- [ ] T014 [P] [US4] In `frontend/src/App.css`, verify `.section-tabs__btn` (line 353) retains `height: var(--l3-h)` (32px), `font-size: var(--l3-font)` (11.5px), and `font-weight: 500`. After Phase 4 gap removal from `.page-tabs`, confirm `.section-tabs` does NOT have its gap changed — L3 can keep its current gap or spacing as the pill-style distinction is acceptable. Only change L3 if gap-zero from Phase 4 accidentally inherited.

- [ ] T015 [US4] Verify `@media (prefers-reduced-motion: reduce)` block includes `section-tabs__btn::after` for suppression. Already present from Phase 5 T013 verification — cross-check. No additional change needed.

**Checkpoint**: `npm run build` passes. Visual hierarchy maintained: L2 taller + larger font, L3 shorter + smaller font + lighter styling.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T016 [P] In `frontend/src/App.css`: verify no remaining max-width properties on view-level containers above 1200px that might clamp content on very wide (1440px+) displays. Specifically check `.agenda-view`, `.consegne-view`, `.dashboard-view` classes if they exist. Remove any max-width that limits to <1440px.

- [ ] T017 Run `npm run build` in `frontend/`. Fix any TypeScript or CSS errors from Phases 3-6. Ensure build exits 0.

- [ ] T018 Manual QA: open `http://localhost:5173` at 1024×768. Verify: (1) patient list fills full width, (2) patient detail fills full width, (3) L2 tabs are flush with no gaps between items, (4) L2 active tab shows only underline, (5) tab switch shows visible slide animation, (6) L3 is visually subordinate to L2, (7) no horizontal scrollbar. Then repeat at 1366px — verify content expands with viewport.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 3 (US1 — Full-Width)**: Depends on Phase 1 only
- **Phase 4 (US2 — Underline)**: Depends on Phase 1 only; independent of Phase 3
- **Phase 5 (US3 — Transition)**: Depends on Phase 1 only; independent of Phases 3-4
- **Phase 6 (US4 — L3 Verify)**: Depends on Phase 4 (gap changes may affect L3 appearance)
- **Phase 7 (Polish)**: Depends on Phases 3, 4, 5, 6

### Within Each Phase

- T002→T003→T004 sequential (all write to App.css — safer to avoid conflicts)
- T005, T006 can parallel with T002-T004 (different lines, no write conflicts)
- T007→T008→T009 sequential within Phase 4
- T010, T011, T013 parallel (all App.css but different rules)
- T012 sequential after T010/T011 (verifies TS after CSS animation change)
- T014, T015 parallel (read-verify only)

### Parallel Opportunities

```bash
# After Phase 1 (T001), these can start in parallel:
Phase 3 (US1): T002 → T003 → T004 → T005 → T006
Phase 5 (US3): T010 → T011 → T012 → T013   # independent of Phase 3
```

---

## Implementation Strategy

### MVP Scope (Phase 3 only — highest impact)

1. T001: Verify build
2. T002: Remove `max-width: 1200px` from `.page-content`
3. T003: Remove `max-width: 1040px` from `.patients-view`
4. T004: Remove `max-width: 1100px` from `.patient-detail`
5. **Validate**: Content fills full width — immediate SC-001/SC-005 impact

### Full Delivery

1. MVP above (Phases 1+3) +
2. Phase 4: Tab gap fix — SC-002 compliance
3. Phase 5: Transition enhancement — SC-003 compliance
4. Phase 6: L3 verification — SC-006 compliance
5. Phase 7: Polish + QA

---

## Notes

- No automated tests — verification is manual browser QA
- Key CSS file: `frontend/src/App.css` — all changes are CSS-only except T012 (TS verify)
- Key TS file: `frontend/src/components/operator/PatientDetail.tsx` — only T012 touches it
- `NavComponents.tsx` is NOT modified — component CSS classes already correct
- No new npm packages
- All labels remain Italian
