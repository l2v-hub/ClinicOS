# Task Contract

## Task
- Title: Conferma condivisa concorrente diario e consegne
- Slug: conferma-condivisa-concorrente-diario-e-consegne
- Type: bugfix
- Date: 2026-10-04

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | yes |
| Database/Persistence | yes |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | yes |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

Due colleghi diversi possono leggere contemporaneamente active e inserire due prime conferme. Il vincolo unico per voce/operatore non serializza lettori diversi. Trovato dalla QA indipendente durante il task diario; frontend candidato203bb256 resta verificato separatamente.

## Expected Behaviour

La prima conferma su una voce è atomica tra tutti i lettori: una sola creazione, gli altri ricevono la stessa ricevuta condivisa senza nuovi insert. Nessun cambiamento di priorità/status/contenuto, API o migrazione. Permessi, autore vietato, append-only e audit conservati. Rilascio backend online non effettuato da questo contratto: preparare candidato verificabile prima di un eventuale gate di pubblicazione.

## Acceptance Criteria

- AC1: Due o più non-autori simultanei sulla stessa urgenza di diario/consegna producono una sola riga e una sola risposta created true; tutte le risposte identificano lo stesso confermatore.
- AC2: Doppio invio dello stesso lettore è idempotente; voci distinte restano indipendenti e nessun payload clinico viene mutato.
- AC2b: Dieci conferme simultanee non esauriscono il pool: anche la lettura dell'identità usa il client transazionale, senza richiedere una connessione globale aggiuntiva.
- AC3: Test reali HTTP/Postgres su cluster nuovo sintetico, identità server-autorevoli, autore/scope/normal/historical/audit/append-only e lettura nel diario preservati.
- AC4: Build backend e QA indipendente; nessuna credenziale/PHI reale, niente database online o nuova migrazione. Push del fix al branch già autorizzato, nessuna merge a main automatica.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Regressioni pertinenti senza DB. |
| Integration | yes | Servizi reali, database nuovo con migrazioni tracciate. |
| API | yes | Due identità HTTP simultanee e vincoli DB. |
| Playwright | no | |
| Persistence after refresh | yes | Query DB e nuova lettura HTTP del feed dopo conferme. |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | Scope/autore/parametri SQL e audit senza contenuto. |

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

Una transazione per subject, lock advisory parametrizzato e rilettura all'interno; audit solo dopo commit. Test paralleli su stesso subject e lettori differenti. Nessun test usa DATABASE_URL ereditata: harness crea un cluster 127.0.0.1 dedicato e lo chiude. Root unico writer; nuova QA isolata prima di giudizio finale. PostgreSQL locale incompleto iniziale sostituito da copia completa già installata; AUTH_MODE demo esplicito solo nel subprocess test.

Copertura estesa del rilascio: suite pertinenti del backend già pendente su main. Fixture standalone-router richiedono ROLE_SIMULATOR_ENABLED=false nel subprocess (i test reali app lo impostano true nel proprio harness). Correggere la sola lettura diagnostica del body nelle asserzioni di paginazione con response.clone(), così json() resta verificabile; nessuna asserzione di risultato rimossa.

## Gate Status

READY FOR IMPLEMENTATION
