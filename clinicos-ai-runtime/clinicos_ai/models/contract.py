"""Provider-agnostic AI contract (Phase 9).

    Agents / API  ──generate(registry, AIRequest)──▶  provider registry  ──▶  adapter (openai, azure, …)
                  ◀─────────── AIResponse (text, structured?, Usage, provider, model, role) ───────────

Business code speaks in LOGICAL MODEL ROLES (ModelRole) and receives neutral AIResponse / Usage /
normalized error codes. It never names a provider or a model and never imports a vendor SDK. The
adapters (models/providers/*) are the only place that knows a vendor.
"""
from __future__ import annotations

import json
import logging
import os
import threading
import time
from dataclasses import asdict, dataclass, field
from datetime import date
from enum import Enum
from typing import Any, Mapping, Protocol

from .capabilities import ModelCapabilities
from .errors import ErrorKind, RuntimeError_, ai_error_code
from .cost import COSTS, estimate_usd
from .providers.base import Attachment

_log = logging.getLogger("clinicos_ai.ai")


class ModelRole(str, Enum):
    """Logical roles. Code asks for a role; configuration decides provider + model."""

    FAST = "fast"                      # cheap/short: JSON repair, small rewrites
    REASONING = "reasoning"            # read-only query planning
    SUMMARY = "summary"                # grounded answers, shift briefing
    COMMAND_PARSER = "command_parser"  # natural language -> skill + slots (structured intent)
    VISION = "vision"                  # documents/photos -> structured extraction
    OCR = "ocr"                        # layout OCR (document AI; separate scope, unchanged)
    STT = "stt"                        # speech to text (voice layer, separate contract)


LLM_ROLES = (ModelRole.FAST, ModelRole.REASONING, ModelRole.SUMMARY,
             ModelRole.COMMAND_PARSER, ModelRole.VISION, ModelRole.OCR)

# Legacy role names (pre-Phase 9) still accepted by the registry.
LEGACY_ROLE_ALIASES = {"agent": "command_parser", "extraction": "vision", "repair": "fast"}


@dataclass
class Usage:
    """Normalized usage of ONE provider call (telemetry, benchmark, cost analysis)."""

    input_tokens: int = 0
    output_tokens: int = 0
    cached_input_tokens: int | None = None
    reasoning_tokens: int | None = None
    audio_seconds: float | None = None
    provider: str = ""
    model: str = ""
    request_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {k: v for k, v in asdict(self).items() if v is not None}


@dataclass
class AIRequest:
    role: ModelRole
    prompt: str
    attachments: list[Attachment] = field(default_factory=list)
    # JSON schema (or example object) when a structured answer is required.
    schema: Any = None
    # Interpretation-only requests may use the configured fallback provider. A request that
    # directly produces a clinically sensitive write must never be re-routed silently.
    allow_fallback: bool = True
    purpose: str = ""  # free label for telemetry (e.g. "skill_route"); never content


@dataclass
class AIResponse:
    text: str
    role: str
    provider: str
    model: str
    usage: Usage
    finish_reason: str | None = None
    latency_ms: int = 0
    fallback_used: bool = False
    estimated_usd: float | None = None

    def completion(self):
        """The text WITH its completion metadata (finish reason, usage): truncation checks
        downstream (extraction, repair) must never lose them."""
        from .providers.completion import CompletionText

        return CompletionText(self.text, self.finish_reason, self.usage.to_dict())

    def metadata(self) -> dict[str, Any]:
        """Secret/content-free metadata returned to the backend and logged."""
        return {"provider": self.provider, "model": self.model, "role": self.role,
                "latencyMs": self.latency_ms, "fallbackUsed": self.fallback_used,
                "finishReason": self.finish_reason, "usage": self.usage.to_dict(),
                **({"estimatedUsd": self.estimated_usd} if self.estimated_usd is not None else {})}


@dataclass
class ProviderHealth:
    provider: str
    configured: bool
    credentials_present: bool
    missing_env: list[str] = field(default_factory=list)


class AIProvider(Protocol):
    """What an adapter must offer (models/providers/<name>.build returns a BuiltModel whose
    runner implements run(); run_structured() is optional and declared by capabilities)."""

    capabilities: ModelCapabilities

    async def run(self, prompt: str, attachments: list[Attachment]) -> str: ...


# ── Usage extraction (adapters attach it to the CompletionText they return) ───────────────────

def usage_from_metrics(metrics: Any) -> dict[str, int]:
    """Agno RunMetrics / provider usage objects / dicts → token counts (no content)."""
    if metrics is None:
        return {}

    def pick(*names: str) -> int | None:
        for name in names:
            value = metrics.get(name) if isinstance(metrics, dict) else getattr(metrics, name, None)
            if isinstance(value, list):  # agno 1.x kept per-message lists
                value = sum(v for v in value if isinstance(v, (int, float)))
            if isinstance(value, (int, float)) and value >= 0:
                return int(value)
        return None

    out: dict[str, int] = {}
    for key, names in (("input_tokens", ("input_tokens", "prompt_tokens", "promptTokenCount")),
                       ("output_tokens", ("output_tokens", "completion_tokens", "candidatesTokenCount")),
                       ("cached_input_tokens", ("cache_read_tokens", "cached_tokens")),
                       ("reasoning_tokens", ("reasoning_tokens",))):
        value = pick(*names)
        if value is not None:
            out[key] = value
    out_details = metrics.get("output_tokens_details") if isinstance(metrics, dict) else getattr(metrics, "output_tokens_details", None)
    reasoning = getattr(out_details, "reasoning_tokens", None) if out_details is not None and not isinstance(out_details, dict) else (out_details or {}).get("reasoning_tokens")
    if isinstance(reasoning, int):
        out["reasoning_tokens"] = reasoning
    details = metrics.get("input_tokens_details") if isinstance(metrics, dict) else getattr(metrics, "input_tokens_details", None)
    cached = getattr(details, "cached_tokens", None) if details is not None and not isinstance(details, dict) else (details or {}).get("cached_tokens")
    if isinstance(cached, int):
        out["cached_input_tokens"] = cached
    return out


