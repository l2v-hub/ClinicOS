# Implementation Plan: Navigation Level 2 & Level 3 Hierarchy Redesign

**Branch**: `009-nav-l2-l3-hierarchy` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-nav-l2-l3-hierarchy/spec.md`

## Summary

Refine the existing `.page-tabs` (Level 2) and `.section-tabs` (Level 3) navigation so the page-level menu reads as visually dominant while the sub-menu reads as a clearly subordinate sibling. This is a CSS-first refinement of styles already shipped in features 003 / 007 / 008; React structure stays put. Three optional shared wrappers (`PrimaryTopNavigation`, `SecondaryTopNavigation`, `NavigationTabsBase`) are introduced **only if** they remove existing duplication — never speculatively. The Level 1 Teams-style sidebar is untouched. No backend, Prisma, API, or `VITE_API_URL` changes.

## Technical Context

**Language/Version**: TypeScript 6 (frontend), React 19, Vite 8

**Primary Dependencies**: React 19, React DOM 19, Vite 8, plain CSS (no UI framework). `eslint-plugin-react-hooks`, `babel-plugin-react-compiler` already present.

**Storage**: N/A — frontend-only presentation refinement; no persisted state changes.

**Testing**: Manual visual QA against the spec acceptance scenarios on the four reference viewports (1024×768, 1180×820, 1366×768, 1920×1080); automated guardrails = `tsc -b` (via `npm run build`) and `vite build` zero-warnings delta.

**Target Platform**: Tablet (1024px+) and desktop (1366px+) browsers — Chrome / Edge as primary, Safari secondary. Touch + mouse input. Italian UI locale.

**Project Type**: Web application (monorepo: `frontend/` + `backend/`). This feature touches only `frontend/`.

**Performance Goals**: Tab-change content transition ≤ 200ms; first paint of redesigned tabs ≤ 100ms over existing baseline; no added bundle weight > 1 kB gzipped.

**Constraints**:

- Zero global horizontal overflow at any supported viewport.
- L2 touch targets ≥ 44px, L3 ≥ 32px.
- `prefers-reduced-motion: reduce` honored for every transition introduced.
- Reuse existing design tokens — no new color values introduced.
- Italian UI labels preserved verbatim.
- No backend / Prisma / API / `VITE_API_URL` changes (constitution IV).

**Scale/Scope**: ~5 page-level views with L2 nav; ~3 of those expose L3 sub-tabs. Edit surface is concentrated in `frontend/src/App.css`, `frontend/src/app-additions.css`, `frontend/src/index.css`, `frontend/src/components/shared/NavComponents.tsx`, and the L2/L3 call sites inside `frontend/src/components/operator/PatientDetail.tsx`. No new screens.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Status                                                                             | Notes                                                                                                                                                       |
| --- | ---------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | Simplicity First       | PASS                                                                               | CSS-first refinement; new shared components introduced only if they remove existing duplication. No new deps.                                               |
| II  | Healthcare UX          | PASS                                                                               | Italian labels preserved (FR-016). Tablet-first viewport (1024px+) is the explicit baseline. No tooltips introduced. ClinicalTable / card design untouched. |
| III | Backend Data Authority | N/A — frontend presentation only. No clinical data flow or state lifecycle change. |
| IV  | Schema & API Stability | PASS                                                                               | Explicit FR-014 forbids backend / Prisma / API / `VITE_API_URL` changes. `/patients` integration preserved.                                                 |
| V   | Role-Aware Development | PASS                                                                               | Nav-level styling is role-agnostic; L1 sidebar (which carries role-aware items) is explicitly untouched (FR-001).                                           |
| VI  | Integration Integrity  | PASS                                                                               | `npm run build` must succeed with zero new TS/build errors (FR-015 / SC-005). All existing nav routes keep working.                                         |
| VII | Environment Safety     | N/A — no env or deployment changes.                                                |

**Result**: GATE PASS. No violations; Complexity Tracking table left empty.

## Project Structure

### Documentation (this feature)

```text
specs/009-nav-l2-l3-hierarchy/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (resolved unknowns + tech decisions)
├── data-model.md        # Phase 1 output (CSS tokens, classes, component contracts)
├── quickstart.md        # Phase 1 output (how to dev / verify)
├── contracts/           # Phase 1 output (component prop contracts)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created here)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── App.tsx                                  # Layout shell — read-only; verify no inline overrides fight new nav rules
│   ├── App.css                                  # PRIMARY EDIT: L2/L3 base styles, tokens, breakpoints, transitions
│   ├── app-additions.css                        # PRIMARY EDIT: clinical-record overrides for L2/L3
│   ├── index.css                                # AUDIT: ensure no #root width clamp regression
│   ├── components/
│   │   ├── shared/
│   │   │   ├── NavComponents.tsx                # PRIMARY EDIT (optional): consolidate L2/L3 into reusable wrappers IF duplication exists
│   │   │   └── TeamsLikeSidebar.tsx             # READ-ONLY (L1 — must not change per FR-001)
│   │   └── operator/
│   │       ├── PatientDetail.tsx                # PRIMARY EDIT: L2/L3 markup call sites + ref-based tab-transition class re-trigger
│   │       ├── PatientCompactHeader.tsx         # READ-ONLY unless it co-renders a nav band
│   │       ├── OperatorAgenda.tsx               # AUDIT: confirm L2 styling propagates without regression
│   │       └── OperatorDashboard.tsx            # AUDIT: confirm L2 styling propagates without regression

backend/                                         # UNTOUCHED (constitution IV)
```

**Structure Decision**: Web application, monorepo. This feature touches only the `frontend/` workspace. Primary edits land in three CSS files plus the L2/L3 call sites in `PatientDetail.tsx`. The optional `NavComponents.tsx` consolidation is reserved for _after_ the visual rules are stable — done only if the same nav markup is repeated in ≥3 places (current count). Otherwise the existing inline structure is retained per Principle I (no premature abstraction).

## Complexity Tracking

> Constitution Check passes with no violations. Table intentionally left empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| _none_    | _n/a_      | _n/a_                                |
