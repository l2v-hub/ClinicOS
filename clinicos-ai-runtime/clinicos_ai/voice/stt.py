"""Speech-to-text layer (provider-neutral contract, Phase 5 → Phase 9 registry).

    transcribe(audio, mime_type, locale) -> TranscriptResult      (the ONLY entry point)

Provider and model come from configuration only: STT_PROVIDER + STT_MODEL (Phase 9 single switch),
or the legacy AI_STT_MODEL="provider:model". The adapter is looked up in the provider registry
(models/provider_registry.py, `stt_module`) — voice code never names a vendor. Adapters live in
voice/providers/<name>.py and expose transcribe(model, audio, mime, locale, timeout) ->
(text, usage | None), raising SttError with a normalized kind.

The runtime never stores audio: bytes live only in this request. Logs carry provider, model,
duration and outcome — never audio or text. The transcript is a PROPOSAL of what was said: it is
shown to the user, who can correct it, before the Assistant interprets it.
"""
from __future__ import annotations

from ..correlation import current_request_id
import asyncio
import importlib
import json
import logging
import os
import time
import urllib.error
import urllib.request
import uuid
from dataclasses import dataclass, field
from typing import Any, Mapping

_log = logging.getLogger("clinicos_ai.voice.stt")

NO_SPEECH_MARKER = "[NESSUN_PARLATO]"

# System instruction, kept separate from the audio: a prompt that starts with a verb ("Trascrivi…")
# leaked into transcripts ("Prescrivi" heard as "Trascrivi") when it shared the user turn.
STT_PROMPT = (
    "Sei un trascrittore di dettatura clinica. Ricevi un audio in italiano e restituisci SOLO la "
    "trascrizione letterale di ciò che viene detto. Non correggere, non completare, non "
    "interpretare e non riformulare: nomi di persone e di farmaci, numeri, dosaggi e unità di "
    "misura vanno scritti esattamente come pronunciati. Scrivi i numeri in cifre (centoventi → "
    "120) e i cognomi con l'iniziale maiuscola. "
    f"Se non c'è parlato comprensibile rispondi esattamente {NO_SPEECH_MARKER}."
)

_PROMPT = STT_PROMPT  # backwards-compatible name
# Short vocabulary/style hint for transcription APIs that accept a "prompt" (not instructions).
STT_HINT = "Dettatura clinica in italiano: pressione, saturazione, frequenza, terapia, numeri in cifre."
STT_HINT_MAX_CHARS = 300


def stt_hint(env: Mapping[str, str] | None = None) -> str:
    """Minimal domain vocabulary for adapters that accept a hint (STT_VOCABULARY_HINT: drug names,
    ward names, abbreviations, units — never patient data). Capped; it is context, not reasoning."""
    e = env if env is not None else os.environ
    extra = " ".join((e.get("STT_VOCABULARY_HINT") or "").split())
    return f"{STT_HINT} {extra}".strip()[:STT_HINT_MAX_CHARS]

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


def stt_model(env: Mapping[str, str] | None = None) -> tuple[str, str] | None:
    """(provider, model) from STT_PROVIDER + STT_MODEL, else legacy AI_STT_MODEL=provider:model."""
    from ..models.provider_registry import normalize_provider

    e = env if env is not None else os.environ
    provider = (e.get("STT_PROVIDER") or "").strip()
    model = (e.get("STT_MODEL") or "").strip()
    if provider and model:
        return normalize_provider(provider), model
    raw = (e.get("AI_STT_MODEL") or "").strip()
    if not raw or ":" not in raw:
        return None
    provider, model = raw.split(":", 1)
    return normalize_provider(provider), model.strip()


def multipart_audio(audio: bytes, mime: str, fields: dict[str, str]) -> tuple[bytes, str]:
    """multipart/form-data body with the utterance as `file` (shared by OpenAI-style adapters)."""
    boundary = uuid.uuid4().hex
    ext = {"audio/webm": "webm", "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a"}.get(mime, "wav")
    chunks: list[bytes] = []
    for name, value in fields.items():
        chunks.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode())
    chunks.append(
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"utterance.{ext}\"\r\n"
        f"Content-Type: {mime}\r\n\r\n".encode() + audio + b"\r\n"
    )
    chunks.append(f"--{boundary}--\r\n".encode())
    return b"".join(chunks), f"multipart/form-data; boundary={boundary}"


