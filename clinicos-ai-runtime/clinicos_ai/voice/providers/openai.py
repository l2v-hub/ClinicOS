"""OpenAI API Direct STT adapter: POST {OPENAI_BASE_URL or https://api.openai.com/v1}/audio/transcriptions.

Model from configuration (STT_MODEL, e.g. a *-transcribe or whisper model). The key never leaves
this module (Authorization header); OPENAI_BASE_URL is honoured like the official SDK does
(OpenAI-compatible gateways, contract tests against a local stub)."""
from __future__ import annotations

import os

from .. import stt as layer


def transcribe(model: str, audio: bytes, mime: str, locale: str, timeout: float):
    key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if not key:
        raise layer.SttError("not_configured", "OPENAI_API_KEY non configurata", 503)
    base = (os.environ.get("OPENAI_BASE_URL") or "https://api.openai.com/v1").rstrip("/")
    fields = {"model": model, "language": locale.split("-")[0], "response_format": "json",
              "prompt": layer.stt_hint()}
    body, content_type = layer.multipart_audio(audio, mime, fields)
    data = layer._http_json(f"{base}/audio/transcriptions", body,
                            {"Authorization": f"Bearer {key}", "Content-Type": content_type}, timeout)
    return str(data.get("text", "")).strip(), layer.transcription_usage(data)
