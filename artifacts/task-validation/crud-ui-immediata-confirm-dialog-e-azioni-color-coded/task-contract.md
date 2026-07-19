# Task Contract

## Task

- Title: CRUD UI immediata confirm dialog e azioni color-coded
- Slug: crud-ui-immediata-confirm-dialog-e-azioni-color-coded
- Type: feature
- Date: 2026-07-19

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

## Current Behaviour

Le operazioni CRUD esistono già ma l'affordance delete usa `window.confirm()` nativo (Terapia,
Diario, Lista pazienti): dialog di sistema fuori tema, nessun accento rosso, esperienza incoerente.
Update è già uniforme via `InlineEditableField`. I bottoni azione non hanno una convenzione cromatica
esplicita coerente per salva/modifica/elimina né stati `:focus-visible`.

Fase 1 (questo task): layer CRUD condiviso. NON riscrive ogni schermata — introduce un componente
`ConfirmDialog` riutilizzabile (che sostituisce `window.confirm` nei delete) e una convenzione di
bottoni azione color-coded, riusando i token/pattern esistenti (`.modal-overlay`, `.btn-primary`,
`--blue`, `--red`). Rollout alle restanti schermate in fasi successive dopo sign-off visivo.

## Expected Behaviour

- Esiste `ConfirmDialog` (modale a tema, accento rosso destructive, chiusura ESC/overlay, focus sul
  bottone di conferma, `role="alertdialog"`), che sostituisce `window.confirm` nei 3 flussi delete.
- Il delete apre il modale: "Conferma" elimina (persiste), "Annulla" non elimina. Nessun
  `window.confirm` nativo residuo in Terapia/Diario/Lista pazienti.
- Convenzione bottoni: primario blu = salva/conferma; `.btn-danger` rosso = elimina; stati
  `:hover`/`:focus-visible` coerenti. Nessun cambio a palette/base (riuso token esistenti).
- Build verde; create/read/update invariati.

## Acceptance Criteria

- AC1: `ConfirmDialog` riutilizzabile presente e usato nei delete di Terapia, Diario, Lista pazienti; 0 `window.confirm` in quei 3 file.
- AC2: click su elimina → modale visibile con accento rosso; "Annulla" chiude senza eliminare; "Conferma" elimina e la riga sparisce; l'eliminazione persiste dopo reload.
- AC3: `.btn-danger` (rosso) e stati `:focus-visible` presenti; save/conferma restano blu `.btn-primary`; nessun `!important` nuovo, nessun token di palette modificato.
- AC4: `npm run build -w frontend` verde; nessuna regressione ai flussi create/read/update.

## Test Plan

| Test type                 | Required | Reason                                                                  |
| ------------------------- | -------: | ----------------------------------------------------------------------- |
| Unit                      |       no | Interazione UI, coperta da Playwright                                   |
| Integration               |       no | Nessun nuovo flusso integrato                                           |
| API                       |       no | Nessun endpoint modificato                                              |
| Playwright                |      yes | Delete via ConfirmDialog: modale visibile, annulla/conferma, screenshot |
| Persistence after refresh |      yes | L'eliminazione confermata deve persistere dopo reload                   |
| Agnos action registry     |       no | Non impattato                                                           |
| Voice simulation          |       no | Non impattato                                                           |
| OCR/import test           |       no | Non impattato                                                           |
| Security/privacy scan     |       no | Solo UI presentazione, nessun PHI in log                                |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

- Sostituire `window.confirm` (sincrono) con un modale (asincrono) cambia il flusso di controllo del delete: mitigazione — stato `pendingDelete` + handler onConfirm, nessun cambio alla chiamata API di delete.
- "Stesso feeling": rischio di alterare lo stile percepito. Mitigazione — riuso esclusivo di token/classi esistenti (`.modal-overlay`, `.btn-primary`, `--red`), niente nuovi colori di palette; `.btn-danger` ricalca la forma di `.btn-primary`.
- Scope creep (tutte le schermate): mitigazione — Fase 1 limitata a layer condiviso + 3 flussi delete flagship; rollout successivo dopo sign-off.

## Gate Status

READY FOR IMPLEMENTATION
