# Phase 1: Design Model — Patient Card Navigation Uniformity & Clinical Section Layout Parity

**Feature**: 010-patient-section-coherence | **Date**: 2026-06-02

No backend data entities. No new TypeScript interfaces tied to clinical data. The design model here is the CSS-token + component-prop contract.

---

## CSS Design Tokens (`:root` in `App.css`)

### Tokens this feature enforces (already shipped by 009)

| Token | Value | Used by |
|-------|-------|---------|
| `--l2-h` / `--l3-h` | `44px` / `32px` | L2 / L3 tab height |
| `--l2-font` / `--l3-font` | `14px` / `11.5px` | L2 / L3 label size |
| `--l2-underline-h` / `--l3-underline-h` | `2px` / `1px` | active underline thickness |
| `--l2-underline-color` / `--l3-underline-color` | `var(--primary)` / `color-mix(...)` | active underline color |
| `--tab-transition-duration` | `180ms` | reused for card motion |
| `--tab-transition-easing` | `ease-out` | reused for card motion |
| `--content-px` / `--content-px-lg` / `--content-px-xl` | `16/24/32px` | page-content horizontal padding |

### Tokens this feature **adds**

| Token | Value | Used by |
|-------|-------|---------|
| `--clinical-submenu-gap` | `16px` | vertical gap between a section title and its L3 sub-menu — applied on Terapia Farmacologica and Parametri Vitali (R-6) |
| `--card-header-h` | `40px` | height of `.clinical-card__header` |
| `--card-padding-x` | `16px` | horizontal padding of card content |
| `--card-padding-y` | `12px` | vertical padding of card content |
| `--card-radius` | `8px` | corner radius |
| `--card-border` | `1px solid var(--border-subtle)` | hairline border around the card body |
| `--card-bg` | `var(--surface, #fff)` | card background |
| `--card-shadow` | `0 1px 2px rgba(0,0,0,0.04)` | subtle elevation, no heavy shadow |

### Tokens this feature **does not** introduce

- No new color tokens. `--card-header-tint` is intentionally absent — the card header is a light strip, not a coloured band.

---

## New CSS Classes — `.clinical-card*` (App.css)

| Selector | Purpose |
|----------|---------|
| `.clinical-card` | Card container — `display: flex; flex-direction: column; border: var(--card-border); border-radius: var(--card-radius); background: var(--card-bg); box-shadow: var(--card-shadow); box-sizing: border-box; overflow: hidden;` |
| `.clinical-card + .clinical-card` | `margin-top: 12px;` — vertical rhythm between stacked cards |
| `.clinical-card__header` | `height: var(--card-header-h); display: flex; align-items: center; justify-content: space-between; padding: 0 var(--card-padding-x); cursor: pointer;` |
| `.clinical-card__title` | `font-weight: 600; font-size: 14px; color: var(--text-strong);` |
| `.clinical-card__actions` | `display: inline-flex; align-items: center; gap: 8px;` — wraps the collapse-toggle and Modifica button |
| `.clinical-card__toggle` | The collapse caret — `width: 24px; height: 24px; border: none; background: transparent;` rotates 180° when collapsed |
| `.clinical-card__edit` | Modifica button — re-uses `.btn-link` look (no new variant) |
| `.clinical-card__content` | `overflow: hidden; transition: height var(--tab-transition-duration) var(--tab-transition-easing); padding: 0 var(--card-padding-x);` (padding-y applied inside an inner div so collapse animates clean) |
| `.clinical-card--collapsed > .clinical-card__content` | `height: 0;` |
| `.clinical-card--collapsed .clinical-card__toggle` | rotated icon |

### Reduced-motion extension to the 009 block

```css
@media (prefers-reduced-motion: reduce) {
  /* existing 009 block extended */
  .clinical-card__content { transition: none !important; }
}
```

---

## CSS Modifications — Sub-Menu Spacing

```css
.clinical-section-title + .section-tabs,
.clinical-section-title + .section-sub-menu {
  margin-top: var(--clinical-submenu-gap);
}
```

Applied at the wrapper inside `ParametriTab.tsx` and `TerapiaFarmacologicaTab.tsx`. The selector is intentionally narrow (immediate sibling of the section title) so other L3 surfaces are not affected.

---

## CSS Pruning — `app-additions.css`

