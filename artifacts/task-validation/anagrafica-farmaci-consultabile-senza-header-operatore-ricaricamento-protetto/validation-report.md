# Task Validation Report

## Task

- Title: Anagrafica farmaci consultabile senza header operatore, ricaricamento protetto
- Slug: anagrafica-farmaci-consultabile-senza-header-operatore-ricaricamento-protetto
- Commit: branch `fix/farmaci-lettura-senza-auth`
- Date: 2026-07-28

## Implementation Summary

`requireOperator` non è più montato sull'intero router `/farmaci`: resta applicato alla sola rotta
di scrittura `POST /ricarica`, che conserva anche il controllo di ruolo admin/manager già presente.

Il cambiamento corregge un difetto reale, non una scomodità. Il hook `useDocumentiFarmaco`
introdotto con la feature del link RCP chiama `GET /farmaci/cerca` tramite `cachedGetJson`, che
esegue `fetch(url)` **senza header**. Con `requireOperator` sul router intero ogni chiamata riceveva
401, il `catch` la degradava in silenzio e **l'icona del documento AIFA non compariva mai**: la
funzionalità era inerte in produzione.

Le rotte in lettura servono open data AIFA (CC-BY 4.0), gli stessi già pubblici su
`medicinali.aifa.gov.it`. Nessun dato di paziente vi transita.

## Files Changed

| File                                                | Tipo         |
| --------------------------------------------------- | ------------ |
| `backend/src/routes/farmaci.ts`                     | produzione   |
| `backend/src/routes/__tests__/farmaci-auth.test.ts` | test (nuovo) |

Nessuna modifica a schema, a `requireOperator` o ad altri router.

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                      |
| --- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | `logs/api-farmaci-auth.txt` test 1 — `GET /farmaci/stato` senza header → **200**, corpo con `caricata` booleano                                                               |
| AC2 |   PASS | `logs/api-farmaci-auth.txt` test 2 e 3 — `GET /farmaci/cerca` senza header → **200** con campo `esiti`; senza `q` → **400** (errore di richiesta, non di autenticazione)      |
| AC3 |   PASS | `logs/api-farmaci-auth.txt` test 4 — `GET /farmaci/dosaggi` senza header → **200**                                                                                            |
| AC4 |   PASS | `logs/api-farmaci-auth.txt` test 5 e 6 — `POST /farmaci/ricarica` senza header → **401**; con ruolo `operatore` → **403**. La scrittura non è stata aperta                    |
| AC5 |   PASS | `logs/ac5-altri-router.txt` — `requireOperator` resta montato su `ai-actions`, `ai-assistant-public`, `ai-audit`, `ai-jobs`, `ai-voice`, `intake-drafts`, `patient-documents` |
| AC6 |   PASS | `logs/backend-suite.txt` → 415/415 pass, 0 fail; `logs/backend-build.txt` → exit 0                                                                                            |

## Test Results

| Test             | Result | Evidence                                                                                                                                                        |
| ---------------- | -----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit             |     NA | Nessuna logica nuova: cambia solo dove è montato un middleware                                                                                                  |
| Integration      |     NA | Nessun servizio modificato                                                                                                                                      |
| API              |   PASS | `logs/api-farmaci-auth.txt` — 6 tests, 6 pass, 0 fail, su server con porta effimera                                                                             |
| Playwright       |     NA | Nessuna modifica di UI in questo task                                                                                                                           |
| Persistence      |     NA | Nessuna scrittura su DB introdotta                                                                                                                              |
| Agnos AI         |     NA | Non toccato                                                                                                                                                     |
| Voice            |     NA | Non toccato                                                                                                                                                     |
| OCR / Import     |     NA | Non toccato                                                                                                                                                     |
| Security/privacy |   PASS | La riduzione di protezione è circoscritta alla lettura di dati pubblici (AC1-AC3); la scrittura resta 401/403 (AC4); nessun altro router perde protezione (AC5) |

## Runtime Evidence

| Comando                                                                 | Exit | Esito                       |
| ----------------------------------------------------------------------- | ---: | --------------------------- |
| `node ../node_modules/tsx/dist/cli.mjs --test .../farmaci-auth.test.ts` |    0 | 6/6 pass                    |
| `npm test` (backend)                                                    |    0 | 415 tests, 415 pass, 0 fail |
| `npm run build` (backend)                                               |    0 | 0 errori TypeScript         |

Il test API è committato e rieseguibile: monta il router su un server con porta effimera e osserva
gli status code reali, senza dipendere da un backend avviato a mano.

## Logs

- `logs/api-farmaci-auth.txt`
- `logs/ac5-altri-router.txt`
- `logs/backend-suite.txt`
- `logs/backend-build.txt`

Nessun dato clinico, nessun segreto: solo status code e nomi di header.

## Residual Risks

1. **Riduzione consapevole della protezione**, decisa dall'utente: l'anagrafica è consultabile senza
   credenziali. Il contenuto è pubblico per licenza, ma resta una superficie in più. Va rivista
   quando l'autenticazione sarà affrontata globalmente.
2. **Nessun rate limiting** sulla ricerca ora aperta. È una `SELECT` indicizzata con `limite` massimo
   25 imposto lato server, quindi il costo per chiamata è basso; non c'è però alcun freno al numero
   di chiamate.
3. **La causa di fondo resta**: `cachedGetJson` non allega header operatore. Qualunque futura
   chiamata a un endpoint protetto fatta con quel helper fallirà allo stesso modo — 401 ingoiato in
   silenzio. Debito tecnico segnalato, fuori dallo scope di questo task.
4. **La feature del link RCP resta da verificare in applicazione**: questo task rimuove l'ostacolo,
   non dimostra che l'icona compaia. Verifica manuale a carico dell'utente, e comunque subordinata
   al caricamento dell'anagrafica nell'ambiente di prova.

## Final Decision

CLOSED — VERIFIED
