"""Env-driven model config — separazione Agnos LLM / OCR / Extraction (test obbligatori)."""
import pathlib
import unittest
from clinicos_ai.models.env_config import (
    resolve_agnos_llm, resolve_ocr, resolve_extraction, normalize_provider,
    safe_config_summary,
)


class AgnosLlmTests(unittest.TestCase):
    def test_1_reads_agnos_llm_provider(self):
        cfg, errs = resolve_agnos_llm({"AGNOS_LLM_PROVIDER": "google", "AGNOS_LLM_MODEL": "gemini-2.0-flash"})
        self.assertEqual(errs, [])
        self.assertEqual(cfg.model.provider, "google")

    def test_2_reads_agnos_llm_model(self):
        cfg, _ = resolve_agnos_llm({"AGNOS_LLM_PROVIDER": "google", "AGNOS_LLM_MODEL": "gemini-2.0-flash"})
        self.assertEqual(cfg.model.model_id, "gemini-2.0-flash")

    def test_3_azure_only_when_provider_azure_openai(self):
        env = {"AGNOS_LLM_PROVIDER": "azure-openai", "AGNOS_LLM_MODEL": "gpt-5.4-mini",
               "AZURE_OPENAI_ENDPOINT": "https://x.openai.azure.com", "AZURE_OPENAI_API_KEY": "k",
               "AZURE_OPENAI_DEPLOYMENT": "gpt-5.4-mini"}
        cfg, errs = resolve_agnos_llm(env)
        self.assertEqual(errs, [])
        self.assertEqual(cfg.model.provider, "azure")  # azure-openai → azure
        self.assertEqual(cfg.model.model_id, "gpt-5.4-mini")  # deployment
        # provider non-azure NON deve richiedere/usare le var azure
        cfg2, _ = resolve_agnos_llm({"AGNOS_LLM_PROVIDER": "google", "AGNOS_LLM_MODEL": "gemini-2.0-flash",
                                     "AZURE_OPENAI_ENDPOINT": "https://x", "AZURE_OPENAI_API_KEY": "k"})
        self.assertEqual(cfg2.model.provider, "google")

    def test_3b_azure_missing_endpoint_is_clear_error(self):
        cfg, errs = resolve_agnos_llm({"AGNOS_LLM_PROVIDER": "azure-openai", "AGNOS_LLM_MODEL": "gpt-5.4-mini",
                                       "AZURE_OPENAI_API_KEY": "k"})
        self.assertIsNone(cfg)
        self.assertTrue(any("AZURE_OPENAI_ENDPOINT" in e for e in errs))

    def test_8_legacy_agent_model_only_as_fallback(self):
        # senza AGNOS_LLM_*, usa AI_AGENT_MODEL (legacy) e marca la fonte
        cfg, errs = resolve_agnos_llm({"AI_AGENT_MODEL": "google:gemma-4-31b-it"})
        self.assertEqual(errs, [])
        self.assertEqual((cfg.model.provider, cfg.model.model_id), ("google", "gemma-4-31b-it"))
        self.assertEqual(cfg.source, "legacy")
        # le nuove var hanno PRIORITA' sul legacy
        cfg2, _ = resolve_agnos_llm({"AGNOS_LLM_PROVIDER": "google", "AGNOS_LLM_MODEL": "gemini-2.0-flash",
                                     "AI_AGENT_MODEL": "google:gemma-4-31b-it"})
        self.assertEqual(cfg2.model.model_id, "gemini-2.0-flash")
        self.assertEqual(cfg2.source, "env")

    def test_9_missing_required_gives_clear_error(self):
        cfg, errs = resolve_agnos_llm({})
        self.assertIsNone(cfg)
        self.assertTrue(any("AGNOS_LLM" in e for e in errs))


class OcrTests(unittest.TestCase):
    def test_4_ocr_uses_ai_ocr_model_not_agnos(self):
        env = {"AGNOS_LLM_PROVIDER": "azure-openai", "AGNOS_LLM_MODEL": "gpt-5.4-mini",
               "AI_OCR_MODEL": "mistral-document-ai-2505", "MISTRAL_API_KEY": "k"}
        cfg, errs = resolve_ocr(env)
        self.assertEqual(errs, [])
        self.assertEqual(cfg.model.model_id, "mistral-document-ai-2505")
        self.assertNotEqual(cfg.model.model_id, "gpt-5.4-mini")  # NON usa il modello Agnos

    def test_ocr_default_provider_mistral(self):
        cfg, _ = resolve_ocr({"AI_OCR_MODEL": "mistral-document-ai-2505", "MISTRAL_API_KEY": "k"})
        self.assertEqual(cfg.model.provider, "mistral")  # default retrocompatibile

    def test_7_azure_separate_from_ocr(self):
        # anche con Azure configurato per Agnos, l'OCR resta mistral
        env = {"AGNOS_LLM_PROVIDER": "azure-openai", "AGNOS_LLM_MODEL": "gpt", "AZURE_OPENAI_ENDPOINT": "e",
               "AZURE_OPENAI_API_KEY": "k", "AI_OCR_PROVIDER": "mistral", "AI_OCR_MODEL": "mistral-document-ai-2505",
               "MISTRAL_API_KEY": "mk"}
        cfg, errs = resolve_ocr(env)
        self.assertEqual(cfg.model.provider, "mistral")

    def test_ocr_legacy_provider_colon_model(self):
        # formato legacy AI_OCR_MODEL="mistral:doc-ai" continua a funzionare
        cfg, errs = resolve_ocr({"AI_OCR_MODEL": "mistral:mistral-document-ai-2505", "MISTRAL_API_KEY": "k"})
        self.assertEqual(errs, [])
        self.assertEqual((cfg.model.provider, cfg.model.model_id), ("mistral", "mistral-document-ai-2505"))


