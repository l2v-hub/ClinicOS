"""Validazione oggettiva della config modelli env-driven (3 ambiti separati).
Rieseguibile: `python artifacts/validation/agnos-016-env-config/run-validation.py`.
Non contatta provider reali: verifica SOLO risoluzione config + sanitizzazione log.
Nessun secret reale: le chiavi qui sono finte marker per provare che NON finiscono nei log."""
import json, logging, io, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "clinicos-ai-runtime"))
from clinicos_ai.models.env_config import (
    resolve_agnos_llm, resolve_ocr, resolve_extraction, safe_config_summary)
from clinicos_ai.models.configuration import load_runtime_config

FAKE_KEY = "sk-FAKE-do-not-log-0001"
FAKE_MISTRAL = "mk-FAKE-do-not-log-0002"
FAKE_ENDPOINT = "https://FAKE-private.openai.azure.com"

# Config target Railway (Azure per Agnos, Mistral per OCR/Extraction)
railway = {
    "AGNOS_LLM_PROVIDER": "azure-openai", "AGNOS_LLM_MODEL": "gpt-5.4-mini",
    "AGNOS_LLM_TEMPERATURE": "0.2", "AGNOS_LLM_MAX_TOKENS": "4096",
    "AGNOS_LLM_TIMEOUT_MS": "30000", "AGNOS_LLM_STREAMING_ENABLED": "true",
    "AZURE_OPENAI_ENDPOINT": FAKE_ENDPOINT, "AZURE_OPENAI_DEPLOYMENT": "gpt-5.4-mini",
    "AZURE_OPENAI_API_KEY": FAKE_KEY,
    "AI_OCR_PROVIDER": "mistral", "AI_OCR_MODEL": "mistral-document-ai-2505",
    "MISTRAL_API_KEY": FAKE_MISTRAL, "MISTRAL_OCR_URL": "https://ocr.example/eu",
    "AI_EXTRACTION_PROVIDER": "mistral", "AI_EXTRACTION_MODEL": "mistral-document-ai-2505",
    "AI_REPAIR_MODEL": "google:gemma-4-31b-it", "AI_RUNTIME_SERVICE_TOKEN": "svc-FAKE",
}

results = {}

# 1) Agnos legge le AGNOS_LLM_* e mappa azure-openai→azure, deployment=model
a, ae = resolve_agnos_llm(railway)
results["agnos_reads_agnos_llm_vars"] = {
    "provider": a.model.provider, "model": a.model.model_id, "source": a.source,
    "temperature": a.temperature, "max_tokens": a.max_tokens,
    "timeout_seconds": a.timeout_seconds, "streaming": a.streaming_enabled,
    "pass": (a.model.provider == "azure" and a.model.model_id == "gpt-5.4-mini"
             and a.source == "env" and a.temperature == 0.2 and a.max_tokens == 4096
             and a.streaming_enabled is True and ae == []),
}

# 2) OCR usa AI_OCR_MODEL (mistral), NON il modello Agnos
o, _ = resolve_ocr(railway)
results["ocr_separate_from_agnos"] = {
    "provider": o.model.provider, "model": o.model.model_id,
    "pass": o.model.provider == "mistral" and o.model.model_id == "mistral-document-ai-2505"
            and o.model.model_id != a.model.model_id,
}

# 3) Extraction usa AI_EXTRACTION_MODEL, NON Agnos né OCR-specifico
x, _ = resolve_extraction(railway)
results["extraction_separate"] = {
    "provider": x.model.provider, "model": x.model.model_id,
    "pass": x.model.provider == "mistral" and x.model.model_id == "mistral-document-ai-2505",
}

