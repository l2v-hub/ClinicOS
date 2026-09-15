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
from urllib.parse import urlsplit

from ..errors import RuntimeError_, ErrorKind
from ..mistral_config import resolve_mistral_connection
from ..profiles import capabilities_for
from ..spec import ModelSpec
from .base import Attachment, BuiltModel
from .ocr_errors import ocr_http_error


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RuntimeError_(ErrorKind.CONFIG, "[AI_CONFIG] Il servizio OCR ha restituito un redirect inatteso.")


def _open_ocr(req, timeout):
    # Never forward provider credentials to a redirect destination.
    return urllib.request.build_opener(_NoRedirect()).open(req, timeout=timeout)


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
        return resolve_mistral_connection(os.environ)

    def _post(self, url: str, key: str, body: dict) -> dict:
        data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(url, data=data, method="POST")
        req.add_header("Content-Type", "application/json")
        req.add_header("Accept", "application/json")
        if (urlsplit(url).hostname or "").endswith((".services.ai.azure.com", ".cognitiveservices.azure.com")):
            req.add_header("api-key", key)
        else:
            req.add_header("Authorization", f"Bearer {key}")
        try:
            with _open_ocr(req, timeout=self._timeout) as resp:
                raw = resp.read().decode("utf-8")
        except urllib.error.HTTPError as ex:
            status = ex.code
            ex.close()
            raise ocr_http_error(status) from None
        except urllib.error.URLError as ex:
            kind = ErrorKind.TIMEOUT if isinstance(ex.reason, TimeoutError) else ErrorKind.PROVIDER_UNAVAILABLE
            raise RuntimeError_(kind, "[AI_TIMEOUT] Tempo limite OCR." if kind == ErrorKind.TIMEOUT else "[AI_PROVIDER] Servizio OCR irraggiungibile.") from ex
        except TimeoutError as ex:
            raise RuntimeError_(ErrorKind.TIMEOUT, "[AI_TIMEOUT] Tempo limite OCR.") from ex
        except UnicodeDecodeError:
            raise RuntimeError_(ErrorKind.PROVIDER_ERROR, "[AI_PROVIDER] Risposta OCR non valida.") from None
        try:
            return json.loads(raw)
        except json.JSONDecodeError as ex:
            # Risposta 200 ma corpo non-JSON/malformato: prima risaliva come JSONDecodeError
            # grezzo (non un RuntimeError_) e il fallback generico in app.py la marcava
            # "failed" (terminale) invece di un errore retryable come gli altri fallimenti
            # provider — un job OCR Mistral perdeva cosi' il retry automatico.
            raise RuntimeError_(ErrorKind.PROVIDER_ERROR, "[AI_PROVIDER] Risposta OCR non valida.") from ex

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
        pages = res.get("pages") if isinstance(res, dict) else None
        if not isinstance(pages, list) or any(not isinstance(p, dict) for p in pages):
            raise RuntimeError_(ErrorKind.PROVIDER_ERROR, "[AI_PROVIDER] Risposta OCR senza pagine valide.")
        texts = [p.get("markdown") or p.get("text") or "" for p in pages]
        if any(not isinstance(text, str) for text in texts):
            raise RuntimeError_(ErrorKind.PROVIDER_ERROR, "[AI_PROVIDER] Formato testo OCR non valido.")
        markdown = "\n\n".join(texts).strip()
        annotation = res.get("document_annotation")
        struct: dict = {}
        if isinstance(annotation, str) and annotation.strip():
            try:
                parsed = json.loads(annotation)
                struct = parsed if isinstance(parsed, dict) else {}
            except json.JSONDecodeError:
                struct = {}
        elif isinstance(annotation, dict):
            struct = annotation
        return markdown, struct

    async def _run(self, schema: object | None, attachments: list[Attachment]) -> tuple[str, dict]:
        if not attachments:
            raise RuntimeError_(ErrorKind.CAPABILITY, "[AI_INPUT] Mistral OCR richiede documenti allegati; per estrarre dal solo testo configurare un modello LLM separato.")
        url, key = self._endpoint_key()

        def _call() -> tuple[str, dict]:
            md_parts: list[str] = []
            struct: dict = {}
            for att in attachments:
                md, st = self._ocr_once(url, key, att, schema)
                # Every supplied document must be read. Otherwise the backend may
                # discard all attachments after OCR and silently lose a document.
                # Blank pages inside an otherwise readable PDF remain permitted.
                if not md:
                    raise RuntimeError_(ErrorKind.SCHEMA_VALIDATION, "[AI_EMPTY] Un documento non ha restituito testo OCR leggibile.")
                if schema is not None and _is_json_schema(schema) and not st:
                    raise RuntimeError_(ErrorKind.SCHEMA_VALIDATION, "[AI_EMPTY] Un documento non ha restituito l'estrazione strutturata richiesta.")
                md_parts.append(md)
                if st:
                    struct = _merge_struct(struct, st)
            markdown = "\n\n".join(md_parts).strip()
            if not markdown:
                raise RuntimeError_(ErrorKind.SCHEMA_VALIDATION, "[AI_EMPTY] Nessun testo leggibile nei documenti OCR.")
            return markdown, struct

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
        if not _is_json_schema(schema) or set(schema.get("properties", {})) == {"rawText"}:
            markdown, _ = await self._run(None, attachments)
            return json.dumps({"rawText": markdown})
        markdown, struct = await self._run(schema, attachments)
        if not struct:
            raise RuntimeError_(ErrorKind.SCHEMA_VALIDATION, "[AI_EMPTY] Il servizio OCR non ha restituito l'estrazione strutturata richiesta.")
        return json.dumps(struct)


def build(spec: ModelSpec, role: str, temperature: float, timeout_seconds: int) -> BuiltModel:  # noqa: ARG001
    return BuiltModel(spec=spec, capabilities=capabilities_for(spec),
                      runner=_MistralOcrRunner(spec, timeout_seconds))
