"""Runtime configuration loaded from environment (REQ-023 §4, REQ-024).

Per-role model selection via `provider:model_id`, fallback, temperature, timeout,
plus global retry/duration/concurrency and capability requirements. Nothing here is
hardcoded to a provider — change a Railway variable, not the code.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Mapping

from .capabilities import CapabilityRequirement, DEFAULT_ROLE_REQUIREMENTS
from .errors import ConfigError
from .spec import ModelSpec
from .env_config import resolve_agnos_llm, resolve_ocr, resolve_extraction, resolve_repair
from .provider_registry import PROVIDERS, normalize_provider, provider_entry

# Phase 9: logical model roles (contract.ModelRole). Legacy names stay accepted as aliases.
ROLES = ("ocr", "vision", "command_parser", "reasoning", "summary", "fast")
LEGACY_ROLE_ALIASES = {"agent": "command_parser", "extraction": "vision", "repair": "fast"}
NEW_STYLE_ROLES = ("command_parser", "reasoning", "summary", "fast", "vision")

# Legacy resolution (AI_PROVIDER unset): the pre-Phase-9 scopes feed the logical roles, so an
# existing deployment keeps working unchanged. 'repair' follows Agnos; OCR is always its own scope.
_LEGACY_RESOLVERS = {"command_parser": resolve_agnos_llm, "reasoning": resolve_agnos_llm,
                     "summary": resolve_agnos_llm, "fast": resolve_repair,
                     "vision": resolve_extraction, "ocr": resolve_ocr}
_LEGACY_ENV_NAME = {"command_parser": "AGENT", "reasoning": "AGENT", "summary": "AGENT",
                    "fast": "REPAIR", "vision": "EXTRACTION", "ocr": "OCR"}
_DEFAULT_TIMEOUT = {"command_parser": 30, "reasoning": 30, "summary": 30, "fast": 60,
                    "vision": 300, "ocr": 300}


@dataclass(frozen=True)
class RoleConfig:
    role: str
    model: ModelSpec
    fallback: ModelSpec | None
    # None = do not send a temperature (some reasoning models accept only their default).
    temperature: float | None
    timeout_seconds: int
    requirement: CapabilityRequirement


@dataclass(frozen=True)
class RuntimeConfig:
    roles: Mapping[str, RoleConfig]
    max_retries: int
    job_max_duration_seconds: int
    max_concurrency: int
    service_token: str | None
    # AC1: soglia di retention per il garbage-collect dei job terminali in _JOBS.
    job_retention_seconds: int = 3600
    # AC4: limite superiore (byte, misurati sul base64 grezzo, senza decodificare) per il
    # totale allegati di un job — rifiutato con 413 prima di qualunque allocazione/decodifica.
    max_upload_bytes: int = 50_000_000
    errors: list[str] = field(default_factory=list)

    @property
    def available(self) -> bool:
        return not self.errors

    # "new" = AI_PROVIDER single switch; "legacy" = per-scope variables (AGNOS_LLM_*, ...).
    mode: str = "legacy"
    provider: str | None = None
    fallback_enabled: bool = False

    def role(self, name: str) -> RoleConfig:
        name = LEGACY_ROLE_ALIASES.get(name, name)
        cfg = self.roles.get(name)
        if cfg is None:
            raise ConfigError(f"Ruolo AI sconosciuto: '{name}' (ammessi: {', '.join(ROLES)})")
        return cfg


def _get(env: Mapping[str, str], *keys: str, default: str | None = None) -> str | None:
    """First non-empty value among keys (supports the issue's variable spellings)."""
    for k in keys:
        v = env.get(k)
        if v is not None and v.strip():
            return v.strip()
    return default


def _float(env: Mapping[str, str], *keys: str, default: float) -> float:
    raw = _get(env, *keys)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _int(env: Mapping[str, str], *keys: str, default: int) -> int:
    raw = _get(env, *keys)
    if raw is None:
        return default
    try:
        n = int(raw)
        return n if n > 0 else default
    except ValueError:
        return default


def load_runtime_config(env: Mapping[str, str] | None = None) -> RuntimeConfig:
    e = env if env is not None else os.environ
    errors: list[str] = []
    roles: dict[str, RoleConfig] = {}

    # Capability requirements come from global flags (REQ-023 §4) layered over the
    # documented per-role defaults.
    req_image = _get(e, "AI_REQUIRE_IMAGE_INPUT", default="true") != "false"
    req_file = _get(e, "AI_REQUIRE_FILE_INPUT", default="true") != "false"
    req_tools = _get(e, "AI_REQUIRE_TOOL_CALLING", default="false") == "true"
    req_struct = _get(e, "AI_REQUIRE_NATIVE_STRUCTURED_OUTPUT", default="false") == "true"

    provider_raw = _get(e, "AI_PROVIDER")
    mode = "new" if provider_raw else "legacy"
    provider = normalize_provider(provider_raw) if provider_raw else None
    if provider is not None and provider_entry(provider) is None:
        errors.append(f"AI_PROVIDER '{provider_raw}' non registrato (ammessi: {', '.join(sorted(PROVIDERS))})")
    fallback_enabled = _get(e, "AI_FALLBACK_ENABLED", default="false") == "true"
    fallback_provider_raw = _get(e, "AI_FALLBACK_PROVIDER")
    fallback_provider = normalize_provider(fallback_provider_raw) if fallback_provider_raw else None
    if fallback_enabled and (fallback_provider is None or provider_entry(fallback_provider) is None):
        errors.append("AI_FALLBACK_ENABLED=true richiede AI_FALLBACK_PROVIDER registrato")
        fallback_enabled = False

    for role in ROLES:
        up = role.upper()
        temperature: float | None = None
        fallback: ModelSpec | None = None
        if mode == "new" and role in NEW_STYLE_ROLES:
            raw = _get(e, f"AI_MODEL_{up}", "AI_MODEL_DEFAULT")
            if not raw:
                errors.append(f"AI_MODEL_{up} (o AI_MODEL_DEFAULT) mancante per AI_PROVIDER={provider_raw}")
                continue
            try:
                model = ModelSpec.parse(raw) if ":" in raw else ModelSpec.parse(f"{provider}:{raw}")
            except ConfigError as ex:
                errors.append(f"AI_MODEL_{up}: {ex.message}")
                continue
            if _get(e, f"AI_TEMPERATURE_{up}", "AI_TEMPERATURE_DEFAULT"):
                temperature = _float(e, f"AI_TEMPERATURE_{up}", "AI_TEMPERATURE_DEFAULT", default=0.0)
            if fallback_enabled and fallback_provider:
                fb_raw = _get(e, f"AI_FALLBACK_MODEL_{up}", "AI_FALLBACK_MODEL_DEFAULT")
                if fb_raw:
                    try:
                        fallback = (ModelSpec.parse(fb_raw) if ":" in fb_raw
                                    else ModelSpec.parse(f"{fallback_provider}:{fb_raw}"))
                    except ConfigError as ex:
                        errors.append(f"AI_FALLBACK_MODEL_{up}: {ex.message}")
                else:
                    errors.append(f"AI_FALLBACK_MODEL_{up} (o AI_FALLBACK_MODEL_DEFAULT) mancante con fallback attivo")
            timeout = _int(e, f"AI_TIMEOUT_SECONDS_{up}", "AI_PROVIDER_TIMEOUT_SECONDS",
                           default=_DEFAULT_TIMEOUT[role])
        else:
            cfg, role_errors = _LEGACY_RESOLVERS[role](e)
            if cfg is None:
                errors.extend(f"[{role}] {msg}" for msg in role_errors)
                continue
            model = cfg.model
            temperature = getattr(cfg, "temperature", None)
            legacy = _LEGACY_ENV_NAME[role]
            try:
                fallback = ModelSpec.parse_optional(_get(e, f"AI_{legacy}_FALLBACK_MODEL", f"AI_FALLBACK_{legacy}_MODEL"))
            except ConfigError as ex:
                errors.append(f"fallback {legacy}: {ex.message}")
            if temperature is None:
                temperature = _float(e, f"AI_{legacy}_TEMPERATURE", "AI_TEMPERATURE", default=0.0)
            timeout = _int(e, f"AI_{legacy}_TIMEOUT_SECONDS", "AI_PROVIDER_TIMEOUT_SECONDS", default=300)

        base_req = DEFAULT_ROLE_REQUIREMENTS.get(role, CapabilityRequirement())
        requirement = CapabilityRequirement(
            text_input=True,
            image_input=base_req.image_input and req_image,
            pdf_input=base_req.pdf_input and req_file,
            file_upload=base_req.file_upload,
            tool_calling=(role == "command_parser" and req_tools),
            native_structured_output=req_struct and base_req.native_structured_output,
        )
        roles[role] = RoleConfig(role=role, model=model, fallback=fallback, temperature=temperature,
                                 timeout_seconds=timeout, requirement=requirement)

    return RuntimeConfig(
        roles=roles,
        max_retries=_int(e, "AI_MAX_RETRIES", default=2),
        job_max_duration_seconds=_int(e, "AI_JOB_MAX_DURATION_SECONDS", default=1800),
        max_concurrency=_int(e, "AI_MAX_CONCURRENCY", default=2),
        service_token=_get(e, "AI_RUNTIME_SERVICE_TOKEN"),
        job_retention_seconds=_int(e, "AI_JOB_RETENTION_SECONDS", default=3600),
        max_upload_bytes=_int(e, "AI_MAX_UPLOAD_BYTES", default=50_000_000),
        errors=errors,
        mode=mode,
        provider=provider,
        fallback_enabled=fallback_enabled,
    )
