"""Generate PROVIDER_CAPABILITY_MATRIX.json from the provider registry (single source of truth).

    python -m tools.capability_matrix --out ../.ai-architecture/phase-9-production/PROVIDER_CAPABILITY_MATRIX.json

Model capabilities come from the registry's capability profiles for a representative model id per
provider; adapter traits (usage, cancellation, timeout, discovery, realtime) come from the registry
entries. No parity is assumed: a missing capability is false, and the runtime's capability gate
refuses a role whose requirement is not met (validation at startup, CapabilityError at call time).
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from clinicos_ai.models.capabilities import DEFAULT_ROLE_REQUIREMENTS  # noqa: E402
from clinicos_ai.models.provider_registry import PROVIDERS  # noqa: E402

# Representative model ids used ONLY to evaluate the capability heuristics (configuration data).
REPRESENTATIVE = {"openai": "gpt-6.1-sol", "azure": "gpt-6.1-sol", "google": "gemini-3.5-flash",
                  "anthropic": "claude-model", "openai-like": "local-model", "mistral": "mistral-ocr-4-0",
                  "azure-docintel": "prebuilt-layout", "mock": "mock", "test": "deterministic"}


def build() -> dict:
    providers = {}
    for name, entry in PROVIDERS.items():
        model = REPRESENTATIVE.get(name, "model")
        caps = entry.capabilities(model).to_dict() if entry.capabilities else {}
        providers[name] = {
            "description": entry.description,
            "aliases": list(entry.aliases),
            "credentialEnv": list(entry.credential_env),
            "requiredEnv": list(entry.required_env),
            "evaluatedModel": model,
            "capabilities": {
                "text": caps.get("text_input", False),
                "vision_image": caps.get("image_input", False),
                "vision_pdf": caps.get("pdf_input", False),
                "structured_output": caps.get("native_structured_output", False),
                "json_mode": caps.get("json_mode", False),
                "tool_calling": caps.get("tool_calling", False),
                "streaming": caps.get("streaming", False),
                "stt": bool(entry.stt_module),
                "realtime": bool(entry.traits.get("realtime", False)),
                "usage_metadata": bool(entry.traits.get("usage_metadata", False)),
                "cancellation": bool(entry.traits.get("cancellation", False)),
                "timeout": bool(entry.traits.get("timeout", False)),
                "model_discovery": bool(entry.traits.get("model_discovery", False)),
            },
            "sdk": entry.traits.get("sdk", ""),
            "rolesSupported": [role for role, req in DEFAULT_ROLE_REQUIREMENTS.items()
                               if entry.capabilities and not req.unmet(entry.capabilities(model))
                               and (role == "ocr" or not entry.traits.get("ocr_only"))],
        }
    return {
        "schema": "clinicos.provider-capability-matrix/v1",
        "generatedFrom": "clinicos-ai-runtime/clinicos_ai/models/provider_registry.py",
        "logicalRoles": {"command_parser": "NL -> skill + slots (structured intent)",
                         "reasoning": "read-only query planning", "summary": "grounded answers, briefing",
                         "fast": "JSON repair, short rewrites", "vision": "documents/photos -> structured extraction",
                         "ocr": "layout OCR (separate scope)", "stt": "speech to text (voice layer)"},
        "roleRequirements": {role: {k: v for k, v in req.__dict__.items() if v}
                             for role, req in DEFAULT_ROLE_REQUIREMENTS.items()},
        "currentPrimary": {"llm": "openai (OpenAI API Direct) — configured with AI_PROVIDER=openai",
                           "stt": "openai — STT_PROVIDER=openai (switchable to google/azure/test)",
                           "ocr": "unchanged scope (AI_OCR_PROVIDER, currently mistral)"},
        "providers": providers,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="")
    args = parser.parse_args()
    text = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.out:
        pathlib.Path(args.out).write_text(text, encoding="utf-8")
    print(text[:400])
