"""Mistral Document AI (OCR) provider adapter (REQ-024).

The ONLY place Mistral's OCR HTTP API is called. Mistral Document AI returns, in a
single call, both the integral OCR transcription (pages[].markdown) AND a structured
extraction (document_annotation) when a JSON Schema is supplied via
document_annotation_format. This fits the discharge-letter task natively (PDF + images).

Endpoint + key come from env (set on the runtime service, never in code):
  MISTRAL_OCR_URL   e.g. https://<resource>.services.ai.azure.com/providers/mistral/azure/ocr
  MISTRAL_API_KEY   the Azure AI Foundry key

Uses stdlib urllib (no extra dependency). The neutral runner exposes:
  - run(prompt, attachments)            -> str   (text fallback; returns markdown)
  - run_structured(prompt, schema, atts)-> str   (JSON string per the schema)
extraction.run_extraction() prefers run_structured when present.
"""
from __future__ import annotations

import asyncio
import base64
import json
import os
import urllib.error
import urllib.request

from ..errors import ProviderUnavailableError, RuntimeError_, ErrorKind
from ..profiles import capabilities_for
from ..spec import ModelSpec
from .base import Attachment, BuiltModel


def _data_uri(att: Attachment) -> tuple[str, str]:
    b64 = base64.b64encode(att.data).decode("ascii")
    uri = f"data:{att.mime_type};base64,{b64}"
    # Mistral distinguishes image_url vs document_url (PDF and others).
    if att.mime_type.startswith("image/"):
        return "image_url", uri
    return "document_url", uri


def _is_json_schema(schema: object) -> bool:
    return isinstance(schema, dict) and ("properties" in schema or schema.get("type") == "object")


def _merge_struct(acc: dict, more: dict) -> dict:
    """Shallow merge of two structured extractions: arrays concat, scalars first non-empty,
    nested objects merged one level. Used when an import has multiple documents."""
    out = dict(acc)
    for k, v in more.items():
        if isinstance(v, list):
            prev = out.get(k) if isinstance(out.get(k), list) else []
            out[k] = [*prev, *v]
        elif isinstance(v, dict):
            out[k] = _merge_struct(out.get(k) if isinstance(out.get(k), dict) else {}, v)
        elif v not in ("", None) and not out.get(k):
            out[k] = v
        elif k not in out:
            out[k] = v
    return out


class _MistralOcrRunner:
    def __init__(self, spec: ModelSpec, timeout_seconds: int) -> None:
        self._spec = spec
        self._timeout = timeout_seconds

    def _endpoint_key(self) -> tuple[str, str]:
        url = (os.environ.get("MISTRAL_OCR_URL") or "").strip()
        key = (os.environ.get("MISTRAL_API_KEY") or "").strip()
        if not url or not key:
            raise ProviderUnavailableError("MISTRAL_OCR_URL / MISTRAL_API_KEY non configurati")
        return url, key

    def _post(self, url: str, key: str, body: dict) -> dict:
        data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(url, data=data, method="POST")
        req.add_header("Content-Type", "application/json")
        req.add_header("Accept", "application/json")
        # Azure AI Foundry serverless accepts either; send both, harmless.
        req.add_header("Authorization", f"Bearer {key}")
        req.add_header("api-key", key)
        try:
            with urllib.request.urlopen(req, timeout=self._timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as ex:
            detail = ""
            try:
                detail = ex.read().decode("utf-8")[:200]
            except Exception:
                pass
            if ex.code in (401, 403):
                raise RuntimeError_(ErrorKind.PROVIDER_ERROR, f"Mistral OCR auth {ex.code}: {detail}") from ex
            if ex.code == 429:
                raise RuntimeError_(ErrorKind.RATE_LIMIT, f"Mistral OCR 429: {detail}") from ex
            raise RuntimeError_(ErrorKind.PROVIDER_ERROR, f"Mistral OCR {ex.code}: {detail}") from ex
        except urllib.error.URLError as ex:
            raise RuntimeError_(ErrorKind.PROVIDER_UNAVAILABLE, f"Mistral OCR irraggiungibile: {ex}") from ex

    def _ocr_once(self, url: str, key: str, att: Attachment, schema: object | None) -> tuple[str, dict]:
        doc_type, uri = _data_uri(att)
        body: dict = {
            "model": self._spec.model_id,
            "document": {"type": doc_type, doc_type: uri},
            "include_image_base64": False,
        }
        if schema is not None and _is_json_schema(schema):
            body["document_annotation_format"] = {
                "type": "json_schema",
                "json_schema": {"name": "clinicos_extraction", "schema": schema, "strict": False},
            }
        res = self._post(url, key, body)
        pages = res.get("pages") or []
        markdown = "\n\n".join(str(p.get("markdown") or p.get("text") or "") for p in pages).strip()
        annotation = res.get("document_annotation")
        struct: dict = {}
        if isinstance(annotation, str) and annotation.strip():
            try:
                struct = json.loads(annotation)
            except json.JSONDecodeError:
                struct = {}
        elif isinstance(annotation, dict):
            struct = annotation
        return markdown, struct

    async def _run(self, schema: object | None, attachments: list[Attachment]) -> tuple[str, dict]:
        url, key = self._endpoint_key()

        def _call() -> tuple[str, dict]:
            md_parts: list[str] = []
            struct: dict = {}
            for att in attachments:
                md, st = self._ocr_once(url, key, att, schema)
                if md:
                    md_parts.append(md)
                if st:
                    struct = _merge_struct(struct, st)
            return "\n\n".join(md_parts).strip(), struct

        try:
            return await asyncio.wait_for(asyncio.to_thread(_call), timeout=self._timeout + 30)
        except asyncio.TimeoutError as ex:
            raise RuntimeError_(ErrorKind.TIMEOUT, f"Timeout {self._timeout}s") from ex

    async def run(self, prompt: str, attachments: list[Attachment]) -> str:
        # Text fallback: return the OCR transcription as markdown.
        markdown, _ = await self._run(None, attachments)
        return json.dumps({"rawText": markdown})

    async def run_structured(self, prompt: str, schema: object, attachments: list[Attachment]) -> str:
        # rawText-only schema (transcription pass) -> return the OCR markdown, no annotation.
        if not _is_json_schema(schema):
            markdown, _ = await self._run(None, attachments)
            return json.dumps({"rawText": markdown})
        markdown, struct = await self._run(schema, attachments)
        if not struct:
            # Annotation empty: surface the transcription so the operator can still work.
            struct = {}
        return json.dumps(struct)


def build(spec: ModelSpec, role: str, temperature: float, timeout_seconds: int) -> BuiltModel:  # noqa: ARG001
    return BuiltModel(spec=spec, capabilities=capabilities_for(spec),
                      runner=_MistralOcrRunner(spec, timeout_seconds))
