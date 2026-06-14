"""Neutral request/response contracts for the AI runtime API (REQ-023 §3).

Provider/model-agnostic. The ClinicOS backend depends only on these shapes — never
on Google/OpenAI/Anthropic types. Pydantic models (validated at the API boundary).
"""
from __future__ import annotations

from typing import Any, Literal, Optional

try:
    from pydantic import BaseModel, Field
except ImportError:  # allow importing the package without pydantic (core tests)
    BaseModel = object  # type: ignore

    def Field(*_a, **_k):  # type: ignore
        return None


RuntimeJobStatus = Literal[
    "created", "queued", "uploading", "running", "validating", "repairing",
    "review_ready", "retryable_error", "failed", "cancelled",
]


class RuntimeFile(BaseModel):
    filename: str
    mime_type: str
    # base64-encoded content (the runtime never reaches the clinical DB).
    content_base64: str
    sort_order: int = 0


class CreateJobRequest(BaseModel):
    external_job_id: Optional[str] = None  # ClinicOS job id, for correlation only
    files: list[RuntimeFile] = Field(default_factory=list)
    # JSON schema + prompt the runtime should target (passed by the backend).
    schema: dict[str, Any] = Field(default_factory=dict)
    prompt: str = ""


class RunRequest(BaseModel):
    # 'extraction' = OCR+extract+repair pipeline; 'agent' = tool-using agent.
    mode: Literal["extraction", "agent"] = "extraction"


class RuntimeEvent(BaseModel):
    at: str
    stage: str
    detail: Optional[str] = None


class JobStatusResponse(BaseModel):
    job_id: str
    external_job_id: Optional[str] = None
    status: RuntimeJobStatus
    stage: Optional[str] = None
    model: Optional[str] = None           # provider:model_id actually used
    elapsed_seconds: int = 0
    can_retry: bool = False
    can_cancel: bool = False
    error: Optional[dict] = None          # normalized {kind, message}


class JobResultResponse(BaseModel):
    job_id: str
    status: RuntimeJobStatus
    model: Optional[str] = None
    data: Optional[dict] = None           # validated ClinicOS extraction (or None)
    warnings: list[str] = Field(default_factory=list)


class RuntimeHealth(BaseModel):
    available: bool
    errors: list[str] = Field(default_factory=list)
    roles: dict[str, Any] = Field(default_factory=dict)
