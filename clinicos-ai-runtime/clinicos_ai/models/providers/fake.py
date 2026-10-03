"""`test` provider — deterministic, network-free adapter for contract and provider-switch tests.

It implements the same adapter contract as every vendor (build → BuiltModel with run /
run_structured, CompletionText with usage) and produces plausible STRUCTURED outputs, so the
same application workflows run unchanged when AI_PROVIDER=test:

- command parser (SKILL_ROUTE_V1): picks the authorized skill whose name/description best
  matches the message, extracts blood pressure / SpO2 / HR values and «questo ospite»;
- read planner (ASSISTANT_PLAN_V1): a valid empty plan (never invents a tool);
- composer (ASSISTANT_COMPOSE_V1): an empty, non-grounded answer (backend falls back);
- vision/extraction: the empty ClinicOS extraction (never invents data).

AI_TEST_FAULT=timeout|rate_limit|unavailable|malformed|context_limit|content_rejected|auth|cancelled
injects the corresponding normalized failure (resilience tests). AI_TEST_LATENCY_MS adds latency.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
from typing import Any

from ..errors import ErrorKind, RuntimeError_
from ..profiles import capabilities_for
from ..spec import ModelSpec
from .base import Attachment, BuiltModel
from .completion import CompletionText
from .mock import EMPTY_EXTRACTION, EMPTY_PLAN

_FAULTS = {
    "timeout": ErrorKind.TIMEOUT, "rate_limit": ErrorKind.RATE_LIMIT,
    "unavailable": ErrorKind.PROVIDER_UNAVAILABLE, "context_limit": ErrorKind.CONTEXT_LIMIT,
    "content_rejected": ErrorKind.CONTENT_REJECTED, "auth": ErrorKind.AUTH,
    "cancelled": ErrorKind.CANCELLED,
}
_WORD = re.compile(r"[a-zà-ù0-9]{4,}", re.IGNORECASE)


def _section_json(prompt: str, header: str) -> Any:
    idx = prompt.find(header)
    if idx < 0:
        return None
    rest = prompt[idx + len(header):].lstrip()
    try:
        return json.JSONDecoder().raw_decode(rest)[0]
    except ValueError:
        return None


def _message(prompt: str) -> str:
    match = re.search(r"MESSAGGIO>>>\n(.*?)\n<<<", prompt, re.DOTALL)
    return match.group(1) if match else ""


def route_for(prompt: str) -> dict:
    """Deterministic skill routing over the AUTHORIZED skills listed in the prompt."""
    skills = _section_json(prompt, "SKILL DISPONIBILI:") or []
    message = _message(prompt).lower()
    words = set(_WORD.findall(message))
    best, best_score = None, 0
    for skill in skills if isinstance(skills, list) else []:
        if not isinstance(skill, dict) or not isinstance(skill.get("id"), str):
            continue
        haystack = f"{skill.get('id', '')} {skill.get('name', '')} {skill.get('description', '')}".lower()
        score = sum(1 for w in words if w[:5] in haystack)
        if score > best_score:
            best, best_score = skill["id"], score
    route: dict[str, Any] = {"skillId": best}
    values: dict[str, str] = {}
    pa = re.search(r"(\d{2,3})\s*(?:/|su)\s*(\d{2,3})", message)
    if pa and ("pressione" in message or "pa " in message):
        values["pa"] = f"{pa.group(1)}/{pa.group(2)}"
    for key, pattern in (("spo2", r"saturazione\s*(\d{2,3})"), ("fc", r"(?:frequenza|fc)\s*(\d{2,3})")):
        found = re.search(pattern, message)
        if found:
            values[key] = found.group(1)
    if values:
        route["values"] = values
    if re.search(r"quest[oa] (ospite|paziente)", message):
        route["currentPatient"] = True
    return route


class _FakeRunner:
    async def _maybe_fail(self) -> None:
        latency = (os.environ.get("AI_TEST_LATENCY_MS") or "").strip()
        if latency.isdigit():
            await asyncio.sleep(int(latency) / 1000)
        fault = (os.environ.get("AI_TEST_FAULT") or "").strip()
        if fault in _FAULTS:
            raise RuntimeError_(_FAULTS[fault], f"test provider fault: {fault}")

    @staticmethod
    def _wrap(text: str, prompt: str) -> CompletionText:
        return CompletionText(text, "completed", {"input_tokens": max(1, len(prompt) // 4),
                                                  "output_tokens": max(1, len(text) // 4),
                                                  "cached_input_tokens": 0})

    async def run(self, prompt: str, attachments: list[Attachment]) -> str:  # noqa: ARG002
        await self._maybe_fail()
        if (os.environ.get("AI_TEST_FAULT") or "").strip() == "malformed":
            return self._wrap("questa non è JSON {", prompt)
        if "SKILL_ROUTE_V1" in prompt:
            return self._wrap(json.dumps(route_for(prompt)), prompt)
        if "ASSISTANT_PLAN_V1" in prompt:
            return self._wrap(json.dumps(EMPTY_PLAN), prompt)
        if "ASSISTANT_COMPOSE_V1" in prompt:
            return self._wrap(json.dumps({"answerText": "", "citedSources": []}), prompt)
        return self._wrap(json.dumps(EMPTY_EXTRACTION), prompt)

    async def run_structured(self, prompt: str, schema: object, attachments: list[Attachment]) -> str:  # noqa: ARG002
        return await self.run(prompt, attachments)


def build(spec: ModelSpec, role: str, temperature: float | None, timeout_seconds: int) -> BuiltModel:  # noqa: ARG001
    return BuiltModel(spec=spec, capabilities=capabilities_for(spec), runner=_FakeRunner(), meta={"test": True})
