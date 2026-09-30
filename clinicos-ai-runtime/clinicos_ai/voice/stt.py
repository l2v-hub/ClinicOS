"""Phase 5: speech-to-text adapter (provider-neutral).

    transcribe(audio, mime_type, locale) -> TranscriptResult

Provider chosen by AI_STT_MODEL ("provider:model"):
  - google:<gemini model>   Gemini generateContent with inline audio (GOOGLE_API_KEY)
  - azure:<deployment>      Azure OpenAI /audio/transcriptions (whisper / gpt-4o-transcribe deployments)
  - mock:<anything>         deterministic, no network (CI): returns an empty transcript

The runtime never stores audio: bytes live only in this request. Logs carry provider, model,
duration and outcome — never audio or text. The transcript is a PROPOSAL of what was said: it is
shown to the user, who can correct it, before the Assistant interprets it.
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import time
import urllib.error
import urllib.request
import uuid
from dataclasses import dataclass, field
from typing import Any

_log = logging.getLogger("clinicos_ai.voice.stt")

NO_SPEECH_MARKER = "[NESSUN_PARLATO]"

# System instruction, kept separate from the audio: a prompt that starts with a verb ("Trascrivi…")
# leaked into transcripts ("Prescrivi" heard as "Trascrivi") when it shared the user turn.
_PROMPT = (
    "Sei un trascrittore di dettatura clinica. Ricevi un audio in italiano e restituisci SOLO la "
    "trascrizione letterale di ciò che viene detto. Non correggere, non completare, non "
    "interpretare e non riformulare: nomi di persone e di farmaci, numeri, dosaggi e unità di "
    "misura vanno scritti esattamente come pronunciati. Scrivi i numeri in cifre (centoventi → "
    "120) e i cognomi con l'iniziale maiuscola. "
    f"Se non c'è parlato comprensibile rispondi esattamente {NO_SPEECH_MARKER}."
)

ALLOWED_MIME = {"audio/wav", "audio/x-wav", "audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4"}


class SttError(Exception):
    def __init__(self, kind: str, message: str, status: int = 502) -> None:
        super().__init__(message)
        self.kind = kind
        self.status = status


@dataclass
class TranscriptResult:
    text: str
    locale: str
    provider: str
    model: str
    duration_ms: int
    confidence: float | None = None
    timestamps: list[dict[str, Any]] = field(default_factory=list)
    empty: bool = False
    # Provider token counts when reported (cost measurement; never content).
    usage: dict[str, int] | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "text": self.text,
            "locale": self.locale,
            "confidence": self.confidence,
            "timestamps": self.timestamps,
            "empty": self.empty,
            "metadata": {"provider": self.provider, "model": self.model, "durationMs": self.duration_ms,
                         **({"usage": self.usage} if self.usage else {})},
        }


def stt_model() -> tuple[str, str] | None:
    raw = (os.environ.get("AI_STT_MODEL") or "").strip()
    if not raw or ":" not in raw:
        return None
    provider, model = raw.split(":", 1)
    return provider.strip().lower(), model.strip()


def stt_status() -> dict[str, Any]:
    configured = stt_model()
    return {"available": configured is not None, "provider": configured[0] if configured else None,
            "model": configured[1] if configured else None}


def _http_json(url: str, body: bytes, headers: dict[str, str], timeout: float) -> dict[str, Any]:
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 (fixed provider URLs)
            raw = resp.read()
        try:
            data = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as ex:
            raise SttError("provider_error", "STT provider: risposta non JSON", 502) from ex
        if not isinstance(data, dict):
            raise SttError("provider_error", "STT provider: risposta inattesa", 502)
        return data
    except urllib.error.HTTPError as ex:
        kind = "rate_limited" if ex.code == 429 else "provider_error"
        raise SttError(kind, f"STT provider HTTP {ex.code}", 502 if ex.code != 429 else 503) from ex
    except TimeoutError as ex:
        raise SttError("timeout", "STT provider timeout", 504) from ex
    except urllib.error.URLError as ex:
        raise SttError("unavailable", "STT provider unreachable", 503) from ex


def _google(model: str, audio: bytes, mime: str, timeout: float) -> tuple[str, dict[str, int] | None]:
    key = os.environ.get("GOOGLE_API_KEY")
    if not key:
        raise SttError("not_configured", "GOOGLE_API_KEY non configurata", 503)
    body = json.dumps({
        "system_instruction": {"parts": [{"text": _PROMPT}]},
        "contents": [{"role": "user", "parts": [
            {"inline_data": {"mime_type": "audio/wav" if mime == "audio/x-wav" else mime,
                             "data": base64.b64encode(audio).decode("ascii")}},
        ]}],
        "generationConfig": {"temperature": 0},
    }).encode("utf-8")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    data = _http_json(url, body, {"Content-Type": "application/json", "x-goog-api-key": key}, timeout)
    parts = (((data.get("candidates") or [{}])[0].get("content") or {}).get("parts") or [])
    meta = data.get("usageMetadata") or {}
    usage = {k: int(meta[v]) for k, v in (("inputTokens", "promptTokenCount"),
                                         ("outputTokens", "candidatesTokenCount"),
                                         ("totalTokens", "totalTokenCount")) if isinstance(meta.get(v), int)}
    return "".join(p.get("text", "") for p in parts if isinstance(p, dict)).strip(), (usage or None)


def _azure(deployment: str, audio: bytes, mime: str, locale: str, timeout: float) -> str:
    endpoint = (os.environ.get("AZURE_OPENAI_ENDPOINT") or "").rstrip("/")
    key = os.environ.get("AZURE_OPENAI_API_KEY")
    if not endpoint or not key:
        raise SttError("not_configured", "Azure OpenAI non configurato", 503)
    version = os.environ.get("AZURE_OPENAI_STT_API_VERSION") or "2025-03-01-preview"
    boundary = uuid.uuid4().hex
    ext = {"audio/webm": "webm", "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a"}.get(mime, "wav")
    fields = [("language", locale.split("-")[0]), ("response_format", "json")]
    chunks: list[bytes] = []
    for name, value in fields:
        chunks.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode())
    chunks.append(
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"utterance.{ext}\"\r\n"
        f"Content-Type: {mime}\r\n\r\n".encode() + audio + b"\r\n"
    )
    chunks.append(f"--{boundary}--\r\n".encode())
    url = f"{endpoint}/openai/deployments/{deployment}/audio/transcriptions?api-version={version}"
    data = _http_json(url, b"".join(chunks),
                      {"api-key": key, "Content-Type": f"multipart/form-data; boundary={boundary}"}, timeout)
    return str(data.get("text", "")).strip()


async def transcribe(audio: bytes, mime_type: str, locale: str = "it-IT",
                     timeout_seconds: float = 20.0) -> TranscriptResult:
    configured = stt_model()
    if configured is None:
        raise SttError("not_configured", "AI_STT_MODEL non configurato", 503)
    provider, model = configured
    if mime_type not in ALLOWED_MIME:
        raise SttError("invalid_audio", "Formato audio non supportato", 400)
    if not audio:
        raise SttError("invalid_audio", "Audio vuoto", 400)
    t0 = time.monotonic()
    outcome = "ok"
    try:
        if provider == "google":
            text, usage = await asyncio.to_thread(_google, model, audio, mime_type, timeout_seconds)
        elif provider == "azure":
            text, usage = await asyncio.to_thread(_azure, model, audio, mime_type, locale, timeout_seconds), None
        elif provider == "mock":
            text, usage = "", None
        else:
            raise SttError("not_configured", f"Provider STT non supportato: {provider}", 503)
        empty = not text or NO_SPEECH_MARKER in text
        if empty:
            outcome = "empty"
        return TranscriptResult(text="" if empty else text, locale=locale, provider=provider, model=model,
                                duration_ms=int((time.monotonic() - t0) * 1000), empty=empty, usage=usage)
    except SttError as ex:
        outcome = ex.kind
        raise
    except Exception:
        outcome = "error"
        raise
    finally:
        # Sanitized: never audio or text. Failures at WARNING so they reach the service logs.
        (_log.info if outcome in ("ok", "empty") else _log.warning)(
            "stt provider=%s model=%s bytes=%d durationMs=%d outcome=%s", provider, model,
            len(audio), int((time.monotonic() - t0) * 1000), outcome)
