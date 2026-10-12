# ClinicOS — verifica funzionale del 12 ottobre 2026

Le correzioni di questa consegna risolvono #441, #442, #460 e i due difetti riprodotti durante il nuovo audit, #463 e #464. La branch `codex/qa-retry-2026-10-12` integra `main` a `224a7e68`, incluse le modifiche del Turno per ruolo (#446). La precedente PR #431 è già unita: questa consegna usa una nuova PR e preserva le modifiche intervenute su `main`.

## Difetti e comportamento verificato

| Issue | Correzione e prova                                                                                                                                                                                                                                                                                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #441  | Una dose una tantum alle 11:30, con fasce legacy vuote, appare nel giorno e nella fascia prescritti. HTTP, assistente e writer usano l'ora esplicita; date, fasce e ore estranee restano rifiutate. La salvaguardia di `main` contro una seconda dose dopo lo spostamento dell'orario resta attiva.                                                                            |
| #442  | La prova correzione/conferma dell'assistente coordina l'ingresso e il rilascio dell'operazione con promesse, invece di pause di 100/400 ms. Restano le verifiche del completamento, replay e unica scrittura.                                                                                                                                                                  |
| #460  | `requestId` facoltativo salva atomicamente il primo risultato e lo restituisce sui retry con `Idempotent-Replayed: true`. Un payload diverso con la stessa chiave riceve 409; il replay ricontrolla lo scope attuale. `expectedStato: da_erogare` impedisce alla conferma di sovrascrivere il rifiuto di un collega. Giro, cartella, Turno e assistente condividono il writer. |
| #463  | Prima di cercare i nomi delle prescrizioni, la cartella legge lo stato del catalogo AIFA. Con catalogo vuoto, 106 prescrizioni producono zero ricerche automatiche per nome. La fonte indisponibile resta distinta dal farmaco non trovato; i limiti pubblici non vengono aumentati.                                                                                           |
| #464  | Giorno e ora dell'assistente e della coda terapia usano `Europe/Rome`. Alle 00:30 italiane, la dose delle 08:00 non è già in ritardo. Prove pure e PostgreSQL coprono mezzanotte, cambio d'anno e i due cambi dell'ora legale.                                                                                                                                                 |

Per #460 la prova browser perde intenzionalmente la risposta dopo il salvataggio HTTP 200: la GUI mostra un esito non verificabile. Dopo reload, il retry riusa la stessa chiave, restituisce il primo record, non cambia autore/ora/esito e lascia una sola registrazione e una sola ricevuta. Le chiavi persistite in `sessionStorage` contengono digest, nonce e scadenza, senza testo clinico o token. Le risposte tardive di una sessione precedente non producono un successo nella nuova sessione.

## Verifiche eseguite

Tutti i controlli usano PostgreSQL 16 locale e dati sintetici. Le prove sono in [functional-retry-2026-10-12](../artifacts/task-validation/functional-retry-2026-10-12/README.md), con riepiloghi e hash. I risultati del 10 ottobre restano storici e separati.

| Controllo                                        | Esito                                                                                                                                     |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend completo dopo integrazione di #446      | 1.379 passati, zero falliti/saltati                                                                                                       |
| Backend completo, due fasi del runner            | 1.931 test: 1.926 passati, zero falliti, 5 skip per harness dedicati                                                                      |
| Archivio documenti, harness PostgreSQL dedicato  | 6/6 passati, nessuno skip                                                                                                                 |
| Regresso ruoli, cluster PostgreSQL dedicato      | 4/4 passati, nessuno skip; guardia sul vero `data_directory` mantenuta                                                                    |
| API, accessi e operazioni cliniche               | 489/489 passati                                                                                                                           |
| Browser, cinque ruoli, cartelle e mobile         | 92 viste, zero alert/overflow/errori JavaScript/HTTP rilevati                                                                             |
| Terapie con inventario completo                  | 8/8 controlli: 106 prescrizioni, 105 attive e una sospesa; PRN, feed mancante, due dosi indipendenti, una tantum, catalogo vuoto e mobile |
| Retry dopo risposta persa                        | Passato: una scrittura, una ricevuta, record immutato dopo reload                                                                         |
| Moduli clinici, ciclo HTTP e PDF                 | 7/7 tipi: salvataggio, finalizzazione, replay e PDF verificati                                                                            |
| Isolamento sessione su risposta reale trattenuta | Passato: OSS riceve 403; nessuna narrativa del medico nella cache o nel DOM                                                               |
| Import terapia sul codice corrente               | Passato: 5 voci rilevate, 3 persistite secondo la selezione esplicita                                                                     |
| Mezzanotte/ora legale e regressioni collegate    | 35/35 test mirati passati; già compresi nella suite backend                                                                               |
| Build frontend e backend                         | Passate                                                                                                                                   |
| Scanner segreti e contratto CI                   | Zero segreti rilevati; 6/6 test configurazione passati                                                                                    |

