"""CI STT adapter: always an empty transcript (never invents speech)."""
from __future__ import annotations


def transcribe(model: str, audio: bytes, mime: str, locale: str, timeout: float):  # noqa: ARG001
    return "", None
