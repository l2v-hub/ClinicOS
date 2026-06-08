# Phase 0 Research: Redesign Design System & Layout

All decisions below resolve open choices so Phase 1 has no NEEDS CLARIFICATION.

## D1 — Canonical table component name

- **Decision**: Keep the existing `ClinicalTable` (`components/operator/cartella/ClinicalTable.tsx`)
  as the single shared table. Treat user/spec term "ClinicalDataTable" as a synonym for it.
- **Rationale**: The constitution (II) explicitly mandates a single `ClinicalTable`. The component
  already exists with sort/filter/render. Renaming would churn every import for zero behavior gain
  (violates Simplicity).
- **Alternatives considered**: Create a new `ClinicalDataTable` and migrate everything → rejected
  (pure churn, two-table risk). Rename existing → rejected (breaks imports, no value).

## D2 — Sidebar: color and width

- **Decision**: Keep the navy medical-blue sidebar shipped in spec 013, but **widen 64px → 80px**,
  ensure **icon + label** on every item, and strengthen the active state (blue active bar +
  filled icon/label). Tablet keeps the same 80px (no aggressive collapse).
- **Rationale**: Current problem #1 is *width/legibility*, not color. Reference uses a light
  sidebar with a red brand — color is explicitly "do NOT copy"; *proportions and icon+label
  layout* are what we adopt. Flipping navy→light days after 013 shipped is high-risk visual churn
  for no requirement. Widening + labels directly satisfies FR-001 and SC-004 intent.
- **Alternatives considered**: Light-neutral sidebar like reference → rejected (color is brand,
  out of scope; high churn). Icon-only 64px → rejected (fails legibility requirement).

## D3 — Full-width responsive strategy

- **Decision**: Content column is full-width with fixed gutters (e.g. 20–24px) via the shell;
  no max-width centered column. Wide tables get `overflow-x:auto` **inside** the `ClinicalTable`
  container, not on the page body. App shell uses `min-width:0` on the flex content column to
  prevent children forcing global overflow.
- **Rationale**: Directly fixes problems #6/#7/#8 and FR-013/FR-014. `min-width:0` on a flex item
  is the standard cure for "child table widens the whole page" overflow.
- **Alternatives considered**: Per-page max-width → rejected (wastes desktop). Page-level
  horizontal scroll → rejected (fails SC-003).

## D4 — Diario third-level navigation

- **Decision**: Replace Diario's custom author-type filter chips (`.filter-chip` in
  `app-additions.css`) with the shared L3 `ContextSubTabs` for author categories, and route any
  remaining true *filters* through the `ClinicalTable` per-column filter API. No bespoke chip CSS.
- **Rationale**: FR-004 + SC-002 require Diario's L3 to be visually identical to other pages.
  The author categories are navigation-like (switch view) → belong in shared L3. Free-text/date
  filtering belongs in the shared table filter, not custom chips.
- **Alternatives considered**: Restyle chips to look like tabs → rejected (still a separate
  component = drift risk). Keep chips → rejected (violates FR-004).

## D5 — PageShell

- **Decision**: Add a thin new `PageShell` component that wraps page content with the standard
  gutter + scroll container, so pages stop re-implementing layout wrappers. `App.tsx` keeps the
  outer `.app-shell`/sidebar; `PageShell` standardizes the inner content frame.
- **Rationale**: FR-005. Today layout wrappers are duplicated per page. A thin shell removes that
  duplication without restructuring routing (App.tsx hash router stays).
- **Alternatives considered**: Fold into PageHeader → rejected (header ≠ scroll/gutter concern).
  No shell, rely on CSS class → rejected (spec lists PageShell as required shared component).

## D6 — Token palette alignment

- **Decision**: Reuse existing tokens (`--blue #1A56DB`, `--emerald`, `--amber`, `--red`,
  surfaces, radius, shadows). Add explicit semantic aliases to match the audit so components
  reference intent not raw colors: `--c-primary`, `--c-primary-hover (#1748B8)`,
  `--c-primary-active (#123A92)`, `--c-primary-bg (#EBF1FE)`. Map success=emerald, warning=amber,
  danger=red, info=primary. Red used only for clinical alerts/errors.
- **Rationale**: FR-011/FR-012/SC-006. Existing palette is already medical-blue; we add the
  missing primary hover/active/bg steps and intent aliases rather than redefining colors.
- **Alternatives considered**: New token file → rejected (two sources of truth). Replace all raw
  color usages app-wide → rejected (scope creep beyond priority pages).

## D7 — Status badge vocabulary

- **Decision**: Single badge set — success (emerald), warning (amber), danger (red), info
  (primary blue), neutral (gray). Unknown value → neutral. Reuse existing badge classes; unify
  any per-page variants onto this set on the priority pages.
- **Rationale**: FR-017/SC-006. Therapy/agenda/rooms already use color-coded statuses; this
  standardizes the mapping and the fallback.

## D8 — Verification approach

- **Decision**: Gate on `npm run build` (which runs `tsc -b` strict + `vite build`). Manual
  viewport QA at 1024×768, 1180×820, 1366px+ for overflow/full-width/nav/Diario parity.
- **Rationale**: No FE test runner exists (Simplicity); build+strict TS is the available
  automated gate (VI). Visual acceptance is inherently manual for a redesign.
