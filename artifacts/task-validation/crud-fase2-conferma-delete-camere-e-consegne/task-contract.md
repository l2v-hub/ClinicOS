# Task Contract

## Task

- Title: CRUD Fase2 conferma delete camere e consegne
- Slug: crud-fase2-conferma-delete-camere-e-consegne
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

Fase 2 del rollout CRUD. Due azioni di eliminazione avvengono **senza conferma** (rischio errore):
`eliminaCamera` in `RoomsManagement.tsx` (admin, delete immediato al click sul cestino) e il delete
consegna in `ConsegnePage.tsx` (`onDelete(c.id)` immediato). Le altre superfici delete usano già il
`ConfirmDialog` (Fase 1). Le 2 `window.confirm` residue sono in `DischargeImportModal` ma sono conferme
di import/overwrite (non delete) e restano fuori scope.

## Expected Behaviour

- Il click su elimina camera apre il `ConfirmDialog` (accento rosso); conferma elimina, annulla no.
- Il click su elimina consegna apre il `ConfirmDialog`; conferma elimina, annulla no.
- Chiamate API di delete invariate; nessun altro comportamento modificato; build verde.

## Acceptance Criteria

- AC1: eliminare una camera passa dal `ConfirmDialog` (0 delete immediato); Annulla non elimina.
- AC2: eliminare una consegna passa dal `ConfirmDialog`; Annulla non elimina.
- AC3: nessun cambio a palette/token o alle API; riuso del componente `ConfirmDialog` esistente.
- AC4: `npm run build -w frontend` verde; 0 errori console.

## Test Plan

| Test type                 | Required | Reason                                                                                           |
| ------------------------- | -------: | ------------------------------------------------------------------------------------------------ |
| Unit                      |       no | Interazione UI, coperta da Playwright                                                            |
| Integration               |       no | Nessun flusso integrato nuovo                                                                    |
| API                       |       no | Nessun endpoint modificato                                                                       |
| Playwright                |      yes | Delete camera + consegna via ConfirmDialog: modale visibile, annulla non distruttivo, screenshot |
| Persistence after refresh |       no | Il percorso confirm+persistenza è già verificato in Fase 1 (stesso componente)                   |
| Agnos action registry     |       no | Non impattato                                                                                    |
| Voice simulation          |       no | Non impattato                                                                                    |
| OCR/import test           |       no | Non impattato                                                                                    |
| Security/privacy scan     |       no | Solo UI presentazione                                                                            |

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

- Delete sincrono → modale asincrono: mitigazione con stato `pendingDelete` e handler onConfirm; chiamata API invariata.
- ConsegnaCard è renderizzata in due punti (grouped/flat): la conferma va gestita a livello di card (stato locale) per evitare duplicazione.
- Nessun impatto su token/palette/API: riuso `ConfirmDialog` di Fase 1.

## Gate Status

READY FOR IMPLEMENTATION
