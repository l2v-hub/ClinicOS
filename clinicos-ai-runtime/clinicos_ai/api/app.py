"""FastAPI app exposing the NEUTRAL runtime API (REQ-023 §3).

No provider appears in any path. Authenticated with a shared service token
(AI_RUNTIME_SERVICE_TOKEN) — only the ClinicOS backend calls this; the frontend never
does. The runtime never touches the clinical DB: it returns proposals for the backend
to validate and persist.

Job state here is in-process (the ClinicOS backend is the system of record and persists
jobs per REQ-014/022). For multi-instance the runtime can be backed by PostgreSQL/Agno
workflow storage — see README.
"""
from __future__ import annotations

import asyncio
import base64
import logging
import os
import time
import uuid

from fastapi import FastAPI, Header, HTTPException, Request, status
from pydantic import ValidationError

from ..agents.extraction import run_extraction
from ..agents.assistant import run_assistant_plan, run_assistant_compose
from ..models.errors import RuntimeError_, ErrorKind
from ..models.env_config import safe_config_summary, llm_health_summary
from ..models.providers.base import Attachment
from ..models.providers.completion import completion_text
from ..models.registry import ModelRegistry
from ..domain.contracts import (
    CreateJobRequest, RunRequest, RetryRequest, AssistantPlanRequest, AssistantPlanResponse,
    AssistantComposeRequest, AssistantComposeResponse,
)
from .job_control import can_retry, current_attempt, existing_job

_log = logging.getLogger("clinicos_ai.runtime")
app = FastAPI(title="ClinicOS AI Runtime", version="1.0.0")
_REGISTRY = ModelRegistry()
_JOBS: dict[str, dict] = {}
_JOB_KEYS: dict[str, str] = {}
_TASKS: dict[str, asyncio.Task] = {}

# AC2: limita quanti job girano in _process() in parallelo. Un job in eccesso resta
# status="queued" (gia' impostato da run_job/retry_job prima di schedulare il task) finche'
# non tocca a lui — _process acquisisce il semaforo come prima cosa, prima di passare a
# status="running". Dimensionato su AI_MAX_CONCURRENCY via RuntimeConfig.
_CONCURRENCY_SEMAPHORE = asyncio.Semaphore(_REGISTRY.config.max_concurrency)

# AC1: stati terminali — mai gli unici stati rimossi dal garbage-collect di _JOBS.
_TERMINAL_STATUSES = ("review_ready", "failed", "cancelled")


def _gc_expired_jobs() -> None:
    """AC1: rimuove da _JOBS i job terminali (review_ready/failed/cancelled) la cui
    conclusione (`finished_at`) risale a piu' di AI_JOB_RETENTION_SECONDS fa. Non tocca mai
    un job non terminale (created/queued/running/validating/repairing/retryable_error).

    Invocata in modo opportunistico ad ogni create_job: per un servizio single-process senza
    scheduler esterno e' il punto piu' semplice e testabile per un self-cleaning periodico —
    non serve un background task/thread dedicato solo per limitare la crescita di un
    dizionario in RAM.
    """
    retention = _REGISTRY.config.job_retention_seconds
    now = time.time()
    expired_ids = [
        jid for jid, job in _JOBS.items()
        if job["status"] in _TERMINAL_STATUSES
        and job.get("finished_at") is not None
        and (now - job["finished_at"]) > retention
    ]
    for jid in expired_ids:
        job = _JOBS.pop(jid)
        key = job.get("external_job_id")
        if _JOB_KEYS.get(key) == jid:
            _JOB_KEYS.pop(key)


@app.on_event("startup")
def _log_model_config() -> None:
    # Log PHI/secret-safe: solo provider+model+source per ambito. Mai chiavi/endpoint.
    for line in safe_config_summary(os.environ):
        _log.info("model-config %s", line)


def _auth(authorization: str | None) -> None:
    token = (os.environ.get("AI_RUNTIME_SERVICE_TOKEN") or "").strip()
    if not token:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "AI_RUNTIME_SERVICE_TOKEN non configurato")
    expected = f"Bearer {token}"
    if authorization != expected:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token servizio non valido")


def _public(job: dict) -> dict:
    elapsed = int(time.time() - job["started_at"]) if job.get("started_at") else 0
    return {
        "job_id": job["id"],
        "external_job_id": job.get("external_job_id"),
        "input_hash": job.get("input_hash"),
        "attempt": job.get("attempt", 0),
        "finish_reason": job.get("finish_reason"),
        "truncated": job.get("truncated", False),
        "status": job["status"],
        "stage": job.get("stage"),
        "model": job.get("model"),
        "elapsed_seconds": elapsed,
        "can_retry": can_retry(job),
        "can_cancel": job["status"] in ("created", "queued", "running", "validating", "repairing"),
        "error": job.get("error"),
    }


