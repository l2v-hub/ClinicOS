# Task Contract

## Task
- Title: Somministrazione: nessuna seconda dose in fascia a dose singola dopo cambio orario
- Slug: somministrazione-nessuna-seconda-dose-in-fascia-a-dose-singola-dopo-cambio-orari
- Type: change
- Date: 2026-10-11

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | yes |
| Database/Persistence | yes |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

PR #431 identifica la somministrazione con terapia/data/fascia/ora. Se il medico sposta nello stesso giorno l'orario di una dose già data (08:00 → 09:00), il giro la mostra di nuovo «da dare», le dosi in ritardo la includono e la conferma crea una seconda somministrazione `erogata` nella stessa fascia. Il fallback per fascia in therapy-slots.ts non scatta mai.

## Expected Behaviour

In una fascia con una sola dose prescritta, una somministrazione già registrata in quella fascia e giorno vale qualunque fosse l'orario: niente seconda conferma, slot mostrato come già dato, nessuna dose in ritardo. Fasce con più dosi: confronto per orario come nella PR.

## Acceptance Criteria

- AC1: dose singola data alle 08:00, orario spostato alle 09:00 → la conferma è rifiutata (TherapyAlreadyAdministeredError) e non nasce una seconda riga.
- AC2: nello stesso scenario il giro terapia mostra lo slot come «administered» e la query delle dosi dovute non lo elenca.
- AC3: fasce con due dosi (08:00 e 10:00) restano distinte: confermare le 10:00 lascia le 08:00 pendenti (test esistenti verdi).

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | regole di lettura |
| Integration | yes | test DB su Postgres locale sintetico |
| API | no | |
| Playwright | no | |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

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

Modifica di una regola clinica approvata dall'utente in chat (2026-10-11, «correggi prima»). Solo dati sintetici; nessuna migrazione nuova.

## Gate Status

READY FOR IMPLEMENTATION