| Selector | Action | Reason |
|----------|--------|--------|
| Any per-page L2 override re-introducing `border`, `box-shadow`, or `background` on `.page-tabs__btn` | **DELETE** | violates 009 / FR-003 |
| In-content `.breadcrumb` selectors that visually duplicate the upper breadcrumb | **DELETE** | FR-007 |
| Per-page card / collapse rules that don't go through `.clinical-card*` | **DELETE or rewrite to use `.clinical-card`** | FR-009 / FR-010 |
| The defensive `.page-tabs, .section-tabs { max-width: 100%; box-sizing: border-box; }` | **KEEP** | FR-017 |
| `@media print { .page-tabs, .section-tabs { display: none !important; } }` | **KEEP** | unaffected |

Every kept override carries a single-line comment naming the FR it preserves.

---

## Component Contract — `<ClinicalCard>`

File: `frontend/src/components/shared/ClinicalCard.tsx`

```ts
export interface ClinicalCardProps {
  title: string;                          // displayed in .clinical-card__title
  defaultExpanded?: boolean;              // default: true
  expanded?: boolean;                     // optional controlled flag
  onToggle?: (next: boolean) => void;     // fired on header click / Enter key
  onEdit?: () => void;                    // wires the Modifica button
  editLabel?: string;                     // default: 'Modifica'
  className?: string;                     // additional class for the card root
  children: React.ReactNode;              // content slot
}
```

### Behavioural contract

| Behaviour | Rule |
|-----------|------|
| Header click | toggles expanded state; if `onToggle` is provided, calls it with the next state and skips internal state update when `expanded` is controlled |
| Enter / Space on header | same as click (keyboard a11y) |
| Modifica click | calls `onEdit`; if `onEdit` is not provided, the button is **not rendered** |
| `aria-expanded` | mirrors expanded state on the header |
| `role="region"` + `aria-labelledby` | applied so screen readers announce the card as a landmark |
| Italian default labels | `editLabel` defaults to `'Modifica'`; consumer can override |

### Example usage (PresaInCaricoTab)

```tsx
<>
  <ClinicalCard title="Dati di ingresso" onEdit={() => setEditingId('dati')}>
    {/* form or read-only view */}
  </ClinicalCard>
  <ClinicalCard title="Condizioni iniziali" onEdit={() => setEditingId('cond')}>...</ClinicalCard>
  <ClinicalCard title="Valutazione funzionale" onEdit={() => setEditingId('valutazione')}>...</ClinicalCard>
  <ClinicalCard title="Documenti e firma" onEdit={() => setEditingId('docs')}>...</ClinicalCard>
</>
```

---

## Badge Audit Contract

For every L2 / L3 badge that survives the audit:

| Field | Rule |
|-------|------|
| Source | one named, locally-visible variable |
| Meaning | matches a count visible inside the tab once opened (FR-014) |
| Zero | not rendered (already handled by 009's `(badge ?? 0) > 0` guard) |
| Capped | values > 99 render `'99+'` (FR-016) |
| Documentation | a single-line comment above the badge prop names the count |

Removed badges have their `badge` prop deleted from the call site — not stubbed with `0`, not left in via conditional — so the next reader cannot mistake them for "temporarily hidden".

---

## Files Modified by This Feature (summary)

| File | Change Type | Notes |
|------|-------------|-------|
| `frontend/src/components/shared/ClinicalCard.tsx` | NEW | Small wrapper, ≤ 80 lines target |
| `frontend/src/App.css` | EDIT | Add `--clinical-*` / `--card-*` tokens, `.clinical-card*` rules, extend reduced-motion block |
| `frontend/src/app-additions.css` | EDIT | Prune duplicate-breadcrumb and per-page L2 overrides; annotate retained overrides |
| `frontend/src/components/operator/PatientDetail.tsx` | EDIT | Route `renderAnamnesi()` through `<ClinicalCard>`; remove in-content breadcrumbs; tighten badge wiring |
| `frontend/src/components/operator/cartella/PresaInCaricoTab.tsx` | EDIT | Refactor into 4 × `<ClinicalCard>` |
| `frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx` | EDIT | Apply `--clinical-submenu-gap` token |
| `frontend/src/components/operator/cartella/ParametriTab.tsx` | EDIT | Same token applied as reference baseline |
| `frontend/src/components/shared/NavComponents.tsx` | READ-ONLY | 009 canonical L2 / L3; unchanged |
| `frontend/src/components/shared/TeamsLikeSidebar.tsx` | READ-ONLY | L1 untouched (FR-001) |

No backend, no Prisma, no API, no env changes.
