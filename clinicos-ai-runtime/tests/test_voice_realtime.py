"""Reconciled optional realtime contract. Synthetic HTTP boundaries, never a provider call."""
from __future__ import annotations

import io
import json
import os
import unittest
import urllib.error
from unittest import mock

from clinicos_ai.voice import azure_realtime as azure, realtime, stt

ENV = {"AI_ENABLED": "true", "STT_PROVIDER": "azure", "STT_MODEL": "file-transcribe",
       "STT_REALTIME_ENABLED": "true", "STT_REALTIME_MODEL": "live-configured",
       "AZURE_OPENAI_ENDPOINT": "https://synthetic.openai.azure.com", "AZURE_OPENAI_API_KEY": "synthetic-secret"}


class ConfigurationTests(unittest.TestCase):
    def test_default_off_and_current_batch_contract_survive(self):
        self.assertFalse(realtime.realtime_status({})["available"])
        self.assertEqual(stt.stt_model(ENV), ("azure", "file-transcribe"))
        self.assertEqual(stt.stt_model({"AI_STT_MODEL": "google:explicit"}), ("google", "explicit"))
        self.assertTrue(realtime.realtime_status(ENV)["available"])
        self.assertEqual(stt.stt_realtime(ENV), {"enabled": True, "model": "live-configured"})
        for extra in ({"AI_ENABLED": "false"}, {"STT_REALTIME_ENABLED": "false"},
                      {"STT_REALTIME_MODEL": ""}, {"STT_PROVIDER": "openai"}, {"AZURE_OPENAI_API_KEY": ""}):
            self.assertFalse(realtime.realtime_status({**ENV, **extra})["available"], extra)

    def test_azure_configuration_has_no_implicit_model_or_secret_representation(self):
        self.assertIsNone(azure.realtime_config({}))
        self.assertIsNone(azure.realtime_config({**ENV, "STT_REALTIME_MODEL": ""}))
        config = azure.realtime_config(ENV)
        self.assertEqual(config.model, "live-configured")
        self.assertNotIn("synthetic-secret", repr(config))
        self.assertEqual(azure.session_config(config)["audio"]["input"]["transcription"]["model"], "live-configured")
        self.assertIsNone(azure.session_config(config)["audio"]["input"]["turn_detection"])
        for endpoint in ("http://localhost", "https://user:pass@example.com", "https://example.com/path", "https://example.com?key=x", "https://example.com:bad"):
            with self.subTest(endpoint=endpoint), self.assertRaises(stt.SttError):
                azure.realtime_config({**ENV, "AZURE_OPENAI_ENDPOINT": endpoint})

    def test_sdp_byte_bound_unicode_and_nul(self):
        self.assertEqual(realtime.validate_sdp("v=0\r\nsynthetic"), "v=0\r\nsynthetic")
        for value in (None, {}, "offer", "v=0\0bad", "v=0" + "é" * 32000):
            with self.subTest(value=type(value).__name__), self.assertRaises(stt.SttError):
                realtime.validate_sdp(value)

    def test_validator_allows_only_implemented_realtime_adapter(self):
        from clinicos_ai.models.validation import validate_ai_config
        base = {**ENV, **{f"AI_{role}_MODEL": "mock:mock" for role in ("OCR", "EXTRACTION", "AGENT", "REPAIR")}}
        errors, _ = validate_ai_config(base)
        self.assertFalse(any("realtime" in x for x in errors), errors)
        errors, _ = validate_ai_config({**base, "STT_PROVIDER": "openai"})
        self.assertTrue(any("realtime non è implementata" in x for x in errors), errors)
        errors, _ = validate_ai_config({**base, "STT_REALTIME_MODEL": ""})
        self.assertTrue(any("STT_REALTIME_MODEL" in x for x in errors), errors)


