"""Phase 9B — OpenAI Direct cutover contract (exact Railway target configuration).

Runs the real agents + OpenAI adapter (official SDK) against the local OpenAI-compatible stub with
the variable set documented in RAILWAY_OPENAI_CONFIGURATION.md — no key, no network, no Azure.
"""
from __future__ import annotations

import asyncio
import io
import json
import logging
import os
import pathlib
import sys
import unittest
from unittest import mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from openai_stub import StubServer  # noqa: E402

from clinicos_ai.agents.assistant import run_assistant_compose, run_assistant_plan  # noqa: E402
from clinicos_ai.agents.skill_router import run_skill_route  # noqa: E402
from clinicos_ai.api import app as app_module  # noqa: E402
from clinicos_ai.models import contract  # noqa: E402
from clinicos_ai.models.contract import AIRequest, ModelRole, generate  # noqa: E402
from clinicos_ai.models.cost import COSTS  # noqa: E402
from clinicos_ai.models.errors import RuntimeError_, ai_error_code  # noqa: E402
from clinicos_ai.models.registry import ModelRegistry  # noqa: E402
from clinicos_ai.models.validation import validate_ai_config  # noqa: E402
from clinicos_ai.voice import stt  # noqa: E402

SENTINEL_KEY = "sk-cutover-SENTINEL-0123456789abcdef"
SKILLS = [{"id": "vitals.record", "name": "Registra parametri vitali",
           "description": "Registra pressione, saturazione, frequenza", "slots": ["patient", "values"]}]
WAV = b"RIFF" + (36).to_bytes(4, "little") + b"WAVEfmt " + bytes(16) + b"data" + bytes(8)

# The Railway production target (RAILWAY_OPENAI_CONFIGURATION.md) — OCR scope unchanged.
TARGET = {
    "AI_ENABLED": "true", "AI_PROVIDER": "openai", "OPENAI_API_KEY": SENTINEL_KEY,
    "AI_MODEL_DEFAULT": "gpt-5.6-luna", "AI_MODEL_FAST": "gpt-5.6-luna",
    "AI_MODEL_COMMAND_PARSER": "gpt-5.6-luna", "AI_MODEL_SUMMARY": "gpt-5.6-luna",
    "AI_MODEL_REASONING": "gpt-5.6-sol", "STT_PROVIDER": "openai", "STT_MODEL": "gpt-transcribe",
    "STT_REALTIME_ENABLED": "false", "STT_REALTIME_MODEL": "gpt-live-transcribe",
    "AI_FALLBACK_ENABLED": "false", "AI_OCR_PROVIDER": "mock", "AI_OCR_MODEL": "mock",
}
AZURE_VARS = ("AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_API_KEY", "AZURE_OPENAI_DEPLOYMENT",
              "AZURE_OPENAI_API_VERSION", "AGNOS_LLM_PROVIDER", "AGNOS_LLM_MODEL")


def target_env(base_url: str, **extra: str) -> dict[str, str]:
    env = {k: v for k, v in os.environ.items() if k not in AZURE_VARS and not k.startswith(("AI_", "STT_"))}
    return {**env, **TARGET, "OPENAI_BASE_URL": base_url, **extra}


