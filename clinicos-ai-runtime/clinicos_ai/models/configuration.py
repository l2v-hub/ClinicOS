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

ROLES = ("ocr", "extraction", "agent", "repair")


@dataclass(frozen=True)
class RoleConfig:
    role: str
    model: ModelSpec
    fallback: ModelSpec | None
    temperature: float
    timeout_seconds: int
    requirement: CapabilityRequirement


@dataclass(frozen=True)
class RuntimeConfig:
    roles: Mapping[str, RoleConfig]
    max_retries: int
    job_max_duration_seconds: int
    max_concurrency: int
    service_token: str | None
    errors: list[str] = field(default_factory=list)

    @property
    def available(self) -> bool:
        return not self.errors

    def role(self, name: str) -> RoleConfig:
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

    for role in ROLES:
        up = role.upper()
        model_raw = _get(e, f"AI_{up}_MODEL")
        if not model_raw:
            errors.append(f"AI_{up}_MODEL mancante (atteso 'provider:model_id')")
            continue
        try:
            model = ModelSpec.parse(model_raw)
        except ConfigError as ex:
            errors.append(f"AI_{up}_MODEL: {ex.message}")
            continue
        # fallback supports both spellings: AI_<ROLE>_FALLBACK_MODEL and AI_FALLBACK_<ROLE>_MODEL
        try:
            fallback = ModelSpec.parse_optional(_get(e, f"AI_{up}_FALLBACK_MODEL", f"AI_FALLBACK_{up}_MODEL"))
        except ConfigError as ex:
            errors.append(f"fallback {up}: {ex.message}")
            fallback = None

        base_req = DEFAULT_ROLE_REQUIREMENTS.get(role, CapabilityRequirement())
        requirement = CapabilityRequirement(
            text_input=True,
            image_input=base_req.image_input and req_image,
            pdf_input=base_req.pdf_input and req_file,
            file_upload=base_req.file_upload,
            tool_calling=(role == "agent" and req_tools),
            native_structured_output=req_struct and base_req.native_structured_output,
        )
        roles[role] = RoleConfig(
            role=role,
            model=model,
            fallback=fallback,
            temperature=_float(e, f"AI_{up}_TEMPERATURE", "AI_TEMPERATURE", default=0.0),
            timeout_seconds=_int(e, f"AI_{up}_TIMEOUT_SECONDS", "AI_PROVIDER_TIMEOUT_SECONDS", default=300),
            requirement=requirement,
        )

    return RuntimeConfig(
        roles=roles,
        max_retries=_int(e, "AI_MAX_RETRIES", default=2),
        job_max_duration_seconds=_int(e, "AI_JOB_MAX_DURATION_SECONDS", default=1800),
        max_concurrency=_int(e, "AI_MAX_CONCURRENCY", default=2),
        service_token=_get(e, "AI_RUNTIME_SERVICE_TOKEN"),
        errors=errors,
    )
