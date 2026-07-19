# Quickstart: Clean Navigation Layout

**Feature**: 003-clean-nav-layout  
**Date**: 2026-05-24

---

## Prerequisites

```bash
cd C:\Workspace\DG_SE_DEV\ClinicOS\frontend
npm install          # already done; verify node_modules present
```

Backend running (for patient data):

```bash
cd C:\Workspace\DG_SE_DEV\ClinicOS\backend
npm run dev          # http://localhost:3001
```

---

## Dev server

```bash
cd frontend
npm run dev          # http://localhost:5173
```

---

## Verify build passes

```bash
cd frontend
npm run build        # must exit 0, no TypeScript errors
```

---

## Manual QA Checklist

Open `http://localhost:5173` in browser. Use DevTools → Device toolbar.

### Viewport 1: 1024x768

1. **Sidebar L1**
   - [ ] Width ≤64px; icons centered; labels visible (10px)
   - [ ] Active item has left accent bar (blue) + white icon
   - [ ] All 6 items visible without scroll: Dashboard, Pazienti, Parametri, Consegne, Agenda, Note
   - [ ] Badge count on Note if unread messages > 0

2. **Topbar**
   - [ ] Height ≤40px; single row; no breadcrumb text
   - [ ] Search button visible on right

3. **Patient header (open any patient)**
   - [ ] Height ≤56px; single row: back chevron, name+MRN, age, sex, room, allergy badge
   - [ ] Long name truncates with ellipsis

4. **L2 nav (MainHorizontalNav)**
   - [ ] Height ≥40px; font larger than L3; tabs: Panoramica, Clinica, Diario, Moduli, Documenti
   - [ ] Active tab: blue filled background, white text
   - [ ] Inactive tabs: gray text, hover state visible

5. **L3 nav (ContextSubTabs)**
   - [ ] Pill style; font ~11.5px (smaller than L2)
   - [ ] Active pill: blue fill; inactive: gray bg
   - [ ] No overflow at 1024px width

6. **Content area**
   - [ ] First clinical card visible without scrolling
   - [ ] No horizontal scrollbar on the page

### Viewport 2: 1180x820

- Repeat checks 1–6 above

### Viewport 3: 1366x1024

- [ ] No layout breaks; sidebar scales correctly

### Viewport 4: Desktop 1440x900

- [ ] Content area has reasonable max-width; not stretched to full 1376px

---

## Regression Tests

Verify these existing features still work:

- [ ] Login (admin + operator roles)
- [ ] Patient list loads from API
- [ ] Open patient detail → all tabs navigate correctly
- [ ] Terapia Farmacologica tab shows therapy data
- [ ] Parametri Vitali tab renders vital cards
- [ ] Agenda page loads and shows slots
- [ ] Note badge count updates
- [ ] Ctrl+K search overlay opens/closes

---

## Key Files Modified

| File                                                        | Change                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `frontend/src/App.tsx`                                      | Replace inline sidebar JSX with `<TeamsLikeSidebar>`, simplify topbar           |
| `frontend/src/App.css`                                      | Update `.nav-rail`/`.teams-sidebar`, `.topbar`/`.compact-topbar`, tab hierarchy |
| `frontend/src/app-additions.css`                            | Patient header compactness, content margin reduction                            |
| `frontend/src/components/shared/NavComponents.tsx`          | Rename + restyle PageTabs→MainHorizontalNav, SectionTabs→ContextSubTabs         |
| `frontend/src/components/shared/TeamsLikeSidebar.tsx`       | **NEW** — extracted sidebar                                                     |
| `frontend/src/components/operator/PatientCompactHeader.tsx` | **NEW** — compact patient header                                                |
