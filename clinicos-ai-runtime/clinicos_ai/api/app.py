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
import os
import time
import uuid

from fastapi import FastAPI, Header, HTTPException, status

from ..agents.extraction import run_extraction
from ..agents.assistant import run_assistant_plan, run_assistant_compose
from ..models.errors import RuntimeError_, ErrorKind
from ..models.providers.base import Attachment
from ..models.registry import ModelRegistry
from ..domain.contracts import (
    CreateJobRequest, RunRequest, AssistantPlanRequest, AssistantPlanResponse,
    AssistantComposeRequest, AssistantComposeResponse,
)

app = FastAPI(title="ClinicOS AI Runtime", version="1.0.0")
_REGISTRY = ModelRegistry()
_JOBS: dict[str, dict] = {}


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
        "status": job["status"],
        "stage": job.get("stage"),
        "model": job.get("model"),
        "elapsed_seconds": elapsed,
        "can_retry": job["status"] in ("failed", "retryable_error"),
        "can_cancel": job["status"] in ("queued", "running", "validating", "repairing"),
        "error": job.get("error"),
    }


async def _process(job_id: str) -> None:
    job = _JOBS[job_id]
    job.update(status="running", stage="model_processing", started_at=time.time(), error=None)
    job["events"].append({"at": time.strftime("%H:%M:%S"), "stage": "running"})
    try:
        attachments = [
            Attachment(filename=f["filename"], mime_type=f["mime_type"],
                       data=base64.b64decode(f["content_base64"]))
            for f in job["files"]
        ]
        out = await run_extraction(_REGISTRY, job["prompt"], job["schema"], attachments)
        job.update(status="review_ready", stage="completed", model=out.model, result=out.data,
                   warnings=out.warnings)
    except RuntimeError_ as ex:
        retryable = ex.kind in (ErrorKind.TIMEOUT, ErrorKind.RATE_LIMIT, ErrorKind.PROVIDER_ERROR,
                                ErrorKind.PROVIDER_UNAVAILABLE)
        job.update(status="retryable_error" if retryable else "failed", stage="error", error=ex.to_dict())
    except Exception as ex:  # pragma: no cover
        job.update(status="failed", stage="error", error={"kind": "provider_error", "message": str(ex)[:200]})
    job["events"].append({"at": time.strftime("%H:%M:%S"), "stage": job["stage"]})


@app.get("/v1/runtime/health")
def health():
    s = _REGISTRY.public_status()
    return {"available": s["available"], "errors": s["errors"], "roles": s["roles"]}


@app.get("/v1/runtime/capabilities")
def capabilities():
    return _REGISTRY.public_status()


# 016 F1: read-planner endpoint. Riceve SOLO la domanda (nessun dato clinico), ritorna un
# piano di sole letture che il backend valida ed esegue. Usa il ruolo 'agent' già configurato.
@app.post("/v1/assistant/plan", response_model=AssistantPlanResponse)
async def assistant_plan(req: AssistantPlanRequest, authorization: str | None = Header(default=None)):
    _auth(authorization)
    try:
        out = await run_assistant_plan(_REGISTRY, req.question, req.toolSchema)
        return AssistantPlanResponse(plan=out["plan"], model=out["model"], confidence=1.0)
    except RuntimeError_ as ex:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, ex.to_dict().get("message", "planner error"))
    except Exception as ex:  # pragma: no cover
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, str(ex)[:200])


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
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, ex.to_dict().get("message", "compose error"))
    except Exception as ex:  # pragma: no cover
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, str(ex)[:200])


@app.post("/v1/document-jobs", status_code=201)
def create_job(body: CreateJobRequest, authorization: str | None = Header(default=None)):
    _auth(authorization)
    job_id = str(uuid.uuid4())
    _JOBS[job_id] = {
        "id": job_id, "external_job_id": body.external_job_id, "status": "created", "stage": None,
        "files": [f.model_dump() if hasattr(f, "model_dump") else dict(f) for f in body.files],
        "schema": body.schema, "prompt": body.prompt, "events": [], "started_at": None,
    }
    return _public(_JOBS[job_id])


@app.post("/v1/document-jobs/{job_id}/run", status_code=202)
async def run_job(job_id: str, _body: RunRequest | None = None, authorization: str | None = Header(default=None)):
    _auth(authorization)
    job = _JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Job non trovato")
    job.update(status="queued", stage="queued")
    asyncio.create_task(_process(job_id))
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
            "data": job.get("result"), "warnings": job.get("warnings", [])}


@app.post("/v1/document-jobs/{job_id}/retry", status_code=202)
async def retry_job(job_id: str, authorization: str | None = Header(default=None)):
    _auth(authorization)
    job = _JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Job non trovato")
    if job["status"] not in ("failed", "retryable_error"):
        raise HTTPException(400, f"Job non ritentabile nello stato {job['status']}")
    job.update(status="queued", stage="queued", error=None)
    asyncio.create_task(_process(job_id))
    return _public(job)


@app.post("/v1/document-jobs/{job_id}/cancel")
def cancel_job(job_id: str, authorization: str | None = Header(default=None)):
    _auth(authorization)
    job = _JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Job non trovato")
    job.update(status="cancelled", stage="error")
    return _public(job)
