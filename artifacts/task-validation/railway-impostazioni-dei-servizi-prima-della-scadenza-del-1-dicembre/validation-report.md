# Task Validation Report

## Task

- Title: Railway: impostazioni dei servizi prima della scadenza del 1 dicembre
- Slug: railway-impostazioni-dei-servizi-prima-della-scadenza-del-1-dicembre
- Commit: solo documentazione (nessun codice applicativo)
- Date: 2026-11-24

## Implementation Summary

Analisi della scadenza e preparazione del passaggio; la modifica sulle impostazioni dei servizi
della demo non è stata eseguita.

- Fonte: https://docs.railway.com/infrastructure-as-code — i file `railway.json` non vengono più
  letti dal 2026-12-01; dopo valgono i valori salvati nel servizio.
- Letto, in sola lettura, lo stato di demo e sviluppo isolato: i rilasci di oggi prendono 6–7
  impostazioni dal file (`configFile`, `propertyFileMapping` dei rilasci `87e2b4ae` e `3f4568ac`).
  Sulla demo i valori salvati sono diversi dal file; sul sito di sviluppo coincidono già.
- Conseguenza concreta sulla demo: il backend ha `NODE_ENV=production` e il comando di build salvato
  non ha `--include=dev`; un rilascio dopo la scadenza rischia di fallire alla build (Railway lascia
  in funzione la versione precedente).
- Scritti in `docs/operations/demo-release.md` i valori da impostare e la prova da fare; stato del
  sito di sviluppo in `development-release.md`.

## Files Changed

- `docs/operations/demo-release.md`, `docs/operations/development-release.md`.

## Acceptance Criteria Result

| AC  |  Result | Evidence                                                                                                                               |
| --- | ------: | -------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | BLOCKED | valori attuali registrati in `evidence/`; l'aggiornamento (`serviceInstanceUpdate`) è stato negato dai controlli di sicurezza della sessione |
| AC2 | BLOCKED | dipende da AC1                                                                                                                         |
| AC3 | BLOCKED | dipende da AC1                                                                                                                         |
| AC4 | BLOCKED | dipende da AC2 e AC3                                                                                                                   |
| AC5 |    PASS | sezioni nuove in `demo-release.md` e `development-release.md`; il sito di sviluppo non è stato modificato                               |

## Test Results

| Test             |  Result | Evidence                                                                |
| ---------------- | ------: | ----------------------------------------------------------------------- |
| Unit             |      NA |                                                                         |
| Integration      |      NA |                                                                         |
| API              |    PASS | letture delle impostazioni e dei rilasci (demo e sviluppo), `evidence/` |
| Playwright       | BLOCKED | da fare dopo i rilasci di prova                                         |
| Persistence      |      NA |                                                                         |
| Agnos AI         |      NA |                                                                         |
| Voice            |      NA |                                                                         |
| OCR              |      NA |                                                                         |
| Security/privacy |    PASS | nessun segreto nei file di evidenza né nei documenti                    |

## Runtime Evidence

`evidence/demo-backend-impostazioni-salvate-2026-11-24.json`,
`evidence/demo-servizio-ai-impostazioni-salvate-2026-11-24.json`: valori salvati oggi, da usare anche
per un eventuale ripristino.

## Logs

Only sanitized logs are allowed. Nessun log allegato.

## Final Decision

BLOCKED
