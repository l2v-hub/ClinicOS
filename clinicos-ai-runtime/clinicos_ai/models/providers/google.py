"""Google provider adapter (REQ-023). The ONLY place the Google/Agno-Gemini SDK is
imported. Builds an Agno model and wraps it in the neutral ModelRunner. Translates
SDK errors into normalized runtime errors."""
from __future__ import annotations

import asyncio

from ..errors import ProviderUnavailableError, RuntimeError_, ErrorKind
from ..profiles import capabilities_for
from ..spec import ModelSpec
from .base import Attachment, BuiltModel


class _GoogleRunner:
    def __init__(self, spec: ModelSpec, temperature: float, timeout_seconds: int) -> None:
        self._spec = spec
        self._temperature = temperature
        self._timeout = timeout_seconds

    def _build_agent(self):
        try:
            from agno.agent import Agent          # SDK isolated here
            from agno.models.google import Gemini  # gemma + gemini both via Gemini class
        except ImportError as ex:
            raise ProviderUnavailableError(f"Agno/Google SDK non installato: {ex}") from ex
        model = Gemini(id=self._spec.model_id, temperature=self._temperature)
        return Agent(model=model, markdown=False, telemetry=False)

    async def run(self, prompt: str, attachments: list[Attachment]) -> str:
        agent = self._build_agent()
        try:
            from agno.media import Image, File
        except ImportError:
            Image = File = None  # type: ignore

        images, files = [], []
        for a in attachments:
            if a.mime_type.startswith("image/") and Image is not None:
                images.append(Image(content=a.data))
            elif File is not None:
                files.append(File(content=a.data, mime_type=a.mime_type))

        def _call() -> str:
            kwargs = {}
            if images:
                kwargs["images"] = images
            if files:
                kwargs["files"] = files
            resp = agent.run(prompt, **kwargs)
            return getattr(resp, "content", None) or str(resp)

        try:
            return await asyncio.wait_for(asyncio.to_thread(_call), timeout=self._timeout)
        except asyncio.TimeoutError as ex:
            raise RuntimeError_(ErrorKind.TIMEOUT, f"Timeout {self._timeout}s") from ex
        except Exception as ex:  # normalize provider/SDK errors
            msg = str(ex)
            kind = ErrorKind.RATE_LIMIT if "429" in msg or "quota" in msg.lower() else ErrorKind.PROVIDER_ERROR
            raise RuntimeError_(kind, f"Google: {msg[:200]}") from ex


def build(spec: ModelSpec, role: str, temperature: float, timeout_seconds: int) -> BuiltModel:  # noqa: ARG001
    return BuiltModel(spec=spec, capabilities=capabilities_for(spec),
                      runner=_GoogleRunner(spec, temperature, timeout_seconds))
