# Phase 0: Research — Clean Navigation Layout

**Feature**: 007-clean-nav-layout | **Date**: 2026-05-24

## CSS Target Files

- **Decision**: Make changes primarily in `App.css`. Use `app-additions.css` only to fix overrides that conflict with new layout rules. Do not create a new CSS file.
- **Rationale**: `App.css` is the authoritative design system (3431 lines, all layout vars and nav classes live there). Adding a third CSS file for layout rules would create split-brain between the two existing files and require extra import ordering care. `app-additions.css` is used for clinical record overrides — touching it only where it overrides layout classes keeps the diff minimal.
- **Alternatives considered**: A new `007-layout.css` file (rejected: import order matters in Vite; easy to introduce cascade conflicts; violates Simplicity First principle).

## Breakpoint Strategy

- **Decision**: Extend existing breakpoints by adding two new `@media (min-width)` blocks for 1180px and 1366px. Leave the existing `max-width: 1023px` mobile block untouched.
- **Rationale**: The current file uses only `max-width` media queries (mobile-first-inverted). Adding `min-width` queries for 1180px and 1366px avoids touching mobile rules and is additive. This matches the tablet-first requirement (1024px baseline is already the default non-mobile state).
- **Alternatives considered**: Refactoring all breakpoints to pure mobile-first `min-width` order (rejected: high risk of regression across 3431-line file; out of scope for this feature).

## L2 Navigation Visual Style (Underline Animation)

- **Decision**: Use a CSS `::after` pseudo-element on `.main-h-nav .nav-tab.active` with `width: 100%` transition from `width: 0`. Remove background-fill and pill/box-shadow from the active state.
- **Rationale**: Pure CSS approach — no JS measurement needed, no ResizeObserver, no refs. The `::after` element is `position: absolute` at the bottom of the tab item, transitioning `width` from 0 to 100% on the `.active` class. Duration set to 180ms `ease-out`. This is the simplest CSS-only underline animation that works with class-toggling.
- **Alternatives considered**: `transform: scaleX()` sliding indicator spanning the full nav bar (rejected: requires JS to measure tab positions and move a single shared element — more complex, touches NavComponents.tsx more deeply). CSS custom property animation (rejected: overkill for this use case).

## Tab Content Transition

- **Decision**: CSS class-based approach with React state. The content wrapper gets class `tab-panel-transition`. On tab change, add `is-entering` to incoming content which animates `opacity` 0→1 and `transform: translateX(8px)→translateX(0)`. Use a short `setTimeout` to sequence the class change after React re-renders. Duration: 180ms.
- **Rationale**: Avoids the complexity of `react-transition-group` or `framer-motion`. A simple `is-entering` class applied for one frame then removed is sufficient for a subtle fade+slide. No outgoing animation needed (content is replaced immediately — the incoming animation is enough to feel smooth). This keeps the React component change minimal (one state flag or `key` prop technique).
- **Alternatives considered**: CSS `@starting-style` (rejected: limited browser support as of 2026, not yet safe for all targets). `react-transition-group` (rejected: new dependency, violates no-new-deps constraint). `animation` keyframe on the wrapper with a `key` prop to reset (viable alternative — simpler than setTimeout, may be preferred in implementation).

## L3 Pill Horizontal Scroll

- **Decision**: Add `overflow-x: auto` to the `.context-sub-tabs` container. Hide the scrollbar with `-ms-overflow-style: none`, `scrollbar-width: none`, and `&::-webkit-scrollbar { display: none }`. Ensure `white-space: nowrap` on the container so pills stay on one line.
- **Rationale**: No JS needed. The native scroll behavior on touch (tablet) works out of the box. Hiding the scrollbar is standard practice for horizontal pill nav — the pills being cut off at the edge signals scrollability.
- **Alternatives considered**: Arrow buttons to scroll left/right (rejected: too complex, requires JS, YAGNI). `scroll-snap` alignment (rejected: not needed for navigation pills, adds complexity).

## Index.css `#root` Width

- **Decision**: Override `#root` width in `App.css` to ensure it does not impose a max-width. Current `index.css` sets `width: 1126px` on `#root` — this must be overridden with `width: 100%; max-width: none` in `App.css` (or directly in `index.css`).
- **Rationale**: The `index.css` `#root { width: 1126px }` is the root cause of dead lateral space at desktop widths. The cleanest fix is to edit `index.css` directly since it is the base reset file and owns `#root` styles.
- **Alternatives considered**: Override in `App.css` (acceptable but adds specificity fight). Edit `.app-shell` to break out of `#root` width (rejected: hacky, relies on negative margins).
