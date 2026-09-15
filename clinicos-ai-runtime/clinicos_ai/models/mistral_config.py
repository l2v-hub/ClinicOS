"""Endpoint and credential selection for OCR. Never send Azure keys to other hosts."""
from __future__ import annotations

from typing import Mapping
from urllib.parse import urlsplit, urlunsplit

from .errors import ConfigError, RuntimeError_, ErrorKind


def resolve_mistral_connection(env: Mapping[str, str]) -> tuple[str, str]:
    explicit = (env.get("MISTRAL_OCR_URL") or "").strip()
    raw = explicit or (env.get("AZURE_OPENAI_ENDPOINT") or "").strip()
    try:
        parts = urlsplit(raw)
        valid = parts.scheme == "https" and parts.hostname and not parts.username and not parts.password
        valid = valid and not parts.fragment and parts.port in (None, 443)
    except ValueError:
        valid = False
    if not valid:
        raise ConfigError("[AI_CONFIG] Configurare un endpoint HTTPS OCR valido in MISTRAL_OCR_URL.")
    host = parts.hostname.lower()
    azure = host.endswith((".services.ai.azure.com", ".cognitiveservices.azure.com"))
    if not explicit and not azure:
        raise ConfigError("[AI_CONFIG] L'endpoint Azure OCR non appartiene a una risorsa Foundry supportata.")
    path = parts.path.rstrip("/")
    if not path:
        if not azure:
            raise ConfigError("[AI_CONFIG] MISTRAL_OCR_URL deve includere il percorso OCR completo.")
        path = "/providers/mistral/azure/ocr"
    url = urlunsplit((parts.scheme, parts.netloc, path, parts.query, ""))
    key = (env.get("MISTRAL_API_KEY") or "").strip()
    if not key and azure:
        key = (env.get("AZURE_OPENAI_API_KEY") or "").strip()
    if not key:
        raise RuntimeError_(ErrorKind.CREDENTIALS, "[AI_AUTH] Credenziale OCR non configurata.")
    return url, key
