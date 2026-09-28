# Task Contract

## Task

- Title: Ingresso 2a: backend per documenti nella scheda (collegamento, unione AI, proposte di campo)
- Slug: ingresso-2a-backend-per-documenti-nella-scheda-collegamento-unione-ai-proposte-d
- Type: feature
- Date: 2026-09-29

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |       no |
| Backend/API          |      yes |
| Database/Persistence |      yes |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |      yes |
| Auth / Permissions   |      yes |
| Privacy / Security   |      yes |
| Config / Env         |       no |

Database/Persistence: nessuna migrazione Prisma. Nuove chiavi JSON in `PatientIntakeDraft.data` e uso della relazione esistente `PatientIntakeDraft.importJobId @unique`.
Auth: gli endpoint nuovi applicano la proprietà operatore della bozza e del job, come gli esistenti.

## Current Behaviour

Oggi un job d'import a pagine si trasforma in bozza solo quando è `review_ready`, tramite `POST /intake/drafts/from-import` o il seed. Non si può:

- collegare un job a una bozza già aperta;
- unire i risultati dell'AI in una bozza che l'operatore sta già compilando;
- sapere quali campi ha scritto l'AI.

`refreshedPageData` non riempie mai i campi clinici e anagrafici.

## Expected Behaviour

Solo backend, tutto additivo. Il frontend in produzione non chiama nulla di nuovo, quindi il comportamento visibile resta invariato.

- **Collegamento** `POST /intake/drafts/:id/import-job {importJobId, expectedDraftVersion, requestId}`: collega un job a pagine dell'operatore a una bozza aperta. Regole:
  - proprietà del job e della bozza;
  - job non confermato né annullato;
  - bozza in stato draft e non già collegata;
  - un secondo collegamento sullo stesso job restituisce 409.
- **Scollegamento** `DELETE /intake/drafts/:id/import-job`: ammesso finché la bozza non ha `_importSource`. Annulla il job e conserva i valori già riempiti.
- **Unione** `POST /intake/drafts/:id/merge-import {requestId, expectedDraftVersion, groupId?}` oppure `{requestId, expectedDraftVersion, manifestRevision, resultHash}` (finale). Passa per il percorso `mutateDraft` esistente: lock, ricevuta idempotente, controllo di versione. Regole di proprietà dei campi (`mergeAiIntoDraft`, funzione pura):
  - **campo vuoto**: l'AI lo scrive e lo registra in `_fieldOrigin`;
  - **campo con un valore AI precedente**: l'unione finale lo sostituisce, quella per lettera no;
  - **campo dell'operatore** (non vuoto e diverso dal valore AI registrato), se l'AI ha un valore diverso: il campo NON viene scritto e si crea una proposta in `_fieldProposals`;
  - **cambiamento AI in anagrafica o terapia**: azzera `_accepted.demographics` / `_accepted.therapy`;
  - **terapia**, solo all'unione finale: senza terapie dell'operatore le righe importate vanno in `terapiaImport`; altrimenti ogni riga AI diventa una proposta `_importProposals`, riusando `refreshedPageData` e `attachPageDraftSource`;
  - **unione finale**: richiede la revisione corrente (`assertCurrentReview`, conflitti risolti);
  - **unione per lettera**: solo campi, e legge l'unità completata dell'hash d'ingresso corrente.
- **Decisione proposta di campo** `POST /intake/drafts/:id/field-proposals/:pid/decide {action:'apply'|'keep', requestId, expectedDraftVersion}`.
- **PATCH bozza**: ignora in silenzio `_fieldOrigin`, `_fieldProposals` e `_aiMerge` inviati dal client, senza rifiutare, per restare compatibile con il frontend in produzione. Per una bozza collegata a un job rinnova la scadenza del job.
- **Conferma bozza**: 409 `field_proposals_pending` se ci sono proposte di campo in attesa. I controlli esistenti restano invariati, incluso `assertPreparedPageArchive` per le bozze collegate.
- **`GET` job a pagine**: aggiunge `groups[].resultHash` (hash dell'uscita dell'unità corrente).

## Acceptance Criteria

- AC1: `mergeAiIntoDraft` (pura), con test unitari, rispetta le regole di proprietà:
  - riempie i vuoti;
  - conserva i campi dell'operatore e crea proposte;
  - all'unione finale sostituisce i valori AI e azzera le accettazioni;
  - terapia in `terapiaImport` oppure in proposte;
  - la per-lettera non tocca terapia, `_importSource` e `_narrative`.
- AC2: Gli endpoint di collegamento/scollegamento applicano proprietà e stati. Test DB: proprietario, secondo collegamento 409, job confermato rifiutato, scollegamento vietato dopo `_importSource`.
- AC3: `merge-import` e `field-proposals/decide` usano versione e idempotenza. Test DB:
  - versione vecchia → 409;
  - `requestId` ripetuto → stesso risultato;
  - la per-lettera ignora le unità con hash d'ingresso vecchio;
  - la finale richiede la revisione corrente.
- AC4: Compatibilità con il frontend in produzione.
  - PATCH con chiavi riservate → 200, chiavi ignorate.
  - `from-import`, `refresh-import`, `confirm`, `seed` e i test esistenti restano verdi, salvo i fallimenti noti della baseline CI.
  - Conferma bloccata con proposte di campo in attesa.
- AC5: build backend e frontend ok. Nel job `gate` della CI nessun test nuovo fallisce e nessun test prima verde diventa rosso rispetto alla lista nota.

## Test Plan

| Test type                 | Required | Reason                                                                                                  |
| ------------------------- | -------: | ------------------------------------------------------------------------------------------------------- |
| Unit                      |      yes | mergeAiIntoDraft (pura) in backend/src/ai/upload/pages/**tests**                                        |
| Integration               |      yes | test DB in backend/src/intake/**tests** (nella CI `gate`, Postgres di servizio; nessun Postgres locale) |
| API                       |      yes | endpoint nuovi via le funzioni di servizio + route (proprietà, stati, 409)                              |
| Playwright                |       no | nessun cambiamento visibile in questo PR                                                                |
| Persistence after refresh |      yes | le chiavi in draft.data sopravvivono a GET e PATCH                                                      |
| Agnos action registry     |       no |                                                                                                         |
| Voice simulation          |       no |                                                                                                         |
| OCR/import test           |      yes | le unità per lettera e il risultato finale entrano nella bozza secondo le regole                        |
| Security/privacy scan     |      yes | proprietà operatore su bozza e job, nessun dato clinico nei log                                         |

## Evidence Plan

Required evidence:

- validation-report.md
- output dei test unitari locali
- log del job `gate` della CI con i test nuovi (ok) e il confronto con la lista dei fallimenti noti
- build backend e frontend

## Risks

- **Il backend si deploya in produzione al merge.** Tutto è additivo e il frontend in produzione non chiama gli endpoint nuovi. L'unico effetto indiretto è il rinnovo della scadenza per le bozze collegate, che oggi non esistono.
- **Test DB solo in CI.** La CI ha già circa 20 fallimenti noti: il confronto si fa per nome del test.
- **Contesa di lock** tra l'autosalvataggio della bozza collegata e il worker sulla riga ImportJob, da tenere presente nel PR frontend.
- **Il limite di elaborazione per operatore** (`extractionCostGuard`) riguarda il PR frontend.

## Gate Status

READY FOR IMPLEMENTATION
