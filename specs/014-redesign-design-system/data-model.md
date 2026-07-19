# Phase 1 Data Model: Design System Entities

This feature is presentation-layer; "entities" here are the design-token set and the shared
component prop contracts (the UI's internal data shapes). No persistence, no API, no DB.

## Design Token Set (CSS custom properties, `:root` in App.css)

Intent aliases layered over existing raw tokens:

| Token                            | Value                 | Maps to / Use                            |
| -------------------------------- | --------------------- | ---------------------------------------- |
| `--c-primary`                    | `#1A56DB` (`--blue`)  | Primary action, active nav, links, focus |
| `--c-primary-hover`              | `#1748B8`             | Hover on primary                         |
| `--c-primary-active`             | `#123A92`             | Pressed/active                           |
| `--c-primary-bg`                 | `#EBF1FE`             | Light-blue fills, active row/hover tint  |
| `--c-success` / `--c-success-bg` | `#059669` / `#ECFDF5` | Completed/ok badge                       |
| `--c-warning` / `--c-warning-bg` | `#D97706` / `#FFFBEB` | Attention badge / row accent             |
| `--c-danger` / `--c-danger-bg`   | `#DC2626` / `#FEF2F2` | **Clinical alert/error only**            |
| `--c-info`                       | `#1A56DB`             | Info badge (= primary)                   |
| `--c-neutral` / `--c-neutral-bg` | `#6B7280` / `#F1F4F8` | Default/unknown badge                    |
| `--sidebar-w`                    | `80px` (was 64)       | Sidebar width                            |
| `--l2-h`                         | `44px`                | L2 nav height                            |
| `--l3-h`                         | `32px`                | L3 nav height                            |
| `--gutter`                       | `20px`                | Content gutter                           |
| radius/shadow/typography         | existing              | Reused unchanged                         |

Components MUST reference intent tokens (`--c-primary`…) on the priority pages, not raw hex.

## Navigation Item

Used by L1 sidebar, L2 `MainHorizontalNav`, L3 `ContextSubTabs`.

| Field     | Type      | Notes                           |
| --------- | --------- | ------------------------------- |
| `id`      | string    | unique key                      |
| `label`   | string    | Italian, Title Case             |
| `icon?`   | ReactNode | required for L1, optional L2/L3 |
| `badge?`  | number    | optional counter                |
| `active`  | boolean   | derived from current route/tab  |
| `urgent?` | boolean   | L3 only — small accent dot      |

State: exactly one `active` per nav level. L2 active = blue underline; L3 active = lighter underline.

## Table Column (`ClinicalTable` ColumnDef)

| Field         | Type                          | Notes                                |
| ------------- | ----------------------------- | ------------------------------------ |
| `key`         | string                        | data accessor                        |
| `label`       | string                        | header text                          |
| `sortable?`   | boolean                       | shows sort indicator                 |
| `filterable?` | boolean                       | per-column filter affordance         |
| `filterType?` | 'text' \| 'select' \| 'date'  | filter input kind                    |
| `align?`      | 'left' \| 'center' \| 'right' | cell + header alignment              |
| `render?`     | (row) => ReactNode            | custom cell (badge/progress/actions) |

Table-level: rows, `rowKey`, optional `onRowClick`, optional left `accent` per row, pagination
(items-per-page, page range, total count), empty state. Wide content scrolls inside container.

## Status Badge

| Field   | Type                                    | Notes                                    |
| ------- | --------------------------------------- | ---------------------------------------- |
| `value` | domain string                           | e.g. 'erogata', 'programmato', 'urgente' |
| `tone`  | success\|warning\|danger\|info\|neutral | mapped from value; unknown → neutral     |
| `label` | string                                  | Italian display text                     |

## Clinical Card (`ClinicalCard`)

| Field              | Type       | Notes                                       |
| ------------------ | ---------- | ------------------------------------------- |
| `title`            | string     | header (Italian)                            |
| `collapsible?`     | boolean    | shows collapse chevron                      |
| `defaultExpanded?` | boolean    | initial state                               |
| `focused?`         | boolean    | expanded → central focus, siblings compress |
| `onEdit?`          | () => void | consistent ghost edit button                |
| `accent?`          | token      | optional top/left accent color              |

## PageShell / PageHeader

- **PageShell**: `children`, optional `subnav` slot; applies gutter + scroll container + `min-width:0`.
- **PageHeader**: `title` (or breadcrumb), `actions?` slot. MUST NOT render the same text as both
  breadcrumb tail and title (no duplication — FR-006).
