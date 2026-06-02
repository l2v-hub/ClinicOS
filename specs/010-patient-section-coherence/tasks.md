# Tasks: Patient Card Navigation Uniformity & Clinical Section Layout Parity

**Input**: Design documents from `/specs/010-patient-section-coherence/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-components.md, quickstart.md

**Tests**: Not requested in the feature specification. No test tasks are generated.

**Organization**: Tasks are grouped by user story (US1, US2, US3, US4, US5, US6) so each story can be implemented and validated as an independent slice.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Different file, no dependency on an incomplete task → can run in parallel.
- **[Story]**: `US1`–`US6` (matches priorities in spec.md). Setup, Foundational, and Polish phases carry no story label.
- Include exact file paths.

## Path Conventions

- Web application monorepo. This feature touches only `frontend/`.
- Backend, Prisma, API, and environment configuration are out of scope.

---

## Phase 1: Setup

**Purpose**: Verify the working environment is ready. No code edits in this phase.

- [ ] T001 Confirm branch `010-patient-section-coherence` is active by running `git rev-parse --abbrev-ref HEAD` in the repo root and verifying the output equals `010-patient-section-coherence`
- [ ] T002 From `C:/Workspace/DG_SE_DEV/ClinicOS/frontend` run `npm install` (only if `node_modules` is missing) then `npm run build`; record the gzipped CSS and JS bundle sizes as the Phase 1 baseline for later comparison
- [ ] T003 [P] Read `specs/010-patient-section-coherence/data-model.md` and `specs/010-patient-section-coherence/research.md` to internalise the 8 design decisions and the new `--clinical-*` / `--card-*` token list before any edit
- [ ] T004 [P] Read `specs/010-patient-section-coherence/contracts/ui-components.md` to internalise the `ClinicalCard` prop contract, the breadcrumb single-source rule, and the badge audit contract

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Land the shared `ClinicalCard` component, the new design tokens, and the canonical card CSS rules. Every user-story phase depends on this.

**⚠️ CRITICAL**: No user-story work may begin until Phase 2 is complete.

- [ ] T005 Create `frontend/src/components/shared/ClinicalCard.tsx` implementing the prop contract in `contracts/ui-components.md` (props: `title`, `defaultExpanded`, `expanded` controlled, `onToggle`, `onEdit`, `editLabel`, `className`, `children`). Render the DOM shape from the contract (`<section class="clinical-card" role="region" aria-labelledby="cc-{id}">` with header, title, actions slot, toggle button, content). Implement collapse via internal state when `expanded` is undefined; controlled mode when `expanded` is provided. Header click and Enter/Space keyboard event both toggle. Italian defaults: `editLabel = 'Modifica'`, toggle button `aria-label = 'Espandi / Comprimi'`. Keep the file under 100 lines. Do NOT import any new library
- [ ] T006 In `frontend/src/App.css` `:root`, add the new tokens listed in data-model.md § "Tokens this feature adds": `--clinical-submenu-gap: 16px`, `--card-header-h: 40px`, `--card-padding-x: 16px`, `--card-padding-y: 12px`, `--card-radius: 8px`, `--card-border: 1px solid var(--border-subtle)`, `--card-bg: var(--surface, #fff)`, `--card-shadow: 0 1px 2px rgba(0,0,0,0.04)`. Place them in the existing token group near the 009 entries; do not rename existing tokens
- [ ] T007 In `frontend/src/App.css` add the `.clinical-card*` rule set per data-model.md § "New CSS Classes": `.clinical-card`, `.clinical-card + .clinical-card`, `.clinical-card__header`, `.clinical-card__title`, `.clinical-card__actions`, `.clinical-card__toggle`, `.clinical-card__edit`, `.clinical-card__content`, `.clinical-card__content-inner`, `.clinical-card--collapsed > .clinical-card__content`, `.clinical-card--collapsed .clinical-card__toggle`. Place the block after the `.section-tabs*` rules and before the `.tab-panel-transition` keyframes
- [ ] T008 In `frontend/src/App.css` extend the existing `@media (prefers-reduced-motion: reduce)` block to include `.clinical-card__content { transition: none !important; }` (R-4 / FR-018). Do not weaken any 009 selector already in that block
- [ ] T009 [P] In `frontend/src/App.css` add the sub-menu spacing rule per data-model.md § "CSS Modifications — Sub-Menu Spacing": `.clinical-section-title + .section-tabs, .clinical-section-title + .section-sub-menu { margin-top: var(--clinical-submenu-gap); }`. This rule alone is harmless if no element carries the trigger class yet
- [ ] T010 From `C:/Workspace/DG_SE_DEV/ClinicOS/frontend` run `npm run build`; verify zero new TypeScript errors and zero new Vite warnings versus the Phase 1 baseline; halt the next phase if the build fails

**Checkpoint**: `ClinicalCard` exists, tokens declared, base CSS shipped. User-story phases can now begin in parallel.

---

## Phase 3: User Story 1 — L2 uniform across every Scheda Paziente sub-page (Priority: P1) 🎯 MVP

**Goal**: Every L2 row in the Scheda Paziente uses the exact same `<PageTabs>` instance from `NavComponents.tsx`. No sub-page renders its own bespoke L2 markup or local CSS override.

**Independent Test**: Open Panoramica, Clinica, Diario, Moduli, Documenti in turn at 1366×768. The L2 row at the top of each sub-page is visually identical — same height, same font, same underline-only active state — and the DevTools computed-style audit reports the same class set on every L2 button.

### Implementation for User Story 1

- [ ] T011 [US1] In `frontend/src/components/operator/PatientDetail.tsx` confirm the top-level L2 nav always uses `<PageTabs groups={...} activeId={...} onChange={...} />` from `frontend/src/components/shared/NavComponents.tsx`. Replace any sub-page-specific L2 markup (a literal `<nav class="page-tabs">` or any other tabs implementation) with the canonical component
- [ ] T012 [US1] In `frontend/src/components/operator/PatientDetail.tsx` scan every L2 button label and confirm it is Italian and matches the spec set (Panoramica, Clinica, Diario, Moduli, Documenti). Do not rename; only verify
- [ ] T013 [P] [US1] In `frontend/src/app-additions.css` delete every selector that introduces a `border`, `border-radius > 0`, filled `background-color`, or non-zero `box-shadow` on `.page-tabs__btn` or `.page-tabs__btn--active`. Annotate each *retained* override (if any) with a single-line comment naming the FR it preserves
- [ ] T014 [P] [US1] In `frontend/src/app-additions.css` audit every `@media (max-width: …)` block that targets `.page-tabs*` and delete or rewrite rules that diverge from the canonical 12px padding / 14px font / 44px height
- [ ] T015 [US1] From `C:/Workspace/DG_SE_DEV/ClinicOS/frontend` run `npm run build`; zero-error / zero-new-warning gate same as T010
- [ ] T016 [US1] Manual QA per quickstart.md § "Per-page script" steps 1, 2, 9 at 1024×768 and 1366×768: confirm L2 row treatment is visually identical across all five sub-pages, no border/pill/shadow appears on any L2 tab, computed `outerHeight` is identical across all tabs. Record screenshots for the PR description

**Checkpoint**: US1 ships as the MVP. The Scheda Paziente L2 surface is uniform. Stop here if scope must be cut to a minimum slice.

---

## Phase 4: User Story 2 — Presa in Carico and Anamnesi share the same card model (Priority: P1)

**Goal**: Presa in Carico renders the four expected cards using `<ClinicalCard>`, and Anamnesi renders its existing fields through the same component so the two pages are siblings.

**Independent Test**: Open Presa in Carico → see four cards in order (Dati di ingresso, Condizioni iniziali, Valutazione funzionale, Documenti e firma); each collapses independently with one tap; each exposes a Modifica button. Open Anamnesi → same card shape, same controls, same rhythm. Side by side they read as the same kind of page.

### Implementation for User Story 2

- [ ] T017 [US2] In `frontend/src/components/operator/cartella/PresaInCaricoTab.tsx` refactor the page body to render exactly four `<ClinicalCard>` instances in this order: "Dati di ingresso", "Condizioni iniziali", "Valutazione funzionale", "Documenti e firma". Wire `onEdit` for each to the existing edit handler for that section (or to a `setEditing(<id>)` local state mirror of the Anamnesi pattern). Preserve all existing form / read-only content as the children slot of each card; do not rewrite the field rendering
- [ ] T018 [US2] In `frontend/src/components/operator/cartella/PresaInCaricoTab.tsx` preserve the existing flat blue section header above the card stack (FR-012). Do not add a second header inside the cards
- [ ] T019 [P] [US2] In `frontend/src/components/operator/PatientDetail.tsx` `renderAnamnesi()` (~line 1180) replace the inline card markup with `<ClinicalCard>` instances matching the existing field groupings (one card per logical group; preserve the existing Italian titles verbatim — do not invent new ones). Wire `onEdit` to the existing `setEditAnamnesi(true)` handler at the group level, or to a per-group editing flag if Anamnesi already supports it. Children remain the existing form / read-only content
- [ ] T020 [P] [US2] In `frontend/src/components/operator/PatientDetail.tsx` `renderAnamnesi()` preserve the existing flat blue section header above the card stack (FR-012)
- [ ] T021 [US2] From `C:/Workspace/DG_SE_DEV/ClinicOS/frontend` run `npm run build`; zero-error / zero-new-warning gate
- [ ] T022 [US2] Manual QA per quickstart.md § "Per-page script" steps 4, 5, 6 at 1024×768 and 1366×768: confirm Presa in Carico renders exactly the four spec'd cards in order, each card collapses/expands independently, each exposes a Modifica button; confirm Anamnesi uses the same card shape; record one side-by-side screenshot for the PR description

**Checkpoint**: US1 + US2 together deliver the two P1 pillars — uniform nav and section parity.

---

## Phase 5: User Story 3 — One breadcrumb per Scheda Paziente sub-page (Priority: P2)

**Goal**: Inside every Scheda Paziente sub-page, only the upper page-chrome breadcrumb is visible. Any in-content duplicate / back link / "Pazienti > Patient" repetition is removed.

**Independent Test**: Open every Scheda Paziente sub-page in turn at 1366×768. Each page shows exactly one breadcrumb element, and a DevTools `document.querySelectorAll('.breadcrumb, .crumb-trail, .back-link, .indietro').length` returns 1.

### Implementation for User Story 3

- [ ] T023 [US3] In `frontend/src/components/operator/PatientDetail.tsx` locate every render of an in-content breadcrumb path, `<a>Indietro</a>` / `<a>Back</a>` link, or a `Pazienti > Mario Rossi` mini-trail inside the content area. Delete each occurrence; do NOT delete the upper page-chrome breadcrumb (rendered by the page shell, not by sub-page render functions)
- [ ] T024 [P] [US3] In `frontend/src/components/operator/PatientCompactHeader.tsx` audit the JSX for any breadcrumb / back-link emission. If found, delete only that breadcrumb output; preserve the header otherwise (it stays per FR-001 / FR-012)
- [ ] T025 [P] [US3] In `frontend/src/app-additions.css` delete any selector explicitly styling an in-content `.breadcrumb`, `.crumb-trail`, `.back-link`, or `.indietro` element. Leave the canonical upper `.breadcrumb` rule (defined in App.css for the page chrome) untouched
- [ ] T026 [US3] From `C:/Workspace/DG_SE_DEV/ClinicOS/frontend` run `npm run build`; zero-error / zero-new-warning gate
- [ ] T027 [US3] Manual QA per quickstart.md step 1 at 1366×768: paste `document.querySelectorAll('.breadcrumb, .crumb-trail, .back-link, .indietro').length` into DevTools Console on each Scheda Paziente sub-page and confirm the result is `1` for every page. Record screenshots

**Checkpoint**: Breadcrumb duplication eliminated everywhere in the Scheda Paziente.

---

## Phase 6: User Story 4 — L3 categories coherent and subordinate (Priority: P2)

**Goal**: Panoramica / Profilo exposes exactly the four spec'd L3 categories in order (Anagrafica, Contatti, Contatto emergenza, Assegnazione clinica) using the canonical L3 surface, and every other sub-page with an L3 row uses the same family.

**Independent Test**: Open Panoramica / Profilo → confirm L3 surface lists Anagrafica → Contatti → Contatto emergenza → Assegnazione clinica in that exact order, rendered through the canonical `<SectionTabs>` from `NavComponents.tsx`. Open any other sub-page with an L3 row and confirm it uses the same component / token surface.

### Implementation for User Story 4

- [ ] T028 [US4] In `frontend/src/components/operator/PatientDetail.tsx` (Profilo / Panoramica render block) ensure the L3 categories surface uses `<SectionTabs tabs={...} activeId={...} onChange={...} />` from `frontend/src/components/shared/NavComponents.tsx`. Replace any bespoke L3 markup at that call site with the canonical component
- [ ] T029 [US4] In `frontend/src/components/operator/PatientDetail.tsx` Profilo L3 definition ensure the tab order is exactly: `{ id: 'anagrafica', label: 'Anagrafica' }`, `{ id: 'contatti', label: 'Contatti' }`, `{ id: 'emergenza', label: 'Contatto emergenza' }`, `{ id: 'assegnazione', label: 'Assegnazione clinica' }`. Reorder existing entries if they are out of order; do not invent new ids unless the underlying data layer already supports them
- [ ] T030 [P] [US4] Audit every L3 call site in `frontend/src/components/operator/PatientDetail.tsx` and `frontend/src/components/operator/cartella/*.tsx` (`grep -rn "section-tabs\|SectionTabs\|<SectionTabs" frontend/src/components/operator/`). For any call site that does not use the canonical `<SectionTabs>` component, convert it
- [ ] T031 [US4] From `C:/Workspace/DG_SE_DEV/ClinicOS/frontend` run `npm run build`; zero-error / zero-new-warning gate
- [ ] T032 [US4] Manual QA per quickstart.md step 3 at 1024×768 and 1366×768: confirm Profilo L3 order matches the spec; open every other sub-page with an L3 row and confirm the same component / treatment renders

**Checkpoint**: L3 information architecture is consistent. P2 work complete.

---

## Phase 7: User Story 5 — Terapia Farmacologica sub-menu spacing matches Parametri Vitali (Priority: P3)

**Goal**: The vertical gap between section title and L3 sub-menu on Terapia Farmacologica matches the same gap on Parametri Vitali to within 2 px.

**Independent Test**: Open both pages side by side at 1024×768. Measure the gap with DevTools ruler on both; difference ≤ 2 px.

### Implementation for User Story 5

- [ ] T033 [US5] In `frontend/src/components/operator/cartella/ParametriTab.tsx` ensure the section title is wrapped in a node carrying the `clinical-section-title` class (per data-model.md § "CSS Modifications") and is the immediate sibling of the `.section-tabs` / sub-menu element. If the title already carries the right class and adjacency, this is a no-op
- [ ] T034 [P] [US5] In `frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx` apply the same `.clinical-section-title` wrapper to the section title and ensure the `.section-tabs` / sub-menu is its immediate sibling. The token-driven rule from T009 will then take effect on both pages and equalise the gap
- [ ] T035 [US5] From `C:/Workspace/DG_SE_DEV/ClinicOS/frontend` run `npm run build`; zero-error / zero-new-warning gate
- [ ] T036 [US5] Manual QA at 1024×768: with DevTools ruler measure the title→sub-menu gap on Terapia Farmacologica and Parametri Vitali; record both values and confirm they differ by ≤ 2 px (SC-008)

**Checkpoint**: Terapia Farmacologica spacing is fixed.

---

## Phase 8: User Story 6 — Badge counters audited and coherent (Priority: P3)

**Goal**: Every L2 / L3 badge in the Scheda Paziente either matches a defined visible count or is removed.

**Independent Test**: Open every page that exposes an L2 / L3 badge. For each badge, document the count it represents and verify it equals the number of relevant items visible inside the tab. Any badge that fails this check is removed by this feature.

### Implementation for User Story 6

- [ ] T037 [US6] Build an inventory of every L2 / L3 badge currently rendered by running `grep -rn "badge=" frontend/src/components/operator/PatientDetail.tsx` and `grep -rn "badge" frontend/src/components/operator/cartella/`. Compile a markdown table at `specs/010-patient-section-coherence/badge-audit.md` with columns: file:line, badge source value, intended count meaning, visible-content match (yes/no/unknown)
- [ ] T038 [US6] For every badge marked "no" or "unknown" in the audit, delete the `badge` prop at the call site in the relevant file (typically `frontend/src/components/operator/PatientDetail.tsx`). Do NOT stub with `badge={0}` — the prop must be omitted entirely so the next reader cannot mistake it for a temporary hide
- [ ] T039 [P] [US6] For every badge that survives the audit, add a single-line comment above its call site naming the count (e.g. `// badge = number of unread diario entries in last 24h`)
- [ ] T040 [US6] In `frontend/src/components/shared/NavComponents.tsx` verify the badge cap rule (`> 99` renders `'99+'`). If the cap is missing, add it inside the existing badge render (e.g. `{(g.badge ?? 0) > 99 ? '99+' : g.badge}`); preserve all other badge behaviour
- [ ] T041 [US6] From `C:/Workspace/DG_SE_DEV/ClinicOS/frontend` run `npm run build`; zero-error / zero-new-warning gate
- [ ] T042 [US6] Manual QA per quickstart.md step 10: for every surviving badge, open the corresponding tab and confirm the count matches; confirm no removed badge has reappeared

**Checkpoint**: Badge surface is trustworthy. All P3 work complete.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening, evidence capture, and clean handoff.

- [ ] T043 Full viewport sweep per quickstart.md § "Manual QA Matrix" at all four viewports (1024×768, 1180×820, 1366×768, 1920×1080): run the overflow audit script in DevTools at each viewport and confirm zero output rows. Capture one screenshot per viewport for the PR description
- [ ] T044 [P] Reduced-motion verification per quickstart.md step 11: enable `prefers-reduced-motion: reduce` in DevTools Rendering panel; switch L2/L3 tabs and collapse cards on Presa in Carico — confirm zero animation; confirm the rule list inside `@media (prefers-reduced-motion: reduce)` in `frontend/src/App.css` covers `.clinical-card__content`
- [ ] T045 [P] Constitution re-check: open `.specify/memory/constitution.md` and verify nothing in this feature contradicts Principles I, II, IV, V, VI; record a one-line confirmation per principle in the PR description
- [ ] T046 [P] Grep `frontend/src/**/*.{ts,tsx,css}` for `console.log(`, `// TODO`, and `// FIXME` introduced by this branch (compare against `main`). Remove any left-behind debug code per Constitution VI before the final build
- [ ] T047 Final `npm run build` from `C:/Workspace/DG_SE_DEV/ClinicOS/frontend`; verify zero TS errors, zero new Vite warnings, and a gzipped CSS bundle delta < 2 kB versus the Phase 1 baseline recorded in T002
- [ ] T048 Commit on branch `010-patient-section-coherence` with the message `feat: patient section coherence (010)`; do NOT amend prior commits and do NOT skip hooks

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Phase 1; blocks every user-story phase.
- **US1 (Phase 3, P1)**: depends on Phase 2. MVP — can ship alone (uniform L2 surface).
- **US2 (Phase 4, P1)**: depends on Phase 2 only. Visually composes with US1 but the card refactor is independent of L2 uniformity.
- **US3 (Phase 5, P2)**: depends on Phase 2 only; independent of US1 / US2.
- **US4 (Phase 6, P2)**: depends on Phase 2 only; touches the L3 surface but does not conflict with US1's L2 work.
- **US5 (Phase 7, P3)**: depends on Phase 2 (specifically T009's spacing rule). Independent of all other stories.
- **US6 (Phase 8, P3)**: depends on Phase 2 only; independent of all other stories.
- **Polish (Phase 9)**: depends on every shipped user story.

### Within Each User Story

- CSS base rules before component refactors.
- Component edits before manual QA.
- Per-story `npm run build` gate before the next story begins (avoid stacking unverified changes).
- US2 internal ordering: edit `PresaInCaricoTab.tsx` first (smaller, more contained), then `PatientDetail.tsx renderAnamnesi()` (larger file, higher review cost).

### Parallel Opportunities

- T003 ‖ T004 in Setup.
- T009 ‖ T005–T008 within Foundational (different selectors, same file but additive).
- T013 ‖ T014 ‖ T011 within US1.
- T019 ‖ T020 within US2 (both in `PatientDetail.tsx` `renderAnamnesi()`, but the markup change and the header preservation are reviewable as one logical edit — coordinate via a single PR comment).
- T024 ‖ T025 within US3.
- T030 ‖ T028/T029 within US4.
- T033 ‖ T034 within US5.
- T039 ‖ T037/T038 within US6.
- T044 ‖ T045 ‖ T046 within Polish.

---

## Parallel Example: User Stories after Phase 2

```bash
# After Foundational lands, three developers can work in parallel:
Developer A: US1  -> uniform L2 across sub-pages
Developer B: US2  -> ClinicalCard refactor of Anamnesi + Presa in Carico
Developer C: US3 + US6  -> breadcrumb dedup + badge audit (small, low-blast-radius edits)

# US4 / US5 land afterwards in any order.
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2) → slim Phase 9 → commit and demo.
2. Ship the two P1 stories together: uniform L2 surface + card-model parity. This is the highest-value subset and addresses 90% of the visible defects.

### Incremental Delivery

1. Setup + Foundational ready → `ClinicalCard` + tokens enforced.
2. US1 → demo: L2 uniform.
3. US2 → demo: card parity.
4. US3 → demo: breadcrumb dedup.
5. US4 → demo: L3 categories.
6. US5 → demo: Terapia spacing fixed.
7. US6 → demo: badges trustworthy.
8. Polish → PR ready with screenshots, badge-audit doc, constitution check, clean build.

### Parallel Team Strategy

Two or three developers can land US1, US2, and US3+US6 in parallel after Phase 2. US4 / US5 are best owned by whoever already touched `PatientDetail.tsx` to avoid merge churn on the largest file. The badge audit (US6) and breadcrumb dedup (US3) are surgical and low-blast-radius — good "second hand" work for a developer who finishes US1 early.

---

## Notes

- [P] = different file, no dependency on an incomplete task.
- [Story] = US1…US6 maps each story task back to its acceptance scenarios in spec.md.
- This is a presentation refinement plus one small shared component (`ClinicalCard`). No new dependencies are added.
- No backend, Prisma, API, or `VITE_API_URL` change at any point (FR-020 / Constitution IV).
- L1 `TeamsLikeSidebar` is not touched at any point (FR-001).
- Test tasks are intentionally absent: the spec did not request automated tests; validation is design-quality + manual QA + build gate.
- Commit after each user story checkpoint if scope might be cut, so an in-progress branch always represents a shippable increment.
