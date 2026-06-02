# Phase 1: Quickstart — Navigation L2 & L3 Hierarchy Redesign

**Feature**: 009-nav-l2-l3-hierarchy | **Date**: 2026-06-02

## Prerequisites

- Node.js ≥ 20 installed (`node -v`)
- Branch: `009-nav-l2-l3-hierarchy` is active locally
- Backend is **not** required for CSS-only verification — the frontend renders with empty data when the backend is offline; layout and nav can be validated visually

## Start the Frontend

```powershell
cd C:\Workspace\DG_SE_DEV\ClinicOS\frontend
npm install              # only if node_modules missing
npm run dev              # serves on http://localhost:5173
```

## Build Verification

```powershell
cd C:\Workspace\DG_SE_DEV\ClinicOS\frontend
npm run build
```

Required: zero new TypeScript errors, zero new build warnings (SC-005). Run after every CSS or JSX edit per Constitution VI.

---

## Manual QA Matrix

Open Chrome or Edge DevTools (F12) → device toolbar (Ctrl+Shift+M) → set custom size.

| Viewport | Width × Height | What to verify |
|----------|---------------|----------------|
| Tablet baseline | 1024 × 768 | L2 row dominant, L2 height ≥ 44px, L3 ≤ 32px, no global horizontal scroll |
| Large tablet | 1180 × 820 | Content padding widens, nav still flush to content area |
| Desktop | 1366 × 768 | Layout extends, no max-width clamp |
| Desktop wide | 1920 × 1080 | Page uses full width, no dead space on the right |

For each viewport, follow this script:

1. Open **Scheda Paziente** → any patient
2. Cycle through L2 tabs (Diario, Terapia, Parametri, Agenda, …) — verify:
   - Active tab carries a clean 2-px underline (no border, no pill)
   - Underline animates from left over ~180 ms
   - Tab content fades / slides in briefly
3. Cycle through L3 tabs (Terapia → Farmacologica, Riabilitativa, …) — verify:
   - L3 underline is visibly thinner / lighter than L2 underline (1 px, ~70 % opacity)
   - L3 row reads as subordinate to L2 (smaller, lighter)
   - If L3 has many items, the row scrolls horizontally with no visible scrollbar
4. Resize between 1024 → 1180 → 1366 → 1920 — verify no horizontal page scrollbar appears and padding scales smoothly
5. DevTools → Rendering tab → set "Emulate CSS media feature `prefers-reduced-motion`" to `reduce` — verify tab content change is instant (no animation)
6. DevTools → Elements → hover an L2 tab → confirm `outerHeight` ≥ 44 px; same for L3 ≥ 32 px (SC-006)

### Overflow Audit

In DevTools Console at each viewport, paste:

```javascript
document.querySelectorAll('*').forEach(el => {
  if (el.offsetWidth > document.body.offsetWidth) {
    console.log('overflow:', el, el.offsetWidth);
  }
});
```

Expected output: **no rows** (SC-003).

### 5-Second Test (for SC-001 / SC-002)

Capture a screenshot of the redesigned Scheda Paziente at 1366 × 768 with both L2 and L3 visible. Show it for 5 seconds to a colleague who has never used ClinicOS. Ask:

- "What is the main menu of this page?" — they must point at the L2 row.
- "Which row is the sub-menu?" — they must point at the L3 row.

Target: 9 / 10 viewers correct on both.

---

## Files You Will Edit

All paths relative to repo root.

| File | Why touched |
|------|-------------|
| `frontend/src/App.css` | Enforce design tokens; refine `.page-tabs` / `.section-tabs` base rules; add new `--l3-underline-h` / `--l3-underline-color` |
| `frontend/src/app-additions.css` | Enforce clinical-record overrides for L2 / L3 |
| `frontend/src/index.css` | Audit only — confirm `#root` width clamp is absent |
| `frontend/src/components/operator/PatientDetail.tsx` | Verify L2 / L3 markup uses canonical class names; keep the ref-based `.tab-panel-transition` re-trigger; **do not** introduce `key={...}` remount |

### Files You Must NOT Touch

| Path | Reason |
|------|--------|
| `backend/**` | Constitution IV — backend untouched |
| `prisma/**` | Constitution IV — schema untouched |
| `frontend/src/components/shared/TeamsLikeSidebar.tsx` | FR-001 — L1 untouched |
| `frontend/.env*`, `vercel.json`, `railway.json` | FR-014 — no env / deploy config drift |

---

## Recommended Edit Order

1. `App.css` — tokens (`:root`) and base `.page-tabs` / `.section-tabs` rules
2. `app-additions.css` — clinical-record overrides
3. `index.css` — audit only
4. `PatientDetail.tsx` — confirm transition wiring is intact
5. `npm run build` — must pass
6. Manual QA matrix above
7. Commit on `009-nav-l2-l3-hierarchy`

---

## CSS Architecture Reminders

- Custom properties live in `:root` at the top of `App.css`. Add new ones there; do not scatter them.
- `app-additions.css` is loaded **after** `App.css` — its selectors win the cascade. Keep its rules narrow and scoped to clinical-record contexts.
- Existing mobile breakpoints (`@media (max-width:…)`) remain untouched — this feature is tablet-first.
- The `--sidebar-w` token (Level 1 width) is **not** changed by this feature.