class AzureNegotiationTests(unittest.TestCase):
    def test_ephemeral_token_is_used_only_server_side(self):
        calls = []
        def http(req, timeout):
            calls.append(req)
            return b'{"value":"synthetic-ephemeral","expires_at":123}' if len(calls) == 1 else b"v=0\r\nanswer"
        with mock.patch.object(azure, "_http", http):
            result = azure.negotiate_call(azure.realtime_config(ENV), "v=0\r\noffer")
        self.assertEqual(result["sdp"], "v=0\r\nanswer")
        self.assertEqual(calls[0].headers["Api-key"], "synthetic-secret")
        self.assertEqual(calls[1].headers["Authorization"], "Bearer synthetic-ephemeral")
        self.assertEqual(json.loads(calls[0].data)["session"]["audio"]["input"]["transcription"]["model"], "live-configured")
        self.assertNotIn("synthetic-ephemeral", json.dumps(result))
        self.assertNotIn("synthetic-secret", json.dumps(result))
        self.assertEqual(set(result), {"sdp", "model", "deployment", "expiresAt", "transport"})

    def test_invalid_response_never_releases_provider_details(self):
        for raw in (b"[]", b"not json", b'{"value":"bad\\r\\nheader"}', b'{"value":123}'):
            with self.subTest(raw=raw), mock.patch.object(azure, "_http", return_value=raw), self.assertRaises(stt.SttError):
                azure.negotiate_call(azure.realtime_config(ENV), "v=0\r\noffer")
        with mock.patch.object(azure, "_http", side_effect=[b'{"value":"synthetic"}', b"<html>secret</html>"]), self.assertRaises(stt.SttError) as error:
            azure.negotiate_call(azure.realtime_config(ENV), "v=0\r\noffer")
        self.assertNotIn("secret", str(error.exception))

    def test_credential_redirects_are_rejected(self):
        handler = azure._NoRedirect()
        self.assertIsNone(handler.redirect_request(None, None, 302, "redirect", {}, "https://attacker.invalid"))
        for status, kind in ((302, "provider_error"), (401, "auth_failed"), (403, "auth_failed"), (429, "rate_limited"), (500, "provider_error")):
            error = urllib.error.HTTPError("https://synthetic.invalid", status, "secret", {}, io.BytesIO(b"secret clinical payload"))
            opener = mock.Mock()
            opener.open.side_effect = error
            with self.subTest(status=status), mock.patch.object(azure.urllib.request, "build_opener", return_value=opener), self.assertRaises(stt.SttError) as caught:
                azure._http(mock.Mock(), 1)
            self.assertEqual(caught.exception.kind, kind)
            self.assertNotIn("secret", str(caught.exception))

    def test_provider_response_has_actual_byte_limit(self):
        opener = mock.Mock()
        response = mock.Mock()
        response.__enter__ = mock.Mock(return_value=response)
        response.__exit__ = mock.Mock(return_value=False)
        response.read.return_value = b"x" * (azure.MAX_RESPONSE_BYTES + 1)
        opener.open.return_value = response
        with mock.patch.object(azure.urllib.request, "build_opener", return_value=opener), self.assertRaises(stt.SttError):
            azure._http(mock.Mock(), 1)
        response.read.assert_called_once_with(azure.MAX_RESPONSE_BYTES + 1)


class DispatcherTests(unittest.IsolatedAsyncioTestCase):
    async def test_disabled_or_unsupported_never_calls_adapter(self):
        for extra in ({"AI_ENABLED": "false"}, {"STT_REALTIME_ENABLED": "false"}, {"STT_PROVIDER": "openai"}):
            with mock.patch.dict(os.environ, {**ENV, **extra}, clear=True), mock.patch.object(azure, "negotiate_call") as call:
                with self.assertRaises(stt.SttError):
                    await realtime.negotiate("v=0\r\noffer")
                call.assert_not_called()

    async def test_registry_dispatch_is_separate_from_batch_model(self):
        with mock.patch.dict(os.environ, ENV, clear=True), mock.patch.object(azure, "negotiate_call", return_value={"sdp": "v=0\r\nanswer"}) as call:
            result = await realtime.negotiate("v=0\r\noffer")
        self.assertEqual(result["sdp"], "v=0\r\nanswer")
        self.assertEqual(call.call_args.args[0].model, "live-configured")
        self.assertEqual(stt.stt_model(ENV)[1], "file-transcribe")

    async def test_real_asgi_auth_actual_stream_limit_and_safe_response(self):
        import httpx
        from clinicos_ai.api import app as runtime
        testenv = {**ENV, "AI_RUNTIME_SERVICE_TOKEN": "synthetic-runtime-bearer"}
        with mock.patch.dict(os.environ, testenv, clear=True):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=runtime.app), base_url="http://qa") as client:
                headers = {"Authorization": "Bearer synthetic-runtime-bearer"}
                with mock.patch.object(realtime, "negotiate", return_value={"sdp": "v=0\r\nanswer", "transport": "webrtc"}) as call:
                    denied = await client.post("/v1/voice/realtime-call", json={"sdp": "v=0"})
                    self.assertEqual(denied.status_code, 401)
                    call.assert_not_called()
                    bad = await client.post("/v1/voice/realtime-call", headers=headers, json={"sdp": "invalid"})
                    self.assertEqual(bad.status_code, 400)
                    async def chunks():
                        yield b'{' + b'x' * 40000
                        yield b'x' * 40000
                    oversized = await client.post("/v1/voice/realtime-call", headers=headers, content=chunks())
                    self.assertEqual(oversized.status_code, 413)
                    call.assert_not_called()
                    ok = await client.post("/v1/voice/realtime-call", headers=headers, json={"sdp": "v=0\r\noffer"})
                    self.assertEqual(ok.status_code, 200)
                    self.assertEqual(ok.json()["sdp"], "v=0\r\nanswer")
                    call.assert_awaited_once_with("v=0\r\noffer")


if __name__ == "__main__":
    unittest.main()
