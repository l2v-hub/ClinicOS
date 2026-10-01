"""Phase 5 — Azure OpenAI Realtime API (GA, `/openai/v1`) adapter for `gpt-live-transcribe`.

`gpt-live-transcribe` only runs inside the Realtime API as a *transcription session*
(`session.type = "transcription"`). It does not support `server_vad` / `semantic_vad`, so turns are
committed by the client (`input_audio_buffer.commit`) — ClinicOS uses its local VAD for that.

Two transports, same deployment, same resource (`AZURE_OPENAI_ENDPOINT`), credentials server-side:

* **webrtc** (default for the browser): the browser sends its SDP offer to ClinicOS; the runtime
  mints a short-lived client secret (`POST /openai/v1/realtime/client_secrets`, session configuration
  fixed server-side) and performs the SDP exchange itself (`POST /openai/v1/realtime/calls`, Bearer
  ephemeral) — Azure's «proxy the session negotiation» option. Neither the API key nor the ephemeral
  token ever reaches the browser; only the SDP answer does. Media then flows browser ↔ Azure.
* **server**: the runtime opens a WebSocket (`wss://…/openai/v1/realtime?model=<deployment>`) and
  streams one finished utterance (PCM16 24 kHz mono), commits it and collects the deltas + final
  transcript.

This module never logs audio, transcripts, keys or tokens.
"""
from __future__ import annotations

import asyncio
import base64
import json
import os
import struct
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any
from urllib.parse import quote, urlsplit

from .stt import SttError

DEFAULT_DEPLOYMENT = "gpt-live-transcribe"
REALTIME_RATE = 24_000
CHUNK_BYTES = REALTIME_RATE * 2 // 10  # 100 ms of PCM16 mono (recommended chunk size)
DELAYS = {"minimal", "low", "medium", "high", "xhigh"}
# Context for the STT only (never clinical records): what kind of speech to expect.
DEFAULT_PROMPT = ("Dettatura di un operatore sanitario in una RSA italiana: comandi brevi su ospiti, "
                  "parametri vitali, terapie, consegne e diario clinico.")


@dataclass(frozen=True)
class RealtimeConfig:
    endpoint: str
    api_key: str
    deployment: str
    model: str
    languages: tuple[str, ...]
    prompt: str
    keywords: tuple[str, ...]
    delay: str | None

    @property
    def calls_url(self) -> str:
        return f"{self.endpoint}/openai/v1/realtime/calls"

    @property
    def websocket_url(self) -> str:
        parts = urlsplit(self.endpoint)
        scheme = "ws" if parts.scheme == "http" else "wss"  # http only for local test servers
        return f"{scheme}://{parts.netloc}/openai/v1/realtime?model={quote(self.deployment)}"


def _keywords(raw: str) -> tuple[str, ...]:
    # API rule: one term per entry, no "<", ">", carriage returns or line feeds.
    items = [k.strip() for k in raw.replace("\r", "\n").replace(";", "\n").split("\n")]
    items = [k.replace("<", "").replace(">", "") for k in items if k.strip()]
    return tuple(dict.fromkeys(k for k in items if len(k) <= 64))[:100]


def realtime_config(env: dict[str, str] | None = None) -> RealtimeConfig | None:
    """Azure realtime STT settings, or None when the Azure resource is not configured."""
    env = os.environ if env is None else env
    endpoint = (env.get("AZURE_OPENAI_REALTIME_ENDPOINT") or env.get("AZURE_OPENAI_ENDPOINT") or "").strip()
    key = (env.get("AZURE_OPENAI_API_KEY") or "").strip()
    if not endpoint or not key:
        return None
    model = (env.get("AI_STT_MODEL") or DEFAULT_DEPLOYMENT).strip()
    if ":" in model:  # legacy "provider:model" form is not an Azure model id
        model = DEFAULT_DEPLOYMENT
    deployment = (env.get("AI_STT_DEPLOYMENT") or model).strip()
    language = (env.get("AI_STT_LANGUAGE") or "it").strip().lower()[:8] or "it"
    delay = (env.get("AI_STT_DELAY") or "").strip().lower() or None
    if delay is not None and delay not in DELAYS:
        delay = None
    return RealtimeConfig(
        endpoint=endpoint.rstrip("/"),
        api_key=key,
        deployment=deployment,
        model=model,
        languages=(language,),
        prompt=(env.get("AI_STT_PROMPT") or DEFAULT_PROMPT).strip()[:1000],
        keywords=_keywords(env.get("AI_STT_KEYWORDS") or ""),
        delay=delay,
    )


