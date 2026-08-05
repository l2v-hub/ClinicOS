"""Tests for the runtime AI job store limits (AC1-AC5 of
limiti-runtime-ai-python-job-store-concorrenza-upload): garbage-collect of expired
terminal jobs, the max_concurrency semaphore, the per-job timeout, the upload size
limit, and the no-regression single-job flow.

Stdlib `unittest` + `unittest.mock` only — no network, no real provider (the four roles
are configured with the 'mock' provider, same pattern as the other test modules). The
FastAPI route functions are plain (async) callables, so they are exercised directly
rather than through fastapi.testclient.TestClient (not a project dependency)."""
from __future__ import annotations

import asyncio
import dataclasses
import os
import time
import unittest
from unittest.mock import patch

# Deve avvenire PRIMA di importare l'app: _REGISTRY, _CONCURRENCY_SEMAPHORE e _JOBS sono
# stato di modulo costruito una sola volta all'import. Stesso pattern di test_assistant_plan.py.
for _r in ("OCR", "EXTRACTION", "AGENT", "REPAIR"):
    os.environ.setdefault(f"AI_{_r}_MODEL", "mock:mock")
os.environ.setdefault("AI_MAX_CONCURRENCY", "2")
os.environ.setdefault("AI_RUNTIME_SERVICE_TOKEN", "test-token")

from fastapi import HTTPException

from clinicos_ai.api import app as app_module
from clinicos_ai.agents.extraction import ExtractionOutput
from clinicos_ai.domain.contracts import CreateJobRequest, RuntimeFile
from clinicos_ai.models.registry import ModelRegistry

AUTH = "Bearer test-token"


def _put_job(job_id: str, **overrides) -> dict:
    job = {
        "id": job_id, "external_job_id": None, "status": "created", "stage": None,
        "files": [], "schema": {}, "prompt": "", "events": [],
        "started_at": None, "finished_at": None,
    }
    job.update(overrides)
    app_module._JOBS[job_id] = job
    return job


class JobGcTests(unittest.TestCase):
    """AC1: garbage-collect dei job terminali scaduti, mai di quelli attivi."""

    def setUp(self):
        app_module._JOBS.clear()

    def test_gc_removes_expired_terminal_jobs(self):
        _put_job("old-done", status="review_ready", finished_at=time.time() - 10_000)
        app_module._gc_expired_jobs()
        self.assertNotIn("old-done", app_module._JOBS)

    def test_gc_removes_expired_failed_and_cancelled_too(self):
        _put_job("old-failed", status="failed", finished_at=time.time() - 10_000)
        _put_job("old-cancelled", status="cancelled", finished_at=time.time() - 10_000)
        app_module._gc_expired_jobs()
        self.assertNotIn("old-failed", app_module._JOBS)
        self.assertNotIn("old-cancelled", app_module._JOBS)

    def test_gc_keeps_recent_terminal_jobs(self):
        _put_job("recent-done", status="review_ready", finished_at=time.time())
        app_module._gc_expired_jobs()
        self.assertIn("recent-done", app_module._JOBS)

    def test_gc_never_removes_active_jobs_even_if_old(self):
        for status in ("created", "queued", "running", "validating", "repairing", "retryable_error"):
            _put_job(f"active-{status}", status=status, finished_at=time.time() - 10_000)
        app_module._gc_expired_jobs()
        for status in ("created", "queued", "running", "validating", "repairing", "retryable_error"):
            self.assertIn(f"active-{status}", app_module._JOBS)

    def test_gc_ignores_terminal_jobs_without_finished_at(self):
        # Difesa: un job terminale senza timestamp di fine non viene mai rimosso a caso.
        _put_job("no-timestamp", status="failed", finished_at=None)
        app_module._gc_expired_jobs()
        self.assertIn("no-timestamp", app_module._JOBS)

    def test_create_job_triggers_gc_opportunistically(self):
        _put_job("old-cancelled", status="cancelled", finished_at=time.time() - 10_000)
        body = CreateJobRequest(files=[], schema={}, prompt="x")
        app_module.create_job(body, authorization=AUTH)
        self.assertNotIn("old-cancelled", app_module._JOBS)


class ConcurrencySemaphoreTests(unittest.IsolatedAsyncioTestCase):
    """AC2: con max_concurrency=2 (env AI_MAX_CONCURRENCY impostato prima dell'import), un
    terzo job resta status='queued' finche' uno dei due in corso non libera lo slot."""

    def setUp(self):
        app_module._JOBS.clear()

    async def test_third_job_stays_queued_until_a_slot_frees(self):
        currently_running = 0
        max_observed = 0
        release = asyncio.Event()

        async def slow_run_extraction(*_args, **_kwargs):
            nonlocal currently_running, max_observed
            currently_running += 1
            max_observed = max(max_observed, currently_running)
            await release.wait()
            currently_running -= 1
            return ExtractionOutput(model="mock:mock", data={}, warnings=[])

        job_ids = ["job-0", "job-1", "job-2"]
        for jid in job_ids:
            # Stato impostato come farebbe run_job PRIMA di schedulare _process.
            _put_job(jid, status="queued", stage="queued")

        with patch.object(app_module, "run_extraction", slow_run_extraction):
            tasks = [asyncio.create_task(app_module._process(jid)) for jid in job_ids]
            await asyncio.sleep(0.05)  # lascia partire tutto cio' che riesce ad acquisire il semaforo

            self.assertEqual(currently_running, 2, "il semaforo deve limitare a max_concurrency=2")
            running = [jid for jid in job_ids if app_module._JOBS[jid]["status"] == "running"]
            queued = [jid for jid in job_ids if app_module._JOBS[jid]["status"] == "queued"]
            self.assertEqual(len(running), 2)
            self.assertEqual(queued, ["job-2"], "il terzo job deve restare in coda")

            release.set()  # libera i due job in corso, cosi' il terzo puo' partire
            await asyncio.gather(*tasks)

        self.assertEqual(max_observed, 2)
        for jid in job_ids:
            self.assertEqual(app_module._JOBS[jid]["status"], "review_ready")


