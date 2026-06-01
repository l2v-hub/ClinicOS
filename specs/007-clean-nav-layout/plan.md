# Implementation Plan: Clean Navigation Layout

**Branch**: `007-clean-nav-layout` | **Date**: 2026-05-24 | **Spec**: [specs/007-clean-nav-layout/spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-clean-nav-layout/spec.md`

## Summary

Frontend-only CSS/layout refactor targeting tablet-first (1024px+) and desktop (>=1366px) viewports. Fixes dead lateral space caused by `#root { width: 1126px }` in `index.css`, introduces fluid content padding via new CSS variables and `min-width` breakpoints, converts L2 navigation from pill/border style to animated underline (`::after` pseudo-element, 180ms), keeps L3 as compact scrollable pills with hidden scrollbar, and adds a `tab-panel-transition` CSS animation triggered via React `key` prop for smooth tab content changes. No backend, schema, or dependency changes.

## Technical Context

**Language/Version**: TypeScript 5.x + React 18 + Vite 5

**Primary Dependencies**: React 18, existing App.css design system (no new packages)

**Storage**: N/A

**Testing**: Manual QA in browser DevTools (1024px, 1180px, 1366px, 1920px viewports) + `npm run build`

**Target Platform**: Web browser, tablet-first (1024px minimum)

**Project Type**: Web application — frontend CSS/layout feature

**Performance Goals**: Tab transitions ≤220ms, no layout thrash during animation

**Constraints**: No new npm packages, no backend changes, TypeScript compile clean, zero lint errors

**Scale/Scope**: 5 CSS requirement areas, 4 files touched (index.css, App.css, app-additions.css audit, PatientDetail.tsx)

## Constitution Check

| Principle | Gate | Status |
|-----------|------|--------|
| I. Simplicity First | No new npm deps, no new components, YAGNI | PASS — pure CSS + one `key` prop |
| II. Healthcare UX | Tablet-first, touch-friendly (44px L2 height), Italian UI unchanged | PASS |
| III. Backend Data Authority | No backend changes | PASS — N/A |
| IV. Schema & API Stability | No Prisma changes | PASS — N/A |
| V. Role-Aware | No role logic changed | PASS |
| VI. Integration Integrity | Must pass `npm run build` with zero TS/lint errors | GATE — verify after every edit |
| VII. Environment Safety | No env vars, no infra changes | PASS — N/A |

## Project Structure

### Documentation (this feature)

```text
specs/007-clean-nav-layout/
├── plan.md              ← this file
├── spec.md              ← feature spec
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output (CSS design model)
├── quickstart.md        ← Phase 1 output
└── tasks.md             ← Phase 2 output (speckit-tasks — not yet generated)
```

### Source Code

```text
frontend/src/
├── index.css                          ← fix #root width constraint
├── App.css                            ← main layout, L2/L3 nav, breakpoints, tab transitions
├── app-additions.css                  ← audit for conflicting overrides (minimal edits)
└── components/
    ├── shared/
    │   └── NavComponents.tsx          ← read-only audit (MainHorizontalNav, ContextSubTabs)
    └── operator/
        └── PatientDetail.tsx          ← add key prop to tab content wrapper
```

**Structure Decision**: Option 2 (Web application). All changes are frontend-only CSS with one minimal TypeScript touch-point.

## Complexity Tracking

No Constitution violations. Feature stays within simplicity bounds. No justification table needed.

## Implementation Phases

### Phase 0: Research (complete)
→ See [research.md](./research.md)

Key decisions:
- Target `App.css` as primary file; `index.css` for `#root` fix; `app-additions.css` audit only
- Extend breakpoints additively with `min-width` blocks (1180px, 1366px)
- L2 underline: CSS `::after` pseudo-element, `width` transition 180ms
- Tab transition: CSS `@keyframes tabPanelEnter` triggered via React `key` prop
- L3 scroll: `overflow-x: auto` + hidden scrollbar CSS

### Phase 1: Design (complete)
→ See [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

Key outputs:
- CSS variable additions: `--tab-transition-duration`, `--tab-transition-easing`, `--l2-underline-color`, `--l2-underline-h`, `--content-px`, `--content-px-lg`, `--content-px-xl`
- New class: `.tab-panel-transition` with `@keyframes tabPanelEnter`
- Modified classes: `.app-shell`, `.main-area-clean`, `.content-panel`, `.main-h-nav`, `.context-sub-tabs`
- `prefers-reduced-motion` handled via `@media` block on `.tab-panel-transition`

### Phase 2: Tasks
→ Run `/speckit-tasks` to generate `tasks.md`
