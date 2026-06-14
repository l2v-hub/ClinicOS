"""ModelRegistry — the ONLY place models are selected (REQ-024).

Business logic (agents/api/domain) asks the registry for a role's model; it never
names a model or imports a provider SDK. The registry resolves `role -> provider:
model_id (+ fallback)`, checks that the configured provider has credentials, and
delegates actual model construction to the ModelFactory (where SDK imports live).
"""
from __future__ import annotations

from typing import Mapping
import os

from .configuration import RuntimeConfig, RoleConfig, load_runtime_config
from .errors import ConfigError, RuntimeError_, ErrorKind
from .spec import ModelSpec

# Which env var holds each provider's credential (checked, never logged).
PROVIDER_CREDENTIAL_ENV: dict[str, tuple[str, ...]] = {
    "google": ("GOOGLE_API_KEY", "GEMINI_API_KEY"),
    "openai": ("OPENAI_API_KEY",),
    "anthropic": ("ANTHROPIC_API_KEY",),
    "azure": ("AZURE_OPENAI_API_KEY",),
    "openai-like": ("OPENAI_LIKE_API_KEY",),
    "mock": (),  # no credentials needed
}


class ModelRegistry:
    def __init__(self, config: RuntimeConfig | None = None, env: Mapping[str, str] | None = None) -> None:
        self._env = env if env is not None else os.environ
        self._config = config if config is not None else load_runtime_config(self._env)

    @property
    def config(self) -> RuntimeConfig:
        return self._config

    def role_config(self, role: str) -> RoleConfig:
        return self._config.role(role)

    def spec_for(self, role: str) -> ModelSpec:
        """Primary model spec for a role."""
        return self._config.role(role).model

    def resolve(self, role: str) -> list[ModelSpec]:
        """Ordered specs to try: primary, then fallback (if any). Never auto-picks
        a model not configured for the role."""
        rc = self._config.role(role)
        specs = [rc.model]
        if rc.fallback is not None:
            specs.append(rc.fallback)
        return specs

    def has_credentials(self, provider: str) -> bool:
        keys = PROVIDER_CREDENTIAL_ENV.get(provider)
        if keys is None:
            return False
        if len(keys) == 0:
            return True  # mock
        return any(bool((self._env.get(k) or "").strip()) for k in keys)

    def usable_specs(self, role: str) -> list[ModelSpec]:
        """Resolved specs whose provider has credentials configured."""
        return [s for s in self.resolve(role) if self.has_credentials(s.provider)]

    def build(self, role: str):
        """Build the role's Agno model via the factory, checking capabilities.
        Tries primary then fallback. SDK imports happen only inside the factory."""
        from .factory import ModelFactory  # lazy: keeps registry stdlib-importable

        rc = self._config.role(role)
        factory = ModelFactory(env=self._env)
        last_err: Exception | None = None
        for spec in self.resolve(role):
            if not self.has_credentials(spec.provider):
                last_err = ConfigError(f"Credenziali mancanti per provider '{spec.provider}' (ruolo {role})")
                continue
            try:
                return factory.create(spec, role=role, requirement=rc.requirement,
                                      temperature=rc.temperature, timeout_seconds=rc.timeout_seconds)
            except RuntimeError_ as ex:
                last_err = ex
                continue
        if isinstance(last_err, RuntimeError_):
            raise last_err
        raise RuntimeError_(ErrorKind.CONFIG, f"Nessun modello utilizzabile per il ruolo '{role}'")

    def public_status(self) -> dict:
        """Secret-free view for /v1/runtime/health and /capabilities."""
        roles = {}
        for name, rc in self._config.roles.items():
            roles[name] = {
                "model": str(rc.model),
                "fallback": str(rc.fallback) if rc.fallback else None,
                "temperature": rc.temperature,
                "timeout_seconds": rc.timeout_seconds,
                "credentials_present": self.has_credentials(rc.model.provider),
                "requires": rc.requirement.__dict__,
            }
        return {
            "available": self._config.available,
            "errors": self._config.errors,
            "max_retries": self._config.max_retries,
            "job_max_duration_seconds": self._config.job_max_duration_seconds,
            "max_concurrency": self._config.max_concurrency,
            "roles": roles,
        }
