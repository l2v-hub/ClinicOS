# Task Validation Report

## Task
- Title: Scheda paziente phone usabilita flusso completo
- Slug: scheda-paziente-phone-usabilita-flusso-completo
- Commit: (push in corso)
- Date: 2026-07-18

## Implementation Summary

La scheda paziente su phone era inutilizzabile: la causa reale (non l'overflow) era il modello desktop
"shell fissa a 100vh con scroll interno annidato" che intrappolava i form clinici lunghi in una finestra
~418px. Corretto con 4 interventi (prevalentemente CSS; una micro-deroga markup).

1. **[BLOCKER] Scroll interno annidato rilasciato** (`≤1023px`): `.patient-record-view`,
   `.cr-detail-layout--no-sidebar`, `.cr-detail-content`, `.main-area-clean`, `.content-panel`/`.page-content`
   → `height:auto; overflow(-y):visible` così il documento scorre naturalmente e i pulsanti Salva in fondo
   (Braden/Terapia/Presa-in-carico) sono raggiungibili. La regola base `overflow-x:hidden` su
   `.app-shell`/`.main-area-clean` è stata limitata a `@media(min-width:1024px)` (su mobile forzava
   `overflow-y:auto` rompendo lo scroll/sticky); l'asse orizzontale è protetto da `body{overflow-x:hidden}`.
2. **[HIGH] Form terapia/2-colonne** → 1 colonna `≤768px` (`.terapia-sched-form`, `.form-row-2col`) + campi
   `min-width:0` così l'unità dose ("mg") non è tagliata.
3. **[MED] Nested `<button>`** in `ClinicalTableSection` → `<div role="button">` (HTML valido, niente errore
   hydration, tap azione non innesca il toggle sezione — interazione primaria su phone).
4. **[UX] Topbar sticky** su mobile (`.compact-topbar { position:sticky; top:0 }`) così l'hamburger (unica
   nav) resta raggiungibile durante lo scroll.

Nessuna regressione desktop (>1023px invariato); nessun cambio a logica/dati/backend/API.

## Files Changed

- `frontend/src/App.css` (rilascio scroll shell, sticky topbar, overflow-x desktop-only, padding)
- `frontend/src/app-additions.css` (rilascio scroll layout scheda, form 1-col su phone)
- `frontend/src/components/operator/cartella/shared.tsx` (header ClinicalTableSection: div role=button)

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 — nessun overflow orizzontale su tutti i tab a 360/390 | PASS | scan: 0 overflow su 5 tab L2 @360/390 |
| AC2 — contenuti/form usabili su phone (niente tagliato/irraggiungibile, controlli raggiungibili) | PASS | `documentScrolls=true` (3667px); "Salva valutazione" Braden raggiungibile con scroll reale; terapia 1-col; topbar sticky pinned (top=0) |
| AC3 — nessuna regressione desktop/tablet; nessun cambio logica/dati/API | PASS | overflow-x:hidden scoped ≥1024; 0 errori UI console; solo CSS + micro-markup header |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Playwright @390/360 (flusso reale, tutti i tab, form lunghi) | PASS | `screenshots/p390-detail-*`, findings RE-VERIFICATION #4 (FINAL) |
| Scroll reale (wheel) → Salva raggiungibile | PASS | scrollY 2823, Salva top 643 reachable |
| Sticky topbar dopo scroll | PASS | `.compact-topbar` top=0 visible; app-shell/main-area-clean `overflow-y:visible` |
| Build (tsc + vite) | PASS | `logs/qa-build-reverify4.txt` exit 0 |
| Console UI | PASS | 0 errori UI/hydration (solo 503 backend /documents, fuori scope) |

## Runtime Evidence

- `screenshots/p390-detail-natural-scroll.png` (topbar pinned + Salva raggiungibile), `p390-detail-moduli-braden-form.png`, `p390-detail-clinica-terapia-editor.png`
- `logs/detail-phone-findings.md` (RE-VERIFICATION #1–#4), `qa-build-reverify4.txt`

## Logs

Solo log sanitizzati (dati seed sintetici).

## Residual Risks

- **Fuori scope (backend):** `503` su `GET /patients/<id>/documents` (tab Documenti) — problema dati/API, non CSS.
- Nessuna regressione desktop/tablet nota.

## Final Decision

CLOSED — VERIFIED

(QA indipendente @390/360, flusso reale Pazienti→paziente: scroll documento + form lunghi raggiungibili +
topbar sticky + terapia 1-col + nested-button risolto, 0 overflow, 0 errori UI, build verde. READY FOR CODEX QA.)
