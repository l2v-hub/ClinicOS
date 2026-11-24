# Task Contract

## Task

- Title: Railway: impostazioni dei servizi prima della scadenza del 1 dicembre
- Slug: railway-impostazioni-dei-servizi-prima-della-scadenza-del-1-dicembre
- Type: change
- Date: 2026-11-24

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

Note: richiesta dell'utente (2026-11-24): «ok preparalo tu, ti apro l'accesso a docs.railway.com».
Fonte: https://docs.railway.com/infrastructure-as-code — «Existing Config as Code files stop being
read on 2026-12-01 (hard cutoff)». Nessun codice applicativo cambia.

## Current Behaviour

- A ogni rilascio Railway legge `railway.json` (backend) e `clinicos-ai-runtime/railway.json`
  (servizio AI) dal repository: i loro valori prevalgono su quelli salvati nel servizio.
- Dal 1° dicembre 2026 quei file non vengono più letti: valgono i valori salvati nel servizio.
- **Demo**: i valori salvati sono diversi dal file. Backend: build `npm install && npx prisma generate
  && npm run build:backend` (senza `--include=dev`), migrazione `npx prisma migrate deploy`, avvio
  `npm --prefix backend run start`, 10 riavvii. Servizio AI: nessun comando di avvio, percorso del
  Dockerfile diverso, 10 riavvii. Nessuno di questi è stato provato con il codice attuale.
- **Sviluppo isolato**: i valori salvati coincidono già con il file.

## Expected Behaviour

- Sulla demo i valori salvati nei due servizi coincidono con quelli dei file: dopo il 1° dicembre un
  rilascio si comporta come oggi (stessa build, stessa migrazione prima dell'avvio, stesso avvio,
  stesso controllo di salute, stessa regola di riavvio).
- Provato prima della scadenza: un rilascio fatto da sorgenti SENZA i file riesce e usa le stesse
  impostazioni.
- La procedura di rilascio dice dove stanno ora le impostazioni.
- Nessuna modifica al sito di sviluppo senza autorizzazione esplicita.

## Acceptance Criteria

- AC1: valori salvati dei due servizi demo uguali ai file, con i valori precedenti registrati per
  poterli ripristinare.
- AC2: un rilascio del backend demo da un commit senza `railway.json` riesce; le impostazioni
  effettive del rilascio sono uguali a quelle del rilascio precedente (build, migrazione, avvio,
  salute, riavvio) e nessun file di configurazione risulta letto.
- AC3: lo stesso per il servizio AI demo, da sorgenti senza `clinicos-ai-runtime/railway.json`.
- AC4: dopo i due rilasci il sito risponde e Milo funziona (prove contro il sito).
- AC5: `docs/operations/demo-release.md` e `development-release.md` descrivono la scadenza e dove
  stanno le impostazioni; lo stato del sito di sviluppo è riportato senza modificarlo.

## Test Plan

| Test type                 | Required | Reason                                         |
| ------------------------- | -------: | ---------------------------------------------- |
| Unit                      |       no | nessun codice applicativo                      |
| Integration               |       no |                                                |
| API                       |      yes | lettura delle impostazioni e dei rilasci       |
| Playwright                |      yes | prove di Milo contro il sito dopo i rilasci    |
| Persistence after refresh |       no |                                                |
| Agnos action registry     |       no |                                                |
| Voice simulation          |       no |                                                |
| OCR/import test           |       no |                                                |
| Security/privacy scan     |      yes | nessun segreto in log, documenti o impostazioni |

## Evidence Plan

Required evidence:

- validation-report.md
- valori prima/dopo delle impostazioni, impostazioni effettive dei rilasci di prova
- esito delle prove contro il sito

## Risks

- Un valore salvato sbagliato farebbe fallire la build o l'avvio del rilascio successivo: Railway
  lascia in funzione la versione precedente. Mitigazione: rilascio di prova subito, valori precedenti
  registrati.
- Il formato nuovo di Railway (`.railway/railway.ts`) gestisce l'intero progetto e può eliminare le
  risorse non dichiarate (database, volumi): non viene adottato qui.
- Rimuovere i file da `main` non è necessario per la scadenza; si fa solo dopo aver verificato anche
  il sito di sviluppo.

## Gate Status

READY FOR IMPLEMENTATION
