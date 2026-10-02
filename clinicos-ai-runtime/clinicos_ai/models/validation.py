"""Startup validation of the AI/STT configuration (Phase 9, Prompt 9 §22).

Checks: provider registered, credentials present, adapter-required env present, every logical
role resolved, role capability requirements met by the configured model, STT provider registered
and credentialed, fallback coherent. Names only — never values.

Fail-fast policy (api/app.py startup): errors abort startup when the new single-switch
configuration is used (AI_PROVIDER set) or AI_STRICT_CONFIG=true. The legacy per-scope
configuration keeps the historical behaviour (errors reported by /v1/runtime/health).
"""
from __future__ import annotations

from typing import Mapping

from .configuration import load_runtime_config
from .profiles import capabilities_for
from .provider_registry import has_credentials, missing_required_env, provider_entry


def validate_ai_config(env: Mapping[str, str]) -> tuple[list[str], list[str]]:
    from ..voice.stt import stt_model, stt_realtime  # lazy: voice imports models

    config = load_runtime_config(env)
    errors = list(config.errors)
    warnings: list[str] = []
    for name, rc in config.roles.items():
        for label, spec in (("primario", rc.model), ("fallback", rc.fallback)):
            if spec is None:
                continue
            if provider_entry(spec.provider) is None:
                errors.append(f"[{name}] provider {label} '{spec.provider}' non registrato")
                continue
            if not has_credentials(spec.provider, env):
                errors.append(f"[{name}] credenziali mancanti per il provider {label} '{spec.provider}'")
            for missing in missing_required_env(spec.provider, env):
                errors.append(f"[{name}] {missing} mancante per il provider {label} '{spec.provider}'")
            entry = provider_entry(spec.provider)
            if name != "ocr" and entry is not None and entry.traits.get("ocr_only"):
                errors.append(f"[{name}] il provider {label} '{spec.provider}' serve solo il ruolo OCR")
            unmet = rc.requirement.unmet(capabilities_for(spec))
            if unmet:
                errors.append(f"[{name}] il modello {label} '{spec}' non ha le capability {', '.join(unmet)}")
            if entry is not None and spec.model_id in entry.deprecated_models:
                warnings.append(f"[{name}] modello {label} '{spec}' deprecato dal provider: scegliere un sostituto")
        if rc.fallback is not None and rc.fallback.provider == rc.model.provider:
            warnings.append(f"[{name}] fallback sullo stesso provider del primario (nessuna ridondanza)")
    if config.fallback_enabled:
        warnings.append("Fallback provider attivo: verificare privacy/residenza dei dati del provider di riserva")

    stt = stt_model(env)
    if stt is None:
        warnings.append("STT non configurato: canale voce non disponibile")
    else:
        provider, _model = stt
        entry = provider_entry(provider)
        if entry is None or not entry.stt_module:
            errors.append(f"STT_PROVIDER '{provider}' non registrato come provider STT")
        else:
            if not has_credentials(provider, env):
                errors.append(f"credenziali mancanti per il provider STT '{provider}'")
            for missing in missing_required_env(provider, env):
                errors.append(f"{missing} mancante per il provider STT '{provider}'")
            if stt[1] in entry.deprecated_models:
                warnings.append(f"STT_MODEL '{stt[1]}' deprecato dal provider: non usarlo come baseline")
    realtime = stt_realtime(env)
    if realtime["enabled"]:
        # Live transcription is not implemented in this version: never pretend it is.
        errors.append("STT_REALTIME_ENABLED=true ma la trascrizione realtime non è implementata "
                      "(push-to-talk usa STT_MODEL)")
    try:
        if int((env.get("AI_DAILY_TOKEN_BUDGET") or "0").strip()) < 0:
            errors.append("AI_DAILY_TOKEN_BUDGET negativo")
    except ValueError:
        errors.append("AI_DAILY_TOKEN_BUDGET non numerico")
    return errors, warnings


def strict_mode(env: Mapping[str, str]) -> bool:
    return bool((env.get("AI_PROVIDER") or "").strip()) or (env.get("AI_STRICT_CONFIG") or "").strip() == "true"
