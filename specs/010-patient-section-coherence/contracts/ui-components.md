# Contract: UI Component Surface — Patient Section Coherence

**Feature**: 010-patient-section-coherence | **Date**: 2026-06-02

This document freezes the prop / DOM / class contracts introduced or enforced by feature 010 so the implementation does not silently change anything callers depend on.

---

## `<ClinicalCard>` — NEW

### Location

`frontend/src/components/shared/ClinicalCard.tsx`

### Props

```ts
export interface ClinicalCardProps {
  title: string;
  defaultExpanded?: boolean; // default: true
  expanded?: boolean; // controlled flag (uncontrolled if absent)
  onToggle?: (next: boolean) => void;
  onEdit?: () => void; // Modifica button visible only if provided
  editLabel?: string; // default: 'Modifica'
  className?: string;
  children: React.ReactNode;
}
```

### Rendered DOM

```html
<section
  class="clinical-card [class.clinical-card--collapsed]"
  role="region"
  aria-labelledby="cc-{id}"
>
  <header class="clinical-card__header" tabindex="0" aria-expanded="true|false">
    <h3 id="cc-{id}" class="clinical-card__title">{title}</h3>
    <div class="clinical-card__actions">
      <button class="clinical-card__edit btn-link" type="button">{editLabel}</button>
      <button class="clinical-card__toggle" type="button" aria-label="Espandi / Comprimi">
        <svg>...</svg>
      </button>
    </div>
  </header>
  <div class="clinical-card__content">
    <div class="clinical-card__content-inner">{children}</div>
  </div>
</section>
```

### Behavioural contract

| Behaviour                  | Rule                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| Header click               | toggles expanded state                                                                              |
| Enter / Space on header    | same as click (keyboard a11y)                                                                       |
| `expanded` controlled mode | when prop is supplied, internal state is ignored; `onToggle` is called with the next value          |
| `onEdit` absent            | Modifica button is NOT rendered                                                                     |
| Collapse animation         | height 0 ↔ scrollHeight via `--card-content-h`; respects `prefers-reduced-motion`                   |
| Italian labels             | `editLabel` defaults to `'Modifica'`; toggle button `aria-label` defaults to `'Espandi / Comprimi'` |

---

## Canonical L2 / L3 — UNCHANGED from 009

This feature does NOT re-shape the L2 / L3 component surface. The `<PageTabs>` and `<SectionTabs>` (exports from `frontend/src/components/shared/NavComponents.tsx`) remain authoritative.

| Concern                                                               | Source of truth                                                 |
| --------------------------------------------------------------------- | --------------------------------------------------------------- |
| `.page-tabs` / `.page-tabs__btn` / `.page-tabs__btn--active`          | feature 009 / App.css                                           |
| `.section-tabs` / `.section-tabs__btn` / `.section-tabs__btn--active` | feature 009 / App.css                                           |
| Aria contract (`role="tablist"`, `role="tab"`, Italian `aria-label`)  | feature 009 / NavComponents.tsx                                 |
| Reduced-motion behaviour                                              | feature 009 / App.css `@media (prefers-reduced-motion: reduce)` |

Feature 010 enforces these — it does not redefine them.

---

## Breadcrumb Contract

Exactly one breadcrumb element is allowed per Scheda Paziente sub-page. It is the **upper page-chrome breadcrumb** (rendered by the page shell, not by sub-page components).

| Selector                                                                                             | Rule                             |
| ---------------------------------------------------------------------------------------------------- | -------------------------------- |
| `.breadcrumb` (upper)                                                                                | KEEP — page-chrome single source |
| Any `.breadcrumb`, `.crumb-trail`, `.back-link`, `.indietro` rendered inside `<main>` / content area | REMOVE                           |

Verification: page-tree audit must return exactly one breadcrumb element per Scheda Paziente sub-page (SC-006).

---

## Sub-Menu Spacing Contract

| Selector                                                          | Rule                                                              |
| ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| `.clinical-section-title + .section-tabs` (immediate sibling)     | `margin-top: var(--clinical-submenu-gap)`                         |
| `.clinical-section-title + .section-sub-menu` (immediate sibling) | same rule (fallback for sub-menus that don't use `.section-tabs`) |

Applied to Parametri Vitali (reference baseline) and Terapia Farmacologica (corrective target). FR-013 / SC-008.

---

## Badge Contract

For each L2 / L3 tab that exposes a `badge` prop:

| Field              | Rule                                                                           |
| ------------------ | ------------------------------------------------------------------------------ |
| `badge` value      | a defined, locally-visible number that matches a count rendered inside the tab |
| 0                  | not rendered (handled by `(badge ?? 0) > 0` guard from 009)                    |
| > 99               | display `'99+'`                                                                |
| undefined or stale | DO NOT pass the `badge` prop                                                   |
| Documentation      | a single-line comment above the `badge` prop names the count                   |

Feature 010 audits every existing badge against this contract and removes wiring that fails it.

---

## Backwards Compatibility

- Existing class names (`.page-tabs*`, `.section-tabs*`, `.tab-panel-transition`, `.cr-detail-content`) **must not** be renamed by this feature. They are the 009 contract and other features rely on them.
- The deprecated `<PageTabs>` / `<SectionTabs>` aliases in `NavComponents.tsx` remain exported for backwards compatibility — do not remove.
- `prefers-reduced-motion` rules introduced by 009 must be **strengthened** by this feature (adding `.clinical-card__content`) — never weakened.
