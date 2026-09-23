"""Real Uvicorn/FastAPI HTTP over loopback; extraction is a deterministic fake."""
from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
import dataclasses
import http.client
import json
import os
import socket
import threading
import time
import unittest
import urllib.error
import urllib.request
from unittest.mock import patch

for role in ("OCR", "EXTRACTION", "AGENT", "REPAIR"):
    os.environ.setdefault(f"AI_{role}_MODEL", "mock:mock")
os.environ.setdefault("AI_RUNTIME_SERVICE_TOKEN", "test-token")

import uvicorn
from clinicos_ai.api import app as api
from clinicos_ai.agents.extraction import ExtractionOutput
from clinicos_ai.models.errors import ErrorKind, RuntimeError_
from clinicos_ai.models.registry import ModelRegistry


class RecoveryHttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        api._JOBS.clear()
        api._JOB_KEYS.clear()
        api._TASKS.clear()
        cls.previous_sem = api._CONCURRENCY_SEMAPHORE
        api._CONCURRENCY_SEMAPHORE = asyncio.Semaphore(1)
        cls.previous_registry = api._REGISTRY
        api._REGISTRY = ModelRegistry(config=dataclasses.replace(api._REGISTRY.config, max_upload_bytes=4096))
        cls.calls = {}
        cls.cancelled = threading.Event()
        cls.env = patch.dict(os.environ, {"AI_RUNTIME_SERVICE_TOKEN": "test-token"})
        cls.env.start()

        async def fake_provider(registry, prompt, schema, attachments, mode="extraction"):
            cls.calls[prompt] = cls.calls.get(prompt, 0) + 1
            if prompt.startswith("transient"):
                raise RuntimeError_(ErrorKind.RATE_LIMIT, "fake rate limit")
            if prompt.startswith("truncated"):
                raise RuntimeError_(ErrorKind.OUTPUT_TRUNCATED, "fake length limit", finish_reason="length", truncated=True)
            if prompt.startswith("slow"):
                try:
                    await asyncio.sleep(2)
                except asyncio.CancelledError:
                    cls.cancelled.set()
                    return ExtractionOutput("mock:mock", {"late": True}, [])
            return ExtractionOutput("mock:mock", {"synthetic": True}, [], "stop")

        cls.provider = patch.object(api, "run_extraction", fake_provider)
        cls.provider.start()
        cls.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        cls.sock.bind(("127.0.0.1", 0))
        cls.base = f"http://127.0.0.1:{cls.sock.getsockname()[1]}"
        cls.server = uvicorn.Server(uvicorn.Config(api.app, log_level="error", access_log=False, lifespan="off"))
        cls.thread = threading.Thread(target=cls.server.run, kwargs={"sockets": [cls.sock]}, daemon=True)
        cls.thread.start()
        deadline = time.monotonic() + 5
        while not cls.server.started and cls.thread.is_alive() and time.monotonic() < deadline:
            time.sleep(0.01)
        if not cls.server.started:
            cls.tearDownClass()
            raise RuntimeError("Loopback test server did not start")

    @classmethod
    def tearDownClass(cls):
        cls.server.should_exit = True
        cls.thread.join(timeout=5)
        cls.sock.close()
        cls.provider.stop()
        cls.env.stop()
        api._CONCURRENCY_SEMAPHORE = cls.previous_sem
        api._REGISTRY = cls.previous_registry
        if cls.thread.is_alive():
            raise RuntimeError("Loopback test server did not stop")

    def request(self, method, path, data=None, auth=True):
        payload = json.dumps(data).encode() if data is not None else None
        headers = {"Content-Type": "application/json"}
        if auth:
            headers["Authorization"] = "Bearer test-token"
        req = urllib.request.Request(self.base + path, data=payload, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=3) as response:
                return response.status, json.load(response)
        except urllib.error.HTTPError as ex:
            with ex:
                return ex.code, json.load(ex)

    def create(self, key, prompt="ok", **changes):
        body = {"external_job_id": key, "input_hash": "a" * 64, "files": [], "schema": {}, "prompt": prompt}
        body.update(changes)
        return self.request("POST", "/v1/document-jobs", body)

    def path(self, job, suffix=""):
        return f"/v1/document-jobs/{job['job_id']}{suffix}"

    def poll(self, job, status):
        deadline = time.monotonic() + 3
        while time.monotonic() < deadline:
            _, current = self.request("GET", self.path(job))
            if current["status"] == status:
                return current
            time.sleep(0.01)
        self.fail(f"Job did not reach {status}: {current['status']}")

    def test_real_http_create_replay_conflict_run_and_version(self):
        code, capabilities = self.request("GET", "/v1/runtime/capabilities", auth=False)
        self.assertEqual(code, 200)
        self.assertEqual(capabilities["document_job_contract_version"], 2)
        self.assertEqual(capabilities["max_upload_bytes"], 4096)
        with ThreadPoolExecutor(max_workers=4) as pool:
            responses = list(pool.map(lambda _: self.create("http-dedup", "ok-dedup"), range(4)))
        self.assertEqual({code for code, job in responses}, {201})
        self.assertEqual(len({job["job_id"] for code, job in responses}), 1)
        job = responses[0][1]
        self.assertEqual(job["input_hash"], "a" * 64)
        self.assertEqual(job["attempt"], 0)
        self.assertEqual(self.create("http-dedup", "changed")[0], 409)
        for _ in range(3):
            self.assertEqual(self.request("POST", self.path(job, "/run"), {"mode": "extraction"})[0], 202)
        self.poll(job, "review_ready")
        self.assertEqual(self.calls["ok-dedup"], 1)
        self.assertEqual(self.request("POST", self.path(job, "/run"), {"mode": "ocr"})[0], 409)
        _, result = self.request("GET", self.path(job, "/result"))
        self.assertEqual(result["finish_reason"], "stop")
        self.assertFalse(result["truncated"])

    def test_real_http_retry_expected_attempt_replay(self):
        _, job = self.create("http-retry", "transient-http")
        self.request("POST", self.path(job, "/run"), {"mode": "ocr"})
        self.poll(job, "retryable_error")
        for _ in range(2):
            self.assertEqual(self.request("POST", self.path(job, "/retry"), {"expected_attempt": 1})[0], 202)
        self.poll(job, "retryable_error")
        _, replay = self.request("POST", self.path(job, "/retry"), {"expected_attempt": 1})
        self.assertEqual(replay["attempt"], 2)
        self.assertEqual(self.calls["transient-http"], 2)
        self.assertEqual(self.request("POST", self.path(job, "/retry"), {"expected_attempt": 9})[0], 409)

    def test_real_http_cancel_propagates_and_discards_late_result(self):
        _, job = self.create("http-cancel", "slow-http")
        self.request("POST", self.path(job, "/run"), {"mode": "ocr"})
        self.poll(job, "running")
        code, state = self.request("POST", self.path(job, "/cancel"))
        self.assertEqual(code, 200)
        self.assertEqual(state["status"], "cancelled")
        self.assertTrue(self.cancelled.wait(2))
        _, result = self.request("GET", self.path(job, "/result"))
        self.assertEqual(result["status"], "cancelled")
        self.assertIsNone(result["data"])

    def test_real_http_truncation_auth_validation_and_upload_limit(self):
        self.assertEqual(self.request("POST", "/v1/document-jobs", {}, auth=False)[0], 401)
        self.assertEqual(self.create("http-invalid", input_hash="bad")[0], 422)
        self.assertEqual(self.create("http-upload", prompt="x" * 5000)[0], 413)
        self.assertEqual(self.request("GET", "/v1/document-jobs/absent")[0], 404)
        _, job = self.create("http-truncation", "truncated-http")
        self.request("POST", self.path(job, "/run"), {"mode": "extraction"})
        final = self.poll(job, "failed")
        self.assertEqual(final["error"]["kind"], "output_truncated")
        self.assertFalse(final["can_retry"])
        _, result = self.request("GET", self.path(job, "/result"))
        self.assertTrue(result["truncated"])
        self.assertIsNone(result["data"])

    def test_real_http_chunked_upload_enforces_limit_without_content_length(self):
        body = {"external_job_id": "http-chunked-oversize", "input_hash": "a" * 64,
                "files": [], "schema": {}, "prompt": "x" * 5000}
        payload = json.dumps(body).encode()
        chunks = (payload[:2000], payload[2000:4200], payload[4200:])
        connection = http.client.HTTPConnection("127.0.0.1", self.sock.getsockname()[1], timeout=3)
        try:
            connection.request("POST", "/v1/document-jobs", body=iter(chunks), encode_chunked=True,
                               headers={"Authorization": "Bearer test-token", "Content-Type": "application/json",
                                        "Transfer-Encoding": "chunked"})
            response = connection.getresponse()
            self.assertEqual(response.status, 413)
            self.assertIn("Upload troppo grande", json.loads(response.read())["detail"])
        finally:
            connection.close()
        self.assertNotIn(body["external_job_id"], api._JOB_KEYS)
        self.assertFalse(any(job.get("external_job_id") == body["external_job_id"] for job in api._JOBS.values()))
