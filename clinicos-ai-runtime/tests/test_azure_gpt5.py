"""Swap OCR/extraction su Azure gpt-5.5 (endpoint Mistral ritirato).

AC1: capabilities azure:gpt-5.5 -> image_input+pdf_input True (gate extraction passa).
AC2: _AzureRunner inoltra images=/files= ad Agno e solleva PROVIDER_ERROR su
     RunOutput status=ERROR (mai il testo d'errore come completion, issue #239).
"""
from __future__ import annotations

import asyncio
import unittest

from clinicos_ai.models.capabilities import CapabilityRequirement
from clinicos_ai.models.errors import RuntimeError_, ErrorKind
from clinicos_ai.models.profiles import capabilities_for
from clinicos_ai.models.providers.azure import _AzureRunner
from clinicos_ai.models.providers.base import Attachment
from clinicos_ai.models.spec import ModelSpec


class TestGpt5Capabilities(unittest.TestCase):
    def test_azure_gpt55_is_vision_and_pdf(self):
        caps = capabilities_for(ModelSpec.parse("azure:gpt-5.5"))
        self.assertTrue(caps.image_input)
        self.assertTrue(caps.pdf_input)

    def test_extraction_requirement_passes_for_gpt55(self):
        req = CapabilityRequirement(image_input=True, pdf_input=True)
        caps = capabilities_for(ModelSpec.parse("azure:gpt-5.5"))
        self.assertEqual(req.unmet(caps), [])

    def test_older_azure_models_unchanged(self):
        caps = capabilities_for(ModelSpec.parse("azure:gpt-4o"))
        self.assertTrue(caps.image_input)
        self.assertFalse(caps.pdf_input)  # pdf solo per famiglia gpt-5


class _FakeResp:
    def __init__(self, content, status=None):
        self.content = content
        self.status = status


class _FakeAgent:
    def __init__(self, resp):
        self.resp = resp
        self.calls = []

    def run(self, prompt, **kwargs):
        self.calls.append((prompt, kwargs))
        return self.resp


def _runner_with(agent):
    r = _AzureRunner(ModelSpec.parse("azure:gpt-5.5"), temperature=1.0, timeout_seconds=5)
    r._build_agent = lambda: agent  # nessuna rete/chiave nei test
    return r


class TestAzureRunnerMultimodal(unittest.TestCase):
    def test_forwards_images_and_files(self):
        agent = _FakeAgent(_FakeResp('{"ok":true}'))
        runner = _runner_with(agent)
        atts = [
            Attachment(filename="foto.jpg", mime_type="image/jpeg", data=b"\xff\xd8"),
            Attachment(filename="lettera.pdf", mime_type="application/pdf", data=b"%PDF"),
        ]
        out = asyncio.run(runner.run("estrai", atts))
        self.assertEqual(out, '{"ok":true}')
        _, kwargs = agent.calls[0]
        self.assertEqual(len(kwargs.get("images", [])), 1)
        self.assertEqual(len(kwargs.get("files", [])), 1)

    def test_text_only_has_no_media_kwargs(self):
        agent = _FakeAgent(_FakeResp("testo"))
        runner = _runner_with(agent)
        asyncio.run(runner.run("ripara", []))
        _, kwargs = agent.calls[0]
        self.assertEqual(kwargs, {})

    def test_status_error_raises_provider_error(self):
        agent = _FakeAgent(_FakeResp("Azure 404 deployment not found", status="ERROR"))
        runner = _runner_with(agent)
        with self.assertRaises(RuntimeError_) as cm:
            asyncio.run(runner.run("estrai", []))
        self.assertEqual(cm.exception.kind, ErrorKind.PROVIDER_ERROR)


if __name__ == "__main__":
    unittest.main()
