"""Environment-driven model configuration — separazione netta dei tre ambiti (obiettivo:
cambiare modello/provider/endpoint da Railway SENZA toccare il codice).

  1. Agnos LLM / chatbot / reasoning  → AGNOS_LLM_*  (+ AZURE_OPENAI_* se provider azure-openai)
  2. OCR / lettura scansioni          → AI_OCR_*      (+ MISTRAL_API_KEY / MISTRAL_OCR_URL)
  3. Extraction / estrazione dati     → AI_EXTRACTION_*

Priorità di lettura per ogni ambito: (1) nuove variabili specifiche → (2) variabili legacy solo
come fallback → (3) errore chiaro che indica QUALE variabile manca (mai il valore dei secret).
Nessun provider/model/endpoint/secret è hardcodato: tutto viene da env.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from .errors import ConfigError
from .spec import ModelSpec, SUPPORTED_PROVIDERS

# Alias env-friendly → provider interno del runtime. 'azure-openai' è il valore che imposta il
# committente su Railway; il codice non deve conoscere il nome del deployment, solo leggerlo.
PROVIDER_ALIASES = {"azure-openai": "azure", "openai-azure": "azure"}


def normalize_provider(provider: str) -> str:
    p = (provider or "").strip().lower()
    return PROVIDER_ALIASES.get(p, p)


def _get(env: Mapping[str, str], *keys: str, default: str | None = None) -> str | None:
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
        return int(raw)
    except ValueError:
        return default


@dataclass(frozen=True)
class AgnosLlmConfig:
    model: ModelSpec           # per azure, model_id = deployment
    temperature: float
    max_tokens: int
    timeout_seconds: int
    streaming_enabled: bool
    source: str                # "env" | "legacy"


@dataclass(frozen=True)
class RoleModelConfig:
    model: ModelSpec
    source: str                # "env" | "legacy"


def _spec(provider: str, model_id: str) -> ModelSpec:
    prov = normalize_provider(provider)
    if prov not in SUPPORTED_PROVIDERS:
        raise ConfigError(f"provider '{provider}' non supportato (ammessi: {', '.join(sorted(SUPPORTED_PROVIDERS))})")
    if not model_id:
        raise ConfigError("model_id vuoto")
    return ModelSpec(provider=prov, model_id=model_id.strip())


def resolve_agnos_llm(env: Mapping[str, str]) -> tuple[AgnosLlmConfig | None, list[str]]:
    """Agnos chatbot/reasoning: AGNOS_LLM_* con priorità; legacy AI_AGENT_MODEL solo come fallback."""
    errors: list[str] = []
    temperature = _float(env, "AGNOS_LLM_TEMPERATURE", default=_float(env, "AI_AGENT_TEMPERATURE", "AI_TEMPERATURE", default=0.0))
    max_tokens = _int(env, "AGNOS_LLM_MAX_TOKENS", default=4096)
    timeout_ms = _int(env, "AGNOS_LLM_TIMEOUT_MS", default=30000)
    timeout_seconds = max(1, timeout_ms // 1000) if _get(env, "AGNOS_LLM_TIMEOUT_MS") else _int(env, "AI_PROVIDER_TIMEOUT_SECONDS", default=30)
    streaming = _get(env, "AGNOS_LLM_STREAMING_ENABLED", default="false") == "true"

    provider = _get(env, "AGNOS_LLM_PROVIDER")
    if provider:
        prov = normalize_provider(provider)
        if prov == "azure":
            # model/deployment = AGNOS_LLM_MODEL oppure AZURE_OPENAI_DEPLOYMENT
            deployment = _get(env, "AGNOS_LLM_MODEL", "AZURE_OPENAI_DEPLOYMENT")
            if not deployment:
                errors.append("AGNOS_LLM_MODEL (o AZURE_OPENAI_DEPLOYMENT) mancante per provider azure-openai")
            if not _get(env, "AZURE_OPENAI_ENDPOINT"):
                errors.append("AZURE_OPENAI_ENDPOINT mancante (richiesto da provider azure-openai)")
            if not _get(env, "AZURE_OPENAI_API_KEY"):
                errors.append("AZURE_OPENAI_API_KEY mancante (richiesto da provider azure-openai)")
            if errors:
                return None, errors
            model = ModelSpec(provider="azure", model_id=deployment)  # type: ignore[arg-type]
        else:
            model_id = _get(env, "AGNOS_LLM_MODEL")
            if not model_id:
                errors.append("AGNOS_LLM_MODEL mancante (richiesto con AGNOS_LLM_PROVIDER)")
                return None, errors
            try:
                model = _spec(provider, model_id)
            except ConfigError as ex:
                return None, [f"AGNOS_LLM_PROVIDER/MODEL: {ex.message}"]
        return AgnosLlmConfig(model, temperature, max_tokens, timeout_seconds, streaming, "env"), []

    # fallback LEGACY (solo se manca AGNOS_LLM_PROVIDER)
    legacy = _get(env, "AI_AGENT_MODEL")
    if legacy:
        try:
            model = ModelSpec.parse(legacy)
        except ConfigError as ex:
            return None, [f"AI_AGENT_MODEL (legacy): {ex.message}"]
        return AgnosLlmConfig(model, temperature, max_tokens, timeout_seconds, streaming, "legacy"), []

    return None, ["Configurazione Agnos LLM mancante: impostare AGNOS_LLM_PROVIDER + AGNOS_LLM_MODEL "
                  "(fallback legacy: AI_AGENT_MODEL)"]


def _resolve_role(env: Mapping[str, str], provider_key: str, model_key: str, default_provider: str,
                  ambito: str) -> tuple[RoleModelConfig | None, list[str]]:
    """OCR/Extraction: AI_<AMBITO>_PROVIDER (default retrocompatibile) + AI_<AMBITO>_MODEL.
    Retrocompatibile col formato legacy 'provider:model_id' in AI_<AMBITO>_MODEL."""
    model_raw = _get(env, model_key)
    if not model_raw:
        return None, [f"{model_key} mancante (configurazione {ambito} obbligatoria)"]
    # legacy: se AI_<AMBITO>_MODEL è già 'provider:model_id' lo si rispetta
    if ":" in model_raw:
        try:
            return RoleModelConfig(ModelSpec.parse(model_raw), "legacy"), []
        except ConfigError as ex:
            return None, [f"{model_key} (legacy): {ex.message}"]
    provider = _get(env, provider_key, default=default_provider)
    try:
        return RoleModelConfig(_spec(provider, model_raw), "env"), []
    except ConfigError as ex:
        return None, [f"{provider_key}/{model_key}: {ex.message}"]


def resolve_ocr(env: Mapping[str, str]) -> tuple[RoleModelConfig | None, list[str]]:
    return _resolve_role(env, "AI_OCR_PROVIDER", "AI_OCR_MODEL", default_provider="mistral", ambito="OCR")


def resolve_extraction(env: Mapping[str, str]) -> tuple[RoleModelConfig | None, list[str]]:
    return _resolve_role(env, "AI_EXTRACTION_PROVIDER", "AI_EXTRACTION_MODEL", default_provider="mistral", ambito="extraction")


# --- logging PHI/secret-safe -------------------------------------------------
# Cosa è ammesso nei log: provider, model/deployment, source, outcome. MAI: API key,
# endpoint, valori dei secret, prompt, dati paziente, risposte del modello, documenti.

def safe_config_summary(env: Mapping[str, str]) -> list[str]:
    """Righe log-safe per l'avvio del runtime: solo provider+model+source per ogni ambito.
    Non contiene mai chiavi/endpoint/valori di secret."""
    lines: list[str] = []
    agnos, a_err = resolve_agnos_llm(env)
    if agnos is not None:
        lines.append(f"agnos_llm provider={agnos.model.provider} model={agnos.model.model_id} source={agnos.source}")
    else:
        lines.append(f"agnos_llm UNCONFIGURED errors={len(a_err)}")
    for name, resolve in (("ocr", resolve_ocr), ("extraction", resolve_extraction)):
        cfg, errs = resolve(env)
        if cfg is not None:
            lines.append(f"{name} provider={cfg.model.provider} model={cfg.model.model_id} source={cfg.source}")
        else:
            lines.append(f"{name} UNCONFIGURED errors={len(errs)}")
    return lines
