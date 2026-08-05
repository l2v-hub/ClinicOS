"""Normalizzazione errori per l'adapter Mistral Document AI (OCR).

Un corpo risposta 200 ma non-JSON/malformato dal provider prima risaliva come
json.JSONDecodeError grezzo (non un RuntimeError_ classificato): il fallback generico in
app.py lo marcava "failed" (terminale) invece di un errore retryable come gli altri
fallimenti provider, quindi un job OCR Mistral perdeva il retry automatico.
Nessuna rete: urlopen e' sostituito da un fake, stesso pattern di test_azure_structured.py."""
from __future__ import annotations

import io
import json
import unittest
import urllib.error
from unittest import mock

from clinicos_ai.models.errors import RuntimeError_, ErrorKind
from clinicos_ai.models.providers.mistral import _MistralOcrRunner
from clinicos_ai.models.spec import ModelSpec


class _Resp(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def _runner():
    return _MistralOcrRunner(ModelSpec.parse("mistral:mistral-ocr-latest"), timeout_seconds=5)


class TestPostErrorClassification(unittest.TestCase):
    def test_malformed_json_body_is_classified_provider_error_not_raw_exception(self):
        with mock.patch("urllib.request.urlopen", lambda req, timeout=None: _Resp(b"not json")):
            with self.assertRaises(RuntimeError_) as ctx:
                _runner()._post("https://example.test/ocr", "chiave-di-test", {"model": "x"})
        self.assertEqual(ctx.exception.kind, ErrorKind.PROVIDER_ERROR)

    def test_valid_json_body_is_parsed(self):
        payload = json.dumps({"pages": []}).encode()
        with mock.patch("urllib.request.urlopen", lambda req, timeout=None: _Resp(payload)):
            out = _runner()._post("https://example.test/ocr", "chiave-di-test", {"model": "x"})
        self.assertEqual(out, {"pages": []})

    def test_429_still_classified_rate_limit(self):
        def _raise(req, timeout=None):
            raise urllib.error.HTTPError(
                "https://example.test/ocr", 429, "Too Many Requests", {}, io.BytesIO(b"{}")
            )

        with mock.patch("urllib.request.urlopen", _raise):
            with self.assertRaises(RuntimeError_) as ctx:
                _runner()._post("https://example.test/ocr", "chiave-di-test", {"model": "x"})
        self.assertEqual(ctx.exception.kind, ErrorKind.RATE_LIMIT)


if __name__ == "__main__":
    unittest.main()
