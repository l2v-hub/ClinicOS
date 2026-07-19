# Implementation Plan: Parametri Pazienti Compact Quick-Entry Layout

**Branch**: `011-parametri-quick-entry` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-parametri-quick-entry/spec.md`

## Summary

Recast `MultiPatientParametri.tsx` from a tall card-per-patient layout into a dense, list-style quick-entry surface. Each patient becomes one compact row with the six clinical fields (PA, FC, SpO2, TC, DTX, Evacuazione) inline. The `Ora rilevazione` and `Operatore` inputs are removed from the UI; both are populated automatically when the row is saved — `ora` from the client clock at save moment, `operatore` from the existing `operatoreNome` prop already passed by the page parent. Note rapide is no longer a default field; an opt-in "Note" affordance opens a per-row text area only when the operator needs it. CSS-first refinement plus a focused refactor of the existing `RigaPaziente` sub-component. No backend, Prisma, or `VITE_API_URL` change.

## Technical Context

**Language/Version**: TypeScript 6, React 19, Vite 8.

**Primary Dependencies**: React 19, React DOM 19, Vite 8, plain CSS. No new packages.

**Storage**: N/A — frontend-only refinement; the existing backend save path (`onUpdateCartella` → backend POST) is preserved exactly.

**Testing**: Manual stopwatch + DevTools matrix per `quickstart.md`; automated guardrails = `tsc -b` + `vite build` zero-error / zero-new-warning delta.

**Target Platform**: Tablet (1024 px+) and desktop (1366 px+). Italian UI.

**Project Type**: Web application monorepo. This feature touches only `frontend/`.

**Performance Goals**:

- Row at rest ≤ 56 px tall on 1024 × 768 (SC-002).
- At least 8 patient rows above the fold on the same viewport (SC-001).
- Median click-to-save ≤ 6 s for a 6-field row (SC-009).

**Constraints**:

- Zero global horizontal overflow at any supported viewport.
- Six inline fields must fit at 1024 px width (compress / abbreviate as needed — FR-013).
- Auto-`ora` and auto-`operatore` MUST be populated at the save moment, not at form-load (FR-005 / FR-006 / FR-016).
- Italian labels preserved (FR-017).
- No Prisma / `VITE_API_URL` change (FR-018 / FR-019).
- Backend change permitted only if strictly necessary for FR-005 / FR-006 (FR-020) — this plan keeps backend untouched (see research R-3).
- L1 sidebar (`TeamsLikeSidebar`) untouched.

**Scale/Scope**: Single page (`frontend/src/components/operator/MultiPatientParametri.tsx`, ~413 lines). One sub-component (`RigaPaziente`) refactored. CSS additions land in `App.css` or a small dedicated block; no new shared components.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Status                              | Notes                                                                                                                                                                                                                               |
| --- | ---------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | Simplicity First       | PASS                                | No new components added. `RigaPaziente` is refactored, not extracted further. No new deps. Auto-`ora` and auto-`operatore` are set at one save site — no helper abstraction needed.                                                 |
| II  | Healthcare UX          | PASS                                | Italian labels preserved (FR-017). Tablet-first ≥ 1024 px (SC-001 / FR-013). No tooltip-as-primary-UX. ClinicalTable component untouched. The compact row pattern explicitly favours scanability over decoration.                   |
| III | Backend Data Authority | PASS                                | `ora` and `operatore` are still persisted via the existing backend update endpoint. The only change is _who_ populates them inside the frontend (the save handler instead of the user). No clinical data moves to local-only state. |
| IV  | Schema & API Stability | PASS                                | Plan keeps backend / Prisma / API / `VITE_API_URL` untouched. The existing `onUpdateCartella` contract is preserved verbatim.                                                                                                       |
| V   | Role-Aware Development | PASS                                | Only the operator role uses this page. No role-aware logic is added or removed.                                                                                                                                                     |
| VI  | Integration Integrity  | PASS                                | `npm run build` must succeed with zero new TS / build errors (FR-021 / SC-010). All other Parametri call sites (`PatientDetail` → `ParametriTab`) keep working.                                                                     |
| VII | Environment Safety     | N/A — no env or deployment changes. |

**Result**: GATE PASS. No violations; Complexity Tracking table left empty.

## Project Structure

### Documentation (this feature)

```text
specs/011-parametri-quick-entry/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (5 decisions R-1..R-5)
├── data-model.md        # Phase 1 output (CSS tokens, classes, row state contract)
├── quickstart.md        # Phase 1 output (dev + 4-viewport QA matrix + click-to-save stopwatch)
├── contracts/           # Phase 1 output (RigaPaziente prop + save behaviour contract)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created here)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── App.css                                       # EDIT — new `.qe-row*` CSS rules + tokens; reduced-motion extension
│   ├── components/
│   │   └── operator/
│   │       ├── MultiPatientParametri.tsx             # EDIT — refactor RigaPaziente into compact row; remove Ora + Operatore inputs; add per-row note expansion; inject `ora` + `operatore` at save
│   │       └── PatientDetail.tsx                     # READ-ONLY — confirm no inline override of MultiPatientParametri call site

backend/                                              # UNTOUCHED (constitution IV, plan R-3)
prisma/                                               # UNTOUCHED
```

**Structure Decision**: Web app monorepo. The entire feature lands in two files: `App.css` (new `.qe-row*` rule block) and `MultiPatientParametri.tsx` (refactor of the `RigaPaziente` sub-component and the `rigaToParametroGiorno` mapping). No new components are introduced. The L1 sidebar and the L2 / L3 nav surfaces from features 009 / 010 are unchanged.

## Complexity Tracking

> Constitution Check passes with no violations. Table intentionally left empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| _none_    | _n/a_      | _n/a_                                |
