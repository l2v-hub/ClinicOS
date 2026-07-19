# Implementation Plan: Clean Navigation Layout

**Branch**: `007-clean-nav-layout` | **Date**: 2026-05-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-clean-nav-layout/spec.md`

---

## Summary

Refactor the ClinicOS frontend into a clean 3-level navigation hierarchy: compact L1 sidebar rail (64px wide, Teams-style), dominant L2 horizontal tabs (44px, filled active state), lightweight L3 pills (28px), and a compact patient header (≤56px). All changes are frontend-only (CSS + component extraction). No backend, Prisma, API, or `VITE_API_URL` changes. Implementation targets tablet 1024x768 as primary viewport, extending to 1180x820 and 1366x1024.

---

## Technical Context

**Language/Version**: TypeScript ~6.0.2 + React 19.2.5

**Primary Dependencies**: Vite 8, ESLint (no UI library — pure CSS, no new npm packages)

**Storage**: N/A — frontend-only layout change

**Testing**: Manual browser QA at 4 viewports (1024x768, 1180x820, 1366x1024, 1440x900) + `npm run build`

**Target Platform**: Tablet-first web SPA, Chromium browser

**Project Type**: Web SPA (Vite + React, single `frontend/` workspace)

**Performance Goals**: Tab switch ≤100ms perceived; no layout shift on navigation

**Constraints**: No new npm dependencies; no backend changes; no Prisma changes; TypeScript strict compile; existing CSS design tokens (`--navy`, `--blue`, `--bg`, `--surface`) must be preserved

**Scale/Scope**: 2 new component files, 2 refactored components, 3 CSS file updates, 6 priority pages verified

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                   | Status  | Notes                                                                                                                                                  |
| --------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I. Simplicity First         | ✅ PASS | 2 new files only; no heavy UI framework; components stay small and single-purpose; no premature abstractions                                           |
| II. Healthcare UX           | ✅ PASS | Italian labels maintained; tablet-first (1024px+) improved; expandable cards unaffected; ClinicalTable untouched; unified card design system preserved |
| III. Backend Data Authority | ✅ PASS | No clinical data moved to local state; no mock data introduced; API calls unchanged                                                                    |
| IV. Schema & API Stability  | ✅ PASS | No Prisma schema changes; no backend routes touched; `/patients` API untouched                                                                         |
| V. Role-Aware Development   | ✅ PASS | `TeamsLikeSidebar` receives `utente` prop and filters nav items by role; admin/operator separation preserved                                           |
| VI. Integration Integrity   | ✅ PASS | TypeScript must compile; lint must pass; existing functionality unchanged — verified by build + manual QA                                              |
| VII. Environment Safety     | ✅ PASS | No environment variables modified; no deployment config changed                                                                                        |

**Gate result**: All 7 principles pass. No Complexity Tracking violations.

---

## Project Structure

### Documentation (this feature)

```text
specs/003-clean-nav-layout/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output — all decisions resolved
├── data-model.md        # Phase 1 output — component interfaces
├── quickstart.md        # Phase 1 output — dev + QA guide
├── contracts/
│   └── ui-components.md # Phase 1 output — component contracts
└── checklists/
    └── requirements.md  # Spec quality checklist (all pass)
```

### Source Code (repository root)

```text
frontend/src/
├── App.tsx                                ← MODIFY: replace inline sidebar, simplify topbar
├── App.css                                ← MODIFY: nav-rail→teams-sidebar, tab hierarchy sizing
├── app-additions.css                      ← MODIFY: patient header compact, content margin
├── components/
│   ├── shared/
│   │   ├── NavComponents.tsx              ← MODIFY: rename+restyle PageTabs→MainHorizontalNav,
│   │   │                                             SectionTabs→ContextSubTabs
│   │   └── TeamsLikeSidebar.tsx           ← NEW: extracted L1 sidebar component
│   └── operator/
│       ├── PatientDetail.tsx              ← MODIFY: use PatientCompactHeader, updated nav imports
│       └── PatientCompactHeader.tsx       ← NEW: compact patient identity header
```

**Structure Decision**: Single frontend workspace (`frontend/`). No new workspace or monorepo split. Option 1 (single project) with frontend-only scope.

---

## Phase 0: Research

See [research.md](research.md) for full findings. Key decisions:

1. **Shell**: Refactor App.tsx in-place; extract only sidebar to `TeamsLikeSidebar.tsx`
2. **Components**: 2 new files, 2 refactors, 3 CSS updates (no file creations)
3. **CSS**: Extend existing `App.css` + `app-additions.css` with new classes alongside old (backward-compat transition)
4. **Nav hierarchy**: L2 44px filled-tab style, L3 28px pills — all via CSS token overrides
5. **Breadcrumb removal**: topbar drops breadcrumb text, shrinks to ~36px single-row
6. **Dependencies**: zero new npm packages

---

## Phase 1: Design

### Component Interfaces

See [data-model.md](data-model.md) for full prop interfaces. Summary:

- `TeamsLikeSidebar`: props `{activeKey, utente, onNavigate, onLogout, unreadNotes?}`
- `PatientCompactHeader`: props `{paziente, cartella, onBack}`
- `MainHorizontalNav`: same interface as current `PageTabs` (rename only)
- `ContextSubTabs`: same interface as current `SectionTabs` (rename + restyle)

### UI Contracts

See [contracts/ui-components.md](contracts/ui-components.md). Migration path: backward-compat aliases (`export { MainHorizontalNav as PageTabs }`) so non-updated callers keep working during incremental migration.

### Layout Budget

```
1024x768 tablet:
├── Sidebar: 64px wide (fixed left)
└── Right column: 960px wide
    ├── Compact topbar: 36px
    ├── PatientCompactHeader: 56px
    ├── MainHorizontalNav (L2): 44px
    ├── ContextSubTabs (L3): 36px
    └── ContentPanel: 596px  (≥65% of 768px = ✓ SC-002)
