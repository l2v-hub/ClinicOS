# Task Validation Report

## Task

- Title: Diario terapia 1: backend interprete e creazione terapia dal diario
- Slug: diario-terapia-1-backend-interprete-e-creazione-terapia-dal-diario
- Commit: (vedi PR)
- Date: 2026-09-30

## Implementation Summary

Solo backend e migrazione additiva. Il frontend di produzione non chiama ancora niente di nuovo: la UI arriva nel PR 2.

- **Migrazione `20260929090000_diary_therapy_link`**: aggiunge a `PatientDiaryEntry` le colonne facoltative `therapyId` e `therapyRequestId`, con FK verso `PatientTherapy` e `ON DELETE SET NULL`, indice su `therapyId` e vincolo unico su `(patientId, therapyRequestId)`.
- **Interprete `therapies/diary-therapy-parse.ts`** (`parseDiaryTherapyText`), deterministico e basato su un elenco positivo di forme riconosciute:
  - divide il testo in clausole e individua la clausola di prescrizione; nome, dose, quantità, via, forma, orari, giorni e date si leggono solo lì;
  - regola "tutto o niente": se nella clausola avanza anche una sola parola o un simbolo non classificato, tutti i campi restano vuoti, il testo intero va nelle note e compare l'avviso `testo_non_classificato`;
  - nessun testo inventato e nessun carattere perso (test generali su tutte le frasi del file);
  - intenti non prescrittivi (`sospensione`, `somministrazione`, `modifica`): bloccano se il verbo è in testa alla clausola di prescrizione o riferito al farmaco; altrove danno solo `menzione_<intento>`;
  - quantità miste o frazionarie ammesse solo in forma certa, intervalli e dosi alternative lasciati vuoti, conflitti di fascia, orari ambigui, date dedotte segnalate.
- **Servizio `patients/diary-therapy-service.ts`**: `createDiaryEntryWithTherapy` crea terapia e voce di diario in un'unica transazione, attraverso `createTherapyInTx` e la validazione esistente.
  - Idempotenza: lo stesso `requestId` con lo stesso payload risponde 200; con un payload diverso risponde 409 `request_id_reused`. Una violazione di unicità dovuta alla concorrenza (P2002) viene gestita rileggendo il record.
  - Errori 400: `intent_not_prescription`, `schedule_required` (con le regole per `una_tantum` e `al_bisogno`), `unit_required`.
- **Route**:
  - `POST /patients/:patientId/diary/therapy-preview`;
  - `POST /patients/:patientId/diary/with-therapy`, protetta da `requireOperator` + `requirePatientScope`.
- **Lettura del diario**: ogni voce riporta `therapy: {id, farmacoNome, stato} | null`, ottenuta con un LEFT JOIN.
- **File condivisi invariati**: `parse-discharge-therapy.ts`, `therapy-create.ts`, `therapy-dose.ts`, `patient-therapies.ts`.

## Files Changed

- prisma/schema.prisma, prisma/migrations/20260929090000_diary_therapy_link/migration.sql
- backend/src/therapies/diary-therapy-parse.ts (nuovo)
- backend/src/patients/diary-therapy-service.ts (nuovo), backend/src/patients/diary-read-service.ts
- backend/src/routes/patient-diary.ts
- test: therapies/**tests**/diary-therapy-parse.test.ts, routes/**tests**/patient-diary-therapy-contract.test.ts, routes/**tests**/patient-diary-therapy-db.test.ts

## Acceptance Criteria Result

| AC  |          Result | Evidence                                                                                                                                                                 |
| --- | --------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1 |            PASS | 329 test del parser verdi, compreso l'esempio del contract. I 38 test del parser dimissioni restano verdi, con codice e test identici a origin/main.                     |
| AC2 |            PASS | 17 test di contratto: 401, 404 fuori ambito, 400 per terapia non valida, conflitto o intento (senza scrittura), anteprima 200.                                           |
| AC3 | PENDING CI gate | `patient-diary-therapy-db.test.ts` gira solo nel job `gate`, su Postgres di servizio.                                                                                    |
| AC4 | PENDING CI gate | `prisma migrate diff` produce SQL identico a `migration.sql` e `prisma validate` è pulito. L'applicazione della migrazione si verifica nel job `gate`.                   |
| AC5 |            PASS | Build backend e frontend ok. Suite backend: 1076 test, 82 falliti; l'unico file in più rispetto alla baseline è il test DB, che fallisce per `DATABASE_URL is required`. |

## Test Results

| Test                      |     Result | Evidence                                                                                                  |
| ------------------------- | ---------: | --------------------------------------------------------------------------------------------------------- |
| Unit                      |       PASS | parser 329, dimissioni 38                                                                                 |
| API                       |       PASS | contratti 17                                                                                              |
| Integration / Persistence | PENDING CI | test DB nel job `gate`                                                                                    |
| Security/privacy          |       PASS | stessi controlli della creazione terapia; audit solo con nomi di campo; nessun testo clinico in URL o log |
| Playwright                |         NA | nessuna UI in questo PR                                                                                   |

## Independent QA

clinicos-qa, 11 giri avversariali con circa 1.000 frasi in totale. I giri 1–10 sono FAILED VALIDATION, ciascuno corretto dopo; l'undicesimo è **READY FOR QA**, con la condizione che il job `gate` della CI sia verde sui test DB.

## Residual Risks

- Molte prescrizioni reali escono con tutti i campi vuoti ("e.v.", "h 8", "ore 8.00", "per 7 giorni", nomi composti). È la scelta prudente: nel PR 2 l'operatore completa a mano. Da misurare sull'uso reale.
- "N/M mg" senza spazi resta come testo scritto, perché esistono associazioni reali in quel formato. Lo stato è `da_verificare`.
- Il PR 2 deve mostrare sempre `warnings`, `ambiguous`, `inferred` e `fasciaConflicts`, generare un nuovo `requestId` a ogni modifica dell'anteprima e non convertire mai in numero il dosaggio testuale.
- La migrazione si applica automaticamente al deploy su Railway. È additiva, con colonne facoltative e senza backfill.

## Final Decision

IMPLEMENTED — NOT VERIFIED
