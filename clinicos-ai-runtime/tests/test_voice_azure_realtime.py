"""Phase 5 (Azure): gpt-live-transcribe adapter. Deterministic — no Azure access:
* config / session shape / provider selection (no silent fallback)
* client-secret mint and health against a patched HTTP boundary
* the server WebSocket transport against a REAL local websockets server speaking the Realtime
  transcription protocol (session.update → append → commit → delta… → completed)
Azure-dependent checks live in scripts/voice/azure-stt-check.mjs (run only when the deployment exists).
"""
import asyncio
import base64
import io
import json
import os
import struct
import unittest
import urllib.error
from unittest import mock

for _r in ("OCR", "EXTRACTION", "AGENT", "REPAIR"):
    os.environ.setdefault(f"AI_{_r}_MODEL", "mock:mock")

from clinicos_ai.voice import azure_realtime as az
from clinicos_ai.voice import stt

AZ_ENV = {"AZURE_OPENAI_ENDPOINT": "https://res.services.ai.azure.com/", "AZURE_OPENAI_API_KEY": "k-secret"}
CLEAN = {k: "" for k in ("AI_STT_PROVIDER", "AI_STT_MODEL", "AI_STT_DEPLOYMENT", "AI_STT_KEYWORDS",
                         "AI_STT_DELAY", "AI_STT_PROMPT", "AZURE_OPENAI_REALTIME_ENDPOINT")}


