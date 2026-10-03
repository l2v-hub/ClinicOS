"""Shared neutral runner used by provider adapters. The provider-specific SDK import
stays in each adapter (passed in as `build_agent`); this module only orchestrates
run/timeout/error-normalization so the logic isn't duplicated five times."""
from __future__ import annotations

import asyncio
from typing import Callable

from ..errors import RuntimeError_, ErrorKind, classify_exception
from ..profiles import capabilities_for
from ..spec import ModelSpec
from .base import Attachment, BuiltModel
from .completion import agent_completion


def classify_provider_exception(error: "BaseException | str") -> ErrorKind:
    """Provider/SDK error -> ErrorKind via the shared provider-agnostic classifier
    (errors.classify_exception: HTTP status, exception type, message). Accepts the exception
    (preferred) or, for older call sites, its message."""
    if isinstance(error, str):
        return classify_exception(Exception(error))
    return classify_exception(error)


def sdk_retry_kwargs(model_cls: type) -> dict:
    """No hidden SDK/Agno retries (Phase 9 retry policy): interactive calls must fail fast so the
    backend falls back instead of waiting while the SDK backs off (observed: ~60 s on Azure 429).
    AI_PROVIDER_SDK_RETRIES (default 0) is the single knob; applied only to fields the class has."""
    import dataclasses
    import os

    try:
        retries = max(0, min(5, int((os.environ.get("AI_PROVIDER_SDK_RETRIES") or "0").strip())))
    except ValueError:
        retries = 0
    names = {f.name for f in dataclasses.fields(model_cls)} if dataclasses.is_dataclass(model_cls) else set()
    return {name: retries for name in ("max_retries", "retries") if name in names}


class _GenericRunner:
    def __init__(self, build_agent: Callable[[], object], timeout_seconds: int, label: str) -> None:
        self._build_agent = build_agent
        self._timeout = timeout_seconds
        self._label = label

    async def run(self, prompt: str, attachments: list[Attachment]) -> str:
        agent = self._build_agent()

        def _call():
            return agent.run(prompt)  # text-first; multimodal adapters override build_agent

        try:
            resp = await asyncio.wait_for(asyncio.to_thread(_call), timeout=self._timeout)
        except asyncio.TimeoutError as ex:
            raise RuntimeError_(ErrorKind.TIMEOUT, f"Timeout {self._timeout}s") from ex
        except Exception as ex:
            kind = classify_provider_exception(ex)
            raise RuntimeError_(kind, f"{self._label}: {str(ex)[:200]}") from ex

        return agent_completion(resp, self._label)


def make_built(spec: ModelSpec, build_agent: Callable[[], object], timeout_seconds: int, label: str) -> BuiltModel:
    return BuiltModel(spec=spec, capabilities=capabilities_for(spec),
                      runner=_GenericRunner(build_agent, timeout_seconds, label))
