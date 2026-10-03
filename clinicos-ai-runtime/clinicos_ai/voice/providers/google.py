"""Google Gemini STT adapter: generateContent with inline audio (GOOGLE_API_KEY / GEMINI_API_KEY)."""
from __future__ import annotations

import base64
import json
import os

from .. import stt as layer


def transcribe(model: str, audio: bytes, mime: str, locale: str, timeout: float):  # noqa: ARG001
    key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not key:
        raise layer.SttError("not_configured", "GOOGLE_API_KEY non configurata", 503)
    body = json.dumps({
        "system_instruction": {"parts": [{"text": layer.STT_PROMPT}]},
        "contents": [{"role": "user", "parts": [
            {"inline_data": {"mime_type": "audio/wav" if mime == "audio/x-wav" else mime,
                             "data": base64.b64encode(audio).decode("ascii")}},
        ]}],
        "generationConfig": {"temperature": 0},
    }).encode("utf-8")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    data = layer._http_json(url, body, {"Content-Type": "application/json", "x-goog-api-key": key}, timeout)
    parts = (((data.get("candidates") or [{}])[0].get("content") or {}).get("parts") or [])
    meta = data.get("usageMetadata") or {}
    usage = {k: int(meta[v]) for k, v in (("inputTokens", "promptTokenCount"),
                                         ("outputTokens", "candidatesTokenCount"),
                                         ("totalTokens", "totalTokenCount")) if isinstance(meta.get(v), int)}
    return "".join(p.get("text", "") for p in parts if isinstance(p, dict)).strip(), (usage or None)
