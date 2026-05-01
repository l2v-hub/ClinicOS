# ClinicOS — Design Context

> Visual source of truth for frontend implementation.
> Created manually (Stitch MCP auth pending). Update when Stitch is connected.

---

## Design Tokens

### Colors
| Token | Value | Usage |
|---|---|---|
| `--clx-navy` | `#0F1B2D` | Top nav background |
| `--clx-navy-light` | `#1A2D45` | Nav hover states |
| `--clx-blue` | `#1A56DB` | Primary action, links, focus rings |
| `--clx-blue-light` | `#EBF0FF` | Count badge background |
| `--clx-indigo` | `#4338CA` | MRN badge text |
| `--clx-indigo-light` | `#EEF2FF` | MRN badge background |
| `--clx-bg` | `#F0F4F8` | Page background |
| `--clx-surface` | `#FFFFFF` | Cards, table |
| `--clx-border` | `#DDE3ED` | Borders, dividers |
| `--clx-row-divider` | `#F1F5F9` | Table row dividers |
| `--clx-row-hover` | `#F8FAFC` | Table row hover, thead bg |
| `--clx-text` | `#1E2D3D` | Primary text |
| `--clx-text-muted` | `#6B7A8D` | Secondary text, table headers |
| `--clx-red` | `#EF4444` | Error state |
| `--clx-red-light` | `#FFF5F5` | Error background |
| `--clx-red-border` | `#FECACA` | Error border |

### Typography
| Role | Size | Weight | Family |
|---|---|---|---|
| Nav brand | 18px | 700 | system-ui |
| Page title | 22px | 600 | system-ui |
| Table header | 11px | 600 | system-ui (uppercase) |
| Table body | 14px | 400 / 500 (name) | system-ui |
| MRN badge | 12px | 400 | monospace |
| Count badge | 13px | 500 | system-ui |
| State/empty | 14px | 400 | system-ui |

### Spacing & Shape
- Nav height: 56px
- Page padding: 32px 24px
- Card radius: 8px
- Badge radius: 20px (count), 4px (MRN)
- Table cell padding: 14px 16px (body), 12px 16px (head)
- Search width: 320px
- Card shadow: `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`

---

## Screens

### 1. Patients List (primary screen)

**Layout:** Full-width. Sticky navy nav. Light gray page bg. Table card.

**Nav bar:**
- Left: blue icon box (⊕) + "ClinicOS" wordmark (white, bold)
- Right: version label (muted, monospace)
- Background: `#0F1B2D`, height 56px, sticky

**Page header (below nav, inside main):**
- Left: "Patients" (page-title)
- Right: "{n} total" count badge (blue pill)
- Margin-bottom: 20px

**Toolbar:**
- Search input (320px wide, placeholder "Search by name or MRN…")
- Margin-bottom: 16px

**Patient table card:**
- White surface, 8px radius, 1px border, subtle shadow
- Overflow hidden (rounded corners clip rows)
- thead: `#F8FAFC` bg, 1px bottom border, uppercase labels
- tbody rows: white, hover → `#F8FAFC`, 1px divider between rows (not last)
- Columns: MRN | Name | Age | Sex | Phone | Email

**Column details:**
- MRN: indigo monospace pill badge
- Name: `{lastName}, {firstName}`, weight 500
- Age: calculated from dateOfBirth, suffix " y" (e.g. "44 y")
- Sex: raw value or "—" if null
- Phone / Email: raw value or "—" if null

**Empty state (no results):**
- Single row spanning all columns
- Centered text, muted color, 48px vertical padding

**Loading state:**
- State box: white card, centered text "Loading patients…", 48px padding

**Error state:**
- State box: red bg/border, error message, 48px padding

---

## Component Inventory

| Component | Element | Class |
|---|---|---|
| Layout root | `<div>` | `.clinicos-layout` |
| Top nav | `<nav>` | `.clinicos-nav` |
| Nav brand group | `<div>` | `.nav-brand` |
| Nav icon box | `<div>` | `.nav-icon` |
| Nav version | `<span>` | `.nav-version` |
| Main content | `<main>` | `.clinicos-main` |
| Page header row | `<div>` | `.page-header` |
| Page title | `<h2>` | `.page-title` |
| Count badge | `<span>` | `.count-badge` |
| Toolbar | `<div>` | `.toolbar` |
| Search field | `<input type="search">` | `.search-input` |
| Table wrapper | `<div>` | `.table-container` |
| Table | `<table>` | `.patient-table` |
| MRN badge | `<code>` | `.mrn` |
| Name cell | `<td>` | `.name-cell` |
| State box | `<div>` | `.state-box` |
| Error modifier | — | `.state-box.error` |
| Empty row | `<td colspan>` | `.empty-row` |