def session_config(cfg: RealtimeConfig) -> dict[str, Any]:
    """Transcription session (GA event model). Fields per the gpt-live-transcribe docs:
    `languages` (not `language`), `prompt`, `keywords`, `delay`; `turn_detection: null` (manual commit)."""
    transcription: dict[str, Any] = {"model": cfg.deployment, "languages": list(cfg.languages)}
    if cfg.prompt:
        transcription["prompt"] = cfg.prompt
    if cfg.keywords:
        transcription["keywords"] = list(cfg.keywords)
    if cfg.delay:
        transcription["delay"] = cfg.delay
    return {
        "type": "transcription",
        "audio": {
            "input": {
                "format": {"type": "audio/pcm", "rate": REALTIME_RATE},
                "transcription": transcription,
                "turn_detection": None,
            }
        },
    }


def _http(req: urllib.request.Request, timeout: float) -> bytes:
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 (configured Azure endpoint)
            return resp.read()
    except urllib.error.HTTPError as ex:
        detail = ""
        try:
            payload = json.loads(ex.read().decode("utf-8"))
            err = payload.get("error") or {}
            detail = f"{err.get('code', '')}: {err.get('message', '')}"[:200]
        except Exception:  # noqa: BLE001 — diagnostics only
            pass
        if ex.code in (401, 403):
            raise SttError("auth_failed", f"Azure OpenAI: autenticazione rifiutata ({ex.code})", 503) from ex
        if ex.code == 404:
            raise SttError("not_configured",
                           "Azure OpenAI: deployment STT o API realtime non disponibili "
                           f"({detail or 'not found'})", 503) from ex
        if ex.code == 429:
            raise SttError("rate_limited", "Azure OpenAI: limite di richieste", 503) from ex
        raise SttError("provider_error", f"Azure OpenAI HTTP {ex.code}", 502) from ex
    except TimeoutError as ex:
        raise SttError("timeout", "Azure OpenAI: timeout", 504) from ex
    except urllib.error.URLError as ex:
        raise SttError("unavailable", "Azure OpenAI non raggiungibile", 503) from ex


def _request(method: str, url: str, key: str, body: dict[str, Any] | None, timeout: float) -> dict[str, Any]:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    raw = _http(urllib.request.Request(url, data=data, method=method,
                                       headers={"api-key": key, "Content-Type": "application/json"}), timeout)
    try:
        parsed = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as ex:
        raise SttError("provider_error", "Azure OpenAI: risposta non JSON", 502) from ex
    if not isinstance(parsed, dict):
        raise SttError("provider_error", "Azure OpenAI: risposta inattesa", 502)
    return parsed


def mint_client_secret(cfg: RealtimeConfig, timeout: float = 10.0) -> dict[str, Any]:
    """Ephemeral token for a browser WebRTC transcription session (session fixed server-side)."""
    data = _request("POST", f"{cfg.endpoint}/openai/v1/realtime/client_secrets", cfg.api_key,
                    {"session": session_config(cfg)}, timeout)
    value = data.get("value")
    if not isinstance(value, str) or not value:
        raise SttError("provider_error", "Azure OpenAI: token effimero assente nella risposta", 502)
    expires_at = data.get("expires_at")
    return {
        "token": value,
        "expiresAt": int(expires_at) if isinstance(expires_at, (int, float)) else None,
        "callsUrl": cfg.calls_url,
        "deployment": cfg.deployment,
        "model": cfg.model,
        "transport": "webrtc",
    }


def negotiate_call(cfg: RealtimeConfig, offer_sdp: str, timeout: float = 10.0) -> dict[str, Any]:
    """Server-side WebRTC negotiation: mint an ephemeral secret for ONE transcription session and use
    it immediately for the SDP exchange. Returns only the SDP answer (never the token)."""
    grant = mint_client_secret(cfg, timeout=6.0)  # 6 s mint + 10 s SDP < backend 18 s < browser 20 s
    req = urllib.request.Request(cfg.calls_url, data=offer_sdp.encode("utf-8"), method="POST",
                                 headers={"Authorization": f"Bearer {grant['token']}",
                                          "Content-Type": "application/sdp"})
    answer = _http(req, timeout).decode("utf-8", errors="replace")
    if not answer.startswith("v="):
        raise SttError("provider_error", "Azure realtime: risposta SDP non valida", 502)
    return {"sdp": answer, "deployment": cfg.deployment, "model": cfg.model,
            "expiresAt": grant["expiresAt"], "transport": "webrtc"}


