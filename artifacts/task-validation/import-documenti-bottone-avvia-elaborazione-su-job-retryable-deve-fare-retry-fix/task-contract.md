# Task Contract

## Task

- Title: Import documenti: bottone Avvia elaborazione su job retryable deve fare retry (fix 400) + timeout runtime
- Slug: import-documenti-bottone-avvia-elaborazione-su-job-retryable-deve-fare-retry-fix
- Type: change
- Date: 2026-07-24

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |      yes |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |      yes |

## Current Behaviour

Nel modal "Importa lettera di dimissione" (DischargeImportModal), quando un job di
estrazione fallisce con stato `retryable_error` (es. timeout del runtime AI:
`[timeout] Timeout 30s` osservato in prod sul job `cmrzfmbyv007c01rxejly57o9`, 8 foto),
il bottone primario "Avvia elaborazione" resta abilitato ma invoca `POST /ai/extraction/jobs/:id/process`,
che il backend rifiuta con **400 "Job non accodabile nello stato retryable_error"**
(`enqueueJob` accetta solo `uploaded`/`validating` — backend/src/ai/upload/job-service.ts:618).
Il retry corretto è `POST /:id/retry`, esposto solo dal bottone secondario
"↻ Riprova senza ricaricare". L'operatore percepisce il bottone primario come rotto.

Causa a monte (config, fuori dal codice frontend): il runtime AI in prod ha un timeout
per-chiamata modello di 30s (variabili `AI_EXTRACTION_TIMEOUT_SECONDS` /
`AI_PROVIDER_TIMEOUT_SECONDS`, default codice 300s) insufficiente per import multi-foto.

## Expected Behaviour

Quando `job.canRetry === true`, il bottone primario del footer instrada il click su
`retry()` (`POST /:id/retry`, 202) invece di `startProcessing()` (`POST /:id/process`, 400),
con etichetta coerente ("↻ Riprova elaborazione"). Nessuna richiesta `/process` viene
emessa su un job in stato `retryable_error`. Il flusso di primo avvio (job `uploaded`)
resta invariato.

## Acceptance Criteria

- AC1: con job in stato `retryable_error` visibile nel modal, il bottone primario mostra
  l'etichetta di retry e il click produce `POST /ai/extraction/jobs/:id/retry` → HTTP 202,
  e NESSUNA `POST .../process` (che darebbe 400).
- AC2: con job appena caricato (stato `uploaded`), il bottone primario mantiene etichetta
  "Avvia elaborazione" e il click produce `POST .../process` (flusso invariato).
- AC3: nessun errore console rilevante e nessuna HTTP 4xx/5xx imprevista durante il flusso
  del test; `cd frontend && npm run build` passa.

## Test Plan

| Test type                 | Required | Reason                                                                                                                                    |
| ------------------------- | -------: | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                      |       no | logica puramente di routing onClick, coperta da Playwright                                                                                |
| Integration               |       no |                                                                                                                                           |
| API                       |       no | backend non modificato                                                                                                                    |
| Playwright                |      yes | UI flow: upload → forzatura stato retryable_error (SQL sul DB locale) → click bottone primario → assert /retry 202 e assenza /process 400 |
| Persistence after refresh |       no | nessun dato creato/modificato dal fix                                                                                                     |
| Agnos action registry     |       no |                                                                                                                                           |
| Voice simulation          |       no |                                                                                                                                           |
| OCR/import test           |       no | l'estrazione reale non è invocata (runtime AI assente in locale)                                                                          |
| Security/privacy scan     |       no | nessuna superficie auth/dati toccata                                                                                                      |

## Evidence Plan

Required evidence:

- validation-report.md
- test output (Playwright)
- screenshots (stato retryable + dopo click retry)
- Playwright trace
- build output frontend

## Risks

- Il retry con timeout runtime ancora a 30s in prod rifallirà: mitigazione = alzare
  `AI_PROVIDER_TIMEOUT_SECONDS` / `AI_EXTRACTION_TIMEOUT_SECONDS` sul servizio runtime
  Railway (azione config tracciata in questo task).
- Doppio percorso di retry (bottone primario + riga "Riprova senza ricaricare"):
  entrambi chiamano la stessa `retry()`; nessuna divergenza di stato.

## Gate Status

READY FOR IMPLEMENTATION
