# Navigation Design Spec — ClinicOS 4-Level Model

## 1. Current State Audit

### What exists

| Element | Location | CSS class | Role |
|---|---|---|---|
| **Sidebar (L0)** | `App.tsx` — `<aside class="nav-rail">` | `.nav-rail`, `.nav-rail__item`, `.nav-rail__icon`, `.nav-rail__label`, `.nav-rail__badge` | Global app-level nav (Dashboard, Pazienti, Parametri, Consegne, Agenda, Note) |
| **Topbar** | `App.tsx` — `<header class="topbar">` | `.topbar`, `.topbar__breadcrumb`, `.topbar__search-btn` | Breadcrumb + search — NOT used for tab navigation |
| **Group tabs (L1-equivalent)** | `PatientDetail.tsx` — `<div class="cr-nav-groups">` | `.cr-nav-groups`, `.cr-nav-group-btn` | Panoramica / Clinica / Diario / Moduli / Documenti |
| **Sub-tabs (L2-equivalent)** | `PatientDetail.tsx` — `<div class="cr-tab-bar">` | `.cr-tab-bar`, `.cr-tab-btn`, `.cr-tab-badge` | Tabs within each group (e.g. Anamnesi, Diagnosi, Terapie under Clinica) |
| **No L3** | — | — | No sub-section segmented control exists anywhere |

### Issues found

1. **Non-reusable tab components.** The group bar and sub-tab bar are rendered inline in `PatientDetail.tsx` with raw `<button>` elements and local state (`tabGroup`, `tab`). No shared component exists — if another page needs tabs, it must duplicate this pattern.

2. **Duplicate `.cr-tab-btn` definition.** Defined twice in `app-additions.css`:
   - Line 2414: base definition (generic font-weight, border-bottom, color)
   - Line 3141: override with padding/font-size
   The second silently overrides the first. This works but is fragile.

3. **PatientDetail header duplicates topbar breadcrumb.** The topbar already shows `Pazienti > LastName, FirstName`. Then `PatientDetail` renders its own `cr-header` with a back button labelled "Pazienti" and the patient name again. This is redundant — the user sees the patient identity in two places.

4. **Overflow handling is patched, not systematic.** Multiple rules fight overflow:
   - `.page-content:has(.patient-record-view)` sets `padding: 0; overflow: hidden; height: calc(100svh - var(--header-h))`
   - `.patient-record-view` sets `overflow-x: hidden` twice (line 2332 and 4402)
   - `.cr-header, .cr-nav-groups, .cr-tab-bar` get `max-width: 100%` (line 4410)
   - `.cr-tab-content` gets `overflow-x: hidden` (line 4406)
   These are band-aids. The root cause is that `.patient-record-view` needs a proper flex column with a scrollable content region.

5. **`page-content` has `max-width: 1200px`** (App.css line 1961) which is removed for patient detail via `:has()`. This means other pages are constrained but PatientDetail is full-width — an inconsistency if other pages later adopt L1/L2 tabs.

6. **No padding or gap between the group bar and sub-tab bar.** They render as two visually adjacent horizontal strips with 1px borders, which can look cluttered on smaller screens.

7. **Mobile breakpoint hides group nav entirely.** At `max-width: 900px` (app-additions.css line 3331), `.cr-nav-groups { display: none !important; }` — the user loses L1 navigation on tablets. The sub-tabs remain but without the group context.

---

## 2. Four-Level Navigation Model

```
+----------------------------------------------------------+
| L0: nav-rail (sidebar)                                   |
|   Global pages: Dashboard, Pazienti, Consegne, etc.     |
+----------------------------------------------------------+
| L1: page-tabs  (PageTabs component)                      |
|   Per-page primary groups. Rendered below topbar.        |
|   Example: Panoramica | Clinica | Diario | Moduli | Doc |
+----------------------------------------------------------+
| L2: section-tabs  (SectionTabs component)                |
|   Sub-tabs within the active L1 group.                   |
|   Example: Anamnesi | Diagnosi | Terapie | Parametri    |
+----------------------------------------------------------+
| L3: subsection-control  (SubSectionControl component)    |
|   Inline segmented control / dropdown. NOT a tab bar.    |
|   Example: within Diario Infermieristico, filter by      |
|   category: Tutti | Segnalazioni | Urgenti              |
+----------------------------------------------------------+
```

