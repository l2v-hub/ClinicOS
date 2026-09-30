# Task Contract

## Task

- Title: Ingresso 3b: testo OCR per pagina e provenienza per pagina dei campi AI
- Slug: ingresso-3b-testo-ocr-per-pagina-e-provenienza-per-pagina-dei-campi-ai
- Type: feature
- Date: 2026-09-30

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

**Database/Persistence.** Nessuna migrazione Prisma. Si aggiunge la chiave opzionale `pages` dentro `_fieldOrigin` e dentro le proposte di `_fieldProposals`, che sono JSON già gestiti dal server in `PatientIntakeDraft.data`. Si leggono le righe OCR già esistenti di `ImportProcessingUnit`.

L'utente ha approvato il 2026-09-28 anche le modifiche backend necessarie alla scheda d'ingresso completa del prototipo (memoria `project_intake_full_prototype_approved`).

**Auth.** Il nuovo endpoint sta dietro `requireOperator` e la proprietà del job (`requireOwnedImportJob`), come quelli esistenti.

**Privacy.** Il testo OCR è un dato clinico:

- `Cache-Control: private, no-store`;
- mai nei log;
- mai negli URL, dove compaiono solo gli id.

## Current Behaviour

- `_fieldOrigin[path]` registra `{by, value, groupIds, final}`. Nell'unione finale `groupIds` contiene tutte le lettere, quindi la provenienza è ambigua.
- La pagina di origine non è registrata da nessuna parte. L'AI legge il testo unito delle pagine di una lettera e non dà riferimenti di pagina.
- Il testo OCR di ogni pagina esiste già nelle righe `ImportProcessingUnit` (`kind:'ocr'`, `unitKey = pageId`, `result.rawText`), ma nessun endpoint lo espone per singola pagina.

## Expected Behaviour

Solo backend, tutto additivo. Il frontend in produzione non chiama nulla di nuovo; lo userà il ciclo 3a e i successivi.

1. **Testo di una pagina.** Nuovo endpoint `GET /ai/extraction/jobs/:id/pages/:pageId/text`. Risponde `{pageId, status, rawText, manifestRevision}`, con `rawText` non null solo quando l'OCR della versione corrente della pagina è completato.
   - La riga si cerca con l'`inputHash` corrente della pagina, quindi una pagina sostituita non restituisce mai il testo vecchio.
   - Una pagina sconosciuta, o un job di un altro operatore, risponde 404.
   - Un job scaduto o annullato risponde come gli endpoint esistenti.
   - Vale il rate limit esistente delle importazioni.
2. **Pagina di origine dei campi AI.** Funzione pura `locateFieldPages(path, value, pages[])` in un nuovo modulo:
   - normalizza il testo delle pagine (minuscole, niente accenti, spazi compressi);
   - riconosce le date in `dd/mm/yyyy`, `dd.mm.yyyy`, `d/m/yy` e ISO;
   - cerca il codice fiscale esatto, senza spazi;
   - per un nome o un cognome cerca il token intero;
   - per le allergie cerca ogni allergene;
   - per un testo lungo cerca l'inizio normalizzato;
   - per `sex` usa la pagina del nome, se trovata;
   - restituisce le pagine in cui il valore compare, in ordine;
   - senza una corrispondenza certa non restituisce niente: si ferma alla lettera e non indovina.
3. **Unione.** `mergeImportIntoDraft` (per lettera e finale) carica nella stessa transazione il testo OCR corrente delle pagine coinvolte e lo passa a `mergeAiIntoDraft`, che scrive:
   - `pages: [{groupId, pageId, documentId}]` nell'origine di ogni campo scritto e in ogni proposta;
   - nell'unione finale, `groupIds` calcolati dalle pagine trovate, invece di tutte le lettere, quando esiste una corrispondenza.
     Senza corrispondenza il comportamento resta quello di oggi.
4. **Compatibilità.** Le bozze senza `pages` continuano a funzionare. Il PATCH del client non può ancora scrivere `_fieldOrigin` né `_fieldProposals`. I test esistenti di draft-merge e draft-link restano verdi.

## Acceptance Criteria

- **AC1.** Test unitari di `locateFieldPages`:
  - una data scritta come 05/02/1939 sulla pagina 2 trova la pagina 2;
  - il codice fiscale viene trovato anche scritto con spazi;
  - un cognome come token intero non viene trovato dentro un'altra parola;
  - senza corrispondenza il risultato è vuoto;
  - un valore presente su due pagine le restituisce entrambe, in ordine;
  - le allergie vengono trovate per allergene;
  - `sex` segue la pagina del nome.
- **AC2.** Test unitari di `mergeAiIntoDraft` con `pages`:
  - l'origine riceve `pages` corretti per lettera e nella finale, e le proposte ricevono `pages`;
  - senza corrispondenza non c'è `pages` e `groupIds` è quello di oggi;
  - una bozza vecchia senza `pages` viene letta senza errori.
- **AC3.** Test di contratto e DB dell'endpoint del testo:
  - il proprietario riceve 200 con il testo;
  - un altro operatore riceve 404;
  - una pagina inesistente riceve 404;
  - con OCR non ancora pronto la risposta è 200 con `rawText: null`;
  - una pagina sostituita non restituisce il testo vecchio;
  - la risposta ha `no-store`;
  - il testo non compare nei log.
- **AC4.** Test DB dell'unione: dopo `merge-import` su un job con testo OCR per pagina, `_fieldOrigin` della bozza contiene le pagine corrette. Questi test girano nel job `gate` della CI.
- **AC5.** Build backend e frontend ok. Nel job `gate` nessun test nuovo fallisce e nessun test prima verde diventa rosso rispetto alla lista nota.

## Test Plan

| Test type                 | Required | Reason                                                     |
| ------------------------- | -------: | ---------------------------------------------------------- |
| Unit                      |      yes | locateFieldPages e mergeAiIntoDraft con pages              |
| Integration               |      yes | test DB nel job `gate` della CI (niente Postgres locale)   |
| API                       |      yes | endpoint del testo: proprietà, 404, rawText null, no-store |
| Playwright                |       no | nessuna UI in questo PR                                    |
| Persistence after refresh |      yes | `pages` in `_fieldOrigin` sopravvive a GET e PATCH         |
| Agnos action registry     |       no |                                                            |
| Voice simulation          |       no |                                                            |
| OCR/import test           |      yes | unione per lettera e finale con testo OCR per pagina       |
| Security/privacy scan     |      yes | proprietà del job, niente testo nei log, no-store          |

## Evidence Plan

Required evidence:

- validation-report.md
- output dei test unitari locali
- log del job `gate` della CI con i test nuovi e il confronto con la lista dei fallimenti noti
- build backend e frontend

## Risks

- **Il backend va in produzione al merge**: tutto è additivo, senza migrazione, e l'endpoint nuovo non viene chiamato finché non arriva il frontend.
- **Corrispondenze sbagliate**: un valore comune (per esempio "F") compare ovunque. Per valori corti o comuni non si assegna nessuna pagina, salvo le regole esplicite (`sex` legato alla pagina del nome). Una pagina sbagliata è peggio di nessuna pagina.
- **Carico nella transazione**: il testo OCR si legge per le sole pagine della lettera o del job, senza `_full` né il risultato completo.

## Gate Status

READY FOR IMPLEMENTATION
