# Task Validation Report

## Task
- Title: Scheda presa in carico view restyle
- Slug: scheda-presa-in-carico-view-restyle
- Commit: (push in corso)
- Date: 2026-07-18

## Implementation Summary

Rivista la modalità VIEW del tab "Presa in carico" (l'EDIT era già a posto). Prevalentemente CSS + una
micro-modifica markup.

1. **[BLOCKER] Valori tagliati su phone** — `.pic-row__lbl` aveva `min-width:168px` + valore right-align in
   una `.clinical-card` `overflow:hidden` → valori tagliati a ≤390px. A `≤640px` le righe ora **impilano**
   label sopra / valore sotto (`.pic-row` column, label `min-width:0`, valore left, `overflow-wrap:anywhere`).
2. **[HIGH] Card-in-card** — `.cr-form-section` era una card (bordo/ombra/raggio/padding) dentro `.clinical-card`.
   `.clinical-card .cr-form-section` ora è un contenitore trasparente (no bordo/ombra/padding/gap) → una sola card per sezione.
3. **[HIGH] Allineamento valori** — i valori inline-editable erano a sinistra (override del margin). Aggiunto
   `.pic-row .inline-edit__value { margin-left:auto }` → valori (statici + inline) sullo stesso asse destro su desktop.
4. **[MED] Righe troppo ariose** — rimosso il `gap:14px` (via de-card) → lista continua con solo il divisore.
5. **[MED] Empty-state contraddittorio** — rimosso il banner "Presa in carico non ancora compilata." mostrato
   sopra card già popolate (markup; rimosso anche l'import `EmptyState` inutilizzato).

Nessun cambio a logica/dati/API; EDIT invariato; nessuna regressione desktop.

## Files Changed

- `frontend/src/app-additions.css` (de-card `.cr-form-section`, allineamento valori, stack `.pic-row` su phone)
- `frontend/src/components/operator/cartella/PresaInCaricoTab.tsx` (rimosso banner empty-state + import inutilizzato)

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 — nessun valore tagliato su phone; righe impilate | PASS | @390/360 `.pic-row` column, `__lbl min-width:0`, 0 valori tagliati |
| AC2 — niente card-in-card; righe compatte | PASS | `.clinical-card .cr-form-section` border 0/box-shadow none/padding 0/gap 0; lista con divisori |
| AC3 — valori allineati coerenti; empty-state rimosso | PASS | inline-edit `margin-left:auto` (asse destro comune); banner non più nel DOM |
| AC4 — nessuna regressione EDIT/desktop; build verde; screenshot | PASS | build exit 0; EDIT invariato; `pic-desktop-view.png`, `pic-390-view.png` |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Playwright VIEW desktop + phone | PASS | `screenshots/pic-desktop-view.png`, `pic-390-view.png` |
| Build (tsc + vite) | PASS | build exit 0 |
| Console/overflow | PASS | 0 overflow @1440/390/360; 0 errori console |
| Security/privacy | PASS | solo CSS + markup presentazione |

## Runtime Evidence

- `../scheda-paziente-banda-allergie-rischi-altezza/screenshots/pic-desktop-view.png`, `pic-390-view.png`

## Logs

Solo log sanitizzati (dati seed sintetici).

## Residual Risks

- Nit LOW fuori scope (cosmetici): affordance righe statiche vs inline non uniforme; hex hard-coded
  `#FEF2F2`/`#B91C1C` su "Documenti mancanti" invece dei token `--red`.
- Nessuna regressione desktop/EDIT nota.

## Final Decision

CLOSED — VERIFIED

(QA indipendente VIEW @1440/390/360: no card-in-card, no valori tagliati, allineamento coerente, banner rimosso,
0 overflow, 0 errori console, build verde. READY FOR CODEX QA.)