### CSS class naming (extends existing `nav-rail__*` pattern)

| Level | CSS root class | Modifier pattern | Container |
|---|---|---|---|
| L0 | `.nav-rail` | `.nav-rail__item`, `.nav-rail__item.active` | `<aside class="nav-rail">` |
| L1 | `.page-tabs` | `.page-tabs__btn`, `.page-tabs__btn--active`, `.page-tabs__badge` | `<nav class="page-tabs">` |
| L2 | `.section-tabs` | `.section-tabs__btn`, `.section-tabs__btn--active`, `.section-tabs__badge` | `<nav class="section-tabs">` |
| L3 | `.subsection-ctrl` | `.subsection-ctrl__option`, `.subsection-ctrl__option--active` | `<div class="subsection-ctrl">` |

---

## 3. Component API

### `<PageTabs />`  (Level 1)

```tsx
interface PageTabGroup {
  id: string;
  label: string;
  badge?: number;        // aggregate count shown on group button
}

interface PageTabsProps {
  groups: PageTabGroup[];
  activeId: string;
  onChange: (groupId: string) => void;
}

// Renders: <nav class="page-tabs"> with buttons
// Visually: 3px bottom-border on active, bold text, horizontal scroll on overflow
```

**Design rules:**
- Background: `var(--surface)` (#FFFFFF)
- Bottom border: `1px solid var(--border)`
- Active indicator: `3px solid var(--blue)` bottom border
- Font: 13px, weight 600, `var(--font-ui)`
- Padding: `10px 18px` per button
- Horizontal padding of container: `0 28px` (matches existing `cr-nav-groups`)
- Scrollbar hidden, overflow-x auto

### `<SectionTabs />`  (Level 2)

```tsx
interface SectionTab {
  id: string;
  label: string;
  badge?: number;
  urgent?: boolean;       // renders badge in red
}

interface SectionTabsProps {
  tabs: SectionTab[];
  activeId: string;
  onChange: (tabId: string) => void;
}

// Renders: <nav class="section-tabs"> with buttons
// Visually: 2px bottom-border on active, lighter weight than L1
```

**Design rules:**
- Background: `#FFFFFF`
- Bottom border: `1px solid var(--border)`
- Active indicator: `2px solid var(--blue)` bottom border (thinner than L1)
- Font: 13px, weight 500 (lighter than L1's 600)
- Padding: `9px 16px` per button
- Badge: 18px round pill, `var(--divider)` background; `.urgent` gets `var(--red)` background + white text
- Horizontal padding of container: `0 28px`

### `<SubSectionControl />`  (Level 3)

```tsx
interface SubSectionOption {
  value: string;
  label: string;
}

interface SubSectionControlProps {
  options: SubSectionOption[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';     // default 'md'
}

// Renders: <div class="subsection-ctrl"> — segmented control (pill group)
// NOT a tab bar. Inline within content area.
```

**Design rules:**
- Container: `display: inline-flex`, `border: 1px solid var(--border)`, `border-radius: 8px`, `background: var(--surface-raised)`, `padding: 3px`
- Option: `padding: 5px 14px`, `border-radius: 6px`, `font-size: 13px`, `font-weight: 500`, `color: var(--text-muted)`, no border
- Active option: `background: var(--surface)`, `color: var(--text)`, `font-weight: 600`, `box-shadow: var(--shadow-sm)`
- Hover (inactive): `color: var(--text)`
- Transition: `background 0.12s, color 0.12s`
- Size `sm`: `font-size: 12px`, `padding: 4px 10px`

---

## 4. PatientDetail Refactoring Plan

### Current state mapping

| Current | New |
|---|---|
| `TAB_GROUPS` array + `tabGroup` state + `cr-nav-groups` div | `<PageTabs>` component |
| `TAB_GROUPS[x].tabs` + `tab` state + `cr-tab-bar` div | `<SectionTabs>` component |
| `switchGroup()` / `switchTab()` functions | `PageTabs.onChange` / `SectionTabs.onChange` |
| Inline filter chips (e.g., `diario-filters`) | Candidate for `<SubSectionControl>` |

### Step-by-step refactor

1. **Create `frontend/src/components/nav/PageTabs.tsx`** — extract the group bar rendering from PatientDetail lines 1102-1116. The component receives `groups`, `activeId`, `onChange`. It maps over groups, renders `<button class="page-tabs__btn">` elements. Badge rendering included.

2. **Create `frontend/src/components/nav/SectionTabs.tsx`** — extract the sub-tab bar from PatientDetail lines 1119-1134. Receives `tabs`, `activeId`, `onChange`. Maps over tabs, renders `<button class="section-tabs__btn">` with optional badge.

3. **Create `frontend/src/components/nav/SubSectionControl.tsx`** — new component. Renders a segmented control for L3 navigation. Initial use: replace the `.diario-filters` / `.filter-chip` pattern in `DiarioTab`.

4. **Update PatientDetail.tsx:**
   ```tsx
   // Before (inline rendering):
   <div className="cr-nav-groups no-print">
     {TAB_GROUPS.map(g => (
       <button className={`cr-nav-group-btn${...}`} onClick={...}>
         {g.label} {badge}
       </button>
     ))}
   </div>

   // After (component):
   <PageTabs
     groups={TAB_GROUPS.map(g => ({
       id: g.id,
       label: g.label,
       badge: groupBadge(g.id) || undefined,
     }))}
     activeId={tabGroup}
     onChange={(id) => switchGroup(id as TabGroup)}
   />
   ```

   Same pattern for SectionTabs replacing the `cr-tab-bar` div.

5. **Keep `TAB_GROUPS` constant and `switchGroup`/`switchTab` logic in PatientDetail.** The components are presentation-only; the parent owns the state. The data structure (`TabGroupDef[]`) stays in PatientDetail or moves to a shared types file if other pages need it.

6. **Remove the redundant back button** from `cr-header` since the topbar already provides breadcrumb navigation. Or, if the team prefers keeping it, at least remove the topbar breadcrumb duplication when on patient detail.

---

## 5. CSS Additions Needed

### New classes to add in `app-additions.css`

```css
/* ── L1: Page Tabs ────────────────────────────────────────────── */

.page-tabs {
  display: flex;
  gap: 0;
  padding: 0 28px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.page-tabs::-webkit-scrollbar { display: none; }

.page-tabs__btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font-ui);
  color: var(--text-muted);
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s;
}
.page-tabs__btn:hover {
  color: var(--text);
  background: rgba(0, 0, 0, 0.04);
}
.page-tabs__btn--active {
  color: var(--blue);
  border-bottom-color: var(--blue);
  background: transparent;
}

.page-tabs__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 9px;
  background: var(--divider);
  color: var(--text-muted);
}

/* ── L2: Section Tabs ─────────────────────────────────────────── */

.section-tabs {
  display: flex;
  gap: 0;
  background: #fff;
  padding: 0 28px;
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
  flex-shrink: 0;
  scrollbar-width: none;
}
.section-tabs::-webkit-scrollbar { display: none; }

.section-tabs__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font-ui);
  color: var(--text-muted);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s;
}
.section-tabs__btn:hover { color: var(--text); }
.section-tabs__btn--active {
  color: var(--blue);
  border-bottom-color: var(--blue);
  font-weight: 600;
}

.section-tabs__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 9px;
  background: var(--divider);
  color: var(--text-muted);
}
.section-tabs__badge--urgent {
  background: var(--red);
  color: #fff;
}

/* ── L3: SubSection Control ───────────────────────────────────── */

.subsection-ctrl {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-raised);
  padding: 3px;
  gap: 2px;
}

.subsection-ctrl__option {
  padding: 5px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font-ui);
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s, color 0.12s;
}
.subsection-ctrl__option:hover { color: var(--text); }
.subsection-ctrl__option--active {
  background: var(--surface);
  color: var(--text);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}

.subsection-ctrl--sm .subsection-ctrl__option {
  font-size: 12px;
  padding: 4px 10px;
}

/* ── Responsive ───────────────────────────────────────────────── */

@media (max-width: 900px) {
  .page-tabs__btn { padding: 8px 12px; font-size: 12px; }
  .section-tabs__btn { padding: 8px 10px; font-size: 12px; }
}

@media print {
  .page-tabs, .section-tabs, .subsection-ctrl { display: none !important; }
}
```

### Classes to deprecate (after migration)

- `.cr-nav-groups`, `.cr-nav-group-btn` — replaced by `.page-tabs`, `.page-tabs__btn`
- `.cr-tab-bar`, `.cr-tab-btn` — replaced by `.section-tabs`, `.section-tabs__btn`
- `.cr-tab-badge` — replaced by `.page-tabs__badge` / `.section-tabs__badge`

Keep the old classes until all consumers are migrated, then remove.

---

## 6. Layout / Overflow / Padding Issues and Fixes

### Issue 1: Double overflow-hidden on patient-record-view
**Problem:** `.patient-record-view` is defined in two places (line 2328 and 4401) with `overflow: hidden` and `overflow-x: hidden`. The tab content area needs vertical scrolling.
**Fix:** The scroll region must be the `.cr-tab-content` container (or a new `.page-tabs-content-scroll` wrapper), not the outer view. Structure should be:
```
.patient-record-view        → flex column, height: 100%, overflow: hidden
  .cr-header                → flex-shrink: 0
  .page-tabs                → flex-shrink: 0
  .section-tabs             → flex-shrink: 0
  .cr-tab-content-scroll    → flex: 1, overflow-y: auto  ← THIS scrolls
    .cr-tab-content          → padding, content
```

### Issue 2: page-content max-width inconsistency
**Problem:** `.page-content` has `max-width: 1200px` but patient detail removes it via `:has()`. Other pages that adopt L1 tabs will also need full-width.
**Fix:** Move the `max-width` constraint inside the content area rather than on `.page-content`. The page-content should always be full-width; individual page components can self-constrain with a utility class like `.content-constrained { max-width: 1200px; margin: 0 auto; }`.

### Issue 3: Mobile group nav disappears
**Problem:** At `max-width: 900px`, `.cr-nav-groups` is hidden entirely — users lose L1 navigation.
**Fix:** Instead of hiding, make the `<PageTabs>` component horizontally scrollable with smaller padding. The existing tablet rule already shrinks sizes; just remove the `display: none !important`. If space is truly tight, collapse to a dropdown via a `<select>` or a hamburger reveal.

### Issue 4: No visual separation between L1 and L2
**Problem:** Both bars have `border-bottom: 1px solid var(--border)` with no gap between them. They look like one thick bar.
**Fix:** Give `.page-tabs` a slightly different background tint: `background: var(--surface-raised)` (#FAFBFC) vs `.section-tabs` staying white. The subtle shade difference visually separates the two levels without needing a gap or extra border. Alternatively, add `2px` of margin-top on `.section-tabs`.

### Issue 5: Padding mismatch between nav bars and content
**Problem:** Nav bars use `padding: 0 28px` but `.page-content` uses `padding: 24px 24px`. The content is 4px less indented than the tab labels.
**Fix:** Normalize to `28px` horizontal padding in content areas within patient detail, or adjust nav bars to `0 24px`. The 4px difference is visually noticeable when tab labels don't align with section headers below them.
