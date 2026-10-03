"""Cost telemetry and SOFT budgets (Phase 9B).

Prices are configuration, never code: AI_PRICING_JSON maps a model id (or "provider:model") to USD
prices, e.g. {"gpt-5.6-luna": {"input_per_1m": 0.0, "output_per_1m": 0.0, "cached_input_per_1m": 0.0},
"gpt-transcribe": {"audio_per_minute": 0.0}} — fill in the provider's current price list. Without a
price the call is counted (tokens, seconds) but its cost is None, never invented.

AI_DAILY_SOFT_BUDGET_USD / AI_MONTHLY_SOFT_BUDGET_USD are ALERT thresholds, not billing caps: when
exceeded the runtime logs one warning per period and /v1/runtime/ai-health reports it. The hard,
blocking guard stays AI_DAILY_TOKEN_BUDGET (contract.TokenBudget). The provider's own billing limit
is configured in the provider console.
"""
from __future__ import annotations

import json
import logging
import threading
from datetime import date
from typing import Any, Mapping

_log = logging.getLogger("clinicos_ai.cost")


def _pricing(env: Mapping[str, str]) -> dict[str, dict[str, float]]:
    raw = (env.get("AI_PRICING_JSON") or "").strip()
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except ValueError:
        return {}
    return {str(k): {kk: float(vv) for kk, vv in v.items() if isinstance(vv, (int, float))}
            for k, v in data.items() if isinstance(v, dict)} if isinstance(data, dict) else {}


def estimate_usd(provider: str, model: str, usage: Mapping[str, Any], env: Mapping[str, str]) -> float | None:
    """Estimated USD of one call from configured prices; None when the model has no price."""
    prices = _pricing(env)
    price = prices.get(f"{provider}:{model}") or prices.get(model)
    if not price:
        return None
    cached = float(usage.get("cached_input_tokens") or 0)
    fresh_in = max(0.0, float(usage.get("input_tokens") or usage.get("inputTokens") or 0) - cached)
    out = float(usage.get("output_tokens") or usage.get("outputTokens") or 0)
    seconds = float(usage.get("audio_seconds") or usage.get("audioSeconds") or 0)
    cost = (fresh_in * price.get("input_per_1m", 0) + cached * price.get("cached_input_per_1m",
            price.get("input_per_1m", 0)) + out * price.get("output_per_1m", 0)) / 1_000_000
    cost += seconds / 60 * price.get("audio_per_minute", 0)
    return round(cost, 8)


class CostMeter:
    """Per-process estimated spend with daily/monthly SOFT budget alerts."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.reset()

    def reset(self) -> None:
        self._day, self._month = date.today(), date.today().strftime("%Y-%m")
        self._daily = self._monthly = 0.0
        self._calls = self._unpriced = 0
        self._alerted: set[str] = set()

    @staticmethod
    def _limit(env: Mapping[str, str], name: str) -> float:
        try:
            return max(0.0, float((env.get(name) or "0").strip()))
        except ValueError:
            return 0.0

    def add(self, cost: float | None, env: Mapping[str, str]) -> None:
        with self._lock:
            today = date.today()
            if today != self._day:
                self._day, self._daily = today, 0.0
                self._alerted.discard("daily")
            if today.strftime("%Y-%m") != self._month:
                self._month, self._monthly = today.strftime("%Y-%m"), 0.0
                self._alerted.discard("monthly")
            self._calls += 1
            if cost is None:
                self._unpriced += 1
                return
            self._daily += cost
            self._monthly += cost
            for period, spent, name in (("daily", self._daily, "AI_DAILY_SOFT_BUDGET_USD"),
                                        ("monthly", self._monthly, "AI_MONTHLY_SOFT_BUDGET_USD")):
                limit = self._limit(env, name)
                if limit and spent > limit and period not in self._alerted:
                    self._alerted.add(period)
                    # Alert hook: one structured warning per period (log-based alerting picks it up).
                    _log.warning("ai-budget soft limit exceeded period=%s spentUsd=%.4f limitUsd=%.4f",
                                 period, spent, limit)

    def snapshot(self, env: Mapping[str, str]) -> dict[str, Any]:
        with self._lock:
            daily_limit = self._limit(env, "AI_DAILY_SOFT_BUDGET_USD")
            monthly_limit = self._limit(env, "AI_MONTHLY_SOFT_BUDGET_USD")
            return {"estimatedUsdToday": round(self._daily, 6), "estimatedUsdMonth": round(self._monthly, 6),
                    "dailySoftLimitUsd": daily_limit, "monthlySoftLimitUsd": monthly_limit,
                    "dailySoftExceeded": bool(daily_limit and self._daily > daily_limit),
                    "monthlySoftExceeded": bool(monthly_limit and self._monthly > monthly_limit),
                    "calls": self._calls, "unpricedCalls": self._unpriced,
                    "pricingConfigured": bool(_pricing(env))}


COSTS = CostMeter()
