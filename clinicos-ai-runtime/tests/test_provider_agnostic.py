"""Phase 9 — provider-agnostic AI/STT layer: contract tests.

- registry: every provider entry resolves to an importable adapter; aliases normalize;
- configuration: one switch (AI_PROVIDER + AI_MODEL_<ROLE>), per-role override, legacy path intact;
- validation: credentials / capabilities / STT / fallback, strict-mode trigger;
- PROVIDER SWITCH: the same agent functions run with AI_PROVIDER=openai (real adapter + official SDK
  against a local OpenAI-compatible stub) and AI_PROVIDER=test, changing configuration only;
- normalized errors (10 codes) and usage; fallback policy; token budget; STT switch;
- coupling guard: agents / API / domain / voice layer never import or name a vendor.
"""
from __future__ import annotations

import asyncio
import importlib
import os
import pathlib
import re
import unittest
from unittest import mock

import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from openai_stub import StubServer  # noqa: E402

from clinicos_ai.agents.assistant import run_assistant_compose, run_assistant_plan
from clinicos_ai.agents.extraction import run_extraction
from clinicos_ai.agents.skill_router import run_skill_route
from clinicos_ai.models import contract
from clinicos_ai.models.configuration import load_runtime_config
from clinicos_ai.models.contract import AIRequest, ModelRole, generate, usage_from_metrics
from clinicos_ai.models.errors import AI_ERROR_CODES, ErrorKind, RuntimeError_, ai_error_code
from clinicos_ai.models.provider_registry import PROVIDERS, normalize_provider
from clinicos_ai.models.registry import ModelRegistry
from clinicos_ai.models.spec import ModelSpec
from clinicos_ai.models.validation import strict_mode, validate_ai_config
from clinicos_ai.voice import stt

ROOT = pathlib.Path(__file__).resolve().parents[1] / "clinicos_ai"
SKILLS = [
    {"id": "vitals.record", "name": "Registra parametri vitali",
     "description": "Registra pressione, saturazione, frequenza", "slots": ["patient", "values"]},
    {"id": "drug.search", "name": "Cerca farmaco", "description": "Cerca un farmaco", "slots": ["query"]},
]
OCR_ENV = {"AI_OCR_PROVIDER": "mock", "AI_OCR_MODEL": "mock"}


def openai_env(base_url: str, **extra: str) -> dict[str, str]:
    return {"AI_PROVIDER": "openai", "AI_MODEL_DEFAULT": "gpt-6.1-sol", "OPENAI_API_KEY": "sk-test-not-real",
            "OPENAI_BASE_URL": base_url, "STT_PROVIDER": "openai", "STT_MODEL": "gpt-transcribe-test",
            **OCR_ENV, **extra}


def test_env(**extra: str) -> dict[str, str]:
    return {"AI_PROVIDER": "test", "AI_MODEL_DEFAULT": "deterministic", "STT_PROVIDER": "test",
            "STT_MODEL": "deterministic", **OCR_ENV, **extra}


async def representative_workflows(registry: ModelRegistry) -> dict:
    """The same application calls, whatever the provider (no provider name below)."""
    route = await run_skill_route(registry, "registra pressione 120/80 a questo ospite", SKILLS, None,
                                  "2026-10-02", ["pa", "spo2", "fc"])
    plan = await run_assistant_plan(registry, "allergie dell'ospite", [{"name": "allergies"}])
    compose = await run_assistant_compose(registry, "allergie?", [], [])
    extraction = await run_extraction(registry, "Estrai i dati", {"type": "object"}, [])
    return {"route": route, "plan": plan, "compose": compose, "extraction": extraction}