# ── App-level token budget (cost guard; provider billing is NOT a realtime breaker) ───────────

class TokenBudget:
    """Daily token budget per process. AI_DAILY_TOKEN_BUDGET unset/0 = unlimited."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._day = date.today()
        self._used = 0

    def _limit(self, env: Mapping[str, str]) -> int:
        try:
            return max(0, int((env.get("AI_DAILY_TOKEN_BUDGET") or "0").strip()))
        except ValueError:
            return 0

    def check(self, env: Mapping[str, str]) -> None:
        limit = self._limit(env)
        with self._lock:
            if self._day != date.today():
                self._day, self._used = date.today(), 0
            if limit and self._used >= limit:
                raise RuntimeError_(ErrorKind.BUDGET_EXCEEDED, "Budget giornaliero di token AI esaurito")

    def add(self, usage: Usage) -> None:
        with self._lock:
            self._used += usage.input_tokens + usage.output_tokens

    def snapshot(self, env: Mapping[str, str]) -> dict[str, int]:
        with self._lock:
            return {"usedToday": self._used, "dailyLimit": self._limit(env)}

    def reset(self) -> None:
        with self._lock:
            self._day, self._used = date.today(), 0


BUDGET = TokenBudget()


def ai_enabled(env: Mapping[str, str]) -> bool:
    """AI_ENABLED master switch, honoured by the runtime too (defence in depth)."""
    return (env.get("AI_ENABLED") or "true").strip().lower() != "false"


def _spec_parts(built: Any) -> tuple[str, str]:
    spec = built.spec
    if hasattr(spec, "provider"):
        return spec.provider, spec.model_id
    provider, _, model = str(spec).partition(":")
    return provider, model


# ── The single gateway ───────────────────────────────────────────────────────────────────────

async def generate(registry: Any, request: AIRequest, env: Mapping[str, str] | None = None,
                   correlation_id: str | None = None) -> AIResponse:
    """Run one logical-role request through the configured provider (and, only when enabled and
    allowed, the configured fallback provider). Raises RuntimeError_ with a normalized kind."""
    from ..correlation import current_request_id

    e = env if env is not None else os.environ
    role = request.role.value if isinstance(request.role, ModelRole) else str(request.role)
    cid = correlation_id or current_request_id() or "-"
    if not ai_enabled(e):
        # Master switch (AI_ENABLED=false): no provider call at all; callers degrade.
        raise RuntimeError_(ErrorKind.PROVIDER_UNAVAILABLE, "AI disattivata (AI_ENABLED=false)")
    BUDGET.check(e)
    # ModelRegistry exposes candidates() (primary + allowed fallback); minimal registries (tests,
    # embedders) only need build(role).
    if callable(getattr(type(registry), "candidates", None)):
        candidates = registry.candidates(role, include_fallback=request.allow_fallback)
    else:
        candidates = [registry.build(role)]
    last_error: BaseException | None = None
    for index, built in enumerate(candidates):
        t0 = time.monotonic()
        status = "ok"
        counts: dict = {}
        cost: float | None = None
        try:
            if request.schema is not None and hasattr(built.runner, "run_structured"):
                raw = await built.runner.run_structured(request.prompt, request.schema, request.attachments)
            elif request.schema is not None:
                # Provider without native structured output: the schema travels in the prompt.
                prompt = (f"{request.prompt}\n\nSCHEMA (compila i valori, non inventare):\n"
                          f"{json.dumps(request.schema)}\nRispondi SOLO con JSON valido.")
                raw = await built.runner.run(prompt, request.attachments)
            else:
                raw = await built.runner.run(request.prompt, request.attachments)
            latency = int((time.monotonic() - t0) * 1000)
            counts = getattr(raw, "usage", None) or {}
            provider, model = _spec_parts(built)
            usage = Usage(provider=provider, model=model, request_id=None if cid == "-" else cid, **counts)
            BUDGET.add(usage)
            cost = estimate_usd(provider, model, usage.to_dict(), e)
            COSTS.add(cost, e)
            return AIResponse(text=str(raw), role=role, provider=provider, model=model, usage=usage,
                              estimated_usd=cost,
                              finish_reason=getattr(raw, "finish_reason", None), latency_ms=latency,
                              fallback_used=index > 0)
        except RuntimeError_ as ex:
            status = ai_error_code(ex)
            last_error = ex
            # Only availability-class failures may move to the fallback provider.
            if status not in ("RATE_LIMIT", "TIMEOUT", "PROVIDER_UNAVAILABLE"):
                raise
        except Exception as ex:  # adapters normalize; this is the last safety net
            status = ai_error_code(ex)
            last_error = RuntimeError_(ErrorKind.PROVIDER_ERROR, f"{type(ex).__name__}")
            last_error.__cause__ = ex
        finally:
            _log.info("ai call role=%s purpose=%s provider=%s model=%s latencyMs=%d status=%s fallback=%s "
                      "retries=0 inTok=%s outTok=%s estUsd=%s correlationId=%s",
                      role, request.purpose or "-", *_spec_parts(built),
                      int((time.monotonic() - t0) * 1000), status, index > 0,
                      counts.get("input_tokens", "-"), counts.get("output_tokens", "-"),
                      "-" if cost is None else cost, cid)
    if isinstance(last_error, RuntimeError_):
        raise last_error
    raise RuntimeError_(ErrorKind.CONFIG, f"Nessun modello utilizzabile per il ruolo '{role}'")
