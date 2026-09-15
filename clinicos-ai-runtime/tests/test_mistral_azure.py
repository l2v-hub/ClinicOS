import asyncio
import base64
import io
import json
import unittest
import urllib.error
import urllib.request
from unittest import mock

from clinicos_ai.models.errors import ErrorKind, RuntimeError_
from clinicos_ai.models.mistral_config import resolve_mistral_connection
from clinicos_ai.models.providers.base import Attachment
from clinicos_ai.models.providers.mistral import _MistralOcrRunner, _NoRedirect
from clinicos_ai.models.spec import ModelSpec
from clinicos_ai.models.registry import ModelRegistry

ENV = {"AZURE_OPENAI_ENDPOINT": "https://example.services.ai.azure.com", "AZURE_OPENAI_API_KEY": "synthetic-azure-key"}


def runner():
    return _MistralOcrRunner(ModelSpec.parse("mistral:mistral-ocr-4-0"), 5)


class Response(io.BytesIO):
    def __enter__(self): return self
    def __exit__(self, *args): return False


class AzureMistralTests(unittest.TestCase):
    def test_root_endpoint_uses_ocr_route_and_scoped_azure_key(self):
        url, key = resolve_mistral_connection(ENV)
        self.assertEqual(url, "https://example.services.ai.azure.com/providers/mistral/azure/ocr")
        self.assertEqual(key, ENV["AZURE_OPENAI_API_KEY"])
        self.assertTrue(ModelRegistry(env=ENV).has_credentials("mistral"))

    def test_explicit_url_and_dedicated_key_take_precedence(self):
        env = {**ENV, "MISTRAL_OCR_URL": "https://api.mistral.ai/v1/ocr", "MISTRAL_API_KEY": "synthetic-mistral"}
        self.assertEqual(resolve_mistral_connection(env), (env["MISTRAL_OCR_URL"], env["MISTRAL_API_KEY"]))

    def test_azure_secret_never_falls_back_to_non_azure_hosts(self):
        for url in ("https://api.mistral.ai/v1/ocr", "https://example.services.ai.azure.com.attacker.test/ocr"):
            with self.assertRaises(RuntimeError_):
                resolve_mistral_connection({**ENV, "MISTRAL_OCR_URL": url})
            self.assertFalse(ModelRegistry(env={**ENV, "MISTRAL_OCR_URL": url}).has_credentials("mistral"))

    def test_insecure_or_credential_bearing_endpoints_are_rejected_without_echo(self):
        for url in ("http://example.test/ocr", "https://username:private-value@example.test/ocr", "https://example.test:9443/ocr", "malformed"):
            with self.assertRaises(RuntimeError_) as caught:
                resolve_mistral_connection({"MISTRAL_OCR_URL": url, "MISTRAL_API_KEY": "private-value"})
            self.assertNotIn("private-value", str(caught.exception))

    def test_redirect_never_forwards_credentials(self):
        req = urllib.request.Request("https://example.services.ai.azure.com/ocr", headers={"api-key": "private-value"})
        with self.assertRaises(RuntimeError_) as caught:
            _NoRedirect().redirect_request(req, None, 302, "redirect", {}, "https://external.test/")
        self.assertEqual(caught.exception.kind, ErrorKind.CONFIG)
        self.assertNotIn("private-value", str(caught.exception))

    def test_model_payload_and_order_for_images_and_pdf(self):
        calls = []
        def fake(req, timeout=None):
            body = json.loads(req.data)
            calls.append((req, body))
            return Response(json.dumps({"pages": [{"markdown": f"DOCUMENTO {len(calls)}"}]}).encode())
        attachments = [Attachment("a.png", "image/png", b"image-one"), Attachment("b.pdf", "application/pdf", b"pdf-two")]
        with mock.patch.dict("os.environ", ENV, clear=True), mock.patch("clinicos_ai.models.providers.mistral._open_ocr", fake):
            result = json.loads(asyncio.run(runner().run("read", attachments)))
        self.assertEqual(result, {"rawText": "DOCUMENTO 1\n\nDOCUMENTO 2"})
        self.assertEqual(calls[0][1]["model"], "mistral-ocr-4-0")
        self.assertEqual(calls[0][1]["document"], {"type": "image_url", "image_url": "data:image/png;base64," + base64.b64encode(b"image-one").decode()})
        self.assertEqual(calls[1][1]["document"]["type"], "document_url")
        self.assertEqual(calls[0][0].get_header("Api-key"), ENV["AZURE_OPENAI_API_KEY"])
        self.assertIsNone(calls[0][0].get_header("Authorization"))

    def test_auth_route_limits_and_failures_are_safe_and_distinct(self):
        expected = {400: ErrorKind.CAPABILITY, 401: ErrorKind.CREDENTIALS, 403: ErrorKind.CREDENTIALS,
                    404: ErrorKind.CONFIG, 429: ErrorKind.RATE_LIMIT, 504: ErrorKind.TIMEOUT, 503: ErrorKind.PROVIDER_ERROR}
        for status, kind in expected.items():
            error = urllib.error.HTTPError("https://example.test", status, "private-value", {}, io.BytesIO(b"private-value clinical body"))
            with mock.patch("clinicos_ai.models.providers.mistral._open_ocr", side_effect=error), self.assertRaises(RuntimeError_) as caught:
                runner()._post("https://example.test/ocr", "private-value", {})
            self.assertEqual(caught.exception.kind, kind)
            self.assertNotIn("private-value", str(caught.exception))
            self.assertNotIn("clinical body", str(caught.exception))

    def test_raw_text_schema_does_not_request_annotation(self):
        bodies = []
        def fake(url, key, body):
            bodies.append(body)
            return {"pages": [{"markdown": "TESTO SINTETICO"}]}
        schema = {"type": "object", "properties": {"rawText": {"type": "string"}}}
        with mock.patch.dict("os.environ", ENV, clear=True), mock.patch.object(_MistralOcrRunner, "_post", side_effect=fake):
            result = asyncio.run(runner().run_structured("read", schema, [Attachment("a.png", "image/png", b"test")]))
        self.assertEqual(json.loads(result), {"rawText": "TESTO SINTETICO"})
        self.assertNotIn("document_annotation_format", bodies[0])

    def test_no_documents_or_empty_output_cannot_succeed(self):
        with self.assertRaises(RuntimeError_): asyncio.run(runner().run("text only", []))
        for payload in ({"pages": []}, {"pages": [{"markdown": ""}]}, {"pages": "bad"}, {"pages": [{"markdown": 42}]}, []):
            with mock.patch.dict("os.environ", ENV, clear=True), mock.patch.object(_MistralOcrRunner, "_post", return_value=payload), self.assertRaises(RuntimeError_):
                asyncio.run(runner().run("read", [Attachment("a.png", "image/png", b"test")]))

    def test_missing_structured_annotation_cannot_be_an_empty_success(self):
        schema = {"type": "object", "properties": {"patient": {"type": "object"}}}
        with mock.patch.dict("os.environ", ENV, clear=True), mock.patch.object(_MistralOcrRunner, "_post", return_value={"pages": [{"markdown": "TEXT"}]}), self.assertRaises(RuntimeError_):
            asyncio.run(runner().run_structured("read", schema, [Attachment("a.png", "image/png", b"test")]))

    def test_one_empty_document_cannot_be_hidden_by_another_readable_document(self):
        readable = {"pages": [{"markdown": "TESTO SINTETICO " * 30}]}
        empty = {"pages": []}
        attachments = [Attachment("a.png", "image/png", b"a"), Attachment("b.pdf", "application/pdf", b"b")]
        for responses in ([readable, empty], [empty, readable]):
            with mock.patch.dict("os.environ", ENV, clear=True), mock.patch.object(_MistralOcrRunner, "_post", side_effect=responses), self.assertRaises(RuntimeError_) as caught:
                asyncio.run(runner().run("read", attachments))
            self.assertEqual(caught.exception.kind, ErrorKind.SCHEMA_VALIDATION)
            self.assertIn("AI_EMPTY", str(caught.exception))
        # A readable PDF may contain an internal blank page.
        with mock.patch.dict("os.environ", ENV, clear=True), mock.patch.object(_MistralOcrRunner, "_post", return_value={"pages": [{"markdown": ""}, {"markdown": "TESTO"}]}):
            self.assertEqual(json.loads(asyncio.run(runner().run("read", attachments[:1]))), {"rawText": "TESTO"})

    def test_every_document_must_supply_requested_structured_annotation(self):
        schema = {"type": "object", "properties": {"patient": {"type": "object"}}}
        responses = [{"pages": [{"markdown": "TESTO A"}], "document_annotation": {"patient": {}}}, {"pages": [{"markdown": "TESTO B"}]}]
        attachments = [Attachment("a.png", "image/png", b"a"), Attachment("b.png", "image/png", b"b")]
        with mock.patch.dict("os.environ", ENV, clear=True), mock.patch.object(_MistralOcrRunner, "_post", side_effect=responses), self.assertRaises(RuntimeError_) as caught:
            asyncio.run(runner().run_structured("read", schema, attachments))
        self.assertIn("AI_EMPTY", str(caught.exception))

    def test_invalid_utf8_response_has_a_safe_provider_error(self):
        with mock.patch("clinicos_ai.models.providers.mistral._open_ocr", return_value=Response(b"private-value\xff")), self.assertRaises(RuntimeError_) as caught:
            runner()._post("https://example.test/ocr", "private-value", {})
        self.assertEqual(caught.exception.kind, ErrorKind.PROVIDER_ERROR)
        self.assertIn("AI_PROVIDER", str(caught.exception))
        self.assertNotIn("private-value", str(caught.exception))


if __name__ == '__main__': unittest.main()
