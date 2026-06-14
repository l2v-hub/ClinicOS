"""OpenAI-compatible provider adapter (REQ-023). SDK imported ONLY here.
Base URL via OPENAI_LIKE_BASE_URL, key via OPENAI_LIKE_API_KEY (env)."""
from __future__ import annotations
import os
from ..errors import ProviderUnavailableError, ConfigError
from ..spec import ModelSpec
from .base import BuiltModel
from ._common import make_built


def build(spec: ModelSpec, role: str, temperature: float, timeout_seconds: int) -> BuiltModel:  # noqa: ARG001
    base_url = (os.environ.get("OPENAI_LIKE_BASE_URL") or "").strip()
    if not base_url:
        raise ConfigError("OPENAI_LIKE_BASE_URL mancante per provider openai-like")
    def build_agent():
        try:
            from agno.agent import Agent
            from agno.models.openai.like import OpenAILike
        except ImportError as ex:
            raise ProviderUnavailableError(f"Agno OpenAILike non installato: {ex}") from ex
        return Agent(
            model=OpenAILike(id=spec.model_id, base_url=base_url,
                             api_key=os.environ.get("OPENAI_LIKE_API_KEY"), temperature=temperature),
            markdown=False, telemetry=False,
        )
    return make_built(spec, build_agent, timeout_seconds, "OpenAILike")
