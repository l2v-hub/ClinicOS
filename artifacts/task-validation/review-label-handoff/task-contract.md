# Task Contract

## Task
- Title: Review label handoff
- Slug: review-label-handoff
- Type: config
- Date: 2026-10-17

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | yes |

## Current Behaviour

I gruppi450/432 hanno una review fallita senza report; labels solo issue, nessun handoff codex-review-ready. Il worker Max locale ora verrà avviato dall’utente su label PR/issue.

## Expected Behaviour

Handoff esplicito su PR e issue, report autentico verificato sullo SHA attuale e importato dal controller, doppia review con test/evidenze e merge solo con tutte le condizioni dimostrate. Prompt locale portabile e dashboard accurata.

## Acceptance Criteria

- AC1: Label esclusive coerenti su PR e issue; Claude-ready/running e Codex-ready dopo report; conservare stati lifecycle, budget e label estranee.
- AC2: Commenti review con SHA, token di richiesta e round riservato durevolmente, autore autorizzato, report validato, deduplica e protezione da stale/replay/fork/iniezione.
- AC3: Prompt Claude locale eseguibile con login Max esistente, collaborazione via commenti, recovery esplicito conservando tentativo fallito e quattro round, nessun API fallback o approvazione falsa.
- AC4: Test regressione pertinenti e indipendenti, QA browser sicura con media, dashboard gruppi/fasi/budget; nessun deploy/chiusura senza review/check/E2E/target verificati.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Protocollo handoff e regressioni pipeline |
| Integration | yes | GitHub HTTP fixture e controller reali isolati |
| API | no | |
| Playwright | yes | Superficie QA del flusso con screenshot trace video |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | Auth, provenienza SHA, contenuti non fidati, nessun segreto |

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

Eventi concorrenti, doppio worker, report vecchi/falsi, ledger budget e auto merge improprio. Nessun reset tentativi; un solo controller CAS e reserved attempt. Nuove richieste esplicite dell’utente consentono recupero infrastrutturale sullo stesso SHA senza azzerare lo storico. Non bypassare CI o protezioni umane. I dati clinici non sono oggetto di test remoti.

## Gate Status

READY FOR IMPLEMENTATION
