# Tasks: Redesign Design System & Layout

**Feature**: `014-redesign-design-system` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Frontend**: React 19 + TypeScript + Vite, pure CSS. Verification gate: `cd frontend && npm run build`.

**Naming**: canonical table = `ClinicalTable` (constitution); "ClinicalDataTable" = synonym.

---

## Phase 1: Setup

- [ ] T001 Confirm branch `014-redesign-design-system` is checked out and `frontend` deps install cleanly (`cd frontend && npm install`).
- [ ] T002 Read the audit `.claude/design-reference/CLINICOS_VISUAL_AUDIT.md` and `specs/014-redesign-design-system/contracts/components.md` before editing components (reference only, no code).

## Phase 2: Foundational (BLOCKING — must complete before US phases)

- [ ] T003 Add intent design tokens to `:root` in `frontend/src/App.css`: `--c-primary`, `--c-primary-hover #1748B8`, `--c-primary-active #123A92`, `--c-primary-bg #EBF1FE`, `--c-success(-bg)`, `--c-warning(-bg)`, `--c-danger(-bg)`, `--c-info`, `--c-neutral(-bg)`, `--gutter 20px`; set `--sidebar-w: 80px`. Map aliases to existing raw tokens; do not redefine raw colors.
- [ ] T004 [P] Create thin `frontend/src/components/shared/PageShell.tsx` (props `{children, subnav?}`): applies `--gutter`, owns vertical scroll, sets `min-width:0` on the flex content column; full-width (no max-width). Add matching CSS in `App.css`.
- [ ] T005 [P] Verify/extend `ClinicalTable` (`frontend/src/components/operator/cartella/ClinicalTable.tsx`) public API matches `contracts/components.md` (columns sortable/filterable/filterType/align/render, rowKey, onRowClick, rowAccent, pageSize, emptyText, internal `overflow-x:auto`). Add only missing props; keep existing call sites working.
- [ ] T006 [P] Add a small `StatusBadge` helper (in `frontend/src/components/shared/`) mapping value→tone (success/warning/danger/info/neutral, unknown→neutral) using intent tokens; red tone reserved for clinical alert/error.

**Checkpoint**: tokens + PageShell + table API + StatusBadge exist; `npm run build` passes.

---

## Phase 3: User Story 1 — Consistent shell & navigation (P1) 🎯 MVP

**Goal**: Same sidebar/L2/L3/header on every priority page; Diario L3 uses shared sub-nav.
**Independent test**: Open each priority page — sidebar 80px icon+label with clear active; L2 blue underline; L3 lighter; Diario L3 visually identical to others; header/breadcrumb not duplicated.

- [ ] T007 [P] [US1] Widen + clarify sidebar in `frontend/src/components/shared/TeamsLikeSidebar.tsx` and its CSS: width `var(--sidebar-w)`=80px, icon+label every item, stronger blue active state, touch target ≥44px; keep role-filtered items from `App.tsx`.
- [ ] T008 [US1] Update `frontend/src/App.tsx` shell: `margin-left: var(--sidebar-w)`, route page bodies through `PageShell`, remove duplicated per-page layout wrappers.
- [ ] T009 [P] [US1] Ensure L2 `MainHorizontalNav` in `frontend/src/components/shared/NavComponents.tsx` matches contract (blue underline, no pill, height `--l2-h`, right `actions` slot); remove any stray L2 styles elsewhere.
- [ ] T010 [P] [US1] Ensure L3 `ContextSubTabs` in `NavComponents.tsx` matches contract (lighter/compact, height `--l3-h`, inline `(n)` badge, optional urgent dot).
- [ ] T011 [US1] In `frontend/src/components/operator/cartella/DiarioPazienteTab.tsx`: replace custom author `.filter-chip` chips with shared `ContextSubTabs` for author categories; remove `.filter-chip`/`.diario-filters` custom CSS from `frontend/src/app-additions.css`.
- [ ] T012 [US1] In `frontend/src/components/operator/PatientDetail.tsx`: render L2 groups via `MainHorizontalNav` and L3 sections via `ContextSubTabs` (no inline tab markup); verify Diario tab wiring.
- [ ] T013 [P] [US1] In `frontend/src/components/operator/OperatorAgenda.tsx`: render the daily/weekly/monthly view switcher via shared `MainHorizontalNav`/`ContextSubTabs` instead of custom buttons.
- [ ] T014 [P] [US1] In `frontend/src/components/shared/PageHeader.tsx`: ensure breadcrumb tail does not duplicate `title`; apply on priority pages that show both.

**Checkpoint**: US1 independently testable; `npm run build` passes.

---

## Phase 4: User Story 2 — Unified tables (P2)

**Goal**: Every list page renders through `ClinicalTable` with uniform header/sort/filter/actions/pagination + consistent `StatusBadge`.
**Independent test**: Each list page uses `ClinicalTable`; sort/filter/badges/pagination behave identically.

