# Phase 1: CSS Design Model — Clean Navigation Layout

**Feature**: 007-clean-nav-layout | **Date**: 2026-05-24

This feature has no new data entities, backend models, or TypeScript interfaces. The "data model" for a CSS/layout feature is the design system model: which CSS variables change, which classes are added, and which are modified.

---

## CSS Variables — Modifications

File: `frontend/src/App.css`

| Variable          | Current Value | New Value | Reason                                         |
| ----------------- | ------------- | --------- | ---------------------------------------------- |
| `--l2-h`          | `44px`        | `44px`    | Keep — already touch-friendly                  |
| `--l2-font`       | `14px`        | `14px`    | Keep — already correct                         |
| `--l3-h`          | `36px`        | `32px`    | Slightly more compact on tablet                |
| `--l3-font`       | `11.5px`      | `11.5px`  | Keep                                           |
| `--content-px`    | _(new)_       | `16px`    | Tablet horizontal padding for `.content-panel` |
| `--content-px-lg` | _(new)_       | `24px`    | Large tablet (1180px+) padding                 |
| `--content-px-xl` | _(new)_       | `32px`    | Desktop (1366px+) padding                      |

---

## CSS Variables — Additions

File: `frontend/src/App.css` (add to `:root`)

```css
--tab-transition-duration: 180ms;
--tab-transition-easing: ease-out;
--l2-underline-color: var(--primary, #2563eb);
--l2-underline-h: 2px;
```

---

## Classes — Modifications

### `.app-shell` (App.css)

Current: applies `display: flex; height: 100vh; overflow: hidden`
Change: ensure no `max-width` is set; confirm `width: 100%`

### `.main-area-clean` (App.css)

Current: `margin-left: var(--sidebar-w); flex: 1; overflow-y: auto`
Change: add `min-width: 0` to prevent flex child from overflowing its container

### `.content-panel` (App.css)

Current: `padding: 12px 16px 16px`
Change: use CSS variable `var(--content-px)` for horizontal padding; add responsive overrides at 1180px and 1366px breakpoints

### `.main-h-nav` (App.css) — L2 Navigation

Current: border/box styling on active tab
Changes:

- Remove `border`, `border-radius`, `box-shadow` from `.main-h-nav .nav-tab.active`
- Remove background fill from active state
- Add `position: relative` to `.main-h-nav .nav-tab`
- Add `::after` pseudo-element for underline (see below)
- Add hover state: `background: rgba(0,0,0,0.04)` with `border-radius: 4px`

### `.context-sub-tabs` (App.css) — L3 Navigation

Current: flex container, pills
Changes:

- Add `overflow-x: auto`
- Add `white-space: nowrap`
- Add scrollbar hiding rules
- Active pill: reduce contrast slightly (lighter background, keep pill shape)

### `#root` (index.css)

Current: `width: 1126px` (suspected — verify before edit)
Change: `width: 100%; max-width: none`

---

## New CSS Classes

### `.tab-panel-transition` (App.css)

Applied to the tab content wrapper in `PatientDetail.tsx`.

```css
.tab-panel-transition {
  animation: tabPanelEnter var(--tab-transition-duration) var(--tab-transition-easing) both;
}

@keyframes tabPanelEnter {
  from {
    opacity: 0;
    transform: translateX(8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tab-panel-transition {
    animation: none;
  }
}
```

Implementation note: apply this class by changing the `key` prop on the wrapper element when the active tab changes. React will unmount/remount the element, triggering the CSS animation from scratch. This is the simplest approach — no `setTimeout`, no extra state.

### L2 Underline `::after` (App.css)

```css
.main-h-nav .nav-tab {
  position: relative;
}

.main-h-nav .nav-tab::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: var(--l2-underline-h, 2px);
  background: var(--l2-underline-color, #2563eb);
  transition: width var(--tab-transition-duration, 180ms) var(--tab-transition-easing, ease-out);
}

.main-h-nav .nav-tab.active::after {
  width: 100%;
}
```

---

## New Media Query Blocks

File: `frontend/src/App.css`

```css
/* Large tablet: 1180px–1365px */
@media (min-width: 1180px) {
  .content-panel {
    padding: 12px var(--content-px-lg, 24px) 16px;
  }
}

/* Desktop: 1366px+ */
@media (min-width: 1366px) {
  .content-panel {
    padding: 16px var(--content-px-xl, 32px) 20px;
  }
}
```

---

## Files to Modify (summary)

| File                                                 | Change Type                                               |
| ---------------------------------------------------- | --------------------------------------------------------- |
| `frontend/src/index.css`                             | Fix `#root` width                                         |
| `frontend/src/App.css`                               | CSS vars, L2/L3 nav, breakpoints, `.tab-panel-transition` |
| `frontend/src/app-additions.css`                     | Fix any conflicting overrides (audit only, minimal edits) |
| `frontend/src/components/operator/PatientDetail.tsx` | Add `key` prop to tab content wrapper for transition      |

No new TypeScript interfaces. No new React components. No new npm packages.
