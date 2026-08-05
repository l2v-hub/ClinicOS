# Task Validation Report

## Task
- Title: Limiti runtime AI Python job store concorrenza upload
- Slug: limiti-runtime-ai-python-job-store-concorrenza-upload
- Commit: (uncommitted at validation time)
- Date: 2026-08-05

## Implementation Summary

- `_gc_expired_jobs()` rimuove da `_JOBS` i job in stato terminale (`review_ready`/`failed`/
  `cancelled`) con `finished_at` piu' vecchio di `AI_JOB_RETENTION_SECONDS` (default 3600s);
  invocata opportunisticamente a ogni `create_job`.
- `_CONCURRENCY_SEMAPHORE = asyncio.Semaphore(max_concurrency)` acquisito come prima cosa in
  `_process()`, prima di passare lo stato a `running`.
- `asyncio.wait_for(..., timeout=job_max_duration_seconds)` attorno a `run_extraction`; su
  `asyncio.TimeoutError` il job passa a `status="failed"` con errore esplicito.
- Nuova route `_document_jobs_route` legge `Request` grezza, verifica `Content-Length` e la
  dimensione effettiva del body PRIMA del parsing Pydantic; `create_job()` ricontrola la somma
  di `content_base64` su tutti i file (difesa in profondita' per chi chiama `create_job`
  direttamente, come i test) e risponde 413 su `AI_MAX_UPLOAD_BYTES` (default 50_000_000).
- Nuovi campi `job_retention_seconds` e `max_upload_bytes` in `RuntimeConfig`
  (`configuration.py`), letti da env con default ragionevoli.

## Files Changed

- `clinicos-ai-runtime/clinicos_ai/api/app.py`
- `clinicos-ai-runtime/clinicos_ai/models/configuration.py`
- `clinicos-ai-runtime/tests/test_app_limits.py` (nuovo)

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 (GC job terminali scaduti, mai job attivi) | PASS | `JobGcTests` (5 test): rimuove terminali scaduti, ignora terminali recenti, non tocca mai job attivi anche se "vecchi", ignora terminali senza `finished_at`, invocato opportunisticamente da `create_job`. |
| AC2 (semaforo max_concurrency) | PASS | `ConcurrencySemaphoreTests.test_third_job_stays_queued_until_a_slot_frees`: con `max_concurrency=2`, un terzo job resta `queued` finche' uno dei due precedenti non rilascia il semaforo. |
| AC3 (timeout job) | PASS | `JobTimeoutTests.test_timeout_marks_job_failed_with_explicit_error`: job che eccede `job_max_duration_seconds` passa a `status="failed"` con `error.kind="timeout"` invece di restare `running`. |
| AC4 (413 su upload oltre soglia, prima della decodifica) | PASS | `UploadSizeLimitTests` (3 test): singolo file oltre soglia → 413; somma di piu' file oltre soglia → 413; upload entro il limite accettato. Verificato per ispezione che il check precede `base64.b64decode`. |
| AC5 (nessuna regressione job singolo entro i limiti) | PASS | `SingleJobRegressionTests.test_single_job_within_limits_completes_review_ready`: stesso flow/status di prima (`review_ready`) per un job entro i limiti. |
| AC6 (test esistenti continuano a passare + nuovi test) | PASS | `python -m unittest discover -s tests`: 125 test totali (114 preesistenti + 11 nuovi in `test_app_limits.py`), tutti verdi. |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | PASS | `python -m unittest discover -s tests` → `Ran 125 tests in 0.698s / OK` (dopo `pip install fastapi httpx`, mancanti nell'ambiente di validazione; non installati in precedenza, come da README "pip install -r requirements.txt — for the API/agents"). |
| Integration | NA | Non richiesto dal contract (nessuna dipendenza da Postgres/servizi esterni per questo modulo). |
| API | NA | Coperto dai test unit sulla route (`TestClient`/chiamata diretta a `create_job`), non da un server realmente in ascolto. |
| Playwright | NA | Non richiesto dal contract (nessun impatto UI). |
| Persistence | NA | `_JOBS` resta volutamente in RAM, nessuna persistenza esterna in questo task. |
| Agnos AI | NA | Non impattato direttamente (il registry/provider non sono stati modificati). |
| Voice | NA | Non pertinente. |
| OCR | NA | Non pertinente (i limiti sono a livello di job store, non di parsing OCR). |
| Security/privacy | PASS | Limite dimensione riduce il rischio di DoS da upload; nessun nuovo secret introdotto; nessun log di contenuto allegati. |

## Runtime Evidence

- Ambiente di validazione privo di dipendenze installate (`pip list` vuoto salvo pip/setuptools);
  installate `fastapi` e `httpx` per eseguire `test_app_limits.py` (coerente con le istruzioni del
  README del servizio).
- Comportamento sotto carico reale multi-processo non misurato in questa sessione (rischio gia'
  segnalato nel task-contract come accettabile per questo task).

## Logs

Only sanitized logs are allowed. Nessun log applicativo generato (solo esecuzione test unitari).

## Residual Risks

- Nessun ambiente Railway/staging disponibile in questa sessione per verificare il comportamento
  sotto carico realistico (piu' processi, GC su orizzonte lungo); il rischio era gia' accettato nel
  task-contract.
- `job_max_duration_seconds` di default resta 1800s (invariato); nessuna modifica al default in
  questo task.

## Final Decision

CLOSED — VERIFIED