# 4) Cambio modello SOLO da env (nessuna modifica al codice)
swap = dict(railway); swap["AGNOS_LLM_MODEL"] = "gpt-6-turbo"; swap["AZURE_OPENAI_DEPLOYMENT"] = "gpt-6-turbo"
swap["AI_OCR_MODEL"] = "mistral-ocr-2600"
a2, _ = resolve_agnos_llm(swap); o2, _ = resolve_ocr(swap)
results["change_model_from_env_only"] = {
    "agnos_model": a2.model.model_id, "ocr_model": o2.model.model_id,
    "pass": a2.model.model_id == "gpt-6-turbo" and o2.model.model_id == "mistral-ocr-2600",
}

# 5) Legacy come SOLO fallback + priorità nuove var
leg, le = resolve_agnos_llm({"AI_AGENT_MODEL": "google:gemma-4-31b-it"})
prio, _ = resolve_agnos_llm({"AGNOS_LLM_PROVIDER": "google", "AGNOS_LLM_MODEL": "gemini-2.0-flash",
                            "AI_AGENT_MODEL": "google:gemma-4-31b-it"})
results["legacy_fallback_only"] = {
    "legacy_source": leg.source, "legacy_model": leg.model.model_id,
    "priority_source": prio.source, "priority_model": prio.model.model_id,
    "pass": leg.source == "legacy" and prio.source == "env" and prio.model.model_id == "gemini-2.0-flash" and le == [],
}

# 6) Errore chiaro se manca una var obbligatoria (senza mostrare secret)
_, miss = resolve_agnos_llm({"AGNOS_LLM_PROVIDER": "azure-openai", "AGNOS_LLM_MODEL": "gpt", "AZURE_OPENAI_API_KEY": FAKE_KEY})
results["clear_error_missing_var"] = {
    "errors": miss,
    "pass": any("AZURE_OPENAI_ENDPOINT" in e for e in miss) and not any(FAKE_KEY in e for e in miss),
}

# 7) Log di avvio sanitizzato: cattura l'output reale del logger dell'app
buf = io.StringIO()
h = logging.StreamHandler(buf); h.setLevel(logging.INFO)
lg = logging.getLogger("clinicos_ai.runtime"); lg.setLevel(logging.INFO); lg.addHandler(h)
for line in safe_config_summary(railway):
    lg.info("model-config %s", line)
log_output = buf.getvalue()
results["boot_log_sanitized"] = {
    "log": log_output.strip().splitlines(),
    "no_secret": FAKE_KEY not in log_output and FAKE_MISTRAL not in log_output and FAKE_ENDPOINT not in log_output and "svc-FAKE" not in log_output,
    "has_provider_and_model": "azure" in log_output and "gpt-5.4-mini" in log_output and "mistral-document-ai-2505" in log_output,
}
results["boot_log_sanitized"]["pass"] = results["boot_log_sanitized"]["no_secret"] and results["boot_log_sanitized"]["has_provider_and_model"]

# 8) load_runtime_config integra i resolver end-to-end
rc = load_runtime_config(railway)
results["runtime_config_integration"] = {
    "errors": rc.errors, "available": rc.available,
    "agent_model": rc.roles["agent"].model.model_id if "agent" in rc.roles else None,
    "agent_provider": rc.roles["agent"].model.provider if "agent" in rc.roles else None,
    "agent_temperature": rc.roles["agent"].temperature if "agent" in rc.roles else None,
    "ocr_model": rc.roles["ocr"].model.model_id if "ocr" in rc.roles else None,
    "extraction_model": rc.roles["extraction"].model.model_id if "extraction" in rc.roles else None,
    "pass": rc.available and rc.roles["agent"].model.provider == "azure"
            and rc.roles["agent"].model.model_id == "gpt-5.4-mini"
            and rc.roles["agent"].temperature == 0.2
            and rc.roles["ocr"].model.provider == "mistral",
}

overall = all(v.get("pass") for v in results.values())
out = {"overall_pass": overall, "checks": results}
print(json.dumps(out, indent=2, ensure_ascii=False))
outfile = pathlib.Path(__file__).parent / "checks.json"
outfile.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
sys.exit(0 if overall else 1)