Gli skip standard comprendono archivio e quattro prove di conservazione dei ruoli: gli harness separati verificano questi casi senza rimuovere le guardie. Non sommare test mirati e suite complete come coperture indipendenti. L'integrazione di #446 modifica solo frontend e prove browser: il backend verificato non cambia con quel merge; frontend e browser sono stati rieseguiti sul risultato integrato.

Il lint globale ha debito preesistente. Il confronto dei sei file frontend di questa correzione con `acc99af3` conserva le 13 segnalazioni esistenti senza aggiungerne: non si dichiara il lint globale verde. La prima esecuzione browser concorrente si è interrotta sul login con 401; le due esecuzioni successive complete, in sequenza e poi sul nuovo `main`, hanno verificato 92 viste senza errori. Nessuna risposta HTTP negativa viene filtrata dal controllo finale.

## Copertura funzionale

Le prove API comprendono capability e scope dei cinque ruoli, anonimato, token alterato/revocato, pazienti e duplicati, contatti e campi malformati, prescrizioni e giorni validi, dosi multiple e PRN, parametri con replay/concorrenza, narrativa e diario, agenda con conflitti, consegne e letture, occupazione di letti concorrente, assistente con preview/cancel e moduli. Le suite complete aggiungono parsing e riconciliazione import, schemi insulinici e pompe, dose autorevole, paginazione e conteggi oltre 50/100, revisioni e snapshot, PDF, rollback e policy.

Non si attesta copertura del 100% né assenza di qualsiasi bug. Provider AI/OCR/STT reali, Entra, dati reali, screen reader e dispositivi fisici richiedono verifiche dedicate. Un job CI `real-provider` verde può essere uno skip protetto: non certifica il provider effettivo. Le ulteriori proposte UX aperte nel frattempo sono distinte dalle cinque correzioni di questa consegna; #446 è già integrata da `main`.

## Riproduzione e rilascio

```bash
npm run build
npm test --workspace frontend
DATABASE_URL='postgresql://clinicos:clinicos_password@127.0.0.1:5432/clinicos_test?schema=public' AUTH_MODE=demo NODE_ENV=test npm test --workspace backend
node --test scripts/ci/ai-import-e2e-config.test.mjs
```

Per `e2e/qa-*` specificare i server locali con `QA_BACKEND_URL` e `QA_FRONTEND_URL`, `/usr/bin/chromium` con `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` e, dove richiesto, il paziente sintetico. Le prove che scrivono nel database non devono condividere contemporaneamente lo stesso database. La verifica di navigazione va eseguita su un server già avviato senza riavvii durante la sessione.

Sono presenti 59 migrazioni. Applicare `20261012224500_scheduled_administration_receipts` prima dell'attivazione del backend che accetta retry con chiave; crea una tabella vuota di ricevute, indice e relazione al paziente, senza riscrivere le somministrazioni. Distribuire backend/migrazione prima del frontend. Restano compatibili i client precedenti privi di chiave; per essi non si dichiara la nuova garanzia di replay. La verifica della CI deve riferirsi allo SHA finale della nuova PR, e quella del rilascio di #432 al backend effettivamente distribuito.

## Produzione

Non sono state eseguite cancellazioni, migrazioni o seed sulla produzione. Il binding `CLINICOS_PRODUCTION_DATABASE_URL` non è disponibile nel runtime; la scelta tra dati clinici e intero contenuto, inclusi accessi/configurazioni, è ancora da definire. Non esiste un backup produttivo creato e ripristinato da questa sessione. La procedura concreta resta [production-database-cleanup.md](production-database-cleanup.md); l'inventario disponibile è esclusivamente READ ONLY. Configurare il binding privatamente nelle impostazioni dell'ambiente, mai in chat.
