"""Capability contract + per-role minimum requirements (REQ-023 §6).

Each role declares the minimum capabilities it needs; the registry/factory check a
model's declared capabilities against the role's requirement before use, so an
incompatible model is rejected with a clear CapabilityError instead of failing
mid-extraction.

Pure stdlib (dataclasses) so it is testable without Agno/Pydantic installed; the
FastAPI layer mirrors this shape in Pydantic.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Optional

from .errors import CapabilityError


@dataclass(frozen=True)
class ModelCapabilities:
    text_input: bool = True
    image_input: bool = False
    pdf_input: bool = False
    file_upload: bool = False
    json_mode: bool = False
    native_structured_output: bool = False
    tool_calling: bool = False
    streaming: bool = False
    async_execution: bool = True
    max_input_tokens: Optional[int] = None
    max_output_tokens: Optional[int] = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class CapabilityRequirement:
    """Minimum capabilities a role needs. Only True flags are enforced."""
    text_input: bool = True
    image_input: bool = False
    pdf_input: bool = False
    file_upload: bool = False
    json_mode: bool = False
    native_structured_output: bool = False
    tool_calling: bool = False

    def unmet(self, caps: ModelCapabilities) -> list[str]:
        missing: list[str] = []
        for field in ("text_input", "image_input", "pdf_input", "file_upload",
                      "json_mode", "native_structured_output", "tool_calling"):
            if getattr(self, field) and not getattr(caps, field):
                missing.append(field)
        return missing

    def check(self, caps: ModelCapabilities, role: str, model_spec: str) -> None:
        missing = self.unmet(caps)
        if missing:
            raise CapabilityError(
                f"Modello '{model_spec}' non soddisfa le capability minime per il ruolo "
                f"'{role}': mancano {', '.join(missing)}"
            )


# Minimum capabilities per role. Driven by env flags at load time (configuration.py)
# but these are the documented defaults (REQ-023 §6).
DEFAULT_ROLE_REQUIREMENTS: dict[str, CapabilityRequirement] = {
    # OCR/extraction read scanned documents/photos -> need image + pdf input.
    "ocr": CapabilityRequirement(image_input=True, pdf_input=True),
    "extraction": CapabilityRequirement(image_input=True, pdf_input=True),
    # The agent orchestrates with tools (when tool-calling is enabled by config).
    "agent": CapabilityRequirement(text_input=True),
    # Repair only fixes JSON text.
    "repair": CapabilityRequirement(text_input=True),
}
