"""016 F1: assistant read-planner tests. Deterministici col provider mock (nessun modello reale,
nessun dato clinico). Verificano che l'endpoint/agente produca un piano VALIDO e VUOTO (mai
inventa un tool) e che il marker del mock sia rispettato."""
import os
import unittest

# Mock su tutti i ruoli: la config valida ogni ruolo in ROLES.
for _r in ("OCR", "EXTRACTION", "AGENT", "REPAIR"):
    os.environ.setdefault(f"AI_{_r}_MODEL", "mock:mock")

from clinicos_ai.models.registry import ModelRegistry
from clinicos_ai.agents.assistant import run_assistant_plan, PLAN_MARKER, parse_plan_json
from clinicos_ai.models.providers.mock import EMPTY_PLAN


class ParsePlanJsonTests(unittest.TestCase):
    def test_pure_json(self):
        p = parse_plan_json('{"intent":"allergies","scope":"current_patient","tools":[{"tool":"get_patient_allergies","args":{}}],"requiresCrossPatientAccess":false}')
        self.assertEqual(p["intent"], "allergies")
        self.assertEqual(p["tools"][0]["tool"], "get_patient_allergies")

    def test_fenced_json(self):
        p = parse_plan_json('```json\n{"intent":"therapies","scope":"current_patient","tools":[],"requiresCrossPatientAccess":false}\n```')
        self.assertEqual(p["intent"], "therapies")

    def test_prose_wrapped_json(self):
        # il modello a volte antepone/postpone prosa: si estrae il blocco {...}
        raw = 'Ecco il piano richiesto:\n{"intent":"allergies","scope":"current_patient","tools":[{"tool":"get_patient_allergies","args":{}}],"requiresCrossPatientAccess":false}\nSpero sia utile.'
        p = parse_plan_json(raw)
        self.assertEqual(p["intent"], "allergies")
        self.assertEqual(len(p["tools"]), 1)

    def test_unparsable_returns_none(self):
        self.assertIsNone(parse_plan_json("non è un piano, mi dispiace"))


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

class SystemPromptContractTests(unittest.TestCase):
    def test_prompt_enumerates_backend_intents(self):
        # Guardia anti-regressione del bug F1: il prompt DEVE elencare gli intent enum
        # attesi dal validatore backend (llm-planner.ts), altrimenti il modello risponde
        # in prosa e OGNI piano LLM viene scartato (→ sempre deterministico).
        from clinicos_ai.agents.assistant import _SYSTEM
        for intent in ("allergies", "therapies", "vitals_range", "vitals_recent",
                       "narrative_search", "document_search", "timeline", "appointments",
                       "correlate", "patient_search", "unknown"):
            self.assertIn(intent, _SYSTEM, f"intent '{intent}' mancante nel prompt planner")
