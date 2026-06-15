"""Declared capability profiles per model spec (REQ-023 §6).

A heuristic map from `provider:model_id` to ModelCapabilities. This is configuration
data, not SDK code — it lets the factory reject a model that cannot satisfy a role's
requirement BEFORE any call. Refine as new models are added.
"""
from __future__ import annotations

from .capabilities import ModelCapabilities
from .spec import ModelSpec


def capabilities_for(spec: ModelSpec) -> ModelCapabilities:
    p, m = spec.provider, spec.model_id.lower()

    if p == "mock":
        return ModelCapabilities(text_input=True, image_input=True, pdf_input=True,
                                 file_upload=True, json_mode=True, native_structured_output=True,
                                 tool_calling=True, streaming=True, async_execution=True)

    if p == "google":
        gemini = "gemini" in m
        # Gemini multimodal + tools + structured output; Gemma multimodal, no tools/structured.
        return ModelCapabilities(
            text_input=True, image_input=True, pdf_input=True, file_upload=True,
            json_mode=True, native_structured_output=gemini, tool_calling=gemini,
            streaming=True, async_execution=True,
        )

    if p in ("openai", "azure", "openai-like"):
        vision = any(k in m for k in ("4o", "vision", "o1", "o3", "4.1"))
        return ModelCapabilities(
            text_input=True, image_input=vision, pdf_input=False, file_upload=True,
            json_mode=True, native_structured_output=True, tool_calling=True,
            streaming=True, async_execution=True,
        )

    if p == "mistral":
        # Mistral Document AI (OCR): native PDF + image, returns markdown + structured
        # annotation via JSON Schema. No tool-calling needed for the OCR pipeline.
        return ModelCapabilities(
            text_input=True, image_input=True, pdf_input=True, file_upload=True,
            json_mode=True, native_structured_output=True, tool_calling=False,
            streaming=False, async_execution=True,
        )

    if p == "anthropic":
        return ModelCapabilities(
            text_input=True, image_input=True, pdf_input=True, file_upload=False,
            json_mode=True, native_structured_output=False, tool_calling=True,
            streaming=True, async_execution=True,
        )

    return ModelCapabilities(text_input=True)
