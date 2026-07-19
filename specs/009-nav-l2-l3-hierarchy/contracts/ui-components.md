# Contract: UI Component Surface — Navigation L2 & L3

**Feature**: 009-nav-l2-l3-hierarchy | **Date**: 2026-06-02

This document captures the _current_ contract for the navigation surface. It serves as a frozen reference so the implementation does not silently change props, classes, or behaviour relied on elsewhere.

> Note — Research R-6 decides **not** to introduce new wrapper components in this feature. The contracts below describe the existing inline-rendered surface that the implementation must preserve, plus the _hypothetical_ future wrappers that would replace it if duplication ever crosses three call sites.

---

## Current Contract — Inline `.page-tabs` (L2)

### DOM Shape

```html
<div class="page-tabs" role="tablist" aria-label="Sezioni principali">
  <button
    type="button"
    class="page-tabs__btn"
    [class.page-tabs__btn--active]="active"
    role="tab"
    aria-selected="true|false"
  >
    {label}
  </button>
  <!-- one button per L2 entry -->
</div>
```

### Class Contract

| Class                                     | Purpose                                       | Owner     |
| ----------------------------------------- | --------------------------------------------- | --------- |
| `.page-tabs`                              | Row container                                 | `App.css` |
| `.page-tabs__btn`                         | Individual tab button                         | `App.css` |
| `.page-tabs__btn--active`                 | Active state — drives the underline `::after` | `App.css` |
| `.page-tabs__btn:hover`, `:focus-visible` | Hover / keyboard focus                        | `App.css` |

### Accessibility Contract

- `role="tablist"` on container, `role="tab"` on buttons.
- `aria-selected="true"` on the active button, `"false"` on others.
- Keyboard: Tab key cycles between buttons; arrow keys are nice-to-have but not required for this feature.
- All labels are Italian — preserved verbatim (FR-016).

---

## Current Contract — Inline `.section-tabs` (L3)

### DOM Shape

```html
<div class="section-tabs" role="tablist" aria-label="Sotto-sezioni">
  <button
    type="button"
    class="section-tabs__btn"
    [class.section-tabs__btn--active]="active"
    role="tab"
    aria-selected="true|false"
  >
    {label}
  </button>
</div>
```

### Class Contract

Mirrors L2 with the `section-tabs` prefix. See `data-model.md` for the size / weight differences.

---

## Tab Content Wrapper Contract — `PatientDetail.tsx`

```tsx
const contentRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const el = contentRef.current;
  if (!el) return;
  el.classList.remove('tab-panel-transition');
  void el.offsetWidth; // force reflow so the class re-fires
  el.classList.add('tab-panel-transition');
}, [activeGroup, tab]);

return (
  <div ref={contentRef} className="cr-detail-content tab-panel-transition">
    {/* tab body */}
  </div>
);
```

This block is the contract for the tab-change transition. The implementation **must not** replace it with a `key={…}` remount — research R-4 records why.

---

## Hypothetical Future Wrappers (do NOT create in this feature)

If at a later point three or more distinct call sites render `.page-tabs` markup, extract these:

### `<NavigationTabsBase>`

| Prop        | Type                                                       | Required | Purpose                                  |
| ----------- | ---------------------------------------------------------- | -------- | ---------------------------------------- |
| `level`     | `'l2' \| 'l3'`                                             | yes      | Picks the variant class set              |
| `items`     | `Array<{ id: string; label: string; disabled?: boolean }>` | yes      | Tab definitions                          |
| `activeId`  | `string`                                                   | yes      | Currently active tab id                  |
| `onChange`  | `(id: string) => void`                                     | yes      | Click + keyboard handler                 |
| `ariaLabel` | `string`                                                   | yes      | Accessible name for the `role="tablist"` |

### `<PrimaryTopNavigation>` / `<SecondaryTopNavigation>`

Thin call-site-readability wrappers that fix `level` and pass through the rest:

```tsx
const PrimaryTopNavigation = (props: Omit<NavigationTabsBaseProps, 'level'>) => (
  <NavigationTabsBase level="l2" {...props} />
);

const SecondaryTopNavigation = (props: Omit<NavigationTabsBaseProps, 'level'>) => (
  <NavigationTabsBase level="l3" {...props} />
);
```

Trigger to extract: `git grep -l 'page-tabs__btn'` returns ≥ 3 distinct files **and** each call site renders structurally identical markup. Until then, inline rendering wins on Principle I.

---

## Backwards Compatibility

- Existing class names (`page-tabs`, `page-tabs__btn`, `page-tabs__btn--active`, `section-tabs`, `section-tabs__btn`, `section-tabs__btn--active`, `tab-panel-transition`, `cr-detail-content`) **must not** be renamed by this feature. Any rename ripples into `PatientDetail.tsx`, `OperatorAgenda.tsx`, `OperatorDashboard.tsx`, and the CSS overrides in `app-additions.css`.
- `prefers-reduced-motion` rule must be **strengthened** by this feature, never weakened.
