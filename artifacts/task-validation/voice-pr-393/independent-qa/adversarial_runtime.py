"""Independent adversarial runtime probes; all calls stay ASGI/mock, never Azure."""
import asyncio
import json
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.abspath('clinicos-ai-runtime'))
from clinicos_ai.voice import realtime, azure_realtime as azure, stt

ENV = {'AI_ENABLED': 'true', 'STT_PROVIDER': 'azure', 'STT_MODEL': 'file-existing',
       'STT_REALTIME_ENABLED': 'true', 'STT_REALTIME_MODEL': 'qa-live',
       'AZURE_OPENAI_ENDPOINT': 'https://synthetic.invalid',
       'AZURE_OPENAI_API_KEY': 'qa-fixture-no-real-key',
       'AI_RUNTIME_SERVICE_TOKEN': 'qa-fixture-service'}

class IndependentBoundaries(unittest.IsolatedAsyncioTestCase):
    async def test_current_and_legacy_file_contract_immutable_under_realtime(self):
        self.assertEqual(stt.stt_model(ENV), ('azure', 'file-existing'))
        self.assertEqual(stt.stt_model({'AI_STT_MODEL': 'google:file-legacy'}), ('google', 'file-legacy'))
        for extra in ({'AI_ENABLED':'false'}, {'STT_REALTIME_ENABLED':'false'}, {'STT_PROVIDER':'google'},
                      {'STT_REALTIME_MODEL':''}, {'AZURE_OPENAI_API_KEY':''}):
            with self.subTest(extra=extra), mock.patch.dict(os.environ, {**ENV, **extra}, clear=True), mock.patch.object(azure, 'negotiate_call') as network:
                with self.assertRaises(stt.SttError):
                    await realtime.negotiate('v=0\r\nqa')
                network.assert_not_called()

    async def test_real_asgi_auth_precedes_even_large_or_malformed_body(self):
        import httpx
        from clinicos_ai.api.app import app
        with mock.patch.dict(os.environ, ENV, clear=True), mock.patch.object(realtime, 'negotiate') as provider:
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://qa') as c:
                for auth in ({}, {'Authorization':'Bearer wrong-fixture'}):
                    response = await c.post('/v1/voice/realtime-call', headers=auth, content=b'x'*90000)
                    self.assertEqual(response.status_code, 401)
                provider.assert_not_called()

    async def test_real_asgi_unicode_byte_boundary_and_nonobject_json(self):
        import httpx
        from clinicos_ai.api.app import app
        headers = {'Authorization':'Bearer qa-fixture-service'}
        with mock.patch.dict(os.environ, ENV, clear=True), mock.patch.object(realtime, 'negotiate', return_value={'sdp':'v=0\r\nqa-answer'}) as provider:
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://qa') as c:
                for payload in ([], None, {'sdp':'v=0\x00qa'}, {'sdp':'v=0'+'é'*32000}):
                    r = await c.post('/v1/voice/realtime-call', headers=headers,
                                     content=json.dumps(payload, ensure_ascii=False).encode())
                    self.assertEqual(r.status_code, 400, (type(payload).__name__, r.status_code))
                provider.assert_not_called()
                offer = 'v=0' + 'a'*63997
                self.assertEqual(len(offer.encode()), 64000)
                r = await c.post('/v1/voice/realtime-call', headers=headers, json={'sdp':offer})
                self.assertEqual(r.status_code, 200)
                provider.assert_awaited_once_with(offer)

    async def test_provider_exception_does_not_echo_sensitive_payload(self):
        import httpx
        from clinicos_ai.api.app import app
        with mock.patch.dict(os.environ, ENV, clear=True), mock.patch.object(realtime, 'negotiate', side_effect=RuntimeError('PRIVATE_PAYLOAD_SENTINEL')):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://qa') as c:
                r = await c.post('/v1/voice/realtime-call', headers={'Authorization':'Bearer qa-fixture-service'}, json={'sdp':'v=0\r\nqa'})
                self.assertEqual(r.status_code, 502)
                self.assertNotIn('PRIVATE_PAYLOAD_SENTINEL', r.text)
                self.assertEqual(r.json()['detail']['kind'], 'provider_error')

    async def test_status_never_creates_remote_session(self):
        with mock.patch.object(azure, 'negotiate_call') as network, mock.patch.object(azure, '_http') as http:
            status = realtime.realtime_status(ENV)
            self.assertTrue(status['available'])
            network.assert_not_called()
            http.assert_not_called()

    async def test_second_stage_credential_error_is_fixed_public_kind(self):
        import io
        import urllib.error
        cfg = azure.realtime_config(ENV)
        response_error = urllib.error.HTTPError('https://synthetic.invalid', 403, 'PRIVATE_PROVIDER_DETAIL', {}, io.BytesIO(b'PRIVATE_BODY'))
        opener = mock.Mock()
        opener.open.side_effect = response_error
        with mock.patch.object(azure.urllib.request, 'build_opener', return_value=opener):
            with self.assertRaises(stt.SttError) as caught:
                azure._http(mock.Mock(), .1)
        self.assertEqual(caught.exception.kind, 'auth_failed')
        self.assertNotIn('PRIVATE_', str(caught.exception))

if __name__ == '__main__':
    unittest.main(verbosity=2)
