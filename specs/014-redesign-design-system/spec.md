# Feature Specification: Redesign Design System & Layout

**Feature Branch**: `014-redesign-design-system`

**Created**: 2026-06-08

**Status**: Draft

**Input**: Redesign ClinicOS design system and layout from the `.claude/design-reference` visual audit. Unify shell, navigation (L1/L2/L3), tables, and cards into shared components with a medical-blue palette. Realign 9 priority pages. Source of truth: `.claude/design-reference/CLINICOS_VISUAL_AUDIT.md`.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Consistent shell & navigation everywhere (Priority: P1)

A clinic operator moves between Pazienti, Scheda Paziente, Agenda, Documenti and admin
pages. The left sidebar, the page header, the primary horizontal navigation (L2) and the
secondary horizontal navigation (L3) look and behave identically on every page. Nothing is
styled differently page-by-page; the operator never has to relearn where things are.

**Why this priority**: The shell and navigation are visible on 100% of screens. Inconsistency
here is the most-reported problem and undermines every other page. Fixing it delivers the
largest perceived-quality gain and is the foundation the other stories build on.

**Independent Test**: Open each priority page; the sidebar (L1), top nav (L2) and sub-nav (L3)
render from the same shared components with the same active-state language (blue underline for
L2, lighter variant for L3), identical heights and spacing. The Diario sub-navigation is visually
indistinguishable in style from other L3 navs.

**Acceptance Scenarios**:

1. **Given** any priority page, **When** it renders, **Then** the sidebar shows icon+label items, the active item has a distinct blue active state, and the sidebar is wider/more legible than before.
2. **Given** a page with L2 tabs, **When** a tab is active, **Then** it shows a blue underline (no pill/heavy border) and L2 uses the same component on every page.
3. **Given** the Diario page, **When** its third-level navigation renders, **Then** it uses the shared L3 sub-nav component with no custom chips/buttons.
4. **Given** L2 and L3 on the same page, **When** compared, **Then** L3 is visibly lighter/more compact than L2 while sharing the same design language.

---

### User Story 2 - Unified tables across all pages (Priority: P2)

An operator views patient lists, therapy lists, document lists, operators and room/bed admin
tables. Every table looks and behaves the same: same header style, sortable columns, per-column
filtering, consistent row styling, consistent row actions, consistent pagination.

**Why this priority**: Tables are the densest information surface and currently differ per page.
A single table component removes a whole class of inconsistency and makes data scannable.

**Independent Test**: Each list page renders its table through one shared table component;
sorting, column filtering, status badges, row actions and pagination behave identically.

**Acceptance Scenarios**:

1. **Given** any list page, **When** the table renders, **Then** it uses the shared table component with a uniform header, sortable columns and a pagination footer.
2. **Given** a sortable column, **When** the operator activates sort, **Then** the column shows a clear sort indicator and rows reorder.
3. **Given** a column with a filter, **When** the operator filters, **Then** only matching rows show, using the same filter affordance on every table.
4. **Given** a status value, **When** displayed, **Then** it uses a consistent status badge (success/warning/danger/info/neutral) with red reserved for clinical alerts/errors only.

---

### User Story 3 - Coherent cards & clinical focus (Priority: P2)

On Scheda Paziente, Diario, Terapia Farmacologica and Parametri, all cards share one style
(padding, border, light shadow, edit affordance). Clinical history and treatment history are
central and primary; an expanded card becomes the focus area while others compress.

**Why this priority**: Clinical content is the core of the product. Coherent, expandable cards
make the primary clinical data prominent and reduce visual noise.

**Independent Test**: All cards on clinical pages render through one shared card component;
expanding a card makes it the central focus and compresses siblings; edit affordance is identical.

**Acceptance Scenarios**:

1. **Given** any clinical page, **When** cards render, **Then** they share padding, border, light shadow and a consistent edit button.
2. **Given** a collapsible card, **When** expanded, **Then** it becomes the central focus and other cards compress.
3. **Given** Scheda Paziente / clinical record, **When** rendered, **Then** clinical history and treatment history occupy the primary central column.

---

### User Story 4 - Full-width responsive layout (desktop & tablet) (Priority: P3)

The operator uses ClinicOS on desktop (1366px+) and tablets (1024×768, 1180×820). Content uses
the full available width with consistent gutters; no global horizontal scrollbar appears; tables
scroll horizontally inside their own container when space is tight.

**Why this priority**: Wasted desktop space and tablet overflow are real but lower-frequency than
the shell/table/card inconsistencies. Depends on the shared components being in place first.

**Independent Test**: At 1024×768, 1180×820 and 1366px+, content fills width, no global horizontal
overflow occurs, the sidebar stays legible, and wide tables scroll within their container.

**Acceptance Scenarios**:

1. **Given** a desktop ≥1366px, **When** any page renders, **Then** content fills the available width with consistent gutters (no narrow centered column).
2. **Given** a tablet at 1024×768 or 1180×820, **When** any page renders, **Then** there is no global horizontal scrollbar.
3. **Given** a wide table on a tablet, **When** it exceeds the viewport, **Then** it scrolls horizontally within its container, not the whole page.
4. **Given** any viewport, **When** the header and breadcrumb render, **Then** they do not duplicate the same information.

---

### Edge Cases

