"""PO05: unit identity, attempt replay, cancellation and stale completion guards."""
from __future__ import annotations

import asyncio
import dataclasses
import os
import time
import unittest
from unittest.mock import patch

for role in ("OCR", "EXTRACTION", "AGENT", "REPAIR"):
    os.environ.setdefault(f"AI_{role}_MODEL", "mock:mock")
os.environ.setdefault("AI_RUNTIME_SERVICE_TOKEN", "test-token")

from fastapi import HTTPException
from pydantic import ValidationError
from clinicos_ai.api import app as api
from clinicos_ai.agents.extraction import ExtractionOutput
from clinicos_ai.domain.contracts import CreateJobRequest, RetryRequest, RunRequest, RuntimeFile
from clinicos_ai.models.errors import ErrorKind, RuntimeError_
from clinicos_ai.models.registry import ModelRegistry

AUTH = "Bearer test-token"


def body(**changes):
    values = dict(external_job_id="po05:import:ocr:page", input_hash="a" * 64,
                  prompt="synthetic", schema={"type": "object"},
                  files=[RuntimeFile(filename="page.png", mime_type="image/png", content_base64="QQ==")])
    values.update(changes)
    return CreateJobRequest(**values)


class JobRecoveryTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        api._JOBS.clear()
        api._JOB_KEYS.clear()
        api._TASKS.clear()
        self.previous_sem = api._CONCURRENCY_SEMAPHORE
        api._CONCURRENCY_SEMAPHORE = asyncio.Semaphore(1)
        self.previous_registry = api._REGISTRY
        self.auth = patch.dict(os.environ, {"AI_RUNTIME_SERVICE_TOKEN": "test-token"})
        self.auth.start()

    async def asyncTearDown(self):
        tasks = list(api._TASKS.values())
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        api._TASKS.clear()
        api._CONCURRENCY_SEMAPHORE = self.previous_sem
        api._REGISTRY = self.previous_registry
        self.auth.stop()

    def create(self, **changes):
        return api.create_job(body(**changes), authorization=AUTH)

    async def start(self, job_id, mode="extraction"):
        return await api.run_job(job_id, RunRequest(mode=mode), authorization=AUTH)

    async def finish(self, job_id):
        task = api._TASKS.get(job_id)
        if task:
            await task
        await asyncio.sleep(0)
        return api.get_job(job_id, authorization=AUTH)

    def test_create_replays_only_identical_unit_and_canonical_payload(self):
        first = self.create(schema={"type": "object", "properties": {}})
        again = self.create(schema={"properties": {}, "type": "object"})
        self.assertEqual(first, again)
        self.assertEqual(first["input_hash"], "a" * 64)
        self.assertEqual(first["attempt"], 0)
        self.assertEqual(len(api._JOBS), 1)

    def test_key_conflicts_on_changed_hash_prompt_schema_or_file(self):
        self.create()
        variants = [dict(input_hash="b" * 64), dict(prompt="changed"), dict(schema={}),
                    dict(files=[RuntimeFile(filename="page.png", mime_type="image/png", content_base64="Qg==")])]
        for change in variants:
            with self.subTest(change=tuple(change)), self.assertRaises(HTTPException) as ctx:
                self.create(**change)
            self.assertEqual(ctx.exception.status_code, 409)

    def test_legacy_correlation_does_not_deduplicate(self):
        self.assertNotEqual(self.create(input_hash=None)["job_id"], self.create(input_hash=None)["job_id"])

    def test_invalid_identity_and_attempt_rejected_at_boundary(self):
        for change in [dict(input_hash="bad"), dict(external_job_id=None), dict(external_job_id=" ")]:
            with self.assertRaises(ValidationError):
                body(**change)
        for value in [-1, "1", True]:
            with self.assertRaises(ValidationError):
                RetryRequest(expected_attempt=value)

    async def test_upload_stream_stops_before_reading_tail_after_limit(self):
        config = dataclasses.replace(api._REGISTRY.config, max_upload_bytes=10)
        api._REGISTRY = ModelRegistry(config=config)

        class StreamingRequest:
            headers = {}
            chunks_read = 0

            async def stream(self):
                for chunk in (b"123456", b"78901"):
                    self.chunks_read += 1
                    yield chunk
                raise AssertionError("The oversized request tail must never be read")

            async def body(self):
                raise AssertionError("The request must not buffer its complete body")

        request = StreamingRequest()
        with self.assertRaises(HTTPException) as ctx:
            await api._document_jobs_route(request, authorization=AUTH)
        self.assertEqual(ctx.exception.status_code, 413)
        self.assertEqual(request.chunks_read, 2)
        self.assertEqual(api._JOBS, {})

    async def test_duplicate_runs_never_duplicate_provider_or_reset_terminal(self):
        entered, release = asyncio.Event(), asyncio.Event()
        calls = 0

        async def provider(*args, **kwargs):
            nonlocal calls
            calls += 1
            entered.set()
            await release.wait()
            return ExtractionOutput("mock:mock", {"ok": True}, [], finish_reason="stop")

        jid = self.create()["job_id"]
        with patch.object(api, "run_extraction", provider):
            replies = await asyncio.gather(*(self.start(jid) for _ in range(5)))
            await entered.wait()
            self.assertEqual({r["attempt"] for r in replies}, {1})
            release.set()
            await self.finish(jid)
            final = await self.start(jid)
        self.assertEqual(calls, 1)
        self.assertEqual(final["status"], "review_ready")
        self.assertEqual(final["finish_reason"], "stop")
        with self.assertRaises(HTTPException) as ctx:
            await self.start(jid, "ocr")
        self.assertEqual(ctx.exception.status_code, 409)

    async def test_cancel_queued_never_calls_provider(self):
        await api._CONCURRENCY_SEMAPHORE.acquire()
        jid = self.create()["job_id"]
        calls = []

        async def provider(*args, **kwargs):
            calls.append(True)
            return ExtractionOutput("mock:mock", {}, [])

        with patch.object(api, "run_extraction", provider):
            await self.start(jid)
            task = api._TASKS[jid]
            await api.cancel_job(jid, authorization=AUTH)
            await asyncio.gather(task, return_exceptions=True)
            api._CONCURRENCY_SEMAPHORE.release()
            await asyncio.sleep(0)
        self.assertTrue(task.cancelled())
        self.assertEqual(calls, [])
        self.assertEqual((await self.start(jid))["status"], "cancelled")

    async def test_cancel_running_cancels_task_and_blocks_late_success(self):
        entered, cancelled = asyncio.Event(), asyncio.Event()

        async def provider(*args, **kwargs):
            entered.set()
            try:
                await asyncio.Event().wait()
            except asyncio.CancelledError:
                cancelled.set()
                return ExtractionOutput("mock:mock", {"late": True}, [])

        jid = self.create()["job_id"]
        with patch.object(api, "run_extraction", provider):
            await self.start(jid)
            task = api._TASKS[jid]
            await entered.wait()
            await api.cancel_job(jid, authorization=AUTH)
            await asyncio.gather(task, return_exceptions=True)
        self.assertTrue(cancelled.is_set())
        self.assertEqual(api.get_job(jid, authorization=AUTH)["status"], "cancelled")
        self.assertIsNone(api.get_result(jid, authorization=AUTH)["data"])

    async def test_cancel_terminal_preserves_completed_result(self):
        jid = self.create()["job_id"]
        api._JOBS[jid].update(status="review_ready", result={"ok": True})
        self.assertEqual((await api.cancel_job(jid, authorization=AUTH))["status"], "review_ready")
        self.assertEqual(api.get_result(jid, authorization=AUTH)["data"], {"ok": True})

    async def test_retry_response_loss_and_stale_replays_run_once(self):
        calls = 0

        async def provider(*args, **kwargs):
            nonlocal calls
            calls += 1
            raise RuntimeError_(ErrorKind.RATE_LIMIT, "synthetic")

        jid = self.create()["job_id"]
        with patch.object(api, "run_extraction", provider):
            await self.start(jid)
            await self.finish(jid)
            self.assertEqual((await self.start(jid))["attempt"], 1)
            for _ in range(2):
                out = await api.retry_job(jid, authorization=AUTH, _body=RetryRequest(expected_attempt=1))
                self.assertEqual(out["attempt"], 2)
            await self.finish(jid)
            replay = await api.retry_job(jid, authorization=AUTH, _body=RetryRequest(expected_attempt=1))
        self.assertEqual(replay["attempt"], 2)
        self.assertEqual(calls, 2)
        with self.assertRaises(HTTPException) as ctx:
            await api.retry_job(jid, authorization=AUTH, _body=RetryRequest(expected_attempt=3))
        self.assertEqual(ctx.exception.status_code, 409)

    def test_restart_and_gc_allow_recreation_with_no_stale_identity(self):
        first = self.create()["job_id"]
        api._JOBS.clear()  # Lost RAM; intentionally leave a stale index entry.
        second = self.create()["job_id"]
        self.assertNotEqual(first, second)
        api._JOBS[second].update(status="failed", finished_at=time.time() - 100_000)
        third = self.create()["job_id"]
        self.assertNotEqual(second, third)
        self.assertEqual(api._JOB_KEYS[body().external_job_id], third)

    async def test_changed_attempt_fences_old_provider_result(self):
        entered, release = asyncio.Event(), asyncio.Event()

        async def provider(*args, **kwargs):
            entered.set()
            await release.wait()
            return ExtractionOutput("mock:mock", {"stale": True}, [])

        jid = self.create()["job_id"]
        with patch.object(api, "run_extraction", provider):
            await self.start(jid)
            task = api._TASKS[jid]
            await entered.wait()
            api._JOBS[jid].update(attempt=2, status="queued")
            release.set()
            await task
        self.assertEqual(api._JOBS[jid]["status"], "queued")
        self.assertIsNone(api._JOBS[jid].get("result"))

    async def test_incomplete_output_cannot_publish_or_retry(self):
        for reason, truncated in [("length", True), ("content_filter", False)]:
            jid = self.create(external_job_id=reason)["job_id"]

            async def provider(*args, **kwargs):
                return ExtractionOutput("mock:mock", {"looks_valid": True}, [], reason, truncated)

            with patch.object(api, "run_extraction", provider):
                await self.start(jid)
                final = await self.finish(jid)
            self.assertEqual(final["status"], "failed")
            self.assertEqual(final["truncated"], truncated)
            self.assertFalse(final["can_retry"])
            self.assertIsNone(api.get_result(jid, authorization=AUTH)["data"])
            with self.assertRaises(HTTPException):
                await api.retry_job(jid, authorization=AUTH, _body=RetryRequest(expected_attempt=1))

    async def test_timeout_cannot_accept_provider_ignoring_cancellation(self):
        config = dataclasses.replace(api._REGISTRY.config, job_max_duration_seconds=0.01)
        api._REGISTRY = ModelRegistry(config=config)

        async def provider(*args, **kwargs):
            try:
                await asyncio.sleep(10)
            except asyncio.CancelledError:
                return ExtractionOutput("mock:mock", {"too_late": True}, [])

        jid = self.create()["job_id"]
        with patch.object(api, "run_extraction", provider):
            await self.start(jid)
            final = await self.finish(jid)
        self.assertEqual(final["error"]["kind"], "timeout")
        self.assertIsNone(api.get_result(jid, authorization=AUTH)["data"])