class ExtractionTests(unittest.TestCase):
    def test_5_extraction_uses_ai_extraction_model_not_agnos(self):
        env = {"AGNOS_LLM_MODEL": "gpt-5.4-mini", "AI_EXTRACTION_MODEL": "mistral-document-ai-2505",
               "MISTRAL_API_KEY": "k"}
        cfg, errs = resolve_extraction(env)
        self.assertEqual(errs, [])
        self.assertEqual(cfg.model.model_id, "mistral-document-ai-2505")

    def test_extraction_default_provider_mistral(self):
        cfg, _ = resolve_extraction({"AI_EXTRACTION_MODEL": "mistral-document-ai-2505", "MISTRAL_API_KEY": "k"})
        self.assertEqual(cfg.model.provider, "mistral")

    def test_6_mistral_separate_from_agnos(self):
        # cambiare Agnos non deve toccare extraction/OCR
        base = {"AI_EXTRACTION_MODEL": "mistral-document-ai-2505", "AI_OCR_MODEL": "mistral-document-ai-2505",
                "MISTRAL_API_KEY": "k"}
        for agnos in ("google:gemma", "azure-openai:gpt"):
            env = dict(base); env["AGNOS_LLM_PROVIDER"], env["AGNOS_LLM_MODEL"] = agnos.split(":", 1)
            ext, _ = resolve_extraction(env); ocr, _ = resolve_ocr(env)
            self.assertEqual(ext.model.provider, "mistral")
            self.assertEqual(ocr.model.provider, "mistral")


class ProviderAliasTests(unittest.TestCase):
    def test_normalize_azure_openai(self):
        self.assertEqual(normalize_provider("azure-openai"), "azure")
        self.assertEqual(normalize_provider("Azure-OpenAI"), "azure")
        self.assertEqual(normalize_provider("mistral"), "mistral")


class SecretSafetyTests(unittest.TestCase):
    def test_10_no_secret_in_config_log(self):
        # il riepilogo log-safe non deve MAI contenere il valore di una chiave/endpoint
        secret_key = "sk-super-secret-value-123"
        secret_endpoint = "https://tenant-private.openai.azure.com"
        env = {
            "AGNOS_LLM_PROVIDER": "azure-openai", "AGNOS_LLM_MODEL": "gpt-5.4-mini",
            "AZURE_OPENAI_ENDPOINT": secret_endpoint, "AZURE_OPENAI_API_KEY": secret_key,
            "AI_OCR_MODEL": "mistral-document-ai-2505", "MISTRAL_API_KEY": "mk-secret-456",
            "AI_EXTRACTION_MODEL": "mistral-document-ai-2505",
        }
        blob = "\n".join(safe_config_summary(env))
        self.assertNotIn(secret_key, blob)
        self.assertNotIn("mk-secret-456", blob)
        self.assertNotIn(secret_endpoint, blob)
        # ma provider e modello (non-secret) DEVONO comparire
        self.assertIn("azure", blob)
        self.assertIn("gpt-5.4-mini", blob)
        self.assertIn("mistral-document-ai-2505", blob)

    def test_11_no_secret_key_in_frontend(self):
        # nessun secret di modello/provider deve comparire nel bundle frontend
        root = pathlib.Path(__file__).resolve().parents[2]  # repo root da .../clinicos-ai-runtime/tests
        fe = root / "frontend" / "src"
        if not fe.exists():
            self.skipTest("frontend/src non presente in questo worktree")
        forbidden = ("AZURE_OPENAI_API_KEY", "MISTRAL_API_KEY", "OPENAI_API_KEY",
                     "GOOGLE_API_KEY", "GEMINI_API_KEY", "ANTHROPIC_API_KEY")
        hits = []
        for p in fe.rglob("*.ts*"):
            text = p.read_text(encoding="utf-8", errors="ignore")
            for token in forbidden:
                if token in text:
                    hits.append(f"{p.name}:{token}")
        self.assertEqual(hits, [], f"secret di provider referenziati nel frontend: {hits}")


if __name__ == "__main__":
    unittest.main()
