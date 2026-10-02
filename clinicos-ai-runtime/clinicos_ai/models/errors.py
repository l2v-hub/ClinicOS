"""Normalized, provider-agnostic errors for the ClinicOS AI Runtime (REQ-023).

The rest of the runtime (agents/api/domain) and the ClinicOS backend only ever see
these neutral errors — never raw provider SDK exceptions. Provider modules translate
their SDK errors into these.
"""
from __future__ import annotations

from enum import Enum


class ErrorKind(str, Enum):
    CONFIG = "config"                  # misconfiguration (bad role/provider/model spec)
    CREDENTIALS = "credentials"        # missing/invalid provider credentials
    CAPABILITY = "capability"          # model lacks a capability required by the role
    PROVIDER_UNAVAILABLE = "provider_unavailable"  # SDK not installed / provider unknown
    RATE_LIMIT = "rate_limit"          # 429 / quota
    TIMEOUT = "timeout"
    PROVIDER_ERROR = "provider_error"  # other transient provider failure
    SCHEMA_VALIDATION = "schema_validation"
    OUTPUT_TRUNCATED = "output_truncated"
    OUTPUT_INCOMPLETE = "output_incomplete"
    # Phase 9 (provider-agnostic taxonomy): every adapter maps vendor errors onto these too.
    AUTH = "auth"                      # 401/403: invalid/expired credential
    INVALID_REQUEST = "invalid_request"  # 400/404/422 not otherwise classified
    CONTEXT_LIMIT = "context_limit"    # prompt exceeds the model context window
    CONTENT_REJECTED = "content_rejected"  # provider safety/content filter or refusal
    CANCELLED = "cancelled"            # caller cancelled / request aborted
    BUDGET_EXCEEDED = "budget_exceeded"  # app-level token budget guard


class RuntimeError_(Exception):
    """Base normalized runtime error. (Underscore avoids shadowing builtins.)"""

    def __init__(self, kind: ErrorKind, message: str, *,
                 finish_reason: str | None = None, truncated: bool = False) -> None:
        super().__init__(message)
        self.kind = kind
        self.message = message
        self.finish_reason = finish_reason
        self.truncated = truncated

    def to_dict(self) -> dict:
        out = {"kind": self.kind.value, "message": self.message}
        if self.finish_reason is not None or self.truncated:
            out.update(finish_reason=self.finish_reason, truncated=self.truncated)
        return out


class ConfigError(RuntimeError_):
    def __init__(self, message: str) -> None:
        super().__init__(ErrorKind.CONFIG, message)


class CapabilityError(RuntimeError_):
    def __init__(self, message: str) -> None:
        super().__init__(ErrorKind.CAPABILITY, message)


class ProviderUnavailableError(RuntimeError_):
    def __init__(self, message: str) -> None:
        super().__init__(ErrorKind.PROVIDER_UNAVAILABLE, message)


# ── Normalized application error codes (Prompt 9 §13) ─────────────────────────────────────────
# The public taxonomy every caller sees (API responses, logs, backend metrics). ErrorKind stays the
# richer internal enum; ai_error_code() projects it onto the 10 normalized codes.
AI_ERROR_CODES = (
    "AUTH_ERROR", "RATE_LIMIT", "TIMEOUT", "PROVIDER_UNAVAILABLE", "INVALID_REQUEST",
    "CONTEXT_LIMIT", "CONTENT_REJECTED", "MALFORMED_RESPONSE", "CANCELLED", "UNKNOWN",
)

_KIND_TO_CODE = {
    ErrorKind.AUTH: "AUTH_ERROR",
    ErrorKind.CREDENTIALS: "AUTH_ERROR",
    ErrorKind.RATE_LIMIT: "RATE_LIMIT",
    ErrorKind.BUDGET_EXCEEDED: "RATE_LIMIT",
    ErrorKind.TIMEOUT: "TIMEOUT",
    ErrorKind.PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
    ErrorKind.PROVIDER_ERROR: "PROVIDER_UNAVAILABLE",
    ErrorKind.CONFIG: "INVALID_REQUEST",
    ErrorKind.CAPABILITY: "INVALID_REQUEST",
    ErrorKind.INVALID_REQUEST: "INVALID_REQUEST",
    ErrorKind.CONTEXT_LIMIT: "CONTEXT_LIMIT",
    ErrorKind.OUTPUT_TRUNCATED: "CONTEXT_LIMIT",
    ErrorKind.CONTENT_REJECTED: "CONTENT_REJECTED",
    ErrorKind.SCHEMA_VALIDATION: "MALFORMED_RESPONSE",
    ErrorKind.OUTPUT_INCOMPLETE: "MALFORMED_RESPONSE",
    ErrorKind.CANCELLED: "CANCELLED",
}


def ai_error_code(error: BaseException) -> str:
    """Normalized code of any exception raised along an AI call path."""
    if isinstance(error, RuntimeError_):
        if error.finish_reason in ("content_filter", "refusal"):
            return "CONTENT_REJECTED"
        return _KIND_TO_CODE.get(error.kind, "UNKNOWN")
    return _KIND_TO_CODE.get(classify_exception(error), "UNKNOWN")


def _status_of(error: BaseException) -> int | None:
    for attr in ("status_code", "status", "code", "http_status"):
        value = getattr(error, attr, None)
        if isinstance(value, int) and 100 <= value <= 599:
            return value
    response = getattr(error, "response", None)
    value = getattr(response, "status_code", None)
    return value if isinstance(value, int) else None


def classify_exception(error: BaseException) -> ErrorKind:
    """Map a vendor/SDK/transport exception onto ErrorKind without importing any SDK:
    HTTP status first, then exception type name, then message heuristics."""
    import asyncio

    if isinstance(error, RuntimeError_):
        return error.kind
    if isinstance(error, (asyncio.TimeoutError, TimeoutError)):
        return ErrorKind.TIMEOUT
    if isinstance(error, asyncio.CancelledError):
        return ErrorKind.CANCELLED
    name = type(error).__name__.lower()
    msg = str(error).lower()
    status = _status_of(error)
    if "context_length" in msg or "context window" in msg or "maximum context" in msg or "too many tokens" in msg:
        return ErrorKind.CONTEXT_LIMIT
    if "content_filter" in msg or "content management policy" in msg or "safety" in name or "refus" in msg:
        return ErrorKind.CONTENT_REJECTED
    if status in (401, 403) or "authentication" in name or "permissiondenied" in name or "invalid api key" in msg or "incorrect api key" in msg:
        return ErrorKind.AUTH
    if status == 429 or "ratelimit" in name or "rate limit" in msg or "quota" in msg or " 429" in msg:
        return ErrorKind.RATE_LIMIT
    if "jsondecode" in name or "validationerror" in name or "decodeerror" in name:
        return ErrorKind.SCHEMA_VALIDATION
    if "timeout" in name or "timed out" in msg:
        return ErrorKind.TIMEOUT
    if "cancel" in name:
        return ErrorKind.CANCELLED
    if status in (400, 404, 409, 413, 422) or "badrequest" in name or "notfound" in name:
        return ErrorKind.INVALID_REQUEST
    if status is not None and status >= 500 or "connection" in name or "unavailable" in msg:
        return ErrorKind.PROVIDER_UNAVAILABLE
    return ErrorKind.PROVIDER_ERROR