async def _process(job_id: str, attempt: int | None = None) -> None:
    # AC2: finche' non c'e' uno slot libero il job resta status="queued" (impostato dal
    # chiamante prima di schedulare il task) — nulla qui sotto viene eseguito prima di
    # acquisire il semaforo, quindi lo stato non passa a "running" fuori turno.
    job = _JOBS.get(job_id)
    if job is None:
        return
    attempt = job.get("attempt", 0) if attempt is None else attempt
    try:
        async with _CONCURRENCY_SEMAPHORE:
            if not current_attempt(_JOBS, job, attempt):
                return
            job.update(status="running", stage="model_processing", started_at=time.time(), error=None)
            job["events"].append({"at": time.strftime("%H:%M:%S"), "stage": "running"})
            attachments = [
                Attachment(filename=f["filename"], mime_type=f["mime_type"],
                           data=base64.b64decode(f["content_base64"]))
                for f in job["files"]
            ]
            # AC3: un job che non conclude entro job_max_duration_seconds viene marcato
            # fallito invece di restare "running" a tempo indeterminato.
            deadline = time.monotonic() + _REGISTRY.config.job_max_duration_seconds
            out = await asyncio.wait_for(
                run_extraction(_REGISTRY, job["prompt"], job["schema"], attachments,
                               mode=job.get("mode") or "extraction"),
                timeout=_REGISTRY.config.job_max_duration_seconds,
            )
            if not current_attempt(_JOBS, job, attempt):
                return
            if time.monotonic() >= deadline:
                raise asyncio.TimeoutError()
            if out.truncated:
                raise RuntimeError_(ErrorKind.OUTPUT_TRUNCATED, "Output troncato.",
                                    finish_reason=out.finish_reason, truncated=True)
            completion_text("", out.finish_reason)
            job.update(status="review_ready", stage="completed", model=out.model, result=out.data,
                       warnings=out.warnings, finish_reason=out.finish_reason,
                       truncated=False, finished_at=time.time())
    except asyncio.CancelledError:
        if current_attempt(_JOBS, job, attempt):
            job.update(status="cancelled", stage="cancelled", result=None, finished_at=time.time())
        raise
    except RuntimeError_ as ex:
        if not current_attempt(_JOBS, job, attempt):
            return
        retryable = ex.kind in (ErrorKind.TIMEOUT, ErrorKind.RATE_LIMIT, ErrorKind.PROVIDER_ERROR,
                                ErrorKind.PROVIDER_UNAVAILABLE)
        job.update(status="retryable_error" if retryable else "failed", stage="error", result=None,
                   error=ex.to_dict(), finish_reason=ex.finish_reason, truncated=ex.truncated,
                   finished_at=time.time())
    except asyncio.TimeoutError:
        if not current_attempt(_JOBS, job, attempt):
            return
        job.update(status="failed", stage="error", result=None, finished_at=time.time(),
                   error={"kind": "timeout", "message": "Job superato il tempo massimo consentito"})
    except Exception:  # pragma: no cover
        if not current_attempt(_JOBS, job, attempt):
            return
        job.update(status="failed", stage="error", result=None, finished_at=time.time(),
                   error={"kind": "provider_error", "message": "Elaborazione del provider non riuscita"})
    if current_attempt(_JOBS, job, attempt):
        job["events"].append({"at": time.strftime("%H:%M:%S"), "stage": job["stage"]})


def _schedule(job: dict) -> None:
    """No await between state transition and registration: one task per attempt."""
    job.update(status="queued", stage="queued", error=None, finished_at=None, started_at=None,
               result=None, warnings=[], finish_reason=None, truncated=False,
               attempt=job.get("attempt", 0) + 1)
    task = asyncio.create_task(_process(job["id"], job["attempt"]))
    _TASKS[job["id"]] = task

    def done(completed):
        if _TASKS.get(job["id"]) is completed:
            _TASKS.pop(job["id"], None)
        if not completed.cancelled():
            completed.exception()

    task.add_done_callback(done)


@app.get("/v1/runtime/health")
def health():
    s = _REGISTRY.public_status()
    return {"available": s["available"], "errors": s["errors"], "roles": s["roles"]}


@app.get("/v1/runtime/capabilities")
def capabilities():
    return {**_REGISTRY.public_status(), "document_job_contract_version": 2,
            "max_upload_bytes": _REGISTRY.config.max_upload_bytes}


