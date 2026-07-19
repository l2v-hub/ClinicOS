# Phase 1: Quickstart — Clean Navigation Layout

**Feature**: 007-clean-nav-layout | **Date**: 2026-05-24

## Dev Environment Setup

### Prerequisites

- Node.js installed (check: `node -v`)
- Podman or Docker running PostgreSQL on `localhost:5432` (required for backend; not needed for CSS-only work)
- Current branch: `006-medical-clean-navigation-layout` → switch to `007-clean-nav-layout` when the branch is created

### Start Frontend

```powershell
cd C:\Workspace\DG_SE_DEV\ClinicOS\frontend
npm install          # only if node_modules missing
npm run dev          # starts on http://localhost:5173
```

The backend is not required to test CSS/layout changes. The frontend will render with mock/empty data if the backend is not running — layout and navigation can still be validated visually.

### Build Check

```powershell
cd C:\Workspace\DG_SE_DEV\ClinicOS\frontend
npm run build
```

Run this after every significant change to catch TypeScript errors early.

---

## How to Test the Changes

### Viewport Sizes (Browser DevTools)

Open Chrome/Edge DevTools (`F12`) → Toggle device toolbar (`Ctrl+Shift+M`) → Set custom size:

| Test Target     | Width | Height | What to check                              |
| --------------- | ----- | ------ | ------------------------------------------ |
| Tablet baseline | 1024  | 768    | No dead space, no overflow, L2/L3 nav fits |
| Large tablet    | 1180  | 820    | Wider cards, correct padding               |
| Desktop         | 1366  | 768    | Full-width layout, cards extend naturally  |
| Desktop wide    | 1920  | 1080   | No max-width clamp on shell                |

### Navigation Testing

1. Open **Scheda Paziente** (any patient record)
2. Click through L2 tabs (Diario, Terapia, Parametri, Agenda, etc.) — observe underline animation
3. Click through L3 sub-tabs within a section — observe scroll if many items
4. Resize viewport between tablet and desktop — observe padding and layout changes
5. Open DevTools → Rendering → Check "Emulate CSS media feature prefers-reduced-motion" → set to `reduce` → verify tab transitions are instant

### Overflow Check

In DevTools Console, paste:

```javascript
document.querySelectorAll('*').forEach((el) => {
  if (el.offsetWidth > document.body.offsetWidth) {
    console.log('overflow:', el, el.offsetWidth);
  }
});
```

Should return no results at any tested viewport.

---

## Key Files to Edit

All files are under `C:\Workspace\DG_SE_DEV\ClinicOS\frontend\src\`:

| File                                    | Purpose                                                    |
| --------------------------------------- | ---------------------------------------------------------- |
| `index.css`                             | Fix `#root` width constraint                               |
| `App.css`                               | Main layout, L2 nav, L3 nav, breakpoints, tab transitions  |
| `app-additions.css`                     | Audit for overrides that fight new layout rules            |
| `components/operator/PatientDetail.tsx` | Add `key` prop to tab content wrapper                      |
| `components/shared/NavComponents.tsx`   | Check if any inline styles override CSS (read-only likely) |

### Recommended Edit Order

1. `index.css` — fix `#root` width first (unblocks all layout testing)
2. `App.css` — add CSS vars, fix `.app-shell` / `.main-area-clean` / `.content-panel`
3. `App.css` — L2 nav underline style + animation
4. `App.css` — L3 nav scroll + subtle active style
5. `App.css` — `.tab-panel-transition` keyframe
6. `PatientDetail.tsx` — add `key` prop to trigger transition
7. `app-additions.css` — fix any identified overrides
8. `npm run build` — verify zero errors

---

## CSS Architecture Notes

- CSS variables are defined in `:root` at the top of `App.css`
- Existing mobile breakpoints use `max-width` (keep untouched)
- New tablet/desktop breakpoints use `min-width` (additive, no conflict)
- The `--sidebar-w: 64px` variable controls the sidebar offset — do not change
- `app-additions.css` is imported after `App.css` in the component tree — its rules take precedence for clinical record pages
