"""Azure OpenAI STT adapter: /audio/transcriptions on a whisper / *-transcribe deployment."""
from __future__ import annotations

import os

from .. import stt as layer


def transcribe(model: str, audio: bytes, mime: str, locale: str, timeout: float):
    endpoint = (os.environ.get("AZURE_OPENAI_ENDPOINT") or "").rstrip("/")
    key = os.environ.get("AZURE_OPENAI_API_KEY")
    if not endpoint or not key:
        raise layer.SttError("not_configured", "Azure OpenAI non configurato", 503)
    version = os.environ.get("AZURE_OPENAI_STT_API_VERSION") or "2025-03-01-preview"
    body, content_type = layer.multipart_audio(audio, mime, {"language": locale.split("-")[0],
                                                             "response_format": "json"})
    url = f"{endpoint}/openai/deployments/{model}/audio/transcriptions?api-version={version}"
    data = layer._http_json(url, body, {"api-key": key, "Content-Type": content_type}, timeout)
    return str(data.get("text", "")).strip(), layer.transcription_usage(data)