class RegistryTests(unittest.TestCase):
    def test_every_entry_has_an_importable_adapter(self):
        for name, entry in PROVIDERS.items():
            if entry.module:
                module = importlib.import_module(entry.module)
                self.assertTrue(callable(getattr(module, "build", None)), name)
            if entry.stt_module:
                self.assertTrue(callable(getattr(importlib.import_module(entry.stt_module), "transcribe", None)), name)
            self.assertIsNotNone(entry.capabilities, name)

    def test_aliases(self):
        self.assertEqual(normalize_provider("azure-openai"), "azure")
        self.assertEqual(normalize_provider("Claude"), "anthropic")
        self.assertEqual(normalize_provider("local"), "openai-like")
        self.assertEqual(str(ModelSpec.parse("gemini:gemini-x")), "google:gemini-x")


class ConfigurationTests(unittest.TestCase):
    def test_single_switch_resolves_every_logical_role(self):
        cfg = load_runtime_config(openai_env("http://x"))
        self.assertEqual(cfg.mode, "new")
        for role in ("command_parser", "reasoning", "summary", "fast", "vision"):
            self.assertEqual(str(cfg.role(role).model), "openai:gpt-6.1-sol", role)
            self.assertIsNone(cfg.role(role).temperature, "no temperature unless configured")
        self.assertEqual(str(cfg.role("ocr").model), "mock:mock", "OCR scope unchanged")
        self.assertEqual(cfg.role("agent"), cfg.role("command_parser"), "legacy alias")

    def test_per_role_model_and_provider_override(self):
        cfg = load_runtime_config(openai_env("http://x", AI_MODEL_FAST="gpt-mini",
                                             AI_MODEL_SUMMARY="anthropic:claude-test"))
        self.assertEqual(str(cfg.role("fast").model), "openai:gpt-mini")
        self.assertEqual(str(cfg.role("summary").model), "anthropic:claude-test")

    def test_switch_is_one_variable(self):
        a = load_runtime_config(test_env())
        b = load_runtime_config({**test_env(), "AI_PROVIDER": "openai"})
        self.assertEqual(a.role("command_parser").model.provider, "test")
        self.assertEqual(b.role("command_parser").model.provider, "openai")

    def test_legacy_configuration_unchanged(self):
        cfg = load_runtime_config({"AGNOS_LLM_PROVIDER": "azure-openai", "AGNOS_LLM_MODEL": "gpt-6.1-sol",
                                   "AZURE_OPENAI_ENDPOINT": "https://x", "AZURE_OPENAI_API_KEY": "k",
                                   "AI_EXTRACTION_PROVIDER": "azure-openai", "AI_EXTRACTION_MODEL": "gpt-6.1-sol",
                                   **OCR_ENV})
        self.assertEqual(cfg.mode, "legacy")
        self.assertTrue(cfg.available, cfg.errors)
        self.assertEqual(str(cfg.role("command_parser").model), "azure:gpt-6.1-sol")
        self.assertEqual(str(cfg.role("vision").model), "azure:gpt-6.1-sol")
        self.assertEqual(str(cfg.role("fast").model), "azure:gpt-6.1-sol", "repair inherits Agnos")

    def test_errors(self):
        self.assertTrue(any("non registrato" in e for e in load_runtime_config({"AI_PROVIDER": "nope", **OCR_ENV}).errors))
        self.assertTrue(any("AI_MODEL_" in e for e in load_runtime_config({"AI_PROVIDER": "openai", **OCR_ENV}).errors))
        bad_fb = load_runtime_config({**test_env(), "AI_FALLBACK_ENABLED": "true"})
        self.assertTrue(any("AI_FALLBACK_PROVIDER" in e for e in bad_fb.errors))


