# Task Validation Report

## Task

- Title: Rilascio di main sulla demo clinicos-eosin
- Slug: rilascio-di-main-sulla-demo-clinicos-eosin
- Commit pubblicato: `1a805c83` (`main`)
- Date: 2026-11-21

## Implementation Summary

Rilascio eseguito da questa sessione su richiesta esplicita dell'utente, con i suoi token Vercel e
Railway. Riacceso il database `Postgres` e il runtime AI della demo (stesse immagini), pubblicato
il backend `1a805c83` su Railway, pubblicato il frontend `1a805c83` in produzione su Vercel e
riattaccato l'alias `clinicos-eosin.vercel.app`. Dettaglio e identificativi:
`logs/release-log.md`.

## Files Changed

Solo documentazione ed evidenze: `docs/operations/demo-release.md`, questa cartella. Nessun file
applicativo.

## Acceptance Criteria Result

| AC  | Result | Evidence |
| --- | -----: | -------- |
| AC1 | PASS | `logs/release-log.md` passo 5 (deployment `692f44ec` SUCCESS, commit `1a805c83`, «No pending migrations to apply»); `logs/live-http-checks.txt`: `/health` → `{"status":"ok"}`, `/patients` senza accesso → 401 |
| AC2 | PASS | `logs/live-http-checks.txt`: sito 200, bundle con `VITE_API_URL` = backend `…-df88`; deployment `dpl_HEvo2xFKVzPQrXJbfYhn9FVkwmis` costruito dall'albero di `1a805c83` |
| AC3 | PASS | `test-results/live-browser.txt`, `screenshots/live/`: accesso «Medico 1», Turno, Pazienti, Nuovo ingresso, Agenda, Consegne; 27 risposte API tutte < 400, nessun errore di console. Visibili le regole nuove (16px fra i blocchi, controlli 44px) |
| AC4 | PASS | nessun seed/wipe/SQL; variabili salvate invariate (l'indirizzo è passato alla sola build locale); `git status`: solo documenti ed evidenze |
| AC5 | PASS | `docs/operations/demo-release.md` aggiornato con i target reali e le trappole trovate |

## Test Results

| Test             | Result | Evidence |
| ---------------- | -----: | -------- |
| Unit             |     NA | nessun codice cambiato |
| Integration      |     NA | |
| API              |   PASS | `logs/live-http-checks.txt` |
| Playwright       |   PASS | `test-results/live-browser.txt`, `screenshots/live/` (sul sito pubblicato) |
| Persistence      |     NA | nessun dato scritto |
| Agnos AI         |     NA | runtime riacceso, assistente non provato |
| Voice            |     NA | |
| OCR              |     NA | |
| Security/privacy |   PASS | nessun errore CSP/CORS nel browser; chunk mancante → 404 text/plain (riscrittura SPA corretta) |

## Runtime Evidence

Verifica fatta sul sito pubblicato `https://clinicos-eosin.vercel.app` e sul backend
`https://clinicos-backend-production-df88.up.railway.app` il 2026-11-21 alle 07:40 UTC.

## Logs

Only sanitized logs are allowed. `logs/release-log.md`, `logs/live-http-checks.txt`.

## Residual Risks

- **Demo senza pazienti**: `GET /admin/synthetic-data` (amministratore) conta 0 pazienti, 0 terapie,
  0 appuntamenti; restano 13 camere, 16 letti, 9 operatori. Le pagine si aprono ma vuote. Il seed
  (`POST /admin/synthetic-data/seed`) non è stato lanciato: serve una decisione dell'utente.
- `VITE_API_URL` salvata su Vercel punta a `clinicos-backend-demo`, che non esiste più: una build
  fatta da Vercel (dashboard o `vercel deploy` senza `--prebuilt`) produrrebbe un sito senza
  backend. Va corretta dall'utente o ripetuta la build locale (vedi `docs/operations/demo-release.md`).
- Database e runtime riaccesi: i costi Railway della demo ripartono.
- Runtime AI alla versione del 3 ottobre (la correzione vocale di #532 non è pubblicata); assistente
  non provato.
- Nessuna revisione indipendente: operazione di rilascio, nessun codice.

## Final Decision

CLOSED — VERIFIED
