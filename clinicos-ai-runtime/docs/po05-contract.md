# PO05 runtime unit recovery contract

Scope: `clinicos-ai-runtime/**`, baseline `ef562bf5`, branch
`codex/po05-runtime-recovery`. Backend checkpoint storage, fencing, page splitting,
letter grouping and `mergeExtractions` belong to the backend owner. The runtime
returns proposals and never writes to the clinical database.

## API additions (contract version 2)

`GET /v1/runtime/capabilities` adds `document_job_contract_version: 2` and
`max_upload_bytes`. The latter bounds the complete serialized HTTP create body,
including base64 overhead; the runtime's 413 response remains authoritative.
The create route consumes the request stream with a byte counter and rejects an
oversized chunk before appending it, immediately ending consumption. This also
bounds retained body data for chunked requests without `Content-Length`.

`POST /v1/document-jobs` accepts optional `input_hash`, a SHA256 hex digest, paired
with a nonblank `external_job_id` of at most 256 characters. Digests normalize to
lowercase. With both present, create is idempotent for that unit while its state
remains in RAM. Identical key, hash and payload return the same job and status
(HTTP 201, including replay). A changed hash, prompt, schema or ordered file
payload under the same key returns 409. The runtime also computes its own
canonical JSON payload fingerprint; a caller cannot hide a changed payload by
reusing the declared hash. File array order and file metadata are significant;
JSON object key order is not.

Without `input_hash`, create preserves the legacy correlation-only behavior and
creates a fresh job. Existing callers may reuse one import ID for OCR and
extraction. The backend must validate the echoed `input_hash` and integer
`attempt >= 0` before calling run: old runtimes can ignore unknown request fields.

Status and result responses add `input_hash`, `attempt`, `finish_reason` and
`truncated`. Attempt 0 means created; the first run is attempt 1. Existing paths,
status names and response fields remain available.

`POST /v1/document-jobs/{id}/run` fixes `mode` on its first execution. Repeated
requests with that mode return current state (202) without creating another task
or resetting a terminal job. A different mode after binding returns 409.

`POST /v1/document-jobs/{id}/retry` accepts optional
`{"expected_attempt": N}`. A matching failed/retryable attempt advances exactly
once. Replays with an older N return current state; a future N returns 409.
Queued/running requests are idempotent. Calls without this field remain valid
for legacy clients but do not have replay protection across completed retries.
Cancelled/successful jobs and `output_truncated`/`output_incomplete` failures cannot
be retried. Backend retry logic must persist `runtimeJobId` and `runtimeAttempt`.

`POST /v1/document-jobs/{id}/cancel` runs on the task's event loop, marks active
work cancelled and cancels its registered asyncio task, including a task waiting
for a concurrency slot. Repeated cancellation is harmless. Terminal successful
or failed jobs are preserved. Every completion/error publication checks job
identity and attempt, so cancelled or replaced work cannot publish late data.

## Completion integrity

Known output limits (`length`, `max_tokens`, etc.) produce
`status=failed`, `error.kind=output_truncated`, `truncated=true`, and result
`data=null`. Other explicit unfinished/blocked finish reasons produce
`output_incomplete`. Neither error is retryable with identical input. A valid
JSON prefix is still rejected when its finish metadata says it was truncated.

Provider adapters preserve finish metadata before Agno discards it, including
both SDK parser method names. Azure structured responses also check refusals.
Absent metadata remains `finish_reason=null`; the runtime does not invent a
successful stop reason or claim semantic completeness from valid JSON alone.

Malformed JSON gets one repair attempt using the entire response. The old
6,000-character prefix slice is removed. Above 100,000 characters, repair fails
explicitly without sending a partial prefix; a truncated repair cannot succeed.
Extraction results must be JSON objects. OCR retains its `rawText` contract.

## Durability and limits

Use one runtime process. The identity index and task registry are in-process,
not a distributed queue or a durable release authority. Retention expiry or
restart can return 404 and permit a fresh runtime job for the same backend unit.
The backend owns durable page/group checkpoints and fencing against duplicate
application writes. It sends one OCR page per unit and one ordered letter group
per extraction, then uses the existing merge logic.

Cancellation interrupts the asyncio task and blocks late publication. Python
cannot terminate an already running synchronous SDK/urllib call inside
`asyncio.to_thread`; that request may continue until its provider/socket timeout.
Loss, timeout or restart may repeat provider work and spend. Exactly-once provider
execution and a hard bound on detached provider threads are not guaranteed.

## Validation

Run `python tools/verify_po05.py` from this runtime directory using an environment
with the existing `requirements.txt` installed. No dependency manifest changes
are needed. The verifier rejects all non-loopback network connections, runs the
runtime suite (including real Uvicorn HTTP with a fake provider), and emits
`docs/po05-validation.json` with file SHA256s, environment versions and test results.
It fails on a failed/skipped test or attempted external connection.

Tests cover create replay/conflict and legacy behavior; repeated run and immutable
mode; retry after a lost response; queued/running cancellation and late results;
restart/retention recovery; stale attempt fencing; timeout; truncation even with
valid JSON; repair tail preservation; auth/input/HTTP upload guards; and capability
negotiation. Evidence is local/fake-provider only, with no production, live-model
or performance benchmark claim.
