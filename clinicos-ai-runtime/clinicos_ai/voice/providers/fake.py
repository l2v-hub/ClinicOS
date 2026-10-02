"""Deterministic STT adapter for contract and provider-switch tests (no network).

Returns STT_TEST_TRANSCRIPT (default «pressione 120 su 80») and fake usage, or raises the
normalized error named by AI_TEST_FAULT (timeout | rate_limit | unavailable | malformed)."""
from __future__ import annotations

import os

from .. import stt as layer

_FAULTS = {"timeout": ("timeout", 504), "rate_limit": ("rate_limited", 503),
           "unavailable": ("unavailable", 503), "malformed": ("provider_error", 502)}


def transcribe(model: str, audio: bytes, mime: str, locale: str, timeout: float):  # noqa: ARG001
    fault = (os.environ.get("AI_TEST_FAULT") or "").strip()
    if fault in _FAULTS:
        kind, status = _FAULTS[fault]
        raise layer.SttError(kind, f"test provider fault: {fault}", status)
    text = os.environ.get("STT_TEST_TRANSCRIPT", "pressione 120 su 80")
    return text, {"inputTokens": max(1, len(audio) // 1000), "outputTokens": len(text.split())}
