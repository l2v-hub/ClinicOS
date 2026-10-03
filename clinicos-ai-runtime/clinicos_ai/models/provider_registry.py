"""Provider registry — the ONE table that names AI/STT providers (Phase 9, provider-agnostic).

Adding a provider = 1) an adapter module under models/providers (and/or voice/providers for STT),
2) ONE entry here, 3) credentials/config, 4) its row in PROVIDER_CAPABILITY_MATRIX.json,
5) contract tests. Nothing else in the runtime (agents, api, skills) names a provider.

Everything that previously kept its own list (spec.SUPPORTED_PROVIDERS, factory modules, registry
credentials, env_config aliases/credentials) derives from PROVIDERS below.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Mapping

from .capabilities import ModelCapabilities


@dataclass(frozen=True)
class ProviderEntry:
    name: str
    # LLM adapter module exposing build(spec, role, temperature, timeout_seconds) -> BuiltModel
    module: str | None
    # Env vars holding the credential (presence checked, value never read outside the adapter)
    credential_env: tuple[str, ...]
    # Optional STT adapter module exposing transcribe(model, audio, mime, locale, timeout)
    stt_module: str | None = None
    # Env-facing aliases accepted in configuration
    aliases: tuple[str, ...] = ()
    # Model id -> declared capabilities (config data, no SDK)
    capabilities: Callable[[str], ModelCapabilities] | None = None
    # Human description for docs / health (no secrets)
    description: str = ""
    # Extra env vars the adapter needs besides the credential (names only)
    required_env: tuple[str, ...] = field(default_factory=tuple)
    # Optional custom credential check (env -> bool) when presence of one key is not enough
    credentials_check: Callable[[Mapping[str, str]], bool] | None = None
    # Adapter-level traits for the capability matrix (what THIS adapter implements today):
    # usage_metadata, cancellation (true = in-flight HTTP aborted), timeout, model_discovery,
    # realtime, sdk ("agno" | "openai-sdk" | "http" | "none").
    traits: Mapping[str, object] = field(default_factory=dict)
    # Model ids the vendor has deprecated / scheduled for removal: configuring one is flagged.
    deprecated_models: tuple[str, ...] = ()


def _mistral_credentials(env: Mapping[str, str]) -> bool:
    """An explicit Mistral key remains valid for custom endpoints; the Azure-hosted Mistral
    fallback is accepted only after checking the configured destination host."""
    if (env.get("MISTRAL_API_KEY") or "").strip():
        return True
    from .errors import RuntimeError_
    from .mistral_config import resolve_mistral_connection

    try:
        resolve_mistral_connection(env)
        return True
    except RuntimeError_:
        return False


def _caps(provider: str) -> Callable[[str], ModelCapabilities]:
    def resolve(model_id: str) -> ModelCapabilities:
        from .profiles import provider_capabilities  # lazy: avoids an import cycle

        return provider_capabilities(provider, model_id)

    return resolve


PROVIDERS: dict[str, ProviderEntry] = {
    "openai": ProviderEntry(
        "openai", "clinicos_ai.models.providers.openai", ("OPENAI_API_KEY",),
        stt_module="clinicos_ai.voice.providers.openai",
        capabilities=_caps("openai"),
        deprecated_models=("gpt-4o-mini-transcribe",),
        description="OpenAI API Direct (Responses API, audio transcriptions)",
        traits={"usage_metadata": True, "cancellation": True, "timeout": True, "model_discovery": False, "realtime": False, "sdk": "openai-sdk (Responses API)"},
    ),
    "azure": ProviderEntry(
        "azure", "clinicos_ai.models.providers.azure", ("AZURE_OPENAI_API_KEY",),
        stt_module="clinicos_ai.voice.providers.azure",
        aliases=("azure-openai", "openai-azure"),
        capabilities=_caps("azure"),
        description="Azure OpenAI (deployment name = model id)",
        required_env=("AZURE_OPENAI_ENDPOINT",),
        traits={"usage_metadata": True, "cancellation": False, "timeout": True, "model_discovery": False, "realtime": False, "sdk": "agno + http (structured)"},
    ),
    "google": ProviderEntry(
        "google", "clinicos_ai.models.providers.google", ("GOOGLE_API_KEY", "GEMINI_API_KEY"),
        stt_module="clinicos_ai.voice.providers.google",
        aliases=("gemini",),
        capabilities=_caps("google"),
        description="Google Gemini API",
        traits={"usage_metadata": True, "cancellation": False, "timeout": True, "model_discovery": False, "realtime": False, "sdk": "agno + http (stt)"},
    ),
    "anthropic": ProviderEntry(
        "anthropic", "clinicos_ai.models.providers.anthropic", ("ANTHROPIC_API_KEY",),
        aliases=("claude",),
        capabilities=_caps("anthropic"),
        description="Anthropic Claude (no STT)",
        traits={"usage_metadata": True, "cancellation": False, "timeout": True, "model_discovery": False, "realtime": False, "sdk": "agno"},
    ),
    "openai-like": ProviderEntry(
        "openai-like", "clinicos_ai.models.providers.openai_like", ("OPENAI_LIKE_API_KEY",),
        aliases=("local",),
        capabilities=_caps("openai-like"),
        description="Any OpenAI-compatible endpoint (self-hosted/local, OpenRouter): OPENAI_LIKE_BASE_URL",
        required_env=("OPENAI_LIKE_BASE_URL",),
        traits={"usage_metadata": True, "cancellation": False, "timeout": True, "model_discovery": False, "realtime": False, "sdk": "agno"},
    ),
    "mistral": ProviderEntry(
        "mistral", "clinicos_ai.models.providers.mistral", ("MISTRAL_API_KEY",),
        capabilities=_caps("mistral"),
        description="Mistral Document AI (OCR role only)",
        credentials_check=_mistral_credentials,
        traits={"usage_metadata": False, "cancellation": False, "timeout": True, "model_discovery": False, "realtime": False, "sdk": "http", "ocr_only": True},
    ),
    "azure-docintel": ProviderEntry(
        "azure-docintel", "clinicos_ai.models.providers.azure_docintel",
        ("AZURE_DOCINTEL_API_KEY", "AZURE_OPENAI_API_KEY"),
        aliases=("azure-document-intelligence", "document-intelligence"),
        capabilities=_caps("azure-docintel"),
        description="Azure Document Intelligence (OCR role only)",
        traits={"usage_metadata": False, "cancellation": False, "timeout": True, "model_discovery": False, "realtime": False, "sdk": "http", "ocr_only": True},
    ),
    "mock": ProviderEntry(
        "mock", "clinicos_ai.models.providers.mock", (),
        stt_module="clinicos_ai.voice.providers.mock",
        capabilities=_caps("mock"),
        description="CI: empty, never-inventing outputs",
        traits={"usage_metadata": False, "cancellation": True, "timeout": True, "model_discovery": False, "realtime": False, "sdk": "none", "default_model": "mock"},
    ),
    "test": ProviderEntry(
        "test", "clinicos_ai.models.providers.fake", (),
        stt_module="clinicos_ai.voice.providers.fake",
        aliases=("fake",),
        capabilities=_caps("mock"),
        description="Deterministic contract/switch-test provider (no network)",
        traits={"usage_metadata": True, "cancellation": True, "timeout": True, "model_discovery": False, "realtime": False, "sdk": "none", "default_model": "test"},
    ),
}

ALIASES: dict[str, str] = {alias: entry.name for entry in PROVIDERS.values() for alias in entry.aliases}


def normalize_provider(name: str | None) -> str:
    raw = (name or "").strip().lower()
    return ALIASES.get(raw, raw)


def provider_entry(name: str | None) -> ProviderEntry | None:
    return PROVIDERS.get(normalize_provider(name))


def supported_providers() -> set[str]:
    return set(PROVIDERS)


def stt_providers() -> set[str]:
    return {name for name, entry in PROVIDERS.items() if entry.stt_module}


def has_credentials(name: str, env: Mapping[str, str]) -> bool:
    entry = provider_entry(name)
    if entry is None:
        return False
    if entry.credentials_check is not None:
        return entry.credentials_check(env)
    if not entry.credential_env:
        return True
    return any(bool((env.get(k) or "").strip()) for k in entry.credential_env)


def missing_required_env(name: str, env: Mapping[str, str]) -> list[str]:
    entry = provider_entry(name)
    if entry is None:
        return []
    return [k for k in entry.required_env if not (env.get(k) or "").strip()]
