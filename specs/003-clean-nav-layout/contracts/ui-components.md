# UI Component Contracts: Clean Navigation Layout

**Feature**: 003-clean-nav-layout  
**Date**: 2026-05-24

These are the externally-visible contracts for the 5 components this feature introduces or refactors. Any caller (PatientDetail.tsx, App.tsx, other pages) must comply with these interfaces after migration.

---

## Contract 1: TeamsLikeSidebar

**File**: `frontend/src/components/shared/TeamsLikeSidebar.tsx`

**Replaces**: inline sidebar JSX in App.tsx

**Exported interface**:

```typescript
export interface TeamsLikeSidebarProps {
  activeKey: NavKey;
  utente: UtenteApp;
  onNavigate: (key: NavKey) => void;
  onLogout: () => void;
  unreadNotes?: number;
}
```

**Breaking changes from old inline sidebar**: None. App.tsx wires same callbacks.

**CSS class boundary**: `.teams-sidebar` (new) replaces `.nav-rail` (old). Old `.nav-rail` CSS remains for backward compat during transition; new classes take precedence.

---

## Contract 2: PatientCompactHeader

**File**: `frontend/src/components/operator/PatientCompactHeader.tsx`

**Replaces**: patient header block (~30 lines) at top of PatientDetail.tsx render

**Exported interface**:

```typescript
export interface PatientCompactHeaderProps {
  paziente: Paziente;
  cartella: CartellaPaziente;
  onBack: () => void;
}
```

**Breaking changes**: None. PatientDetail.tsx passes its existing props.

**CSS class boundary**: `.patient-compact-header`

---

## Contract 3: MainHorizontalNav

**File**: `frontend/src/components/shared/NavComponents.tsx` (renamed export)

**Replaces**: `PageTabs` export (backward-compat alias `export { MainHorizontalNav as PageTabs }` for zero-change callers during migration)

**Exported interface**: unchanged from `PageTabs`

```typescript
export interface PageTabGroup {
  id: string;
  label: string;
  badge?: number;
}

export function MainHorizontalNav(props: {
  groups: PageTabGroup[];
  activeId: string;
  onChange: (id: string) => void;
}): JSX.Element;
```

**CSS class boundary**: `.main-h-nav` (new) replaces `.page-tabs` (old). Old class kept for compat.

---

## Contract 4: ContextSubTabs

**File**: `frontend/src/components/shared/NavComponents.tsx` (renamed export)

**Replaces**: `SectionTabs` export (backward-compat alias `export { ContextSubTabs as SectionTabs }`)

**Exported interface**: unchanged from `SectionTabs`

```typescript
export interface SectionTab {
  id: string;
  label: string;
  badge?: number;
  urgent?: boolean;
}

export function ContextSubTabs(props: {
  tabs: SectionTab[];
  activeId: string;
  onChange: (id: string) => void;
}): JSX.Element;
```

**CSS class boundary**: `.context-sub-tabs` (new) replaces `.section-tabs` (old). Old class kept for compat.

---

## Contract 5: CompactPageHeader (topbar)

**File**: App.tsx inline (no extraction to separate file)

**Change**: Topbar reduces from 2-row to 1-row. Removes `.topbar__breadcrumb` element. Retains search button.

**CSS class boundary**: `.compact-topbar` (new) replaces `.topbar` (old).

**No prop interface** — inline JSX in App.tsx, not extracted.

---

## Migration Checklist

All callers of renamed components must be updated (or use backward-compat aliases):

- [ ] `PatientDetail.tsx` — import `MainHorizontalNav` (or keep `PageTabs` alias)
- [ ] `PatientDetail.tsx` — import `ContextSubTabs` (or keep `SectionTabs` alias)
- [ ] `App.tsx` — replace inline sidebar JSX with `<TeamsLikeSidebar />`
- [ ] `App.tsx` — replace inline patient header with `<PatientCompactHeader />` via PatientDetail
- [ ] `App.tsx` — replace `.topbar` JSX with compact single-line topbar