def _probe_deployment(cfg: RealtimeConfig, timeout: float) -> bool | None:
    """True/False when the data plane says the deployment exists or not; None when unknown.
    Empty request (no audio, nothing created): a missing deployment answers DeploymentNotFound."""
    url = f"{cfg.endpoint}/openai/deployments/{quote(cfg.deployment)}/audio/transcriptions?api-version=2025-03-01-preview"
    req = urllib.request.Request(url, data=b"", method="POST", headers={"api-key": cfg.api_key})
    try:
        with urllib.request.urlopen(req, timeout=timeout):  # noqa: S310
            return True
    except urllib.error.HTTPError as ex:
        try:
            body = ex.read().decode("utf-8", errors="replace")
        except Exception:  # noqa: BLE001
            body = ""
        if ex.code == 404 and "DeploymentNotFound" in body:
            return False
        # Only an explicit operation-level refusal proves the deployment exists (e.g. a realtime-only
        # model refusing /audio/transcriptions). Anything else (404 resource, api-version…) = unknown.
        if ex.code in (400, 405, 415, 422) and ("OperationNotSupported" in body or "not supported" in body.lower()):
            return True
        return None
    except Exception:  # noqa: BLE001 — diagnostics only
        return None


def health(cfg: RealtimeConfig | None, timeout: float = 8.0) -> dict[str, Any]:
    """Non-destructive diagnostic: endpoint + auth + deployment presence (no session is created)."""
    if cfg is None:
        return {"ok": False, "code": "not_configured",
                "message": "AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_API_KEY non configurati nel runtime"}
    host = urlsplit(cfg.endpoint).netloc
    base = {"endpointHost": host.split(".", 1)[-1] if "." in host else host, "deployment": cfg.deployment}
    try:
        data = _request("GET", f"{cfg.endpoint}/openai/deployments?api-version=2022-12-01", cfg.api_key, None, timeout)
    except SttError as ex:
        return {**base, "ok": False, "code": ex.kind, "message": str(ex)}
    deployments = {d.get("id"): d.get("model") for d in data.get("data", []) if isinstance(d, dict)}
    if cfg.deployment not in deployments:
        # The legacy listing may omit newer deployments: confirm on the data plane before failing.
        exists = _probe_deployment(cfg, timeout)
        if exists:
            return {**base, "ok": True, "code": "ok", "model": cfg.model,
                    "message": "Deployment presente (verificato sul data plane); autenticazione valida"}
        return {**base, "ok": False, "code": "deployment_missing",
                "message": f"Deployment '{cfg.deployment}' assente nella risorsa Azure OpenAI: "
                           "crealo (modello gpt-live-transcribe) o imposta AI_STT_DEPLOYMENT"}
    return {**base, "ok": True, "code": "ok", "model": deployments[cfg.deployment],
            "message": "Deployment presente; autenticazione valida"}


# ── server transport: one utterance over the Realtime WebSocket ─────────────────────────────────

def wav_to_pcm24k(wav: bytes) -> bytes:
    """PCM16 mono WAV (any rate) → raw PCM16 mono 24 kHz (linear interpolation)."""
    try:
        return _wav_to_pcm24k(wav)
    except struct.error as ex:  # truncated/malformed chunks
        raise SttError("invalid_audio", "Audio WAV non valido", 400) from ex


