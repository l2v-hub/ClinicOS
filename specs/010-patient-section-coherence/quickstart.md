# Phase 1: Quickstart — Patient Card Navigation Uniformity & Clinical Section Layout Parity

**Feature**: 010-patient-section-coherence | **Date**: 2026-06-02

## Prerequisites

- Node.js ≥ 20 (`node -v`)
- Branch `010-patient-section-coherence` active locally
- Backend not required for visual verification — frontend renders without it

## Start the Frontend

```powershell
cd C:\Workspace\DG_SE_DEV\ClinicOS\frontend
npm install              # only if node_modules missing
npm run dev              # http://localhost:5173
```

## Build Verification

```powershell
cd C:\Workspace\DG_SE_DEV\ClinicOS\frontend
npm run build
```

Required after every edit: zero new TS errors, zero new Vite warnings (SC-011).

---

## Manual QA Matrix

Open Chrome / Edge DevTools (F12) → device toolbar (Ctrl+Shift+M).

| Viewport        | Width × Height | What to verify                                                        |
| --------------- | -------------- | --------------------------------------------------------------------- |
| Tablet baseline | 1024 × 768     | L2 uniform across all sub-pages; cards readable; no horizontal scroll |
| Large tablet    | 1180 × 820     | Sub-menu spacing on Terapia Farmacologica matches Parametri Vitali    |
| Desktop         | 1366 × 768     | Cards extend to full content width; no max-width clamp regression     |
| Desktop wide    | 1920 × 1080    | No dead space; cards stack cleanly                                    |

### Per-page script (run at every viewport)

1. **Scheda Paziente entry** → confirm exactly ONE breadcrumb is visible (the upper page-chrome one).
2. **Panoramica** → L2 row uniform; no border/pill/shadow on any L2 tab.
3. **Profilo / Anagrafica L3** → categories in order: Anagrafica, Contatti, Contatto emergenza, Assegnazione clinica.
4. **Clinica** → click into Anamnesi:
   - Cards collapse/expand independently with one click on the header
   - Each card exposes a Modifica button
   - Section header still uses the flat blue treatment (unchanged)
5. **Presa in Carico** → confirm exactly four cards in order: Dati di ingresso, Condizioni iniziali, Valutazione funzionale, Documenti e firma; each collapsible; each with Modifica.
6. **Side-by-side comparison** Anamnesi ↔ Presa in Carico — same card shape, same controls, same rhythm.
7. **Clinica → Terapia → Terapia Farmacologica** → measure the vertical gap between the section title and the L3 sub-menu (DevTools ruler).
8. **Clinica → Parametri Vitali** → measure the same gap — they must match within 2 px (SC-008).
9. **Diario / Moduli / Documenti** → L2 row still identical to the other pages.
10. **Badge audit** → for every L2 / L3 badge currently visible, open the tab and verify the count matches what is visible inside.
11. **DevTools → Rendering → Emulate `prefers-reduced-motion: reduce`** → switch tabs and collapse a card; no animation should play.

### Overflow Audit

In DevTools Console at each viewport:

```javascript
document.querySelectorAll('*').forEach((el) => {
  if (el.offsetWidth > document.body.offsetWidth) {
    console.log('overflow:', el, el.offsetWidth);
  }
});
```

Expected: zero rows (SC-010).

### 5-Second Test (SC-003)

Capture screenshots of Anamnesi and Presa in Carico at 1366 × 768. Show them side by side for 5 seconds to a colleague who has never used ClinicOS. Ask: "Do these two pages belong to the same product family?" Target: 9 / 10 say "yes — same kind of page".

---

## Files You Will Edit

| File                                                                    | Why touched                                                                                      |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `frontend/src/components/shared/ClinicalCard.tsx`                       | NEW — shared collapsible card wrapper                                                            |
| `frontend/src/App.css`                                                  | New `--clinical-*` / `--card-*` tokens, `.clinical-card*` rules, reduced-motion extension        |
| `frontend/src/app-additions.css`                                        | Prune duplicate-breadcrumb and stray L2 overrides                                                |
| `frontend/src/components/operator/PatientDetail.tsx`                    | Route `renderAnamnesi()` through `ClinicalCard`; remove in-content breadcrumb dupes; badge audit |
| `frontend/src/components/operator/cartella/PresaInCaricoTab.tsx`        | Refactor into 4 × `ClinicalCard`                                                                 |
| `frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx` | Apply `--clinical-submenu-gap`                                                                   |
| `frontend/src/components/operator/cartella/ParametriTab.tsx`            | Apply same token as the reference baseline                                                       |

### Files You Must NOT Touch

| Path                                                  | Reason                                  |
| ----------------------------------------------------- | --------------------------------------- |
| `backend/**`                                          | Constitution IV                         |
| `prisma/**`                                           | Constitution IV                         |
| `frontend/.env*`, `vercel.json`, `railway.json`       | FR-020                                  |
| `frontend/src/components/shared/TeamsLikeSidebar.tsx` | FR-001 (L1 untouched)                   |
| `frontend/src/components/shared/NavComponents.tsx`    | 009 canonical surface — do not re-shape |

---

## Recommended Edit Order

1. `ClinicalCard.tsx` (new, small)
2. `App.css` (tokens + rules)
3. `app-additions.css` (prune)
4. `PresaInCaricoTab.tsx` (use ClinicalCard)
5. `PatientDetail.tsx` (renderAnamnesi → ClinicalCard, breadcrumb dedup, badge audit)
6. `TerapiaFarmacologicaTab.tsx` + `ParametriTab.tsx` (spacing token)
7. `npm run build` + manual QA matrix
8. Commit on `010-patient-section-coherence`
