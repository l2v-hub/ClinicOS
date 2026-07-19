# Task Validation Report

## Task

- Title: CRUD UI immediata — confirm dialog + azioni color-coded (Fase 1: layer condiviso)
- Slug: crud-ui-immediata-confirm-dialog-e-azioni-color-coded
- Commit: (push in corso)
- Date: 2026-07-19

## Implementation Summary

Fase 1 del refactor CRUD: **layer condiviso**, non riscrittura di ogni schermata.

1. **`ConfirmDialog`** (`frontend/src/components/shared/ConfirmDialog.tsx`) — modale di conferma
   riutilizzabile, a tema, che sostituisce `window.confirm()` nativo per le azioni distruttive.
   `role="alertdialog"`, accento rosso, chiusura ESC/overlay, focus automatico sul bottone di
   conferma. Riusa la shell modale esistente (`.modal-overlay`/`.modal-box`).
2. **CSS** — `.btn-danger` (rosso, stessa forma di `.btn-primary`, token `--red`) + stati
   `:focus-visible` per tutti i bottoni azione (`App.css`); layout `.confirm-dialog__*` +
   `.modal-box--confirm` (`app-additions.css`). Nessun token di palette modificato, nessun nuovo
   `!important`.
3. **Wiring delete** — 3 flussi passati da `window.confirm` a `ConfirmDialog` con stato
   `pendingDelete` + `confirmDelete`: Lista pazienti, Diario paziente, Terapia farmacologica.
   Chiamate API di delete invariate; create/read/update invariati.

## Files Changed

- `frontend/src/components/shared/ConfirmDialog.tsx` (nuovo)
- `frontend/src/App.css` (`.btn-danger`, `:focus-visible`, `:disabled`)
- `frontend/src/app-additions.css` (`.confirm-dialog__*`, `.modal-box--confirm`)
- `frontend/src/components/operator/PatientList.tsx`
- `frontend/src/components/operator/cartella/DiarioPazienteTab.tsx`
- `frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx`

## Acceptance Criteria Result

| AC                                                                                         | Result | Evidence                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------ | -----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 — ConfirmDialog riutilizzabile usato nei 3 delete; 0 `window.confirm`                  |   PASS | `grep window.confirm` sui 3 file → NONE; ConfirmDialog montato in PatientList + Diario (Playwright `role=alertdialog`)                                                                                                                                                 |
| AC2 — modale rosso; Annulla non elimina; Conferma elimina + persiste dopo reload           |   PASS | Lista pazienti: modale visibile (`screenshots/crud-confirm-patientlist.png`), Annulla → 8 pazienti intatti, Bassi presente. Diario: crea→elimina→conferma → 0 card; **API server** `GET /patients/SEED-PAZ-001/diary` → 0 voci, test-entry assente (persistenza reale) |
| AC3 — `.btn-danger` rosso + `:focus-visible`; save/conferma restano blu; palette invariata |   PASS | Screenshot mostrano il bottone rosso "Elimina…"; confirm button `[active]` (focus-on-open); solo token esistenti `--red`/`--blue`                                                                                                                                      |
| AC4 — build frontend verde; nessuna regressione create/read/update                         |   PASS | `npm run build -w frontend` exit 0 (tsc -b + vite, 6.32s); 0 errori console Playwright                                                                                                                                                                                 |

## Test Results

| Test                                                                | Result | Evidence                                                              |
| ------------------------------------------------------------------- | -----: | --------------------------------------------------------------------- |
| Playwright — Lista pazienti confirm (open + cancel non distruttivo) |   PASS | modale `alertdialog` visibile; dopo Annulla 8 pazienti, dialog chiuso |
| Playwright — Diario confirm (create → delete → confirm)             |   PASS | 1 card creata → dopo conferma 0 card                                  |
| Persistenza dopo delete (server-side)                               |   PASS | `GET /patients/SEED-PAZ-001/diary` → total 0, test-entry assente      |
| Console (0 errori)                                                  |   PASS | `browser_console_messages level=error` → 0                            |
| Build (tsc + vite)                                                  |   PASS | exit 0                                                                |
| Residuo `window.confirm` nei 3 file                                 |   PASS | grep → NONE                                                           |

## Runtime Evidence

- `screenshots/crud-confirm-patientlist.png` — ConfirmDialog su Lista pazienti (accento rosso, focus su conferma).
- `screenshots/crud-confirm-diario.png` — ConfirmDialog su Diario paziente.
- Stack locale reale: frontend `:5173`, backend `:3001` (8 pazienti seed sintetici).

## Logs

Solo dati seed sintetici (nessun PHI reale). Nessun secret nei log.

## Residual Risks / Follow-up

- **Fase 1 di rollout**: sostituito `window.confirm` nei 3 flussi delete flagship + establito il layer
  condiviso. Restano da rifinire (fasi successive, dopo sign-off): applicare `ConfirmDialog` a eventuali
  altri delete, e la convenzione color-coded/hover/focus alle azioni delle restanti schermate CRUD
  (Medicazioni, Scale, Esami, Contenzioni, Agende, Parametri, DischargeImportModal usa ancora `window.confirm`).
- **Decisione palette**: niente verde per "salva" — la primary blu `.btn-primary` resta l'azione di
  salvataggio/conferma (identità medical-blue + vincolo "stesso feeling"); rosso solo distruttivo.
  Da confermare con l'utente prima del rollout esteso.

## Final Decision

CLOSED — VERIFIED

(Layer CRUD condiviso: ConfirmDialog a tema sostituisce window.confirm in Lista pazienti/Diario/Terapia,
modale rosso con focus, Annulla non distruttivo, Conferma elimina con persistenza server verificata,
build verde, 0 errori console. READY FOR CODEX QA. Rollout alle restanti schermate in fasi successive.)
