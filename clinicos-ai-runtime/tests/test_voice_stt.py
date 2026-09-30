"""Phase 5: STT adapter. Deterministic (no network): the provider HTTP boundary is replaced only in
the unit tests that check the request shape; provider-dependent runs live in
scripts/voice/stt-provider-check.mjs (real audio fixtures, real provider)."""
import asyncio
import base64
import json
import os
import unittest
from unittest import mock

for _r in ("OCR", "EXTRACTION", "AGENT", "REPAIR"):
    os.environ.setdefault(f"AI_{_r}_MODEL", "mock:mock")

from clinicos_ai.voice import stt


class SttAdapterTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self._env = mock.patch.dict(os.environ, {"AI_STT_MODEL": "mock:mock"})
        self._env.start()

    async def asyncTearDown(self):
        self._env.stop()

    async def test_not_configured(self):
        with mock.patch.dict(os.environ, {"AI_STT_MODEL": ""}):
            with self.assertRaises(stt.SttError) as ctx:
                await stt.transcribe(b"RIFF", "audio/wav")
            self.assertEqual(ctx.exception.kind, "not_configured")
            self.assertEqual(stt.stt_status()["available"], False)

    async def test_invalid_audio(self):
        with self.assertRaises(stt.SttError) as ctx:
            await stt.transcribe(b"RIFF", "text/plain")
        self.assertEqual(ctx.exception.status, 400)
        with self.assertRaises(stt.SttError):
            await stt.transcribe(b"", "audio/wav")

    async def test_mock_returns_empty_transcript_never_invents(self):
        result = await stt.transcribe(b"RIFF....", "audio/wav", "it-IT")
        self.assertTrue(result.empty)
        self.assertEqual(result.text, "")
        self.assertEqual(result.to_dict()["metadata"]["provider"], "mock")

    async def test_google_request_shape_and_no_speech_marker(self):
        captured = {}

        def fake_http(url, body, headers, timeout):
            captured["url"], captured["body"], captured["headers"] = url, json.loads(body), headers
            return {"candidates": [{"content": {"parts": [{"text": " Registra pressione 120 su 80. "}]}}],
                    "usageMetadata": {"promptTokenCount": 70, "candidatesTokenCount": 12, "totalTokenCount": 82}}

        with mock.patch.dict(os.environ, {"AI_STT_MODEL": "google:gemini-3.5-flash-lite", "GOOGLE_API_KEY": "k"}), \
                mock.patch.object(stt, "_http_json", side_effect=fake_http):
            result = await stt.transcribe(b"RIFFdata", "audio/wav", "it-IT")
        self.assertEqual(result.text, "Registra pressione 120 su 80.")
        self.assertEqual(result.to_dict()["metadata"]["usage"], {"inputTokens": 70, "outputTokens": 12, "totalTokens": 82})
        self.assertIn("gemini-3.5-flash-lite:generateContent", captured["url"])
        self.assertNotIn("key=", captured["url"], "API key travels in a header, never in the URL")
        parts = captured["body"]["contents"][0]["parts"]
        self.assertEqual(len(parts), 1, "the user turn carries ONLY the audio")
        self.assertEqual(base64.b64decode(parts[0]["inline_data"]["data"]), b"RIFFdata")
        self.assertIn("Non correggere", captured["body"]["system_instruction"]["parts"][0]["text"])

        with mock.patch.dict(os.environ, {"AI_STT_MODEL": "google:m", "GOOGLE_API_KEY": "k"}), \
                mock.patch.object(stt, "_http_json", return_value={"candidates": [{"content": {"parts": [{"text": stt.NO_SPEECH_MARKER}]}}]}):
            silent = await stt.transcribe(b"RIFF", "audio/wav")
        self.assertTrue(silent.empty)
        self.assertEqual(silent.text, "")

    async def test_provider_errors_are_typed(self):
        with mock.patch.dict(os.environ, {"AI_STT_MODEL": "google:m", "GOOGLE_API_KEY": "k"}), \
                mock.patch.object(stt, "_http_json", side_effect=stt.SttError("timeout", "t", 504)):
            with self.assertRaises(stt.SttError) as ctx:
                await stt.transcribe(b"RIFF", "audio/wav")
        self.assertEqual(ctx.exception.status, 504)


class SttEndpointTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self._env = mock.patch.dict(os.environ, {"AI_RUNTIME_SERVICE_TOKEN": "test-token"})
        self._env.start()

    async def asyncTearDown(self):
        self._env.stop()

    async def test_endpoint_auth_and_limits(self):
        from fastapi import HTTPException
        from clinicos_ai.api.app import voice_transcribe

        class FakeRequest:
            def __init__(self, payload, headers=None):
                self._payload = payload
                self.headers = headers or {}

            async def json(self):
                return self._payload

        from clinicos_ai.api.app import voice_stt_status
        with self.assertRaises(HTTPException) as denied:
            await voice_transcribe(FakeRequest({}), authorization="Bearer wrong")
        self.assertEqual(denied.exception.status_code, 401)
        with self.assertRaises(HTTPException) as status_denied:
            voice_stt_status(authorization=None)
        self.assertEqual(status_denied.exception.status_code, 401)
        with mock.patch.dict(os.environ, {"AI_STT_MODEL": "google:m"}):
            self.assertEqual(voice_stt_status(authorization="Bearer test-token")["available"], True)
        with self.assertRaises(HTTPException) as bad:
            await voice_transcribe(FakeRequest({"audio_base64": ""}), authorization="Bearer test-token")
        self.assertEqual(bad.exception.status_code, 400)
        with mock.patch.dict(os.environ, {"AI_STT_MODEL": "mock:mock"}):
            ok = await voice_transcribe(
                FakeRequest({"audio_base64": base64.b64encode(b"RIFFxx").decode(), "mime_type": "audio/wav"}),
                authorization="Bearer test-token",
            )
        self.assertEqual(ok["empty"], True)
        with self.assertRaises(HTTPException) as too_big:
            await voice_transcribe(FakeRequest({}, {"content-length": str(10_000_000)}),
                                   authorization="Bearer test-token")
        self.assertEqual(too_big.exception.status_code, 413, "size checked before parsing")

    async def test_provider_non_json_is_a_typed_error(self):
        class Resp:
            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def read(self):
                return b"<html>oops</html>"

        with mock.patch.object(stt.urllib.request, "urlopen", return_value=Resp()):
            with self.assertRaises(stt.SttError) as ctx:
                stt._http_json("https://x", b"{}", {}, 1)
        self.assertEqual(ctx.exception.kind, "provider_error")


if __name__ == "__main__":
    unittest.main()