class JobTimeoutTests(unittest.IsolatedAsyncioTestCase):
    """AC3: un job che non conclude entro job_max_duration_seconds viene marcato failed con
    un errore esplicito, invece di restare running per sempre."""

    def setUp(self):
        app_module._JOBS.clear()
        self._orig_registry = app_module._REGISTRY

    def tearDown(self):
        app_module._REGISTRY = self._orig_registry

    async def test_timeout_marks_job_failed_with_explicit_error(self):
        # Timeout di test breve (0.1s): sostituiamo la config del registry di modulo con una
        # copia che ha job_max_duration_seconds molto basso, senza toccare env di processo
        # (AI_JOB_MAX_DURATION_SECONDS e' gia' fissato, ad intero, al primo import di app.py).
        short_cfg = dataclasses.replace(app_module._REGISTRY.config, job_max_duration_seconds=0.1)
        app_module._REGISTRY = ModelRegistry(config=short_cfg)

        async def never_finishes(*_args, **_kwargs):
            await asyncio.sleep(5)
            return ExtractionOutput(model="mock:mock", data={}, warnings=[])  # pragma: no cover

        _put_job("job-timeout", status="queued", stage="queued")

        with patch.object(app_module, "run_extraction", never_finishes):
            await app_module._process("job-timeout")

        job = app_module._JOBS["job-timeout"]
        self.assertEqual(job["status"], "failed")
        self.assertEqual(job["error"]["kind"], "timeout")
        self.assertIsNotNone(job["finished_at"])


class UploadSizeLimitTests(unittest.TestCase):
    """AC4: create_job rifiuta con 413 PRIMA di allocare/decodificare se il totale di
    content_base64 supera AI_MAX_UPLOAD_BYTES."""

    def setUp(self):
        app_module._JOBS.clear()
        self._orig_registry = app_module._REGISTRY
        # Limite piccolo e deterministico per il test (evita di allocare decine di MB).
        small_cfg = dataclasses.replace(app_module._REGISTRY.config, max_upload_bytes=1000)
        app_module._REGISTRY = ModelRegistry(config=small_cfg)

    def tearDown(self):
        app_module._REGISTRY = self._orig_registry

    def test_oversized_single_file_rejected_with_413(self):
        body = CreateJobRequest(
            files=[RuntimeFile(filename="f.pdf", mime_type="application/pdf", content_base64="A" * 1001)],
            schema={}, prompt="x",
        )
        with self.assertRaises(HTTPException) as ctx:
            app_module.create_job(body, authorization=AUTH)
        self.assertEqual(ctx.exception.status_code, 413)
        self.assertEqual(app_module._JOBS, {}, "nessun job deve essere allocato quando il limite e' superato")

    def test_oversized_total_across_multiple_files_rejected(self):
        body = CreateJobRequest(
            files=[
                RuntimeFile(filename="a.pdf", mime_type="application/pdf", content_base64="A" * 600),
                RuntimeFile(filename="b.pdf", mime_type="application/pdf", content_base64="B" * 600),
            ],
            schema={}, prompt="x",
        )
        with self.assertRaises(HTTPException) as ctx:
            app_module.create_job(body, authorization=AUTH)
        self.assertEqual(ctx.exception.status_code, 413)

    def test_upload_within_limit_is_accepted(self):
        body = CreateJobRequest(
            files=[RuntimeFile(filename="f.pdf", mime_type="application/pdf", content_base64="A" * 500)],
            schema={}, prompt="x",
        )
        out = app_module.create_job(body, authorization=AUTH)
        self.assertEqual(out["status"], "created")


class SingleJobRegressionTests(unittest.IsolatedAsyncioTestCase):
    """AC5: nessuna regressione per un job singolo entro i limiti — stesso flusso di oggi
    (create -> run [202 subito, senza attendere _process] -> review_ready)."""

    def setUp(self):
        app_module._JOBS.clear()

    async def test_single_job_within_limits_completes_review_ready(self):
        async def fast_run_extraction(*_args, **_kwargs):
            return ExtractionOutput(model="mock:mock", data={"ok": True}, warnings=[])

        body = CreateJobRequest(
            files=[RuntimeFile(filename="f.pdf", mime_type="application/pdf", content_base64="QQ==")],
            schema={}, prompt="estrai",
        )
        created = app_module.create_job(body, authorization=AUTH)
        self.assertEqual(created["status"], "created")
        job_id = created["job_id"]

        before = asyncio.all_tasks()
        with patch.object(app_module, "run_extraction", fast_run_extraction):
            resp = await app_module.run_job(job_id, authorization=AUTH)
            # run_job risponde subito con status "queued" (HTTP 202 dichiarato dalla route):
            # l'attesa dell'estrazione avviene nel task in background, non nella risposta.
            self.assertEqual(resp["status"], "queued")
            spawned = asyncio.all_tasks() - before
            self.assertEqual(len(spawned), 1)
            await list(spawned)[0]

        job = app_module._JOBS[job_id]
        self.assertEqual(job["status"], "review_ready")
        self.assertEqual(job["result"], {"ok": True})
        self.assertIsNotNone(job["finished_at"])


if __name__ == "__main__":
    unittest.main()