- [ ] T015 [P] [US2] Migrate `frontend/src/components/operator/PatientList.tsx` from `.clinicos-table` to `ClinicalTable` (columns: Paziente, MRN, DOB, Camera/Letto, Contatti, Consegne, azioni); keep row click → patient detail; preserve `/patients` data flow unchanged.
- [ ] T016 [P] [US2] Migrate `frontend/src/components/admin/RoomsManagement.tsx` table to `ClinicalTable`.
- [ ] T017 [P] [US2] Migrate `frontend/src/components/admin/OperatorManagement.tsx` table to `ClinicalTable` (Nome, Ruolo, Stato, Colore, Azioni).
- [ ] T018 [P] [US2] Confirm `frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx` uses `ClinicalTable` + `StatusBadge` (erogata=success, in attesa=info, non erogata=warning).
- [ ] T019 [P] [US2] Confirm `frontend/src/components/operator/cartella/ParametriTab.tsx` history uses `ClinicalTable`.
- [ ] T020 [P] [US2] Confirm `frontend/src/components/operator/cartella/DocumentiTab.tsx` list uses `ClinicalTable`.
- [ ] T021 [US2] Unify any divergent table/badge CSS in `frontend/src/app-additions.css` onto the shared `ClinicalTable`/`StatusBadge` classes; remove dead per-page table CSS.

**Checkpoint**: US2 independently testable; `npm run build` passes.

---

## Phase 5: User Story 3 — Coherent cards & clinical focus (P2)

**Goal**: All clinical-page section widgets use `ClinicalCard`; clinical/treatment history central; expand→focus, siblings compress.
**Independent test**: Cards share padding/border/shadow/edit button; expanding one focuses it and compresses siblings; history is the central column.

- [ ] T022 [P] [US3] Audit `frontend/src/components/operator/PatientDetail.tsx` and `cartella/*Tab.tsx`: wrap section widgets in `ClinicalCard`; replace ad-hoc `.pt-header-card`/inline card divs where they are section widgets.
- [ ] T023 [US3] Ensure clinical history & treatment history occupy the primary central column on Scheda Paziente / clinical record; secondary cards collapse.
- [ ] T024 [P] [US3] Verify `ClinicalCard` focus state (`focused`) makes the expanded card central and compresses siblings; consistent ghost edit button via `onEdit`.
- [ ] T025 [P] [US3] Standardize stat/agenda cards on priority pages onto `ClinicalCard` or shared card tokens where they are section containers (leave true micro-widgets like agenda slot pills as-is).

**Checkpoint**: US3 independently testable; `npm run build` passes.

---

## Phase 6: User Story 4 — Full-width responsive (P3)

**Goal**: Full-width desktop, no global horizontal overflow on tablets; wide tables scroll inside container.
**Independent test**: At 1024×768, 1180×820, 1366px+ — content fills width, no page-level horizontal scrollbar.

- [ ] T026 [US4] In `App.tsx`/`App.css`: make content column full-width with `--gutter`; remove any max-width centering on priority pages; ensure flex content has `min-width:0`.
- [ ] T027 [P] [US4] Verify `ClinicalTable` container handles wide content via internal `overflow-x:auto` (not the page body) on all migrated tables.
- [ ] T028 [US4] Sweep priority pages for fixed widths / non-wrapping rows that cause overflow at 1024px; fix with responsive units.
- [ ] T029 [US4] Manual viewport QA at 1024×768, 1180×820, 1366px+ on all 9 priority pages: record no global horizontal scrollbar, sidebar legible, L2/L3 uniform, Diario parity, tables/cards uniform.

**Checkpoint**: US4 independently testable; `npm run build` passes.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T030 Remove dead/duplicated CSS left after consolidation in `App.css` + `app-additions.css` (no orphan `.filter-chip`, per-page table styles).
- [ ] T031 Confirm red is used only for clinical alerts/errors across priority pages (no red primary/active/neutral).
- [ ] T032 Verify `/patients` still loads patient data (start backend if available; or confirm fetch path untouched).
- [ ] T033 Run `cd frontend && npm run build` — must pass (tsc strict + vite) with no errors.
- [ ] T034 Run `cd frontend && npm run lint` — resolve lint errors introduced by the change.
- [ ] T035 Final acceptance pass against spec SC-001…SC-008; update audit/spec notes if any deviation; commit `redesign ClinicOS from design reference folder`.

---

## Dependencies & Execution Order

- **Setup (P1)** → **Foundational (P2: T003–T006)** block everything.
- **US1 (T007–T014)** is the MVP and the foundation for visual parity; do first.
- **US2 (T015–T021)** and **US3 (T022–T025)** depend on Foundational; mostly independent of US1 but easier after shell is stable.
- **US4 (T026–T029)** depends on shared components being in place (after US1/US2).
- **Polish (T030–T035)** last.

## Parallel Opportunities

- Foundational: T004, T005, T006 in parallel (different files).
- US1: T007, T009, T010, T013, T014 in parallel; T008/T011/T012 touch shared shell/pages — sequence T008 before page edits.
- US2: T015–T020 fully parallel (different page files); T021 after.
- US3: T022, T024, T025 parallel; T023 after T022.

## MVP Scope

User Story 1 (consistent shell & navigation) delivers the largest perceived-quality gain and is a
standalone, demonstrable increment.

## Workflow-agent fan-out mapping (orchestration)

- Wave A (sequential): T003, then T004/T005/T006 parallel.
- Wave B (US1): T007 → T008 → {T009,T010,T011,T012,T013,T014} parallel.
- Wave C (US2): {T015,T016,T017,T018,T019,T020} parallel → T021.
- Wave D (US3): {T022,T024,T025} parallel → T023.
- Wave E (US4): T026 → {T027,T028} → T029.
- Wave F (Polish): T030–T035 sequential, build gate at T033.