def transcription_usage(data: dict[str, Any]) -> dict[str, Any] | None:
    """OpenAI-style transcription usage ({type: tokens|duration}) → normalized counts."""
    usage = data.get("usage")
    if not isinstance(usage, dict):
        return None
    out: dict[str, Any] = {}
    if isinstance(usage.get("input_tokens"), int):
        out["inputTokens"] = usage["input_tokens"]
    if isinstance(usage.get("output_tokens"), int):
        out["outputTokens"] = usage["output_tokens"]
    if isinstance(usage.get("seconds"), (int, float)):
        out["audioSeconds"] = float(usage["seconds"])
    return out or None


def wav_seconds(audio: bytes) -> float | None:
    """Duration of a PCM WAV utterance from its header (cost metric); None for other formats."""
    if len(audio) < 44 or audio[:4] != b"RIFF" or audio[8:12] != b"WAVE":
        return None
    byte_rate = int.from_bytes(audio[28:32], "little")
    return round((len(audio) - 44) / byte_rate, 2) if byte_rate > 0 else None


def stt_realtime(env: Mapping[str, str] | None = None) -> dict[str, Any]:
    """Realtime/live transcription is a SEPARATE, opt-in mode (STT_REALTIME_ENABLED, default false;
    STT_REALTIME_MODEL). Push-to-talk always uses the file transcription model (STT_MODEL)."""
    e = env if env is not None else os.environ
    return {"enabled": (e.get("STT_REALTIME_ENABLED") or "false").strip().lower() == "true",
            "model": (e.get("STT_REALTIME_MODEL") or "").strip() or None}


def stt_status() -> dict[str, Any]:
    configured = stt_model()
    enabled = (os.environ.get("AI_ENABLED") or "true").strip().lower() != "false"
    return {"available": enabled and configured is not None, "provider": configured[0] if configured else None,
            "model": configured[1] if configured else None, "realtime": stt_realtime()}


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


def _adapter(provider: str):
    """STT adapter module for a registered provider (registry is the only provider list)."""
    from ..models.provider_registry import provider_entry

    entry = provider_entry(provider)
    if entry is None or not entry.stt_module:
        raise SttError("not_configured", f"Provider STT non supportato: {provider}", 503)
    return importlib.import_module(entry.stt_module)


async def transcribe(audio: bytes, mime_type: str, locale: str = "it-IT",
                     timeout_seconds: float = 20.0) -> TranscriptResult:
    if (os.environ.get("AI_ENABLED") or "true").strip().lower() == "false":
        raise SttError("not_configured", "AI disattivata (AI_ENABLED=false)", 503)
    configured = stt_model()
    if configured is None:
        raise SttError("not_configured", "STT non configurato (STT_PROVIDER/STT_MODEL)", 503)
    provider, model = configured
    if mime_type not in ALLOWED_MIME:
        raise SttError("invalid_audio", "Formato audio non supportato", 400)
    if not audio:
        raise SttError("invalid_audio", "Audio vuoto", 400)
    t0 = time.monotonic()
    outcome = "ok"
    try:
        adapter = _adapter(provider)
        text, usage = await asyncio.to_thread(adapter.transcribe, model, audio, mime_type, locale,
                                              timeout_seconds)
        seconds = wav_seconds(audio)
        if seconds is not None:
            usage = {**(usage or {}), "audioSeconds": (usage or {}).get("audioSeconds", seconds)}
        from ..models.cost import COSTS, estimate_usd

        cost = estimate_usd(provider, model, usage or {}, os.environ)
        COSTS.add(cost, os.environ)
        if cost is not None:
            usage = {**(usage or {}), "estimatedUsd": cost}
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
            "stt provider=%s model=%s bytes=%d durationMs=%d outcome=%s correlationId=%s", provider,
            model, len(audio), int((time.monotonic() - t0) * 1000), outcome, current_request_id() or "-")
