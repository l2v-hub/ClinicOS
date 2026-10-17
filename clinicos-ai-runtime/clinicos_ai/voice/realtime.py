"""Optional realtime transport; provider knowledge stays in the central registry/adapter.

Configuration availability is not remote provider readiness. No model/provider fallback, no
session is created by status and no provider token may leave the adapter.
"""
from __future__ import annotations

import asyncio
import importlib
import os
from typing import Any, Mapping

from .stt import SttError, stt_model, stt_realtime

MAX_SDP_BYTES = 64_000


def realtime_status(env: Mapping[str, str] | None = None) -> dict[str, Any]:
    from ..models.provider_registry import provider_entry

    e = os.environ if env is None else env
    config = stt_realtime(e)
    configured = stt_model(e)
    entry = provider_entry(configured[0]) if configured else None
    available = ((e.get("AI_ENABLED") or "true").strip().lower() != "false"
                 and config["enabled"] and bool(config["model"])
                 and entry is not None and bool(entry.realtime_module))
    if available:
        try:
            adapter = importlib.import_module(entry.realtime_module)
            available = adapter.realtime_config(e, model=config["model"]) is not None
        except SttError:
            available = False
    return {**config, "available": bool(available),
            "provider": configured[0] if configured else None,
            "transports": ["webrtc"] if available else []}


def validate_sdp(value: object) -> str:
    if (not isinstance(value, str) or not value.startswith("v=0")
            or len(value.encode("utf-8")) > MAX_SDP_BYTES or "\x00" in value):
        raise SttError("invalid_sdp", "Offerta SDP non valida", 400)
    return value


async def negotiate(offer: str) -> dict[str, Any]:
    from ..models.provider_registry import provider_entry

    validate_sdp(offer)
    current = realtime_status()
    if not current["available"]:
        raise SttError("not_configured", "STT realtime non configurato o disattivato", 503)
    entry = provider_entry(current["provider"])
    adapter = importlib.import_module(entry.realtime_module)
    # Adapter validates endpoint/credentials before opening any network connection.
    config = adapter.realtime_config(model=current["model"])
    if config is None:
        raise SttError("not_configured", "STT realtime non configurato", 503)
    # The adapter bounds response sizes and checks the remaining negotiation timeout.
    return await asyncio.to_thread(adapter.negotiate_call, config, offer)
