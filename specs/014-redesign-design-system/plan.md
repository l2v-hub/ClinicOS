# Implementation Plan: Redesign Design System & Layout

**Branch**: `014-redesign-design-system` | **Date**: 2026-06-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/014-redesign-design-system/spec.md`
**Visual source of truth**: `.claude/design-reference/CLINICOS_VISUAL_AUDIT.md`

## Summary

Consolidate ClinicOS's presentation layer into a single coherent design system driven by
shared components and medical-blue design tokens. The codebase already ships partial shared
components (specs 004/009/013): an L2/L3 nav module, an expandable `ClinicalCard`, a sortable/
filterable `ClinicalTable`, a `PageHeader`, and a navy sidebar. This feature **finishes the
consolidation**: refines tokens to the audited palette, widens/clarifies the sidebar, makes
every priority page render nav/tables/cards through the shared components, removes the Diario's
custom chips in favor of the shared L3 sub-nav, migrates the straggler tables (PatientList,
RoomsManagement, OperatorManagement) onto `ClinicalTable`, and enforces full-width responsive
layout with no global horizontal overflow. No backend, Prisma, or `/patients` changes.

## Technical Context

**Language/Version**: TypeScript ~6.0 (target es2023), React 19, Vite 8
**Primary Dependencies**: react, react-dom (no UI framework — pure CSS); tesseract.js (unrelated)
**Storage**: N/A for this feature (presentation layer only; data via existing backend API)
**Testing**: No formal FE test runner; verification via `npm run build` (`tsc -b && vite build`) + manual viewport QA
**Target Platform**: Web SPA, desktop ≥1366px and tablet 1024×768 / 1180×820 (tablet-first per constitution)
**Project Type**: Web application (frontend + backend; this feature touches frontend only)
**Performance Goals**: No regression; CSS transitions ≤200ms; no layout thrash on nav switch
**Constraints**: No new heavy UI framework; minimal diff; no global horizontal scrollbar; keep `tsc` clean
**Scale/Scope**: 5 shared component areas + 9 priority pages; ~15 files touched, CSS token block + targeted CSS

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Note |
|-----------|--------|------|
| I. Simplicity First | ✅ PASS | Consolidation reduces variants; no new framework; reuse existing shared components. |
| II. Healthcare UX | ✅ PASS (this feature serves it) | Expandable cards kept; Italian UI preserved; tablet-first; single `ClinicalTable`; unified card system. |
| III. Backend Data Authority | ✅ PASS | Presentation only; no data moved into local state; no mock data introduced. |
| IV. Schema & API Stability | ✅ PASS | No Prisma/Express/route changes; `/patients` untouched; no destructive DB commands. |
| V. Role-Aware Development | ✅ PASS | Existing operator/manager nav generation preserved; no reload on role switch. |
| VI. Integration Integrity | ✅ PASS | `tsc` must stay clean; lint resolved; `/patients` integration preserved; build gate enforced. |
| VII. Environment Safety | ✅ PASS | No env/secret changes. |

**Naming reconciliation**: Spec/user text says `ClinicalDataTable`; constitution mandates the
single `ClinicalTable`. **Decision: `ClinicalTable` is the canonical shared table** (already exists,
constitution-named). No rename — avoids import churn (Simplicity). The two names refer to the same component.

No violations → Complexity Tracking table omitted.

## Project Structure

### Documentation (this feature)

```text
specs/014-redesign-design-system/
├── plan.md              # This file
├── research.md          # Phase 0: decisions (sidebar, naming, full-width, Diario)
├── data-model.md        # Phase 1: component prop contracts & token set
├── quickstart.md        # Phase 1: how to apply shared components + QA steps
├── contracts/
│   └── components.md     # Phase 1: shared component prop contracts (UI contracts)
└── checklists/
    └── requirements.md   # Spec quality checklist (done)
```

### Source Code (repository root) — files this feature touches

```text
frontend/src/
├── App.css                                   # Design tokens block + global nav/table/card CSS
├── app-additions.css                         # Diario chips, agenda/rooms/operator table CSS
├── App.tsx                                    # Shell: sidebar width var, main-area gutters, full-width
├── components/shared/
│   ├── TeamsLikeSidebar.tsx                   # L1: widen 64→80px, icon+label, clearer active
│   ├── NavComponents.tsx                      # L2 MainHorizontalNav + L3 ContextSubTabs (canonical)
│   ├── PageHeader.tsx                         # Header: no breadcrumb/title duplication
│   ├── ClinicalCard.tsx                       # Canonical card (kept; verify focus/edit affordance)
│   └── PageShell.tsx                          # NEW (thin): standard content wrapper + gutters
├── components/operator/cartella/
│   ├── ClinicalTable.tsx                      # Canonical table (kept; ensure full API)
│   ├── DiarioPazienteTab.tsx                  # Remove custom author chips → shared L3 sub-nav
│   ├── ParametriTab.tsx                        # Use ClinicalTable + ClinicalCard
│   ├── TerapiaFarmacologicaTab.tsx            # Use ClinicalTable + status badges
│   └── DocumentiTab.tsx                        # Use ClinicalTable
├── components/operator/
│   ├── PatientDetail.tsx                       # L2/L3 via shared nav; full-width
│   ├── PatientList.tsx                         # Migrate .clinicos-table → ClinicalTable
│   └── OperatorAgenda.tsx                      # View switcher via shared nav; full-width
└── components/admin/
    ├── RoomsManagement.tsx                     # Migrate table → ClinicalTable
    └── OperatorManagement.tsx                  # Migrate table → ClinicalTable
```

**Structure Decision**: Existing `frontend/src` React-SPA structure is kept. Shared components
live in `components/shared/` (sidebar, nav, header, card, new PageShell) plus the canonical
`ClinicalTable` in `components/operator/cartella/`. The work is consolidation + token refinement,
not restructuring. CSS stays as global `App.css` + `app-additions.css` (no CSS-module migration —
out of scope, Simplicity).
