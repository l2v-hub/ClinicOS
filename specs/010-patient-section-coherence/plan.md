# Implementation Plan: Patient Card Navigation Uniformity & Clinical Section Layout Parity

**Branch**: `010-patient-section-coherence` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-patient-section-coherence/spec.md`

## Summary

Enforce the canonical L2 / L3 surface that feature `009-nav-l2-l3-hierarchy` already shipped across every Scheda Paziente sub-page, eliminate the duplicate breadcrumb inside the content area, bring Presa in Carico to parity with Anamnesi using a single small shared collapsible card wrapper, fix the Terapia Farmacologica title-to-sub-menu spacing so it matches Parametri Vitali, and audit every L2 / L3 badge so each one corresponds to a defined visible count. CSS-first work supported by a single new lightweight component. No backend, Prisma, API, or `VITE_API_URL` changes.

## Technical Context

**Language/Version**: TypeScript 6 (frontend), React 19, Vite 8

**Primary Dependencies**: React 19, React DOM 19, Vite 8, plain CSS. No new packages.

**Storage**: N/A — frontend-only presentation refinement; no persisted state changes.

**Testing**: Manual visual QA against the spec acceptance scenarios on the four reference viewports (1024 × 768, 1180 × 820, 1366 × 768, 1920 × 1080); automated guardrails = `tsc -b` + `vite build` (`npm run build`) zero-error / zero-new-warning delta.

**Target Platform**: Tablet (1024px+) and desktop (1366px+) browsers — Chrome / Edge primary, Safari secondary. Touch + mouse input. Italian UI locale.

**Project Type**: Web application (monorepo: `frontend/` + `backend/`). This feature touches only `frontend/`.

**Performance Goals**: Card expand / collapse transition ≤ 200ms (same budget as 009's tab transition). No added bundle weight > 2 kB gzipped (the new `ClinicalCard` wrapper plus rule pruning typically nets out flat).

**Constraints**:
- Zero global horizontal overflow at any supported viewport.
- L2 touch targets ≥ 44px, L3 ≥ 32px (already enforced by 009's tokens — this feature preserves them).
- `prefers-reduced-motion: reduce` honored for every transition added by this feature (card expand / collapse).
- Reuse existing design tokens; no new color introduced.
- Italian UI labels preserved verbatim.
- No backend / Prisma / API / `VITE_API_URL` changes.
- L1 `TeamsLikeSidebar` untouched.

**Scale/Scope**: Five Scheda Paziente L2 sub-pages (Panoramica, Clinica, Diario, Moduli, Documenti) and ~10 sub-sections rendered inside them. Two existing sub-pages (Anamnesi, Presa in Carico) are restructured around a shared card wrapper. Two existing sub-pages (Terapia Farmacologica, Parametri Vitali) are touched only for spacing. Edit surface = `frontend/src/components/operator/PatientDetail.tsx` (the render functions), `frontend/src/components/operator/cartella/PresaInCaricoTab.tsx`, `frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx`, `frontend/src/components/operator/cartella/ParametriTab.tsx`, a new `frontend/src/components/shared/ClinicalCard.tsx`, plus `frontend/src/App.css` and `frontend/src/app-additions.css`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Simplicity First | PASS | One new small component (`ClinicalCard`) is introduced because Anamnesi and Presa in Carico need identical collapse + edit behaviour — duplication threshold (≥ 2 call sites and ≥ 3 if Profilo is migrated later) is met. No other abstraction is added. |
| II | Healthcare UX | PASS | Italian labels preserved (FR-022). Tablet-first viewport (1024px+) baseline. No tooltip-as-primary-UX. Existing flat blue section header preserved (FR-012). Card design system extended without ad-hoc styling — single shared wrapper enforces it. ClinicalTable component untouched. |
| III | Backend Data Authority | N/A — no clinical data lifecycle change. Card-level Modifica wires to existing edit flows already persisted via the backend; no clinical data moves to local-only state. |
| IV | Schema & API Stability | PASS | FR-020 forbids backend / Prisma / API / `VITE_API_URL` changes. `/patients` integration preserved. |
| V | Role-Aware Development | PASS | Card surface and L2 / L3 uniformity are role-agnostic; L1 sidebar (which carries role-aware items) is untouched. |
| VI | Integration Integrity | PASS | `npm run build` must succeed with zero new TS / build errors (FR-021 / SC-011). All existing nav routes and the Anamnesi edit flow keep working. |
| VII | Environment Safety | N/A — no env or deployment changes. |

**Result**: GATE PASS. No violations; Complexity Tracking table left empty.

## Project Structure

### Documentation (this feature)

```text
specs/010-patient-section-coherence/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (resolved decisions)
├── data-model.md        # Phase 1 output (CSS tokens, classes, ClinicalCard contract)
├── quickstart.md        # Phase 1 output (dev + 4-viewport QA matrix)
├── contracts/           # Phase 1 output (ClinicalCard component contract)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created here)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── App.css                                       # ENFORCE 009 tokens; add card tokens; audit any stray L2/L3 overrides
│   ├── app-additions.css                             # Prune duplicate-breadcrumb rule; remove stray L2 overrides on sub-pages
│   ├── components/
│   │   ├── shared/
│   │   │   ├── ClinicalCard.tsx                      # NEW — small shared collapsible-card wrapper with Modifica slot
│   │   │   ├── NavComponents.tsx                     # READ-ONLY — 009 canonical L2/L3 already in place
│   │   │   └── TeamsLikeSidebar.tsx                  # READ-ONLY (FR-001)
│   │   ├── operator/
│   │   │   ├── PatientDetail.tsx                     # EDIT — remove duplicate breadcrumb in render functions; pass uniform L2 props; convert renderAnamnesi to use ClinicalCard; tighten badge wiring
│   │   │   ├── PatientCompactHeader.tsx              # AUDIT — confirm it does not emit a second breadcrumb path
│   │   │   └── cartella/
│   │   │       ├── PresaInCaricoTab.tsx              # EDIT — refactor to use ClinicalCard × 4 (Dati di ingresso, Condizioni iniziali, Valutazione funzionale, Documenti e firma)
│   │   │       ├── TerapiaFarmacologicaTab.tsx       # EDIT — fix title-to-sub-menu spacing to match Parametri
│   │   │       ├── ParametriTab.tsx                  # READ-ONLY (reference spacing); audit current badge logic
│   │   │       └── shared.tsx                        # READ-ONLY unless it carries the existing inline-edit primitive that ClinicalCard reuses

backend/                                              # UNTOUCHED (constitution IV)
prisma/                                               # UNTOUCHED (constitution IV)
```

**Structure Decision**: Web application monorepo. This feature touches only `frontend/`. The single new file is `frontend/src/components/shared/ClinicalCard.tsx` — a small wrapper, not a framework. CSS changes are concentrated in `App.css` (canonical card tokens) and `app-additions.css` (override pruning). The render-function-level changes in `PatientDetail.tsx` are surgical: remove a duplicate breadcrumb path inside the content area, route Anamnesi through `ClinicalCard`, and ensure the L2 row at the top of the Scheda Paziente always uses the canonical `<PageTabs>` from `NavComponents.tsx`.

## Complexity Tracking

> Constitution Check passes with no violations. Table intentionally left empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _none_    | _n/a_      | _n/a_                                |