def wav(rate=16000, ms=500):
    n = rate * ms // 1000
    data = struct.pack(f"<{n}h", *([1000, -1000] * (n // 2) + [0] * (n % 2)))
    return (b"RIFF" + struct.pack("<I", 36 + len(data)) + b"WAVE" + b"fmt " +
            struct.pack("<IHHIIHH", 16, 1, 1, rate, rate * 2, 2, 16) + b"data" + struct.pack("<I", len(data)) + data)


class ConfigTests(unittest.TestCase):
    def test_defaults_and_overrides(self):
        self.assertIsNone(az.realtime_config({}))
        cfg = az.realtime_config(AZ_ENV)
        self.assertEqual(cfg.deployment, "gpt-live-transcribe")
        self.assertEqual(cfg.model, "gpt-live-transcribe")
        self.assertEqual(cfg.endpoint, "https://res.services.ai.azure.com")
        self.assertEqual(cfg.calls_url, "https://res.services.ai.azure.com/openai/v1/realtime/calls")
        self.assertEqual(cfg.websocket_url,
                         "wss://res.services.ai.azure.com/openai/v1/realtime?model=gpt-live-transcribe")
        other = az.realtime_config({**AZ_ENV, "AI_STT_DEPLOYMENT": "glt-prod", "AI_STT_DELAY": "low",
                                    "AI_STT_KEYWORDS": "Furosemide\nSpO2;<NEWS2>\n\n" + "x" * 80,
                                    "AZURE_OPENAI_REALTIME_ENDPOINT": "https://res.openai.azure.com"})
        self.assertEqual(other.deployment, "glt-prod", "deployment name configurable, model id unchanged")
        self.assertEqual(other.model, "gpt-live-transcribe")
        self.assertEqual(other.keywords, ("Furosemide", "SpO2", "NEWS2"))
        self.assertEqual(other.delay, "low")
        self.assertEqual(other.endpoint, "https://res.openai.azure.com")
        self.assertIsNone(az.realtime_config({**AZ_ENV, "AI_STT_DELAY": "instant"}).delay)
        self.assertEqual(az.realtime_config({**AZ_ENV, "AI_STT_MODEL": "google:gemini"}).model,
                         "gpt-live-transcribe")

    def test_transcription_session_shape(self):
        session = az.session_config(az.realtime_config({**AZ_ENV, "AI_STT_KEYWORDS": "Ramipril"}))
        self.assertEqual(session["type"], "transcription")
        audio_in = session["audio"]["input"]
        self.assertIsNone(audio_in["turn_detection"], "gpt-live-transcribe: no server VAD, client commits")
        self.assertEqual(audio_in["format"], {"type": "audio/pcm", "rate": 24000})
        tr = audio_in["transcription"]
        self.assertEqual(tr["model"], "gpt-live-transcribe")
        self.assertEqual(tr["languages"], ["it"])
        self.assertNotIn("language", tr, "gpt-live-transcribe uses languages, never both")
        self.assertEqual(tr["keywords"], ["Ramipril"])
        self.assertIn("RSA", tr["prompt"])
        self.assertNotIn("keywords", az.session_config(az.realtime_config(AZ_ENV))["audio"]["input"]["transcription"])

    def test_provider_selection_no_silent_fallback(self):
        with mock.patch.dict(os.environ, {**CLEAN, **AZ_ENV}):
            self.assertEqual(stt.stt_model(), ("azure_openai", "gpt-live-transcribe"))
            status = stt.stt_status()
            self.assertEqual(status["deployment"], "gpt-live-transcribe")
            self.assertEqual(status["transports"], ["webrtc", "server"])
        with mock.patch.dict(os.environ, {**CLEAN, "AZURE_OPENAI_ENDPOINT": "", "AZURE_OPENAI_API_KEY": "",
                                          "GOOGLE_API_KEY": "g"}):
            self.assertIsNone(stt.stt_model(), "no Azure → not available, never Gemini by default")
        with mock.patch.dict(os.environ, {**CLEAN, **AZ_ENV, "AI_STT_MODEL": "google:gemini-x"}):
            self.assertEqual(stt.stt_model(), ("google", "gemini-x"), "legacy form = explicit opt-in")
        with mock.patch.dict(os.environ, {**CLEAN, **AZ_ENV, "AI_STT_PROVIDER": "google"}):
            self.assertIsNone(stt.stt_model(), "explicit provider needs its model")
        with mock.patch.dict(os.environ, {**CLEAN, **AZ_ENV, "AI_STT_PROVIDER": "whatever"}):
            self.assertIsNone(stt.stt_model())


class FakeResponse(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


class HttpTests(unittest.TestCase):
    def test_mint_client_secret(self):
        seen = {}

        def urlopen(req, timeout):
            seen["url"], seen["headers"], seen["body"] = req.full_url, dict(req.headers), json.loads(req.data)
            return FakeResponse(json.dumps({"value": "ek_123", "expires_at": 1999999999, "session": {}}).encode())

        cfg = az.realtime_config(AZ_ENV)
        with mock.patch.object(az.urllib.request, "urlopen", urlopen):
            grant = az.mint_client_secret(cfg)
        self.assertTrue(seen["url"].endswith("/openai/v1/realtime/client_secrets"))
        self.assertEqual(seen["headers"]["Api-key"], "k-secret")
        self.assertEqual(seen["body"]["session"]["audio"]["input"]["transcription"]["model"], "gpt-live-transcribe")
        self.assertEqual(grant, {"token": "ek_123", "expiresAt": 1999999999, "callsUrl": cfg.calls_url,
                                 "deployment": "gpt-live-transcribe", "model": "gpt-live-transcribe",
                                 "transport": "webrtc"})
        with mock.patch.object(az.urllib.request, "urlopen", return_value=FakeResponse(b'{"session":{}}')):
            with self.assertRaises(stt.SttError):
                az.mint_client_secret(cfg)

    def test_http_errors_are_diagnostic(self):
        def http_error(code, body):
            def raise_(req, timeout):
                raise urllib.error.HTTPError(req.full_url, code, "x", {}, io.BytesIO(json.dumps(body).encode()))
            return raise_

        cfg = az.realtime_config(AZ_ENV)
        cases = [(404, {"error": {"code": "DeploymentNotFound", "message": "nope"}}, "not_configured"),
                 (401, {}, "auth_failed"), (429, {}, "rate_limited"), (500, {}, "provider_error")]
        for code, body, kind in cases:
            with mock.patch.object(az.urllib.request, "urlopen", http_error(code, body)):
                with self.assertRaises(stt.SttError) as ctx:
                    az.mint_client_secret(cfg)
            self.assertEqual(ctx.exception.kind, kind, code)
            self.assertNotIn("k-secret", str(ctx.exception))
        with mock.patch.object(az.urllib.request, "urlopen", http_error(404, cases[0][1])):
            with self.assertRaises(stt.SttError) as ctx:
                az.mint_client_secret(cfg)
        self.assertIn("DeploymentNotFound", str(ctx.exception))

    def test_health(self):
        self.assertEqual(az.health(None)["code"], "not_configured")
        cfg = az.realtime_config(AZ_ENV)
        listing = {"data": [{"id": "gpt-6.1-sol", "model": "gpt-6.1-sol"}]}
        def urlopen(req, timeout):
            if "deployments?api-version" in req.full_url:
                return FakeResponse(json.dumps(listing).encode())
            raise urllib.error.HTTPError(req.full_url, 404, "x", {},
                                         io.BytesIO(b'{"error":{"code":"DeploymentNotFound"}}'))

        with mock.patch.object(az.urllib.request, "urlopen", urlopen):
            missing = az.health(cfg)
        self.assertEqual((missing["ok"], missing["code"]), (False, "deployment_missing"))
        self.assertIn("gpt-live-transcribe", missing["message"])
        self.assertNotIn("res.", json.dumps(missing), "resource name not echoed")
        listing["data"].append({"id": "gpt-live-transcribe", "model": "gpt-live-transcribe"})
        with mock.patch.object(az.urllib.request, "urlopen", return_value=FakeResponse(json.dumps(listing).encode())):
            self.assertTrue(az.health(cfg)["ok"])

    def test_wav_to_pcm24k(self):
        pcm = az.wav_to_pcm24k(wav(16000, 500))
        self.assertEqual(len(pcm), 24000 * 2 // 2)
        self.assertEqual(len(az.wav_to_pcm24k(wav(24000, 100))), 24000 * 2 // 10)
        with self.assertRaises(stt.SttError):
            az.wav_to_pcm24k(b"RIFF" + b"\0" * 60)


class WebSocketTransportTests(unittest.IsolatedAsyncioTestCase):
    async def test_real_websocket_protocol(self):
        from websockets.asyncio.server import serve

        received = {"messages": [], "path": None, "key": None}
        script = {"events": [
            {"type": "conversation.item.input_audio_transcription.delta", "item_id": "i1", "delta": "Registra "},
            {"type": "conversation.item.input_audio_transcription.delta", "item_id": "i1", "delta": "pressione"},
            {"type": "conversation.item.input_audio_transcription.completed", "item_id": "i1",
             "transcript": " Registra pressione 120 su 80 per questo ospite. "},
        ]}

        async def handler(ws):
            received["path"] = ws.request.path
            received["key"] = ws.request.headers.get("api-key")
            async for message in ws:
                event = json.loads(message)
                received["messages"].append(event)
                if event["type"] == "input_audio_buffer.commit":
                    for e in script["events"]:
                        await ws.send(json.dumps(e))

        async with serve(handler, "127.0.0.1", 0) as server:
            port = server.sockets[0].getsockname()[1]
            cfg = az.realtime_config({"AZURE_OPENAI_ENDPOINT": f"http://127.0.0.1:{port}",
                                      "AZURE_OPENAI_API_KEY": "k-secret"})
            pcm = az.wav_to_pcm24k(wav(16000, 1000))
            live = await az.transcribe_ws(cfg, pcm, timeout=5)
        self.assertEqual(live.text, "Registra pressione 120 su 80 per questo ospite.")
        self.assertEqual(live.partials, 2, "deltas are counted, never returned as the transcript")
        self.assertIsNotNone(live.first_partial_ms)
        self.assertEqual(received["path"], "/openai/v1/realtime?model=gpt-live-transcribe")
        self.assertEqual(received["key"], "k-secret")
        kinds = [m["type"] for m in received["messages"]]
        self.assertEqual(kinds[0], "session.update")
        self.assertEqual(received["messages"][0]["session"]["type"], "transcription")
        self.assertEqual(kinds[-1], "input_audio_buffer.commit")
        chunks = [base64.b64decode(m["audio"]) for m in received["messages"] if m["type"] == "input_audio_buffer.append"]
        self.assertEqual(sum(map(len, chunks)), len(pcm))
        self.assertTrue(all(len(c) <= az.CHUNK_BYTES for c in chunks))

    async def test_failures_and_empty(self):
        class FakeWs:
            def __init__(self, events):
                self.events, self.sent = events, []

            async def __aenter__(self):
                return self

            async def __aexit__(self, *a):
                return False

            async def send(self, m):
                self.sent.append(m)

            def __aiter__(self):
                async def gen():
                    for e in self.events:
                        yield json.dumps(e)
                return gen()

        cfg = az.realtime_config(AZ_ENV)
        empty = await az.transcribe_ws(cfg, b"\0\0" * 10, connect=lambda u, h: FakeWs(
            [{"type": "error", "error": {"code": "input_audio_buffer_commit_empty"}}]))
        self.assertEqual(empty.text, "")
        with self.assertRaises(stt.SttError) as failed:
            await az.transcribe_ws(cfg, b"\0\0", connect=lambda u, h: FakeWs(
                [{"type": "conversation.item.input_audio_transcription.failed", "item_id": "i"}]))
        self.assertEqual(failed.exception.kind, "provider_error")
        with self.assertRaises(stt.SttError):
            await az.transcribe_ws(cfg, b"\0\0", connect=lambda u, h: FakeWs([]))

        class Slow(FakeWs):
            def __aiter__(self):
                async def gen():
                    await asyncio.sleep(5)
                    yield "{}"
                return gen()

        with self.assertRaises(stt.SttError) as slow:
            await az.transcribe_ws(cfg, b"\0\0", timeout=0.2, connect=lambda u, h: Slow([]))
        self.assertEqual(slow.exception.kind, "timeout")


class EndpointTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self._env = mock.patch.dict(os.environ, {**CLEAN, **AZ_ENV, "AI_RUNTIME_SERVICE_TOKEN": "svc"})
        self._env.start()

    async def asyncTearDown(self):
        self._env.stop()

    async def test_realtime_call_and_health(self):
        from fastapi import HTTPException
        from clinicos_ai.api import app as runtime

        class Req:
            def __init__(self, payload, headers=None):
                self._p, self.headers = payload, headers or {}

            async def json(self):
                return self._p

        with self.assertRaises(HTTPException) as denied:
            await runtime.voice_realtime_call(Req({"sdp": "v=0"}), authorization=None)
        self.assertEqual(denied.exception.status_code, 401)
        with self.assertRaises(HTTPException) as bad:
            await runtime.voice_realtime_call(Req({"sdp": "hello"}), authorization="Bearer svc")
        self.assertEqual(bad.exception.status_code, 400)
        with self.assertRaises(HTTPException) as big:
            await runtime.voice_realtime_call(Req({}, {"content-length": "999999"}), authorization="Bearer svc")
        self.assertEqual(big.exception.status_code, 413)
        answer = {"sdp": "v=0 answer", "deployment": "gpt-live-transcribe", "model": "gpt-live-transcribe",
                  "expiresAt": 1, "transport": "webrtc"}
        with mock.patch.object(runtime, "negotiate_call", return_value=answer) as neg, \
                self.assertLogs("clinicos_ai.runtime", level="INFO"):
            out = await runtime.voice_realtime_call(Req({"sdp": "v=0 offer"}), authorization="Bearer svc")
        self.assertEqual(out["sdp"], "v=0 answer")
        self.assertNotIn("token", out, "the ephemeral token never leaves the runtime")
        self.assertEqual(neg.call_args.args[1], "v=0 offer")
        with mock.patch.object(runtime, "negotiate_call",
                               side_effect=stt.SttError("not_configured", "deployment mancante", 503)):
            with self.assertRaises(HTTPException) as missing:
                await runtime.voice_realtime_call(Req({"sdp": "v=0 offer"}), authorization="Bearer svc")
        self.assertEqual(missing.exception.status_code, 503)
        with mock.patch.dict(os.environ, {"AI_STT_PROVIDER": "mock"}):
            mocked = await runtime.voice_realtime_call(Req({"sdp": "v=0 offer"}), authorization="Bearer svc")
        self.assertTrue(mocked["mock"])
        with mock.patch.dict(os.environ, {"AI_STT_PROVIDER": "google"}):
            invalid = await runtime.voice_health(authorization="Bearer svc")
        self.assertEqual(invalid["code"], "invalid_config")
        with mock.patch.object(runtime, "azure_health", return_value={"ok": False, "code": "deployment_missing"}):
            health = await runtime.voice_health(authorization="Bearer svc")
        self.assertEqual(health["code"], "deployment_missing")


class NegotiationTests(unittest.TestCase):
    def test_negotiate_call_uses_the_token_server_side(self):
        calls = []

        def urlopen(req, timeout):
            calls.append(req)
            if req.full_url.endswith("/client_secrets"):
                return FakeResponse(json.dumps({"value": "ek_server_only", "expires_at": 5}).encode())
            return FakeResponse(b"v=0\r\nanswer")

        cfg = az.realtime_config(AZ_ENV)
        with mock.patch.object(az.urllib.request, "urlopen", urlopen):
            out = az.negotiate_call(cfg, "v=0\r\noffer")
        self.assertEqual(out["sdp"], "v=0\r\nanswer")
        self.assertNotIn("ek_server_only", json.dumps(out))
        sdp_req = calls[1]
        self.assertTrue(sdp_req.full_url.endswith("/openai/v1/realtime/calls"))
        self.assertEqual(sdp_req.headers["Authorization"], "Bearer ek_server_only")
        self.assertEqual(sdp_req.headers["Content-type"], "application/sdp")
        self.assertEqual(sdp_req.data, b"v=0\r\noffer")
        with mock.patch.object(az.urllib.request, "urlopen", lambda req, timeout: (
                FakeResponse(json.dumps({"value": "ek"}).encode()) if req.full_url.endswith("client_secrets")
                else FakeResponse(b"<html>"))):
            with self.assertRaises(stt.SttError):
                az.negotiate_call(cfg, "v=0")

    def test_health_confirms_on_the_data_plane(self):
        cfg = az.realtime_config(AZ_ENV)
        listing = FakeResponse(json.dumps({"data": []}).encode())

        def probe(code, body):
            def urlopen(req, timeout):
                if "deployments?api-version" in req.full_url:
                    return FakeResponse(json.dumps({"data": []}).encode())
                raise urllib.error.HTTPError(req.full_url, code, "x", {}, io.BytesIO(body))
            return urlopen

        with mock.patch.object(az.urllib.request, "urlopen", probe(404, b'{"error":{"code":"DeploymentNotFound"}}')):
            self.assertEqual(az.health(cfg)["code"], "deployment_missing")
        with mock.patch.object(az.urllib.request, "urlopen", probe(400, b'{"error":{"code":"OperationNotSupported"}}')):
            self.assertTrue(az.health(cfg)["ok"], "listing may omit new deployments; probe says it exists")
        with mock.patch.object(az.urllib.request, "urlopen", probe(404, b'{"error":{"code":"404","message":"Resource not found"}}')):
            self.assertFalse(az.health(cfg)["ok"], "an inconclusive probe never claims the deployment exists")
        with mock.patch.object(az.urllib.request, "urlopen", probe(400, b'{"error":{"code":"InvalidApiVersion"}}')):
            self.assertFalse(az.health(cfg)["ok"])
        del listing

    def test_malformed_wav_is_invalid_audio(self):
        broken = b"RIFF" + struct.pack("<I", 30) + b"WAVEfmt " + struct.pack("<I", 16) + b"\x01\x00" + b"\0" * 40
        with self.assertRaises(stt.SttError) as ctx:
            az.wav_to_pcm24k(broken)
        self.assertEqual(ctx.exception.kind, "invalid_audio")


if __name__ == "__main__":
    unittest.main()
