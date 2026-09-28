# Task Validation Report

## Task

- Title: Ingresso 2a: backend per documenti nella scheda (collegamento, unione AI, proposte di campo)
- Slug: ingresso-2a-backend-per-documenti-nella-scheda-collegamento-unione-ai-proposte-d
- Commit: (vedi PR)
- Date: 2026-09-29

## Implementation Summary

Solo backend, additivo, **nessuna migrazione**. Il frontend in produzione non chiama gli endpoint nuovi.

- **`draft-merge.ts`** (nuovo, funzione pura `mergeAiIntoDraft`): regole di proprietà dei campi.
  - **Campo vuoto**: l'AI lo riempie e registra la provenienza in `_fieldOrigin`.
  - **Campo dell'operatore**: non vuoto e diverso dal valore AI registrato. Non viene mai scritto; un valore AI diverso diventa una proposta in `_fieldProposals`.
  - **Campo svuotato dall'operatore** dopo un valore AI o un "apply": resta suo e al massimo riceve una proposta.
  - **Allergie**: stato e righe sono un'unica unità. Non restano mai "assenti" o "paziente_nega" insieme a righe presenti. "apply" incoerente → 409 `proposal_inconsistent`.
  - **Unione per lettera**: scrive solo campi. Non tocca terapia, `_importSource` e `_narrative`.
  - **Unione finale** (verità revisionata):
    - sostituisce i valori AI e azzera `_accepted` solo se il valore cambia;
    - scarta le proposte e svuota i valori per lettera che non sostiene;
    - terapia importata in `terapiaImport` se l'operatore non ne ha, altrimenti in `_importProposals`.
- **`draft-link.ts`** (nuovo) e route in `intake-drafts.ts`:
  - `POST` / `DELETE /intake/drafts/:id/import-job`: collegamento e scollegamento. Proprietà del job e della bozza; stesso creatore, anche per admin e manager.
  - `POST /intake/drafts/:id/merge-import`: unione per lettera o finale.
  - `POST /intake/drafts/:id/field-proposals/:pid/decide`: decisione su una proposta.
  - Tutte le route passano per `mutateLinkedDraft` (lock job → bozza, ricevuta idempotente, versione, ricontrollo del collegamento).
- **PATCH bozza**:
  - scarta in silenzio `_fieldOrigin`, `_fieldProposals` e `_aiMerge`;
  - su una bozza collegata a un job a pagine senza `_importSource`: versione obbligatoria, ricontrollo del collegamento, rinnovo della scadenza del job.
- **Conferma**: 409 `field_proposals_pending` se ci sono proposte in attesa.
- **`getPageJob`**: aggiunge `groups[].resultHash`. `currentGroupUnits` è ora condiviso.

## Files Changed

- **Nuovi:**
  - backend/src/ai/upload/pages/draft-merge.ts, draft-link.ts
  - backend/src/ai/upload/pages/\_\_tests\_\_/draft-merge.test.ts
  - backend/src/intake/\_\_tests\_\_/draft-import-link-db.test.ts
- **Modificati:** backend/src/ai/upload/pages/draft-mutations.ts, inputs.ts, repository.ts; backend/src/intake/draft-service.ts; backend/src/ai/upload/confirm-service.ts; backend/src/routes/intake-drafts.ts

## Acceptance Criteria Result

| AC  |                     Result | Evidence                                                                                                                                                                                                                                                                    |
| --- | -------------------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |                       PASS | `draft-merge.test.ts`: 32/32 in locale. Coperti riempimento dei vuoti, campi dell'operatore → proposta, campo svuotato, allergie come unità, finale con sostituzione, azzeramento e pulizia, terapia `terapiaImport` o proposte, per-lettera che non tocca terapia e fonte. |
| AC2 |                      IN CI | Test DB su proprietà, `owner_mismatch`, secondo collegamento 409, job confermato/annullato/scaduto, scollegamento dopo `_importSource`. Revisione QA: corretti e deterministici.                                                                                            |
| AC3 |                      IN CI | Test DB su versione vecchia 409, stesso `requestId` → stesso risultato, `idempotency_conflict`, per-lettera con hash vecchio, finale con revisione corrente, apply/keep via HTTP.                                                                                           |
| AC4 | PASS (codice) / IN CI (DB) | PATCH con chiavi riservate → 200. from-import, refresh-import, seed e conferma invariati (confronto riga per riga di `mutateDraft` / `mutateLinkedDraft` e dell'hash della ricevuta). Conferma bloccata con proposte in attesa.                                             |
| AC5 |                PASS locale | Build backend e root ok. Suite backend 647/729: 81 fallimenti, contro gli 80 della baseline di origin/main. L'unico nuovo è il file DB, per assenza di Postgres locale. Nessun test prima verde è diventato rosso.                                                          |

## Test Results

| Test                 |           Result | Evidence                                                 |
| -------------------- | ---------------: | -------------------------------------------------------- |
| Unit                 |             PASS | draft-merge 32/32                                        |
| Integration/API (DB) |            IN CI | draft-import-link-db.test.ts, job `gate`                 |
| Security/ownership   | PASS (revisione) | proprietà e stesso creatore; nessun dato clinico nei log |
| Playwright           |               NA | nessun cambiamento visibile                              |

## Independent QA

- **Primo giro: FAILED VALIDATION.** Bloccante B1: `allergieStatus` riempito senza guardare le righe, quindi "Nessuna allergia nota" con allergie presenti. Avvisi:
  - A1: campo svuotato riempito di nuovo;
  - A2: collegamento tra proprietari diversi;
  - A3: concorrenza su `importJobId`;
  - A5: valori per lettera non sostenuti dalla finale;
  - A6: PATCH senza versione.
- **Correzioni:** tutte applicate, con 13 unit test e test DB nuovi. Decisione del coordinatore su A1: un campo svuotato resta dell'operatore.
- **Secondo giro: READY FOR QA**, a condizione che il test DB passi nel job `gate`. Sonde avversarie sulle allergie tra lettere e finale, apply/keep in vari ordini, svuotamento di anagrafica e CF, A5 con defer/select, A6 contro il frontend in produzione, ordine dei lock: tutto PASS.

## Residual Risks

- Nel PR frontend `editableDraftPatch` deve escludere le chiavi riservate, per evitare falsi conflitti.
- Corsa rara tra conferma e collegamento: senza deadlock, rischio basso.
- Uno stato allergie incoerente inserito dall'operatore stesso non viene bloccato alla conferma. È un comportamento preesistente.

## Final Decision

IMPLEMENTED — NOT VERIFIED (in attesa dell'esito del test DB nel job `gate` della CI)
