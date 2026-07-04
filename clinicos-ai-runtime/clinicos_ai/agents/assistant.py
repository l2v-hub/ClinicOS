"""016 F1: assistant planner agent. Turns a natural-language QUESTION into a typed read
plan over the ClinicOS Data Gateway tools. Provider-neutral: uses the 'agent' role model
(no new mandatory role → the existing extraction runtime is unaffected). The runtime only
ever sees the QUESTION text (no clinical data); the backend validates the plan and executes
it. The mock provider returns an EMPTY plan (never invents a tool call), like EMPTY_EXTRACTION.
"""
from __future__ import annotations

import json
from typing import Any

from ..models.registry import ModelRegistry

# Marker the mock provider recognizes to return a deterministic empty plan (CI/tests).
PLAN_MARKER = "ASSISTANT_PLAN_V1"

_SYSTEM = (
    f"{PLAN_MARKER}\n"
    "Sei il pianificatore di SOLE LETTURE dell'assistente clinico ClinicOS. "
    "Converti la domanda dell'operatore in un piano di chiamate ai TOOL elencati. "
    "Regole: usa SOLO i tool elencati; non inventare tool; se citi un paziente per nome "
    "pianifica prima search_patients; non fornire diagnosi/terapie. "
    "Rispondi SOLO con JSON: {\"intent\": string, \"scope\": \"current_patient\"|\"cross_patient\", "
    "\"tools\": [{\"tool\": string, \"args\": object}], \"requiresCrossPatientAccess\": boolean}."
)


def _strip_fences(s: str) -> str:
    t = s.strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[1] if "\n" in t else t
        if t.endswith("```"):
            t = t[: -3]
    return t.strip()


async def run_assistant_plan(registry: ModelRegistry, question: str, tool_schema: list[dict]) -> dict[str, Any]:
    built = registry.build("agent")  # riusa il ruolo 'agent' già configurato
    prompt = (
        f"{_SYSTEM}\n\nTOOL DISPONIBILI:\n{json.dumps(tool_schema, ensure_ascii=False)}\n\n"
        f"DOMANDA:\n{question}\n"
    )
    raw = await built.runner.run(prompt, [])
    try:
        plan = json.loads(_strip_fences(raw))
    except json.JSONDecodeError:
        # output non parsabile → piano vuoto sicuro (il backend ricade sul deterministico)
        plan = {"intent": "unknown", "scope": "current_patient", "tools": [], "requiresCrossPatientAccess": False}
    return {"plan": plan, "model": str(built.spec)}