# issue #239 AC3: health check LLM interno, SECRET-FREE. Mostra provider/deployment selezionati
# e se endpoint/api-key sono configurati (bool), separazione OCR, stato. Nessun secret esposto,
# nessuna auth necessaria (come /v1/runtime/health): non ritorna alcun valore sensibile.
@app.get("/v1/assistant/llm-health")
def llm_health():
    return llm_health_summary(os.environ)


# 016 F1: read-planner endpoint. Riceve SOLO la domanda (nessun dato clinico), ritorna un
# piano di sole letture che il backend valida ed esegue. Usa il ruolo 'agent' già configurato.
@app.post("/v1/assistant/plan", response_model=AssistantPlanResponse)
async def assistant_plan(req: AssistantPlanRequest, authorization: str | None = Header(default=None)):
    _auth(authorization)
    try:
        out = await run_assistant_plan(_REGISTRY, req.question, req.toolSchema)
        return AssistantPlanResponse(plan=out["plan"], model=out["model"], confidence=1.0)
    except RuntimeError_ as ex:
        _log.warning("assistant plan runtime error: %s", ex.to_dict().get("message", "planner error"))
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, ex.to_dict().get("message", "planner error"))
    except Exception as ex:  # pragma: no cover
        # sanitizzato: tipo + messaggio dell'eccezione (no prompt/PHI, no dati richiesta)
        _log.error("assistant plan failed: %s: %s", type(ex).__name__, str(ex)[:300])
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"{type(ex).__name__}: {str(ex)[:200]}")


# 016 F2: compose endpoint. Riceve i RISULTATI (dati clinici) e compone la prosa citando le fonti.
# I dati clinici raggiungono il modello SOLO qui → attivare solo con host EU/self-hosted (gating
# nel backend). Il backend applica comunque il post-check anti-invenzione sull'output.
@app.post("/v1/assistant/compose", response_model=AssistantComposeResponse)
async def assistant_compose(req: AssistantComposeRequest, authorization: str | None = Header(default=None)):
    _auth(authorization)
    try:
        out = await run_assistant_compose(_REGISTRY, req.question, req.results, req.sources)
        return AssistantComposeResponse(answerText=out["answerText"], citedSources=out["citedSources"], model=out["model"])
    except RuntimeError_ as ex:
        _log.warning("assistant compose runtime error: %s", ex.to_dict().get("message", "compose error"))
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, ex.to_dict().get("message", "compose error"))
    except Exception as ex:  # pragma: no cover
        _log.error("assistant compose failed: %s: %s", type(ex).__name__, str(ex)[:300])
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"{type(ex).__name__}: {str(ex)[:200]}")


@app.post("/v1/document-jobs", status_code=201)
async def _document_jobs_route(request: Request, authorization: str | None = Header(default=None)):
    # Route HTTP reale: legge Request grezza cosi' auth e size-check avvengono PRIMA che
    # FastAPI/Pydantic deserializzino il body (che puo' contenere allegati in base64) in un
    # CreateJobRequest. create_job() sotto resta un callable sincrono plain — invariato nella
    # firma — per non rompere i test che lo esercitano direttamente con un body gia' costruito
    # (vedi tests/test_app_limits.py).
    _auth(authorization)
    max_upload_bytes = _REGISTRY.config.max_upload_bytes
    content_length = request.headers.get("content-length")
    try:
        declared_length = int(content_length) if content_length is not None else None
        if declared_length is not None and declared_length < 0:
            raise ValueError()
    except ValueError:
        raise HTTPException(400, "Content-Length non valido") from None
    if declared_length is not None and declared_length > max_upload_bytes:
        raise HTTPException(
            413,
            f"Upload troppo grande: {content_length} byte (limite {max_upload_bytes})",
        )
    raw_body = bytearray()
    async for chunk in request.stream():
        received_bytes = len(raw_body) + len(chunk)
        if received_bytes > max_upload_bytes:
            # Check before append and stop consuming immediately, including when
            # Content-Length is absent (HTTP chunked) or underdeclares the body.
            raise HTTPException(
                413,
                f"Upload troppo grande: {received_bytes} byte (limite {max_upload_bytes})",
            )
        raw_body.extend(chunk)
    try:
        body = CreateJobRequest.model_validate_json(raw_body)
    except ValidationError:
        raise HTTPException(422, "Richiesta job non valida") from None
    return create_job(body, authorization=authorization)


