# Task Contract

## Task

- Title: Anagrafica farmaci consultabile senza header operatore, ricaricamento protetto
- Slug: anagrafica-farmaci-consultabile-senza-header-operatore-ricaricamento-protetto
- Type: bugfix
- Date: 2026-07-28

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |       no |
| Backend/API          |      yes |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |      yes |
| Privacy / Security   |      yes |
| Config / Env         |       no |

Backend/API + Auth: unico file toccato `backend/src/routes/farmaci.ts`. Il middleware
`requireOperator` smette di essere montato sull'intero router e resta applicato alla sola rotta di
scrittura. Nessuna modifica allo schema, a `requireOperator` stesso o ad altri router.

## Current Behaviour

`farmaciRouter.use(requireOperator)` protegge **tutte** le rotte `/farmaci`. `requireOperator`
(`backend/src/ai/auth.ts:24-31`) pretende gli header `X-Operator-Id` e `X-Operator-Role` e risponde
401 `"Autenticazione richiesta: operatore non identificato"` se mancano.

Nel frontend gli header operatore vengono allegati **caso per caso** dal singolo componente
(`PatientList.tsx:192`, `useAgnosChat.ts:123`, `AIAssistantButton.tsx:93`, ...). Non esiste alcun
wrapper globale di `fetch`.

`cachedGetJson` (`frontend/src/lib/cachedFetch.ts:16`) esegue `fetch(url)` **senza header**.

Conseguenza — difetto introdotto con la feature del link RCP, oggi in produzione: il hook
`useDocumentiFarmaco` chiama `GET /farmaci/cerca` via `cachedGetJson`, riceve 401, il `catch`
degrada in silenzio e **l'icona del documento AIFA non compare mai**. La funzionalità è inerte in
ogni ambiente. Confermato per lettura del codice; non intercettato prima perché la verifica runtime
era stata omessa.

Effetto collaterale osservato dall'utente: aprire `/farmaci/stato` da browser restituisce lo stesso
401, rendendo impossibile anche solo controllare se l'anagrafica è caricata.

## Expected Behaviour

1. Le tre rotte di **sola lettura** — `GET /farmaci/stato`, `GET /farmaci/cerca`,
   `GET /farmaci/dosaggi` — rispondono senza header operatore.
2. `POST /farmaci/ricarica` **resta protetta** da `requireOperator` e dal controllo di ruolo
   privilegiato (admin/manager) già presente: scarica due CSV da ~82 MB e riscrive l'anagrafica,
   quindi lasciarla aperta sarebbe un vettore di abuso verso il backend.
3. Il hook `useDocumentiFarmaco` riceve 200 e l'icona del documento AIFA compare, a condizione che
   l'anagrafica sia caricata.
4. Nessun altro router cambia comportamento: le rotte che trattano dati di paziente restano protette
   esattamente come oggi.

## Acceptance Criteria

- AC1: `GET /farmaci/stato` senza header `X-Operator-*` risponde 200, non 401.
- AC2: `GET /farmaci/cerca?q=<nome>` senza header risponde 200 con il campo `esiti`.
- AC3: `GET /farmaci/dosaggi?pa=<pa>` senza header risponde 200.
- AC4: `POST /farmaci/ricarica` senza header risponde **401**; con header di ruolo non privilegiato
  (`operatore`) risponde **403**. La protezione non è indebolita.
- AC5: nessun altro router perde protezione — `requireOperator` resta montato dove è oggi in tutto
  il resto del backend.
- AC6: suite di test del backend verde e build TypeScript pulito.

## Test Plan

| Test type                 | Required | Reason                                                                                                                                     |
| ------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit                      |       no | Non c'è logica nuova: cambia solo dove è montato un middleware                                                                             |
| Integration               |       no | Nessun servizio modificato                                                                                                                 |
| API                       |      yes | È esattamente il punto: gli status code delle quattro rotte sono l'oggetto della modifica                                                  |
| Playwright                |       no | Nessuna modifica di UI in questo task                                                                                                      |
| Persistence after refresh |       no | Nessuna scrittura su DB introdotta                                                                                                         |
| Agnos action registry     |       no | Non toccato                                                                                                                                |
| Voice simulation          |       no | Non toccato                                                                                                                                |
| OCR/import test           |       no | Non toccato                                                                                                                                |
| Security/privacy scan     |      yes | La modifica riduce una protezione: va dimostrato che la riduzione è limitata alla lettura di dati pubblici e che la scrittura resta chiusa |

## Evidence Plan

Required evidence:

- validation-report.md con l'esito reale
- test API sulle quattro rotte con e senza header, con gli status code osservati (`logs/`)
- output della suite di test del backend e del build TypeScript (`logs/`)
- verifica testuale che `requireOperator` resti montato sugli altri router
- nessuno screenshot: nessuna UI toccata in questo task

## Risks

- **Esposizione dell'anagrafica senza autenticazione.** Il contenuto è open data AIFA (licenza
  CC-BY 4.0), già pubblicamente consultabile su `medicinali.aifa.gov.it`. Nessun dato di paziente
  transita da queste rotte — il vincolo è dichiarato in testa a `routes/farmaci.ts` ed è verificabile
  dal codice: le query non accettano identificativi di paziente.
- **Carico**: la ricerca diventa invocabile senza credenziali. È una `SELECT` indicizzata su
  `denominazioneNorm`, col parametro `limite` già limitato a 25 lato server. Rischio basso; se
  servirà, si aggiunge rate limiting.
- **Riduzione consapevole della protezione**, decisa dall'utente ("non deve esserci autenticazione
  adesso, sarà in futuro un discorso globale"). Va rivista quando l'autenticazione verrà affrontata
  globalmente.
- **Non risolve la causa di fondo**: `cachedGetJson` resta senza header. Qualunque futura chiamata a
  un endpoint protetto fatta con quel helper fallirà allo stesso modo, in silenzio. Segnalato come
  debito tecnico, fuori dallo scope di questo task.

## Gate Status

READY FOR IMPLEMENTATION
