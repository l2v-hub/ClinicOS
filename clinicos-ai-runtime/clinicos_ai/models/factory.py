"""ModelFactory (REQ-023 §5): provider:model_id -> built model.

The ONLY component that knows which provider module builds a model. Reads the spec,
checks the model's declared capabilities against the role requirement, dispatches to
the right provider adapter (SDK imports live only there), and returns a neutral
BuiltModel. Agents/api never import provider SDKs.
"""
from __future__ import annotations

import importlib
import os
from typing import Mapping

from .capabilities import CapabilityRequirement
from .errors import ProviderUnavailableError, ConfigError
from .profiles import capabilities_for
from .providers.base import BuiltModel
from .provider_registry import provider_entry
from .spec import ModelSpec

class ModelFactory:
    def __init__(self, env: Mapping[str, str] | None = None) -> None:
        self._env = env if env is not None else os.environ

    def create(self, spec: ModelSpec, role: str, requirement: CapabilityRequirement,
               temperature: float, timeout_seconds: int) -> BuiltModel:
        # 1. Capability gate (before constructing/calling anything).
        requirement.check(capabilities_for(spec), role=role, model_spec=str(spec))

        # 2. Dispatch to the provider adapter (SDK isolation).
        entry = provider_entry(spec.provider)
        mod_name = entry.module if entry is not None else None
        if mod_name is None:
            raise ConfigError(f"Provider '{spec.provider}' senza adapter")
        try:
            module = importlib.import_module(mod_name)
        except ImportError as ex:  # SDK not installed
            raise ProviderUnavailableError(
                f"Adapter/SDK per '{spec.provider}' non disponibile: {ex}"
            ) from ex
        return module.build(spec, role=role, temperature=temperature, timeout_seconds=timeout_seconds)
