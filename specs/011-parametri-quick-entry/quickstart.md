# Phase 1: Quickstart — Parametri Pazienti Compact Quick-Entry

**Feature**: 011-parametri-quick-entry | **Date**: 2026-06-02

## Prerequisites

- Node.js ≥ 20 (`node -v`)
- Branch `011-parametri-quick-entry` active locally
- Backend reachable on `http://localhost:3001` (required — the save flow is the heart of this feature)

## Start

```powershell
cd C:\Workspace\DG_SE_DEV\ClinicOS\frontend
npm install              # only if node_modules missing
npm run dev              # http://localhost:5173
```

Open the operator dashboard → Parametri Pazienti.

## Build Verification

```powershell
cd C:\Workspace\DG_SE_DEV\ClinicOS\frontend
npm run build
```

Required after every edit: zero new TS errors, zero new Vite warnings (SC-010).

---

## Manual QA Matrix

### Density (US1)

| Viewport | Width × Height | What to verify |
|----------|---------------|----------------|
| Tablet baseline | 1024 × 768 | ≥ 8 patient rows above the fold (SC-001); row height ≤ 56 px (SC-002) |
| Large tablet | 1180 × 820 | Slightly more rows visible; layout still uses full content width |
| Desktop | 1366 × 768 | At least 10 rows above the fold; no horizontal scroll |
| Desktop wide | 1920 × 1080 | Plenty of rows; no dead space; rows do not stretch absurdly |

DevTools console at each viewport:
```javascript
const rows = document.querySelectorAll('.qe-row');
console.log('count:', rows.length, 'first row height:', rows[0]?.offsetHeight, 'visible (above fold) ≥8:', Array.from(rows).filter(r => r.getBoundingClientRect().top < window.innerHeight).length);
```

### Auto-`ora` and Auto-`operatore` (US2 / SC-004 / SC-008)

1. Open DevTools → Network tab → filter for the cartella update endpoint.
2. Fill PA, SpO2, FC, TC, DTX, Evacuazione on the first patient row.
3. Click Save.
4. Inspect the request payload — `ora` should equal the current time within ±2 s, `firmaIpM` should equal the logged-in operator name.
5. Confirm no `<input>` for `ora` or `operatore` exists in the DOM:
   ```javascript
   console.log('ora inputs:', document.querySelectorAll('.qe-row input[name="ora"]').length);
   console.log('operatore inputs:', document.querySelectorAll('.qe-row input[name="operatore"]').length);
   // Expected: 0 / 0
   ```

### Note Affordance (US3 / SC-005)

1. Confirm no Note input is visible on any row at rest.
2. Click the Note button on row 1 — a note input appears below row 1's clinical fields.
3. Measure the height of row 2 before and after the click — value must be identical (SC-005).
4. Open Note on row 5 — the note input on row 1 closes automatically (R-4: one-at-a-time).
5. Type a note and Save row 5 — row collapses back; Note button on row 5 now carries the `--has-note` indicator (SC-006).
6. Reload the page — the indicator persists on rows whose `noteRapide` is non-empty.

### Overflow Audit (SC-007)

At each of the four viewports, paste in DevTools Console:
```javascript
document.querySelectorAll('*').forEach(el => {
  if (el.offsetWidth > document.body.offsetWidth) {
    console.log('overflow:', el, el.offsetWidth);
  }
});
```
Expected: zero hits (SC-007).

### Click-to-Save Stopwatch (SC-009)

With a populated 10-patient ward:
1. Place cursor at the first row's PA field.
2. Start stopwatch.
3. Type 6 values, press Enter (or click Save).
4. Stop stopwatch when the row reflects the saved state.
5. Repeat for 5 rows. Compute median.
6. Target: ≤ 6 seconds median.

### Edge-Case Drills

| Drill | Expected |
|-------|----------|
| Disconnect network, then Save | Row keeps the entered values; error message surfaces (FR-015) |
| Open Note on row, switch to a different sub-page, come back | Note state may reset (acceptable for v1); clinical field values remain intact |
| Operator name changes mid-session (re-login) | Next Save carries the **new** name in `firmaIpM` (FR-016) |
| Operator presses Enter inside any clinical input | Triggers Save for that row (R-5 keyboard shortcut) |

---

## Files You Will Edit

| File | Why touched |
|------|-------------|
| `frontend/src/App.css` | Add `--qe-*` tokens + `.qe-*` rule block + media query |
| `frontend/src/components/operator/MultiPatientParametri.tsx` | Refactor `RigaPaziente` to compact grid; remove Ora/Operatore inputs; add per-row note expansion; auto-inject at save |

### Files You Must NOT Touch

| Path | Reason |
|------|--------|
| `backend/**` | Constitution IV |
| `prisma/**` | Constitution IV |
| `frontend/.env*`, `vercel.json`, `railway.json` | FR-019 |
| `frontend/src/components/shared/TeamsLikeSidebar.tsx` | L1 untouched |
| `frontend/src/components/shared/NavComponents.tsx` | 009 canonical surface — do not reshape |

---

## Recommended Edit Order

1. Read `MultiPatientParametri.tsx` (~413 lines) end-to-end to internalise the current shape.
2. Add `--qe-*` tokens + `.qe-*` rule block to `App.css`.
3. Refactor `RigaPaziente` — replace the existing JSX with the compact grid; drop `ora` / `operatore` inputs; inline 6 clinical inputs.
4. Hoist `noteOpen` state to `MultiPatientParametri` (parent), pass `isNoteOpen` and `onToggleNote` down to `RigaPaziente`.
5. Update `rigaToParametroGiorno()` / the save flow so auto-`ora` (`new Date()...`) and auto-`operatore` (current `operatoreNome` prop) are injected at save time, not at form-mount.
6. `npm run build` from `frontend/` — must pass.
7. Manual QA matrix above.
8. Commit on `011-parametri-quick-entry`.
