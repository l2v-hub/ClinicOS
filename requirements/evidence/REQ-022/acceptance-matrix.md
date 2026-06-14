# REQ-022 — Acceptance Matrix (flusso import asincrono)

Issue #21. Route: modale "Importa lettera di dimissione" (Pazienti). Backend `/ai/extraction/jobs`.

| # | Criterio | Verifica | Stato iniziale | Stato finale | Evidenza |
|---|----------|----------|----------------|--------------|----------|
| 1 | Riceve più documenti/foto | smoke upload multiplo | PASS (REQ-014) | PASS | jobs-smoke |
| 2 | Avvio elaborazione non tiene aperta la HTTP per tutta la durata | POST process → **202** immediato, no attesa modello | FAIL (sync, 60s timeout) | PASS | async-smoke |
| 3 | Worker asincrono processa il job dalla coda | worker in-process raccoglie `queued` | assente | PASS | async-smoke |
| 4 | Stato reale sempre consultabile | GET status con stage/progress/elapsed | parziale | PASS | async-smoke |
| 5 | Validazione JSON + retry riparazione | stati validating/repairing, AJV | PASS (REQ-015) | PASS | unit |
| 6 | Precompila form Nuovo Paziente | review_ready → review UI | PASS (REQ-017) | PASS | — |
| 7 | Conserva file e risultati su timeout temporaneo | persistenza DB + reclaim su restart | FAIL (in-memory sync) | PASS | async-smoke |
| 8 | Retry senza ricaricare i documenti | POST retry → re-queue, file intatti | assente | PASS | async-smoke |
| 9 | Stati job (≥12) | created/uploaded/queued/uploading_to_google/waiting_for_model/validating_response/repairing_response/review_ready/retryable_error/failed/cancelled/confirmed | parziale (7) | PASS | schema+smoke |
| 10 | Stato per singolo file (+errorCode/Message) | colonne ImportDocument | parziale | PASS | schema |
| 11 | UI minima (stato/avanzamento/errore/retry) — no rifacimento | modale invariata + barra stato | — | PASS | screenshot |
| 12 | Nessuna regressione dati (/patients) | smoke before/after = 19 | 19 | 19 | data-smoke |
| 13 | Config non hardcoded (timeout/retry/poll) | env AI_REQUEST_TIMEOUT_MS, AI_JOB_MAX_DURATION_MS, AI_JOB_POLL_INTERVAL_MS | parziale | PASS | config |

## Note di scope
- Worker **in-process** (background loop nel servizio API) — ammesso da #21 ("riutilizzare sistema esistente / coda PostgreSQL"); un worker Railway separato resta possibile in futuro (entrypoint dedicato esportato).
- **Google Files API**: il flusso attuale invia i documenti **inline** (REQ-013/015). Mantengo inline (gli stati `uploading_to_google` mappano la fase di invio); la Files API esplicita è un'estensione del runtime Agno (#22/#23) — fuori scope qui, documentato.
- Estrazione reale Gemma resta soggetta a quota Google (429) → fallback legacy attivo. La stabilizzazione async non dipende dalla quota.
