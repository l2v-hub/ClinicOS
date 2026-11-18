"""Strict, offline multipart contracts for OpenAI transcription models."""
import os
import unittest
from email import policy
from email.parser import BytesParser
from unittest import mock

from clinicos_ai.voice import stt
from clinicos_ai.voice.providers import openai as adapter


class OpenAITranscriptionContractTests(unittest.TestCase):
    def capture(self, model, locale='it-IT'):
        captured = {}

        def fake_http(url, body, headers, timeout):
            captured.update(url=url, body=body, headers=headers, timeout=timeout)
            return {'text': '  synthetic result  ', 'usage': {'input_tokens': 3, 'output_tokens': 2}}

        with mock.patch.dict(os.environ, {'OPENAI_API_KEY': 'synthetic-only',
                                          'OPENAI_BASE_URL': 'https://synthetic.invalid/v1'}, clear=True), \
                mock.patch.object(stt, '_http_json', side_effect=fake_http):
            text, usage = adapter.transcribe(model, b'synthetic-audio', 'audio/wav', locale, 7)

        self.assertEqual(text, 'synthetic result')
        self.assertEqual(usage, {'inputTokens': 3, 'outputTokens': 2})
        self.assertEqual(captured['url'], 'https://synthetic.invalid/v1/audio/transcriptions')
        self.assertEqual(captured['timeout'], 7)
        msg = BytesParser(policy=policy.default).parsebytes(
            b'MIME-Version: 1.0\r\nContent-Type: ' +
            captured['headers']['Content-Type'].encode('ascii') + b'\r\n\r\n' + captured['body'])
        parts = {}
        for part in msg.iter_parts():
            name = part.get_param('name', header='Content-Disposition')
            self.assertNotIn(name, parts, 'unexpected duplicate multipart field')
            parts[name] = part.get_payload(decode=True)
        self.assertEqual(parts.pop('file'), b'synthetic-audio')
        return {key: value.decode('utf8') for key, value in parts.items()}

    def test_current_model_uses_languages_array_not_legacy_language(self):
        fields = self.capture('gpt-transcribe')
        self.assertEqual(set(fields), {'model', 'languages[]', 'response_format', 'prompt'})
        self.assertEqual(fields['model'], 'gpt-transcribe')
        self.assertEqual(fields['languages[]'], 'it')
        self.assertEqual(fields['response_format'], 'json')
        self.assertEqual(fields['prompt'], stt.stt_hint({}))
        self.assertNotIn('language', fields)

    def test_legacy_models_keep_singular_language(self):
        for model in ('whisper-1', 'gpt-4o-transcribe', 'gpt-4o-mini-transcribe'):
            with self.subTest(model=model):
                fields = self.capture(model, 'fr-FR')
                self.assertEqual(set(fields), {'model', 'language', 'response_format', 'prompt'})
                self.assertEqual(fields['model'], model)
                self.assertEqual(fields['language'], 'fr')
                self.assertNotIn('languages[]', fields)


if __name__ == '__main__':
    unittest.main()
