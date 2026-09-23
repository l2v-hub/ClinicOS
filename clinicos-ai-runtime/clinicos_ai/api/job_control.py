"""In-process unit identity and attempt guards; the backend owns durable fencing."""
from __future__ import annotations

import hashlib
import json

from fastapi import HTTPException


NON_RETRYABLE = {"output_truncated", "output_incomplete"}


def can_retry(job: dict) -> bool:
    return (job["status"] in {"failed", "retryable_error"}
            and (job.get("error") or {}).get("kind") not in NON_RETRYABLE)


def fingerprint(body) -> str:
    payload = {"prompt": body.prompt, "schema": body.schema,
               "files": [f.model_dump() for f in body.files]}
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def existing_job(body, jobs: dict, keys: dict) -> tuple[dict | None, str | None]:
    if body.input_hash is None:
        return None, None
    digest = fingerprint(body)
    job = jobs.get(keys.get(body.external_job_id))
    if job is not None:
        if job.get("input_hash") != body.input_hash or job.get("payload_hash") != digest:
            raise HTTPException(409, "external_job_id gia' associato a un input diverso")
        return job, digest
    # Expired/restarted jobs have no durable identity here. The backend may
    # recreate their unit; a provider call can repeat, but not an application write.
    keys.pop(body.external_job_id, None)
    return None, digest


def current_attempt(jobs: dict, job: dict, attempt: int) -> bool:
    return (jobs.get(job["id"]) is job and job.get("attempt", 0) == attempt
            and job["status"] != "cancelled")
