# Phase 10 — UX findings

Full records (steps, root cause, fix, evidence) in `BUG_CATALOG.json` (44 findings: S0 0, S1 3,
S2 19, S3 18, S4 4; 38 fixed, 6 open S3/S4 — includes the two S2 found by the independent QA gate). Screens in
`artifacts/task-validation/phase-10-e2e-bug-hunt-ux-fix-loop/screenshots/`.

## Owner-reported (screenshot + voice notes, 2026-10-02)

| Report                                                                                         | Finding        | Result                                                                                       |
| ---------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------- |
| «Bozza non salvata» + «La terapia rinviata non può essere prescritta» blocking «Crea paziente» | P10-INT-1 (S1) | fixed, browser PASS                                                                          |
| Allergie: «Gestisci dal tab Diagnosi»                                                          | P10-INT-2 (S3) | fixed                                                                                        |
| See the intake therapy photo while checking                                                    | P10-INT-3 (S2) | fixed (unit), browser MANUAL (needs AI document runtime)                                     |
| Prescriber «Dimissione ospedaliera» with one tap                                               | P10-INT-4 (S3) | fixed, browser PASS                                                                          |
| Parametri iniziali: remove IP M / IP P, add DTX 20                                             | P10-INT-5 (S3) | fixed (grid, modal, monthly sheet), browser PASS — DTX 20 read as 20:00 glucose (to confirm) |
| Finger/stylus signature on tablet (bed-rails consent)                                          | new feature    | not implemented — product decision needed                                                    |

## Patterns found and fixed across the repo

- **Generic error hides the server reason** (therapy save/delete/suspend, administration toasts,
  diary save, intake autosave, import confirm, upload limits) → server reason surfaced, field named.
- **Action shown to a role the backend refuses** (nurse «Aggiungi farmaco», OSS Terapia/Documenti,
  OSS/Admin «Nuovo ingresso», Admin Assistente, Admin clinical widgets) → hidden via the same
  capability the backend checks; backend authorization unchanged.
- **Deep link loses the section** (Assistant fallback, Adesso «Apri», notification centre, ward
  sidebar from a chart, hash links while the app runs) → patient + section preserved.
- **Disabled button with no field focus** (therapy Salva) → validation on press with focus.
- **Manual "now" date** (diary create) → server time; real clinical dates elsewhere kept (audited:
  parameters already automatic; medication/Braden/handover due dates are real clinical data).

## Residual UX issues (open, not S0–S2)

P10-UX-R1 ~180 unassociated labels in 14 forms (fixed only in the diary core flow) · P10-UX-R2
simulator session lost on reload (Phase 9 security choice) ·
P10-UX-R4 nested interactive control in collapsible headers · P10-UX-R5 «non disponibile» vs «non
assegnato» bed wording · P10-NAV-R6 Admin can open charts whose sections it cannot read · P10-NAV-R7
OSS Clinica section partially denied.
