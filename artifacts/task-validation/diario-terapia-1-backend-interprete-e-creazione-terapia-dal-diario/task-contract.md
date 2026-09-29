# Task Contract

## Task

- Title: Diario terapia 1: backend interprete e creazione terapia dal diario
- Slug: diario-terapia-1-backend-interprete-e-creazione-terapia-dal-diario
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
| OCR / Import         |       no |
| Auth / Permissions   |      yes |
| Privacy / Security   |      yes |
| Config / Env         |       no |

**Database/Persistence.** Migrazione additiva approvata dall'utente il 2026-09-29. Aggiunge a `PatientDiaryEntry` due colonne facoltative, `therapyId String?` e `therapyRequestId String?`, con:

- relazione verso `PatientTherapy` e `onDelete: SetNull`;
- `@@unique([patientId, therapyRequestId])`;
- `@@index([therapyId])`.

**Auth.** Si usano gli stessi controlli della creazione terapia di oggi: `requireOperator` + `requirePatientScope`.

**Privacy.** Il testo clinico non finisce mai in URL né nei log. L'audit registra solo i nomi dei campi.

## Current Behaviour

Il Diario Paziente accetta voci di testo (titolo, contenuto, priorità, stato), ma non ha un modo per prescrivere una terapia partendo dal testo. Le terapie si creano solo con `POST /patients/:id/therapies`. Il parser delle terapie delle lettere di dimissione (`parseTherapyLine`) esiste solo lato backend e non ha un endpoint.

## Expected Behaviour

Solo backend, tutto additivo. Il frontend in produzione non chiama niente di nuovo; la UI arriva nel PR 2.

- **`POST /patients/:patientId/diary/therapy-preview {text}`**. Interprete deterministico `parseDiaryTherapyText(text, entryDate)`.
  - Normalizza il testo e poi chiama il parser esistente `parseTherapyLine`.
  - Orari: "ore 8 e 20" e "alle 8, 14 e 20" diventano 08:00, 14:00, 20:00. Vale solo per ore 0–23 precedute da "ore" o "alle".
  - Date: "dal 30/09" viene completato con l'anno della data della voce e segnato come dedotto. "al dd/mm[/yyyy]" diventa la data di fine.
  - Unità: "cp" NON viene indovinata e l'unità resta vuota.
  - Niente viene inventato: ciò che il parser non riconosce resta vuoto e lo stato resta `da_verificare`.
  - Conflitti di fascia: due orari nella stessa fascia del server (`fasciaFromTime`) vengono segnalati come conflitti.
  - Risposta: `{ row, inferred, fasciaConflicts, source: 'deterministic' }`. La chiamata è di sola lettura e non scrive log con testo clinico.
- **`POST /patients/:patientId/diary/with-therapy {requestId, entry, therapy}`**. Crea in un'unica transazione la terapia (via `createTherapyInTx`, con `operatoreInseritore` dal server) e la voce di diario con `category:'terapia'`, `therapyId` e `therapyRequestId`.
  - Validazione della terapia identica a oggi (`validateTherapyCreateInput`). Un conflitto di fascia restituisce 400 e non crea nulla.
  - Idempotenza: se il `requestId` è già stato usato per lo stesso paziente, la risposta è 200 con la coppia esistente. Una violazione di unicità dovuta alla concorrenza (P2002) viene gestita rileggendo il record e restituendo 200.
  - Se l'inserimento della voce di diario fallisce, viene annullata anche la terapia: la transazione è atomica.
  - Gli errori sono mappati come in `POST /patients/:id/therapies`.
- **Lettura del diario** (`diary-read-service`): ogni voce aggiunge `therapy: {id, farmacoNome, stato} | null` tramite LEFT JOIN. Le Consegna restituiscono NULL e i client vecchi ignorano il campo.
- **Audit**: `AiAuditEvent` con `actionType 'diary_therapy_create'`, canale `ui`, solo i nomi dei campi, esito `ok` oppure `deduped`.
- Nessun cambiamento a `POST /patients/:id/therapies`, alle altre route del diario o al parser delle dimissioni: i suoi test esistenti non devono cambiare.

## Acceptance Criteria

- AC1: `parseDiaryTherapyText` è coperto da test unitari:
  - l'esempio "Ramipril 5 mg 1 cp ore 8 e 20 per os dal 30/09" dà nome, dose 5 mg, quantità 1, via OS, orari 08:00 e 20:00, data d'inizio dedotta, unità vuota;
  - "alle 8, 14 e 20";
  - "al dd/mm";
  - conflitto di fascia (ore 8 e 10);
  - nessun campo inventato;
  - i test esistenti di parse-discharge-therapy restano invariati e verdi.
- AC2: I test di contratto delle route danno 401 senza operatore, 404 per un paziente fuori ambito, 400 per una terapia non valida o in conflitto di fascia (senza creare voce né terapia), 200 per l'anteprima con la forma attesa.
- AC3: I test DB (in CI) verificano:
  - creazione atomica (se il diario fallisce, niente terapia);
  - stesso `requestId` due volte → una sola terapia, la seconda risposta è 200;
  - doppio POST in parallelo → una sola terapia;
  - cancellazione della terapia → `therapyId` diventa null;
  - la lettura del diario restituisce `therapy.stato` (anche `sospesa`).
- AC4: La migrazione è additiva e si applica su un DB vuoto e su uno con dati. È verificata dal job `gate` della CI, con Postgres di servizio e mai quello di produzione. Nessun test prima verde diventa rosso.
- AC5: Build backend e frontend ok.

## Test Plan

| Test type                 | Required | Reason                                                                                                  |
| ------------------------- | -------: | ------------------------------------------------------------------------------------------------------- |
| Unit                      |      yes | parseDiaryTherapyText (esempi, orari, date, conflitti, nessuna invenzione); parser dimissioni invariato |
| Integration               |      yes | test DB nel job `gate` della CI (niente Postgres locale)                                                |
| API                       |      yes | contratto delle due route: auth, ambito, validazione, idempotenza                                       |
| Playwright                |       no | nessuna UI in questo PR                                                                                 |
| Persistence after refresh |      yes | la voce di diario collegata si rilegge con therapy.stato                                                |
| Agnos action registry     |       no |                                                                                                         |
| Voice simulation          |       no |                                                                                                         |
| OCR/import test           |       no |                                                                                                         |
| Security/privacy scan     |      yes | nessun testo clinico in URL o log; stessi controlli di accesso della creazione terapia                  |

## Evidence Plan

Required evidence:

- validation-report.md
- output dei test unitari locali
- log del job `gate` con i test nuovi e il confronto con i fallimenti noti
- build backend e frontend

## Risks

- **Migrazione in produzione.** Si applica da sola al deploy (`preDeployCommand`). È additiva e facoltativa, senza backfill.
- **Errori di interpretazione di dosi e unità.** L'unità ambigua ("cp") non viene indovinata e la data dedotta è segnalata. L'anteprima del PR 2 obbliga a controllare.
- **Limite noto di una somministrazione per fascia.** I conflitti vengono bloccati, come deciso dall'utente.
- **Fallback AI** (PR 3, facoltativo e dietro flag): non è compreso in questo PR.

## Gate Status

READY FOR IMPLEMENTATION
