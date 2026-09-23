"""Preserve completion metadata without changing the runners' string interface."""
from __future__ import annotations

from ..errors import ErrorKind, RuntimeError_


class CompletionText(str):
    finish_reason: str | None

    def __new__(cls, text: str, finish_reason: str | None = None):
        value = super().__new__(cls, text)
        value.finish_reason = finish_reason
        return value


def _get(value, key: str):
    return value.get(key) if isinstance(value, dict) else getattr(value, key, None)


def _direct_reason(value):
    return _get(value, "finish_reason") or _get(value, "stop_reason")


def response_reason(response) -> str | None:
    """Read provider/Agno metadata, never infer completeness from generated text."""
    reason = _direct_reason(response)
    if not reason:
        choices = _get(response, "choices") or _get(response, "candidates") or []
        if choices:
            reason = _direct_reason(choices[0])
    if not reason:
        # Agno retains the last assistant message's provider metadata. Intermediate
        # tool-call messages must not override the final assistant completion.
        for message in reversed(_get(response, "messages") or []):
            if _get(message, "role") == "assistant":
                reason = _direct_reason(message) or _direct_reason(_get(message, "provider_data") or {})
                break
    if not reason:
        reason = _direct_reason(_get(response, "provider_data") or {})
    if reason is None:
        return None
    return str(getattr(reason, "value", reason)).rsplit(".", 1)[-1].lower()[:64]


def completion_text(text: str, reason: str | None = None) -> CompletionText:
    reason = response_reason({"finish_reason": reason})
    if reason in {"length", "max_tokens", "max_output_tokens", "token_limit", "model_length"}:
        raise RuntimeError_(ErrorKind.OUTPUT_TRUNCATED, "Il provider ha troncato l'output.",
                            finish_reason=reason, truncated=True)
    if reason and reason not in {"stop", "end_turn", "stop_sequence", "completed", "succeeded"}:
        raise RuntimeError_(ErrorKind.OUTPUT_INCOMPLETE, "Il provider non ha completato l'output.",
                            finish_reason=reason)
    if not isinstance(text, str):
        raise RuntimeError_(ErrorKind.SCHEMA_VALIDATION, "Formato dell'output non valido.")
    return CompletionText(text, reason)


def agent_completion(response, label: str) -> CompletionText:
    status = _get(response, "status")
    status = str(getattr(status, "value", status)).upper() if status is not None else None
    if status == "ERROR":
        detail = str(_get(response, "content") or "provider error")[:200]
        raise RuntimeError_(ErrorKind.PROVIDER_ERROR, f"{label}: {detail}")
    if status in {"CANCELLED", "CANCELED", "PAUSED"}:
        raise RuntimeError_(ErrorKind.OUTPUT_INCOMPLETE, "Elaborazione del provider incompleta.",
                            finish_reason=status.lower())
    return completion_text(_get(response, "content") or "", response_reason(response))


class CompletionMetadataMixin:
    """Keep finish metadata before Agno reduces a provider response to text.

    SDK releases use either parser name. Both are supported; the SDK invokes
    only its own method. No provider SDK is imported by this neutral helper.
    """

    @staticmethod
    def _with_completion(parsed, response):
        reason = response_reason(response)
        if reason is not None:
            parsed.provider_data = {**(getattr(parsed, "provider_data", None) or {}),
                                    "finish_reason": reason}
        return parsed

    def _parse_provider_response(self, response, *args, **kwargs):
        parsed = super()._parse_provider_response(response, *args, **kwargs)
        return self._with_completion(parsed, response)

    def parse_provider_response(self, response, *args, **kwargs):
        parsed = super().parse_provider_response(response, *args, **kwargs)
        return self._with_completion(parsed, response)
