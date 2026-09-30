"""Phase 3: Agno skill router. Deterministic with the mock provider (no real model, no data):
the router never invents a skill, and its output is sanitized against the offered skills."""
import os
import unittest

for _r in ("OCR", "EXTRACTION", "AGENT", "REPAIR"):
    os.environ.setdefault(f"AI_{_r}_MODEL", "mock:mock")

from clinicos_ai.models.registry import ModelRegistry
from clinicos_ai.agents.skill_router import run_skill_route, sanitize_route, SKILL_ROUTE_MARKER

SKILLS = [
    {"id": "vitals.record", "name": "Registra parametri vitali", "description": "...", "slots": ["patient", "values"]},
    {"id": "vitals.recent", "name": "Parametri recenti", "description": "...", "slots": ["patient"]},
]


class SanitizeRouteTests(unittest.TestCase):
    def test_keeps_offered_skill_and_known_fields(self):
        out = sanitize_route({"skillId": "vitals.record", "patientQuery": " Mario Rossi ",
                              "values": {"pa": "120/80", "spo2": 97}, "confirm": True}, {"vitals.record"})
        self.assertEqual(out, {"skillId": "vitals.record", "patientQuery": "Mario Rossi",
                               "values": {"pa": "120/80", "spo2": "97"}})

    def test_drops_skill_not_offered(self):
        self.assertIsNone(sanitize_route({"skillId": "therapy.prescribe"}, {"vitals.record"})["skillId"])

    def test_garbage(self):
        self.assertEqual(sanitize_route(None, {"x"}), {"skillId": None})


class SkillRouteTests(unittest.IsolatedAsyncioTestCase):
    async def test_mock_never_invents_a_route(self):
        out = await run_skill_route(ModelRegistry(), "registra pressione 120/80 per Rossi", SKILLS, None,
                                    "2026-09-30", ["pa", "spo2"])
        self.assertEqual(out["route"], {"skillId": None})

    def test_marker_present(self):
        self.assertTrue(SKILL_ROUTE_MARKER.startswith("SKILL_ROUTE"))


class SkillRouteEndpointTests(unittest.IsolatedAsyncioTestCase):
    async def test_endpoint_requires_service_token_and_answers(self):
        os.environ["AI_RUNTIME_SERVICE_TOKEN"] = "test-token"
        from fastapi import HTTPException
        from clinicos_ai.api.app import assistant_skill_route
        from clinicos_ai.domain.contracts import SkillRouteRequest
        req = SkillRouteRequest(message="registra pressione", today="2026-09-30", skills=SKILLS, valueKeys=["pa"])
        with self.assertRaises(HTTPException) as denied:
            await assistant_skill_route(req, authorization="Bearer wrong")
        self.assertEqual(denied.exception.status_code, 401)
        ok = await assistant_skill_route(req, authorization="Bearer test-token")
        self.assertEqual(ok.route, {"skillId": None})


if __name__ == "__main__":
    unittest.main()