```

### CSS Token Changes

```css
/* App.css additions */
.teams-sidebar {
  width: 64px;
  background: var(--navy);
}
.teams-sidebar__item {
  height: 56px; /* 44px touch target + padding */
}
.teams-sidebar__item.active {
  border-left: 3px solid var(--blue);
}

.compact-topbar {
  height: 36px; /* was ~48px */
}

.main-h-nav {
  height: 44px;
  background: var(--surface);
}
.main-h-nav__tab.active {
  background: var(--blue);
  color: #fff;
}

/* app-additions.css additions */
.context-sub-tabs {
  padding: 6px 12px;
}
.context-sub-tabs__pill {
  height: 28px;
  border-radius: 14px;
  font-size: 11.5px;
}
.context-sub-tabs__pill.active {
  background: var(--blue);
  color: #fff;
}

.patient-compact-header {
  height: 56px;
  padding: 0 12px;
}
```

---

## Implementation Order

Tasks are ordered by dependency. Each task is independently deployable and testable.

### T1 — CSS Foundation (no component changes)

**Goal**: Apply new sizing tokens to existing components so layout proportions are visible before component extraction.
**Files**: `App.css`, `app-additions.css`
**Test**: `npm run build` passes; sidebar fits 64px; tabs look larger.

### T2 — TeamsLikeSidebar component

**Goal**: Extract sidebar from App.tsx into `TeamsLikeSidebar.tsx`. App.tsx wires `<TeamsLikeSidebar>` replacing the inline block.
**Files**: `TeamsLikeSidebar.tsx` (new), `App.tsx` (import + usage)
**Test**: Sidebar renders identically at all resolutions; role-based items correct; badge count correct; logout works.

### T3 — Compact topbar

**Goal**: Remove breadcrumb element from topbar in App.tsx. Apply `.compact-topbar` class.
**Files**: `App.tsx`
**Test**: Topbar is single row, ~36px height; search button functional.

### T4 — MainHorizontalNav + ContextSubTabs

**Goal**: Rename `PageTabs`→`MainHorizontalNav` and `SectionTabs`→`ContextSubTabs` in NavComponents.tsx with new CSS classes. Add backward-compat aliases.
**Files**: `NavComponents.tsx`
**Test**: PatientDetail.tsx renders with new styles without import changes (aliases work); L2 tabs are 44px; L3 pills are 28px.

### T5 — PatientCompactHeader component

**Goal**: Extract patient header from PatientDetail.tsx into `PatientCompactHeader.tsx`. Apply compact layout with name/MRN/age/sex/room/allergy.
**Files**: `PatientCompactHeader.tsx` (new), `PatientDetail.tsx` (import + usage)
**Test**: Header ≤56px; back button works; allergy badge shows if allergie.length > 0; long names truncate.

### T6 — Content margin reduction

**Goal**: Reduce top padding in content sections; bring first clinical card closer to nav.
**Files**: `app-additions.css` (section padding), `App.css` (`.page-content` padding-top)
**Test**: First card visible without scroll on 1024x768 after header+nav stack.

### T7 — QA pass at all viewports

**Goal**: Full manual QA checklist from quickstart.md at 1024x768, 1180x820, 1366x1024, desktop.
**Test**: All items in quickstart.md QA checklist pass; `npm run build` clean.

---

## Complexity Tracking

No Constitution violations. Table not required.
