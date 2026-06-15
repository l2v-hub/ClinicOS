"""ModelSpec: the `provider:model_id` value object (REQ-024).

The ONLY accepted way to name a model anywhere in the runtime. No bare model IDs,
no provider class names — every model is `provider:model_id`. Parsing/validation
lives here so business logic never hardcodes a model.
"""
from __future__ import annotations

from dataclasses import dataclass

from .errors import ConfigError

# Providers the runtime knows how to build (SDK adapters live in models/providers/*).
SUPPORTED_PROVIDERS = {"google", "openai", "anthropic", "azure", "openai-like", "mistral", "mock"}


@dataclass(frozen=True)
class ModelSpec:
    provider: str
    model_id: str

    def __str__(self) -> str:  # canonical form
        return f"{self.provider}:{self.model_id}"

    @staticmethod
    def parse(value: str) -> "ModelSpec":
        raw = (value or "").strip()
        if not raw:
            raise ConfigError("Model spec vuoto (atteso 'provider:model_id')")
        if ":" not in raw:
            raise ConfigError(f"Model spec '{raw}' non valido: formato atteso 'provider:model_id'")
        provider, model_id = raw.split(":", 1)
        provider = provider.strip().lower()
        model_id = model_id.strip()
        if not provider or not model_id:
            raise ConfigError(f"Model spec '{raw}' non valido: provider e model_id obbligatori")
        if provider not in SUPPORTED_PROVIDERS:
            raise ConfigError(
                f"Provider '{provider}' non supportato (ammessi: {', '.join(sorted(SUPPORTED_PROVIDERS))})"
            )
        return ModelSpec(provider=provider, model_id=model_id)

    @staticmethod
    def parse_optional(value: str | None) -> "ModelSpec | None":
        if value is None or not value.strip():
            return None
        return ModelSpec.parse(value)
