"""Core registry/config/spec/capabilities tests (REQ-023/024). Stdlib only."""
import unittest

from clinicos_ai.models.spec import ModelSpec
from clinicos_ai.models.errors import ConfigError, CapabilityError
from clinicos_ai.models.configuration import load_runtime_config
from clinicos_ai.models.registry import ModelRegistry
from clinicos_ai.models.capabilities import ModelCapabilities, CapabilityRequirement

BASE_ENV = {
    "AI_OCR_MODEL": "google:gemma-4-31b-it",
    "AI_EXTRACTION_MODEL": "google:gemma-4-31b-it",
    "AI_AGENT_MODEL": "google:gemini-2.0-flash",
    "AI_REPAIR_MODEL": "google:gemma-4-31b-it",
}


class SpecTests(unittest.TestCase):
    def test_parse_valid(self):
        s = ModelSpec.parse("google:gemma-4-31b-it")
        self.assertEqual(s.provider, "google")
        self.assertEqual(s.model_id, "gemma-4-31b-it")
        self.assertEqual(str(s), "google:gemma-4-31b-it")

    def test_parse_openai_like(self):
        self.assertEqual(ModelSpec.parse("openai-like:custom").provider, "openai-like")

    def test_parse_requires_colon(self):
        with self.assertRaises(ConfigError):
            ModelSpec.parse("gemma-4-31b-it")

    def test_parse_rejects_unknown_provider(self):
        with self.assertRaises(ConfigError):
            ModelSpec.parse("acme:model")

    def test_parse_rejects_empty(self):
        with self.assertRaises(ConfigError):
            ModelSpec.parse("")
        self.assertIsNone(ModelSpec.parse_optional(""))
        self.assertIsNone(ModelSpec.parse_optional(None))


class ConfigTests(unittest.TestCase):
    def test_all_roles_available(self):
        cfg = load_runtime_config(BASE_ENV)
        self.assertTrue(cfg.available, cfg.errors)
        self.assertEqual(set(cfg.roles), {"ocr", "extraction", "agent", "repair"})
        self.assertEqual(str(cfg.role("agent").model), "google:gemini-2.0-flash")

    def test_missing_role_model_is_error(self):
        env = dict(BASE_ENV); del env["AI_OCR_MODEL"]
        cfg = load_runtime_config(env)
        self.assertFalse(cfg.available)
        self.assertTrue(any("AI_OCR_MODEL" in e for e in cfg.errors))

    def test_fallback_both_spellings(self):
        env = dict(BASE_ENV)
        env["AI_OCR_FALLBACK_MODEL"] = "openai:gpt-4o-mini"
        env["AI_FALLBACK_EXTRACTION_MODEL"] = "anthropic:claude-x"
        cfg = load_runtime_config(env)
        self.assertEqual(str(cfg.role("ocr").fallback), "openai:gpt-4o-mini")
        self.assertEqual(str(cfg.role("extraction").fallback), "anthropic:claude-x")

    def test_temperature_and_timeout_per_role_and_global(self):
        env = dict(BASE_ENV)
        env["AI_TEMPERATURE"] = "0.5"            # global
        env["AI_AGENT_TEMPERATURE"] = "0.1"      # per-role override
        env["AI_PROVIDER_TIMEOUT_SECONDS"] = "120"
        env["AI_OCR_TIMEOUT_SECONDS"] = "300"
        cfg = load_runtime_config(env)
        self.assertEqual(cfg.role("agent").temperature, 0.1)
        self.assertEqual(cfg.role("repair").temperature, 0.5)
        self.assertEqual(cfg.role("ocr").timeout_seconds, 300)
        self.assertEqual(cfg.role("repair").timeout_seconds, 120)

    def test_change_provider_via_env_only(self):
        env = dict(BASE_ENV); env["AI_OCR_MODEL"] = "openai:gpt-4o"
        cfg = load_runtime_config(env)
        self.assertEqual(cfg.role("ocr").model.provider, "openai")  # no code change


class RegistryTests(unittest.TestCase):
    def test_resolve_primary_then_fallback(self):
        env = dict(BASE_ENV); env["AI_OCR_FALLBACK_MODEL"] = "openai:gpt-4o-mini"
        reg = ModelRegistry(env=env)
        specs = reg.resolve("ocr")
        self.assertEqual([str(s) for s in specs], ["google:gemma-4-31b-it", "openai:gpt-4o-mini"])

    def test_credentials_check(self):
        env = dict(BASE_ENV)
        reg_no = ModelRegistry(env=env)
        self.assertFalse(reg_no.has_credentials("google"))
        env2 = dict(BASE_ENV); env2["GOOGLE_API_KEY"] = "AIzaFAKE"
        self.assertTrue(ModelRegistry(env=env2).has_credentials("google"))

    def test_usable_specs_filters_by_credentials(self):
        env = dict(BASE_ENV)
        env["AI_OCR_FALLBACK_MODEL"] = "openai:gpt-4o-mini"
        env["OPENAI_API_KEY"] = "sk-fake"  # only openai has creds
        reg = ModelRegistry(env=env)
        usable = reg.usable_specs("ocr")
        self.assertEqual([str(s) for s in usable], ["openai:gpt-4o-mini"])

    def test_public_status_has_no_secrets(self):
        env = dict(BASE_ENV); env["GOOGLE_API_KEY"] = "AIzaSUPERSECRET1234567890"
        status = ModelRegistry(env=env).public_status()
        self.assertNotIn("AIzaSUPERSECRET1234567890", str(status))
        self.assertTrue(status["roles"]["ocr"]["credentials_present"])
        self.assertEqual(status["roles"]["agent"]["model"], "google:gemini-2.0-flash")


class CapabilityTests(unittest.TestCase):
    def test_unmet_capability_raises(self):
        req = CapabilityRequirement(image_input=True, pdf_input=True)
        text_only = ModelCapabilities(text_input=True)
        self.assertEqual(set(req.unmet(text_only)), {"image_input", "pdf_input"})
        with self.assertRaises(CapabilityError):
            req.check(text_only, role="ocr", model_spec="x:y")

    def test_met_capability_ok(self):
        req = CapabilityRequirement(image_input=True)
        caps = ModelCapabilities(text_input=True, image_input=True, pdf_input=True)
        req.check(caps, role="ocr", model_spec="x:y")  # no raise


if __name__ == "__main__":
    unittest.main()
