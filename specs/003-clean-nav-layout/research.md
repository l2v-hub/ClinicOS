# Research: Clean Navigation Layout

**Feature**: 003-clean-nav-layout  
**Date**: 2026-05-24  
**Status**: Complete — all NEEDS CLARIFICATION resolved

---

## Decision 1: Shell Extraction Strategy

**Decision**: Refactor App.tsx in-place rather than extracting a new `CleanAppShell` file.

**Rationale**: App.tsx manages authentication, routing, patient state, and API calls. Extracting a wrapper would require threading props through a new component layer with no functional benefit. The user's `CleanAppShell` name maps to a CSS class restructuring (`.clean-shell`) and a `TeamsLikeSidebar` component extraction, not a full file split.

**Alternatives considered**:

- Full extraction into `CleanAppShell.tsx` — rejected: premature abstraction, large diff, risk of breaking auth/state wiring (Constitution I: Simplicity First).
- Keep App.tsx entirely inline — rejected: sidebar JSX is large enough to warrant its own component for maintainability.

---

## Decision 2: Component Scope (7 named components)

**Decision**: Map the 7 user-requested components to concrete implementation actions:

| User Request           | Implementation                                                                                   | Action             |
| ---------------------- | ------------------------------------------------------------------------------------------------ | ------------------ |
| `CleanAppShell`        | CSS class `.clean-shell` on `.app-shell` + layout token changes                                  | CSS update         |
| `TeamsLikeSidebar`     | New `components/shared/TeamsLikeSidebar.tsx` extracted from App.tsx inline sidebar JSX           | New file           |
| `CompactPageHeader`    | Eliminate `.topbar` breadcrumb duplication; fold into single-line compact header                 | CSS + App.tsx edit |
| `PatientCompactHeader` | New `components/operator/PatientCompactHeader.tsx` extracted from PatientDetail.tsx header block | New file           |
| `MainHorizontalNav`    | Rename + restyle existing `PageTabs` in NavComponents.tsx                                        | Refactor           |
| `ContextSubTabs`       | Rename + restyle existing `SectionTabs` in NavComponents.tsx as pills                            | Refactor           |
| `ContentPanel`         | CSS class `.content-panel` on existing `.page-content` wrapper — no new component                | CSS update         |

**Rationale**: Minimal new files. Maximum reuse of existing component structure. Constitution I compliance.

---

## Decision 3: CSS Architecture for 3-Level Nav

**Decision**: Extend existing CSS token system in `App.css` and `app-additions.css`. Do not create a new CSS file.

**Sizing targets (from spec FR-001 through FR-005):**

| Element                           | Current (est.) | Target                |
| --------------------------------- | -------------- | --------------------- |
| `.nav-rail` width                 | ~72-80px       | 64px                  |
| Patient header height             | ~80-100px      | ≤56px                 |
| L2 nav (MainHorizontalNav) height | ~36px          | 44px (touch-friendly) |
| L3 nav (ContextSubTabs) height    | ~28px          | 28px pills            |
| Total nav vertical budget         | ~200px+        | ≤160px                |

**Active state tokens:**

- L1 sidebar active: white icon + left accent border `var(--blue)` on dark `var(--navy)` background
- L2 active: filled background `var(--blue)` + white text + no bottom border (elevated tab style)
- L3 active: `var(--blue)` text + subtle underline or `var(--accent-bg)` pill background

**Rationale**: Reuses existing `--navy`, `--blue`, `--accent-bg`, `--bg` tokens. Ensures visual consistency with existing components (Constitution II: unified card design system).

---

## Decision 4: PatientDetail Navigation Rename

**Decision**: Keep existing tab IDs and logic in PatientDetail.tsx. Only rename the component references from `PageTabs`→`MainHorizontalNav` and `SectionTabs`→`ContextSubTabs`. Tab structure (5 groups × up to 6 sub-tabs) stays identical.

**L2 tabs confirmed**: Panoramica, Clinica, Diario, Moduli, Documenti (spec says "Terapia" and "Parametri" — these map to sub-tabs under "Clinica"; the L2 stays as-is from Feature 002)

**Rationale**: Changing tab IDs would break cartella state management. Renaming components is safe. The user's L2 examples are the clinical sections, which are already L3 in the current structure — no navigation restructuring needed, only visual hierarchy.

---

## Decision 5: Breadcrumb/Back Button Elimination

**Decision**: Remove the `.topbar__breadcrumb` text and back-button from the topbar. Replace with a compact single-line topbar showing only: search button (right). Patient context is in `PatientCompactHeader`.

**Rationale**: The breadcrumb duplicates information already visible in the sidebar active state and patient header. Removing it saves ~36px vertical space (topbar height reduction from ~48px to ~36px). The back navigation remains via sidebar click (Pazienti item).

**Alternatives considered**:

- Keep breadcrumb, reduce font — saves less space, still duplicates info.
- Move breadcrumb into patient header — header is already dense at ≤56px.

---

## Decision 6: No New npm Dependencies

**Decision**: Use only existing CSS and React. No new icon library, animation library, or UI kit.

**Rationale**: Constitution I + Constitution VI. `icons.tsx` already provides all needed icons (IcoDashboard, IcoPazienti, IcoCalendar, IcoConsegne, IcoCartelle, IcoMessage). No gaps.

---

## Resolved Clarifications

All 16 functional requirements from spec.md are fully addressable with existing stack. No NEEDS CLARIFICATION items remain.