class ValidationTests(unittest.TestCase):
    def test_credentials_capabilities_stt(self):
        env = {k: v for k, v in openai_env("http://x").items() if k != "OPENAI_API_KEY"}
        errors, _ = validate_ai_config(env)
        self.assertTrue(any("credenziali mancanti" in e and "openai" in e for e in errors), errors)
        self.assertTrue(any("provider STT" in e for e in errors), errors)
        errors, _ = validate_ai_config(openai_env("http://x", AI_MODEL_VISION="gpt-3.5-turbo"))
        self.assertTrue(any("[vision]" in e and "image_input" in e for e in errors), errors)
        self.assertEqual(validate_ai_config(test_env())[0], [])
        errors, _ = validate_ai_config({**test_env(), "AI_MODEL_SUMMARY": "mistral:mistral-ocr-4-0",
                                        "MISTRAL_API_KEY": "k"})
        self.assertTrue(any("[summary]" in e and "solo il ruolo OCR" in e for e in errors), errors)
        errors, _ = validate_ai_config({**test_env(), "STT_PROVIDER": "anthropic", "STT_MODEL": "x"})
        self.assertTrue(any("non registrato come provider STT" in e for e in errors), errors)
        self.assertNotIn("sk-test-not-real", str(validate_ai_config(openai_env("http://x"))))

    def test_strict_mode(self):
        self.assertTrue(strict_mode({"AI_PROVIDER": "openai"}))
        self.assertTrue(strict_mode({"AI_STRICT_CONFIG": "true"}))
        self.assertFalse(strict_mode({"AGNOS_LLM_PROVIDER": "azure-openai"}))


class ProviderSwitchTests(unittest.IsolatedAsyncioTestCase):
    """Acceptance test of agnosticism: same functions, configuration-only switch."""

    async def asyncSetUp(self):
        contract.BUDGET.reset()

    async def test_openai_then_test_provider_same_workflows(self):
        with StubServer() as server:
            with mock.patch.dict(os.environ, openai_env(server.base_url), clear=False):
                a = await representative_workflows(ModelRegistry())
            self.assertGreaterEqual(len([r for r in server.requests if r["path"].endswith("/responses")]), 4)
            self.assertTrue(all(r["auth"] == "Bearer sk-test-not-real" for r in server.requests))
        with mock.patch.dict(os.environ, test_env(), clear=False):
            b = await representative_workflows(ModelRegistry())
        for result, provider in ((a, "openai"), (b, "test")):
            self.assertEqual(result["route"]["route"]["skillId"], "vitals.record")
            self.assertEqual(result["route"]["route"]["values"], {"pa": "120/80"})
            self.assertTrue(result["route"]["route"]["currentPatient"])
            self.assertEqual(result["route"]["ai"]["provider"], provider)
            self.assertEqual(result["route"]["ai"]["role"], "command_parser")
            self.assertEqual(result["plan"]["ai"]["role"], "reasoning")
            self.assertEqual(result["compose"]["ai"]["role"], "summary")
            self.assertEqual(result["plan"]["plan"]["intent"], "unknown")
            self.assertIsInstance(result["extraction"].data, dict)
            self.assertTrue(result["extraction"].model.startswith(provider + ":"))
            self.assertGreater(result["route"]["ai"]["usage"]["input_tokens"], 0)

    async def test_stt_switch(self):
        audio = b"RIFF" + (36).to_bytes(4, "little") + b"WAVEfmt " + bytes(16) + b"data" + bytes(8)
        with StubServer() as server:
            with mock.patch.dict(os.environ, openai_env(server.base_url), clear=False):
                via_openai = await stt.transcribe(audio, "audio/wav")
            self.assertTrue(any(r["path"].endswith("/audio/transcriptions") for r in server.requests))
        with mock.patch.dict(os.environ, test_env(), clear=False):
            via_test = await stt.transcribe(audio, "audio/wav")
        self.assertEqual(via_openai.text, via_test.text)
        self.assertEqual((via_openai.provider, via_test.provider), ("openai", "test"))
        self.assertEqual(via_openai.usage["audioSeconds"], 2.0)


class ErrorAndUsageNormalizationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        contract.BUDGET.reset()

    async def _openai_error(self, mode: str, timeout: str | None = None) -> str:
        extra = {"AI_TIMEOUT_SECONDS_COMMAND_PARSER": timeout} if timeout else {}
        with StubServer() as server:
            server.mode = mode
            with mock.patch.dict(os.environ, openai_env(server.base_url, **extra), clear=False):
                with self.assertRaises(RuntimeError_) as ctx:
                    await generate(ModelRegistry(), AIRequest(ModelRole.COMMAND_PARSER, "SKILL_ROUTE_V1 x"))
        return ai_error_code(ctx.exception)

    async def test_openai_adapter_errors(self):
        expected = {"429": "RATE_LIMIT", "401": "AUTH_ERROR", "500": "PROVIDER_UNAVAILABLE",
                    "context": "CONTEXT_LIMIT", "incomplete": "CONTEXT_LIMIT", "refusal": "CONTENT_REJECTED",
                    "content_filter": "CONTENT_REJECTED", "malformed": "MALFORMED_RESPONSE"}
        for mode, code in expected.items():
            self.assertEqual(await self._openai_error(mode), code, mode)
        self.assertEqual(await self._openai_error("slow", timeout="1"), "TIMEOUT")

    async def test_cancellation_is_real(self):
        with StubServer() as server:
            server.mode = "slow"
            with mock.patch.dict(os.environ, openai_env(server.base_url), clear=False):
                task = asyncio.create_task(generate(ModelRegistry(), AIRequest(ModelRole.SUMMARY, "x")))
                await asyncio.sleep(0.3)
                task.cancel()
                with self.assertRaises(asyncio.CancelledError):
                    await task

    async def test_test_provider_faults_map_to_every_code(self):
        expected = {"timeout": "TIMEOUT", "rate_limit": "RATE_LIMIT", "unavailable": "PROVIDER_UNAVAILABLE",
                    "context_limit": "CONTEXT_LIMIT", "content_rejected": "CONTENT_REJECTED",
                    "auth": "AUTH_ERROR", "cancelled": "CANCELLED"}
        for fault, code in expected.items():
            with mock.patch.dict(os.environ, test_env(AI_TEST_FAULT=fault), clear=False):
                with self.assertRaises(RuntimeError_) as ctx:
                    await generate(ModelRegistry(), AIRequest(ModelRole.FAST, "x"))
            self.assertEqual(ai_error_code(ctx.exception), code, fault)
        self.assertEqual(len(AI_ERROR_CODES), 10)
        self.assertEqual(ai_error_code(ValueError("boom")), "PROVIDER_UNAVAILABLE")

    async def test_usage_normalized(self):
        with StubServer() as server:
            with mock.patch.dict(os.environ, openai_env(server.base_url), clear=False):
                resp = await generate(ModelRegistry(), AIRequest(ModelRole.SUMMARY, "ASSISTANT_COMPOSE_V1"))
        self.assertEqual((resp.usage.input_tokens, resp.usage.output_tokens), (120, 15))
        self.assertEqual((resp.usage.cached_input_tokens, resp.usage.reasoning_tokens), (40, 5))
        self.assertEqual((resp.usage.provider, resp.usage.model), ("openai", "gpt-6.1-sol"))
        self.assertEqual(usage_from_metrics({"input_tokens": 3, "output_tokens": 2, "cache_read_tokens": 1}),
                         {"input_tokens": 3, "output_tokens": 2, "cached_input_tokens": 1})

    async def test_fallback_only_when_enabled_and_allowed(self):
        with StubServer() as server:
            server.mode = "500"
            env = openai_env(server.base_url, AI_FALLBACK_ENABLED="true", AI_FALLBACK_PROVIDER="test",
                             AI_FALLBACK_MODEL_DEFAULT="deterministic")
            with mock.patch.dict(os.environ, env, clear=False):
                resp = await generate(ModelRegistry(), AIRequest(ModelRole.SUMMARY, "ASSISTANT_COMPOSE_V1"))
                self.assertTrue(resp.fallback_used)
                self.assertEqual(resp.provider, "test")
                with self.assertRaises(RuntimeError_):
                    await generate(ModelRegistry(), AIRequest(ModelRole.SUMMARY, "x", allow_fallback=False))
            server.mode = "refusal"
            with mock.patch.dict(os.environ, env, clear=False):
                with self.assertRaises(RuntimeError_) as ctx:
                    await generate(ModelRegistry(), AIRequest(ModelRole.SUMMARY, "x"))
                self.assertEqual(ai_error_code(ctx.exception), "CONTENT_REJECTED", "never re-routed")
            server.mode = "500"
            with mock.patch.dict(os.environ, openai_env(server.base_url), clear=False):
                with self.assertRaises(RuntimeError_):
                    await generate(ModelRegistry(), AIRequest(ModelRole.SUMMARY, "x"))  # fallback disabled

    async def test_token_budget(self):
        with mock.patch.dict(os.environ, test_env(AI_DAILY_TOKEN_BUDGET="5"), clear=False):
            await generate(ModelRegistry(), AIRequest(ModelRole.FAST, "x" * 100))
            with self.assertRaises(RuntimeError_) as ctx:
                await generate(ModelRegistry(), AIRequest(ModelRole.FAST, "x"))
        self.assertEqual(ctx.exception.kind, ErrorKind.BUDGET_EXCEEDED)
        self.assertEqual(ai_error_code(ctx.exception), "RATE_LIMIT")


