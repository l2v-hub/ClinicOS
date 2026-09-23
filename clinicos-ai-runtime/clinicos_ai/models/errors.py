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
