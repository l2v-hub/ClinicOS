"""Phase 9 production hardening of the AI runtime: constant-time service-token check, generic
error bodies (no provider/exception text to the caller), X-Request-Id correlation.

Stdlib unittest only; route functions and the middleware are exercised directly (no TestClient,
which is not a project dependency)."""
from __future__ import annotations

import asyncio
import os
import unittest
from unittest.mock import patch

for _r in ("OCR", "EXTRACTION", "AGENT", "REPAIR"):
    os.environ.setdefault(f"AI_{_r}_MODEL", "mock:mock")
os.environ.setdefault("AI_RUNTIME_SERVICE_TOKEN", "test-token")

from fastapi import HTTPException

from clinicos_ai.api import app as app_module
from clinicos_ai.correlation import accept_request_id, current_request_id
from clinicos_ai.domain.contracts import SkillRouteRequest, AssistantPlanRequest


class ServiceTokenTests(unittest.TestCase):
    def test_valid_token_accepted(self):
        app_module._auth("Bearer test-token")

    def test_wrong_missing_and_prefix_tokens_rejected(self):
        for value in (None, "", "Bearer test-toke", "Bearer test-token2", "test-token", "bearer test-token"):
            with self.assertRaises(HTTPException) as ctx:
                app_module._auth(value)
            self.assertEqual(ctx.exception.status_code, 401)

    def test_unset_token_fails_closed(self):
        with patch.dict(os.environ, {"AI_RUNTIME_SERVICE_TOKEN": ""}):
            with self.assertRaises(HTTPException) as ctx:
                app_module._auth("Bearer ")
            self.assertEqual(ctx.exception.status_code, 503)

    def test_compare_is_constant_time(self):
        with patch.object(app_module.hmac, "compare_digest", wraps=app_module.hmac.compare_digest) as spy:
            app_module._auth("Bearer test-token")
            spy.assert_called_once()


class GenericErrorBodyTests(unittest.TestCase):
    def test_unexpected_exception_never_reaches_the_caller(self):
        secret_text = "provider said: patient Mario Rossi / key sk-abc"

        async def boom(*_a, **_k):
            raise ValueError(secret_text)

        req = SkillRouteRequest(message="x", skills=[], valueKeys=[])
        with patch.object(app_module, "run_skill_route", boom):
            with self.assertRaises(HTTPException) as ctx:
                asyncio.run(app_module.assistant_skill_route(req, authorization="Bearer test-token"))
        self.assertEqual(ctx.exception.status_code, 500)
        self.assertNotIn("Mario", str(ctx.exception.detail))
        self.assertNotIn("ValueError", str(ctx.exception.detail))

    def test_plan_error_detail_is_generic(self):
        async def boom(*_a, **_k):
            raise RuntimeError("upstream 500: Azure body with clinical text")

        req = AssistantPlanRequest(question="q", toolSchema=[])
        with patch.object(app_module, "run_assistant_plan", boom):
            with self.assertRaises(HTTPException) as ctx:
                asyncio.run(app_module.assistant_plan(req, authorization="Bearer test-token"))
        self.assertEqual(ctx.exception.detail, "internal error")


class CorrelationTests(unittest.TestCase):
    def test_well_formed_id_is_kept(self):
        self.assertEqual(accept_request_id("req-12345678"), "req-12345678")
        self.assertEqual(current_request_id(), "req-12345678")

    def test_malformed_id_is_replaced(self):
        for bad in (None, "", "short", "x" * 65, "bad id with spaces", "a\nb-12345678"):
            rid = accept_request_id(bad)
            self.assertNotEqual(rid, bad)
            self.assertRegex(rid, r"^[0-9a-f]{32}$")

    def test_middleware_echoes_request_id(self):
        class Req:
            headers = {"x-request-id": "corr-abcdef12"}

        class Resp:
            def __init__(self):
                self.headers = {}

        async def call_next(_req):
            self.assertEqual(current_request_id(), "corr-abcdef12")
            return Resp()

        resp = asyncio.run(app_module._correlation(Req(), call_next))
        self.assertEqual(resp.headers["X-Request-Id"], "corr-abcdef12")


if __name__ == "__main__":
    unittest.main()
