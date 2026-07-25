"""OCR con Azure Document Intelligence: provider, capability e selezione per ruolo.

Recupera la capacita' persa col ritiro di Mistral Document AI (analisi di layout: una riga
per farmaco, intestazioni inferite dagli stili). Nessuna rete: urlopen e' sostituito.
"""
from __future__ import annotations

import asyncio
import io
import json
import unittest
import urllib.error
from unittest import mock

from clinicos_ai.agents.extraction import run_extraction
from clinicos_ai.models.capabilities import CapabilityRequirement
from clinicos_ai.models.configuration import load_runtime_config
from clinicos_ai.models.env_config import normalize_provider
from clinicos_ai.models.errors import RuntimeError_, ErrorKind
from clinicos_ai.models.profiles import capabilities_for
from clinicos_ai.models.providers.azure_docintel import _DocIntelRunner
from clinicos_ai.models.providers.base import Attachment, BuiltModel
from clinicos_ai.models.registry import ModelRegistry
from clinicos_ai.models.spec import ModelSpec

ENV = {"AZURE_OPENAI_ENDPOINT": "https://example.services.ai.azure.com/",
       "AZURE_OPENAI_API_KEY": "chiave-di-test"}


class _Resp(io.BytesIO):
    def __init__(self, payload=b"{}", headers=None):
        super().__init__(payload)
        self.headers = headers or {}

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def _runner():
    return _DocIntelRunner(ModelSpec.parse("azure-docintel:prebuilt-layout"), timeout_seconds=5)


class TestConfigurazione(unittest.TestCase):
    def test_alias_leggibili(self):
        self.assertEqual(normalize_provider("azure-document-intelligence"), "azure-docintel")
        self.assertEqual(normalize_provider("document-intelligence"), "azure-docintel")

    def test_capability_soddisfano_il_ruolo_ocr(self):
        caps = capabilities_for(ModelSpec.parse("azure-docintel:prebuilt-layout"))
        self.assertTrue(caps.image_input)
        self.assertTrue(caps.pdf_input)
        # non e' un modello di chat: niente tool calling ne' structured output
        self.assertFalse(caps.tool_calling)
        self.assertFalse(caps.native_structured_output)
        self.assertEqual(CapabilityRequirement(image_input=True, pdf_input=True).unmet(caps), [])

    def test_ruoli_indipendenti_ocr_e_extraction(self):
        env = dict(ENV, **{
            "AGNOS_LLM_PROVIDER": "azure-openai", "AGNOS_LLM_MODEL": "gpt-5.5",
            "AI_OCR_PROVIDER": "azure-document-intelligence", "AI_OCR_MODEL": "prebuilt-layout",
            "AI_EXTRACTION_PROVIDER": "azure-openai", "AI_EXTRACTION_MODEL": "gpt-5.5",
            "AI_TEMPERATURE": "1",
        })
        cfg = load_runtime_config(env)
        self.assertEqual(cfg.errors, [])
        self.assertEqual(str(cfg.role("ocr").model), "azure-docintel:prebuilt-layout")
        self.assertEqual(str(cfg.role("extraction").model), "azure:gpt-5.5")
        # la chiave della risorsa Azure vale anche per Document Intelligence
        self.assertTrue(ModelRegistry(cfg, env=env).has_credentials("azure-docintel"))


