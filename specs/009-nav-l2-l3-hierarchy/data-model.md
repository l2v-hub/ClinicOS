# Phase 1: CSS Design Model — Navigation L2 & L3 Hierarchy

**Feature**: 009-nav-l2-l3-hierarchy | **Date**: 2026-06-02

This feature introduces no backend data entities and no new TypeScript interfaces. The "data model" for a presentational refinement is the design-system model: which design tokens are enforced, which CSS classes change, and which optional component contracts apply.

---

## CSS Design Tokens (`:root` in `App.css`)

### Tokens this feature enforces (must exist with these values)

| Token | Value | Used by |
|-------|-------|---------|
| `--l2-h` | `44px` | L2 tab height — also touch-target floor (FR-010) |
| `--l3-h` | `32px` | L3 tab height — also touch-target floor (FR-011) |
| `--l2-font` | `14px` | L2 label size |
| `--l3-font` | `11.5px` | L3 label size |
| `--tab-transition-duration` | `180ms` | Underline animation + content fade/slide |
| `--tab-transition-easing` | `ease-out` | Same |
| `--l2-underline-h` | `2px` | L2 active underline thickness |
| `--l3-underline-h` | `1px` | L3 active underline thickness — **new in this feature** |
| `--l2-underline-color` | `var(--primary, var(--blue, #1A56DB))` | L2 active color — reuses existing token (FR-013) |
| `--l3-underline-color` | `color-mix(in srgb, var(--primary, #1A56DB) 70%, transparent)` | L3 active color — **new in this feature** |
| `--content-px` | `16px` | Tablet content-area horizontal padding |
| `--content-px-lg` | `24px` | Large tablet (≥1180px) padding |
| `--content-px-xl` | `32px` | Desktop (≥1366px) padding |

### Tokens this feature **does not** introduce

- No new color tokens.
- No new typography family tokens.
- No new spacing scale.

---

## CSS Classes — Modifications

### `.page-tabs` (L2) — `App.css` + `app-additions.css`

| Property | Rule |
|----------|------|
| `display` | `flex` |
| `flex-wrap` | `nowrap` |
| `gap` | `4px` |
| `width` | `100%` (full content width, FR-007) |
| `overflow-x` | `auto` |
| `scrollbar-width` | `thin` |
| `border-bottom` | `1px solid var(--border-subtle)` — visual baseline for the underline |
| `padding-bottom` | `0` (underline sits on the row baseline) |

### `.page-tabs__btn` (L2 tab) — `App.css`

| Property | Rule |
|----------|------|
| `position` | `relative` (anchors the `::after` underline) |
| `height` | `var(--l2-h)` |
| `font-size` | `var(--l2-font)` |
| `font-weight` | `500` |
| `padding` | `0 12px` |
| `border` | `none` |
| `background` | `transparent` |
| `border-radius` | `0` (no pill) |
| `box-shadow` | `none` (FR-003) |
| `cursor` | `pointer` |
| `transition` | `color var(--tab-transition-duration) var(--tab-transition-easing)` |

### `.page-tabs__btn::after` — L2 underline

| Property | Rule |
|----------|------|
| `content` | `''` |
| `position` | `absolute` |
| `left` / `bottom` | `0` / `0` |
| `width` | `0` (collapsed by default) |
| `height` | `var(--l2-underline-h)` |
| `background` | `var(--l2-underline-color)` |
| `transition` | `width var(--tab-transition-duration) var(--tab-transition-easing)` |

### `.page-tabs__btn--active::after`

`width: 100%` — drives the animated reveal of the underline.

### `.section-tabs` (L3) — `App.css` + `app-additions.css`

Same shape as `.page-tabs` with two differences:

- `scrollbar-width: none` and `::-webkit-scrollbar { display: none }` (hidden scrollbar — FR-008).
- No `border-bottom` baseline (sub-nav is intentionally lighter).

### `.section-tabs__btn` (L3 tab)

| Property | Rule | Difference vs L2 |
|----------|------|------------------|
| `height` | `var(--l3-h)` | smaller |
| `font-size` | `var(--l3-font)` | smaller |
| `letter-spacing` | `0.2px` | slight tracking for small text |
| `padding` | `0 8px` | tighter horizontal |

### `.section-tabs__btn::after` — L3 underline

| Property | Rule | Difference vs L2 |
|----------|------|------------------|
| `height` | `var(--l3-underline-h)` | thinner (1px vs 2px) |
| `background` | `var(--l3-underline-color)` | reduced-opacity primary |

### `.section-tabs__btn--active::after`

`width: 100%` — same animated reveal.

---

## CSS Classes — `.tab-panel-transition`

Already shipped in 007. This feature **must not regress** it. Definition recap:

```css
.tab-panel-transition {
  animation: tabPanelEnter var(--tab-transition-duration) var(--tab-transition-easing) both;
}
@keyframes tabPanelEnter {
  from { opacity: 0; transform: translateX(8px); }
  to   { opacity: 1; transform: translateX(0); }
}
@media (prefers-reduced-motion: reduce) {
  .tab-panel-transition,
  .page-tabs__btn::after,
  .section-tabs__btn::after,
  .page-tabs__btn,
  .section-tabs__btn {
    animation: none !important;
    transition: none !important;
  }
}
```

Applied by `PatientDetail.tsx` to the tab content wrapper via a `ref` + `useEffect` that removes and re-adds the class on `[activeGroup, tab]` change. **This pattern stays; do not refactor to `key={...}`** (research R-4).

---

## Media Query Blocks

```css
/* Large tablet */
@media (min-width: 1180px) {
  .page-content { padding: 12px var(--content-px-lg) 16px; }
}

/* Desktop */
@media (min-width: 1366px) {
  .page-content { padding: 16px var(--content-px-xl) 20px; }
}
```

Already shipped in 007. This feature audits them and leaves them intact.

---

## Component Contracts (Optional — see Research R-6)

These contracts are documented here for the case where component consolidation crosses the threshold of three call sites. **Do not create these components in this feature** unless that threshold is exceeded during implementation.

### `<NavigationTabsBase>` (hypothetical)

| Prop | Type | Purpose |
|------|------|---------|
| `level` | `'l2' \| 'l3'` | Drives variant class (`.page-tabs` vs `.section-tabs`) |
| `items` | `Array<{ id: string; label: string; disabled?: boolean }>` | Tab definitions |
| `activeId` | `string` | Currently active tab id |
| `onChange` | `(id: string) => void` | Tab-click handler |
| `aria-label` | `string` | Required for a11y |

### `<PrimaryTopNavigation>` / `<SecondaryTopNavigation>` (hypothetical)

Thin wrappers that call `<NavigationTabsBase level="l2">` / `level="l3"`. Exist only to make call sites self-documenting.

---

## Files Modified by This Feature (summary)

| File | Change Type | Notes |
|------|-------------|-------|
| `frontend/src/App.css` | Enforce tokens, refine `.page-tabs` / `.section-tabs` base rules, add `--l3-underline-h` / `--l3-underline-color` |
| `frontend/src/app-additions.css` | Enforce overrides for clinical-record nav band |
| `frontend/src/index.css` | Audit only — verify no `#root` width clamp regression |
| `frontend/src/components/operator/PatientDetail.tsx` | Confirm L2/L3 markup uses the canonical classes; do not change JSX shape; keep ref-based transition |
| `frontend/src/components/shared/NavComponents.tsx` | Touch only if active-state class wiring is wrong — no new components added in this feature |

No TypeScript interfaces, no new React components, no new npm packages.