class TargetConfigurationTests(unittest.TestCase):
    def test_target_validates_without_any_azure_variable(self):
        env = target_env("http://127.0.0.1:1/v1")
        self.assertFalse(any(k in env for k in AZURE_VARS))
        errors, warnings = validate_ai_config(env)
        self.assertEqual(errors, [])
        roles = ModelRegistry(env=env).public_status()["roles"]
        for role in ("fast", "command_parser", "summary", "vision"):
            self.assertEqual(roles[role]["model"], "openai:gpt-5.6-luna", role)
        self.assertEqual(roles["reasoning"]["model"], "openai:gpt-5.6-sol")

    def test_prompt_variable_set_without_default_misses_vision(self):
        env = {k: v for k, v in target_env("http://x").items() if k != "AI_MODEL_DEFAULT"}
        errors, _ = validate_ai_config(env)
        self.assertTrue(any("AI_MODEL_VISION" in e for e in errors), errors)

    def test_missing_key_makes_ai_unavailable_without_leaking(self):
        env = {k: v for k, v in target_env("http://x").items() if k != "OPENAI_API_KEY"}
        errors, _ = validate_ai_config(env)
        self.assertTrue(any("credenziali mancanti" in e and "openai" in e for e in errors))
        self.assertTrue(any("provider STT" in e for e in errors))

    def test_realtime_is_separate_and_off(self):
        with mock.patch.dict(os.environ, target_env("http://x"), clear=True):
            self.assertEqual(stt.stt_realtime(), {"enabled": False, "model": "gpt-live-transcribe"})
            self.assertEqual(stt.stt_model(), ("openai", "gpt-transcribe"))
        errors, _ = validate_ai_config(target_env("http://x", STT_REALTIME_ENABLED="true"))
        self.assertTrue(any("realtime non è implementata" in e for e in errors), errors)

    def test_deprecated_transcription_model_flagged(self):
        _, warnings = validate_ai_config(target_env("http://x", STT_MODEL="gpt-4o-mini-transcribe"))
        self.assertTrue(any("deprecato" in w for w in warnings), warnings)

    def test_openai_adapter_has_no_azure_dependency(self):
        root = pathlib.Path(__file__).resolve().parents[1] / "clinicos_ai"
        for rel in ("models/providers/openai.py", "voice/providers/openai.py"):
            code = (root / rel).read_text(encoding="utf-8").lower()
            self.assertNotIn("azure", code, rel)
            self.assertNotIn("api-version", code, rel)


class CutoverFlowTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        contract.BUDGET.reset()
        COSTS.reset()

    async def test_role_mapping_on_the_wire_and_switch_openai_test_openai(self):
        async def flows():
            reg = ModelRegistry()
            route = await run_skill_route(reg, "registra pressione 120/80 a questo ospite", SKILLS, None,
                                          "2026-10-02", ["pa"])
            plan = await run_assistant_plan(reg, "allergie?", [{"name": "allergies"}])
            comp = await run_assistant_compose(reg, "allergie?", [], [])
            tx = await stt.transcribe(WAV, "audio/wav")
            return route, plan, comp, tx

        with StubServer() as server:
            with mock.patch.dict(os.environ, target_env(server.base_url), clear=True):
                route, plan, comp, tx = await flows()
            seen = {(r["purpose"], r["model"]) for r in server.requests}
            self.assertIn(("skill_route", "gpt-5.6-luna"), seen)
            self.assertIn(("plan", "gpt-5.6-sol"), seen)
            self.assertIn(("compose", "gpt-5.6-luna"), seen)
            self.assertIn(("stt", "gpt-transcribe"), seen)
            self.assertNotIn(("skill_route", "gpt-5.6-sol"), seen, "no reasoning model for parsing")
            self.assertEqual(sum(1 for r in server.requests if r["purpose"] == "skill_route"), 1,
                             "exactly one LLM call per command (no luna+sol double call)")
            self.assertEqual(route["route"]["skillId"], "vitals.record")
            self.assertEqual(tx.provider, "openai")
            # switch to the test provider by configuration only…
            test_env = {**target_env(server.base_url), "AI_PROVIDER": "test", "STT_PROVIDER": "test",
                        "AI_MODEL_DEFAULT": "deterministic", "AI_MODEL_FAST": "deterministic",
                        "AI_MODEL_COMMAND_PARSER": "deterministic", "AI_MODEL_SUMMARY": "deterministic",
                        "AI_MODEL_REASONING": "deterministic", "STT_MODEL": "deterministic"}
            before = len(server.requests)
            with mock.patch.dict(os.environ, test_env, clear=True):
                route2, _, _, tx2 = await flows()
            self.assertEqual(len(server.requests), before, "test provider never reaches OpenAI")
            self.assertEqual((route2["ai"]["provider"], tx2.provider), ("test", "test"))
            self.assertEqual(route2["route"]["skillId"], "vitals.record")
            # …and back to OpenAI.
            with mock.patch.dict(os.environ, target_env(server.base_url), clear=True):
                route3, *_ = await flows()
            self.assertEqual(route3["ai"]["provider"], "openai")
            self.assertEqual(route3["ai"]["model"], "gpt-5.6-luna")

    async def test_ai_disabled_makes_no_provider_call(self):
        with StubServer() as server:
            with mock.patch.dict(os.environ, target_env(server.base_url, AI_ENABLED="false"), clear=True):
                with self.assertRaises(RuntimeError_) as ctx:
                    await generate(ModelRegistry(), AIRequest(ModelRole.COMMAND_PARSER, "x"))
                self.assertEqual(ai_error_code(ctx.exception), "PROVIDER_UNAVAILABLE")
                with self.assertRaises(stt.SttError):
                    await stt.transcribe(WAV, "audio/wav")
                self.assertFalse(stt.stt_status()["available"])
            self.assertEqual(server.requests, [], "AI_ENABLED=false: zero calls")

    async def test_cost_estimate_and_soft_budget_alert(self):
        pricing = {"gpt-5.6-luna": {"input_per_1m": 1000.0, "output_per_1m": 2000.0, "cached_input_per_1m": 100.0},
                   "gpt-transcribe": {"audio_per_minute": 0.6}}
        with StubServer() as server:
            env = target_env(server.base_url, AI_PRICING_JSON=json.dumps(pricing), AI_DAILY_SOFT_BUDGET_USD="0.05")
            with mock.patch.dict(os.environ, env, clear=True):
                with self.assertLogs("clinicos_ai.cost", level="WARNING") as logs:
                    resp = await generate(ModelRegistry(), AIRequest(ModelRole.SUMMARY, "ASSISTANT_COMPOSE_V1"))
                # stub usage: 120 in (40 cached), 15 out → (80*1000 + 40*100 + 15*2000)/1e6 = 0.114
                self.assertAlmostEqual(resp.estimated_usd, 0.114, places=6)
                self.assertEqual(resp.metadata()["estimatedUsd"], resp.estimated_usd)
                self.assertTrue(any("soft limit exceeded period=daily" in m for m in logs.output))
                snap = COSTS.snapshot(os.environ)
                self.assertTrue(snap["dailySoftExceeded"])
                tx = await stt.transcribe(WAV, "audio/wav")  # 2 s at 0.6/min = 0.02
                self.assertAlmostEqual(tx.usage["estimatedUsd"], 0.02, places=6)
                resp2 = await generate(ModelRegistry(), AIRequest(ModelRole.REASONING, "ASSISTANT_PLAN_V1"))
                self.assertIsNone(resp2.estimated_usd, "no price for sol → no invented cost")

    async def test_secret_never_in_logs_or_responses(self):
        buffer = io.StringIO()
        handler = logging.StreamHandler(buffer)
        root = logging.getLogger()
        root.addHandler(handler)
        old_level = root.level
        root.setLevel(logging.DEBUG)
        try:
            with StubServer() as server:
                with mock.patch.dict(os.environ, target_env(server.base_url), clear=True):
                    out = [await run_skill_route(ModelRegistry(), "registra pressione 120/80 a questo ospite",
                                                 SKILLS, None, "2026-10-02", ["pa"]),
                           app_module.ai_health(), app_module.llm_health(), app_module.health()]
                    server.mode = "401"
                    with self.assertRaises(RuntimeError_) as ctx:
                        await generate(ModelRegistry(), AIRequest(ModelRole.FAST, "x"))
                    out.append(str(ctx.exception))
        finally:
            root.removeHandler(handler)
            root.setLevel(old_level)
        self.assertNotIn(SENTINEL_KEY, buffer.getvalue())
        self.assertNotIn(SENTINEL_KEY, json.dumps(out, default=str))
        self.assertEqual(ai_error_code(ctx.exception), "AUTH_ERROR")


if __name__ == "__main__":
    unittest.main()
