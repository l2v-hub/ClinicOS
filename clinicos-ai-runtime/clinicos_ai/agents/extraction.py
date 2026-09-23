"""Extraction workflow (REQ-023). Orchestrates the role models via the registry —
no provider SDK, no hardcoded model. extraction -> (repair if JSON invalid).
The runtime never writes clinical data; it returns a proposal for the backend.
"""
from __future__ import annotations

import json
from dataclasses import dataclass

from ..models.errors import RuntimeError_, ErrorKind
from ..models.providers.base import Attachment
from ..models.providers.completion import completion_text
from ..models.registry import ModelRegistry


@dataclass
class ExtractionOutput:
    model: str
    data: dict
    warnings: list[str]
    finish_reason: str | None = None
    truncated: bool = False


# A repair may receive the entire malformed response or fail explicitly; slicing
# a prefix could turn missing clinical fields into an apparently valid result.
MAX_REPAIR_CHARACTERS = 100_000


def _output(model: str, raw: str, warnings: list[str]) -> ExtractionOutput:
    checked = completion_text(raw, getattr(raw, "finish_reason", None))
    data = json.loads(_strip_fences(checked))
    if not isinstance(data, dict):
        raise RuntimeError_(ErrorKind.SCHEMA_VALIDATION, "L'estrazione deve essere un oggetto JSON.")
    return ExtractionOutput(model=model, data=data, warnings=warnings,
                            finish_reason=checked.finish_reason)


def _strip_fences(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[-1]
    if t.endswith("```"):
        t = t.rsplit("```", 1)[0]
    return t.strip()


async def run_extraction(registry: ModelRegistry, prompt: str, schema: dict,
                         attachments: list[Attachment],
                         mode: str = "extraction") -> ExtractionOutput:
    warnings: list[str] = []
    if mode == "ocr":
        # Sola trascrizione, col ruolo 'ocr': un motore di layout (Document Intelligence)
        # restituisce markdown gia' strutturato — niente JSON, niente repair. Il backend
        # legge `rawText`, la stessa forma del passaggio di trascrizione precedente.
        ocr = registry.build("ocr")
        text = await ocr.runner.run(prompt, attachments)
        text = completion_text(text, getattr(text, "finish_reason", None))
        finish_reason = text.finish_reason
        # Il ruolo 'ocr' puo' essere servito da un motore di layout (markdown grezzo) oppure,
        # in configurazioni precedenti, da un modello di chat che obbedisce al prompt e
        # risponde gia' con {"rawText": ...}. Nel secondo caso va scartato l'involucro,
        # altrimenti il backend riceverebbe il JSON come se fosse la trascrizione.
        stripped = _strip_fences(text)
        if stripped.startswith("{"):
            try:
                inner = json.loads(stripped)
                if isinstance(inner, dict) and isinstance(inner.get("rawText"), str):
                    text = inner["rawText"]
            except json.JSONDecodeError:
                pass  # non era JSON: e' gia' la trascrizione
        if not text.strip():
            raise RuntimeError_(ErrorKind.SCHEMA_VALIDATION, "Nessun testo OCR leggibile.")
        return ExtractionOutput(model=str(ocr.spec), data={"rawText": text}, warnings=warnings,
                                finish_reason=finish_reason)

    built = registry.build("extraction")  # capability-checked, fallback-aware
    # Structured-output adapters (e.g. Mistral Document AI) take the JSON Schema directly
    # and return JSON; chat adapters get the schema embedded in the prompt.
    runner = built.runner
    if hasattr(runner, "run_structured"):
        raw = await runner.run_structured(prompt, schema, attachments)
    else:
        full_prompt = (
            f"{prompt}\n\nSCHEMA (compila i valori, non inventare):\n{json.dumps(schema)}\n"
            "Rispondi SOLO con JSON valido."
        )
        raw = await runner.run(full_prompt, attachments)
    raw = completion_text(raw, getattr(raw, "finish_reason", None))
    cleaned = _strip_fences(raw)

    try:
        return _output(str(built.spec), raw, warnings)
    except json.JSONDecodeError:
        warnings.append("output non JSON: tentativo di riparazione")

    # Single repair attempt with the repair-role model.
    if len(cleaned) > MAX_REPAIR_CHARACTERS:
        raise RuntimeError_(ErrorKind.OUTPUT_INCOMPLETE,
                            "Output troppo lungo per una riparazione integrale.",
                            finish_reason="repair_input_limit")
    repair = registry.build("repair")
    repair_prompt = (
        "Il testo seguente doveva essere JSON valido conforme allo schema ClinicOS ma non lo è. "
        "Restituisci SOLO il JSON corretto, senza testo aggiuntivo.\n\n"
        f"TESTO:\n{cleaned}"
    )
    fixed = await repair.runner.run(repair_prompt, [])
    try:
        return _output(str(built.spec), fixed, warnings)
    except json.JSONDecodeError as ex:
        raise RuntimeError_(ErrorKind.SCHEMA_VALIDATION,
                            "Output non JSON dopo il tentativo di riparazione") from ex
