# Component Interface Contracts: Clean Navigation Layout

**Feature**: 003-clean-nav-layout  
**Date**: 2026-05-24  
**Note**: This is a frontend-only feature. No database schema changes. This document defines TypeScript prop interfaces for the 5 new/refactored components.

---

## TeamsLikeSidebar

Extracted from App.tsx inline sidebar JSX. Renders the L1 navigation rail.

```typescript
interface NavItem {
  key: NavKey; // existing NavKey union type from App.tsx
  label: string; // Italian label
  icon: ReactNode; // from icons.tsx
  badge?: number; // notification count (e.g. unread notes)
  roles: ('admin' | 'operatore')[]; // which roles see this item
}

interface TeamsLikeSidebarProps {
  activeKey: NavKey;
  utente: UtenteApp;
  navItems: NavItem[];
  onNavigate: (key: NavKey) => void;
  onLogout: () => void;
}
```

**Layout**: vertical flex, 64px wide, dark background (`var(--navy)`), icons centered, labels below at 10px, active item has left-edge accent bar (`var(--blue)`) + white icon/label.

---

## PatientCompactHeader

Extracted from PatientDetail.tsx header block. Shows patient identity row compactly.

```typescript
interface PatientCompactHeaderProps {
  paziente: Paziente;
  cartella: CartellaPaziente;
  onBack: () => void; // navigate back to patient list
}
```

**Layout**: single flex row, ≤56px height. Elements: [back chevron] [name + MRN] [age/DOB] [sex] [room/bed] [allergy badge if any] [status badge]. Name truncates with ellipsis if overflow.

**Fields shown**:

- `${paziente.lastName}, ${paziente.firstName}` — truncated at ~30ch
- `MRN: ${paziente.medicalRecordNumber}` — compact gray label
- Age computed from `paziente.dateOfBirth`
- `cartella.allergie.length > 0` → amber allergy badge
- Patient status from `cartella.presaInCarico.statoAttuale` if available

---

## MainHorizontalNav (renamed from PageTabs)

Refactored `PageTabs` in `NavComponents.tsx` with dominant styling.

```typescript
// Interface unchanged from PageTabs — only styling changes
interface PageTabGroup {
  id: string;
  label: string;
  badge?: number;
}

interface MainHorizontalNavProps {
  groups: PageTabGroup[];
  activeId: string;
  onChange: (id: string) => void;
}
```

**Styling targets**:

- Height: 44px (touch-friendly)
- Font: 14px medium weight (vs current ~12-13px)
- Active state: filled `var(--blue)` background, white text, no bottom border
- Inactive: `var(--text-muted)` text, hover: `var(--accent-bg)`
- Background: `var(--surface)` with bottom border `1px solid var(--border, #E5E7EB)`
- Padding: 0 16px per tab

---

## ContextSubTabs (renamed from SectionTabs)

Refactored `SectionTabs` in `NavComponents.tsx` with pill styling.

```typescript
// Interface unchanged from SectionTabs — only styling changes
interface SectionTab {
  id: string;
  label: string;
  badge?: number;
  urgent?: boolean;
}

interface ContextSubTabsProps {
  tabs: SectionTab[];
  activeId: string;
  onChange: (id: string) => void;
}
```

**Styling targets**:

- Height: 28px pills (touch area 44px via padding on container)
- Font: 11.5px (smaller than MainHorizontalNav)
- Active: `var(--blue)` background pill, white text
- Inactive: `var(--bg)` background, `var(--text-muted)` text
- Layout: horizontal flex, gap 4px, scroll-x: auto, no wrap
- Background: `var(--bg)` strip, 8px vertical padding, bottom border `1px solid var(--border)`

---

## ContentPanel

CSS-only. No new component file needed.

```css
/* Applied to existing .page-content */
.content-panel {
  padding-top: 8px; /* reduced from current ~16-20px */
  padding-inline: 16px;
  flex: 1;
  overflow-y: auto;
  min-height: 0; /* critical for flex children to scroll */
}
```

---

## Layout Dimensions Summary

```
Tablet 1024x768:
┌─────────────────────────────────────────────────────────────┐
│ 64px │                    960px content area                 │
│      │ ┌────────────────────────────────────────────────┐   │
│  L1  │ │ CompactPageHeader (topbar): ~36px              │   │
│  nav │ ├────────────────────────────────────────────────┤   │
│ rail │ │ PatientCompactHeader: 56px                     │   │
│      │ ├────────────────────────────────────────────────┤   │
│      │ │ MainHorizontalNav (L2): 44px                   │   │
│      │ ├────────────────────────────────────────────────┤   │
│      │ │ ContextSubTabs (L3): 36px (28px pill + 8px)    │   │
│      │ ├────────────────────────────────────────────────┤   │
│      │ │                                                │   │
│      │ │  ContentPanel: 768 - 36 - 56 - 44 - 36 = 596px│   │
│      │ │  (≥65% of 768px = 499px — ✓ SC-002 satisfied) │   │
│      │ │                                                │   │
│      │ └────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

Total nav vertical: 36 + 56 + 44 + 36 = 172px  
(Slightly over the 160px spec target — acceptable since topbar at 36px is not "patient nav". Patient-specific nav: 56 + 44 + 36 = 136px ✓ well under 160px)
