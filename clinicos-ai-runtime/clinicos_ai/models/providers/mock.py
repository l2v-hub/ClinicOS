"""Mock provider (no SDK) for CI/health and deterministic tests (REQ-023).
Returns a schema-shaped, EMPTY ClinicOS extraction — never invents data."""
from __future__ import annotations

import json

from ..capabilities import ModelCapabilities
from ..profiles import capabilities_for
from ..spec import ModelSpec
from .base import Attachment, BuiltModel

EMPTY_EXTRACTION = {
    "anagrafica": {"nome": "", "cognome": "", "dataNascita": "", "sesso": ""},
    "cartella": {
        "statoRicovero": "", "codiceFiscale": "", "anamnesi": {},
        "diagnosi": [], "allergie": [], "farmaci": [], "terapie": [],
        "parametriVitali": [], "noteClinica": [], "presaInCarico": {},
    },
}


# 016 F1: piano di lettura VUOTO e valido (mai inventa un tool), come EMPTY_EXTRACTION.
EMPTY_PLAN = {"intent": "unknown", "scope": "current_patient", "tools": [], "requiresCrossPatientAccess": False}


class _MockRunner:
    async def run(self, prompt: str, attachments: list[Attachment]) -> str:  # noqa: ARG002
        # 016 F1: per le richieste del planner assistente ritorna un piano vuoto valido.
        if "ASSISTANT_PLAN_V1" in prompt:
            return json.dumps(EMPTY_PLAN)
        return json.dumps(EMPTY_EXTRACTION)


def build(spec: ModelSpec, role: str, temperature: float, timeout_seconds: int) -> BuiltModel:  # noqa: ARG001
    caps: ModelCapabilities = capabilities_for(spec)
    return BuiltModel(spec=spec, capabilities=caps, runner=_MockRunner(), meta={"mock": True})
