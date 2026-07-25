# Task Validation Report

## Task
- Title: Import documenti: bottone Avvia elaborazione su job retryable deve fare retry (fix 400) + timeout runtime
- Slug: import-documenti-bottone-avvia-elaborazione-su-job-retryable-deve-fare-retry-fix
- Commit: (non ancora committato — working tree)
- Date: 2026-07-24

## Implementation Summary

Fix chirurgica in `DischargeImportModal`: il bottone primario del footer ora instrada il
click su `retry()` (`POST /ai/extraction/jobs/:id/retry`) quando `job.canRetry === true`,
con etichetta "↻ Riprova elaborazione"; altrimenti resta `startProcessing()` con etichetta
"Avvia elaborazione". Prima, su un job in `retryable_error`, il bottone chiamava sempre
`/process` che il backend rifiuta con 400 "Job non accodabile nello stato retryable_error".

Parte config (causa a monte del retryable_error in prod — timeout runtime 30s): NON
applicata in questa sessione; CLI Railway senza token valido. Azione richiesta: alzare
`AI_PROVIDER_TIMEOUT_SECONDS` (o `AI_EXTRACTION_TIMEOUT_SECONDS`) sul servizio runtime AI.

## Files Changed

- `frontend/src/components/shared/DischargeImportModal.tsx` — solo footer button (onClick
  routing + etichetta condizionale). Nessun cambio backend/schema/API.

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 | PASS | Playwright: job forzato in `retryable_error` (worker locale con `AI_RUNTIME_URL` irraggiungibile), bottone primario = "↻ Riprova elaborazione", click → `POST /retry` HTTP 202, zero `POST /process` dopo il fallimento. `screenshots/ac1-stato-retryable.png`, trace in `test-results/.../trace.zip` |
| AC2 | PASS | Stesso test: primo avvio con job `uploaded` → etichetta "Avvia elaborazione", click → `POST /process` HTTP 202 (unica chiamata /process del flusso). `screenshots/ac2-retry-in-corso.png` |
| AC3 | PASS | Zero errori console nel test; `npx tsc --noEmit` pulito; `cd frontend && npm run build` exit 0 (`✓ built in 24.38s`) |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | NA | |
| Integration | NA | |
| API | NA | backend non modificato |
| Playwright | PASS | `retry-button.spec.ts` — 1 passed, 10.2s; trace on; asserzioni reali su status HTTP (202), etichette bottone, conteggio chiamate `/process`, console errors = 0 |
| Persistence | NA | nessun dato creato/modificato dal fix |
| Agnos AI | NA | |
| Voice | NA | |
| OCR | NA | estrazione reale non invocata (runtime assente in locale, per design del test) |
| Security/privacy | NA | nessuna superficie auth/dati toccata |

## Runtime Evidence

- Stack locale reale: frontend :5173 (Vite dev), backend :3001 (tsx), Postgres :5433
  (container `clinicos-e2e-265`), worker import attivo con `AI_RUNTIME_URL=http://127.0.0.1:9`
  per produrre deterministicamente `retryable_error` (kind `provider_error`, retryable).
- Screenshot: `screenshots/ac1-stato-retryable.png` (banner errore + bottone "↻ Riprova
  elaborazione"), `screenshots/ac2-retry-in-corso.png` (dopo il click di retry).
- Trace: `test-results/artifacts-task-validation--*/trace.zip`.
- Diagnosi prod di partenza (contesto): job `cmrzfmbyv007c01rxejly57o9` in `retryable_error`
  con errore `[timeout] Timeout 30s`; `POST /process` → 400 riprodotto dall'operatore.

## Logs

- Playwright: `PASS (1) FAIL (0) — Time: 10244ms` (run con `--trace on --timeout=60000`).
- Build frontend: exit 0, `✓ built in 24.38s`. Nessun log con PHI: fixture sintetica
  `logs/lettera-sintetica.txt` ("Paziente sintetico QA").

## Residual Risks

- Finché il timeout del runtime AI in prod resta 30s, il retry su import multi-foto può
  rifallire per la stessa causa: serve l'aggiornamento env su Railway (fuori dal codice).
- La riga secondaria "↻ Riprova senza ricaricare" resta visibile insieme al bottone
  primario di retry: entrambe chiamano la stessa `retry()`, nessun conflitto di stato.

## Final Decision

CLOSED — VERIFIED
