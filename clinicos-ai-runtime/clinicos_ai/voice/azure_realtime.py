"""Azure realtime SDP negotiation. API key and ephemeral token remain server-side.

Only explicit STT_REALTIME_MODEL is used. The existing file-transcription model is untouched.
No diagnostic path creates sessions; no credentials, SDP, audio or transcript are logged.
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Mapping
from urllib.parse import urlsplit

from .stt import SttError

MAX_RESPONSE_BYTES = 96_000


@dataclass(frozen=True)
class RealtimeConfig:
    endpoint: str
    api_key: str = field(repr=False)
    model: str
    language: str = "it"


def realtime_config(env: Mapping[str, str] | None = None, *, model: str | None = None) -> RealtimeConfig | None:
    e = os.environ if env is None else env
    endpoint = (e.get("AZURE_OPENAI_REALTIME_ENDPOINT") or e.get("AZURE_OPENAI_ENDPOINT") or "").strip().rstrip("/")
    key = (e.get("AZURE_OPENAI_API_KEY") or "").strip()
    model = (model or e.get("STT_REALTIME_MODEL") or "").strip()
    if not endpoint or not key or not model:
        return None
    try:
        parts = urlsplit(endpoint)
        port = parts.port
    except ValueError as ex:
        raise SttError("not_configured", "Endpoint STT realtime non valido", 503) from ex
    # Trusted configuration still cannot forward a service credential to an insecure or malformed URL.
    if (parts.scheme != "https" or not parts.hostname or parts.username or parts.password
            or parts.path not in ("", "/") or parts.query or parts.fragment or port not in (None, 443)):
        raise SttError("not_configured", "Endpoint STT realtime non valido", 503)
    if len(model) > 200 or any(c in model for c in "\r\n\x00"):
        raise SttError("not_configured", "Modello STT realtime non valido", 503)
    return RealtimeConfig(endpoint, key, model)


def session_config(cfg: RealtimeConfig) -> dict:
    return {"type": "transcription", "audio": {"input": {
        "format": {"type": "audio/pcm", "rate": 24000},
        "transcription": {"model": cfg.model, "languages": [cfg.language]},
        "turn_detection": None,
    }}}


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def _http(req: urllib.request.Request, timeout: float) -> bytes:
    try:
        with urllib.request.build_opener(_NoRedirect).open(req, timeout=timeout) as response:
            raw = response.read(MAX_RESPONSE_BYTES + 1)
        if len(raw) > MAX_RESPONSE_BYTES:
            raise SttError("provider_error", "Risposta STT realtime troppo grande", 502)
        return raw
    except urllib.error.HTTPError as ex:
        # Never echo provider body: it may contain request values or credentials.
        kind, code = ("auth_failed", 503) if ex.code in (401, 403) else (
            ("rate_limited", 503) if ex.code == 429 else ("provider_error", 502))
        raise SttError(kind, "Richiesta STT realtime rifiutata", code) from ex
    except TimeoutError as ex:
        raise SttError("timeout", "STT realtime timeout", 504) from ex
    except urllib.error.URLError as ex:
        raise SttError("unavailable", "STT realtime non raggiungibile", 503) from ex


def negotiate_call(cfg: RealtimeConfig, offer: str, timeout: float = 12.0) -> dict:
    from .realtime import validate_sdp

    validate_sdp(offer)
    deadline = time.monotonic() + timeout
    remaining = lambda: max(0.05, deadline - time.monotonic())
    req = urllib.request.Request(f"{cfg.endpoint}/openai/v1/realtime/client_secrets", method="POST",
                                 data=json.dumps({"session": session_config(cfg)}).encode(),
                                 headers={"api-key": cfg.api_key, "Content-Type": "application/json"})
    try:
        grant = json.loads(_http(req, min(5.0, remaining())).decode("utf-8"))
    except (ValueError, UnicodeDecodeError) as ex:
        raise SttError("provider_error", "Risposta STT realtime non valida", 502) from ex
    token = grant.get("value") if isinstance(grant, dict) else None
    if not isinstance(token, str) or not token or len(token) > 8192 or "\r" in token or "\n" in token:
        raise SttError("provider_error", "Token sessione STT assente o non valido", 502)
    if time.monotonic() >= deadline:
        raise SttError("timeout", "STT realtime timeout", 504)
    req = urllib.request.Request(f"{cfg.endpoint}/openai/v1/realtime/calls", method="POST", data=offer.encode(),
                                 headers={"Authorization": f"Bearer {token}", "Content-Type": "application/sdp"})
    try:
        answer = _http(req, remaining()).decode("utf-8")
    except UnicodeDecodeError as ex:
        raise SttError("provider_error", "Risposta SDP non valida", 502) from ex
    try:
        validate_sdp(answer)
    except SttError as ex:
        raise SttError("provider_error", "Risposta SDP non valida", 502) from ex
    expires = grant.get("expires_at")
    return {"sdp": answer, "model": cfg.model, "deployment": cfg.model,
            "expiresAt": int(expires) if isinstance(expires, (int, float)) and not isinstance(expires, bool) else None,
            "transport": "webrtc"}