class TestRunner(unittest.TestCase):
    def _run(self, fake, atts=None):
        with mock.patch.dict("os.environ", ENV, clear=False), \
             mock.patch("urllib.request.urlopen", fake):
            return asyncio.run(_runner().run("ignorato", atts if atts is not None else [
                Attachment(filename="p1.jpg", mime_type="image/jpeg", data=b"\xff\xd8")]))

    def test_analisi_asincrona_e_markdown(self):
        seen = {}
        done = json.dumps({"status": "succeeded",
                           "analyzeResult": {"content": "# TERAPIA\n\nFurosemide 25 mg"}}).encode()

        def fake(req, timeout=None):
            url = req.full_url
            if ":analyze" in url:
                seen["analyze_url"] = url
                return _Resp(b"", {"Operation-Location": "https://example/op/1"})
            return _Resp(done)

        out = self._run(fake)
        self.assertIn("# TERAPIA", out)
        # markdown esplicito e modello prebuilt nell'URL
        self.assertIn("outputContentFormat=markdown", seen["analyze_url"])
        self.assertIn("prebuilt-layout:analyze", seen["analyze_url"])
        self.assertNotIn("//documentintelligence", seen["analyze_url"].replace("https://", ""))

    def test_piu_documenti_concatenati_in_ordine(self):
        pages = iter(["## PAGINA UNO", "## PAGINA DUE"])

        def fake(req, timeout=None):
            if ":analyze" in req.full_url:
                return _Resp(b"", {"Operation-Location": "https://example/op/x"})
            return _Resp(json.dumps({"status": "succeeded",
                                     "analyzeResult": {"content": next(pages)}}).encode())

        out = self._run(fake, [
            Attachment(filename="a.jpg", mime_type="image/jpeg", data=b"a"),
            Attachment(filename="b.jpg", mime_type="image/jpeg", data=b"b"),
        ])
        self.assertLess(out.index("PAGINA UNO"), out.index("PAGINA DUE"))

    def test_analisi_fallita_e_errore_provider(self):
        def fake(req, timeout=None):
            if ":analyze" in req.full_url:
                return _Resp(b"", {"Operation-Location": "https://example/op/1"})
            return _Resp(json.dumps({"status": "failed",
                                     "error": {"code": "InvalidImage"}}).encode())

        with self.assertRaises(RuntimeError_) as cm:
            self._run(fake)
        self.assertEqual(cm.exception.kind, ErrorKind.PROVIDER_ERROR)

    def test_429_e_rate_limit_senza_chiave_nel_messaggio(self):
        def fake(req, timeout=None):
            raise urllib.error.HTTPError(req.full_url, 429, "Too Many Requests", {},
                                         io.BytesIO(b"rate limited"))

        with self.assertRaises(RuntimeError_) as cm:
            self._run(fake)
        self.assertEqual(cm.exception.kind, ErrorKind.RATE_LIMIT)
        self.assertNotIn("chiave-di-test", cm.exception.message)

    def test_nessun_allegato_nessuna_chiamata(self):
        def fake(req, timeout=None):
            raise AssertionError("non deve chiamare il servizio senza allegati")

        self.assertEqual(self._run(fake, []), "")


class _FakeRunner:
    def __init__(self, text):
        self.text = text
        self.calls = 0

    async def run(self, prompt, attachments):  # noqa: ARG002
        self.calls += 1
        return self.text


class TestModoOcr(unittest.TestCase):
    def test_mode_ocr_usa_il_ruolo_ocr_e_restituisce_rawText(self):
        runner = _FakeRunner("## TERAPIA\n\nFurosemide 25 mg 1 cp al mattino")
        spec = ModelSpec.parse("azure-docintel:prebuilt-layout")
        built = BuiltModel(spec=spec, capabilities=capabilities_for(spec), runner=runner)
        reg = mock.Mock()
        reg.build.return_value = built
        out = asyncio.run(run_extraction(reg, "prompt", {}, [], mode="ocr"))
        reg.build.assert_called_once_with("ocr")
        self.assertEqual(out.data["rawText"], runner.text)
        self.assertEqual(out.model, "azure-docintel:prebuilt-layout")
        self.assertEqual(runner.calls, 1)

    def test_mode_ocr_scarta_involucro_json_di_un_modello_di_chat(self):
        # Se il ruolo 'ocr' e' servito da un modello di chat, quello obbedisce al prompt e
        # risponde {"rawText": "..."}: l'involucro va tolto, o il backend salverebbe il JSON
        # al posto della trascrizione e il parser non troverebbe nessuna sezione.
        runner = _FakeRunner('```json\n{"rawText": "## TERAPIA\\n\\nFurosemide 25 mg"}\n```')
        spec = ModelSpec.parse("azure:gpt-5.5")
        built = BuiltModel(spec=spec, capabilities=capabilities_for(spec), runner=runner)
        reg = mock.Mock()
        reg.build.return_value = built
        out = asyncio.run(run_extraction(reg, "prompt", {}, [], mode="ocr"))
        self.assertEqual(out.data["rawText"], "## TERAPIA\n\nFurosemide 25 mg")

    def test_mode_ocr_lascia_intatto_il_markdown(self):
        runner = _FakeRunner("## TERAPIA\n\nFurosemide 25 mg")
        spec = ModelSpec.parse("azure-docintel:prebuilt-layout")
        built = BuiltModel(spec=spec, capabilities=capabilities_for(spec), runner=runner)
        reg = mock.Mock()
        reg.build.return_value = built
        out = asyncio.run(run_extraction(reg, "prompt", {}, [], mode="ocr"))
        self.assertEqual(out.data["rawText"], "## TERAPIA\n\nFurosemide 25 mg")

    def test_mode_default_resta_extraction(self):
        runner = _FakeRunner('{"cartella": {}}')
        spec = ModelSpec.parse("azure:gpt-5.5")
        built = BuiltModel(spec=spec, capabilities=capabilities_for(spec), runner=runner)
        reg = mock.Mock()
        reg.build.return_value = built
        out = asyncio.run(run_extraction(reg, "prompt", {}, []))
        reg.build.assert_called_once_with("extraction")
        self.assertEqual(out.data, {"cartella": {}})


if __name__ == "__main__":
    unittest.main()