- Long patient/operator names or many table columns on a narrow tablet → table scrolls inside its container, no page overflow.
- A page with no L3 navigation → L3 bar is omitted cleanly without layout shift.
- A clinical card with very long content when expanded → focus card scrolls internally; siblings stay compressed.
- Empty table (no rows) → consistent empty state within the shared table.
- Status value outside the known set → falls back to a neutral badge, never an undefined/red style by accident.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a single shared sidebar (L1) used on every page, with icon+label items, a clear blue active state, and improved legibility/width versus the current sidebar.
- **FR-002**: System MUST provide a single shared primary horizontal navigation (L2) used on every page, with a blue underline active indicator and no heavy pill/border styling.
- **FR-003**: System MUST provide a single shared secondary horizontal navigation (L3) sharing the L2 design language but visibly lighter and more compact, supporting inline counters.
- **FR-004**: The Diario page MUST use the shared L3 sub-navigation component; all custom Diario tabs/chips MUST be removed.
- **FR-005**: System MUST provide a single shared page shell that lays out sidebar + content, owns content scrolling, and applies consistent responsive gutters.
- **FR-006**: System MUST provide a single shared page header showing breadcrumb/title and page actions without duplicating the same information between breadcrumb and header.
- **FR-007**: System MUST provide a single shared data-table component used by all list pages, supporting column sorting, per-column filtering, consistent row styling, consistent row actions, and a pagination footer.
- **FR-008**: System MUST provide a single shared card component with consistent padding, border, light shadow, a consistent edit affordance, and optional collapsible sections.
- **FR-009**: Collapsible cards MUST support an expanded "focus" state in which the expanded card becomes central and sibling cards compress.
- **FR-010**: On patient/clinical pages, clinical history and treatment history MUST be presented as central, primary content.
- **FR-011**: System MUST apply a medical-blue design-token palette (primary `#1A56DB`, hover, active, light-blue background, neutral gray, white surfaces, success green, warning amber) with danger red reserved exclusively for clinical alerts and errors.
- **FR-012**: System MUST define and use shared design tokens for spacing, radius, shadow, typography, table density, and navigation heights.
- **FR-013**: Layout MUST be full-width on desktop (≥1366px) with consistent gutters and no narrow centered content column.
- **FR-014**: Layout MUST produce no global horizontal overflow at 1024×768 and 1180×820; wide tables MUST scroll within their own container.
- **FR-015**: The following priority pages MUST be migrated to the shared components: Scheda Paziente, Diario Paziente, Terapia Farmacologica, Parametri, Agenda, Pazienti, Documenti, Admin Stanze/Posti Letto, Operatori.
- **FR-016**: Duplicated/local navigation, table, and card styles on the priority pages MUST be replaced by the shared components.
- **FR-017**: Status indicators MUST use a consistent badge vocabulary (success/warning/danger/info/neutral) with an unknown value falling back to neutral.
- **FR-018**: The redesign MUST NOT reproduce reference brand assets (logo, brand red as primary, proprietary graphics, industrial/MES domain terms).
- **FR-019**: The existing `/patients` data integration MUST continue to work unchanged.
- **FR-020**: The build (`npm run build`) MUST succeed with no errors after the redesign.

### Non-Functional / Constraints

- **NFR-001**: No changes to backend services or the Prisma schema.
- **NFR-002**: No new heavy UI frameworks; keep components small and simple.
- **NFR-003**: Do not modify unrelated files or features.

### Key Entities

- **Design Token Set**: Named palette/spacing/radius/shadow/typography/nav-height/table-density values consumed by all components.
- **Navigation Item**: Label, optional icon, active state, optional counter; used by L1/L2/L3.
- **Table Column**: Header label, data accessor, sortable flag, filterable flag, alignment, optional cell renderer (badge/progress/actions).
- **Status Badge**: One of success/warning/danger/info/neutral mapped from a domain value.
- **Clinical Card**: Title, edit affordance, collapsible flag, focus/compressed state.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of the 9 priority pages render their sidebar, L2 nav, L3 nav, tables and cards from the shared components (zero page-local nav/table/card style implementations remain on those pages).
- **SC-002**: The Diario third-level navigation is visually consistent with other pages' L3 navigation (no custom Diario tab/chip styling remains).
- **SC-003**: At 1024×768, 1180×820 and 1366px+, no global horizontal scrollbar appears on any priority page.
- **SC-004**: On desktop ≥1366px, primary content fills the available width (no centered narrow column) on all priority pages.
- **SC-005**: All tables across priority pages share one header style, one sort affordance, one filter affordance, one row-action set and one pagination style.
- **SC-006**: Red is used only for clinical alerts/errors; no primary action, active nav state, or neutral status uses red.
- **SC-007**: `npm run build` completes successfully with no errors.
- **SC-008**: The `/patients` listing continues to load and display patient data after the redesign.

## Assumptions

- The existing React + TypeScript + Vite frontend and its routing remain; this is a presentation-layer redesign, not a rewrite.
- The visual audit (`.claude/design-reference/CLINICOS_VISUAL_AUDIT.md`) is the authoritative source for layout/UX rules and palette; reference brand is explicitly not copied.
- Existing data sources and API endpoints (including `/patients`) remain unchanged.
- "Priority pages" are the nine listed; other pages may continue to work and can be migrated later but are out of scope for this feature's acceptance.
- Tablet support targets the two listed resolutions; phone/mobile layout is out of scope for this feature.
- Prior nav work (specs 004/009/013) may already provide partial shared components; this feature consolidates rather than starts from zero.