class AgnoPathRegressionTests(unittest.TestCase):
    """Found by the real-provider benchmark (Azure, 2026-10-02)."""

    def test_swallowed_rate_limit_stays_rate_limit(self):
        from clinicos_ai.models.providers.completion import agent_completion

        run = {"status": "ERROR", "content": "Your requests to m for m in region have exceeded token rate limit."}
        with self.assertRaises(RuntimeError_) as ctx:
            agent_completion(run, "Azure")
        self.assertEqual(ai_error_code(ctx.exception), "RATE_LIMIT")
        with self.assertRaises(RuntimeError_) as ctx:
            agent_completion({"status": "ERROR", "content": "Incorrect API key provided"}, "Azure")
        self.assertEqual(ai_error_code(ctx.exception), "AUTH_ERROR")

    def test_no_hidden_sdk_retries(self):
        import dataclasses
        from clinicos_ai.models.providers._common import sdk_retry_kwargs

        @dataclasses.dataclass
        class FakeModel:
            id: str = ""
            max_retries: int = 2
            retries: int = 3

        self.assertEqual(sdk_retry_kwargs(FakeModel), {"max_retries": 0, "retries": 0})
        with mock.patch.dict(os.environ, {"AI_PROVIDER_SDK_RETRIES": "1"}):
            self.assertEqual(sdk_retry_kwargs(FakeModel), {"max_retries": 1, "retries": 1})
        self.assertEqual(sdk_retry_kwargs(dict), {})


class CouplingGuardTests(unittest.TestCase):
    """Business code never imports a vendor SDK nor names a provider/model."""

    VENDOR = re.compile(r"\b(openai|azure|gemini|google|anthropic|claude|mistral|gpt-\d|whisper)\b|from agno\.models|import agno",
                        re.IGNORECASE)
    NEUTRAL = ["agents", "api", "domain", "voice/stt.py", "models/contract.py", "models/configuration.py",
               "models/registry.py", "models/factory.py", "models/validation.py", "correlation.py"]

    def test_no_vendor_in_neutral_layers(self):
        import ast

        offenders = []
        for rel in self.NEUTRAL:
            path = ROOT / rel
            for f in [path] if path.is_file() else sorted(path.rglob("*.py")):
                tree = ast.parse(f.read_text(encoding="utf-8"))
                # Drop docstrings (prose); comments are already gone after unparse. String
                # literals in code stay: a vendor name in a literal IS coupling.
                for node in ast.walk(tree):
                    body = getattr(node, "body", None)
                    if (isinstance(body, list) and body and isinstance(body[0], ast.Expr)
                            and isinstance(body[0].value, ast.Constant) and isinstance(body[0].value.value, str)):
                        body[0] = ast.Pass()
                for line in ast.unparse(tree).splitlines():
                    if self.VENDOR.search(line):
                        offenders.append(f"{f.relative_to(ROOT)}: {line.strip()[:100]}")
        self.assertEqual(offenders, [], "\n".join(offenders))


if __name__ == "__main__":
    unittest.main()