def _wav_to_pcm24k(wav: bytes) -> bytes:
    if len(wav) < 44 or wav[:4] != b"RIFF" or wav[8:12] != b"WAVE":
        raise SttError("invalid_audio", "Audio WAV non valido", 400)
    pos, rate, channels, bits, data = 12, None, None, None, None
    while pos + 8 <= len(wav):
        cid, size = wav[pos:pos + 4], struct.unpack("<I", wav[pos + 4:pos + 8])[0]
        body = wav[pos + 8:pos + 8 + size]
        if cid == b"fmt ":
            fmt, channels, rate = struct.unpack("<HHI", body[:8])
            bits = struct.unpack("<H", body[14:16])[0]
            if fmt != 1:
                raise SttError("invalid_audio", "WAV non PCM", 400)
        elif cid == b"data":
            data = body
            break
        pos += 8 + size + (size & 1)
    if data is None or rate is None or channels != 1 or bits != 16 or not rate:
        raise SttError("invalid_audio", "Serve WAV PCM16 mono", 400)
    samples = struct.unpack(f"<{len(data) // 2}h", data[: len(data) // 2 * 2])
    if rate == REALTIME_RATE:
        return bytes(data[: len(samples) * 2])
    ratio = rate / REALTIME_RATE
    n = int(len(samples) / ratio)
    out = []
    for i in range(n):
        x = i * ratio
        j = int(x)
        frac = x - j
        a = samples[j]
        b = samples[j + 1] if j + 1 < len(samples) else a
        out.append(int(a + (b - a) * frac))
    return struct.pack(f"<{len(out)}h", *out)


@dataclass
class LiveTranscript:
    text: str
    partials: int
    first_partial_ms: int | None
    final_ms: int


async def transcribe_ws(cfg: RealtimeConfig, pcm24k: bytes, timeout: float = 20.0,
                        connect=None) -> LiveTranscript:
    """Stream one utterance, commit, return the final transcript (deltas counted, never returned)."""
    if connect is None:
        from websockets.asyncio.client import connect as ws_connect  # uvicorn[standard] ships websockets

        def connect(url, headers):  # noqa: E306
            return ws_connect(url, additional_headers=headers, max_size=2 ** 22, open_timeout=timeout)

    t0 = time.monotonic()
    partials = 0
    first_partial_ms = None
    try:
        async with asyncio.timeout(timeout):
            async with connect(cfg.websocket_url, {"api-key": cfg.api_key}) as ws:
                await ws.send(json.dumps({"type": "session.update", "session": session_config(cfg)}))
                for i in range(0, len(pcm24k), CHUNK_BYTES):
                    chunk = base64.b64encode(pcm24k[i:i + CHUNK_BYTES]).decode("ascii")
                    await ws.send(json.dumps({"type": "input_audio_buffer.append", "audio": chunk}))
                await ws.send(json.dumps({"type": "input_audio_buffer.commit"}))
                async for message in ws:
                    event = json.loads(message)
                    kind = event.get("type")
                    if kind == "conversation.item.input_audio_transcription.delta":
                        partials += 1
                        if first_partial_ms is None:
                            first_partial_ms = int((time.monotonic() - t0) * 1000)
                    elif kind == "conversation.item.input_audio_transcription.completed":
                        return LiveTranscript(str(event.get("transcript") or "").strip(), partials,
                                              first_partial_ms, int((time.monotonic() - t0) * 1000))
                    elif kind == "conversation.item.input_audio_transcription.failed":
                        raise SttError("provider_error", "Azure: trascrizione non riuscita", 502)
                    elif kind == "error":
                        err = event.get("error") or {}
                        code = str(err.get("code") or "")
                        if "buffer_too_small" in code or "empty" in code:
                            return LiveTranscript("", partials, first_partial_ms,
                                                  int((time.monotonic() - t0) * 1000))
                        raise SttError("provider_error", f"Azure realtime: {code or 'errore'}", 502)
                raise SttError("provider_error", "Azure realtime: connessione chiusa senza trascrizione", 502)
    except TimeoutError as ex:
        raise SttError("timeout", "Azure realtime: timeout", 504) from ex
    except SttError:
        raise
    except OSError as ex:
        raise SttError("unavailable", "Azure realtime non raggiungibile", 503) from ex
    except Exception as ex:  # websockets handshake errors (e.g. 404 deployment) and protocol errors
        status = getattr(getattr(ex, "response", None), "status_code", None)
        if status in (401, 403):
            raise SttError("auth_failed", f"Azure realtime: autenticazione rifiutata ({status})", 503) from ex
        if status == 404:
            raise SttError("not_configured", "Azure realtime: deployment STT non trovato", 503) from ex
        raise SttError("provider_error", f"Azure realtime: {type(ex).__name__}", 502) from ex
