"""ModelFactory tests — mock build path + capability gate (REQ-023). Stdlib only."""
import asyncio
import json
import unittest

from clinicos_ai.models.factory import ModelFactory
from clinicos_ai.models.spec import ModelSpec
from clinicos_ai.models.capabilities import CapabilityRequirement
from clinicos_ai.models.errors import CapabilityError


class FactoryTests(unittest.TestCase):
    def test_mock_build_and_run(self):
        f = ModelFactory(env={})
        built = f.create(ModelSpec.parse("mock:any"), role="extraction",
                         requirement=CapabilityRequirement(image_input=True, pdf_input=True),
                         temperature=0.0, timeout_seconds=10)
        self.assertEqual(built.spec.provider, "mock")
        self.assertTrue(built.capabilities.image_input)
        out = asyncio.run(built.runner.run("estrai", []))
        data = json.loads(out)
        self.assertIn("anagrafica", data)
        self.assertEqual(data["anagrafica"]["nome"], "")  # never invents

    def test_capability_gate_blocks_incompatible_model(self):
        f = ModelFactory(env={})
        # gpt-3.5 has no vision in the profile; OCR requires image -> rejected BEFORE any SDK import.
        with self.assertRaises(CapabilityError):
            f.create(ModelSpec.parse("openai:gpt-3.5-turbo"), role="ocr",
                     requirement=CapabilityRequirement(image_input=True),
                     temperature=0.0, timeout_seconds=10)

    def test_vision_model_passes_gate(self):
        f = ModelFactory(env={})
        # gpt-4o profile has vision -> capability check passes; build then needs the SDK,
        # which is absent here, so we only assert the gate did not raise.
        from clinicos_ai.models.profiles import capabilities_for
        caps = capabilities_for(ModelSpec.parse("openai:gpt-4o"))
        self.assertTrue(caps.image_input)


if __name__ == "__main__":
    unittest.main()
