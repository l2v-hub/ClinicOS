# Task Validation Report

## Task

- Title: Railway: impostazioni dei servizi prima della scadenza del 1 dicembre
- Slug: railway-impostazioni-dei-servizi-prima-della-scadenza-del-1-dicembre
- Commit: solo documentazione (nessun codice applicativo); modifica alle impostazioni dei servizi
  demo su Railway, autorizzata dall'utente il 2026-11-24
- Date: 2026-11-24

## Implementation Summary

- Fonte: https://docs.railway.com/infrastructure-as-code — i file `railway.json` non vengono più
  letti dal 2026-12-01; dopo valgono i valori salvati nel servizio.
- Sulla demo i valori salvati erano diversi dal file (build del backend senza `--include=dev` con
  `NODE_ENV=production`: dopo la scadenza i rilasci rischiavano di fallire alla build).
- Allineati i valori salvati dei due servizi demo a quelli dei file con `serviceInstanceUpdate`
  (nessun rilascio avviato). Valori precedenti registrati per un eventuale ripristino.
- Prova: rilascio di entrambi i servizi da sorgenti senza i due file → riusciti, nessun file letto,
  stesse impostazioni effettive.
- Il formato nuovo di Railway (`.railway/railway.ts`) non è stato adottato: gestisce l'intero
  progetto e può eliminare risorse non dichiarate. I due `railway.json` restano nel repository.
- Sito di sviluppo: solo letto; i valori salvati coincidono già con i file.

## Files Changed

- `docs/operations/demo-release.md`, `docs/operations/development-release.md`.

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                   |
| --- | -----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | `evidence/demo-*-impostazioni-salvate-2026-11-24.json` (prima) e `evidence/demo-*-impostazioni-dopo.json` (dopo): valori uguali ai file; ultimo rilascio invariato dopo la modifica |
| AC2 |   PASS | `evidence/rilasci-di-prova-senza-file.json`: backend `c454e30d` SUCCESS, `configFile` assente, build/pre-deploy/avvio/salute/riavvio identici al rilascio `87e2b4ae`      |
| AC3 |   PASS | stesso file: servizio AI `6f972d8e` SUCCESS, `configFile` assente, Dockerfile, avvio, salute e riavvio identici al rilascio `3f4568ac`                                    |
| AC4 |   PASS | `evidence/milo-evals-dopo-i-rilasci-di-prova.json`: nove prove su nove contro il sito                                                                                      |
| AC5 |   PASS | sezioni nuove in `demo-release.md` e `development-release.md`; nessuna modifica al sito di sviluppo                                                                        |

## Test Results

| Test             | Result | Evidence                                                                       |
| ---------------- | -----: | ------------------------------------------------------------------------------ |
| Unit             |     NA |                                                                                |
| Integration      |     NA |                                                                                |
| API              |   PASS | letture delle impostazioni e dei rilasci (demo e sviluppo), prima e dopo       |
| Playwright       |   PASS | prove di Milo contro il sito dopo i rilasci di prova (9/9)                     |
| Persistence      |     NA |                                                                                |
| Agnos AI         |     NA |                                                                                |
| Voice            |     NA |                                                                                |
| OCR              |     NA |                                                                                |
| Security/privacy |   PASS | nessun segreto nei file di evidenza né nei documenti (solo comandi e percorsi) |

## Runtime Evidence

Demo, ambiente `production`: rilasci di prova backend `c454e30d` e servizio AI `6f972d8e`, entrambi
da sorgenti senza `railway.json`, lasciati in funzione (stesso codice di `main`).

## Logs

Only sanitized logs are allowed. Nessun log allegato: le evidenze sono le risposte dell'API di
Railway ridotte a impostazioni e stato dei rilasci.

## Final Decision

CLOSED — VERIFIED
