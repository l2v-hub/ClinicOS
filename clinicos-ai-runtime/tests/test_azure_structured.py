"""run_structured sull'adapter Azure (ripristina il vincolo di schema che dava Mistral).

AC1: extraction preferisce run_structured; la richiesta porta response_format.json_schema,
     una parte image_url per immagine e una parte file per i non-immagine.
AC2: gli errori sono normalizzati (timeout/HTTP/429) e non contengono mai chiave o endpoint.
Nessuna rete: urlopen e' sostituito da un fake.
"""
from __future__ import annotations

import asyncio
import io
import json
import unittest
import urllib.error
from unittest import mock

from clinicos_ai.models.errors import RuntimeError_, ErrorKind
from clinicos_ai.models.providers.azure import _AzureRunner
from clinicos_ai.models.providers.base import Attachment
from clinicos_ai.models.spec import ModelSpec

SCHEMA = {"type": "object", "properties": {"cartella": {"type": "object"}}}
ENV = {"AZURE_OPENAI_ENDPOINT": "https://example.services.ai.azure.com/",
       "AZURE_OPENAI_API_KEY": "chiave-di-test"}


def _runner():
    return _AzureRunner(ModelSpec.parse("azure:gpt-5.5"), temperature=1.0, timeout_seconds=5)


class TestStructuredBody(unittest.TestCase):
    def test_extraction_prefers_run_structured(self):
        # extraction.run_extraction() sceglie il ramo vincolato solo se il metodo esiste.
        self.assertTrue(hasattr(_runner(), "run_structured"))

    def test_body_carries_schema_and_parts(self):
        atts = [
            Attachment(filename="foto.jpg", mime_type="image/jpeg", data=b"\xff\xd8"),
            Attachment(filename="lettera.pdf", mime_type="application/pdf", data=b"%PDF"),
        ]
        body = _runner()._structured_body("estrai", SCHEMA, atts)
        self.assertEqual(body["model"], "gpt-5.5")
        rf = body["response_format"]
        self.assertEqual(rf["type"], "json_schema")
        self.assertEqual(rf["json_schema"]["schema"], SCHEMA)
        self.assertFalse(rf["json_schema"]["strict"])  # schema draft-07: strict lo rifiuterebbe
        parts = body["messages"][0]["content"]
        self.assertEqual(parts[0]["type"], "text")
        kinds = [p["type"] for p in parts[1:]]
        self.assertEqual(kinds, ["image_url", "file"])
        self.assertTrue(parts[1]["image_url"]["url"].startswith("data:image/jpeg;base64,"))
        self.assertEqual(parts[2]["file"]["filename"], "lettera.pdf")

    def test_no_attachments_still_valid(self):
        body = _runner()._structured_body("ripara", SCHEMA, [])
        self.assertEqual(len(body["messages"][0]["content"]), 1)


class TestStructuredCall(unittest.TestCase):
    def _run(self, fake):
        with mock.patch.dict("os.environ", ENV, clear=False), \
             mock.patch("urllib.request.urlopen", fake):
            return asyncio.run(_runner().run_structured("estrai", SCHEMA, []))

    def test_returns_message_content(self):
        payload = json.dumps({"choices": [{"message": {"content": '{"cartella":{}}'}}]}).encode()

        class _Resp(io.BytesIO):
            def __enter__(self): return self
            def __exit__(self, *a): return False

        out = self._run(lambda req, timeout=None: _Resp(payload))
        self.assertEqual(out, '{"cartella":{}}')

    def test_url_is_built_on_the_root_endpoint(self):
        seen = {}
        payload = json.dumps({"choices": [{"message": {"content": "{}"}}]}).encode()

        class _Resp(io.BytesIO):
            def __enter__(self): return self
            def __exit__(self, *a): return False

        def fake(req, timeout=None):
            seen["url"] = req.full_url
            seen["has_key_header"] = "api-key" in {k.lower() for k in req.headers}
            return _Resp(payload)

        self._run(fake)
        # niente doppio /openai e nessuno slash duplicato malgrado l'endpoint con trailing slash
        self.assertEqual(seen["url"],
                         "https://example.services.ai.azure.com/openai/v1/chat/completions")
        self.assertTrue(seen["has_key_header"])

    def test_http_error_becomes_provider_error_without_secrets(self):
        def fake(req, timeout=None):
            raise urllib.error.HTTPError(req.full_url, 400, "Bad Request", {},
                                         io.BytesIO(b'{"error":"schema non valido"}'))

        with self.assertRaises(RuntimeError_) as cm:
            self._run(fake)
        self.assertEqual(cm.exception.kind, ErrorKind.PROVIDER_ERROR)
        self.assertNotIn("chiave-di-test", cm.exception.message)

    def test_429_becomes_rate_limit(self):
        def fake(req, timeout=None):
            raise urllib.error.HTTPError(req.full_url, 429, "Too Many Requests", {},
                                         io.BytesIO(b"rate limited"))

        with self.assertRaises(RuntimeError_) as cm:
            self._run(fake)
        self.assertEqual(cm.exception.kind, ErrorKind.RATE_LIMIT)

    def test_socket_timeout_is_classified_as_timeout(self):
        # urllib NON incapsula il timeout in attesa di risposta: arriva come TimeoutError grezzo.
        # Deve diventare ErrorKind.TIMEOUT, non PROVIDER_ERROR, o nei log "Azure e' lento" e
        # "Azure ha rifiutato" diventano indistinguibili.
        def fake(req, timeout=None):
            raise TimeoutError("timed out")

        with self.assertRaises(RuntimeError_) as cm:
            self._run(fake)
        self.assertEqual(cm.exception.kind, ErrorKind.TIMEOUT)

    def test_connect_timeout_wrapped_in_urlerror_is_timeout(self):
        # In fase di connessione il timeout arriva incapsulato in URLError.
        def fake(req, timeout=None):
            raise urllib.error.URLError(TimeoutError("timed out"))

        with self.assertRaises(RuntimeError_) as cm:
            self._run(fake)
        self.assertEqual(cm.exception.kind, ErrorKind.TIMEOUT)

    def test_other_urlerror_is_provider_error(self):
        def fake(req, timeout=None):
            raise urllib.error.URLError(ConnectionRefusedError("connessione rifiutata"))

        with self.assertRaises(RuntimeError_) as cm:
            self._run(fake)
        self.assertEqual(cm.exception.kind, ErrorKind.PROVIDER_ERROR)
        self.assertNotIn("chiave-di-test", cm.exception.message)

    def test_missing_credentials_is_provider_unavailable(self):
        from clinicos_ai.models.errors import ProviderUnavailableError
        with mock.patch.dict("os.environ", {"AZURE_OPENAI_ENDPOINT": "",
                                            "AZURE_OPENAI_API_KEY": ""}, clear=False):
            with self.assertRaises(ProviderUnavailableError):
                asyncio.run(_runner().run_structured("estrai", SCHEMA, []))


if __name__ == "__main__":
    unittest.main()
