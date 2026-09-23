"""PO05: known incomplete provider responses never become clinical proposals."""
from __future__ import annotations

import asyncio
import io
import json
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from clinicos_ai.agents.extraction import MAX_REPAIR_CHARACTERS, run_extraction
from clinicos_ai.models.errors import ErrorKind, RuntimeError_
from clinicos_ai.models.providers.azure import _AzureRunner
from clinicos_ai.models.providers.completion import (
    CompletionMetadataMixin, CompletionText, agent_completion, completion_text,
)
from clinicos_ai.models.spec import ModelSpec


class _Runner:
    def __init__(self, output):
        self.output = output
        self.prompts = []

    async def run(self, prompt, attachments):
        self.prompts.append(prompt)
        return self.output


class _Registry:
    def __init__(self, primary, repair="{}"):
        self.primary = _Runner(primary)
        self.repair = _Runner(repair)

    def build(self, role):
        return SimpleNamespace(runner=self.repair if role == "repair" else self.primary, spec="mock:mock")


class CompletionIntegrityTests(unittest.IsolatedAsyncioTestCase):
    async def test_valid_json_with_length_reason_fails_without_repair(self):
        registry = _Registry(CompletionText('{"synthetic": true}', "length"))
        with self.assertRaises(RuntimeError_) as ctx:
            await run_extraction(registry, "extract", {}, [])
        self.assertEqual(ctx.exception.kind, ErrorKind.OUTPUT_TRUNCATED)
        self.assertEqual(registry.repair.prompts, [])

    async def test_ocr_with_truncated_text_fails(self):
        with self.assertRaises(RuntimeError_) as ctx:
            await run_extraction(_Registry(CompletionText("partial page", "max_tokens")), "ocr", {}, [], mode="ocr")
        self.assertEqual(ctx.exception.kind, ErrorKind.OUTPUT_TRUNCATED)

    async def test_ocr_metadata_survives_raw_text_unwrap(self):
        output = await run_extraction(_Registry(CompletionText('{"rawText":"page"}', "stop")), "ocr", {}, [], mode="ocr")
        self.assertEqual(output.data, {"rawText": "page"})
        self.assertEqual(output.finish_reason, "stop")

    async def test_repair_receives_full_tail_beyond_old_6000_character_slice(self):
        malformed = "x" * 7000 + "TAIL_SENTINEL"
        registry = _Registry(malformed, CompletionText('{"ok": true}', "stop"))
        result = await run_extraction(registry, "extract", {}, [])
        self.assertTrue(registry.repair.prompts[0].endswith(malformed))
        self.assertEqual(result.data, {"ok": True})
        self.assertEqual(result.finish_reason, "stop")

    async def test_oversize_repair_fails_explicitly_without_truncating(self):
        registry = _Registry("x" * (MAX_REPAIR_CHARACTERS + 1))
        with self.assertRaises(RuntimeError_) as ctx:
            await run_extraction(registry, "extract", {}, [])
        self.assertEqual(ctx.exception.kind, ErrorKind.OUTPUT_INCOMPLETE)
        self.assertEqual(registry.repair.prompts, [])

    async def test_repair_cannot_promote_truncated_valid_json(self):
        registry = _Registry("invalid", CompletionText("{}", "length"))
        with self.assertRaises(RuntimeError_) as ctx:
            await run_extraction(registry, "extract", {}, [])
        self.assertEqual(ctx.exception.kind, ErrorKind.OUTPUT_TRUNCATED)

    async def test_top_level_non_object_is_not_a_valid_extraction(self):
        for raw in ["[]", "null", "42"]:
            with self.assertRaises(RuntimeError_) as ctx:
                await run_extraction(_Registry(raw), "extract", {}, [])
            self.assertEqual(ctx.exception.kind, ErrorKind.SCHEMA_VALIDATION)

    def test_agno_last_assistant_metadata_and_unknown_reason(self):
        response = SimpleNamespace(content="{}", messages=[
            {"role": "assistant", "stop_reason": "tool_calls"},
            {"role": "assistant", "provider_data": {"finish_reason": "stop"}},
        ])
        self.assertEqual(agent_completion(response, "fake").finish_reason, "stop")
        for reason in ["content_filter", "safety", "tool_calls", "unknown_future_reason"]:
            with self.assertRaises(RuntimeError_) as ctx:
                completion_text("{}", reason)
            self.assertEqual(ctx.exception.kind, ErrorKind.OUTPUT_INCOMPLETE)

    def test_missing_metadata_stays_unknown(self):
        self.assertIsNone(agent_completion(SimpleNamespace(content="{}"), "fake").finish_reason)

    def test_sdk_parser_preserves_reason_before_it_would_be_discarded(self):
        class SDK:
            def _parse_provider_response(self, response):
                return SimpleNamespace(content="{}", provider_data={"existing": True})

            def parse_provider_response(self, response):
                return self._parse_provider_response(response)

        class Wrapped(CompletionMetadataMixin, SDK):
            pass

        for parser in (Wrapped().parse_provider_response, Wrapped()._parse_provider_response):
            parsed = parser({"choices": [{"finish_reason": "length"}]})
            self.assertEqual(parsed.provider_data, {"existing": True, "finish_reason": "length"})
            with self.assertRaises(RuntimeError_) as ctx:
                agent_completion(parsed, "fake")
            self.assertEqual(ctx.exception.kind, ErrorKind.OUTPUT_TRUNCATED)

    async def test_azure_structured_preserves_finish_and_rejects_length_or_refusal(self):
        runner = _AzureRunner(ModelSpec.parse("azure:gpt-5.5"), 1.0, 5)
        env = {"AZURE_OPENAI_ENDPOINT": "https://provider.invalid", "AZURE_OPENAI_API_KEY": "fake-only"}

        class Response(io.BytesIO):
            def __enter__(self): return self
            def __exit__(self, *args): self.close()

        for reason, refusal in [("stop", None), ("length", None), ("stop", "blocked")]:
            payload = {"choices": [{"finish_reason": reason, "message": {"content": "{}", "refusal": refusal}}]}
            with patch.dict("os.environ", env), patch("urllib.request.urlopen", lambda *a, **k: Response(json.dumps(payload).encode())):
                if reason == "stop" and refusal is None:
                    self.assertEqual((await runner.run_structured("extract", {}, [])).finish_reason, "stop")
                else:
                    with self.assertRaises(RuntimeError_) as ctx:
                        await runner.run_structured("extract", {}, [])
                    self.assertIn(ctx.exception.kind, {ErrorKind.OUTPUT_TRUNCATED, ErrorKind.OUTPUT_INCOMPLETE})
