"""016 F1: assistant read-planner tests. Deterministici col provider mock (nessun modello reale,
nessun dato clinico). Verificano che l'endpoint/agente produca un piano VALIDO e VUOTO (mai
inventa un tool) e che il marker del mock sia rispettato."""
import os
import unittest

# Mock su tutti i ruoli: la config valida ogni ruolo in ROLES.
for _r in ("OCR", "EXTRACTION", "AGENT", "REPAIR"):
    os.environ.setdefault(f"AI_{_r}_MODEL", "mock:mock")

from clinicos_ai.models.registry import ModelRegistry
from clinicos_ai.agents.assistant import run_assistant_plan, PLAN_MARKER
from clinicos_ai.models.providers.mock import EMPTY_PLAN


class AssistantPlanTests(unittest.IsolatedAsyncioTestCase):
    async def test_returns_valid_empty_plan_with_mock(self):
        reg = ModelRegistry()
        out = await run_assistant_plan(reg, "mostra le allergie di Rossi", [{"name": "get_patient_allergies", "args": {"patientId": "string"}}])
        self.assertIn("plan", out)
        self.assertEqual(out["plan"]["intent"], "unknown")
        self.assertEqual(out["plan"]["tools"], [])  # il mock non inventa mai un tool
        self.assertIn("scope", out["plan"])

    async def test_mock_recognizes_plan_marker(self):
        # Il prompt del planner contiene il marker → il mock ritorna EMPTY_PLAN, non l'estrazione.
        self.assertIn("PLAN", PLAN_MARKER)
        reg = ModelRegistry()
        out = await run_assistant_plan(reg, "qualsiasi", [])
        self.assertEqual(out["plan"], EMPTY_PLAN)


if __name__ == "__main__":
    unittest.main()


class AssistantComposeTests(unittest.IsolatedAsyncioTestCase):
    async def test_mock_compose_returns_unfounded_empty(self):
        from clinicos_ai.agents.assistant import run_assistant_compose
        reg = ModelRegistry()
        out = await run_assistant_compose(reg, "allergie?", [{"value": "Penicillina"}], [{"recordId": "s1"}])
        # il mock non fonda mai la prosa → il backend userà la vista strutturata
        self.assertEqual(out["answerText"], "")
        self.assertEqual(out["citedSources"], [])
