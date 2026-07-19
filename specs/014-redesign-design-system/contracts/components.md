# Phase 1 UI Contracts: Shared Components

Prop contracts for the mandatory shared components. Existing components keep their current public
props where possible; additions are noted. All labels Italian.

## AppSidebar (`TeamsLikeSidebar.tsx`)

```ts
type SidebarItem = { id: string; label: string; icon: ReactNode; badge?: number };
props: { items: SidebarItem[]; activeId: string; onNavigate(id): void; footer?: ReactNode }
```

Contract: width `var(--sidebar-w)`=80px; every item icon+label; active item clear blue state;
touch target ≥44px; role-filtered items provided by caller (App.tsx) — component is role-agnostic.

## AppTopNav (L2 — `MainHorizontalNav` in NavComponents.tsx)

```ts
type NavTab = { id: string; label: string; badge?: number };
props: { tabs: NavTab[]; activeId: string; onChange(id): void; actions?: ReactNode }
```

Contract: horizontal, height `var(--l2-h)`; active = blue underline (no pill/border);
`actions` slot right-aligned (primary/secondary buttons). Same component on every page.

## AppSubNav (L3 — `ContextSubTabs` in NavComponents.tsx)

```ts
props: { tabs: NavTab[]; activeId: string; onChange(id): void } // + optional urgent flag per tab
```

Contract: same language as L2, lighter/compact, height `var(--l3-h)`; supports inline `(n)` badge.
**Diario uses this** for author categories — no custom chips.

## PageShell (NEW — `PageShell.tsx`)

```ts
props: { children: ReactNode; subnav?: ReactNode }
```

Contract: applies `--gutter` padding, owns vertical scroll, `min-width:0` to prevent global
horizontal overflow; full-width content (no max-width centering).

## PageHeader (`PageHeader.tsx`)

```ts
props: { title: string; breadcrumb?: string[]; actions?: ReactNode }
```

Contract: breadcrumb tail MUST NOT duplicate `title`; actions right-aligned.

## ClinicalCard (`ClinicalCard.tsx`)

```ts
props: { title: string; collapsible?: boolean; defaultExpanded?: boolean;
         focused?: boolean; onEdit?(): void; accent?: string; children: ReactNode }
```

Contract: unified padding/border/light shadow; consistent ghost edit button; expanded `focused`
card becomes central, siblings compress.

## ClinicalTable (canonical — `ClinicalTable.tsx`)

```ts
type ColumnDef<T> = { key: string; label: string; sortable?: boolean; filterable?: boolean;
  filterType?: 'text'|'select'|'date'; align?: 'left'|'center'|'right'; render?: (row: T) => ReactNode };
props: { columns: ColumnDef<T>[]; rows: T[]; rowKey(row): string;
  onRowClick?(row): void; rowAccent?(row): string|undefined;
  pageSize?: number; emptyText?: string }
```

Contract: uniform header (flat blue/neutral), sortable + per-column filter, consistent row
actions (via `render`), pagination footer, `overflow-x:auto` inside container. Single table for
PatientList, Parametri, Terapia, Documenti, Rooms, Operatori, Diario.

## StatusBadge (helper)

```ts
props: { value: string; tone?: 'success'|'warning'|'danger'|'info'|'neutral'; label: string }
```

Contract: unknown/no tone → neutral; red tone reserved for clinical alert/error.
