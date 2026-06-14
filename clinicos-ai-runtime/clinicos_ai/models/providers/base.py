"""Neutral model interface (REQ-023). Agents/api depend ONLY on this, never on a
provider SDK. Provider modules return a BuiltModel wrapping their SDK model."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

from ..capabilities import ModelCapabilities
from ..spec import ModelSpec


@dataclass
class Attachment:
    filename: str
    mime_type: str
    data: bytes


class ModelRunner(Protocol):
    """Run a single completion. Implementations apply timeout/retry internally."""
    async def run(self, prompt: str, attachments: list[Attachment]) -> str: ...


@dataclass
class BuiltModel:
    spec: ModelSpec
    capabilities: ModelCapabilities
    runner: ModelRunner
    meta: dict = field(default_factory=dict)
