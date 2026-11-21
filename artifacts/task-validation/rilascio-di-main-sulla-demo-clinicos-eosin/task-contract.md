# Task Contract

## Task

- Title: Rilascio di main sulla demo clinicos-eosin
- Slug: rilascio-di-main-sulla-demo-clinicos-eosin
- Type: change
- Date: 2026-11-21

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |       no |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |      yes |

Note: operazione di rilascio, nessuna modifica al codice applicativo. Cambiano solo i servizi
pubblicati (Railway: backend, database e runtime AI della demo; Vercel: deployment di produzione e
alias `clinicos-eosin.vercel.app`) e la documentazione di rilascio. Richiesta esplicita
dell'utente (2026-11-20/21: «Procedi tu a tutto questo ti do tutti i diritti», «procedi con il
backend», «Procedi»), che supera per questa operazione la regola «nulla viene pubblicato da questa
sessione» del task `main-pubblicabile-sulla-demo-clinicos-eosin`. Contratto scritto durante il
rilascio, non prima: nessun file applicativo è stato modificato.

## Current Behaviour

`https://clinicos-eosin.vercel.app` risponde 404 `DEPLOYMENT_NOT_FOUND` (alias staccato). Sul
progetto Railway «glistening-friendship» backend, database `Postgres` e runtime AI sono fermati a
mano; il backend `clinicos-backend-production-df88` risponde 502; l'ambiente Railway «demo»
(`clinicos-backend-demo.up.railway.app`) non esiste più. La demo ha servito per l'ultima volta il
commit `b5e79ae7` (4 novembre).

## Expected Behaviour

La demo serve `main` (`1a805c83`): backend aggiornato e raggiungibile, frontend nuovo collegato a
quel backend, nessun dato modificato a mano.

## Acceptance Criteria

- AC1: il backend della demo esegue il commit `1a805c83` (deployment Railway SUCCESS con quel
  commit), `/health` risponde `{"status":"ok"}`, le migrazioni sono applicate solo in avanti.
- AC2: `https://clinicos-eosin.vercel.app` risponde 200 e serve un bundle costruito da `main`
  `1a805c83` che chiama `https://clinicos-backend-production-df88.up.railway.app`.
- AC3: sul sito pubblicato: accesso con un profilo simulato, Turno, Pazienti, «Nuovo ingresso»,
  Agenda e Consegne si aprono; nessun errore in console, nessuna risposta API ≥ 400, nessun errore
  CORS o CSP.
- AC4: nessun seed, wipe, SQL manuale o cancellazione sui dati della demo; nessuna modifica alle
  variabili salvate (Railway e Vercel, compreso `VITE_API_URL`); nessun file applicativo cambiato.
- AC5: `docs/operations/demo-release.md` riporta i target reali trovati e i passi eseguiti.

## Test Plan

| Test type                 | Required | Reason                                                  |
| ------------------------- | -------: | ------------------------------------------------------- |
| Unit                      |       no | nessun codice cambiato (suite già verde su `1a805c83`)  |
| Integration               |       no |                                                         |
| API                       |      yes | `/health` e rotte protette sul backend pubblicato       |
| Playwright                |      yes | navigazione sul sito pubblicato, console e risposte API |
| Persistence after refresh |       no | nessun dato scritto                                     |
| Agnos action registry     |       no |                                                         |
| Voice simulation          |       no |                                                         |
| OCR/import test           |       no |                                                         |
| Security/privacy scan     |      yes | CSP e CORS osservati sul sito pubblicato                |

## Evidence Plan

Required evidence:

- validation-report.md
- `logs/release-log.md` (identificativi dei deployment, esiti)
- `logs/live-http-checks.txt`
- `test-results/live-browser.txt`
- `screenshots/live/*.png`

## Risks

- Riaccendere database e runtime riattiva i costi Railway della demo.
- La variabile `VITE_API_URL` salvata su Vercel punta a un servizio cancellato: una build fatta da
  Vercel la userebbe. Il bundle pubblicato è costruito qui con l'indirizzo del backend della demo.

## Gate Status

READY FOR IMPLEMENTATION