def create_job(body: CreateJobRequest, authorization: str | None = Header(default=None)):
    _auth(authorization)
    # AC1: self-cleaning opportunistico — ogni create_job e' anche l'occasione per liberare
    # i job terminali scaduti, senza bisogno di uno scheduler/background task dedicato.
    _gc_expired_jobs()
    # AC4: dimensione totale stimata PRIMA di qualunque decodifica/allocazione. len() sul
    # base64 grezzo e' un limite superiore ragionevole (il payload decodificato e' piu'
    # piccolo), evita di dover decodificare solo per misurare. Il boundary HTTP reale
    # (_document_jobs_route) ha gia' fatto un check equivalente sul body grezzo prima del
    # parsing; questo resta come verifica semantica finale e come garanzia per chi chiama
    # create_job() direttamente (es. i test).
    total_upload_bytes = sum(len(f.content_base64) for f in body.files)
    max_upload_bytes = _REGISTRY.config.max_upload_bytes
    if total_upload_bytes > max_upload_bytes:
        raise HTTPException(
            413,
            f"Upload troppo grande: {total_upload_bytes} byte (limite {max_upload_bytes})",
        )
    existing, payload_hash = existing_job(body, _JOBS, _JOB_KEYS)
    if existing is not None:
        return _public(existing)
    job_id = str(uuid.uuid4())
    _JOBS[job_id] = {
        "id": job_id, "external_job_id": body.external_job_id, "status": "created", "stage": None,
        "files": [f.model_dump() if hasattr(f, "model_dump") else dict(f) for f in body.files],
        "schema": body.schema, "prompt": body.prompt, "events": [], "started_at": None,
        "finished_at": None,
        "input_hash": body.input_hash, "payload_hash": payload_hash, "attempt": 0,
    }
    if body.input_hash is not None:
        _JOB_KEYS[body.external_job_id] = job_id
    return _public(_JOBS[job_id])


@app.post("/v1/document-jobs/{job_id}/run", status_code=202)
async def run_job(job_id: str, _body: RunRequest | None = None, authorization: str | None = Header(default=None)):
    _auth(authorization)
    job = _JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Job non trovato")
    # Il mode arriva col run, non con la create: decide QUALE ruolo esegue il job
    # ('ocr' -> motore di layout, 'extraction' -> modello di estrazione).
    mode = _body.mode if _body else "extraction"
    if job.get("mode") is not None and job["mode"] != mode:
        raise HTTPException(409, "Il mode del job non puo' cambiare")
    if job["status"] == "created":
        job["mode"] = mode
        _schedule(job)
    return _public(job)


@app.get("/v1/document-jobs/{job_id}")
def get_job(job_id: str, authorization: str | None = Header(default=None)):
    _auth(authorization)
    job = _JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Job non trovato")
    return _public(job)


@app.get("/v1/document-jobs/{job_id}/events")
def get_events(job_id: str, authorization: str | None = Header(default=None)):
    _auth(authorization)
    job = _JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Job non trovato")
    return {"job_id": job_id, "events": job["events"]}


@app.get("/v1/document-jobs/{job_id}/result")
def get_result(job_id: str, authorization: str | None = Header(default=None)):
    _auth(authorization)
    job = _JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Job non trovato")
    return {"job_id": job_id, "status": job["status"], "model": job.get("model"),
            "data": job.get("result") if job["status"] == "review_ready" else None,
            "warnings": job.get("warnings", []), "input_hash": job.get("input_hash"),
            "attempt": job.get("attempt", 0), "finish_reason": job.get("finish_reason"),
            "truncated": job.get("truncated", False)}


@app.post("/v1/document-jobs/{job_id}/retry", status_code=202)
async def retry_job(job_id: str, authorization: str | None = Header(default=None),
                    _body: RetryRequest | None = None):
    _auth(authorization)
    job = _JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Job non trovato")
    expected = _body.expected_attempt if _body else None
    if expected is not None:
        if expected > job.get("attempt", 0):
            raise HTTPException(409, "Tentativo atteso non valido")
        if expected < job.get("attempt", 0):
            return _public(job)
    if job["status"] in ("queued", "running", "validating", "repairing"):
        return _public(job)
    if not can_retry(job):
        raise HTTPException(400, f"Job non ritentabile nello stato {job['status']}")
    _schedule(job)
    return _public(job)


@app.post("/v1/document-jobs/{job_id}/cancel")
async def cancel_job(job_id: str, authorization: str | None = Header(default=None)):
    _auth(authorization)
    job = _JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Job non trovato")
    if job["status"] in _TERMINAL_STATUSES:
        return _public(job)
    job.update(status="cancelled", stage="cancelled", result=None, finished_at=time.time())
    job["events"].append({"at": time.strftime("%H:%M:%S"), "stage": "cancelled"})
    task = _TASKS.get(job_id)
    if task is not None and not task.done():
        task.cancel()
    return _public(job)
