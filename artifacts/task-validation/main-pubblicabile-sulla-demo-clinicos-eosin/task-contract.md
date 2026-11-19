# Task Contract

## Task

- Title: Main pubblicabile sulla demo clinicos-eosin
- Slug: main-pubblicabile-sulla-demo-clinicos-eosin
- Type: change
- Date: 2026-11-19

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |      yes |
| Config / Env         |      yes |

Note: richiesta esplicita dell'utente (2026-11-19): vedere tutto `main` online su
`clinicos-eosin.vercel.app`, con rilascio eseguito da lui. Cambia solo la politica di sicurezza
dei contenuti in `frontend/vercel.json` (elenco degli host a cui il frontend può collegarsi) e la
documentazione. Nessuna modifica a codice applicativo, backend, Prisma, `VITE_API_URL` o riscritture.

## Current Behaviour

Da #532 `frontend/vercel.json` ammette in `connect-src` il solo backend del sito development
(`development-backend-development-a4a4.up.railway.app`). Un frontend costruito da `main` e
pubblicato su `clinicos-eosin.vercel.app` non può chiamare il backend della demo
(`clinicos-backend-production-df88.up.railway.app`): il browser blocca ogni richiesta.
`CLAUDE.md` dichiara la demo dismessa e vieta di pubblicarvi.

## Expected Behaviour

Lo stesso `main` funziona su entrambi i siti: `connect-src` ammette il backend development e i due
host della demo ammessi prima di #532. La documentazione dice che la demo è di nuovo una
destinazione scelta dall'utente e descrive i passi di rilascio, che esegue l'operatore.

## Acceptance Criteria

- AC1: `connect-src` in `frontend/vercel.json` contiene il backend development e i due host demo
  presenti prima di #532 (`clinicos-backend-demo.up.railway.app`,
  `clinicos-backend-production-df88.up.railway.app`), più `'self'` e `login.microsoftonline.com`;
  nessun'altra direttiva della politica cambia; la riscrittura SPA resta `"/((?!assets/).*)"`.
- AC2: `frontend/vercel.json` resta JSON valido; build frontend e suite frontend passano.
- AC3: `CLAUDE.md` e `docs/operations/demo-release.md` descrivono la scelta e i passi di rilascio
  sulla demo, dichiarando ciò che non è stato verificato da questa sessione.
- AC4: nessun workflow viene riattivato o avviato e nulla viene pubblicato da questa sessione.

## Test Plan

| Test type                 | Required | Reason                                                        |
| ------------------------- | -------: | ------------------------------------------------------------- |
| Unit                      |      yes | suite frontend esistente + controllo del contenuto del JSON   |
| Integration               |       no |                                                               |
| API                       |       no | backend non toccato                                           |
| Playwright                |       no | nessuna modifica visibile in locale: la politica vale su Vercel |
| Persistence after refresh |       no |                                                               |
| Agnos action registry     |       no |                                                               |
| Voice simulation          |       no |                                                               |
| OCR/import test           |       no |                                                               |
| Security/privacy scan     |      yes | confronto della politica prima/dopo: cambia solo `connect-src` |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- confronto della politica prima/dopo in `logs/`

## Risks

- Allarga gli host raggiungibili dal sito development ai due backend della demo (stessa
  organizzazione, dati sintetici): accettato per avere una sola sorgente per i due siti.
- La verifica vera è sul sito pubblicato: da questa sessione Vercel e Railway non sono raggiungibili.
- Il backend della demo va aggiornato insieme al frontend, altrimenti le funzioni nuove
  (bozze uniche, API dati sintetici) non rispondono.

## Gate Status

READY FOR IMPLEMENTATION
