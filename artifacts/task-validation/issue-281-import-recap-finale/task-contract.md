# Task Contract

## Task
- Title: issue 281 import recap finale
- Slug: issue-281-import-recap-finale
- Type: change
- Date: 2026-07-20

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | yes |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

L'ultimo step dell'import (StepVerifica) mostra solo l'elenco dei NOMI delle sezioni compilate (es. "Allergie, Terapia"): nessun valore reale, schermata povera e illeggibile (issue #281).

## Expected Behaviour

Il riepilogo mostra i VALORI reali che verranno creati: anagrafica estesa (CF/telefono/email/indirizzo), allergie con gravità (o stato assenti/negate), elenco terapie (import + manuali) con orari e flag "da verificare", estratto anamnesi e diagnosi. Le altre sezioni restano elencate.

## Acceptance Criteria

- AC1: Il riepilogo finale dell'import elenca le terapie per nome con orari e conteggio, non solo la parola "Terapia".
- AC2: Allergie mostrate con allergene e gravità (o messaggio esplicito se assenti/negate); anamnesi/diagnosi con testo reale (excerpt).
- AC3: Nessun errore console e nessun 4xx/5xx durante lo step di riepilogo.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | |
| Integration | no | |
| API | no | |
| Playwright | yes | flusso UI reale |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

## Evidence Plan

- validation-report.md
- screenshot del recap con valori reali
- Playwright trace + test-results

## Risks

Solo lettura del draft: nessun rischio di scrittura; excerpt limita testi lunghi.

## Gate Status

READY FOR IMPLEMENTATION
