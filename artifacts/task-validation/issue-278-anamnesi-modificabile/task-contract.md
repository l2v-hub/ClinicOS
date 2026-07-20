# Task Contract

## Task

- Title: issue 278 anamnesi modificabile
- Slug: issue-278-anamnesi-modificabile
- Type: bugfix
- Date: 2026-07-20
- GitHub Issue: #278

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

Nella scheda paziente il tab Anamnesi mostra la sezione strutturata in sola lettura
(`LegacyAnamnesisView`): l'operatore non può correggere o integrare l'anamnesi dopo l'intake.

## Expected Behaviour

Il tab Anamnesi usa `AnamnesisEditor` (lo stesso editor dell'intake) in modalità patient-chart:
i campi strutturati sono modificabili e le modifiche vengono salvate nella cartella
(`upd({ anamnesi })`) con la persistenza via API cartella già esistente.

## Acceptance Criteria

- AC1: Nel tab Anamnesi della scheda paziente i campi anamnesi sono editabili (non più read-only).
- AC2: Una modifica a un campo anamnesi viene salvata e resta visibile dopo reload della pagina.
- AC3: Nessun errore console e nessuna risposta HTTP 4xx/5xx durante modifica e salvataggio.

## Test Plan

| Test type                 | Required | Reason                                      |
| ------------------------- | -------: | ------------------------------------------- |
| Unit                      |       no | nessuna logica nuova, riuso AnamnesisEditor |
| Integration               |       no |                                             |
| API                       |       no | API cartella invariata                      |
| Playwright                |      yes | verifica editabilità + salvataggio UI       |
| Persistence after refresh |      yes | AC2                                         |
| Agnos action registry     |       no |                                             |
| Voice simulation          |       no |                                             |
| OCR/import test           |       no |                                             |
| Security/privacy scan     |       no |                                             |

## Evidence Plan

- validation-report.md
- screenshot finale (editor anamnesi con modifica salvata dopo reload)
- Playwright trace + test-results
- assert: no console errors, no 4xx/5xx

## Risks

Il cast `Anamnesi ⇄ Record<string, unknown>` è lo stesso già usato in patientSections.ts; rischio basso.

## Gate Status

READY FOR IMPLEMENTATION
