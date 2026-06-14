"""Shared neutral runner used by provider adapters. The provider-specific SDK import
stays in each adapter (passed in as `build_agent`); this module only orchestrates
run/timeout/error-normalization so the logic isn't duplicated five times."""
from __future__ import annotations

import asyncio
from typing import Callable

from ..errors import RuntimeError_, ErrorKind
from ..profiles import capabilities_for
from ..spec import ModelSpec
from .base import Attachment, BuiltModel


class _GenericRunner:
    def __init__(self, build_agent: Callable[[], object], timeout_seconds: int, label: str) -> None:
        self._build_agent = build_agent
        self._timeout = timeout_seconds
        self._label = label

    async def run(self, prompt: str, attachments: list[Attachment]) -> str:
        agent = self._build_agent()

        def _call() -> str:
            resp = agent.run(prompt)  # text-first; multimodal adapters override build_agent
            return getattr(resp, "content", None) or str(resp)

        try:
            return await asyncio.wait_for(asyncio.to_thread(_call), timeout=self._timeout)
        except asyncio.TimeoutError as ex:
            raise RuntimeError_(ErrorKind.TIMEOUT, f"Timeout {self._timeout}s") from ex
        except Exception as ex:
            msg = str(ex)
            kind = ErrorKind.RATE_LIMIT if "429" in msg or "quota" in msg.lower() else ErrorKind.PROVIDER_ERROR
            raise RuntimeError_(kind, f"{self._label}: {msg[:200]}") from ex


def make_built(spec: ModelSpec, build_agent: Callable[[], object], timeout_seconds: int, label: str) -> BuiltModel:
    return BuiltModel(spec=spec, capabilities=capabilities_for(spec),
                      runner=_GenericRunner(build_agent, timeout_seconds, label))
