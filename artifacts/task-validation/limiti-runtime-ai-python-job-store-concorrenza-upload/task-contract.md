# Task Contract

## Task
- Title: Limiti runtime AI Python job store concorrenza upload
- Slug: limiti-runtime-ai-python-job-store-concorrenza-upload
- Type: feature
- Date: 2026-07-31

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | yes |
| Voice | no |
| OCR / Import | yes |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | yes |

## Current Behaviour

`clinicos_ai/api/app.py`: `_JOBS: dict[str, dict] = {}` (riga 37) e' un dizionario in RAM senza
TTL/eviction — cresce indefinitamente, si perde ad ogni riavvio del processo. `RuntimeConfig` legge
gia' `max_concurrency` (default 2, env `AI_MAX_CONCURRENCY`) e `job_max_duration_seconds` (default
1800, env `AI_JOB_MAX_DURATION_SECONDS`) ma nessuno dei due e' applicato: `run_job`/`retry_job`
chiamano `asyncio.create_task(_process(job_id))` (righe 168, 209) senza alcun semaforo ne' timeout.
`CreateJobRequest`/`RuntimeFile` (domain/contracts.py) non hanno limiti di dimensione su
`content_base64`; `create_job` (riga 148-156) e `_process` (riga 78, `base64.b64decode`) non
validano la dimensione prima di allocare in RAM.

## Expected Behaviour

I job completati/cancellati/falliti da piu' di N minuti vengono rimossi periodicamente da `_JOBS`
(garbage-collect, non serve persistenza esterna per questo task — resta un dizionario in RAM ma
limitato). Il numero di job in esecuzione simultanea e' limitato da `asyncio.Semaphore(max_concurrency)`
letto da `_REGISTRY`. Ogni job ha un timeout complessivo basato su `job_max_duration_seconds`, oltre
il quale viene marcato come fallito invece di restare bloccato indefinitamente. `create_job` rifiuta
(413) richieste il cui totale di `content_base64` (somma su tutti i file del job) supera un limite
configurabile (nuova env `AI_MAX_UPLOAD_BYTES`, default ragionevole es. 50MB) PRIMA di allocare
qualunque decodifica.

## Acceptance Criteria

- AC1: esiste un meccanismo che rimuove da `_JOBS` i job in stato terminale
  (`review_ready`/`failed`/`cancelled`) piu' vecchi di una soglia configurabile (es. 60 minuti);
  non rimuove mai job in corso (`queued`/`running`/`validating`/`repairing`).
- AC2: `run_job`/`retry_job` acquisiscono un `asyncio.Semaphore(max_concurrency)` prima di eseguire
  `_process`; con `max_concurrency=2` (default), un terzo job concorrente resta in coda invece di
  partire subito (osservabile: lo stato resta `queued` finche' un altro non libera lo slot).
- AC3: `_process` applica `asyncio.wait_for(..., timeout=job_max_duration_seconds)`; se scade, il
  job passa a `status="failed"` con un errore esplicito invece di restare `running` per sempre.
- AC4: `create_job` calcola la dimensione totale stimata di `content_base64` su tutti i file del
  job PRIMA di qualunque decodifica, e risponde `413` se supera `AI_MAX_UPLOAD_BYTES`
  (nuova env, default 50_000_000 byte ≈ 50MB, configurabile via `RuntimeConfig`).
- AC5: nessuna regressione sul comportamento per un job singolo entro i limiti (stesso
  status/flow di oggi).
- AC6: i test Python esistenti (`tests/`) continuano a passare; aggiunti test per AC1-AC4 dove
  ragionevolmente isolabili senza rete (mock/provider `mock`).

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Test isolati (no rete) per garbage-collect job scaduti, semaforo di concorrenza (es. con provider mock e job fittizi), rifiuto upload oversize, timeout job (con un mock che dorme piu' del timeout). |
| Integration | no | Nessuna dipendenza da Postgres/servizi esterni per questo modulo (il runtime AI non tocca il DB clinico). |
| Security/privacy scan | no | Nessun nuovo secret; limite dimensione riduce il rischio di DoS, non lo introduce. |

## Evidence Plan

Required evidence:

- validation-report.md
- output `python -m unittest discover -s tests` (o runner del progetto)

## Risks

- **Comportamento sotto carico non misurabile in questa sessione**: i test unitari possono provare
  la logica (semaforo, timeout, GC, limite dimensione) ma non un carico realistico multi-processo;
  accettabile per questo task, il valore aggiunto e' evitare i casi patologici piu' ovvi (job che
  non finiscono mai, upload enormi).
- **Timeout troppo aggressivo**: `job_max_duration_seconds` di default e' 1800s (30 min) — se
  troppo basso per documenti grandi in produzione, alcuni job legittimi potrebbero fallire per
  timeout. Nessuna modifica al default in questo task, solo applicazione del valore gia'
  configurato.

## Gate Status

READY FOR IMPLEMENTATION
