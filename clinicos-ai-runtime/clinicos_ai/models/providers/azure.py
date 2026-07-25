"""Azure OpenAI provider adapter (REQ-023). Azure/Agno SDK imported ONLY here.
Credentials/endpoint via AZURE_OPENAI_API_KEY / AZURE_OPENAI_ENDPOINT (env)."""
from __future__ import annotations

import asyncio

from ..errors import ProviderUnavailableError, RuntimeError_, ErrorKind
from ..profiles import capabilities_for
from ..spec import ModelSpec
from .base import Attachment, BuiltModel


class _AzureRunner:
    """Runner multimodale: gli allegati dell'import (foto/PDF) vengono passati ad Agno
    come Image/File — il runner generico di _common li scarterebbe (solo testo)."""

    def __init__(self, spec: ModelSpec, temperature: float, timeout_seconds: int) -> None:
        self._spec = spec
        self._temperature = temperature
        self._timeout = timeout_seconds

    def _build_agent(self):
        try:
            from agno.agent import Agent
            from agno.models.azure import AzureOpenAI
        except ImportError as ex:
            raise ProviderUnavailableError(f"Agno/Azure SDK non installato: {ex}") from ex
        return Agent(model=AzureOpenAI(id=self._spec.model_id, temperature=self._temperature),
                     markdown=False, telemetry=False)

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

        def _call():
            kwargs = {}
            if images:
                kwargs["images"] = images
            if files:
                kwargs["files"] = files
            return agent.run(prompt, **kwargs)

        try:
            resp = await asyncio.wait_for(asyncio.to_thread(_call), timeout=self._timeout)
        except asyncio.TimeoutError as ex:
            raise RuntimeError_(ErrorKind.TIMEOUT, f"Timeout {self._timeout}s") from ex
        except Exception as ex:
            msg = str(ex)
            kind = ErrorKind.RATE_LIMIT if "429" in msg or "quota" in msg.lower() else ErrorKind.PROVIDER_ERROR
            raise RuntimeError_(kind, f"Azure: {msg[:200]}") from ex

        # Agno può catturare l'errore provider e restituirlo come RunOutput status=ERROR:
        # deve emergere come errore reale, non essere restituito come completion (issue #239).
        status = getattr(resp, "status", None)
        if status is not None and str(getattr(status, "value", status)).upper() == "ERROR":
            detail = str(getattr(resp, "content", None) or "provider error")[:200]
            raise RuntimeError_(ErrorKind.PROVIDER_ERROR, f"Azure: {detail}")
        return getattr(resp, "content", None) or str(resp)


def build(spec: ModelSpec, role: str, temperature: float, timeout_seconds: int) -> BuiltModel:  # noqa: ARG001
    return BuiltModel(spec=spec, capabilities=capabilities_for(spec),
                      runner=_AzureRunner(spec, temperature, timeout_seconds))
