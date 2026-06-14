"""Anthropic provider adapter (REQ-023). Anthropic/Agno SDK imported ONLY here."""
from __future__ import annotations
from ..errors import ProviderUnavailableError
from ..spec import ModelSpec
from .base import BuiltModel
from ._common import make_built


def build(spec: ModelSpec, role: str, temperature: float, timeout_seconds: int) -> BuiltModel:  # noqa: ARG001
    def build_agent():
        try:
            from agno.agent import Agent
            from agno.models.anthropic import Claude
        except ImportError as ex:
            raise ProviderUnavailableError(f"Agno/Anthropic SDK non installato: {ex}") from ex
        return Agent(model=Claude(id=spec.model_id, temperature=temperature), markdown=False, telemetry=False)
    return make_built(spec, build_agent, timeout_seconds, "Anthropic")
