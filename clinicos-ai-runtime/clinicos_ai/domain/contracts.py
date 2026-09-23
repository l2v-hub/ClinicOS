"""Neutral request/response contracts for the AI runtime API (REQ-023 §3).

Provider/model-agnostic. The ClinicOS backend depends only on these shapes — never
on Google/OpenAI/Anthropic types. Pydantic models (validated at the API boundary).
"""
from __future__ import annotations

from typing import Any, Literal, Optional

try:
    from pydantic import BaseModel, Field, model_validator
except ImportError:  # allow importing the package without pydantic (core tests)
    BaseModel = object  # type: ignore

    def Field(*_a, **_k):  # type: ignore
        return None

    def model_validator(**_kwargs):  # type: ignore
        return lambda method: method


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
    external_job_id: Optional[str] = Field(default=None, max_length=256)
    # Supplying both fields opts into unit idempotency. Legacy correlation alone
    # must still allow distinct OCR/extraction jobs for the same ClinicOS import.
    input_hash: Optional[str] = Field(default=None, pattern=r"^[a-fA-F0-9]{64}$")
    files: list[RuntimeFile] = Field(default_factory=list)
    # JSON schema + prompt the runtime should target (passed by the backend).
    schema: dict[str, Any] = Field(default_factory=dict)
    prompt: str = ""

    @model_validator(mode="after")
    def validate_identity(self):
        if self.input_hash is not None:
            if not self.external_job_id or not self.external_job_id.strip():
                raise ValueError("input_hash richiede external_job_id")
            self.input_hash = self.input_hash.lower()
        return self


class RunRequest(BaseModel):
    # 'extraction' = estrazione+repair col ruolo 'extraction'; 'agent' = agente con tool;
    # 'ocr' = sola trascrizione col ruolo 'ocr' (Document Intelligence: layout + markdown).
    mode: Literal["extraction", "agent", "ocr"] = "extraction"


class RetryRequest(BaseModel):
    expected_attempt: Optional[int] = Field(default=None, ge=0, strict=True)


class RuntimeEvent(BaseModel):
    at: str
    stage: str
    detail: Optional[str] = None


class JobStatusResponse(BaseModel):
    job_id: str
    external_job_id: Optional[str] = None
    input_hash: Optional[str] = None
    attempt: int = 0
    finish_reason: Optional[str] = None
    truncated: bool = False
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
    input_hash: Optional[str] = None
    attempt: int = 0
    finish_reason: Optional[str] = None
    truncated: bool = False


class RuntimeHealth(BaseModel):
    available: bool
    errors: list[str] = Field(default_factory=list)
    roles: dict[str, Any] = Field(default_factory=dict)


# 016 F1: assistant read-planner (question → typed read plan). Runtime sees only the QUESTION.
class AssistantPlanRequest(BaseModel):
    question: str = ""
    currentPatientId: Optional[str] = None
    roles: list[str] = Field(default_factory=list)
    toolSchema: list[dict[str, Any]] = Field(default_factory=list)
    model: Optional[str] = None  # informational; the runtime uses its 'agent' role


class AssistantPlanResponse(BaseModel):
    plan: dict[str, Any]
    model: str
    confidence: float = 0.0


# 016 F2: assistant composer (results → discursive answer). Dati clinici solo verso host EU.
class AssistantComposeRequest(BaseModel):
    question: str = ""
    results: list[dict[str, Any]] = Field(default_factory=list)
    sources: list[dict[str, Any]] = Field(default_factory=list)
    language: str = "it"
    model: Optional[str] = None


class AssistantComposeResponse(BaseModel):
    answerText: str = ""
    citedSources: list[str] = Field(default_factory=list)
    model: str = ""
